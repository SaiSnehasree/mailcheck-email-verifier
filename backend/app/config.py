import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "MailCheck API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:4173",
        "*"
    ]
    
    # Limitations and Timeouts
    MAX_EMAILS_PER_REQUEST: int = 500
    DNS_TIMEOUT: float = 4.0
    SMTP_TIMEOUT: float = 5.0
    
    # SMTP conservative verification toggle
    ENABLE_SMTP_CHECK: bool = True
    SMTP_HELO_DOMAIN: str = "mailcheck.verifier.local"
    SMTP_SENDER_EMAIL: str = "verify@mailcheck.verifier.local"
    
    # Rate limits & worker concurrency
    CONCURRENCY_LIMIT: int = 20


settings = Settings()
