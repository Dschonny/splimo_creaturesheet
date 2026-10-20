import { fixedSkillValuesToPoints, MODULE_ID, SHEET_ID } from "../compat.js";

/**
 * Converts VTT Import JSON format to FoundryVTT actor and item data structures
 */
export class CreatureDataMapper {

  // Mapping from German magic school names to Splittermond skill IDs
  static MAGIC_SCHOOL_TO_SKILL = {
    "bannmagie": "antimagic",
    "beherrschungsmagie": "controlmagic",
    "beherrschung": "controlmagic",
    "bewegungsmagie": "motionmagic",
    "erkenntnismagie": "insightmagic",
    "erkenntnis": "insightmagic",
    "felsmagie": "stonemagic",
    "feuermagie": "firemagic",
    "feuer": "firemagic",
    "heilungsmagie": "healmagic",
    "heilung": "healmagic",
    "illusionsmagie": "illusionmagic",
    "illusion": "illusionmagic",
    "kampfmagie": "combatmagic",
    "kampf": "combatmagic",
    "lichtmagie": "lightmagic",
    "licht": "lightmagic",
    "naturmagie": "naturemagic",
    "natur": "naturemagic",
    "schattenmagie": "shadowmagic",
    "schatten": "shadowmagic",
    "schicksalsmagie": "fatemagic",
    "schicksal": "fatemagic",
    "schutzmagie": "protectionmagic",
    "schutz": "protectionmagic",
    "stärkungsmagie": "enhancemagic",
    "stärkung": "enhancemagic",
    "todesmagie": "deathmagic",
    "tod": "deathmagic",
    "verwandlungsmagie": "transformationmagic",
    "verwandlung": "transformationmagic",
    "wassermagie": "watermagic",
    "wasser": "watermagic",
    "windmagie": "windmagic",
    "wind": "windmagic",
    "eismagie": "watermagic", // Eismagie uses watermagic skill
    "eis": "watermagic"
  };

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

    // Add magic schools as skills
    this._addMagicSchoolsToSkills(skills, jsonData.magicSchools);

    // Prepare actor data (Splittermond-13-NSC-Modell; Kreatur-Daten liegen in den Modul-Flags)
    const { damageReduction, ...npcDerivedAttributes } = derivedAttributes;
    const system = {
      type: "Kreatur",
      level: "",
      sex: "",
      attributes: attributes,
      derivedAttributes: npcDerivedAttributes,
      damageReduction: {
        value: damageReduction?.value || 0
      },
      biography: ""
    };
    // Die Kreaturwerte sind Endwerte; Splittermond braucht Punkte (Endwert - Attribut1 - Attribut2).
    fixedSkillValuesToPoints(system, Object.fromEntries(
      Object.entries(skills).map(([id, skill]) => [id, skill.value || 0])
    ));

    const actorData = {
      name: jsonData.name || "Unbenannte Kreatur",
      type: "npc",
      img: "icons/svg/mystery-man.svg",
      system,
      flags: {
        core: { sheetClass: SHEET_ID },
        [MODULE_ID]: {
          version: 2,
          creatureInfo: {
            basis: jsonData.basis || null,
            rolle: jsonData.rolle || null,
            verfeinerungen: jsonData.verfeinerungen || [],
            abrichtungen: jsonData.abrichtungen || []
          }
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

    // Add spells as npcfeature items with a special flag (not as spell items)
    // Spell items require a valid skill reference which is hard to map reliably
    // These will be displayed in a separate "Unassigned Spells" section
    if (jsonData.spells && Array.isArray(jsonData.spells)) {
      for (const spell of jsonData.spells) {
        items.push(this._createSpellAsFeature(spell));
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
      "MYSTIC": "mystic",
      "STRENGTH": "strength",
      "MIND": "mind",
      "WILLPOWER": "willpower"
    };

    for (const attr of attributesArray) {
      const splittermondId = primaryAttrMap[attr.id];
      if (splittermondId) {
        attributes[splittermondId] = {
          value: attr.value || 0
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
   * Adds magic schools to skills object
   */
  static _addMagicSchoolsToSkills(skills, magicSchools) {
    if (!magicSchools || !Array.isArray(magicSchools)) {
      return;
    }

    for (const school of magicSchools) {
      // Get the skill ID for this magic school
      const schoolNameLower = (school.name || school.id || "").toLowerCase();
      const skillId = this.MAGIC_SCHOOL_TO_SKILL[schoolNameLower];

      if (skillId) {
        skills[skillId] = {
          value: school.value || 0,
          points: Math.floor((school.value || 0) / 2),
          modifier: 0,
          label: school.name || school.id
        };
      }
    }
  }

  /**
   * Maps a German magic school name to Splittermond skill ID
   */
  static _mapMagicSchoolToSkillId(schoolName) {
    if (!schoolName) return null;
    const normalized = schoolName.toLowerCase().trim();
    return this.MAGIC_SCHOOL_TO_SKILL[normalized] || null;
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
      // Splittermond erwartet "Name Stufe" (z.B. "Kritisch 1"); der Editor kodiert die Stufe als "Kritisch +1"
      featuresStr = weapon.features
        .map(f => {
          const name = (f.name || "").replace(/\s*\+?\d+$/, "").trim();
          return name && f.level ? `${name} ${f.level}` : name;
        })
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
   * Initially marked as unassigned - the importer will try to match with compendium
   */
  static _createMasteryItem(mastery, skill) {
    return {
      name: mastery.name,
      type: "mastery",
      system: {
        skill: skill.id || "general",
        level: mastery.level || 1,
        description: mastery.longDescription || mastery.shortDescription || "",
        page: mastery.page || "",
        isUnassignedMastery: true
      }
    };
  }

  /**
   * Creates a spell item from a spell (currently unused - spells are imported as features)
   */
  static _createSpellItem(spell) {
    // Map the school name to skill ID
    const skillId = this._mapMagicSchoolToSkillId(spell.school);

    return {
      name: spell.name,
      type: "spell",
      system: {
        skill: skillId || "",
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
   * Creates an npcfeature item from a spell (workaround until spell dialog is implemented)
   * Uses a special flag to identify it as an unassigned spell for display in spells tab
   */
  static _createSpellAsFeature(spell) {
    const schoolInfo = spell.school ? `[${spell.school}${spell.schoolGrade ? " " + spell.schoolGrade : ""}] ` : "";
    return {
      name: spell.name,
      type: "npcfeature",
      system: {
        description: schoolInfo + (spell.longDescription || ""),
        page: spell.page || "",
        isUnassignedSpell: true,
        spellSchool: spell.school || "",
        spellGrade: spell.schoolGrade || 0
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
