# Splittermond Creature Editor - JSON Import Spezifikation für VTT

## Übersicht

Der Splittermond Creature Editor exportiert Kreaturen im FoundryVTT-kompatiblen JSON-Format. Diese Spezifikation beschreibt die Struktur und alle Felder für die Implementierung eines VTT-Charakterbogens.

## Basis-Struktur

```json
{
  "jsonExporterVersion": "1.5.0",
  "system": "SPLITTERMOND",
  "name": "Kreaturname",
  "type": "creature",
  "basis": {...},
  "rolle": {...},
  "verfeinerungen": [...],
  "abrichtungen": [...],
  "attributes": [...],
  "skills": [...],
  "powers": [...],
  "magicSchools": [...],
  "spells": [...],
  "meleeWeapons": [...],
  "regelverstöße": [...]  // Optional
}
```

## 1. Metadaten

### Root-Level Felder

- **jsonExporterVersion** (string): Version des Export-Formats (aktuell "1.5.0")
- **system** (string): Immer "SPLITTERMOND"
- **name** (string): Name der Kreatur
- **type** (string): Immer "creature"
- **basis** (object | null): Grundtyp der Kreatur (Schritt 2: Basis)
- **rolle** (object | null): Funktion der Kreatur (Schritt 3: Rolle)
- **verfeinerungen** (array): Zusätzliche Eigenschaften (Schritt 4: Verfeinern)
- **abrichtungen** (array): Ausbildungen und Training
- **regelverstöße** (string[], optional): Liste von Regelabweichungen falls vorhanden

## 2. Basis (basis)

Die Basis definiert den Grundtyp der Kreatur und ihre grundlegenden Eigenschaften.

### Struktur

```json
{
  "id": "agil",
  "name": "Agil",
  "description": "Bewegliche, wendige Kreaturen mit guter Körperkontrolle."
}
```

### Felder

- **id** (string): Technische ID der Basis
- **name** (string): Anzeigename der Basis
- **description** (string): Beschreibung der Basis

### Mögliche Basis-Typen

| id | name | Beschreibung |
|----|------|--------------|
| agil | Agil | Bewegliche, wendige Kreaturen mit guter Körperkontrolle |
| robust | Robust | Widerstandsfähige Kreaturen mit hoher Ausdauer |
| schnell | Schnell | Flinke Kreaturen mit hoher Geschwindigkeit |
| stark | Stark | Kräftige Kreaturen mit hoher Körperkraft |

**Hinweis**: Kann `null` sein, wenn keine Basis gewählt wurde.

## 3. Rolle (rolle)

Die Rolle definiert die Funktion und den Einsatzbereich der Kreatur.

### Struktur

```json
{
  "id": "kampftier",
  "name": "Kampftier",
  "description": "Kampftiere werden darauf abgerichtet, sich mit anderen Wesen zu messen..."
}
```

### Felder

- **id** (string): Technische ID der Rolle
- **name** (string): Anzeigename der Rolle
- **description** (string): Beschreibung der Rolle

### Mögliche Rollen

| id | name | Beschreibung |
|----|------|--------------|
| familiar | Familiar | Zauberwesen und Vertraute begabter Zauberer |
| kampftier | Kampftier | Für den Kampf abgerichtete Bestien |
| lasttier | Lasttier | Für Transport und schwere Arbeit |
| maskottchen | Maskottchen | Gesellschaftstiere und Glücksbringer |
| sucher | Sucher | Spür- und Suchtiere |

**Hinweis**: Kann `null` sein, wenn keine Rolle gewählt wurde.

## 4. Verfeinerungen (verfeinerungen)

Array von zusätzlichen Eigenschaften und Spezialisierungen der Kreatur.

### Struktur

```json
{
  "id": "fliegen",
  "name": "Fliegen",
  "category": "bewegungsarten",
  "description": "Die Kreatur kann fliegen...",
  "cost": 2
}
```

### Felder

- **id** (string): Technische ID der Verfeinerung
- **name** (string): Anzeigename der Verfeinerung
- **category** (string): Kategorie der Verfeinerung
- **description** (string): Beschreibung der Verfeinerung
- **cost** (number): Kreaturenpunkte-Kosten (kann negativ sein)

### Kategorien

- **größe**: Größenmodifikationen (Winzig, Klein, Groß, Riesig)
- **spezieller_typ**: Besondere Kreaturentypen
- **zusätzliche_fähigkeiten**: Allgemeine neue Fähigkeiten
- **bewegungsarten**: Schwimmen, Fliegen, Graben
- **späher_jäger**: Sinnesverbesserungen und Jagdfähigkeiten
- **geistige_fähigkeiten**: Intelligenz und mentale Fähigkeiten
- **kampffähigkeiten**: Kampfverbesserungen
- **magische_fähigkeiten**: Magische Kräfte und Zauber
- **unterhaltung**: Unterhaltungs- und Darbietungsfähigkeiten
- **körperliche_besonderheiten**: Besondere körperliche Merkmale
- **anfälligkeiten**: Schwächen und Anfälligkeiten

## 5. Abrichtungen (abrichtungen)

Array von Ausbildungen und erlernten Fähigkeiten der Kreatur.

### Struktur

```json
{
  "id": "loyal",
  "name": "Loyal",
  "category": "allgemein",
  "description": "Das Tier kann nicht mehr von anderen Tierführen auf profane Weise...",
  "potentialCost": 0
}
```

### Felder

- **id** (string): Technische ID der Abrichtung
- **name** (string): Anzeigename der Abrichtung
- **category** (string): Kategorie der Abrichtung
- **description** (string): Beschreibung der Abrichtung
- **potentialCost** (number): Potentialpunkte-Kosten

### Kategorien

- **allgemein**: Allgemeine Abrichtungen
- **grundausbildung**: Grundlegende Ausbildung
- **helfer**: Unterstützende Funktionen
- **reittier**: Reittier-spezifische Abrichtungen
- **kampf**: Kampf-orientierte Abrichtungen
- **vertraute**: Vertrauten-spezifische Abrichtungen
- **schwarm**: Schwarm-spezifische Abrichtungen

## 6. Attribute (attributes)

Array von Attribut-Objekten mit Grundattributen und abgeleiteten Werten.

### Struktur

```json
{
  "name": "Ausstrahlung",
  "id": "CHARISMA",
  "shortName": "AUS",
  "startValue": 0,
  "value": 3
}
```

### Felder

- **name** (string): Vollständiger deutscher Name des Attributs
- **id** (string): Englische ID für technische Referenz (z.B. "CHARISMA", "STRENGTH")
- **shortName** (string): Deutsche Abkürzung (z.B. "AUS", "STÄ", "BEW")
- **startValue** (number): Startwert (immer 0 bei Kreaturen)
- **value** (number): Aktueller Attributswert

### Grundattribute (Primär)

| shortName | name | id | Beschreibung |
|-----------|------|----|----|
| AUS | Ausstrahlung | CHARISMA | Persönliche Präsenz und Überzeugungskraft |
| BEW | Beweglichkeit | AGILITY | Körperliche Gewandtheit und Reflexe |
| INT | Intuition | INTUITION | Instinktives Erfassen von Situationen |
| KON | Konstitution | CONSTITUTION | Körperliche Widerstandskraft |
| MYS | Mystik | MYSTIC | Magische Begabung |
| STÄ | Stärke | STRENGTH | Körperliche Kraft |
| VER | Verstand | MIND | Logisches Denken |
| WIL | Willenskraft | WILLPOWER | Mentale Stärke |

### Abgeleitete Werte (Sekundär)

| shortName | name | id | Beschreibung |
|-----------|------|----|----|
| GK | Größenklasse | SIZE | Größenkategorie der Kreatur |
| GSW | Geschwindigkeit | SPEED | Bewegungsreichweite pro Tick |
| INI | Initiative | INITIATIVE | Kampfreihenfolge (z.B. "3-4") |
| LP | Lebenspunkte | LIFE | Trefferpunkte |
| FO | Fokus | FOCUS | Magische Ausdauer |
| VTD | Verteidigung | DEFENSE | Passive Verteidigung |
| SR | Schadensreduktion | DAMAGE_REDUCTION | Schadensabsorption |
| GW | Geistiger Widerstand | MINDRESIST | Resistenz gegen mentale Effekte |
| KW | Körperlicher Widerstand | BODYRESIST | Resistenz gegen körperliche Effekte |

**Besonderheit Initiative (INI)**: Der Wert ist ein String im Format "X-Y" (z.B. "3-4"), bei der Konvertierung wird nur der erste Teil (vor dem "-") als Integer verwendet.

## 7. Fertigkeiten (skills)

Array von Fertigkeits-Objekten mit Werten und zugehörigen Meisterschaften.

### Struktur

```json
{
  "name": "Akrobatik",
  "id": "acrobatics",
  "attribute1": "BEW",
  "attribute2": "STÄ",
  "value": 10,
  "points": 5,
  "modifier": 0,
  "masterships": [
    {
      "name": "Gelenkig",
      "id": "gelenkig",
      "level": 1,
      "shortDescription": "Beschreibung",
      "longDescription": "Beschreibung",
      "page": null,
      "specialization": false
    }
  ]
}
```

### Felder

- **name** (string): Deutscher Name der Fertigkeit
- **id** (string): Technische ID (lowercase, englisch)
- **attribute1** (string | null): Erstes zugeordnetes Attribut (Abkürzung, z.B. "BEW")
- **attribute2** (string | null): Zweites zugeordnetes Attribut (Abkürzung, z.B. "STÄ")
- **value** (number): Fertigkeitswert (Punkte × 2)
- **points** (number): Fertigkeitspunkte (value / 2)
- **modifier** (number): Zusätzliche Modifikatoren (Standard: 0)
- **masterships** (array): Liste von Meisterschaften zu dieser Fertigkeit

### Standard-Fertigkeiten

| name | id | attribute1 | attribute2 |
|------|----|----|-----|
| Akrobatik | acrobatics | BEW | STÄ |
| Athletik | athletics | BEW | STÄ |
| Entschlossenheit | determination | AUS | WIL |
| Heimlichkeit | stealth | BEW | INT |
| Wahrnehmung | perception | INT | WIL |
| Zähigkeit | endurance | KON | WIL |
| Schwimmen | swim | STÄ | KON |
| Jagdkunst | hunting | KON | VER |
| Empathie | empathy | INT | VER |
| Fingerfertigkeit | dexterity | AUS | BEW |
| Darbietung | performance | AUS | WIL |

**Hinweis**: Nur Fertigkeiten mit value > 0 werden exportiert.

### Meisterschaften (masterships)

Fertigkeiten können zugeordnete Meisterschaften haben:

- **name** (string): Name der Meisterschaft
- **id** (string): Technische ID
- **level** (number): Schwellenwert der Meisterschaft (1-4)
- **shortDescription** (string | null): Kurzbeschreibung
- **longDescription** (string | null): Ausführliche Beschreibung
- **page** (string | null): Seitenreferenz im Regelwerk
- **specialization** (boolean): Ist es eine Spezialisierung? (Standard: false)

**Besonderheit**: Meisterschaften mit Fertigkeit "Wählbar" werden allen passenden Fertigkeiten zugeordnet.

## 8. Kräfte/Merkmale (powers)

Array von besonderen Fähigkeiten und Eigenschaften der Kreatur.

### Struktur

```json
{
  "name": "Dämmerungssicht",
  "id": "daemmerungssicht",
  "count": 1,
  "shortDescription": "Dämmerungssicht",
  "longDescription": "Dämmerungssicht",
  "page": "Bestienmeister"
}
```

### Felder

- **name** (string): Name des Merkmals
- **id** (string): Technische ID (lowercase, underscores statt Leerzeichen)
- **count** (number): Anzahl/Stufe (Standard: 1)
- **shortDescription** (string): Kurzbeschreibung
- **longDescription** (string): Ausführliche Beschreibung
- **page** (string): Seitenreferenz (Standard: "Bestienmeister")

**Hinweis**: Merkmale können mehrfach vorkommen mit unterschiedlichen Stufen/Werten.

## 9. Magieschulen (magicSchools)

Array von Magieschulen, die die Kreatur beherrscht.

### Struktur

```json
{
  "name": "Heilungsmagie",
  "id": "heilungsmagie",
  "value": 6
}
```

### Felder

- **name** (string): Name der Magieschule
- **id** (string): Technische ID (lowercase, underscores statt Leerzeichen)
- **value** (number): Wert in dieser Magieschule

### Mögliche Magieschulen

| name | Attribute | Beschreibung |
|------|-----------|--------------|
| Bannmagie | MYS + WIL | Schutz vor und Auflösung von Magie |
| Beherrschungsmagie | MYS + AUS | Kontrolle über Geist und Willen |
| Bewegungsmagie | MYS + BEW | Manipulation von Bewegung und Position |
| Erkenntnismagie | MYS + VER | Wissen und Wahrnehmung |
| Felsmagie | MYS + KON | Kontrolle über Erde und Stein |
| Feuermagie | MYS + AUS | Beherrschung von Flammen und Hitze |
| Heilungsmagie | MYS + AUS | Heilung und Regeneration |
| Illusionsmagie | MYS + AUS | Täuschung und Trugbilder |
| Kampfmagie | MYS + STÄ | Magische Verstärkung im Kampf |
| Lichtmagie | MYS + AUS | Kontrolle über Licht und Helligkeit |
| Naturmagie | MYS + AUS | Verbindung zur Natur |
| Schattenmagie | MYS + INT | Manipulation von Schatten und Dunkelheit |
| Schicksalsmagie | MYS + AUS | Beeinflussung von Glück und Schicksal |
| Stärkungsmagie | MYS + WIL | Verstärkung von Fähigkeiten |
| Todosmagie | MYS + WIL | Magie des Todes und der Untoten |
| Verwandlungsmagie | MYS + KON | Transformation von Körper und Form |
| Wassermagie | MYS + INT | Beherrschung von Wasser und Flüssigkeiten |
| Windmagie | MYS + BEW | Kontrolle über Luft und Wind |
| Eismagie | MYS + WIL | Beherrschung von Kälte und Eis |

**Hinweis**: Magieschulen werden typischerweise durch die Rolle "Familiar" oder Verfeinerungen wie "Von Magie durchdrungen" erhalten.

## 10. Zauber (spells)

Array von magischen Fähigkeiten der Kreatur.

### Struktur

```json
{
  "name": "Macht über Gegner",
  "id": "macht_ueber_gegner",
  "value": 0,
  "school": "Beherrschung",
  "schoolGrade": 1,
  "difficulty": "",
  "focus": "",
  "castDuration": "",
  "castRange": "",
  "spellDuration": "",
  "enhancement": "",
  "page": "",
  "longDescription": "",
  "enhancementDescription": "",
  "enhancementOptions": ""
}
```

### Felder

- **name** (string): Name des Zaubers
- **id** (string): Technische ID
- **value** (number): Zauberwert (Standard: 0)
- **school** (string): Magieschule (z.B. "Beherrschung", "Elementarismus")
- **schoolGrade** (number): Grad der Magieschule (1-5)
- **difficulty** (string): Schwierigkeit (leer bei Kreaturen)
- **focus** (string): Fokuskosten (leer bei Kreaturen)
- **castDuration** (string): Zauberdauer (leer bei Kreaturen)
- **castRange** (string): Reichweite (leer bei Kreaturen)
- **spellDuration** (string): Wirkungsdauer (leer bei Kreaturen)
- **enhancement** (string): Steigerung (leer bei Kreaturen)
- **page** (string): Seitenreferenz (leer bei Kreaturen)
- **longDescription** (string): Beschreibung (leer bei Kreaturen)
- **enhancementDescription** (string): Steigerungsbeschreibung (leer bei Kreaturen)
- **enhancementOptions** (string): Steigerungsoptionen (leer bei Kreaturen)

**Hinweis**: Bei Kreaturen sind die meisten Detail-Felder leer, da nur die Verfügbarkeit des Zaubers relevant ist.

## 11. Nahkampfwaffen (meleeWeapons)

Array von Waffenangriffe der Kreatur.

### Struktur

```json
{
  "name": "Biss",
  "skill": "Handgemenge",
  "attribute1": "BEW",
  "attribute1Id": "AGILITY",
  "attribute2": "STÄ",
  "attribute2Id": "STRENGTH",
  "value": 10,
  "features": [
    {
      "name": "Stumpf",
      "level": 0,
      "description": "",
      "page": ""
    },
    {
      "name": "Kritisch +1",
      "level": 1,
      "description": "",
      "page": ""
    }
  ],
  "damage": "1W10+3",
  "weaponSpeed": 5,
  "characterTickMalus": 0,
  "calculatedSpeed": 5,
  "relic": false,
  "personalized": false,
  "load": 0,
  "price": 0,
  "availability": null,
  "quality": 0,
  "complexity": null,
  "durability": 0
}
```

### Felder

- **name** (string): Name der Waffe
- **skill** (string): Zugeordnete Fertigkeit (Standard: "Handgemenge")
- **attribute1** (string): Erstes Attribut (Abkürzung)
- **attribute1Id** (string): ID des ersten Attributs
- **attribute2** (string): Zweites Attribut (Abkürzung)
- **attribute2Id** (string): ID des zweiten Attributs
- **value** (number): Angriffswert
- **features** (array): Waffenmerkmale
- **damage** (string): Schadensformel (z.B. "1W10+3")
- **weaponSpeed** (number): Waffengeschwindigkeit (WGS)
- **characterTickMalus** (number): Tick-Malus (Standard: 0)
- **calculatedSpeed** (number): Berechnete Geschwindigkeit
- **relic** (boolean): Ist Relikt (Standard: false)
- **personalized** (boolean): Ist personalisiert (Standard: false)
- **load** (number): Belastung (Standard: 0)
- **price** (number): Preis (Standard: 0)
- **availability** (string | null): Verfügbarkeit (Standard: null)
- **quality** (number): Qualität (Standard: 0)
- **complexity** (string | null): Komplexität (Standard: null)
- **durability** (number): Haltbarkeit (Standard: 0)

### Waffenmerkmale (features)

- **name** (string): Name des Merkmals (z.B. "Stumpf", "Kritisch +1")
- **level** (number): Stufe des Merkmals (0 wenn nicht stufbar)
- **description** (string): Beschreibung (leer bei Kreaturen)
- **page** (string): Seitenreferenz (leer bei Kreaturen)

**Hinweis**: Bei gestuften Merkmalen wird die Stufe im Namen kodiert (z.B. "Kritisch +1").

## Beispiel: Vollständige Kreatur

```json
{
  "jsonExporterVersion": "1.5.0",
  "system": "SPLITTERMOND",
  "name": "Jaguar",
  "type": "creature",
  "basis": {
    "id": "agil",
    "name": "Agil",
    "description": "Bewegliche, wendige Kreaturen mit guter Körperkontrolle."
  },
  "rolle": {
    "id": "kampftier",
    "name": "Kampftier",
    "description": "Kampftiere werden darauf abgerichtet, sich mit anderen Wesen zu messen..."
  },
  "verfeinerungen": [
    {
      "id": "sprung",
      "name": "Sprung",
      "category": "bewegungsarten",
      "description": "Die Kreatur kann besonders weit springen",
      "cost": 1
    }
  ],
  "abrichtungen": [
    {
      "id": "loyal",
      "name": "Loyal",
      "category": "allgemein",
      "description": "Das Tier kann nicht mehr von anderen Tierführen auf profane Weise gegen den Willen seines Besitzers kontrolliert werden.",
      "potentialCost": 0
    },
    {
      "id": "kaempfer_1",
      "name": "Kämpfer I",
      "category": "kampf",
      "description": "Das Tier erhält +1 auf seinen Angriffswert und +1 Schaden.",
      "potentialCost": 1
    }
  ],
  "attributes": [
    {"name": "Ausstrahlung", "id": "CHARISMA", "shortName": "AUS", "startValue": 0, "value": 3},
    {"name": "Beweglichkeit", "id": "AGILITY", "shortName": "BEW", "startValue": 0, "value": 6},
    {"name": "Intuition", "id": "INTUITION", "shortName": "INT", "startValue": 0, "value": 4},
    {"name": "Konstitution", "id": "CONSTITUTION", "shortName": "KON", "startValue": 0, "value": 4},
    {"name": "Mystik", "id": "MYSTIC", "shortName": "MYS", "startValue": 0, "value": 0},
    {"name": "Stärke", "id": "STRENGTH", "shortName": "STÄ", "startValue": 0, "value": 4},
    {"name": "Verstand", "id": "MIND", "shortName": "VER", "startValue": 0, "value": 2},
    {"name": "Willenskraft", "id": "WILLPOWER", "shortName": "WIL", "startValue": 0, "value": 3},
    {"name": "Größenklasse", "id": "SIZE", "shortName": "GK", "startValue": 0, "value": 1},
    {"name": "Geschwindigkeit", "id": "SPEED", "shortName": "GSW", "startValue": 0, "value": 11},
    {"name": "Initiative", "id": "INITIATIVE", "shortName": "INI", "startValue": 0, "value": 5},
    {"name": "Lebenspunkte", "id": "LIFE", "shortName": "LP", "startValue": 0, "value": 30},
    {"name": "Fokus", "id": "FOCUS", "shortName": "FO", "startValue": 0, "value": 10},
    {"name": "Verteidigung", "id": "DEFENSE", "shortName": "VTD", "startValue": 0, "value": 15},
    {"name": "Schadensreduktion", "id": "DAMAGE_REDUCTION", "shortName": "SR", "startValue": 0, "value": 1},
    {"name": "Geistiger Widerstand", "id": "MINDRESIST", "shortName": "GW", "startValue": 0, "value": 12},
    {"name": "Körperlicher Widerstand", "id": "BODYRESIST", "shortName": "KW", "startValue": 0, "value": 13}
  ],
  "skills": [
    {
      "name": "Akrobatik",
      "id": "acrobatics",
      "attribute1": "BEW",
      "attribute2": "STÄ",
      "value": 14,
      "points": 7,
      "modifier": 0,
      "masterships": []
    },
    {
      "name": "Heimlichkeit",
      "id": "stealth",
      "attribute1": "BEW",
      "attribute2": "INT",
      "value": 12,
      "points": 6,
      "modifier": 0,
      "masterships": [
        {
          "name": "Lautlos",
          "id": "lautlos",
          "level": 1,
          "shortDescription": "Kann sich geräuschlos bewegen",
          "longDescription": "Kann sich geräuschlos bewegen",
          "page": null,
          "specialization": false
        }
      ]
    },
    {
      "name": "Wahrnehmung",
      "id": "perception",
      "attribute1": "INT",
      "attribute2": "WIL",
      "value": 10,
      "points": 5,
      "modifier": 0,
      "masterships": []
    }
  ],
  "powers": [
    {"name": "Dämmerungssicht", "id": "daemmerungssicht", "count": 1, "shortDescription": "Dämmerungssicht", "longDescription": "Dämmerungssicht", "page": "Bestienmeister"},
    {"name": "Sprung", "id": "sprung", "count": 1, "shortDescription": "Sprung", "longDescription": "Sprung", "page": "Bestienmeister"},
    {"name": "Natürliche Waffen", "id": "natuerliche_waffen", "count": 1, "shortDescription": "Natürliche Waffen", "longDescription": "Natürliche Waffen", "page": "Bestienmeister"}
  ],
  "magicSchools": [],
  "spells": [],
  "meleeWeapons": [
    {
      "name": "Biss",
      "skill": "Handgemenge",
      "attribute1": "BEW",
      "attribute1Id": "AGILITY",
      "attribute2": "STÄ",
      "attribute2Id": "STRENGTH",
      "value": 12,
      "features": [
        {"name": "Stumpf", "level": 0, "description": "", "page": ""},
        {"name": "Kritisch +1", "level": 1, "description": "", "page": ""}
      ],
      "damage": "1W10+2",
      "weaponSpeed": 5,
      "characterTickMalus": 0,
      "calculatedSpeed": 5,
      "relic": false,
      "personalized": false,
      "load": 0,
      "price": 0,
      "availability": null,
      "quality": 0,
      "complexity": null,
      "durability": 0
    }
  ]
}
```

## Wichtige Hinweise für die Implementierung

### 1. Initiative-Parsing
Der Initiative-Wert (INI) ist ein String im Format "X-Y". Beim Import sollte nur der erste Teil (vor dem "-") als numerischer Wert verwendet werden:
```javascript
const iniValue = parseInt(iniString.split('-')[0], 10);
```

### 2. Fertigkeitspunkte vs. Fertigkeitswerte
- **value**: Der tatsächliche Fertigkeitswert (wird für Proben verwendet)
- **points**: Halber Wert (value / 2) - zeigt investierte Punkte
- Splittermond verwendet das Doppelte der Punkte als Fertigkeitswert

### 3. Attribute-Referenzen
- In vielen Objekten werden Attribute über ihre Abkürzung referenziert (z.B. "BEW", "STÄ")
- Die vollständigen Attribut-Objekte sind im `attributes`-Array zu finden
- Für VTT-Integration: Mapping zwischen shortName, id und vollständigem Namen beachten

### 4. Optionale Felder
Folgende Felder können fehlen oder leer sein:
- `basis` (kann `null` sein)
- `rolle` (kann `null` sein)
- `verfeinerungen` (kann leeres Array sein)
- `abrichtungen` (kann leeres Array sein)
- `regelverstöße` (nur wenn Regelabweichungen vorhanden)
- `spells` (kann leeres Array sein)
- Viele Detail-Felder bei Waffen und Zaubern

### 5. Besonderheiten des Splittermond-Systems
- **Größenklasse (GK)**: Beeinflusst Kampfmanöver und Zielgrößen
- **Initiative**: Bestimmt zusammen mit Taktikwahl die Aktionsreihenfolge
- **WGS (Waffengeschwindigkeit)**: Bestimmt wie oft pro Kampfrunde angreifbar
- **Fokus**: "Mana" des Systems für magische Kreaturen
- **Zwei Attribute pro Fertigkeit**: Splittermond verwendet bei Proben beide Attribute

### 6. Empfohlene UI-Elemente für VTT-Bogen
- Kreatur-Header mit Name, Basis und Rolle
- Attribut-Übersicht mit Primär- und Sekundärwerten
- Fertigkeitsliste mit Würfelbuttons für Proben
- Meisterschaften als aufklappbare/hover-Details bei Fertigkeiten
- Verfeinerungen als Badge-Liste oder Kategorien
- Abrichtungen gruppiert nach Kategorie (Allgemein, Kampf, etc.)
- Merkmale als separate Sektion oder Tags
- Waffenliste mit Angriffs- und Schadensbuttons
- Zauber-Sektion (falls vorhanden)
- Status-Tracker für LP und FO

## Validierung

Beim Import sollten folgende Checks durchgeführt werden:

1. **Version-Check**: `jsonExporterVersion` und `system` prüfen
2. **Pflichtfelder**: name, type, attributes, skills müssen vorhanden sein
3. **Optionale Strukturfelder**: basis, rolle, verfeinerungen, abrichtungen sollten vorhanden sein (können aber null/leer sein)
4. **Attribut-Vollständigkeit**: Alle 8 Grundattribute + 9 abgeleitete Werte sollten vorhanden sein
5. **Referenz-Integrität**: Attribut-Referenzen in skills/weapons müssen gültig sein
6. **Datentypen**: Numerische Werte müssen Numbers sein (außer INI)
7. **Array-Typen**: verfeinerungen, abrichtungen, skills, powers, spells, meleeWeapons müssen Arrays sein

## Support

Bei Fragen oder Problemen mit dem Import-Format kann das GitHub-Repository des Creature Editors konsultiert werden.
