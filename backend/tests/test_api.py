import pytest

from conftest import make_payload


# ---------- health ----------
def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.get_json() == {"status": "ok", "database": "connected"}


# ---------- list / get ----------
def test_list_empty(client):
    res = client.get("/api/employees")
    assert res.status_code == 200
    assert res.get_json() == {"employees": [], "count": 0}


def test_list_returns_all_sorted_by_last_name(client, create):
    create(first_name="Zed", last_name="Young", email="zed@example.com")
    create(first_name="Amy", last_name="Adams", email="amy@example.com")
    data = client.get("/api/employees").get_json()
    assert data["count"] == 2
    assert [e["last_name"] for e in data["employees"]] == ["Adams", "Young"]


def test_get_employee(client, create):
    created = create()
    res = client.get(f"/api/employees/{created['id']}")
    assert res.status_code == 200
    body = res.get_json()
    assert body["email"] == "asha.verma@example.com"
    assert body["salary"] == 90000.0
    assert body["hire_date"] == "2023-04-10"
    assert body["created_at"] and body["updated_at"]


def test_get_missing_employee_returns_404(client):
    res = client.get("/api/employees/9999")
    assert res.status_code == 404
    assert res.get_json()["error"] == "Employee not found"


# ---------- create ----------
def test_create_employee(client):
    res = client.post("/api/employees", json=make_payload(email="  Asha.Verma@Example.com "))
    assert res.status_code == 201
    body = res.get_json()
    assert body["id"] >= 1
    assert body["email"] == "asha.verma@example.com"  # trimmed + lowercased
    assert res.headers["Location"].endswith(f"/api/employees/{body['id']}")


def test_create_without_optional_phone(client):
    payload = make_payload()
    del payload["phone"]
    res = client.post("/api/employees", json=payload)
    assert res.status_code == 201
    assert res.get_json()["phone"] is None


@pytest.mark.parametrize("override, field", [
    ({"first_name": ""}, "first_name"),
    ({"last_name": "R2D2"}, "last_name"),
    ({"email": "not-an-email"}, "email"),
    ({"phone": "abc"}, "phone"),
    ({"department": "Piracy"}, "department"),
    ({"job_title": " "}, "job_title"),
    ({"salary": -5}, "salary"),
    ({"salary": "lots"}, "salary"),
    ({"salary": True}, "salary"),
    ({"salary": "NaN"}, "salary"),
    ({"hire_date": "10/04/2023"}, "hire_date"),
    ({"hire_date": "2023-02-30"}, "hire_date"),
    ({"hire_date": "2999-01-01"}, "hire_date"),
    ({"first_name": "x" * 51}, "first_name"),
])
def test_create_invalid_input_returns_400(client, override, field):
    res = client.post("/api/employees", json=make_payload(**override))
    assert res.status_code == 400
    body = res.get_json()
    assert body["error"] == "Validation failed"
    assert field in body["details"]


def test_create_missing_required_fields(client):
    res = client.post("/api/employees", json={})
    assert res.status_code == 400
    assert set(res.get_json()["details"]) == {
        "first_name", "last_name", "email", "department", "job_title", "salary", "hire_date"}


def test_create_with_non_json_body_returns_400(client):
    res = client.post("/api/employees", data="not json", content_type="text/plain")
    assert res.status_code == 400


def test_create_with_json_array_returns_400(client):
    res = client.post("/api/employees", json=[1, 2, 3])
    assert res.status_code == 400


def test_duplicate_email_returns_409(client, create):
    create()
    res = client.post("/api/employees", json=make_payload(first_name="Other"))
    assert res.status_code == 409
    assert "email" in res.get_json()["details"]


def test_duplicate_email_is_case_insensitive(client, create):
    create()
    res = client.post("/api/employees", json=make_payload(email="ASHA.VERMA@EXAMPLE.COM"))
    assert res.status_code == 409


# ---------- update ----------
def test_update_employee(client, create):
    created = create()
    res = client.put(f"/api/employees/{created['id']}",
                     json={"job_title": "Staff Engineer", "salary": "120000.50"})
    assert res.status_code == 200
    body = res.get_json()
    assert body["job_title"] == "Staff Engineer"
    assert body["salary"] == 120000.5
    assert body["first_name"] == "Asha"  # untouched
    assert client.get(f"/api/employees/{created['id']}").get_json()["job_title"] == "Staff Engineer"


def test_update_with_full_payload_and_same_email(client, create):
    created = create()
    res = client.put(f"/api/employees/{created['id']}", json=make_payload(department="Finance"))
    assert res.status_code == 200
    assert res.get_json()["department"] == "Finance"


def test_update_missing_employee_returns_404(client):
    res = client.put("/api/employees/9999", json={"job_title": "Ghost"})
    assert res.status_code == 404


def test_update_invalid_input_returns_400(client, create):
    created = create()
    res = client.put(f"/api/employees/{created['id']}", json={"email": "nope", "salary": -1})
    assert res.status_code == 400
    assert {"email", "salary"} <= set(res.get_json()["details"])


def test_update_cannot_clear_required_field(client, create):
    created = create()
    res = client.put(f"/api/employees/{created['id']}", json={"first_name": ""})
    assert res.status_code == 400


def test_update_to_duplicate_email_returns_409(client, create):
    create()
    other = create(email="other@example.com")
    res = client.put(f"/api/employees/{other['id']}", json={"email": "asha.verma@example.com"})
    assert res.status_code == 409


# ---------- delete ----------
def test_delete_employee(client, create):
    created = create()
    res = client.delete(f"/api/employees/{created['id']}")
    assert res.status_code == 200
    assert client.get(f"/api/employees/{created['id']}").status_code == 404
    assert client.get("/api/employees").get_json()["count"] == 0


def test_delete_missing_employee_returns_404(client):
    assert client.delete("/api/employees/9999").status_code == 404


# ---------- search & filter ----------
@pytest.fixture()
def team(create):
    create(first_name="Priya", last_name="Nair", email="priya.nair@example.com", department="Engineering")
    create(first_name="Rohan", last_name="Mehta", email="rohan@corp.example.com", department="Sales")
    create(first_name="Meera", last_name="Iyer", email="meera.iyer@example.com", department="Engineering")


def test_search_by_first_name(client, team):
    names = [e["first_name"] for e in client.get("/api/employees?q=priya").get_json()["employees"]]
    assert names == ["Priya"]


def test_search_by_last_name_is_case_insensitive(client, team):
    assert client.get("/api/employees?q=MEHTA").get_json()["count"] == 1


def test_search_by_full_name(client, team):
    assert client.get("/api/employees?q=meera iyer").get_json()["count"] == 1


def test_search_by_email_fragment(client, team):
    data = client.get("/api/employees?q=corp.example").get_json()
    assert [e["first_name"] for e in data["employees"]] == ["Rohan"]


def test_search_treats_wildcards_literally(client, team):
    assert client.get("/api/employees?q=%25").get_json()["count"] == 0
    assert client.get("/api/employees?q=_").get_json()["count"] == 0


def test_search_no_match(client, team):
    assert client.get("/api/employees?q=zzz").get_json()["count"] == 0


def test_filter_by_department(client, team):
    data = client.get("/api/employees?department=Engineering").get_json()
    assert data["count"] == 2
    assert {e["department"] for e in data["employees"]} == {"Engineering"}


def test_filter_all_returns_everyone(client, team):
    assert client.get("/api/employees?department=all").get_json()["count"] == 3


def test_search_and_filter_combined(client, team):
    data = client.get("/api/employees?q=example.com&department=Sales").get_json()
    assert [e["first_name"] for e in data["employees"]] == ["Rohan"]


# ---------- stats ----------
def test_stats_empty(client):
    body = client.get("/api/stats").get_json()
    assert body["total_employees"] == 0
    assert body["total_departments"] == 0
    assert body["average_salary"] == 0
    assert body["by_department"] == []


def test_stats(client, create, today):
    create(email="a@example.com", department="Engineering", salary=100000, hire_date=today)
    create(email="b@example.com", department="Engineering", salary=80000)
    create(email="c@example.com", department="Finance", salary=60000)
    body = client.get("/api/stats").get_json()
    assert body["total_employees"] == 3
    assert body["total_departments"] == 2
    assert body["average_salary"] == 80000.0
    assert body["total_payroll"] == 240000.0
    assert body["new_hires_last_90_days"] == 1
    assert body["by_department"][0] == {"department": "Engineering", "count": 2, "average_salary": 90000.0}


# ---------- error handling ----------
def test_unknown_route_returns_json_404(client):
    res = client.get("/api/nope")
    assert res.status_code == 404
    assert res.get_json() == {"error": "Resource not found"}


def test_wrong_method_returns_json_405(client):
    res = client.patch("/api/employees")
    assert res.status_code == 405
    assert res.get_json() == {"error": "Method not allowed"}


def test_non_numeric_id_returns_404(client):
    assert client.get("/api/employees/abc").status_code == 404
