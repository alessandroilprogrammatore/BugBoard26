# Deploy Pubblico su Azure Container Apps

Questa guida descrive un deployment pubblico di **BugBoard26** su **Azure**, mantenendo la separazione tra:

- **frontend** React/Vite containerizzato
- **backend** Spring Boot containerizzato
- **database** PostgreSQL gestito

La soluzione scelta e' coerente con la repository corrente e con i Dockerfile gia' presenti nel progetto.

## Architettura finale

- **Azure Container Registry (ACR)**: contiene le immagini Docker di frontend e backend
- **Azure Container Apps**:
  - `bugboard-backend` esposto su Internet
  - `bugboard-frontend` esposto su Internet
- **Azure Database for PostgreSQL Flexible Server**: database persistente gestito

## Prerequisiti

Prima di iniziare:

1. installa o aggiorna **Azure CLI**
2. esegui login con:

```powershell
az login
```

3. abilita l'estensione Container Apps:

```powershell
az extension add --name containerapp --upgrade
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
```

## 1. Definisci le variabili

Apri PowerShell e imposta variabili con nomi univoci:

```powershell
$RG = "bugboard26-rg"
$LOCATION = "westeurope"
$ACR = "bugboard26acr001"
$CAENV = "bugboard26-env"
$BACKEND_APP = "bugboard26-backend"
$FRONTEND_APP = "bugboard26-frontend"
$PGSERVER = "bugboard26-pg-001"
$PGADMIN = "bugadmin"
$PGPASSWORD = "ScegliUnaPasswordMoltoForte123!"
$JWTSECRET = "ScegliUnSegretoJWTMoltoLungoEDiversoDaQuelloLocale123456789"
$BACKEND_IMAGE = "bugboard/backend:2026-03-22"
$FRONTEND_IMAGE = "bugboard/frontend:2026-03-22"
$REPO_ROOT = "G:\Progetto ingsw\BugBoard26-repo"
```

## 2. Crea Resource Group e Container Registry

```powershell
az group create `
  --name $RG `
  --location $LOCATION

az acr create `
  --resource-group $RG `
  --name $ACR `
  --sku Basic
```

## 3. Costruisci e pubblica le immagini Docker in ACR

### Backend

```powershell
az acr build `
  --registry $ACR `
  --image $BACKEND_IMAGE `
  --file "$REPO_ROOT\backend\Dockerfile" `
  "$REPO_ROOT\backend"
```

### Frontend

```powershell
az acr build `
  --registry $ACR `
  --image $FRONTEND_IMAGE `
  --file "$REPO_ROOT\Dockerfile.frontend" `
  "$REPO_ROOT"
```

## 4. Crea PostgreSQL gestito

```powershell
az postgres flexible-server create `
  --resource-group $RG `
  --name $PGSERVER `
  --location $LOCATION `
  --admin-user $PGADMIN `
  --admin-password $PGPASSWORD `
  --sku-name Standard_B1ms `
  --tier Burstable `
  --storage-size 32 `
  --version 16
```

Crea poi il database applicativo:

```powershell
az postgres flexible-server db create `
  --resource-group $RG `
  --server-name $PGSERVER `
  --database-name bugboard
```

Per una demo rapida pubblica, abilita l'accesso dai servizi Azure:

```powershell
az postgres flexible-server firewall-rule create `
  --resource-group $RG `
  --name $PGSERVER `
  --rule-name AllowAzureServices `
  --start-ip-address 0.0.0.0 `
  --end-ip-address 0.0.0.0
```

## 5. Crea l'ambiente Container Apps

```powershell
az containerapp env create `
  --name $CAENV `
  --resource-group $RG `
  --location $LOCATION
```

## 6. Recupera credenziali ACR

```powershell
$ACRLOGIN = az acr show --name $ACR --resource-group $RG --query loginServer -o tsv
$ACRUSER = az acr credential show --name $ACR --query username -o tsv
$ACRPASS = az acr credential show --name $ACR --query "passwords[0].value" -o tsv
```

## 7. Deploy del backend

All'inizio il frontend non esiste ancora, quindi usiamo un'origine temporanea e la aggiorniamo al passo successivo.

```powershell
az containerapp create `
  --name $BACKEND_APP `
  --resource-group $RG `
  --environment $CAENV `
  --image "$ACRLOGIN/$BACKEND_IMAGE" `
  --registry-server $ACRLOGIN `
  --registry-username $ACRUSER `
  --registry-password $ACRPASS `
  --ingress external `
  --target-port 8081 `
  --env-vars `
    SPRING_DATASOURCE_URL="jdbc:postgresql://$PGSERVER.postgres.database.azure.com:5432/bugboard?sslmode=require" `
    SPRING_DATASOURCE_USERNAME="$PGADMIN" `
    SPRING_DATASOURCE_PASSWORD="$PGPASSWORD" `
    SPRING_DATASOURCE_DRIVER_CLASS_NAME="org.postgresql.Driver" `
    SPRING_JPA_DATABASE_PLATFORM="org.hibernate.dialect.PostgreSQLDialect" `
    SPRING_JPA_HIBERNATE_DDL_AUTO="update" `
    APP_JWT_SECRET="$JWTSECRET" `
    APP_FRONT_ORIGIN="https://placeholder.invalid" `
    APP_COOKIE_SECURE="true" `
    APP_COOKIE_SAMESITE="None"
```

Recupera l'URL pubblico del backend:

```powershell
$BACKEND_URL = "https://" + (az containerapp show `
  --name $BACKEND_APP `
  --resource-group $RG `
  --query properties.configuration.ingress.fqdn `
  -o tsv)

$BACKEND_URL
```

## 8. Deploy del frontend

Il frontend del progetto usa Vite Preview e inoltra `/api` al backend tramite la variabile runtime `VITE_BACKEND_PROXY_TARGET`.

```powershell
az containerapp create `
  --name $FRONTEND_APP `
  --resource-group $RG `
  --environment $CAENV `
  --image "$ACRLOGIN/$FRONTEND_IMAGE" `
  --registry-server $ACRLOGIN `
  --registry-username $ACRUSER `
  --registry-password $ACRPASS `
  --ingress external `
  --target-port 5173 `
  --env-vars `
    VITE_BACKEND_PROXY_TARGET="$BACKEND_URL"
```

Recupera l'URL pubblico del frontend:

```powershell
$FRONTEND_URL = "https://" + (az containerapp show `
  --name $FRONTEND_APP `
  --resource-group $RG `
  --query properties.configuration.ingress.fqdn `
  -o tsv)

$FRONTEND_URL
```

## 9. Aggiorna il backend con l'origine reale del frontend

```powershell
az containerapp update `
  --name $BACKEND_APP `
  --resource-group $RG `
  --set-env-vars `
    APP_FRONT_ORIGIN="$FRONTEND_URL" `
    APP_COOKIE_SECURE="true" `
    APP_COOKIE_SAMESITE="None"
```

## 10. Verifica finale

Controlla i seguenti punti:

1. il backend risponde:

```powershell
Invoke-WebRequest "$BACKEND_URL/actuator/health"
```

2. il frontend e' raggiungibile dal browser aprendo `$FRONTEND_URL`
3. dal frontend riesci a:
   - fare login
   - vedere la lista bug
   - creare un bug
   - usare la dashboard admin

## 11. Variabili ambiente importanti

Le variabili chiave del progetto in cloud sono:

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `SPRING_JPA_HIBERNATE_DDL_AUTO=update`
- `APP_JWT_SECRET`
- `APP_FRONT_ORIGIN`
- `APP_COOKIE_SECURE=true`
- `APP_COOKIE_SAMESITE=None`
- `VITE_BACKEND_PROXY_TARGET`

## 12. Problemi comuni

### Il frontend si apre ma le API falliscono

Verifica che `VITE_BACKEND_PROXY_TARGET` punti all'URL HTTPS del backend.

### Login riuscito ma sessione incoerente

Ricontrolla:

- `APP_FRONT_ORIGIN`
- `APP_COOKIE_SECURE=true`
- `APP_COOKIE_SAMESITE=None`

### Il backend non si connette al database

Controlla:

- firewall del PostgreSQL Flexible Server
- nome database `bugboard`
- stringa JDBC con `sslmode=require`

## 13. Cosa mostrare al professore durante la demo

Per rendere il requisito piu' forte durante la discussione:

1. mostra il frontend pubblico raggiungibile da browser
2. mostra l'URL pubblico del backend
3. mostra in Azure:
   - Container App frontend
   - Container App backend
   - PostgreSQL Flexible Server
   - Azure Container Registry

Questo ti permette di dimostrare insieme:

- sistema distribuito
- backend indipendente
- deploy su public cloud
- accessibilita' via Internet
- persistenza centralizzata su backend/database
