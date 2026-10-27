import time
from datetime import datetime, timezone
from typing import List, Dict, Tuple
import asyncio
from concurrent.futures import ThreadPoolExecutor

from app.config import settings
from app.models import (
    VerificationStatus,
    ReasonCode,
    EmailVerificationResult,
    SyntaxCheckResult,
    DomainCheckResult,
    SMTPCheckResult,
    VerifySummary,
    VerifyEmailsResponse
)
from app.services.syntax_service import SyntaxService
from app.services.dns_service import DNSService
from app.services.smtp_service import SMTPService


class VerifierService:
    def __init__(self):
        self.syntax_service = SyntaxService()
        self.dns_service = DNSService()
        self.smtp_service = SMTPService()
        self.executor = ThreadPoolExecutor(max_workers=settings.CONCURRENCY_LIMIT)

    def verify_single(self, email_str: str) -> EmailVerificationResult:
        """
        Synchronously performs layered verification on a single email.
        Designed to run inside a thread pool worker.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        
        # 1. Syntax Check
        syntax_res, local_part, domain = self.syntax_service.validate(email_str)
        if not syntax_res.valid:
            return EmailVerificationResult(
                original_email=email_str,
                normalized_email=email_str.strip().lower(),
                status=VerificationStatus.LIKELY_TO_BOUNCE,
                syntax=syntax_res,
                domain=DomainCheckResult(
                    valid=False,
                    has_mx=False,
                    mx_records=[],
                    fallback_a=False,
                    details="Domain check bypassed due to invalid syntax."
                ),
                smtp=SMTPCheckResult(
                    attempted=False,
                    success=None,
                    catch_all=None,
                    response_code=None,
                    details="SMTP handshake bypassed due to invalid syntax."
                ),
                explanation=f"Address failed syntax validation: {syntax_res.details}",
                reason_code=ReasonCode.SYNTAX_INVALID,
                is_duplicate=False,
                checked_at=now_iso
            )

        normalized_email = syntax_res.normalized or f"{local_part}@{domain}".lower()

        # 2. DNS / Domain Check
        domain_res, is_dns_temp_err = self.dns_service.check_domain(domain)
        
        # Handle DNS temporary error (timeout, servfail)
        if is_dns_temp_err:
            return EmailVerificationResult(
                original_email=email_str,
                normalized_email=normalized_email,
                status=VerificationStatus.UNKNOWN,
                syntax=syntax_res,
                domain=domain_res,
                smtp=SMTPCheckResult(
                    attempted=False,
                    success=None,
                    catch_all=None,
                    response_code=None,
                    details="SMTP check skipped due to DNS lookup timeout or temporary failure."
                ),
                explanation=f"DNS query encountered a temporary network timeout or server error for domain '{domain}'. Status cannot be determined.",
                reason_code=ReasonCode.DNS_TEMPORARY_ERROR,
                is_duplicate=False,
                checked_at=now_iso
            )

        # Handle confirmed invalid domain (NXDOMAIN or No MX/A records)
        if not domain_res.valid:
            reason = ReasonCode.DOMAIN_NOT_FOUND if "does not exist" in domain_res.details else ReasonCode.NO_MAIL_SERVER
            return EmailVerificationResult(
                original_email=email_str,
                normalized_email=normalized_email,
                status=VerificationStatus.LIKELY_TO_BOUNCE,
                syntax=syntax_res,
                domain=domain_res,
                smtp=SMTPCheckResult(
                    attempted=False,
                    success=None,
                    catch_all=None,
                    response_code=None,
                    details="SMTP check skipped because no active mail routing servers exist."
                ),
                explanation=f"Domain '{domain}' has no valid mail routing (MX or A/AAAA fallback): {domain_res.details}",
                reason_code=reason,
                is_duplicate=False,
                checked_at=now_iso
            )

        # Handle disposable email provider
        if domain_res.is_disposable:
            return EmailVerificationResult(
                original_email=email_str,
                normalized_email=normalized_email,
                status=VerificationStatus.UNKNOWN,
                syntax=syntax_res,
                domain=domain_res,
                smtp=SMTPCheckResult(
                    attempted=False,
                    success=None,
                    catch_all=None,
                    response_code=None,
                    details="SMTP probe skipped for known disposable/temporary email provider."
                ),
                explanation=f"Domain '{domain}' is a recognized disposable or temporary email provider. Deliverability to long-term recipients is unlikely.",
                reason_code=ReasonCode.DISPOSABLE_DOMAIN,
                is_duplicate=False,
                checked_at=now_iso
            )

        # 3. SMTP Verification
        smtp_res = self.smtp_service.check_recipient(
            domain=domain,
            recipient_email=normalized_email,
            mx_hosts=domain_res.mx_records
        )

        # 4. Result Classification & Honest Explanation
        if not smtp_res.attempted:
            return EmailVerificationResult(
                original_email=email_str,
                normalized_email=normalized_email,
                status=VerificationStatus.UNKNOWN,
                syntax=syntax_res,
                domain=domain_res,
                smtp=smtp_res,
                explanation="Syntax and DNS mail routing are valid. Recipient mailbox existence could not be checked because SMTP probes are disabled in this environment.",
                reason_code=ReasonCode.SMTP_DISABLED_BY_CONFIG,
                is_duplicate=False,
                checked_at=now_iso
            )

        # Recipient explicitly rejected by mail server (5xx code)
        if smtp_res.success is False:
            return EmailVerificationResult(
                original_email=email_str,
                normalized_email=normalized_email,
                status=VerificationStatus.LIKELY_TO_BOUNCE,
                syntax=syntax_res,
                domain=domain_res,
                smtp=smtp_res,
                explanation=f"Mail server rejected recipient probe with code {smtp_res.response_code or '5xx'}. Mailbox likely does not exist.",
                reason_code=ReasonCode.RECIPIENT_REJECTED,
                is_duplicate=False,
                checked_at=now_iso
            )

        # Recipient accepted (250 OK)
        if smtp_res.success is True:
            if smtp_res.catch_all:
                return EmailVerificationResult(
                    original_email=email_str,
                    normalized_email=normalized_email,
                    status=VerificationStatus.UNKNOWN,
                    syntax=syntax_res,
                    domain=domain_res,
                    smtp=smtp_res,
                    explanation="Domain server accepted the probe, but also accepts non-existent random addresses (Catch-All domain). Specific mailbox deliverability cannot be verified.",
                    reason_code=ReasonCode.CATCH_ALL_DETECTED,
                    is_duplicate=False,
                    checked_at=now_iso
                )
            else:
                return EmailVerificationResult(
                    original_email=email_str,
                    normalized_email=normalized_email,
                    status=VerificationStatus.LIKELY_DELIVERED,
                    syntax=syntax_res,
                    domain=domain_res,
                    smtp=smtp_res,
                    explanation="Valid syntax, active MX routing, and mail server confirmed recipient probe. Note: This indicates high probability, but mailbox full states or spam filters can still affect final delivery.",
                    reason_code=ReasonCode.RECIPIENT_ACCEPTED,
                    is_duplicate=False,
                    checked_at=now_iso
                )

        # Greylisting / Temporary 4xx response
        if smtp_res.response_code and 400 <= smtp_res.response_code <= 499:
            return EmailVerificationResult(
                original_email=email_str,
                normalized_email=normalized_email,
                status=VerificationStatus.UNKNOWN,
                syntax=syntax_res,
                domain=domain_res,
                smtp=smtp_res,
                explanation=f"Mail server responded with temporary deferral/greylisting (code {smtp_res.response_code}). Recipient cannot be verified immediately.",
                reason_code=ReasonCode.GREYLISTED_OR_TEMPORARY_ERROR,
                is_duplicate=False,
                checked_at=now_iso
            )

        # Network timeout or port 25 block
        return EmailVerificationResult(
            original_email=email_str,
            normalized_email=normalized_email,
            status=VerificationStatus.UNKNOWN,
            syntax=syntax_res,
            domain=domain_res,
            smtp=smtp_res,
            explanation="Domain has valid mail records, but recipient-level verification could not connect or timed out (outbound port 25 is commonly blocked by cloud hosts and ISPs).",
            reason_code=ReasonCode.SMTP_BLOCKED_OR_TIMEOUT,
            is_duplicate=False,
            checked_at=now_iso
        )

    async def verify_batch(self, raw_emails: List[str]) -> VerifyEmailsResponse:
        """
        Asynchronously handles deduplication, limits concurrency, runs checks,
        and constructs response and metrics.
        """
        start_time = time.time()
        
        # 1. Process inputs & Detect Duplicates
        total_input = len(raw_emails)
        cleaned_inputs = [e.strip() for e in raw_emails if e.strip()]
        
        # Key: lowercase cleaned email, Value: list of original indices
        unique_map: Dict[str, List[Tuple[int, str]]] = {}
        for idx, raw in enumerate(cleaned_inputs):
            norm_key = raw.lower()
            if norm_key not in unique_map:
                unique_map[norm_key] = []
            unique_map[norm_key].append((idx, raw))

        unique_keys = list(unique_map.keys())
        total_unique = len(unique_keys)
        total_duplicates = len(cleaned_inputs) - total_unique

        # 2. Run verification concurrently for unique emails
        loop = asyncio.get_event_loop()
        tasks = [
            loop.run_in_executor(self.executor, self.verify_single, unique_map[k][0][1])
            for k in unique_keys
        ]
        
        unique_results = await asyncio.gather(*tasks)
        key_to_result: Dict[str, EmailVerificationResult] = dict(zip(unique_keys, unique_results))

        # 3. Assemble all results preserving input order and marking duplicates
        ordered_results: List[Optional[EmailVerificationResult]] = [None] * len(cleaned_inputs)
        
        for k, occurrences in unique_map.items():
            base_res = key_to_result[k]
            # First occurrence
            first_idx, first_raw = occurrences[0]
            first_copy = base_res.model_copy()
            first_copy.original_email = first_raw
            first_copy.is_duplicate = False
            ordered_results[first_idx] = first_copy

            # Subsequent occurrences
            for dup_idx, dup_raw in occurrences[1:]:
                dup_copy = base_res.model_copy()
                dup_copy.original_email = dup_raw
                dup_copy.is_duplicate = True
                dup_copy.explanation = f"(Duplicate entry) {base_res.explanation}"
                ordered_results[dup_idx] = dup_copy

        final_results = [r for r in ordered_results if r is not None]

        # 4. Summary counts
        likely_delivered_count = sum(1 for r in final_results if r.status == VerificationStatus.LIKELY_DELIVERED)
        likely_to_bounce_count = sum(1 for r in final_results if r.status == VerificationStatus.LIKELY_TO_BOUNCE)
        unknown_count = sum(1 for r in final_results if r.status == VerificationStatus.UNKNOWN)

        duration_ms = round((time.time() - start_time) * 1000, 2)

        summary = VerifySummary(
            total_input=total_input,
            total_unique=total_unique,
            total_duplicates=total_duplicates,
            likely_delivered=likely_delivered_count,
            likely_to_bounce=likely_to_bounce_count,
            unknown=unknown_count,
            duration_ms=duration_ms
        )

        return VerifyEmailsResponse(
            results=final_results,
            summary=summary
        )
