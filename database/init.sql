-- Runs once, the first time the MySQL data volume is created.
-- The database `employee_db` itself is created by the MySQL image from the
-- MYSQL_DATABASE environment variable, and this script runs inside it.
-- All people below are fictional; example.com addresses are reserved for docs.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS employees (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name  VARCHAR(50)  NOT NULL,
  last_name   VARCHAR(50)  NOT NULL,
  email       VARCHAR(120) NOT NULL,
  phone       VARCHAR(20)  NULL,
  department  VARCHAR(50)  NOT NULL,
  job_title   VARCHAR(100) NOT NULL,
  salary      DECIMAL(10,2) NOT NULL,
  hire_date   DATE         NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_employees_email (email),
  KEY ix_employees_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO employees (first_name, last_name, email, phone, department, job_title, salary, hire_date) VALUES
('Aarav',  'Sharma',   'aarav.sharma@example.com',   '+1 555 0101', 'Engineering',     'Senior Software Engineer',  125000.00, '2021-03-15'),
('Meera',  'Iyer',     'meera.iyer@example.com',     '+1 555 0102', 'Engineering',     'Backend Developer',          98000.00, '2022-07-01'),
('Kabir',  'Nair',     'kabir.nair@example.com',     '+1 555 0103', 'Engineering',     'Frontend Developer',         92000.00, '2023-01-09'),
('Ananya', 'Reddy',    'ananya.reddy@example.com',   '+1 555 0104', 'Human Resources', 'HR Manager',                 88000.00, '2020-09-21'),
('Rohan',  'Mehta',    'rohan.mehta@example.com',    '+1 555 0105', 'Sales',           'Sales Executive',            67000.00, '2022-11-14'),
('Diya',   'Kapoor',   'diya.kapoor@example.com',    '+1 555 0106', 'Sales',           'Regional Sales Lead',        95000.00, '2019-05-27'),
('Vikram', 'Patel',    'vikram.patel@example.com',   '+1 555 0107', 'Finance',         'Financial Analyst',          82000.00, '2021-08-02'),
('Isha',   'Menon',    'isha.menon@example.com',     '+1 555 0108', 'Finance',         'Accounts Manager',          105000.00, '2018-02-12'),
('Arjun',  'Rao',      'arjun.rao@example.com',      '+1 555 0109', 'Marketing',       'Content Strategist',         72000.00, '2023-06-19'),
('Sara',   'Thomas',   'sara.thomas@example.com',    '+1 555 0110', 'Marketing',       'Marketing Manager',          99000.00, '2020-01-06'),
('Neel',   'Bose',     'neel.bose@example.com',      '+1 555 0111', 'Operations',      'Logistics Coordinator',      64000.00, '2024-02-05'),
('Tara',   'Joshi',    'tara.joshi@example.com',     '+1 555 0112', 'Support',         'Customer Support Specialist',54000.00, '2024-05-13');
