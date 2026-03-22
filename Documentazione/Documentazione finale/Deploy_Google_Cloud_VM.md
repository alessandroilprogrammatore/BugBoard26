# Deploy Pubblico Economico su Google Cloud

Questa guida propone il percorso piu' semplice ed economico per mostrare **BugBoard26** su public cloud:

- **1 VM pubblica su Google Compute Engine**
- **Docker Compose**
- **PostgreSQL containerizzato** con volume persistente
- **frontend** e **backend** separati in container distinti

Questa soluzione ha due vantaggi pratici:

1. riusa quasi integralmente la repository attuale
2. evita di introdurre componenti cloud aggiuntivi non necessari per una demo

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

Se vuoi massimizzare il risparmio, prova prima con:

- `e2-micro` se il carico e' minimo

Se vuoi piu' margine:

- `e2-small`

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
4. repository gia' disponibile su GitHub oppure copiata sulla VM

Esegui login:

```powershell
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

## 1. Crea la VM

Puoi farlo da Console oppure da CLI. Da CLI:

```powershell
gcloud compute instances create bugboard26-vm `
  --zone=europe-west8-b `
  --machine-type=e2-small `
  --image-family=debian-12 `
  --image-project=debian-cloud `
  --boot-disk-size=20GB `
  --tags=bugboard26,http-server,https-server
```

Se vuoi tentare la configurazione piu' economica possibile:

```powershell
gcloud compute instances create bugboard26-vm `
  --zone=us-west1-b `
  --machine-type=e2-micro `
  --image-family=debian-12 `
  --image-project=debian-cloud `
  --boot-disk-size=20GB `
  --tags=bugboard26,http-server,https-server
```

## 2. Apri le porte necessarie

Per una demo semplice conviene esporre:

- `5173` per il frontend
- `8081` per il backend

```powershell
gcloud compute firewall-rules create bugboard26-frontend `
  --allow tcp:5173 `
  --target-tags=bugboard26 `
  --description=\"Frontend BugBoard26\"

gcloud compute firewall-rules create bugboard26-backend `
  --allow tcp:8081 `
  --target-tags=bugboard26 `
  --description=\"Backend BugBoard26\"
```

## 3. Collegati alla VM

```powershell
gcloud compute ssh bugboard26-vm --zone=europe-west8-b
```

oppure, se hai usato la VM free-tier:

```powershell
gcloud compute ssh bugboard26-vm --zone=us-west1-b
```

## 4. Installa Docker e Compose sulla VM

Dentro la VM:

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

Se il repository e' privato, usa HTTPS con credenziali oppure carica il progetto via SCP.

## 6. Recupera l'IP pubblico della VM

Da locale:

```powershell
gcloud compute instances describe bugboard26-vm `
  --zone=europe-west8-b `
  --format=\"get(networkInterfaces[0].accessConfigs[0].natIP)\"
```

Salva il valore come:

```text
VM_PUBLIC_IP
```

## 7. Adatta le variabili ambiente per il deploy pubblico

La vostra repo usa gia' Docker Compose. Per il deploy pubblico serve solo aggiornare i valori runtime del backend.

Nella VM, crea un file `.env.prod-demo` nella root del progetto:

```bash
cat > .env.prod-demo <<EOF
APP_FRONT_ORIGIN=http://VM_PUBLIC_IP:5173
APP_COOKIE_SECURE=false
APP_COOKIE_SAMESITE=Lax
APP_JWT_SECRET=ScegliUnSegretoJWTMoltoLungoEDiversoDaQuelloLocale123456789
EOF
```

Poi sostituisci `VM_PUBLIC_IP` con il vero IP pubblico.

## 8. Avvia lo stack con Docker Compose

Per una demo veloce puoi esportare le variabili e lanciare lo stack:

```bash
set -a
source .env.prod-demo
set +a
docker compose up -d --build
```

## 9. Verifica i container

```bash
docker compose ps
docker compose logs backend --tail=100
docker compose logs frontend --tail=100
```

Dovresti vedere:

- database `healthy`
- backend in ascolto su `8081`
- frontend in ascolto su `5173`

## 10. Verifica dal browser

Apri:

- `http://VM_PUBLIC_IP:5173` per il frontend
- `http://VM_PUBLIC_IP:8081/actuator/health` per il backend

Se tutto e' corretto:

1. il frontend si apre
2. il login funziona
3. la lista bug risponde
4. il backend risponde anche separatamente via rete

## 11. Persistenza dei dati

Nel vostro progetto la persistenza distribuita usa **PostgreSQL**, definito in `docker-compose.yml`.

Quindi la frase corretta da usare in discussione e':

> In locale il backend puo' usare H2 file per sviluppo rapido, ma nella configurazione distribuita/containerizzata e nel deploy pubblico il sistema usa PostgreSQL come database persistente.

Per non perdere i dati:

- **non eliminare il volume Docker** `pgdata`
- fai ripartire lo stack con `docker compose up -d`

Verifica i volumi:

```bash
docker volume ls
```

## 12. Comandi utili per la demo

### Riavvio stack

```bash
docker compose up -d
```

### Stop

```bash
docker compose down
```

### Stop senza perdere i dati

Va bene il comando sopra: i dati restano nel volume PostgreSQL.

### Stop distruttivo da evitare

```bash
docker compose down -v
```

Questo rimuove anche il volume del database.

## 13. Come presentarlo al professore

Durante la demo ti conviene mostrare:

1. browser aperto su `http://VM_PUBLIC_IP:5173`
2. endpoint backend su `http://VM_PUBLIC_IP:8081/actuator/health`
3. `docker compose ps` sulla VM
4. `docker volume ls` per mostrare che la persistenza e' separata
5. che il frontend e il backend sono due componenti distinti e comunicano via rete

## 14. Limiti di questa soluzione

Questa e' la soluzione piu' economica e piu' semplice, ma non la piu' elegante in assoluto:

- usa una singola VM invece di servizi managed separati
- espone porte tecniche (`5173`, `8081`)
- non configura HTTPS e dominio custom

Per una demo universitaria, pero', e' spesso piu' che sufficiente e dimostra comunque:

- deploy su public cloud
- accessibilita' via Internet
- backend autonomo
- persistenza centralizzata
- containerizzazione

## 15. Evoluzione futura

Se dopo la demo vuoi una soluzione piu' pulita:

- frontend su Cloud Run o Cloud Storage + CDN
- backend su Cloud Run
- database su Cloud SQL PostgreSQL

Ma per spendere poco e arrivare rapidamente al risultato, la VM con Docker Compose resta la strada piu' pratica.
