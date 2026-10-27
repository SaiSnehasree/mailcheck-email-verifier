from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app
from app.models import DomainCheckResult, SMTPCheckResult

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "MailCheck" in data["name"]
    assert data["status"] == "operational"
    assert "endpoints" in data


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_verify_empty_list():
    response = client.post("/api/verify", json={"emails": []})
    assert response.status_code == 400
    assert "cannot be empty" in response.json()["detail"]


def test_verify_exceed_limit():
    too_many = [f"test{i}@example.com" for i in range(505)]
    response = client.post("/api/verify", json={"emails": too_many})
    assert response.status_code == 422 or response.status_code == 400


def test_verify_success_flow():
    mock_domain = DomainCheckResult(
        valid=True, has_mx=True, mx_records=["mx.example.com"], fallback_a=False, details="OK"
    )
    mock_smtp = SMTPCheckResult(
        attempted=True, success=True, catch_all=False, response_code=250, details="OK"
    )

    with patch("app.services.dns_service.DNSService.check_domain", return_value=(mock_domain, False)), \
         patch("app.services.smtp_service.SMTPService.check_recipient", return_value=mock_smtp):

        response = client.post("/api/verify", json={"emails": ["contact@example.com", "hello@example.com"]})
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 2
        assert data["summary"]["total_unique"] == 2
        assert data["summary"]["likely_delivered"] == 2
        assert data["results"][0]["status"] == "likely_delivered"
        assert "checked_at" in data["results"][0]
