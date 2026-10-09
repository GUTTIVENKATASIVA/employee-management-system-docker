// Must match DEPARTMENTS in backend/app/validators.py
export const DEPARTMENTS = [
  'Engineering',
  'Finance',
  'Human Resources',
  'Marketing',
  'Operations',
  'Sales',
  'Support',
];

// Each department keeps one hue everywhere it appears (chips, avatars, the bar).
export const DEPARTMENT_HUES = {
  Engineering: 205,
  Finance: 150,
  'Human Resources': 330,
  Marketing: 32,
  Operations: 262,
  Sales: 8,
  Support: 178,
};

export const hueFor = (department) => DEPARTMENT_HUES[department] ?? 210;
