# Deploy HTTPS su Google Cloud VM

Questa guida descrive il percorso piu' semplice per pubblicare **BugBoard26** su una VM di **Google Compute Engine** con:

- una sola VM pubblica
- Docker Compose
- PostgreSQL containerizzato con volume persistente
- reverse proxy **Caddy**
- certificato **HTTPS automatico** e rinnovo automatico

La configurazione usata e' quella presente in `docker-compose.cloud.yml`, `Caddyfile` e `.env.production.example`.

## Quando usare questa guida

Usala se vuoi:

- pubblicare il progetto con un URL vero e con il lucchetto HTTPS
- evitare load balancer o servizi gestiti piu' costosi
- restare aderente all'architettura gia' presente nel repository

## Architettura finale

Sulla VM girano:

- `bugboard-db` con PostgreSQL 16
- `bugboard-backend` raggiungibile solo dalla rete Docker interna
- `bugboard-frontend` con Caddy esposto sulle porte `80` e `443`

Il browser parla solo con Caddy. Caddy serve il frontend statico, inoltra `/api` al backend e gestisce automaticamente il certificato TLS per il dominio configurato.

## Prerequisiti

1. progetto Google Cloud attivo
2. VM Compute Engine disponibile oppure possibilita' di crearne una nuova
3. dominio o sottodominio disponibile
4. DNS modificabile
5. `gcloud` installato in locale
6. repository disponibile su GitHub

Esegui il login:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

## 1. Scegli dominio e IP statico

Per ottenere un certificato pubblico valido serve un **dominio**, non basta l'IP.

Puoi usare:

- un dominio vostro
- un sottodominio gratuito, ad esempio DuckDNS

Conviene assegnare alla VM un **IP esterno statico**, cosi' il DNS non cambia.

Esempio:

```bash
gcloud compute addresses create bugboard26-ip \
  --region=europe-west1
```

Per leggere l'IP riservato:

```bash
gcloud compute addresses describe bugboard26-ip \
  --region=europe-west1 \
  --format="get(address)"
```

Salva il valore come `VM_STATIC_IP`.

## 2. Crea la VM

Se non hai ancora la VM:

```bash
gcloud compute instances create bugboard26-vm \
  --zone=europe-west1-b \
  --machine-type=e2-small \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=20GB \
  --address=VM_STATIC_IP \
  --tags=bugboard26,http-server,https-server
```

Note:

- `e2-small` e' piu' comoda per demo stabili
- `e2-micro` costa meno, ma puo' essere stretta

## 3. Apri solo HTTP e HTTPS

Per il deploy sicuro **non** vanno esposte le porte `5173` e `8081` verso Internet.

Apri solo `80` e `443`:

```bash
gcloud compute firewall-rules create bugboard26-web \
  --allow tcp:80,tcp:443 \
  --target-tags=bugboard26 \
  --description="HTTP e HTTPS per BugBoard26"
```

## 4. Punta il DNS alla VM

Configura il record `A` del dominio o sottodominio verso `VM_STATIC_IP`.

Esempi:

- `bugboard26.example.com -> VM_STATIC_IP`
- `bugboard26.duckdns.org -> VM_STATIC_IP`

Aspetta la propagazione DNS prima di avviare Caddy, altrimenti il certificato potrebbe non essere emesso subito.

## 5. Collegati alla VM

```bash
gcloud compute ssh bugboard26-vm --zone=europe-west1-b
```

## 6. Installa Docker e Compose

Sulla VM:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

## 7. Clona il repository

```bash
git clone https://github.com/alessandroilprogrammatore/BugBoard26.git
cd BugBoard26
```

## 8. Crea il file ambiente di produzione

Parti dal template:

```bash
cp .env.production.example .env.production
```

Poi modifica `.env.production` con valori reali:

```dotenv
APP_DOMAIN=bugboard26.example.com
APP_JWT_SECRET=metti-un-segreto-casuale-lungo-almeno-32-caratteri
POSTGRES_USER=bugboard
POSTGRES_PASSWORD=metti-una-password-forte
POSTGRES_DB=bugboard
APP_SECURITY_EXPOSE_DOCS=false
APP_COOKIE_SECURE=true
APP_COOKIE_SAMESITE=Lax
SPRING_JPA_HIBERNATE_DDL_AUTO=update
```

`APP_DOMAIN` deve coincidere con il record DNS pubblico configurato prima.

## 9. Valida la configurazione

```bash
docker compose --env-file .env.production -f docker-compose.cloud.yml config
```

Se questo comando passa, il file ambiente e il compose sono coerenti.

## 10. Avvia lo stack

```bash
docker compose --env-file .env.production -f docker-compose.cloud.yml up -d --build
```

## 11. Verifica il deploy

Controlla i container:

```bash
docker compose --env-file .env.production -f docker-compose.cloud.yml ps
docker compose --env-file .env.production -f docker-compose.cloud.yml logs frontend --tail=100
docker compose --env-file .env.production -f docker-compose.cloud.yml logs backend --tail=100
```

Poi apri nel browser:

```text
https://APP_DOMAIN
```

Alla prima partenza Caddy prova a ottenere automaticamente il certificato. Se DNS, porta `80` e porta `443` sono corretti, il sito verra' servito in HTTPS.

## 12. Cosa non esporre

Con questa architettura non va esposto pubblicamente:

- il backend sulla porta `8081`
- il frontend Vite preview sulla porta `5173`
- PostgreSQL sulla porta `5432`

Il file `docker-compose.cloud.yml` è gia' impostato in questo modo.

## 13. Persistenza dei dati

Il database usa il volume Docker `pgdata`.

Per riavviare senza perdere i dati:

```bash
docker compose --env-file .env.production -f docker-compose.cloud.yml up -d
```

Evita questo comando se vuoi conservare il database:

```bash
docker compose --env-file .env.production -f docker-compose.cloud.yml down -v
```

## 14. Troubleshooting rapido

Se il browser mostra ancora `Non sicuro`:

- verifica che il dominio punti davvero alla VM
- verifica che `80` e `443` siano aperte in Google Cloud
- verifica che `APP_DOMAIN` sia il dominio pubblico corretto
- controlla i log di Caddy con:

```bash
docker compose --env-file .env.production -f docker-compose.cloud.yml logs frontend --tail=200
```

Se il certificato non viene emesso, quasi sempre il problema e':

- DNS non propagato
- dominio sbagliato in `.env.production`
- porta `80` o `443` bloccata

## 15. Riferimenti utili

- Google Cloud: [Compute Engine pricing e free tier](https://cloud.google.com/products/compute?hl=en_US)
- Google Cloud: [riserva di un IP esterno statico](https://cloud.google.com/compute/docs/ip-addresses/reserve-static-external-ip-address)
- Google Cloud: [firewall rules per HTTP/HTTPS](https://cloud.google.com/compute/docs/samples/compute-firewall-create)
- Caddy: [Automatic HTTPS](https://caddyserver.com/docs/automatic-https)

