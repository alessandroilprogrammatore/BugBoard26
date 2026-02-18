# Secondo Homework - Diagrammi di progetto

Questa cartella contiene i diagrammi architetturali, di dettaglio e comportamentali del progetto BugBoard26.

## Contenuto

### `diagrammi/` — Sorgenti Mermaid
File sorgente in formato [Mermaid](https://mermaid.js.org/), utilizzabili come input per la rigenerazione dei diagrammi:
- `deployment_diagram.mmd` — Deployment Diagram (distribuzione dei container)
- `component_diagram.mmd` — Component Diagram (componenti software e dipendenze)
- `class_diagram.mmd` — Class Diagram (diagramma delle classi di design)
- `sequence_create_bug.mmd` — Sequence Diagram (creazione di un bug)

### `immagini/` — Diagrammi renderizzati (PNG)
Versioni grafiche dei diagrammi, incluse anche nel PDF della documentazione finale:
- `deployment_diagram.png`
- `component_diagram.png`
- `class_diagram.png`
- `sequence_create_bug.png`

## Tipologie di diagrammi presenti

| Tipo | File | Descrizione |
|------|------|-------------|
| Architetturale | `deployment_diagram` | Mostra la distribuzione fisica dei componenti nei container Docker e l'ambiente di sviluppo |
| Architetturale | `component_diagram` | Illustra i componenti software (Frontend, Backend, Database) e le loro dipendenze interne |
| Dettaglio | `class_diagram` | Diagramma delle classi con entità, servizi, repository, controller e relazioni |
| Comportamentale | `sequence_create_bug` | Flusso completo dell'operazione di creazione di un nuovo bug |

## Strumenti utilizzati

- **Mermaid** per la definizione dei diagrammi in formato testuale
- **Playwright + Edge** per il rendering automatico in PNG
