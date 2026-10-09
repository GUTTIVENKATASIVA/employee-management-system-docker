# Employee Management System using Docker and Docker Compose

## 1. Project Overview

The Employee Management System is a web-based application developed to manage employee information in an organization. It provides a centralized interface to create, view, update, search, and delete employee records.

This project demonstrates the use of Docker and Docker Compose to containerize a multi-tier application consisting of a React frontend, Flask backend, and MySQL database.

## 2. Objectives

- Develop a web-based application for employee record management.
- Containerize the frontend, backend, and database using Docker.
- Use Docker Compose to configure and run multiple services.
- Enable communication between containers using service names.
- Persist database records using a named Docker volume.
- Simplify application deployment and setup.

## 3. Technologies Used

| Component | Technology |
|---|---|
| Frontend | React, Vite, JavaScript |
| Backend | Python, Flask |
| Database | MySQL 8 |
| ORM / Database Access | SQLAlchemy, PyMySQL |
| Containerization | Docker |
| Container Orchestration | Docker Compose |
| Web Server | Nginx |
| Testing | Pytest |

## 4. Application Features

- Add new employee records.
- View employee details.
- Update existing employee information.
- Delete employee records.
- Search and filter employee information.
- Display employee statistics.
- Validate employee input.
- Store employee information in MySQL.

## 5. System Architecture

The application consists of three services:

1. **Frontend:** A React application served through Nginx.
2. **Backend:** A Flask REST API that processes employee management requests.
3. **Database:** A MySQL database that stores employee records.

Docker Compose manages the services and their communication. The frontend sends API requests through Nginx, which forwards requests to the backend service. The backend connects to MySQL using the database service name.

## 6. Docker Implementation

The project uses separate Dockerfiles for the frontend and backend.

The `docker-compose.yml` file defines the frontend, backend, and database services. A named volume is used to persist MySQL data across container restarts and recreations.

Only the frontend port is exposed to the host machine. The application can be accessed locally through port 8080.

## 7. Project Structure

```text
employee-management-system-docker/
├── backend/
│   ├── app/
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── database/
│   └── init.sql
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   └── nginx.conf
├── scripts/
│   └── integration-test.sh
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

## 8. Prerequisites

Install the following before running the application:

- Docker Desktop
- Git
- A web browser

## 9. Setup and Execution

Clone the repository:

```bash
git clone https://github.com/GUTTIVENKATASIVA/employee-management-system-docker.git
cd employee-management-system-docker
```

Create the environment configuration file:

```bash
cp .env.example .env
```

On Windows PowerShell, you can instead run:

```powershell
Copy-Item .env.example .env
```

Review `.env` and configure the required database credentials.

Build and start the application:

```bash
docker compose build
docker compose up -d
```

Check the running services:

```bash
docker compose ps
```

Open the application in your browser:

**http://localhost:8080**

Stop the services:

```bash
docker compose down
```

Database data is stored in a named volume and is normally retained when containers are stopped or removed. Avoid `docker compose down -v` unless you intend to delete the database volume.

## 10. Testing

The backend includes automated tests using Pytest. The project also includes an integration testing script for checking application behavior.

Run the backend tests using the commands documented in the backend README or project instructions. Verify the running application and database operations before reporting the test results.

## 11. Learning Outcomes

This project provides practical experience with:

- Building a multi-tier web application.
- Creating Docker images using Dockerfiles.
- Running multiple containers with Docker Compose.
- Configuring service-to-service communication.
- Managing environment variables.
- Persisting database data using Docker volumes.
- Testing backend APIs.
- Deploying an application in a containerized environment.

## 12. Conclusion

The Employee Management System demonstrates how a frontend, backend API, and relational database can be packaged and run together using Docker and Docker Compose. It provides a practical foundation for understanding containerization, application deployment, service networking, and persistent storage.

## 13. Repository

GitHub: https://github.com/GUTTIVENKATASIVA/employee-management-system-docker
