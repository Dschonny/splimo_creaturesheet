import { CreatureImporter } from "../../apps/creature-importer.js";

// Import the Splittermond base actor sheet
const SplittermondActorSheet = game.splittermond?.apps?.SplittermondActorSheet ||
  (await import("/systems/splittermond/module/actor/sheets/actor-sheet.js")).default;

/**
 * Creature Sheet Application - Extends Splittermond NPC functionality
 */
export class CreatureSheet extends SplittermondActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["splittermond", "sheet", "actor", "npc"],
      template: "modules/splimo_creaturesheet/templates/sheets/creature-sheet.hbs",
      width: 750,
      height: 800,
      tabs: [
        {
          navSelector: ".sheet-navigation[data-group='primary']",
          contentSelector: "main",
          initial: "general"
        },
        {
          navSelector: ".subnav[data-group='fight-action-type']",
          contentSelector: "section div.tab-list",
          initial: "attack"
        }
      ],
      scrollY: [".tab[data-tab='general']", ".tab[data-tab='skills']", ".tab[data-tab='spells']", ".tab[data-tab='inventory']"],
      submitOnClose: false,
      overlays: ["#health", "#focus"]
    });
  }

  /** @override */
  async getData() {
    const context = await super.getData();

    // Override skill filtering to show all skills with value >= 1 when hideSkills is true
    // Show all skills when hideSkills is false
    context.generalSkills = {};
    game.splittermond.config.skillGroups.general.filter(s =>
      !context.hideSkills || (this.actor.skills[s]?.value || 0) >= 1
    ).forEach(skill => {
      context.generalSkills[skill] = this.actor.skills[skill];
    });

    context.magicSkills = {};
    game.splittermond.config.skillGroups.magic.filter(s =>
      !context.hideSkills || (this.actor.skills[s]?.value || 0) >= 1
    ).forEach(skill => {
      context.magicSkills[skill] = this.actor.skills[skill];
    });

    context.fightingSkills = {};
    game.splittermond.config.skillGroups.fighting.filter(s =>
      !context.hideSkills || (this.actor.skills[s]?.value || 0) >= 1
    ).forEach(skill => {
      context.fightingSkills[skill] = this.actor.skills[skill];
    });

    // Add creature-specific info
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

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Import creature
    html.find('.import-creature').click(this._onImportCreature.bind(this));

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
