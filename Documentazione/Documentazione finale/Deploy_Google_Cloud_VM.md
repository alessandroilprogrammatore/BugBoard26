# Deploy Pubblico Economico su Google Cloud

Questa guida descrive il percorso piu' semplice ed economico per mostrare **BugBoard26** su public cloud:

- **1 VM pubblica su Google Compute Engine**
- **Docker Compose**
- **PostgreSQL containerizzato** con volume persistente
- **frontend** e **backend** separati in container distinti

Per il deploy pubblico si usa il file dedicato `docker-compose.cloud.yml`, piu' leggero del compose completo di sviluppo perche' esclude tooling non necessario alla demo.

## Quando scegliere questa strada

Usala se vuoi:

- spendere il meno possibile
- fare deploy in fretta
- restare molto aderente all'architettura gia' presente nel progetto

## Nota sui costi

Google Cloud offre credito iniziale ai nuovi account e una free tier su alcune VM molto piccole. In pratica:

- per una **demo temporanea** puoi spesso stare dentro il credito iniziale
- per una **demo stabile** con frontend + backend + database insieme, una `e2-micro` puo' essere troppo stretta
- per stare piu' tranquillo, per pochi giorni di demo conviene spesso una `e2-small`

## Architettura finale

Sulla VM girano:

- `bugboard-db` su PostgreSQL 16
- `bugboard-backend` su porta `8081`
- `bugboard-frontend` su porta `5173`

Il backend resta il punto centrale di gestione dello stato, mentre il database persistente e' PostgreSQL in volume Docker.

## Prerequisiti

1. account Google Cloud attivo
2. progetto GCP creato
3. [gcloud CLI](https://cloud.google.com/sdk/docs/install) installata
4. repository disponibile su GitHub

Esegui login:

```powershell
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

## 1. Crea la VM

```powershell
gcloud compute instances create bugboard26-vm `
  --zone=europe-west1-b `
  --machine-type=e2-small `
  --image-family=debian-12 `
  --image-project=debian-cloud `
  --boot-disk-size=20GB `
  --tags=bugboard26,http-server,https-server
```

## 2. Apri le porte necessarie

```powershell
gcloud compute firewall-rules create bugboard26-frontend `
  --allow tcp:5173 `
  --target-tags=bugboard26 `
  --description="Frontend BugBoard26"

gcloud compute firewall-rules create bugboard26-backend `
  --allow tcp:8081 `
  --target-tags=bugboard26 `
  --description="Backend BugBoard26"
```

## 3. Collegati alla VM

```powershell
gcloud compute ssh bugboard26-vm --zone=europe-west1-b
```

## 4. Installa Docker e Compose sulla VM

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

## 5. Clona il repository

```bash
git clone https://github.com/alessandroilprogrammatore/BugBoard26.git
cd BugBoard26
```

## 6. Recupera l'IP pubblico della VM

Da locale:

```powershell
gcloud compute instances describe bugboard26-vm `
  --zone=europe-west1-b `
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
```

Salva il valore come `VM_PUBLIC_IP`.

## 7. Configura le variabili ambiente per il deploy pubblico

Nella VM:

```bash
cat > .env.prod-demo <<EOF
APP_FRONT_ORIGIN=http://VM_PUBLIC_IP:5173
APP_COOKIE_SECURE=false
APP_COOKIE_SAMESITE=Lax
APP_JWT_SECRET=ScegliUnSegretoJWTMoltoLungoEDiversoDaQuelloLocale123456789
EOF
```

Poi sostituisci `VM_PUBLIC_IP` con il vero IP pubblico.

## 8. Avvia lo stack cloud

```bash
set -a
source .env.prod-demo
set +a
docker compose -f docker-compose.cloud.yml up -d --build
```

## 9. Verifica i container

```bash
docker compose -f docker-compose.cloud.yml ps
docker compose -f docker-compose.cloud.yml logs backend --tail=100
docker compose -f docker-compose.cloud.yml logs frontend --tail=100
```

Dovresti vedere:

- database `healthy`
- backend in ascolto su `8081`
- frontend in ascolto su `5173`

## 10. Verifica dal browser

Apri:

- `http://VM_PUBLIC_IP:5173` per il frontend
- `http://VM_PUBLIC_IP:8081/api/auth/login` come endpoint backend raggiungibile

Nota: l'endpoint `/actuator/health` puo' risultare protetto dalla security, quindi per la demo e' piu' affidabile verificare direttamente il login e il funzionamento applicativo.

## 11. Persistenza dei dati

Nel progetto la persistenza distribuita usa **PostgreSQL**, definito nel compose cloud.

Quindi la frase corretta da usare in discussione e':

> In locale il backend puo' usare H2 file per sviluppo rapido, ma nella configurazione distribuita/containerizzata e nel deploy pubblico il sistema usa PostgreSQL come database persistente.

Per non perdere i dati:

- **non eliminare il volume Docker** `pgdata`
- fai ripartire lo stack con `docker compose -f docker-compose.cloud.yml up -d`

Verifica i volumi:

```bash
docker volume ls
```

## 12. Comandi utili per la demo

### Riavvio stack

```bash
docker compose -f docker-compose.cloud.yml up -d
```

### Stop

```bash
docker compose -f docker-compose.cloud.yml down
```

### Stop distruttivo da evitare

```bash
docker compose -f docker-compose.cloud.yml down -v
```

Questo rimuove anche il volume del database.

## 13. Come presentarlo al professore

Durante la demo conviene mostrare:

1. browser aperto su `http://VM_PUBLIC_IP:5173`
2. login funzionante via frontend
3. `docker compose -f docker-compose.cloud.yml ps` sulla VM
4. `docker volume ls` per mostrare che la persistenza e' separata
5. che frontend e backend sono due componenti distinti e comunicano via rete

## 14. Evoluzione futura

Se dopo la demo vuoi una soluzione piu' pulita:

- frontend su Cloud Run o Cloud Storage + CDN
- backend su Cloud Run
- database su Cloud SQL PostgreSQL

Ma per spendere poco e arrivare rapidamente al risultato, la VM con Docker Compose resta la strada piu' pratica.
