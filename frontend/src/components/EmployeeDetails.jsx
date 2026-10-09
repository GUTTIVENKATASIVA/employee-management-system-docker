import { useEffect, useState } from 'react';
import Modal from './Modal';
import DepartmentChip from './DepartmentChip';
import { api } from '../api';
import { formatCurrency, formatDate } from '../validation';

export default function EmployeeDetails({ employeeId, onClose, onEdit }) {
  const [employee, setEmployee] = useState(null);
  const [error, setError] = useState('');

  // Fetch the full record from GET /api/employees/<id>
  useEffect(() => {
    const controller = new AbortController();
    api
      .getEmployee(employeeId, controller.signal)
      .then(setEmployee)
      .catch((err) => err.name !== 'AbortError' && setError(err.message));
    return () => controller.abort();
  }, [employeeId]);

  const stamp = (iso) => (iso ? new Date(iso).toLocaleString('en-GB') : '—');

  return (
    <Modal title={employee ? `${employee.first_name} ${employee.last_name}` : 'Employee details'} onClose={onClose}>
      {error && <p className="error-text pad">{error}</p>}
      {!employee && !error && (
        <div className="pad" aria-busy="true">
          <div className="skeleton skeleton--line" />
          <div className="skeleton skeleton--line" />
          <div className="skeleton skeleton--line" />
        </div>
      )}
      {employee && (
        <dl className="details">
          <div><dt>Email</dt><dd>{employee.email}</dd></div>
          <div><dt>Phone</dt><dd>{employee.phone || '—'}</dd></div>
          <div><dt>Department</dt><dd><DepartmentChip department={employee.department} /></dd></div>
          <div><dt>Job title</dt><dd>{employee.job_title}</dd></div>
          <div><dt>Salary</dt><dd>{formatCurrency(employee.salary)}</dd></div>
          <div><dt>Hire date</dt><dd>{formatDate(employee.hire_date)}</dd></div>
          <div><dt>Record created</dt><dd>{stamp(employee.created_at)}</dd></div>
          <div><dt>Last updated</dt><dd>{stamp(employee.updated_at)}</dd></div>
        </dl>
      )}
      <footer className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={onClose}>Close</button>
        {employee && (
          <button type="button" className="btn btn--primary" onClick={() => onEdit(employee)}>Edit employee</button>
        )}
      </footer>
    </Modal>
  );
}
