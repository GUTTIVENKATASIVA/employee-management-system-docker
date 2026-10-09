"""Tests run against an isolated in-memory SQLite database, never MySQL."""
from datetime import date

import pytest

from app import create_app
from app.extensions import db


@pytest.fixture()
def app():
    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite://",
        "SQLALCHEMY_ENGINE_OPTIONS": {},
    })
    yield app
    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def make_payload(**overrides):
    payload = {
        "first_name": "Asha",
        "last_name": "Verma",
        "email": "asha.verma@example.com",
        "phone": "+1 555 0100",
        "department": "Engineering",
        "job_title": "Software Engineer",
        "salary": 90000,
        "hire_date": "2023-04-10",
    }
    payload.update(overrides)
    return payload


@pytest.fixture()
def create(client):
    """Create an employee through the API and return the response JSON."""
    def _create(**overrides):
        res = client.post("/api/employees", json=make_payload(**overrides))
        assert res.status_code == 201, res.get_json()
        return res.get_json()
    return _create


@pytest.fixture()
def today():
    return date.today().isoformat()
