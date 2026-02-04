import { CreatureImporter } from "../../apps/creature-importer.js";

/**
 * Creature Sheet Application - Extends NPC functionality
 */
export class CreatureSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["splittermond", "sheet", "actor", "npc"],
      template: "modules/splimo_creaturesheet/templates/sheets/creature-sheet.hbs",
      width: 750,
      height: 800,
      tabs: [{
        navSelector: ".sheet-navigation",
        contentSelector: "main",
        initial: "general"
      }]
    });
  }

  /** @override */
  getData() {
    const context = super.getData();

    // Organize items by type
    context.itemsByType = {};
    for (const item of this.actor.items) {
      const type = item.type;
      if (!context.itemsByType[type]) {
        context.itemsByType[type] = [];
      }
      context.itemsByType[type].push(item);
    }

    // Organize skills
    const skills = this.actor.system.skills || {};
    context.generalSkills = {};
    context.fightingSkills = {};
    context.magicSkills = {};

    const generalSkillIds = [
      "acrobatics", "athletics", "determination", "stealth", "perception",
      "endurance", "swim", "hunting", "empathy", "dexterity", "performance"
    ];

    const fightingSkillIds = ["melee", "ranged"];

    const magicSkillIds = ["spellcasting"];

    for (const [skillId, skillData] of Object.entries(skills)) {
      const skillLabel = game.splittermond?.config?.skills?.[skillId] || { short: skillId, long: skillId };
      const skill = {
        ...skillData,
        label: skillLabel
      };

      if (generalSkillIds.includes(skillId)) {
        context.generalSkills[skillId] = skill;
      } else if (fightingSkillIds.includes(skillId)) {
        context.fightingSkills[skillId] = skill;
      } else if (magicSkillIds.includes(skillId)) {
        context.magicSkills[skillId] = skill;
      }
    }

    // Organize masteries by skill
    context.masteriesBySkill = {};
    const masteries = context.itemsByType.mastery || [];
    for (const mastery of masteries) {
      const skillId = mastery.system.skill || "general";
      if (!context.masteriesBySkill[skillId]) {
        context.masteriesBySkill[skillId] = [];
      }
      context.masteriesBySkill[skillId].push(mastery);
    }

    // Organize spells by skill
    context.spellsBySkill = {};
    const spells = context.itemsByType.spell || [];
    for (const spell of spells) {
      const skillId = spell.system.skill || "magic";
      if (!context.spellsBySkill[skillId]) {
        context.spellsBySkill[skillId] = [];
      }
      context.spellsBySkill[skillId].push(spell);
    }

    // Hide skills flag
    context.hideSkills = this.actor.getFlag("splimo_creaturesheet", "hideSkills") || false;

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Import creature
    html.find('.import-creature').click(this._onImportCreature.bind(this));

    // Show/hide skills
    html.find('[data-action="show-hide-skills"]').click(this._onToggleSkills.bind(this));

    // Add item
    html.find('[data-action="add-item"]').click(this._onAddItem.bind(this));

    // Edit item
    html.find('[data-action="edit-item"]').click(this._onEditItem.bind(this));

    // Delete item
    html.find('[data-action="delete-item"]').click(this._onDeleteItem.bind(this));
  }

  /**
   * Handle creature import
   */
  async _onImportCreature(event) {
    event.preventDefault();
    await CreatureImporter.import(this.actor);
  }

  /**
   * Handle show/hide skills toggle
   */
  async _onToggleSkills(event) {
    event.preventDefault();
    const current = this.actor.getFlag("splimo_creaturesheet", "hideSkills") || false;
    await this.actor.setFlag("splimo_creaturesheet", "hideSkills", !current);
  }

  /**
   * Handle add item
   */
  async _onAddItem(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const itemType = button.dataset.itemType || "npcfeature";

    const itemData = {
      name: game.i18n.localize(`TYPES.Item.${itemType}`),
      type: itemType
    };

    await this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /**
   * Handle edit item
   */
  _onEditItem(event) {
    event.preventDefault();
    const li = event.currentTarget.closest("[data-item-id]");
    const itemId = li.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (item) {
      item.sheet.render(true);
    }
  }

  /**
   * Handle delete item
   */
  async _onDeleteItem(event) {
    event.preventDefault();
    const li = event.currentTarget.closest("[data-item-id]");
    const itemId = li.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (item) {
      const confirmed = await Dialog.confirm({
        title: game.i18n.localize("CREATURE.DeleteItem"),
        content: `<p>${game.i18n.format("CREATURE.DeleteItemConfirm", { name: item.name })}</p>`
      });

      if (confirmed) {
        await item.delete();
      }
    }
  }
}
