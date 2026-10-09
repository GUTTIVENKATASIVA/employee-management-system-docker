import { useState } from 'react';
import Modal from './Modal';
import { DEPARTMENTS } from '../constants';
import { todayISO, validateEmployee } from '../validation';

const EMPTY = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  department: '',
  job_title: '',
  salary: '',
  hire_date: '',
};

function toFormValues(employee) {
  if (!employee) return { ...EMPTY, hire_date: todayISO() };
  return {
    first_name: employee.first_name,
    last_name: employee.last_name,
    email: employee.email,
    phone: employee.phone ?? '',
    department: employee.department,
    job_title: employee.job_title,
    salary: String(employee.salary),
    hire_date: employee.hire_date,
  };
}

function Field({ id, label, error, hint, children }) {
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <p className="hint">{hint}</p>}
      {error && (
        <p className="error-text" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export default function EmployeeForm({ employee, onSubmit, onClose }) {
  const editing = Boolean(employee);
  const [values, setValues] = useState(() => toFormValues(employee));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (name) => (e) => {
    setValues((v) => ({ ...v, [name]: e.target.value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const input = (name, extra = {}) => ({
    id: name,
    name,
    value: values[name],
    onChange: set(name),
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
    ...extra,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validateEmployee(values);
    setErrors(found);
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        email: values.email.trim().toLowerCase(),
        phone: values.phone.trim(),
        department: values.department,
        job_title: values.job_title.trim(),
        salary: Number(values.salary),
        hire_date: values.hire_date,
      });
    } catch (err) {
      // Show server-side validation / duplicate-email messages next to the field.
      if (err.details && Object.keys(err.details).length) {
        setErrors(err.details);
        document.getElementById(Object.keys(err.details)[0])?.focus();
      }
      setSaving(false);
    }
  };

  return (
    <Modal title={editing ? 'Edit employee' : 'Add employee'} onClose={saving ? () => {} : onClose} wide>
      <form onSubmit={handleSubmit} noValidate className="form">
        <div className="grid-2">
          <Field id="first_name" label="First name" error={errors.first_name}>
            <input {...input('first_name', { autoComplete: 'off', autoFocus: true })} />
          </Field>
          <Field id="last_name" label="Last name" error={errors.last_name}>
            <input {...input('last_name', { autoComplete: 'off' })} />
          </Field>
          <Field id="email" label="Email" error={errors.email}>
            <input {...input('email', { type: 'email', autoComplete: 'off' })} />
          </Field>
          <Field id="phone" label="Phone (optional)" error={errors.phone}>
            <input {...input('phone', { type: 'tel', autoComplete: 'off' })} />
          </Field>
          <Field id="department" label="Department" error={errors.department}>
            <select {...input('department')}>
              <option value="">Choose a department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field id="job_title" label="Job title" error={errors.job_title}>
            <input {...input('job_title', { autoComplete: 'off' })} />
          </Field>
          <Field id="salary" label="Annual salary (USD)" error={errors.salary}>
            <input {...input('salary', { type: 'number', min: 0, step: '0.01', inputMode: 'decimal' })} />
          </Field>
          <Field id="hire_date" label="Hire date" error={errors.hire_date}>
            <input {...input('hire_date', { type: 'date', max: todayISO() })} />
          </Field>
        </div>

        <footer className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add employee'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
