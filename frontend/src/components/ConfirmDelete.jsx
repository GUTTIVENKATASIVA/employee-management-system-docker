import Modal from './Modal';

export default function ConfirmDelete({ employee, busy, onConfirm, onClose }) {
  return (
    <Modal title="Delete employee" onClose={busy ? () => {} : onClose}>
      <p className="pad">
        Delete <strong>{employee.first_name} {employee.last_name}</strong> ({employee.email})? This permanently removes the record and cannot be undone.
      </p>
      <footer className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="button" className="btn btn--danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Deleting…' : 'Delete employee'}
        </button>
      </footer>
    </Modal>
  );
}
