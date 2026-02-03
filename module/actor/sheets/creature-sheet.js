import { CreatureImporter } from "../../apps/creature-importer.js";

/**
 * Creature Sheet Application
 */
export class CreatureSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["splittermond", "sheet", "actor", "creature"],
      template: "modules/splimo_creaturesheet/templates/sheets/creature-sheet.hbs",
      width: 750,
      height: 800,
      tabs: [{
        navSelector: ".sheet-tabs",
        contentSelector: ".sheet-body",
        initial: "general"
      }]
    });
  }

  /** @override */
  getData() {
    const context = super.getData();

    // Add creature-specific data
    context.attributes = this.actor.attributes;
    context.skills = this.actor.skills;
    context.derivedValues = this.actor.derivedValues;
    context.health = this.actor.health;
    context.focus = this.actor.focus;
    context.attacks = this.actor.attacks;

    // Group items by type and category
    context.refinementsByCategory = this._groupRefinementsByCategory();
    context.trainingByCategory = this._groupTrainingByCategory();

    // Calculate total costs
    context.totalRefinementCost = this.actor.getTotalRefinementCost();
    context.totalTrainingCost = this.actor.getTotalTrainingCost();

    // Creature data
    context.creatureData = this.actor.system.creatureData || {};

    // Localization
    context.refinementCategories = this._getRefinementCategoryLabels();
    context.trainingCategories = this._getTrainingCategoryLabels();

    return context;
  }

  /**
   * Group refinements by category
   */
  _groupRefinementsByCategory() {
    const grouped = {};
    const verfeinerungen = this.actor.system.verfeinerungen || [];

    for (const verf of verfeinerungen) {
      const category = verf.kategorie || "sonstiges";
      if (!grouped[category]) {
        grouped[category] = {
          label: game.i18n.localize(`CREATURE.RefinementCategories.${category}`),
          items: []
        };
      }
      grouped[category].items.push(verf);
    }

    return grouped;
  }

  /**
   * Group training by category
   */
  _groupTrainingByCategory() {
    const grouped = {};
    const abrichtungen = this.actor.system.abrichtungen || [];

    for (const abr of abrichtungen) {
      const category = abr.kategorie || "sonstiges";
      if (!grouped[category]) {
        grouped[category] = {
          label: game.i18n.localize(`CREATURE.TrainingCategories.${category}`),
          items: []
        };
      }
      grouped[category].items.push(abr);
    }

    return grouped;
  }

  /**
   * Get refinement category labels
   */
  _getRefinementCategoryLabels() {
    const categories = [
      "groesse", "koerperliche_besonderheiten", "fortbewegung",
      "sinne", "natuerliche_waffen", "besondere_faehigkeiten"
    ];

    return categories.map(cat => ({
      value: cat,
      label: game.i18n.localize(`CREATURE.RefinementCategories.${cat}`)
    }));
  }

  /**
   * Get training category labels
   */
  _getTrainingCategoryLabels() {
    const categories = ["grundausbildung", "kampf", "reittier", "sonstiges"];

    return categories.map(cat => ({
      value: cat,
      label: game.i18n.localize(`CREATURE.TrainingCategories.${cat}`)
    }));
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Editable fields
    html.find('.attribute-value').change(this._onChangeAttribute.bind(this));
    html.find('.skill-value').change(this._onChangeSkill.bind(this));
    html.find('.derived-value').change(this._onChangeDerived.bind(this));

    // Rollable skills
    html.find('.skill-roll').click(this._onRollSkill.bind(this));

    // Rollable attacks
    html.find('.attack-roll').click(this._onRollAttack.bind(this));

    // Import creature
    html.find('.import-creature').click(this._onImportCreature.bind(this));

    // Item management
    html.find('.item-create').click(this._onItemCreate.bind(this));
    html.find('.item-edit').click(this._onItemEdit.bind(this));
    html.find('.item-delete').click(this._onItemDelete.bind(this));

    // Health and Focus management
    html.find('.health-control').click(this._onHealthControl.bind(this));
    html.find('.focus-control').click(this._onFocusControl.bind(this));
  }

  /**
   * Handle attribute value change - direct update, no calculation
   */
  async _onChangeAttribute(event) {
    event.preventDefault();
    const value = parseInt(event.currentTarget.value) || 0;
    const attrId = event.currentTarget.dataset.attribute;

    await this.actor.update({
      [`system.attributes.${attrId}.value`]: value
    });
  }

  /**
   * Handle skill value change - direct update, no calculation
   */
  async _onChangeSkill(event) {
    event.preventDefault();
    const value = parseInt(event.currentTarget.value) || 0;
    const skillId = event.currentTarget.dataset.skill;

    await this.actor.update({
      [`system.skills.${skillId}.value`]: value
    });
  }

  /**
   * Handle derived value change - direct update, no calculation
   */
  async _onChangeDerived(event) {
    event.preventDefault();
    const value = parseInt(event.currentTarget.value) || 0;
    const derivedId = event.currentTarget.dataset.derived;

    await this.actor.update({
      [`system.derivedAttributes.${derivedId}.value`]: value
    });
  }

  /**
   * Handle skill check roll
   */
  async _onRollSkill(event) {
    event.preventDefault();
    const skillId = event.currentTarget.dataset.skill;
    await this.actor.rollSkillCheck(skillId);
  }

  /**
   * Handle attack roll
   */
  async _onRollAttack(event) {
    event.preventDefault();
    const attackId = event.currentTarget.dataset.attackId;
    await this.actor.rollAttack(attackId);
  }

  /**
   * Handle creature import
   */
  async _onImportCreature(event) {
    event.preventDefault();
    await CreatureImporter.import(this.actor);
  }

  /**
   * Handle item creation - not needed for Verfeinerungen/Abrichtungen
   */
  async _onItemCreate(event) {
    event.preventDefault();
    // Items (refinements/training) are managed directly in actor.system
    // Only weapons can be created, but they come from import
    ui.notifications.warn("Verfeinerungen und Abrichtungen können nur über Import hinzugefügt werden.");
  }

  /**
   * Handle item edit - not needed for Verfeinerungen/Abrichtungen
   */
  async _onItemEdit(event) {
    event.preventDefault();
    // Items are stored in actor.system, not as separate documents
    ui.notifications.warn("Verfeinerungen und Abrichtungen können nur über Re-Import bearbeitet werden.");
  }

  /**
   * Handle item deletion - not needed for Verfeinerungen/Abrichtungen
   */
  async _onItemDelete(event) {
    event.preventDefault();
    // Items are stored in actor.system, not as separate documents
    ui.notifications.warn("Verfeinerungen und Abrichtungen können nur über Re-Import entfernt werden.");
  }

  /**
   * Handle health controls
   */
  async _onHealthControl(event) {
    event.preventDefault();
    const action = event.currentTarget.dataset.action;
    const type = event.currentTarget.dataset.type; // consumed, exhausted

    let newValue = this.actor.system.health[type] || 0;

    if (action === "increase") {
      newValue++;
    } else if (action === "decrease") {
      newValue = Math.max(0, newValue - 1);
    }

    await this.actor.update({
      [`system.health.${type}`]: newValue
    });
  }

  /**
   * Handle focus controls
   */
  async _onFocusControl(event) {
    event.preventDefault();
    const action = event.currentTarget.dataset.action;
    const type = event.currentTarget.dataset.type; // consumed, exhausted

    let newValue = this.actor.system.focus[type] || 0;

    if (action === "increase") {
      newValue++;
    } else if (action === "decrease") {
      newValue = Math.max(0, newValue - 1);
    }

    await this.actor.update({
      [`system.focus.${type}`]: newValue
    });
  }
}
