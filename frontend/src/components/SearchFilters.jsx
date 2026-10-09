import { DEPARTMENTS } from '../constants';

export default function SearchFilters({ search, onSearch, department, onDepartment, onClear, total }) {
  const active = search || department;
  return (
    <div className="filters">
      <div className="field field--grow">
        <label htmlFor="search">Search by name or email</label>
        <input
          id="search"
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="e.g. meera or @example.com"
          autoComplete="off"
        />
      </div>
      <div className="field">
        <label htmlFor="department-filter">Department</label>
        <select id="department-filter" value={department} onChange={(e) => onDepartment(e.target.value)}>
          <option value="">All departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div className="filters__meta">
        <span className="muted small" aria-live="polite">
          {total} {total === 1 ? 'result' : 'results'}
        </span>
        {active && (
          <button type="button" className="btn btn--ghost btn--small" onClick={onClear}>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
