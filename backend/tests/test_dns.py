from unittest.mock import MagicMock, patch
import dns.resolver
import dns.exception
import pytest
from app.services.dns_service import DNSService


@pytest.fixture
def dns_service():
    return DNSService(timeout=2.0)


def test_valid_mx_records(dns_service):
    mock_mx1 = MagicMock()
    mock_mx1.preference = 10
    mock_mx1.exchange = "mail1.example.com."
    
    mock_mx2 = MagicMock()
    mock_mx2.preference = 20
    mock_mx2.exchange = "mail2.example.com."

    with patch.object(dns_service.resolver, "resolve", return_value=[mock_mx2, mock_mx1]):
        res, is_temp = dns_service.check_domain("example.com")
        assert is_temp is False
        assert res.valid is True
        assert res.has_mx is True
        assert res.mx_records == ["mail1.example.com", "mail2.example.com"]
        assert res.fallback_a is False


def test_nxdomain_handling(dns_service):
    with patch.object(dns_service.resolver, "resolve", side_effect=dns.resolver.NXDOMAIN):
        res, is_temp = dns_service.check_domain("nonexistent-domain-12345.org")
        assert is_temp is False
        assert res.valid is False
        assert res.has_mx is False
        assert "does not exist" in res.details


def test_null_mx_record_rfc7505(dns_service):
    mock_null_mx = MagicMock()
    mock_null_mx.preference = 0
    mock_null_mx.exchange = "."

    with patch.object(dns_service.resolver, "resolve", return_value=[mock_null_mx]):
        res, is_temp = dns_service.check_domain("nomail.example.com")
        assert is_temp is False
        assert res.valid is False
        assert "Null MX record" in res.details


def test_rfc5321_fallback_to_a_record(dns_service):
    def resolve_side_effect(qname, rdtype):
        if rdtype == "MX":
            raise dns.resolver.NoAnswer()
        elif rdtype == "A":
            return ["192.0.2.1"]
        raise dns.resolver.NoAnswer()

    with patch.object(dns_service.resolver, "resolve", side_effect=resolve_side_effect):
        res, is_temp = dns_service.check_domain("legacy-mail-server.com")
        assert is_temp is False
        assert res.valid is True
        assert res.has_mx is False
        assert res.fallback_a is True
        assert "RFC 5321" in res.details


def test_dns_timeout_is_temporary(dns_service):
    with patch.object(dns_service.resolver, "resolve", side_effect=dns.exception.Timeout):
        res, is_temp = dns_service.check_domain("slow-dns-server.com")
        assert is_temp is True
        assert res.valid is False
        assert "timed out" in res.details


def test_disposable_domain(dns_service):
    mock_mx = MagicMock()
    mock_mx.preference = 10
    mock_mx.exchange = "mail.mailinator.com."

    with patch.object(dns_service.resolver, "resolve", return_value=[mock_mx]):
        res, _ = dns_service.check_domain("mailinator.com")
        assert res.is_disposable is True
