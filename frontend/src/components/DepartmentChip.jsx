import { hueFor } from '../constants';

export default function DepartmentChip({ department }) {
  return (
    <span className="chip" style={{ '--hue': hueFor(department) }}>
      {department}
    </span>
  );
}
