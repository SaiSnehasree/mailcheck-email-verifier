import logging
import re
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.models import VerifyEmailsRequest, VerifyEmailsResponse
from app.services.verifier_service import VerifierService

# Configure privacy-preserving logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("mailcheck.api")


def mask_email_for_privacy(email: str) -> str:
    """Masks email address for privacy in server logs (e.g., j***n@e***e.com)."""
    if not email or "@" not in email:
        return "[redacted-malformed]"
    parts = email.split("@", 1)
    user, domain = parts[0], parts[1]
    masked_user = (user[0] + "***" + user[-1]) if len(user) > 2 else "***"
    domain_parts = domain.split(".")
    masked_domain = (domain_parts[0][0] + "***." + domain_parts[-1]) if len(domain_parts) > 1 and len(domain_parts[0]) > 1 else "***"
    return f"{masked_user}@{masked_domain}"


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Production-ready bulk email verification API. Classifies emails as Likely Delivered, Likely to Bounce, or Unknown."
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

verifier_service = VerifierService()


@app.get("/", tags=["General"])
async def root_info():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
        "endpoints": {
            "health": "/health",
            "verify": "/api/verify",
            "docs": "/docs"
        },
        "limits": {
            "max_emails_per_request": settings.MAX_EMAILS_PER_REQUEST,
            "smtp_check_enabled": settings.ENABLE_SMTP_CHECK
        },
        "policy": "Privacy-focused. Never sends actual emails. In-memory processing without persistent storage."
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "smtp_enabled": settings.ENABLE_SMTP_CHECK,
        "version": settings.APP_VERSION
    }


@app.post(
    "/api/verify",
    response_model=VerifyEmailsResponse,
    status_code=status.HTTP_200_OK,
    tags=["Verification"]
)
async def verify_emails(payload: VerifyEmailsRequest, request: Request):
    if not payload.emails:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The emails array cannot be empty."
        )

    if len(payload.emails) > settings.MAX_EMAILS_PER_REQUEST:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Batch size exceeds maximum limit of {settings.MAX_EMAILS_PER_REQUEST} emails per request."
        )

    # Privacy-preserving logging
    sample_preview = [mask_email_for_privacy(e) for e in payload.emails[:3]]
    logger.info(
        f"Processing verification batch of {len(payload.emails)} emails. Samples: {sample_preview}"
    )

    try:
        response = await verifier_service.verify_batch(payload.emails)
        logger.info(
            f"Batch completed in {response.summary.duration_ms}ms: "
            f"{response.summary.likely_delivered} delivered, "
            f"{response.summary.likely_to_bounce} bounce, "
            f"{response.summary.unknown} unknown."
        )
        return response
    except Exception as e:
        logger.error(f"Unexpected error during batch verification: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing the verification request."
        )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error occurred. Please try again later."}
    )
