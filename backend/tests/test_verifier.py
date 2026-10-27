import pytest
from unittest.mock import patch, MagicMock
from app.services.verifier_service import VerifierService
from app.models import VerificationStatus, ReasonCode, DomainCheckResult, SMTPCheckResult


@pytest.fixture
def verifier():
    return VerifierService()


@pytest.mark.asyncio
async def test_mixed_batch_classification(verifier):
    raw_emails = [
        "good.user@example.com",
        "bad-syntax@@example",
        "no-domain@fake-domain-nx-12345.org",
        "catchall@catchallcorp.com",
        "good.user@example.com"  # Duplicate!
    ]

    # Mock domain check
    def mock_domain_check(domain):
        if "fake-domain-nx" in domain:
            return DomainCheckResult(
                valid=False, has_mx=False, mx_records=[], fallback_a=False,
                details="Domain does not exist (NXDOMAIN)."
            ), False
        return DomainCheckResult(
            valid=True, has_mx=True, mx_records=["mx1." + domain], fallback_a=False,
            details="Active MX record."
        ), False

    # Mock smtp check
    def mock_smtp_check(domain, recipient_email, mx_hosts):
        if "catchall" in domain:
            return SMTPCheckResult(
                attempted=True, success=True, catch_all=True, response_code=250,
                details="Catch-all accepted"
            )
        return SMTPCheckResult(
            attempted=True, success=True, catch_all=False, response_code=250,
            details="Recipient accepted"
        )

    with patch.object(verifier.dns_service, "check_domain", side_effect=mock_domain_check), \
         patch.object(verifier.smtp_service, "check_recipient", side_effect=mock_smtp_check):

        response = await verifier.verify_batch(raw_emails)

        summary = response.summary
        assert summary.total_input == 5
        assert summary.total_unique == 4
        assert summary.total_duplicates == 1

        # Check results mapping
        results = response.results
        assert len(results) == 5

        # 0: good.user -> Likely Delivered
        assert results[0].status == VerificationStatus.LIKELY_DELIVERED
        assert results[0].reason_code == ReasonCode.RECIPIENT_ACCEPTED
        assert results[0].is_duplicate is False

        # 1: bad-syntax -> Likely to Bounce
        assert results[1].status == VerificationStatus.LIKELY_TO_BOUNCE
        assert results[1].reason_code == ReasonCode.SYNTAX_INVALID

        # 2: no-domain -> Likely to Bounce
        assert results[2].status == VerificationStatus.LIKELY_TO_BOUNCE
        assert results[2].reason_code == ReasonCode.DOMAIN_NOT_FOUND

        # 3: catchall -> Unknown
        assert results[3].status == VerificationStatus.UNKNOWN
        assert results[3].reason_code == ReasonCode.CATCH_ALL_DETECTED

        # 4: duplicate good.user -> Likely Delivered, marked is_duplicate
        assert results[4].status == VerificationStatus.LIKELY_DELIVERED
        assert results[4].is_duplicate is True

        # Check summary totals
        assert summary.likely_delivered == 2
        assert summary.likely_to_bounce == 2
        assert summary.unknown == 1
        assert summary.likely_delivered + summary.likely_to_bounce + summary.unknown == 5


@pytest.mark.asyncio
async def test_dns_temporary_timeout_marks_unknown(verifier):
    with patch.object(verifier.dns_service, "check_domain", return_value=(
        DomainCheckResult(valid=False, has_mx=False, mx_records=[], fallback_a=False, details="DNS timeout"),
        True  # is_temporary_error = True
    )):
        response = await verifier.verify_batch(["user@slowdns.com"])
        res = response.results[0]
        assert res.status == VerificationStatus.UNKNOWN
        assert res.reason_code == ReasonCode.DNS_TEMPORARY_ERROR
        assert response.summary.unknown == 1
        assert response.summary.likely_to_bounce == 0
