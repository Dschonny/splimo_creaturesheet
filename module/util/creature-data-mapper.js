/**
 * Converts VTT Import JSON format to FoundryVTT actor and item data structures
 */
export class CreatureDataMapper {

  /**
   * Maps a VTT Import JSON file to actor data
   * @param {Object} jsonData - Parsed JSON file content
   * @returns {Object} Actor data structure with embedded items
   */
  static mapJsonToActorData(jsonData) {
    if (!jsonData || jsonData.system !== "SPLITTERMOND" || jsonData.type !== "creature") {
      throw new Error("Invalid VTT Import JSON format");
    }

    // Map attributes
    const attributes = this._mapAttributes(jsonData.attributes);
    const derivedAttributes = this._mapDerivedAttributes(jsonData.attributes);

    // Map skills
    const skills = this._mapSkills(jsonData.skills);

    // Prepare actor data
    const actorData = {
      name: jsonData.name || "Unbenannte Kreatur",
      type: "npc",
      img: "icons/svg/mystery-man.svg",
      system: {
        type: "Kreatur",
        level: "",
        sex: "",
        attributes: attributes,
        skills: skills,
        derivedValues: derivedAttributes,
        health: {
          max: derivedAttributes.healthpoints?.value || 0,
          value: derivedAttributes.healthpoints?.value || 0,
          consumed: 0,
          exhausted: 0,
          channeled: { entries: [] }
        },
        focus: {
          max: derivedAttributes.focuspoints?.value || 0,
          value: derivedAttributes.focuspoints?.value || 0,
          consumed: 0,
          exhausted: 0,
          channeled: { entries: [] }
        },
        damageReduction: {
          value: derivedAttributes.damageReduction?.value || 0
        },
        biography: "",
        biographyHTML: "",
        creatureInfo: {
          basis: jsonData.basis || null,
          rolle: jsonData.rolle || null,
          verfeinerungen: jsonData.verfeinerungen || [],
          abrichtungen: jsonData.abrichtungen || []
        },
        currency: {
          lunar: 0,
          solar: 0,
          ternar: 0
        }
      }
    };

    // Prepare items array
    const items = [];

    // Add npcfeature items from powers
    if (jsonData.powers && Array.isArray(jsonData.powers)) {
      for (const power of jsonData.powers) {
        items.push(this._createNpcFeatureItem(power));
      }
    }

    // Add npcattack items from meleeWeapons
    if (jsonData.meleeWeapons && Array.isArray(jsonData.meleeWeapons)) {
      for (const weapon of jsonData.meleeWeapons) {
        items.push(this._createNpcAttackItem(weapon));
      }
    }

    // Add mastery items from skills
    if (jsonData.skills && Array.isArray(jsonData.skills)) {
      for (const skill of jsonData.skills) {
        if (skill.masterships && Array.isArray(skill.masterships)) {
          for (const mastery of skill.masterships) {
            items.push(this._createMasteryItem(mastery, skill));
          }
        }
      }
    }

    // Add spell items if any
    if (jsonData.spells && Array.isArray(jsonData.spells)) {
      for (const spell of jsonData.spells) {
        items.push(this._createSpellItem(spell));
      }
    }

    return {
      actorData,
      items
    };
  }

  /**
   * Maps attributes from JSON format to Splittermond system format
   */
  static _mapAttributes(attributesArray) {
    const attributes = {};

    // Primary attributes mapping
    const primaryAttrMap = {
      "CHARISMA": "charisma",
      "AGILITY": "agility",
      "INTUITION": "intuition",
      "CONSTITUTION": "constitution",
      "MYSTIC": "mysticism",
      "STRENGTH": "strength",
      "MIND": "mind",
      "WILLPOWER": "willpower"
    };

    for (const attr of attributesArray) {
      const splittermondId = primaryAttrMap[attr.id];
      if (splittermondId) {
        attributes[splittermondId] = {
          value: attr.value || 0,
          points: 0
        };
      }
    }

    return attributes;
  }

  /**
   * Maps derived attributes from JSON format to Splittermond system format
   */
  static _mapDerivedAttributes(attributesArray) {
    const derivedAttributes = {};

    // Derived attributes mapping
    const derivedAttrMap = {
      "SIZE": "size",
      "SPEED": "speed",
      "INITIATIVE": "initiative",
      "LIFE": "healthpoints",
      "FOCUS": "focuspoints",
      "DEFENSE": "defense",
      "DAMAGE_REDUCTION": "damageReduction",
      "MINDRESIST": "mindresist",
      "BODYRESIST": "bodyresist"
    };

    for (const attr of attributesArray) {
      const splittermondId = derivedAttrMap[attr.id];
      if (splittermondId) {
        let value = attr.value;

        // Special handling for initiative (parse "X-Y" format)
        if (attr.id === "INITIATIVE" && typeof value === "string") {
          value = parseInt(value.split('-')[0], 10);
        }

        derivedAttributes[splittermondId] = {
          value: value || 0
        };
      }
    }

    return derivedAttributes;
  }

  /**
   * Maps skills from JSON format to Splittermond system format
   */
  static _mapSkills(skillsArray) {
    const skills = {};

    if (!skillsArray || !Array.isArray(skillsArray)) {
      return skills;
    }

    for (const skill of skillsArray) {
      if (skill.id) {
        skills[skill.id] = {
          value: skill.value || 0,
          points: skill.points || 0,
          modifier: skill.modifier || 0,
          label: skill.name || skill.id // Store the German name
        };
      }
    }

    return skills;
  }

  /**
   * Creates an npcfeature item from a power
   */
  static _createNpcFeatureItem(power) {
    return {
      name: power.name,
      type: "npcfeature",
      system: {
        description: power.longDescription || power.shortDescription || "",
        page: power.page || ""
      }
    };
  }

  /**
   * Creates an npcattack item from a weapon
   */
  static _createNpcAttackItem(weapon) {
    // Build features string
    let featuresStr = "";
    if (weapon.features && Array.isArray(weapon.features)) {
      featuresStr = weapon.features
        .map(f => f.name)
        .filter(n => n)
        .join(", ");
    }

    return {
      name: weapon.name,
      type: "npcattack",
      system: {
        skillValue: weapon.value || 0,
        damage: weapon.damage || "1W6",
        weaponSpeed: weapon.weaponSpeed || 0,
        range: weapon.range || 0,
        features: featuresStr
      }
    };
  }

  /**
   * Creates a mastery item from a skill's mastery
   */
  static _createMasteryItem(mastery, skill) {
    return {
      name: mastery.name,
      type: "mastery",
      system: {
        skill: skill.id || "general",
        level: mastery.level || 1,
        description: mastery.longDescription || mastery.shortDescription || "",
        page: mastery.page || ""
      }
    };
  }

  /**
   * Creates a spell item from a spell
   */
  static _createSpellItem(spell) {
    return {
      name: spell.name,
      type: "spell",
      system: {
        school: spell.school || "",
        schoolGrade: spell.schoolGrade || 0,
        difficulty: spell.difficulty || "",
        focus: spell.focus || "",
        castDuration: spell.castDuration || "",
        castRange: spell.castRange || "",
        spellDuration: spell.spellDuration || "",
        description: spell.longDescription || "",
        page: spell.page || ""
      }
    };
  }

  /**
   * Validates a VTT Import JSON file structure
   */
  static validateJsonFormat(data) {
    if (!data) {
      return { valid: false, error: "Keine Daten vorhanden" };
    }

    console.log("Validating VTT Import JSON:", data);
    console.log("System field:", data.system);
    console.log("Type field:", data.type);
    console.log("Version:", data.jsonExporterVersion);

    if (data.system !== "SPLITTERMOND") {
      return { valid: false, error: `Ungültiges System: '${data.system}' (erwartet: 'SPLITTERMOND')` };
    }

    if (data.type !== "creature") {
      return { valid: false, error: `Ungültiger Typ: '${data.type}' (erwartet: 'creature')` };
    }

    if (!data.name) {
      return { valid: false, error: "Kein Name gefunden" };
    }

    if (!data.attributes || !Array.isArray(data.attributes)) {
      return { valid: false, error: "Keine Attribute gefunden" };
    }

    return { valid: true };
  }
}
