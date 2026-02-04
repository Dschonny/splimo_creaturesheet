/**
 * Creature Actor class - Extends standard NPC functionality
 */
export class CreatureActor extends Actor {

  /**
   * Prepare base data
   */
  prepareBaseData() {
    super.prepareBaseData();

    // Ensure all required data structures exist
    if (!this.system.attributes) {
      this.system.attributes = {};
    }

    if (!this.system.skills) {
      this.system.skills = {};
    }

    if (!this.system.derivedValues) {
      this.system.derivedValues = {};
    }

    if (!this.system.health) {
      this.system.health = {
        value: 0,
        consumed: 0,
        exhausted: 0,
        channeled: { entries: [] }
      };
    }

    if (!this.system.focus) {
      this.system.focus = {
        value: 0,
        consumed: 0,
        exhausted: 0,
        channeled: { entries: [] }
      };
    }

    if (!this.system.damageReduction) {
      this.system.damageReduction = { value: 0 };
    }
  }

  /**
   * Prepare derived data
   */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Update health and focus values
    const maxHealth = this.system.derivedValues?.healthpoints?.value || 0;
    const maxFocus = this.system.derivedValues?.focuspoints?.value || 0;

    this.system.health.value = Math.max(
      0,
      maxHealth - (this.system.health.consumed || 0) - (this.system.health.exhausted || 0)
    );

    this.system.focus.value = Math.max(
      0,
      maxFocus - (this.system.focus.consumed || 0) - (this.system.focus.exhausted || 0)
    );

    // Prepare attributes for display
    this._prepareAttributes();

    // Prepare derived values for display
    this._prepareDerivedValues();

    // Prepare attacks
    this._prepareAttacks();

    // Prepare active defense
    this._prepareActiveDefense();
  }

  /**
   * Prepare attributes
   */
  _prepareAttributes() {
    const attrs = this.system.attributes || {};

    this.attributes = {};

    const attrIds = [
      "charisma", "agility", "intuition", "constitution",
      "mysticism", "strength", "mind", "willpower"
    ];

    for (const attrId of attrIds) {
      const attrData = attrs[attrId] || { value: 0, points: 0 };
      const label = game.splittermond?.config?.attributes?.[attrId] || { short: attrId, long: attrId };

      this.attributes[attrId] = {
        value: attrData.value || 0,
        points: attrData.points || 0,
        label: label
      };
    }
  }

  /**
   * Prepare derived values
   */
  _prepareDerivedValues() {
    const derived = this.system.derivedValues || {};

    this.derivedValues = {};

    const derivedIds = [
      "size", "speed", "initiative", "healthpoints", "focuspoints",
      "defense", "mindResist", "bodyResist"
    ];

    for (const derivedId of derivedIds) {
      const derivedData = derived[derivedId] || { value: 0 };
      const label = game.splittermond?.config?.derivedAttributes?.[derivedId] || { short: derivedId, long: derivedId };

      this.derivedValues[derivedId] = {
        value: derivedData.value || 0,
        label: label
      };
    }

    // Damage reduction
    this.damageReduction = {
      value: this.system.damageReduction?.value || 0
    };
  }

  /**
   * Prepare attacks from npcattack items
   */
  _prepareAttacks() {
    this.attacks = [];

    for (const item of this.items) {
      if (item.type === "npcattack") {
        const skillValue = item.system.skillValue || 0;

        this.attacks.push({
          id: item.id,
          name: item.name,
          img: item.img,
          skill: {
            value: skillValue,
            editable: true
          },
          skillId: "melee",
          damage: item.system.damage || "1W6",
          weaponSpeed: item.system.weaponSpeed || 0,
          range: item.system.range || 0,
          features: item.system.features || "",
          item: item,
          editable: true,
          deletable: true,
          isDamaged: false
        });
      }
    }
  }

  /**
   * Prepare active defense
   */
  _prepareActiveDefense() {
    const defenseValue = this.system.derivedValues?.defense?.value || 0;

    this.activeDefense = {
      defense: [{
        id: "defense",
        name: "splittermond.derivedAttribute.defense.long",
        skill: {
          value: defenseValue
        },
        features: ""
      }],
      mindresist: [{
        id: "mindresist",
        name: "splittermond.derivedAttribute.mindresist.long",
        skill: {
          value: this.system.derivedValues?.mindResist?.value || 0
        }
      }],
      bodyresist: [{
        id: "bodyresist",
        name: "splittermond.derivedAttribute.bodyresist.long",
        skill: {
          value: this.system.derivedValues?.bodyResist?.value || 0
        }
      }]
    };
  }
}
