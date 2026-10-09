import DepartmentChip from './DepartmentChip';
import { hueFor } from '../constants';
import { formatCurrency, formatDate } from '../validation';

export default function EmployeeTable({ employees, onView, onEdit, onDelete }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Employee</th>
            <th scope="col">Department</th>
            <th scope="col">Job title</th>
            <th scope="col">Hired</th>
            <th scope="col" className="num">Salary</th>
            <th scope="col"><span className="visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {employees.map((e) => {
            const fullName = `${e.first_name} ${e.last_name}`;
            return (
              <tr key={e.id}>
                <td data-label="Employee">
                  <div className="person">
                    <span className="avatar" style={{ '--hue': hueFor(e.department) }} aria-hidden="true">
                      {e.first_name[0]}
                      {e.last_name[0]}
                    </span>
                    <span>
                      <strong>{fullName}</strong>
                      <br />
                      <span className="muted small">{e.email}</span>
                    </span>
                  </div>
                </td>
                <td data-label="Department"><DepartmentChip department={e.department} /></td>
                <td data-label="Job title">{e.job_title}</td>
                <td data-label="Hired">{formatDate(e.hire_date)}</td>
                <td data-label="Salary" className="num">{formatCurrency(e.salary)}</td>
                <td className="actions">
                  <button type="button" className="btn btn--ghost btn--small" onClick={() => onView(e)} aria-label={`View ${fullName}`}>View</button>
                  <button type="button" className="btn btn--ghost btn--small" onClick={() => onEdit(e)} aria-label={`Edit ${fullName}`}>Edit</button>
                  <button type="button" className="btn btn--danger-ghost btn--small" onClick={() => onDelete(e)} aria-label={`Delete ${fullName}`}>Delete</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
