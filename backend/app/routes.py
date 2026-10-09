from datetime import date, timedelta

from flask import Blueprint, current_app, jsonify, request, url_for
from sqlalchemy import func, or_, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from .extensions import db
from .models import Employee
from .validators import validate_employee

api = Blueprint("api", __name__, url_prefix="/api")


def error_response(message, status, details=None):
    body = {"error": message}
    if details:
        body["details"] = details
    return jsonify(body), status


def _escape_like(value: str) -> str:
    """Escape LIKE wildcards so user input is matched literally."""
    return value.replace("!", "!!").replace("%", "!%").replace("_", "!_")


def _get_or_404(employee_id):
    employee = db.session.get(Employee, employee_id)
    if employee is None:
        return None, error_response("Employee not found", 404)
    return employee, None


def _email_taken(email, exclude_id=None):
    query = Employee.query.filter(func.lower(Employee.email) == email.lower())
    if exclude_id is not None:
        query = query.filter(Employee.id != exclude_id)
    return db.session.query(query.exists()).scalar()


DUPLICATE_EMAIL = ("An employee with this email already exists",
                   {"email": "This email is already in use"})


@api.get("/health")
def health():
    try:
        db.session.execute(text("SELECT 1"))
    except SQLAlchemyError:
        current_app.logger.exception("Health check: database unreachable")
        return jsonify(status="degraded", database="unavailable"), 503
    return jsonify(status="ok", database="connected")


@api.get("/employees")
def list_employees():
    search = request.args.get("q", "").strip()
    department = request.args.get("department", "").strip()

    query = Employee.query
    if search:
        pattern = f"%{_escape_like(search)}%"
        full_name = Employee.first_name + " " + Employee.last_name
        query = query.filter(or_(
            Employee.first_name.ilike(pattern, escape="!"),
            Employee.last_name.ilike(pattern, escape="!"),
            full_name.ilike(pattern, escape="!"),
            Employee.email.ilike(pattern, escape="!"),
        ))
    if department and department.lower() != "all":
        query = query.filter(Employee.department == department)

    employees = query.order_by(Employee.last_name, Employee.first_name, Employee.id).all()
    return jsonify(employees=[e.to_dict() for e in employees], count=len(employees))


@api.get("/employees/<int:employee_id>")
def get_employee(employee_id):
    employee, err = _get_or_404(employee_id)
    return err if err else jsonify(employee.to_dict())


@api.post("/employees")
def create_employee():
    payload = request.get_json(force=True, silent=True)
    clean, errors = validate_employee(payload)
    if errors:
        return error_response("Validation failed", 400, errors)
    if _email_taken(clean["email"]):
        return error_response(*DUPLICATE_EMAIL, 409)

    employee = Employee(**clean)
    db.session.add(employee)
    try:
        db.session.commit()
    except IntegrityError:  # race with another request using the same email
        db.session.rollback()
        return error_response(*DUPLICATE_EMAIL, 409)

    response = jsonify(employee.to_dict())
    response.status_code = 201
    response.headers["Location"] = url_for("api.get_employee", employee_id=employee.id)
    return response


@api.put("/employees/<int:employee_id>")
def update_employee(employee_id):
    employee, err = _get_or_404(employee_id)
    if err:
        return err

    payload = request.get_json(force=True, silent=True)
    clean, errors = validate_employee(payload, partial=True)
    if errors:
        return error_response("Validation failed", 400, errors)
    if "email" in clean and _email_taken(clean["email"], exclude_id=employee.id):
        return error_response(*DUPLICATE_EMAIL, 409)

    for field, value in clean.items():
        setattr(employee, field, value)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error_response(*DUPLICATE_EMAIL, 409)
    return jsonify(employee.to_dict())


@api.delete("/employees/<int:employee_id>")
def delete_employee(employee_id):
    employee, err = _get_or_404(employee_id)
    if err:
        return err
    db.session.delete(employee)
    db.session.commit()
    return jsonify(message="Employee deleted", id=employee_id)


@api.get("/stats")
def stats():
    total = db.session.query(func.count(Employee.id)).scalar() or 0
    payroll = db.session.query(func.coalesce(func.sum(Employee.salary), 0)).scalar()
    average = db.session.query(func.avg(Employee.salary)).scalar()
    recent = (db.session.query(func.count(Employee.id))
              .filter(Employee.hire_date >= date.today() - timedelta(days=90)).scalar() or 0)

    rows = (db.session.query(Employee.department, func.count(Employee.id), func.avg(Employee.salary))
            .group_by(Employee.department)
            .order_by(func.count(Employee.id).desc(), Employee.department)
            .all())

    return jsonify(
        total_employees=total,
        total_departments=len(rows),
        average_salary=round(float(average), 2) if average is not None else 0,
        total_payroll=round(float(payroll), 2),
        new_hires_last_90_days=recent,
        by_department=[
            {"department": name, "count": count, "average_salary": round(float(avg), 2)}
            for name, count, avg in rows
        ],
    )
