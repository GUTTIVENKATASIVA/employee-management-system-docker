import { formatCurrency } from '../validation';
import { hueFor } from '../constants';

function Card({ label, value, loading }) {
  return (
    <div className="stat">
      <p className="stat__label">{label}</p>
      <p className={`stat__value${loading ? ' skeleton' : ''}`}>{loading ? '\u00a0' : value}</p>
    </div>
  );
}

export default function StatsCards({ stats, loading, error, activeDepartment, onSelectDepartment }) {
  const show = !loading && stats && !error;
  const dash = '—';
  return (
    <section aria-label="Statistics" className="stats-wrap">
      <div className="stats">
        <Card label="Total employees" loading={loading} value={show ? stats.total_employees : dash} />
        <Card label="Departments" loading={loading} value={show ? stats.total_departments : dash} />
        <Card label="Average salary" loading={loading} value={show ? formatCurrency(stats.average_salary) : dash} />
        <Card label="Hired in last 90 days" loading={loading} value={show ? stats.new_hires_last_90_days : dash} />
      </div>

      {show && stats.total_employees > 0 && (
        <div className="distribution">
          <div className="distribution__bar" role="group" aria-label="Employees by department">
            {stats.by_department.map((d) => (
              <button
                key={d.department}
                type="button"
                className={`distribution__seg${activeDepartment === d.department ? ' is-active' : ''}`}
                style={{ flexGrow: d.count, '--hue': hueFor(d.department) }}
                onClick={() => onSelectDepartment(activeDepartment === d.department ? '' : d.department)}
                title={`${d.department}: ${d.count}`}
                aria-pressed={activeDepartment === d.department}
              >
                <span className="visually-hidden">{d.department}</span>
              </button>
            ))}
          </div>
          <ul className="distribution__legend">
            {stats.by_department.map((d) => (
              <li key={d.department} style={{ '--hue': hueFor(d.department) }}>
                <span className="dot" /> {d.department} <strong>{d.count}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="muted small">Statistics are unavailable right now.</p>}
    </section>
  );
}
