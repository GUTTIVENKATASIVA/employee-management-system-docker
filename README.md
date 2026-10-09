# Employee Management System (Docker)

**Part 1, Q2 — React + Flask + MySQL, containerised with Docker Compose.**
A dashboard for managing employees: list, add, view, edit, delete, search by name/email, filter by department, live statistics, form validation, loading states and notifications.

## Architecture

```
Browser ──► frontend (nginx :80 → published as host :8080)
              │  serves the built React app
              └─ /api/*  ──► backend (Flask + gunicorn :5000, internal only)
                                │  SQLAlchemy + PyMySQL, host name `db`
                                └──► db (MySQL 8, :3306 internal only, named volume mysql_data)
```

| Service    | Image / build        | Published port | Purpose                                   |
|------------|----------------------|----------------|-------------------------------------------|
| `frontend` | `./frontend` (Node build → nginx) | `8080` → 80 (only one) | Serves React, proxies `/api` to Flask |
| `backend`  | `./backend` (python:3.12-slim)    | none (expose 5000)     | REST API                              |
| `db`       | `mysql:8.0`                       | none                   | `employee_db`, volume `mysql_data`    |

Startup order is enforced with health checks: `db` healthy → `backend` healthy → `frontend` starts.

## Folder structure

```
employee-management-system-docker/
├── backend/
│   ├── app/            (config, models, validators, routes, app factory)
│   ├── tests/          (pytest suite, isolated SQLite database)
│   ├── Dockerfile  .dockerignore  requirements*.txt  pytest.ini  run.py
├── frontend/
│   ├── src/            (App, components/, api.js, validation.js, styles.css)
│   ├── Dockerfile  nginx.conf  .dockerignore  package.json  vite.config.js
├── database/init.sql   (schema + fictional sample rows, first start only)
├── scripts/integration-test.sh
├── docker-compose.yml  .env.example  .gitignore  README.md
```

## Prerequisites

Docker Engine / Docker Desktop with **Compose v2** (`docker compose version`), and free host port **8080**. Node and Python are *not* needed on the host to run the stack.

## Environment setup

```bash
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```
Edit `.env` and replace the placeholder passwords. `.env` is git-ignored and never copied into images.

| Variable | Meaning |
|---|---|
| `MYSQL_DATABASE` | Database name (keep `employee_db`; `init.sql` runs inside it) |
| `MYSQL_USER` / `MYSQL_PASSWORD` | Application account used by Flask |
| `MYSQL_ROOT_PASSWORD` | MySQL root password (db container only) |
| `FRONTEND_PORT` | Host port for the web UI (default 8080) |

## Build and run

```bash
docker compose config        # validate and print the resolved configuration
docker compose build
docker compose up -d
docker compose ps            # all three services should become "healthy"/"running"
docker compose logs          # add -f to follow, or a service name: docker compose logs backend
```

Open **http://localhost:8080**. The first start takes ~30–60 s while MySQL initialises.

## API endpoints

All responses are JSON. Errors look like `{"error": "...", "details": {"field": "message"}}`.

| Method | Path | Description | Success | Errors |
|---|---|---|---|---|
| GET | `/api/health` | API + database check | 200 | 503 |
| GET | `/api/employees?q=<text>&department=<name>` | List; `q` matches first/last/full name and email | 200 `{employees, count}` | – |
| GET | `/api/employees/<id>` | One employee | 200 | 404 |
| POST | `/api/employees` | Create | 201 + `Location` | 400, 409 duplicate email |
| PUT | `/api/employees/<id>` | Update (send any subset of fields) | 200 | 400, 404, 409 |
| DELETE | `/api/employees/<id>` | Delete | 200 | 404 |
| GET | `/api/stats` | Totals, average salary, new hires (90 days), per-department counts | 200 | – |

Employee fields: `first_name`, `last_name`, `email` (unique, stored lowercase), `phone` (optional), `department` (Engineering, Finance, Human Resources, Marketing, Operations, Sales, Support), `job_title`, `salary` (0–99,999,999.99), `hire_date` (`YYYY-MM-DD`, not in the future); responses add `id`, `created_at`, `updated_at`.

```bash
curl http://localhost:8080/api/health
curl "http://localhost:8080/api/employees?q=meera&department=Engineering"
curl -X POST http://localhost:8080/api/employees -H "Content-Type: application/json" \
  -d '{"first_name":"Test","last_name":"User","email":"test.user@example.com","department":"Sales","job_title":"Rep","salary":50000,"hire_date":"2024-01-01"}'
```

## Tests

### Unit/API tests (pytest)
Tests use an in-memory SQLite database, so they never touch MySQL data.
```bash
docker compose exec backend pytest            # inside the running container
# or locally, without Docker:
cd backend && python -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt && pytest
```
Coverage: health, list, get, create, update, delete, invalid input, duplicate email (incl. case-insensitive), missing records (404), search (name, full name, email, wildcard literals), department filter, combined search + filter, statistics, JSON error handling.

### Integration tests (running stack)
`./scripts/integration-test.sh` automates the checks below (add `--persistence` to include step 5). Run it after `docker compose up -d`.

| # | Scenario | How it is checked |
|---|---|---|
| 1 | Frontend → backend | `GET /` returns the SPA and `GET /api/health` via nginx returns 200 |
| 2 | Network isolation | Host ports 5000 and 3306 are not reachable |
| 3 | CRUD end to end | POST (201), GET, duplicate (409), invalid (400), PUT, search, stats, DELETE through port 8080 |
| 4 | Backend → MySQL | The created row is visible with `mysql` inside the `db` container |
| 5 | Container startup | `docker compose ps` shows `db`, `backend`, `frontend` healthy; backend log shows "Database ready" |
| 6 | Persistence | See next section |

Manual UI check: add, edit, view, delete an employee, search `meera`, filter by a department, submit an invalid form, and stop the backend (`docker compose stop backend`) to see the error state.

## Persistence

MySQL data lives in the named volume `mysql_data`.

```bash
# 1. add data (UI, or the curl POST above), then confirm it exists
# 2. recreate the containers but KEEP the volume
docker compose down
docker compose up -d
# 3. reload http://localhost:8080 — your record is still there
docker volume ls | grep mysql_data
docker volume inspect employee-management-system_mysql_data
```
> **Warning:** `docker compose down -v` also **deletes the volume and all data**. `init.sql` only runs when the volume is empty, so sample rows come back only after `-v`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `docker compose config` says a variable is missing | Create `.env` from `.env.example` |
| Port 8080 already in use | Set `FRONTEND_PORT=8081` in `.env`, then `docker compose up -d` |
| `db` never becomes healthy | `docker compose logs db`; the first start can take a minute |
| Backend "Access denied" after changing passwords | MySQL keeps the credentials from the first start. Reset with `docker compose down -v` (deletes data) |
| UI shows "API unreachable" / 502 | `docker compose ps`, then `docker compose logs backend frontend` |
| Frontend build fails on `npm install` | Check internet access / proxy; then run `npm install` in `frontend/` and commit the generated `package-lock.json` |
| Changes not showing | `docker compose up -d --build` |

## Cleanup

```bash
docker compose down            # stop and remove containers + network (data kept)
docker compose down -v         # ALSO delete the database volume (data lost)
docker compose down -v --rmi local   # additionally remove images built here
```

## Security notes

Credentials come only from `.env` (git-ignored, excluded from images by `.dockerignore`). SQLAlchemy uses parameterised queries (search wildcards are escaped). All input is validated server-side, unexpected errors return a generic message while details stay in the logs, Flask runs as a non-root user, and neither MySQL nor Flask is published to the host.

## Submission checklist

- [ ] `.env` created locally and **not** committed (`git status` must not list it)
- [ ] `docker compose config`, `build`, `up -d` succeed; `docker compose ps` shows 3 services healthy
- [ ] UI works at http://localhost:8080 (add / view / edit / delete / search / filter)
- [ ] `docker compose exec backend pytest` passes
- [ ] Persistence verified (`down` → `up -d` keeps data)
- [ ] Screenshots captured (below) and saved in `screenshots/`
- [ ] Repository `employee-management-system-docker` created and files pushed by you

### Screenshots to capture

| Screenshot | Command / action |
|---|---|
| Dashboard UI (stats, table) | Browser at http://localhost:8080 |
| Add/edit form with validation error | Submit an empty form |
| Running containers | `docker compose ps` |
| API responses | `curl http://localhost:8080/api/health`, `/api/employees`, `/api/stats` |
| Logs | `docker compose logs --tail=50` |
| Database volume | `docker volume ls` and `docker volume inspect employee-management-system_mysql_data` |
| Rows in MySQL | `docker compose exec db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot employee_db -e "SELECT id, first_name, email FROM employees LIMIT 5"'` |
| Test results | `docker compose exec backend pytest -v` |
| Persistence proof | Record visible after `docker compose down` + `up -d` |

## Publishing to GitHub

Create an empty repository named `employee-management-system-docker` in your own GitHub account, then:

```bash
git init
git add .
git status                      # confirm .env is NOT listed
git commit -m "Employee Management System: React + Flask + MySQL + Docker"
git branch -M main
git remote add origin https://github.com/<your-username>/employee-management-system-docker.git
git push -u origin main
```
