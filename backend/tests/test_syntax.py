import pytest
from app.services.syntax_service import SyntaxService


def test_valid_emails():
    valid_cases = [
        "alex.smith@example.com",
        "user+newsletter@sub.domain.org",
        "first.last@company.co.uk",
        "support@mailcheck.io"
    ]
    for email in valid_cases:
        res, local_part, domain = SyntaxService.validate(email)
        assert res.valid is True, f"Failed for {email}: {res.details}"
        assert domain is not None
        assert local_part is not None


def test_invalid_syntax_missing_parts():
    invalid_cases = [
        "plainaddress",
        "@missinglocal.com",
        "missingdomain@",
        "spaces in local@domain.com",
        "missing-at-domain.com",
        "test@nodot"
    ]
    for email in invalid_cases:
        res, _, _ = SyntaxService.validate(email)
        assert res.valid is False, f"Expected invalid for {email}"


def test_consecutive_dots_rejected():
    res, _, _ = SyntaxService.validate("user..name@domain.com")
    assert res.valid is False
    assert "consecutive dots" in res.details.lower()


def test_empty_and_whitespace():
    res, _, _ = SyntaxService.validate("")
    assert res.valid is False

    res2, _, _ = SyntaxService.validate("   \n\t  ")
    assert res2.valid is False


def test_overly_long_email():
    long_email = ("a" * 250) + "@domain.com"
    res, _, _ = SyntaxService.validate(long_email)
    assert res.valid is False
    assert "254 characters" in res.details
