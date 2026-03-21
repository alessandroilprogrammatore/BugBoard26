# Secondo Homework - Diagrammi di progetto

Questa cartella contiene i diagrammi architetturali, di dettaglio e comportamentali del progetto BugBoard26.

## Contenuto

### `diagrammi/` — Sorgenti PlantUML
File sorgente in formato [PlantUML](https://plantuml.com/), utilizzabili come input per la rigenerazione dei diagrammi:
- `deployment_diagram.puml` — Deployment Diagram (distribuzione dei container)
- `component_diagram.puml` — Component Diagram (componenti software e dipendenze)
- `class_diagram.puml` — Class Diagram (diagramma delle classi di design)
- `sequence_create_bug.puml` — Sequence Diagram (creazione di un bug)

Le precedenti versioni Mermaid sono conservate come file `.mmd.legacy` per riferimento storico.

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

- **PlantUML / StarUML** per la modellazione UML
- Export in **PNG** per l'inclusione nella documentazione finale
