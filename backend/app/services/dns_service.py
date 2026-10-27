import dns.resolver
import dns.exception
from typing import Tuple, List
from app.config import settings
from app.models import DomainCheckResult

DISPOSABLE_DOMAINS = {
    "mailinator.com", "yopmail.com", "guerrillamail.com", "tempmail.com",
    "10minutemail.com", "trashmail.com", "sharklasers.com", "getairmail.com",
    "dispostable.com", "throwawaymail.com", "mytemp.email", "temp-mail.org",
    "fakeinbox.com", "maildrop.cc", "crazymailing.com", "nada.ltd"
}


class DNSService:
    def __init__(self, timeout: float = None):
        self.timeout = timeout or settings.DNS_TIMEOUT
        self.resolver = dns.resolver.Resolver()
        self.resolver.lifetime = self.timeout
        self.resolver.timeout = self.timeout

    def check_domain(self, domain: str) -> Tuple[DomainCheckResult, bool]:
        """
        Queries DNS for mail routing records (MX records, or A/AAAA fallback as per RFC 5321).
        Returns: (DomainCheckResult, is_temporary_error)
        """
        normalized_domain = domain.lower().strip().rstrip(".")
        is_disposable = normalized_domain in DISPOSABLE_DOMAINS

        mx_hosts: List[str] = []
        
        # 1. Query MX records
        try:
            answers = self.resolver.resolve(normalized_domain, "MX")
            # Sort MX records by preference
            sorted_records = sorted(answers, key=lambda r: r.preference)
            mx_hosts = [str(r.exchange).rstrip(".") for r in sorted_records]

            # Null MX record RFC 7505 check (a single record with preference 0 and "." target indicates no mail accepted)
            if len(sorted_records) == 1 and str(sorted_records[0].exchange).rstrip(".") in ("", "."):
                return DomainCheckResult(
                    valid=False,
                    has_mx=False,
                    mx_records=[],
                    fallback_a=False,
                    details="Domain advertises a Null MX record (RFC 7505), explicitly stating it does not accept email.",
                    is_disposable=is_disposable
                ), False

            if mx_hosts:
                return DomainCheckResult(
                    valid=True,
                    has_mx=True,
                    mx_records=mx_hosts,
                    fallback_a=False,
                    details=f"Found {len(mx_hosts)} active MX record(s): {', '.join(mx_hosts[:3])}{'...' if len(mx_hosts) > 3 else ''}.",
                    is_disposable=is_disposable
                ), False

        except dns.resolver.NXDOMAIN:
            # Definite domain non-existence
            return DomainCheckResult(
                valid=False,
                has_mx=False,
                mx_records=[],
                fallback_a=False,
                details=f"Domain '{normalized_domain}' does not exist (NXDOMAIN).",
                is_disposable=is_disposable
            ), False

        except (dns.resolver.NoAnswer, dns.resolver.NoNameservers):
            # No MX records found; RFC 5321 specifies falling back to A / AAAA records
            pass

        except (dns.exception.Timeout, dns.resolver.LifetimeTimeout):
            return DomainCheckResult(
                valid=False,
                has_mx=False,
                mx_records=[],
                fallback_a=False,
                details=f"DNS query timed out after {self.timeout}s while looking up MX records for '{normalized_domain}'.",
                is_disposable=is_disposable
            ), True

        except Exception as e:
            return DomainCheckResult(
                valid=False,
                has_mx=False,
                mx_records=[],
                fallback_a=False,
                details=f"DNS query error for MX records: {str(e)}",
                is_disposable=is_disposable
            ), True

        # 2. RFC 5321 Fallback check to Address (A / AAAA) records
        try:
            has_address = False
            ip_addresses = []
            
            try:
                a_answers = self.resolver.resolve(normalized_domain, "A")
                for a in a_answers:
                    ip_addresses.append(str(a))
                if ip_addresses:
                    has_address = True
            except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN):
                pass

            if not has_address:
                try:
                    aaaa_answers = self.resolver.resolve(normalized_domain, "AAAA")
                    for aaaa in aaaa_answers:
                        ip_addresses.append(str(aaaa))
                    if ip_addresses:
                        has_address = True
                except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN):
                    pass

            if has_address:
                return DomainCheckResult(
                    valid=True,
                    has_mx=False,
                    mx_records=[normalized_domain],
                    fallback_a=True,
                    details=f"No MX records found; falling back to domain address record ({ip_addresses[0]}) per RFC 5321.",
                    is_disposable=is_disposable
                ), False
            else:
                return DomainCheckResult(
                    valid=False,
                    has_mx=False,
                    mx_records=[],
                    fallback_a=False,
                    details=f"Domain '{normalized_domain}' has neither MX records nor valid A/AAAA mail-routing addresses.",
                    is_disposable=is_disposable
                ), False

        except (dns.exception.Timeout, dns.resolver.LifetimeTimeout):
            return DomainCheckResult(
                valid=False,
                has_mx=False,
                mx_records=[],
                fallback_a=False,
                details=f"DNS query timed out while querying A/AAAA fallback for '{normalized_domain}'.",
                is_disposable=is_disposable
            ), True
        except Exception as e:
            return DomainCheckResult(
                valid=False,
                has_mx=False,
                mx_records=[],
                fallback_a=False,
                details=f"DNS fallback check error: {str(e)}",
                is_disposable=is_disposable
            ), True
