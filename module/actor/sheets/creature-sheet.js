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
      // Use stored label if available, otherwise try config, then fallback to ID
      let label = skillData.label;

      // Ensure label is always in the correct {short, long} format
      if (typeof label === 'string') {
        // If label is a string (from import), use it as both short and long
        label = { short: label, long: label };
      } else if (label && typeof label === 'object' && label.short && label.long) {
        // Already in correct format, keep it
        label = label;
      } else {
        // Otherwise try to get from config or use ID as fallback
        const configLabel = game.splittermond?.config?.skills?.[skillId];
        if (configLabel && typeof configLabel === 'object' && configLabel.short && configLabel.long) {
          label = configLabel;
        } else if (typeof configLabel === 'string') {
          label = { short: configLabel, long: configLabel };
        } else {
          label = { short: skillId, long: skillId };
        }
      }

      const skill = {
        ...skillData,
        label: label
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
      const skillId = mastery.system.skill || "none";
      if (!context.masteriesBySkill[skillId]) {
        // The mastery-list partial expects label to be a localization key string,
        // not an object with {short, long} properties
        const skillData = context.generalSkills[skillId] ||
                         context.fightingSkills[skillId] ||
                         context.magicSkills[skillId];

        // Use system localization key format, or fall back to stored label text
        let labelKey;
        if (skillData && skillData.label) {
          // If we have a label object with long property, use that text directly
          // Otherwise try to use the system's localization key format
          if (typeof skillData.label === 'object' && skillData.label.long) {
            labelKey = skillData.label.long;
          } else if (typeof skillData.label === 'string') {
            labelKey = skillData.label;
          } else {
            labelKey = `splittermond.skillLabel.${skillId}`;
          }
        } else {
          labelKey = `splittermond.skillLabel.${skillId}`;
        }

        context.masteriesBySkill[skillId] = {
          label: labelKey,
          masteries: []
        };
      }
      context.masteriesBySkill[skillId].masteries.push(mastery);
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

    // Creature info from import
    context.creatureInfo = {
      basis: this.actor.system.creatureInfo?.basis || null,
      rolle: this.actor.system.creatureInfo?.rolle || null,
      verfeinerungen: this.actor.system.creatureInfo?.verfeinerungen || [],
      abrichtungen: this.actor.system.creatureInfo?.abrichtungen || []
    };

    // Group verfeinerungen by category
    const verfeinerungenGrouped = {};
    for (const verf of context.creatureInfo.verfeinerungen) {
      const cat = verf.category || "other";
      if (!verfeinerungenGrouped[cat]) {
        verfeinerungenGrouped[cat] = [];
      }
      verfeinerungenGrouped[cat].push(verf);
    }

    // Convert to array with localization keys (or null if empty)
    const verfeinerungenArray = Object.entries(verfeinerungenGrouped).map(([cat, items]) => ({
      categoryKey: `CREATURE.RefinementCategories.${cat}`,
      items: items
    }));
    context.verfeinerungenByCategory = verfeinerungenArray.length > 0 ? verfeinerungenArray : null;

    // Group abrichtungen by category
    const abrichtungenGrouped = {};
    for (const abr of context.creatureInfo.abrichtungen) {
      const cat = abr.category || "allgemein";
      if (!abrichtungenGrouped[cat]) {
        abrichtungenGrouped[cat] = [];
      }
      abrichtungenGrouped[cat].push(abr);
    }

    // Convert to array with localization keys (or null if empty)
    const abrichtungenArray = Object.entries(abrichtungenGrouped).map(([cat, items]) => ({
      categoryKey: `CREATURE.AbrichtungCategory.${cat}`,
      items: items
    }));
    context.abrichtungenByCategory = abrichtungenArray.length > 0 ? abrichtungenArray : null;

    // Debug logging
    console.log("CreatureSheet context prepared:", {
      hasVerfeinerungen: !!context.verfeinerungenByCategory,
      verfeinerungenCount: context.verfeinerungenByCategory?.length || 0,
      hasAbrichtungen: !!context.abrichtungenByCategory,
      abrichtungenCount: context.abrichtungenByCategory?.length || 0,
      generalSkillsCount: Object.keys(context.generalSkills).length,
      fightingSkillsCount: Object.keys(context.fightingSkills).length,
      magicSkillsCount: Object.keys(context.magicSkills).length
    });

    // Validate all skill labels
    for (const [skillId, skill] of Object.entries(context.generalSkills)) {
      if (!skill.label || typeof skill.label.long !== 'string') {
        console.error(`Invalid label for general skill ${skillId}:`, skill.label);
      }
    }
    for (const [skillId, skill] of Object.entries(context.fightingSkills)) {
      if (!skill.label || typeof skill.label.long !== 'string') {
        console.error(`Invalid label for fighting skill ${skillId}:`, skill.label);
      }
    }
    for (const [skillId, skill] of Object.entries(context.magicSkills)) {
      if (!skill.label || typeof skill.label.long !== 'string') {
        console.error(`Invalid label for magic skill ${skillId}:`, skill.label);
      }
    }

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
