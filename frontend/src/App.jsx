import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { useDebounce, useToasts } from './hooks';
import StatsCards from './components/StatsCards';
import SearchFilters from './components/SearchFilters';
import EmployeeTable from './components/EmployeeTable';
import EmployeeForm from './components/EmployeeForm';
import EmployeeDetails from './components/EmployeeDetails';
import ConfirmDelete from './components/ConfirmDelete';
import Toasts from './components/Toasts';

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [apiUp, setApiUp] = useState(null);

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const [modal, setModal] = useState(null); // { type: 'add' | 'edit' | 'view' | 'delete', employee? }
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toasts, notify, dismiss } = useToasts();

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const closeModal = useCallback(() => setModal(null), []);

  // Employee list: re-fetched when search, filter, or data changes.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setListError('');
    api
      .listEmployees({ q: debouncedSearch, department }, controller.signal)
      .then((data) => setEmployees(data.employees))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setEmployees([]);
        setListError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [debouncedSearch, department, refreshKey]);

  // Statistics: re-fetched whenever data changes.
  useEffect(() => {
    const controller = new AbortController();
    setStatsError(false);
    api
      .getStats(controller.signal)
      .then(setStats)
      .catch((err) => err.name !== 'AbortError' && setStatsError(true))
      .finally(() => {
        if (!controller.signal.aborted) setStatsLoading(false);
      });
    return () => controller.abort();
  }, [refreshKey]);

  // API connection indicator (GET /api/health)
  useEffect(() => {
    let cancelled = false;
    const check = () =>
      api
        .health()
        .then(() => !cancelled && setApiUp(true))
        .catch(() => !cancelled && setApiUp(false));
    check();
    const id = setInterval(check, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const reportError = (err) => {
    // Field-level problems are shown inside the form; everything else becomes a toast.
    if (!err.details || !Object.keys(err.details).length) notify('error', err.message);
  };

  const saveEmployee = async (payload) => {
    const editing = modal?.type === 'edit';
    try {
      const saved = editing
        ? await api.updateEmployee(modal.employee.id, payload)
        : await api.createEmployee(payload);
      notify('success', `${saved.first_name} ${saved.last_name} ${editing ? 'updated' : 'added'}.`);
      closeModal();
      refresh();
    } catch (err) {
      reportError(err);
      throw err;
    }
  };

  const confirmDelete = async () => {
    const target = modal.employee;
    setDeleting(true);
    try {
      await api.deleteEmployee(target.id);
      notify('success', `${target.first_name} ${target.last_name} deleted.`);
      closeModal();
      refresh();
    } catch (err) {
      notify('error', err.message);
      if (err.status === 404) {
        closeModal();
        refresh();
      }
    } finally {
      setDeleting(false);
    }
  };

  const filtersActive = Boolean(search || department);
  const clearFilters = () => {
    setSearch('');
    setDepartment('');
  };

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h1>Employee directory</h1>
          <p className="muted">Manage people, roles and salaries in one place.</p>
        </div>
        <div className="topbar__actions">
          <span className={`status status--${apiUp === null ? 'wait' : apiUp ? 'up' : 'down'}`} role="status">
            <span className="status__dot" />
            {apiUp === null ? 'Checking API…' : apiUp ? 'API connected' : 'API unreachable'}
          </span>
          <button type="button" className="btn btn--primary" onClick={() => setModal({ type: 'add' })}>
            Add employee
          </button>
        </div>
      </header>

      <main>
        <StatsCards
          stats={stats}
          loading={statsLoading}
          error={statsError}
          activeDepartment={department}
          onSelectDepartment={setDepartment}
        />

        <section className="panel" aria-label="Employees">
          <SearchFilters
            search={search}
            onSearch={setSearch}
            department={department}
            onDepartment={setDepartment}
            onClear={clearFilters}
            total={employees.length}
          />

          {loading && (
            <div className="loading" aria-busy="true" role="status">
              <div className="spinner" aria-hidden="true" />
              Loading employees…
            </div>
          )}

          {!loading && listError && (
            <div className="state state--error" role="alert">
              <p><strong>Couldn’t load employees.</strong></p>
              <p className="muted">{listError}</p>
              <button type="button" className="btn btn--primary" onClick={refresh}>Try again</button>
            </div>
          )}

          {!loading && !listError && employees.length === 0 && (
            <div className="state">
              {filtersActive ? (
                <>
                  <p><strong>No employees match these filters.</strong></p>
                  <p className="muted">Try a different name, email or department.</p>
                  <button type="button" className="btn btn--ghost" onClick={clearFilters}>Clear filters</button>
                </>
              ) : (
                <>
                  <p><strong>No employees yet.</strong></p>
                  <p className="muted">Add the first person to get started.</p>
                  <button type="button" className="btn btn--primary" onClick={() => setModal({ type: 'add' })}>
                    Add employee
                  </button>
                </>
              )}
            </div>
          )}

          {!loading && !listError && employees.length > 0 && (
            <EmployeeTable
              employees={employees}
              onView={(employee) => setModal({ type: 'view', employee })}
              onEdit={(employee) => setModal({ type: 'edit', employee })}
              onDelete={(employee) => setModal({ type: 'delete', employee })}
            />
          )}
        </section>
      </main>

      {(modal?.type === 'add' || modal?.type === 'edit') && (
        <EmployeeForm employee={modal.employee} onSubmit={saveEmployee} onClose={closeModal} />
      )}
      {modal?.type === 'view' && (
        <EmployeeDetails
          employeeId={modal.employee.id}
          onClose={closeModal}
          onEdit={(employee) => setModal({ type: 'edit', employee })}
        />
      )}
      {modal?.type === 'delete' && (
        <ConfirmDelete employee={modal.employee} busy={deleting} onConfirm={confirmDelete} onClose={closeModal} />
      )}

      <Toasts toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
