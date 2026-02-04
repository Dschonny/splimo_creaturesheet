# Splittermond Creature Sheet

Ein FoundryVTT-Modul für das Splittermond-System, das Charakter-Sheets für Kreaturen/Tiere mit Unterstützung für Verfeinerungen, Abrichtungen und .ced-Datei-Import hinzufügt.

## Features

- **Eigenständiges Modul**: Modifiziert das Splittermond-System nicht, funktioniert als separate Erweiterung
- **Manuelle Werte**: Alle Attribute, Fertigkeiten und abgeleiteten Werte sind unabhängig und manuell editierbar - keine automatischen Berechnungen
- **.ced-Import**: Importiere Kreaturen direkt aus dem Splittermond Creature Editor
- **Verfeinerungen**: Vollständige Unterstützung mit Kategorisierung und Kostenverfolgung
- **Abrichtungen**: Inklusive Custom Meisterschaften und Große Tricks
- **Splittermond-Integration**: Nutzt das Würfelsystem und Chat-Templates des Hauptsystems
- **Item-Support**: Angriffe über npcattack-Items, voll kompatibel mit Splittermond

## Installation

### Manuell

1. Lade das Modul herunter
2. Entpacke es in `Data/modules/splimo_creaturesheet/` in deinem FoundryVTT-Datenverzeichnis
3. Starte FoundryVTT neu
4. Aktiviere das Modul in deiner Welt unter "Module verwalten"

### Voraussetzungen

- FoundryVTT v11 oder höher
- Splittermond System v2.0.0 oder höher

## Verwendung

### Neue Kreatur erstellen

1. Klicke auf "Actor erstellen" in der Actors-Sidebar
2. Wähle als Typ "Creature"
3. Fülle die Werte manuell aus

### Kreatur aus .ced-Datei importieren

#### Option 1: Über die Actor-Directory
1. Klicke auf den "Kreatur importieren (.ced)" Button in der Actor-Sidebar
2. Wähle deine .ced-Datei
3. Bestätige den Import

#### Option 2: Über das Actor-Sheet
1. Öffne ein bestehendes Creature-Sheet
2. Klicke auf "Kreatur importieren (.ced)" im Header
3. Wähle deine .ced-Datei
4. Der vorhandene Actor wird mit den importierten Daten überschrieben

### Werte bearbeiten

**Wichtig**: Alle Werte sind vollständig manuell editierbar. Es gibt keine automatischen Berechnungen oder Abhängigkeiten zwischen Werten.

- **Attribute**: Direkt im "Allgemein"-Tab bearbeiten
- **Fertigkeiten**: Direkt bearbeiten, Würfel-Icon für Proben
- **Abgeleitete Werte**: Manuell eingeben (Größe, Geschwindigkeit, Initiative, etc.)
- **Lebenspunkte/Fokus**: Max-Werte manuell setzen, Verbrauch über +/- Buttons

### Verfeinerungen verwalten

1. Wechsle zum "Verfeinerungen"-Tab
2. Klicke auf "+ Verfeinerung" um eine neue zu erstellen
3. Verfeinerungen werden automatisch nach Kategorie gruppiert
4. Die Gesamtkosten werden automatisch berechnet und angezeigt

### Abrichtungen verwalten

1. Wechsle zum "Abrichtungen"-Tab
2. Klicke auf "+ Abrichtung" um eine neue zu erstellen
3. Abrichtungen werden automatisch nach Kategorie gruppiert
4. Unterstützt Custom Meisterschaften und Große Tricks
5. Die Gesamt-Potentialkosten werden automatisch berechnet

### Angriffe

Angriffe werden über normale npcattack-Items verwaltet:
- Automatisch erstellt beim .ced-Import (aus Verfeinerungen mit zusätzlicher Waffe)
- Manuell erstellbar wie bei NPCs
- Im "Kampf"-Tab sichtbar mit Würfel-Button

### Fertigkeitsproben und Kampf

- **Fertigkeitsprobe**: Klicke auf das Würfel-Icon neben der Fertigkeit
- **Angriff würfeln**: Klicke auf "Angriff würfeln" im Kampf-Tab
- Verwendet automatisch das Splittermond-Würfelsystem und Chat-Templates

## Datenstruktur

### Actor: "creature"

```javascript
{
  attributes: {
    charisma: { value: 0 },
    agility: { value: 0 },
    // ... alle 8 Attribute
  },
  skills: {
    melee: { value: 0 },
    perception: { value: 0 },
    // ... alle Fertigkeiten
  },
  derivedAttributes: {
    size: { value: 0 },
    speed: { value: 0 },
    // ... alle abgeleiteten Werte
  },
  creatureData: {
    basis: "agil|robust|ausgewogen",
    rolle: "String",
    typus: ["Array"],
    potentialModifiers: { ... }
  }
}
```

### Item: "refinement"

```javascript
{
  description: "String",
  kategorie: "groesse|koerperliche_besonderheiten|...",
  kosten: 0,
  ausgewaehlteWahl: "String",
  ausgewaehlteAttribute: ["BEW", "KON"],
  zusaetzlicheWaffeId: "item-id"
}
```

### Item: "training"

```javascript
{
  description: "String",
  kategorie: "grundausbildung|kampf|reittier|sonstiges",
  potenzialKosten: 0,
  voraussetzung: "String",
  ausgewaehlteWahl: "String",
  grosseTricksWahl: "2xS1|S2+S1|...",
  customMeisterschaften: [
    { schwelle: 2, fertigkeit: "Heimlichkeit", name: "" }
  ]
}
```

## .ced-Format

Das Modul erwartet .ced-Dateien im JSON-Format mit folgender Struktur:

```json
{
  "editor": "SPLITTERMOND_CREATURE_EDITOR",
  "name": "Kreaturname",
  "basis": "agil",
  "rolle": "Kampftier",
  "typus": ["Kreatur", "Tier"],
  "verfeinerungen": [...],
  "abrichtungen": [...],
  "potentialModifiers": {...}
}
```

## Bekannte Einschränkungen

- Keine automatische Berechnung von Werten (by design)
- Voraussetzungen für Abrichtungen werden nicht validiert
- Export zurück zu .ced-Format nicht unterstützt

## Entwicklung

### Dateistruktur

```
splimo_creaturesheet/
├── module.json              # Modul-Manifest
├── module.js                # Haupteinstiegspunkt
├── lang/                    # Lokalisierung
│   ├── de.json
│   └── en.json
├── module/
│   ├── actor/
│   │   ├── creature-actor.js
│   │   └── sheets/creature-sheet.js
│   ├── item/
│   │   ├── refinement.js
│   │   └── training.js
│   ├── apps/
│   │   └── creature-importer.js
│   └── util/
│       └── creature-data-mapper.js
├── templates/sheets/
│   ├── creature-sheet.hbs
│   └── parts/
│       ├── creature-attributes.hbs
│       ├── refinements-list.hbs
│       └── training-list.hbs
└── styles/
    └── creature-sheet.css
```

## Lizenz

Dieses Modul wird bereitgestellt wie es ist, ohne Garantie.

## Support

Bei Problemen oder Feature-Requests erstelle bitte ein Issue auf GitHub.

## Credits

Erstellt für das Splittermond-System auf FoundryVTT.
