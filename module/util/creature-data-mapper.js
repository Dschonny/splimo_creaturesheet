/**
 * Converts .cre file data to FoundryVTT actor and item data structures
 */
export class CreatureDataMapper {

  /**
   * Maps a .cre file object to actor data
   * @param {Object} creData - Parsed .cre file content
   * @returns {Object} Actor data structure with embedded items
   */
  static mapCreToActorData(creData) {
    if (!creData || creData.editor !== "SPLITTERMOND_CREATURE_EDITOR") {
      throw new Error("Invalid .cre file format");
    }

    // Prepare actor data
    const actorData = {
      name: creData.name || "Unbenannte Kreatur",
      type: "creature",
      system: {
        attributes: this._initializeAttributes(),
        skills: this._initializeSkills(),
        derivedAttributes: this._initializeDerivedAttributes(),
        creatureData: {
          basis: creData.basis || "ausgewogen",
          rolle: creData.rolle || "",
          typus: creData.typus || [],
          potentialModifiers: creData.potentialModifiers || {
            tiervertrauter: false,
            tierspezialist: 0,
            meisterDerBestien: false,
            meisterbaendiger: false
          }
        },
        health: { consumed: 0, exhausted: 0, channeled: [] },
        focus: { consumed: 0, exhausted: 0, channeled: [] },
        damageReduction: { value: 0 },
        biography: creData.description || ""
      }
    };

    // Prepare items array
    const items = [];
    const weaponLinks = new Map(); // Track weapons created from refinements

    // Convert Verfeinerungen to refinement items
    if (creData.verfeinerungen && Array.isArray(creData.verfeinerungen)) {
      for (const verf of creData.verfeinerungen) {
        const refinementItem = this.mapVerfeinerungToItem(verf);
        items.push(refinementItem);

        // Check for zusaetzlicheWaffe
        if (verf.zusaetzlicheWaffe) {
          const weaponItem = this.createWeaponFromVerfeinerung(verf, verf.name);
          items.push(weaponItem);
          // Store weapon name to link it to refinement later
          weaponLinks.set(refinementItem.name, weaponItem.name);
        }
      }
    }

    // Convert Abrichtungen to training items
    if (creData.abrichtungen && Array.isArray(creData.abrichtungen)) {
      for (const abr of creData.abrichtungen) {
        items.push(this.mapAbrichtungToItem(abr));
      }
    }

    return {
      actorData,
      items,
      weaponLinks
    };
  }

  /**
   * Maps a Verfeinerung to a refinement item
   */
  static mapVerfeinerungToItem(verf) {
    return {
      name: verf.name || "Unbenannte Verfeinerung",
      type: "refinement",
      system: {
        description: verf.beschreibung || "",
        kategorie: verf.kategorie || "sonstiges",
        kosten: verf.kosten || 0,
        ausgewaehlteWahl: verf.ausgewaehlteWahl || "",
        ausgewaehlteAttribute: verf.ausgewaehlteAttribute || [],
        zusaetzlicheWaffeId: "" // Will be set after item creation
      }
    };
  }

  /**
   * Maps an Abrichtung to a training item
   */
  static mapAbrichtungToItem(abr) {
    return {
      name: abr.name || "Unbenannte Abrichtung",
      type: "training",
      system: {
        description: abr.beschreibung || "",
        kategorie: abr.kategorie || "sonstiges",
        potenzialKosten: abr.potenzialKosten || 0,
        voraussetzung: abr.voraussetzung || "",
        zusatzInfo: abr.zusatzInfo || "",
        ausgewaehlteWahl: abr.ausgewaehlteWahl || "",
        grosseTricksWahl: abr.grosseTricksWahl || "",
        customMeisterschaften: abr.customMeisterschaften || []
      }
    };
  }

  /**
   * Creates an npcattack item from a Verfeinerung's zusaetzlicheWaffe
   */
  static createWeaponFromVerfeinerung(verf, verfeinerungName) {
    const waffe = verf.zusaetzlicheWaffe;

    return {
      name: `${verfeinerungName} - Waffe`,
      type: "npcattack",
      system: {
        skillValue: waffe.wert || 0,
        damage: waffe.schaden || "1W6",
        weaponSpeed: waffe.WGS || 0,
        range: waffe.reichweite || 0,
        features: waffe.merkmale || ""
      }
    };
  }

  /**
   * Initializes all attributes with value 0
   */
  static _initializeAttributes() {
    const attributes = {};
    const attrList = [
      "charisma", "agility", "intuition", "constitution",
      "mysticism", "strength", "mind", "dexterity"
    ];

    for (const attr of attrList) {
      attributes[attr] = { value: 0 };
    }

    return attributes;
  }

  /**
   * Initializes all skills with value 0
   */
  static _initializeSkills() {
    const skills = {};
    const skillList = [
      "athletics", "melee", "endurance", "craft", "dexterity",
      "diplomacy", "stealth", "linguistics", "history", "hunt",
      "perception", "performance", "ranged", "ride", "seafaring",
      "spellcasting", "swimming", "survival", "medicine", "resistance"
    ];

    for (const skill of skillList) {
      skills[skill] = { value: 0 };
    }

    return skills;
  }

  /**
   * Initializes all derived attributes with value 0
   */
  static _initializeDerivedAttributes() {
    return {
      size: { value: 0 },
      speed: { value: 0 },
      initiative: { value: 0 },
      healthpoints: { value: 0 },
      focuspoints: { value: 0 },
      defense: { value: 0 },
      bodyresist: { value: 0 },
      mindresist: { value: 0 }
    };
  }

  /**
   * Validates a .cre file structure
   */
  static validateCreFormat(data) {
    if (!data) {
      return { valid: false, error: "Keine Daten vorhanden" };
    }

    if (data.editor !== "SPLITTERMOND_CREATURE_EDITOR") {
      return { valid: false, error: "Ungültiges Editor-Format" };
    }

    if (!data.name) {
      return { valid: false, error: "Kein Name gefunden" };
    }

    return { valid: true };
  }
}
