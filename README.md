# BugBoard26

Sistema di issue tracking costruito con **React** (TypeScript) e **Spring Boot** (Java 23).

## Struttura del progetto

- `backend/` - API REST Spring Boot (Java 23, Maven, H2/PostgreSQL, JWT)
- `src/` - Frontend React (Vite, TypeScript, Tailwind CSS, Radix UI)
- `immagini/` - Diagrammi UML e mockup interfacce
- `*.tex` - Documentazione LaTeX (SRS, Design, Testing)

## Quick Start

### Backend
`ash
cd backend
mvn spring-boot:run
`

### Frontend
`ash
npm install
npm run dev
`

### Docker
`ash
docker-compose up --build
`

## Deploy Produzione Sicuro

Per il deploy HTTPS di produzione e' disponibile il file di esempio `.env.production.example`.

Variabili minime da valorizzare:

- `APP_DOMAIN`
- `APP_JWT_SECRET`
- `POSTGRES_PASSWORD`

Avvio del compose cloud con file ambiente dedicato:

`bash
docker compose --env-file .env.production -f docker-compose.cloud.yml up -d --build
`

Controllo configurazione prima del deploy:

`bash
docker compose --env-file .env.production -f docker-compose.cloud.yml config
`

## Documentazione

Il documento SRS completo e' disponibile in `SRS_BugBoard26.pdf`.

## Tecnologie

| Componente | Tecnologia |
|------------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Radix UI |
| Backend | Java 17, Spring Boot 3.3.4, Spring Security, JPA |
| Database | H2 (dev) / PostgreSQL 16 (prod) |
| Auth | JWT (stateless) |
| Testing | JUnit 5, Mockito, AssertJ |
| Deploy | Docker, Docker Compose |
