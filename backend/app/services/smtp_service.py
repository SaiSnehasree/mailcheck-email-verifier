import smtplib
import socket
import uuid
from typing import Tuple, List, Optional
from app.config import settings
from app.models import SMTPCheckResult


class SMTPService:
    def __init__(self, timeout: float = None):
        self.timeout = timeout or settings.SMTP_TIMEOUT
        self.helo_domain = settings.SMTP_HELO_DOMAIN
        self.sender = settings.SMTP_SENDER_EMAIL

    def _test_recipient_on_server(
        self, host: str, recipient: str
    ) -> Tuple[Optional[int], str, bool]:
        """
        Executes a conservative SMTP handshake:
        CONNECT -> HELO/EHLO -> MAIL FROM -> RCPT TO -> RSET/QUIT
        Never issues DATA. Never sends an email.
        Returns: (smtp_code, message, is_network_error)
        """
        smtp: Optional[smtplib.SMTP] = None
        try:
            # Connect with short timeout
            smtp = smtplib.SMTP(timeout=self.timeout)
            code, resp = smtp.connect(host, 25)
            
            # EHLO / HELO
            try:
                smtp.ehlo_or_helo_if_needed()
            except Exception:
                pass

            # MAIL FROM
            mail_code, _ = smtp.mail(self.sender)
            if mail_code >= 400:
                # Some servers require null sender <> for bounce verification probes
                mail_code, _ = smtp.mail("<>")
                if mail_code >= 400:
                    return mail_code, f"Server rejected MAIL FROM probe (code {mail_code}).", False

            # RCPT TO
            rcpt_code, rcpt_resp = smtp.rcpt(recipient)
            resp_str = rcpt_resp.decode("utf-8", errors="replace") if isinstance(rcpt_resp, bytes) else str(rcpt_resp)

            # Clean exit
            try:
                smtp.rset()
                smtp.quit()
            except Exception:
                pass

            return rcpt_code, f"SMTP responded with code {rcpt_code}: {resp_str.strip()}", False

        except (socket.timeout, TimeoutError):
            return None, f"Connection to mail exchanger '{host}:25' timed out after {self.timeout}s.", True
        except (socket.gaierror, socket.herror) as e:
            return None, f"Could not resolve host '{host}': {str(e)}", True
        except (ConnectionRefusedError, ConnectionResetError, smtplib.SMTPServerDisconnected) as e:
            return None, f"Connection to mail exchanger '{host}:25' was refused or disconnected (likely firewall or port 25 block).", True
        except OSError as e:
            # Errno 10060 (WSAETIMEDOUT), 10061 (WSAECONNREFUSED), 10013 (WSAEACCES / port blocked)
            err_msg = str(e)
            if "10060" in err_msg or "timed out" in err_msg.lower():
                return None, f"SMTP port 25 connection timed out (often blocked by ISP or cloud provider): {host}", True
            elif "10061" in err_msg or "refused" in err_msg.lower():
                return None, f"SMTP connection refused by {host}:25.", True
            return None, f"Socket error connecting to {host}:25 - {err_msg}", True
        except Exception as e:
            return None, f"SMTP handshake exception: {str(e)}", True
        finally:
            if smtp is not None:
                try:
                    smtp.close()
                except Exception:
                    pass

    def check_recipient(
        self, domain: str, recipient_email: str, mx_hosts: List[str]
    ) -> SMTPCheckResult:
        """
        Coordinates SMTP check with catch-all detection across primary MX hosts.
        """
        if not settings.ENABLE_SMTP_CHECK:
            return SMTPCheckResult(
                attempted=False,
                success=None,
                catch_all=None,
                response_code=None,
                details="SMTP verification disabled by system configuration."
            )

        if not mx_hosts:
            return SMTPCheckResult(
                attempted=False,
                success=None,
                catch_all=None,
                response_code=None,
                details="No MX records available to attempt SMTP handshake."
            )

        # Try up to top 2 MX hosts to avoid excessive latency
        last_details = ""
        last_code = None
        has_network_block = False

        for host in mx_hosts[:2]:
            code, details, is_net_err = self._test_recipient_on_server(host, recipient_email)
            last_code = code
            last_details = details

            if is_net_err:
                has_network_block = True
                continue  # Try next MX host if available

            # If recipient was rejected with a 5xx error
            if code is not None and 500 <= code <= 559:
                return SMTPCheckResult(
                    attempted=True,
                    success=False,
                    catch_all=False,
                    response_code=code,
                    details=f"Mailbox rejected by {host}: {details}"
                )

            # If recipient was accepted (code 250)
            if code is not None and 200 <= code <= 299:
                # Perform catch-all verification probe using a non-existent random address
                random_user = f"mailcheck-probe-{uuid.uuid4().hex[:10]}"
                catch_all_email = f"{random_user}@{domain}"
                
                probe_code, probe_details, probe_net_err = self._test_recipient_on_server(host, catch_all_email)
                
                if probe_code is not None and 200 <= probe_code <= 299:
                    # Domain accepted a completely random recipient; it is a catch-all domain!
                    return SMTPCheckResult(
                        attempted=True,
                        success=True,
                        catch_all=True,
                        response_code=code,
                        details=f"Server {host} accepted recipient, but domain is a Catch-All (also accepted {catch_all_email}). Recipient existence cannot be guaranteed."
                    )
                else:
                    # Recipient accepted and random probe rejected or blocked
                    return SMTPCheckResult(
                        attempted=True,
                        success=True,
                        catch_all=False,
                        response_code=code,
                        details=f"Server {host} accepted recipient verification probe (code {code})."
                    )

            # Temporary deferral / greylisting (4xx codes)
            if code is not None and 400 <= code <= 499:
                return SMTPCheckResult(
                    attempted=True,
                    success=None,
                    catch_all=None,
                    response_code=code,
                    details=f"Mail server {host} deferred verification with temporary error/greylisting ({details})."
                )

        # If all tried MX hosts failed due to network / port 25 blocking
        if has_network_block:
            return SMTPCheckResult(
                attempted=True,
                success=None,
                catch_all=None,
                response_code=last_code,
                details=f"SMTP handshake could not reach host(s) (port 25 blocked or connection timed out). Fallback to DNS-level evidence."
            )

        return SMTPCheckResult(
            attempted=True,
            success=None,
            catch_all=None,
            response_code=last_code,
            details=last_details or "SMTP verification concluded with ambiguous server response."
        )
