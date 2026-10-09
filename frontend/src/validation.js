import { DEPARTMENTS } from './constants';

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const PHONE_RE = /^\+?[0-9][0-9\s().-]{5,18}[0-9]$/;

const todayISO = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
export { todayISO };

// Mirrors the server rules so people get instant feedback; the API re-validates everything.
export function validateEmployee(v) {
  const e = {};
  const name = (value, label, key) => {
    const s = value.trim();
    if (!s) e[key] = `${label} is required`;
    else if (s.length > 50) e[key] = `${label} must be at most 50 characters`;
    else if (/\d/.test(s) || !/\p{L}/u.test(s)) e[key] = `${label} must contain letters and no digits`;
  };
  name(v.first_name, 'First name', 'first_name');
  name(v.last_name, 'Last name', 'last_name');

  const email = v.email.trim();
  if (!email) e.email = 'Email is required';
  else if (email.length > 120) e.email = 'Email must be at most 120 characters';
  else if (!EMAIL_RE.test(email)) e.email = 'Enter a valid email address';

  const phone = v.phone.trim();
  if (phone && !PHONE_RE.test(phone)) e.phone = 'Enter a valid phone number (7-20 digits, + ( ) - . allowed)';

  if (!DEPARTMENTS.includes(v.department)) e.department = 'Choose a department';

  const title = v.job_title.trim();
  if (!title) e.job_title = 'Job title is required';
  else if (title.length > 100) e.job_title = 'Job title must be at most 100 characters';

  const salary = String(v.salary).trim();
  if (!salary) e.salary = 'Salary is required';
  else if (!Number.isFinite(Number(salary))) e.salary = 'Salary must be a number';
  else if (Number(salary) < 0 || Number(salary) > 99999999.99) e.salary = 'Salary must be between 0 and 99,999,999.99';

  if (!v.hire_date) e.hire_date = 'Hire date is required';
  else if (v.hire_date > todayISO()) e.hire_date = 'Hire date cannot be in the future';

  return e;
}

export const formatCurrency = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n ?? 0);

export const formatDate = (iso) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
