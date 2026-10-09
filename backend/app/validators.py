"""Input validation for employee payloads."""
import re
from datetime import date
from decimal import Decimal, InvalidOperation

DEPARTMENTS = [
    "Engineering",
    "Finance",
    "Human Resources",
    "Marketing",
    "Operations",
    "Sales",
    "Support",
]

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$")
PHONE_RE = re.compile(r"^\+?[0-9][0-9\s().\-]{5,18}[0-9]$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

MAX_SALARY = Decimal("99999999.99")


def _is_blank(value):
    return value is None or (isinstance(value, str) and not value.strip())


def _text(data, field, label, max_len, required, partial, errors, clean, check=None, message=None):
    if field not in data:
        if required and not partial:
            errors[field] = f"{label} is required"
        return
    value = data[field]
    if _is_blank(value):
        if required:
            errors[field] = f"{label} is required"
        else:
            clean[field] = None
        return
    if not isinstance(value, str):
        errors[field] = f"{label} must be text"
        return
    value = value.strip()
    if len(value) > max_len:
        errors[field] = f"{label} must be at most {max_len} characters"
    elif check and not check(value):
        errors[field] = message
    else:
        clean[field] = value


def _is_name(value: str) -> bool:
    return any(c.isalpha() for c in value) and not any(c.isdigit() for c in value)


def validate_employee(data, partial: bool = False):
    """Return (clean_data, errors). `partial=True` is used for PUT updates:
    only fields that are present are validated and returned."""
    if not isinstance(data, dict):
        return {}, {"body": "Request body must be a JSON object"}

    errors, clean = {}, {}

    _text(data, "first_name", "First name", 50, True, partial, errors, clean,
          _is_name, "First name must contain letters and no digits")
    _text(data, "last_name", "Last name", 50, True, partial, errors, clean,
          _is_name, "Last name must contain letters and no digits")
    _text(data, "email", "Email", 120, True, partial, errors, clean,
          lambda v: bool(EMAIL_RE.match(v)), "Enter a valid email address")
    if "email" in clean:
        clean["email"] = clean["email"].lower()
    _text(data, "phone", "Phone", 20, False, partial, errors, clean,
          lambda v: bool(PHONE_RE.match(v)), "Enter a valid phone number (7-20 digits, + ( ) - . allowed)")
    _text(data, "job_title", "Job title", 100, True, partial, errors, clean)

    # Department must be one of the known departments (case-insensitive).
    if "department" in data:
        value = data["department"]
        if _is_blank(value):
            errors["department"] = "Department is required"
        elif not isinstance(value, str):
            errors["department"] = "Department must be text"
        else:
            match = next((d for d in DEPARTMENTS if d.lower() == value.strip().lower()), None)
            if match:
                clean["department"] = match
            else:
                errors["department"] = "Department must be one of: " + ", ".join(DEPARTMENTS)
    elif not partial:
        errors["department"] = "Department is required"

    # Salary
    if "salary" in data:
        value = data["salary"]
        if _is_blank(value):
            errors["salary"] = "Salary is required"
        elif isinstance(value, bool) or not isinstance(value, (int, float, str)):
            errors["salary"] = "Salary must be a number"
        else:
            try:
                amount = Decimal(str(value).strip())
            except InvalidOperation:
                amount = None
            if amount is None or not amount.is_finite():
                errors["salary"] = "Salary must be a number"
            elif amount < 0 or amount > MAX_SALARY:
                errors["salary"] = "Salary must be between 0 and 99,999,999.99"
            else:
                clean["salary"] = amount.quantize(Decimal("0.01"))
    elif not partial:
        errors["salary"] = "Salary is required"

    # Hire date
    if "hire_date" in data:
        value = data["hire_date"]
        if _is_blank(value):
            errors["hire_date"] = "Hire date is required"
        elif not isinstance(value, str) or not DATE_RE.match(value.strip()):
            errors["hire_date"] = "Hire date must use the format YYYY-MM-DD"
        else:
            try:
                parsed = date.fromisoformat(value.strip())
            except ValueError:
                errors["hire_date"] = "Hire date is not a real calendar date"
            else:
                if parsed > date.today():
                    errors["hire_date"] = "Hire date cannot be in the future"
                else:
                    clean["hire_date"] = parsed
    elif not partial:
        errors["hire_date"] = "Hire date is required"

    return clean, errors
