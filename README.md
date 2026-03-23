# BugBoard26

[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Spring Boot 3.3](https://img.shields.io/badge/Spring%20Boot-3.3.4-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Java 17](https://img.shields.io/badge/Java-17-ED8B00?logo=openjdk&logoColor=white)](https://openjdk.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![HTTPS Deploy](https://img.shields.io/badge/Deploy-HTTPS%20on%20Google%20Cloud-4285F4?logo=googlecloud&logoColor=white)](https://cloud.google.com/)

BugBoard26 is a full-stack bug tracking system built with React, TypeScript, Spring Boot and PostgreSQL. It focuses on team-based bug lifecycle management, role-aware workflows, notifications, reporting and a production-ready HTTPS deployment.

This repository is a fork of [bbreve/BugBoard26](https://github.com/bbreve/BugBoard26). In this fork I focused on polishing the project as a complete portfolio-ready deliverable: repository cleanup, stronger production deployment, documentation alignment and a more coherent GitHub presentation.

## What This Fork Adds

- Secure production deployment on Google Cloud with Docker Compose, Caddy and automatic HTTPS
- Authentication flow hardened around HttpOnly cookies and stricter production security settings
- Final SRS, UML and deliverable documentation aligned with the implemented application
- Repository cleanup to keep local artifacts, logs, tutorial files and temporary outputs out of version control
- Improved README, deployment guide and project presentation for recruiters and evaluators

## Product Snapshot

<p align="center">
  <img src="Documentazione/Documentazione%20finale/immagini/mockup_03_home_dashboard.png" width="45%" alt="Dashboard view" />
  <img src="Documentazione/Documentazione%20finale/immagini/mockup_04_lista_bug.png" width="45%" alt="Bug list view" />
</p>
<p align="center">
  <img src="Documentazione/Documentazione%20finale/immagini/mockup_05_dettaglio_bug.png" width="45%" alt="Bug detail view" />
  <img src="Documentazione/Documentazione%20finale/immagini/mockup_11_admin_utenti.png" width="45%" alt="Admin user management view" />
</p>

## Core Features

- Role-based access for `admin`, `user` and `readonly` profiles
- Bug creation, assignment, status tracking, archive flow and duplicate marking
- Comments, notifications and activity history on each bug
- Monthly reports plus CSV, Excel and PDF export support
- Responsive frontend with dedicated views for dashboard, bug list, detail, profile and admin area

## Tech Stack

| Area | Technologies |
|------|--------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Radix UI |
| Backend | Java 17, Spring Boot 3.3.4, Spring Security, Spring Data JPA |
| Database | H2 for development, PostgreSQL 16 for Docker and production |
| Auth | JWT transported via HttpOnly cookies |
| Testing | JUnit 5, Mockito, AssertJ |
| Deployment | Docker, Docker Compose, Caddy, Google Cloud |

## Repository Structure

- `src/` contains the React frontend
- `backend/` contains the Spring Boot REST API
- `Documentazione/` contains SRS, UML, mockups and delivery material
- `docker-compose.yml` runs the local multi-container environment
- `docker-compose.cloud.yml` runs the hardened production deployment with HTTPS

## Run Locally

### Frontend + backend in development mode

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
cd backend
mvn spring-boot:run
```

Default local endpoints:

- frontend: `http://localhost:8080`
- backend: `http://localhost:8081`

### Full local stack with Docker

```bash
docker compose up --build
```

Default Docker endpoints:

- frontend: `http://localhost:5173`
- backend: `http://localhost:8081`
- SonarQube: `http://localhost:9000`

## Production Deployment

The repository includes a secure production setup based on Docker Compose and Caddy.

1. Create a production env file from the template:

```bash
cp .env.production.example .env.production
```

2. Configure at least:

- `APP_DOMAIN`
- `APP_JWT_SECRET`
- `POSTGRES_PASSWORD`

3. Validate the configuration:

```bash
docker compose --env-file .env.production -f docker-compose.cloud.yml config
```

4. Start the HTTPS deployment:

```bash
docker compose --env-file .env.production -f docker-compose.cloud.yml up -d --build
```

For a Google Cloud VM deployment guide, see [Deploy_Google_Cloud_VM.md](Documentazione/Documentazione%20finale/Deploy_Google_Cloud_VM.md).

## Documentation

- [Final SRS PDF](Documentazione/Documentazione%20finale/SRS_BugBoard26.pdf)
- [SonarQube Report](Documentazione/Documentazione%20finale/SonarQube_Report.md)
- [UML source diagrams](Documentazione/Secondo%20homework/diagrammi/)

## Notes

- The root of the repository intentionally keeps only project files and runtime configuration needed to build, run or document the application.
- Local tutorial material, temporary exports, logs and explanation files are excluded from version control through `.gitignore`.
