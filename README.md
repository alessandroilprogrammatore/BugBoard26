# BugBoard26

BugBoard26 e' un sistema di issue tracking sviluppato con **React**, **TypeScript** e **Spring Boot** per supportare la gestione collaborativa dei bug all'interno di un team.

## Panoramica

- gestione completa del ciclo di vita dei bug
- ruoli distinti `admin`, `user` e `readonly`
- assegnazione bug, storico modifiche, commenti e notifiche
- report mensili ed export dei dati
- deploy locale con Docker e deploy cloud con HTTPS

## Stack Tecnologico

| Area | Tecnologie |
|------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Radix UI |
| Backend | Java 17, Spring Boot 3.3.4, Spring Security, JPA |
| Database | H2 in sviluppo, PostgreSQL 16 in produzione |
| Autenticazione | JWT gestito tramite cookie HttpOnly |
| Testing | JUnit 5, Mockito, AssertJ |
| Deploy | Docker, Docker Compose, Caddy |

## Struttura della Repository

- `backend/` contiene l'API REST Spring Boot
- `src/` contiene il frontend React
- `Documentazione/` raccoglie SRS, UML, mockup e materiale dei homework
- `docker-compose.yml` avvia l'ambiente locale
- `docker-compose.cloud.yml` prepara il deploy di produzione con HTTPS

## Avvio Rapido

### Backend

```bash
cd backend
mvn spring-boot:run
```

### Frontend

```bash
npm install
npm run dev
```

### Ambiente locale completo

```bash
docker-compose up --build
```

## Deploy Produzione Sicuro

La repository include un template pronto all'uso in `.env.production.example`.

Variabili minime da configurare:

- `APP_DOMAIN`
- `APP_JWT_SECRET`
- `POSTGRES_PASSWORD`

Validazione della configurazione:

```bash
docker compose --env-file .env.production -f docker-compose.cloud.yml config
```

Avvio del deploy:

```bash
docker compose --env-file .env.production -f docker-compose.cloud.yml up -d --build
```

## Documentazione

- SRS finale: `Documentazione/Documentazione finale/SRS_BugBoard26.pdf`
- report SonarQube: `Documentazione/Documentazione finale/SonarQube_Report.md`
- diagrammi UML sorgente: `Documentazione/Secondo homework/diagrammi/`
