/**
 * Creature Actor class - NO automatic calculations
 * All values are manually editable and independent
 */
export class CreatureActor extends Actor {

  /**
   * Prepare base data - create simple value containers
   * CRITICAL: NO CALCULATIONS
   */
  prepareBaseData() {
    super.prepareBaseData();

    // Initialize attributes as simple value containers
    this.attributes = {};
    const attrList = [
      "charisma", "agility", "intuition", "constitution",
      "mysticism", "strength", "mind", "dexterity"
    ];

    for (const attrId of attrList) {
      this.attributes[attrId] = {
        id: attrId,
        value: this.system.attributes?.[attrId]?.value || 0,
        points: 0,
        label: game.i18n.localize(`splittermond.attribute.${attrId}`)
      };
    }

    // Initialize skills as simple value containers
    this.skills = {};
    const skillList = [
      "athletics", "melee", "endurance", "craft", "dexterity",
      "diplomacy", "stealth", "linguistics", "history", "hunt",
      "perception", "performance", "ranged", "ride", "seafaring",
      "spellcasting", "swimming", "survival", "medicine", "resistance"
    ];

    for (const skillId of skillList) {
      this.skills[skillId] = {
        id: skillId,
        value: this.system.skills?.[skillId]?.value || 0,
        points: 0,
        label: game.i18n.localize(`splittermond.skill.${skillId}`)
      };
    }

    // Initialize derived values as simple value containers
    this.derivedValues = {};
    const derivedList = [
      "size", "speed", "initiative", "healthpoints", "focuspoints",
      "defense", "bodyresist", "mindresist"
    ];

    for (const derivedId of derivedList) {
      this.derivedValues[derivedId] = {
        id: derivedId,
        value: this.system.derivedAttributes?.[derivedId]?.value || 0,
        label: game.i18n.localize(`CREATURE.${derivedId.charAt(0).toUpperCase() + derivedId.slice(1)}`)
      };
    }

    // Health and Focus tracking
    this.health = {
      max: this.derivedValues.healthpoints.value,
      consumed: this.system.health?.consumed || 0,
      exhausted: this.system.health?.exhausted || 0,
      channeled: this.system.health?.channeled || [],
      value: 0 // Will be calculated in prepareDerivedData
    };

    this.focus = {
      max: this.derivedValues.focuspoints.value,
      consumed: this.system.focus?.consumed || 0,
      exhausted: this.system.focus?.exhausted || 0,
      channeled: this.system.focus?.channeled || [],
      value: 0 // Will be calculated in prepareDerivedData
    };
  }

  /**
   * Prepare derived data
   * SKIP all automatic calculations - only prepare attacks
   */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Calculate current health and focus
    this.health.value = Math.max(0, this.health.max - this.health.consumed - this.health.exhausted);
    this.focus.value = Math.max(0, this.focus.max - this.focus.consumed - this.focus.exhausted);

    // Prepare attacks from npcattack items
    this._prepareAttacks();

    // Prepare active defense
    this._prepareActiveDefense();
  }

  /**
   * Prepare attacks from npcattack items
   */
  _prepareAttacks() {
    this.attacks = [];

    for (const item of this.items) {
      if (item.type === "npcattack") {
        this.attacks.push({
          id: item.id,
          name: item.name,
          skillValue: item.system.skillValue || 0,
          damage: item.system.damage || "1W6",
          weaponSpeed: item.system.weaponSpeed || 0,
          range: item.system.range || 0,
          features: item.system.features || "",
          item: item
        });
      }
    }
  }

  /**
   * Prepare active defense value
   */
  _prepareActiveDefense() {
    this.activeDefense = {
      value: this.derivedValues.defense.value,
      label: game.i18n.localize("CREATURE.Defense")
    };
  }

  /**
   * Roll a skill check using Splittermond's system
   * @param {string} skillId - The skill identifier
   * @param {object} options - Additional options for the roll
   */
  async rollSkillCheck(skillId, options = {}) {
    const skill = this.skills[skillId];
    if (!skill) {
      ui.notifications.warn(`Skill ${skillId} not found`);
      return;
    }

    // Use Splittermond's CheckDialog
    const CheckDialog = game.splittermond.apps.CheckDialog;
    if (!CheckDialog) {
      ui.notifications.error("Splittermond CheckDialog not available");
      return;
    }

    const dialog = new CheckDialog(this, skill, options);
    return dialog.roll();
  }

  /**
   * Roll an attack
   * @param {string} attackId - The attack item ID
   */
  async rollAttack(attackId) {
    const attack = this.attacks.find(a => a.id === attackId);
    if (!attack) {
      ui.notifications.warn("Attack not found");
      return;
    }

    // Use the npcattack item's roll method
    if (attack.item && typeof attack.item.roll === 'function') {
      return attack.item.roll();
    }

    // Fallback to manual roll
    const rollFormula = `1d20 + ${attack.skillValue}`;
    const roll = await new Roll(rollFormula).evaluate();

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `${attack.name} - Attack Roll`
    });

    return roll;
  }

  /**
   * Get refinements grouped by category
   */
  getRefinementsByCategory() {
    const grouped = {};
    const verfeinerungen = this.system.verfeinerungen || [];

    for (const verf of verfeinerungen) {
      const category = verf.kategorie || "sonstiges";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(verf);
    }

    return grouped;
  }

  /**
   * Get training (Abrichtungen) grouped by category
   */
  getTrainingByCategory() {
    const grouped = {};
    const abrichtungen = this.system.abrichtungen || [];

    for (const abr of abrichtungen) {
      const category = abr.kategorie || "sonstiges";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(abr);
    }

    return grouped;
  }

  /**
   * Calculate total refinement costs
   */
  getTotalRefinementCost() {
    let total = 0;
    const verfeinerungen = this.system.verfeinerungen || [];
    for (const verf of verfeinerungen) {
      total += verf.kosten || 0;
    }
    return total;
  }

  /**
   * Calculate total training potential costs
   */
  getTotalTrainingCost() {
    let total = 0;
    const abrichtungen = this.system.abrichtungen || [];
    for (const abr of abrichtungen) {
      total += abr.potenzialKosten || 0;
    }
    return total;
  }
}
