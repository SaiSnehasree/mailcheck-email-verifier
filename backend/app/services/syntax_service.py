import re
from typing import Tuple, Optional
from email_validator import validate_email, EmailNotValidError
from app.models import SyntaxCheckResult

# Common patterns for quick rejection or pre-validation
CONSECUTIVE_DOTS_REGEX = re.compile(r"\.{2,}")


class SyntaxService:
    @staticmethod
    def validate(email_str: str) -> Tuple[SyntaxCheckResult, Optional[str], Optional[str]]:
        """
        Validates email syntax conforming to RFC 5322 and returns:
        (SyntaxCheckResult, local_part, domain)
        """
        if not email_str or not isinstance(email_str, str):
            return SyntaxCheckResult(
                valid=False,
                details="Email address is empty or null.",
                normalized=None
            ), None, None

        cleaned = email_str.strip()
        if not cleaned:
            return SyntaxCheckResult(
                valid=False,
                details="Email address consists solely of whitespace.",
                normalized=None
            ), None, None

        if len(cleaned) > 254:
            return SyntaxCheckResult(
                valid=False,
                details="Email address exceeds maximum permitted RFC length (254 characters).",
                normalized=None
            ), None, None

        if CONSECUTIVE_DOTS_REGEX.search(cleaned):
            return SyntaxCheckResult(
                valid=False,
                details="Email address contains consecutive dots, violating RFC standards.",
                normalized=None
            ), None, None

        try:
            # Deliverability check disabled because DNS service handles it separately with timeouts
            validation = validate_email(cleaned, check_deliverability=False)
            normalized = validation.normalized
            local_part = validation.local_part
            domain = validation.domain

            # Basic checks on domain parts
            if "." not in domain:
                return SyntaxCheckResult(
                    valid=False,
                    details=f"Domain '{domain}' lacks a top-level domain extension.",
                    normalized=None
                ), None, None

            return SyntaxCheckResult(
                valid=True,
                details="Email syntax complies with RFC 5322.",
                normalized=normalized
            ), local_part, domain

        except EmailNotValidError as e:
            return SyntaxCheckResult(
                valid=False,
                details=f"Syntax validation failed: {str(e)}",
                normalized=None
            ), None, None
        except Exception as e:
            return SyntaxCheckResult(
                valid=False,
                details=f"Unexpected syntax error: {str(e)}",
                normalized=None
            ), None, None
