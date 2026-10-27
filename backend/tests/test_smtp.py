from unittest.mock import patch, MagicMock
import socket
import pytest
from app.services.smtp_service import SMTPService


@pytest.fixture
def smtp_service():
    return SMTPService(timeout=1.0)


def test_smtp_accepted_not_catchall(smtp_service):
    # Mocking smtplib.SMTP
    with patch("smtplib.SMTP") as mock_smtp_cls:
        instance = mock_smtp_cls.return_value
        instance.connect.return_value = (220, b"smtp.example.com ESMTP")
        instance.mail.return_value = (250, b"OK")
        
        # First call: target recipient -> returns 250
        # Second call: catch-all probe -> returns 550
        instance.rcpt.side_effect = [
            (250, b"OK - Recipient accepted"),
            (550, b"User unknown")
        ]

        res = smtp_service.check_recipient("example.com", "valid.user@example.com", ["mx1.example.com"])
        assert res.attempted is True
        assert res.success is True
        assert res.catch_all is False
        assert res.response_code == 250


def test_smtp_catchall_detected(smtp_service):
    with patch("smtplib.SMTP") as mock_smtp_cls:
        instance = mock_smtp_cls.return_value
        instance.connect.return_value = (220, b"smtp.example.com ESMTP")
        instance.mail.return_value = (250, b"OK")
        
        # Both user and random probe return 250 -> catch-all!
        instance.rcpt.side_effect = [
            (250, b"OK - Recipient accepted"),
            (250, b"OK - Catch-all accepted")
        ]

        res = smtp_service.check_recipient("example.com", "anybody@example.com", ["mx1.example.com"])
        assert res.attempted is True
        assert res.success is True
        assert res.catch_all is True


def test_smtp_recipient_rejected(smtp_service):
    with patch("smtplib.SMTP") as mock_smtp_cls:
        instance = mock_smtp_cls.return_value
        instance.connect.return_value = (220, b"smtp.example.com ESMTP")
        instance.mail.return_value = (250, b"OK")
        instance.rcpt.return_value = (550, b"Requested action not taken: mailbox unavailable")

        res = smtp_service.check_recipient("example.com", "nonexistent@example.com", ["mx1.example.com"])
        assert res.attempted is True
        assert res.success is False
        assert res.catch_all is False
        assert res.response_code == 550


def test_smtp_port25_blocked_or_timed_out(smtp_service):
    with patch("smtplib.SMTP") as mock_smtp_cls:
        instance = mock_smtp_cls.return_value
        instance.connect.side_effect = socket.timeout("Timed out connecting to port 25")

        res = smtp_service.check_recipient("example.com", "user@example.com", ["mx1.example.com"])
        assert res.attempted is True
        assert res.success is None
        assert "timed out" in res.details.lower()
