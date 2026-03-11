# Leads Scraper

Ein Tool zum automatisierten Sammeln und Aufbereiten von Business-Leads.

> Dieses Projekt befindet sich im Aufbau. README wird laufend aktualisiert.

---

## Was macht das Tool?

<!-- TODO: Kurzbeschreibung der Datenquellen und des Outputs ergänzen -->

- Scrapet Lead-Daten aus definierten Quellen
- Normalisiert und dedupliziert die Daten
- Exportiert das Ergebnis als CSV / JSON / Datenbank

---

## Voraussetzungen

<!-- TODO: Ergänzen sobald Tech-Stack feststeht -->

- [ ] Runtime (z. B. Python 3.11+ oder Node.js 20+)
- [ ] Abhängigkeiten (siehe `requirements.txt` / `package.json`)
- [ ] `.env` Datei mit API-Keys / Konfiguration (siehe `.env.example`)

---

## Setup

```bash
# Repository klonen
git clone <repo-url>
cd Leads-Scraper

# Abhängigkeiten installieren
# pip install -r requirements.txt
# oder: npm install

# Umgebungsvariablen setzen
cp .env.example .env
# .env mit echten Werten befüllen
```

---

## Benutzung

```bash
# TODO: Startbefehl ergänzen
# python main.py --source <quelle> --output leads.csv
```

---

## Output-Format

<!-- TODO: Felder des Lead-Datensatzes dokumentieren -->

| Feld | Beschreibung |
|------|-------------|
| `name` | Name des Unternehmens / Ansprechpartners |
| `email` | Kontakt-E-Mail |
| `phone` | Telefonnummer |
| `website` | Website-URL |
| `source` | Herkunft des Datensatzes |

---

## Projektstruktur

```
Leads-Scraper/
├── src/            # Quellcode (Scraper, Parser, Storage)
├── tests/          # Tests
├── .env.example    # Vorlage für Umgebungsvariablen
├── .gitignore
└── README.md
```

---

## Hinweise

- Nur für Quellen verwenden, bei denen Scraping rechtlich zulässig ist.
- Keine Credentials oder API-Keys committen — immer `.env` verwenden.
