from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class VerificationStatus(str, Enum):
    LIKELY_DELIVERED = "likely_delivered"
    LIKELY_TO_BOUNCE = "likely_to_bounce"
    UNKNOWN = "unknown"


class ReasonCode(str, Enum):
    SYNTAX_INVALID = "SYNTAX_INVALID"
    DOMAIN_NOT_FOUND = "DOMAIN_NOT_FOUND"
    NO_MAIL_SERVER = "NO_MAIL_SERVER"
    DNS_TEMPORARY_ERROR = "DNS_TEMPORARY_ERROR"
    DISPOSABLE_DOMAIN = "DISPOSABLE_DOMAIN"
    RECIPIENT_REJECTED = "RECIPIENT_REJECTED"
    RECIPIENT_ACCEPTED = "RECIPIENT_ACCEPTED"
    CATCH_ALL_DETECTED = "CATCH_ALL_DETECTED"
    SMTP_BLOCKED_OR_TIMEOUT = "SMTP_BLOCKED_OR_TIMEOUT"
    GREYLISTED_OR_TEMPORARY_ERROR = "GREYLISTED_OR_TEMPORARY_ERROR"
    SMTP_DISABLED_BY_CONFIG = "SMTP_DISABLED_BY_CONFIG"
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY"


class SyntaxCheckResult(BaseModel):
    valid: bool
    details: str
    normalized: Optional[str] = None


class DomainCheckResult(BaseModel):
    valid: bool
    has_mx: bool
    mx_records: List[str] = Field(default_factory=list)
    fallback_a: bool = False
    details: str
    is_disposable: bool = False


class SMTPCheckResult(BaseModel):
    attempted: bool
    success: Optional[bool] = None
    catch_all: Optional[bool] = None
    response_code: Optional[int] = None
    details: str


class EmailVerificationResult(BaseModel):
    original_email: str
    normalized_email: str
    status: VerificationStatus
    syntax: SyntaxCheckResult
    domain: DomainCheckResult
    smtp: SMTPCheckResult
    explanation: str
    reason_code: ReasonCode
    is_duplicate: bool = False
    checked_at: str


class VerifyEmailsRequest(BaseModel):
    emails: List[str] = Field(..., max_length=500, description="List of raw email strings")


class VerifySummary(BaseModel):
    total_input: int
    total_unique: int
    total_duplicates: int
    likely_delivered: int
    likely_to_bounce: int
    unknown: int
    duration_ms: float


class VerifyEmailsResponse(BaseModel):
    results: List[EmailVerificationResult]
    summary: VerifySummary
