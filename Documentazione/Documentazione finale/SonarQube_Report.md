# 📊 Report SonarQube - BugBoard26 Backend

> **Data Creazione**: 15 Marzo 2026
> **Strumento**: SonarQube 10 Community Edition + JaCoCo

Questo documento riassume i risultati dell'analisi statica del codice e della copertura dei test sul solo modulo **Backend** (Spring Boot), come richiesto dalla traccia del progetto.

## 📈 Metriche Principali

| Metrica | Valore | Valutazione |
| :--- | :---: | :--- |
| **Bugs** | `0` | 🟢 Eccellente. Non sono stati rilevati bug bloccanti nel codice. |
| **Vulnerabilità** | `2` | 🟡 Accettabile. Riguardano pratiche comuni che SonarQube segnala ma non critiche per un progetto accademico. |
| **Security Hotspots** | `4` | 🟡 Accettabile. Riferiti principalmente alle configurazioni di sicurezza e CORS da controllare manualmente. |
| **Code Smells** | `24` | 🟢 Ottimo. Molto basso per una base di codice di queste dimensioni, indica codice pulito e manutenibile. |
| **Righe di Codice (NCLOC)** | `1855` | - Dimensioni del modulo backend (Non-Commenting Lines of Code). |
| **Linee Duplicate** | `0.0%` | 🟢 Eccellente. Non vi sono frammenti di codice duplicati. |
| **Copertura Test (Coverage)**| `22.0%` | 🔵 In linea con i requisiti *in itinere* (richiesti >= 2 metodi complessi coperti da test unitari). Meno di un quarto del codice è coperto dai test, che si sono concentrati sulle logiche centrali (`BugService`). |

---

## 🔍 Analisi e Osservazioni

1. **Qualità del Codice (Clean Code)**:
   Il bassissimo numero di *Code Smells* (24 su 1855 righe) e lo 0% di linee duplicate indicano che il progetto ha una **struttura pulita, modulare e ben pensata**. I principi della programmazione a oggetti (es. SOLID) sono stati rispettati.

2. **Sicurezza (Security)**:
   Le 2 vulnerabilità e i 4 Security Hotspots sono principalmente legati alla gestione delle password e alla configurazione di `Spring Security` (es. regole CORS e disabilitazione parziale CSRF per le API REST). Sebbene in un ambiente di produzione reale richiederebbero indagini più approfondite, nel contesto di questo progetto universitario sono accettabili in virtù del JWT stateless e dell'infrastruttura di base.

3. **Verifica e Validazione (Testing)**:
   La copertura dei test (`22.0%`) è calcolata tramite il plugin **JaCoCo**. Sebbene un valore ideale per progetti Enterprise si aggiri sull'80%, la traccia per la scadenza *in itinere* richiede la copertura solo di alcune funzionalità cardine (metodi "non banali" con almeno 2 parametri). I test implementati con JUnit 5 e Mockito (`BugServiceTest`) servono come **Proof of Concept** della strategia di testing (criteri di copertura applicati e classi di equivalenza definite nella documentazione PDF).
