import { CreatureImporter } from "../../apps/creature-importer.js";
import { SpellAssignmentDialog } from "../../apps/spell-assignment-dialog.js";
import { MasteryAssignmentDialog } from "../../apps/mastery-assignment-dialog.js";
import CreatureSkill from "../creature-skill.js";
import CreatureDerivedValue from "../creature-derived-value.js";

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
    // Replace actor skills with CreatureSkill instances before getting data
    if (this.actor.skills) {
      [...CONFIG.splittermond.skillGroups.general, ...CONFIG.splittermond.skillGroups.magic].forEach(id => {
        this.actor.skills[id] = new CreatureSkill(this.actor, id);
      });
    }

    // Replace actor derivedValues with CreatureDerivedValue instances
    // This ensures fixed imported values are used without recalculation
    if (this.actor.derivedValues) {
      CONFIG.splittermond.derivedValues.forEach(id => {
        this.actor.derivedValues[id] = new CreatureDerivedValue(this.actor, id);
      });
    }

    const context = await super.getData();

    // Override skill filtering to show all skills with value >= 1 when hideSkills is true
    // Show all skills when hideSkills is false
    context.generalSkills = {};
    CONFIG.splittermond.skillGroups.general.filter(s =>
      !context.hideSkills || (this.actor.skills[s]?.value || 0) >= 1
    ).forEach(skill => {
      context.generalSkills[skill] = this.actor.skills[skill];
    });

    context.magicSkills = {};
    CONFIG.splittermond.skillGroups.magic.filter(s =>
      !context.hideSkills || (this.actor.skills[s]?.value || 0) >= 1
    ).forEach(skill => {
      context.magicSkills[skill] = this.actor.skills[skill];
    });

    context.fightingSkills = {};
    CONFIG.splittermond.skillGroups.fighting.filter(s =>
      !context.hideSkills || (this.actor.skills[s]?.value || 0) >= 1
    ).forEach(skill => {
      context.fightingSkills[skill] = this.actor.skills[skill];
    });

    // Add Handgemenge (melee) skill with value from first npcattack weapon
    const firstAttack = this.actor.items.find(i => i.type === "npcattack");
    if (firstAttack) {
      const meleeValue = firstAttack.system.skillValue || 0;
      // Create a simple skill-like object for display
      context.fightingSkills.melee = {
        id: "melee",
        label: "splittermond.skillLabel.melee",
        value: meleeValue,
        points: meleeValue
      };
    }

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

    // Collect unassigned spells (npcfeature items with isUnassignedSpell flag)
    context.unassignedSpells = this.actor.items.filter(i =>
      i.type === "npcfeature" && i.system.isUnassignedSpell
    );

    // Filter npcfeatures to exclude unassigned spells (for display in header and general tab)
    context.npcFeatures = this.actor.items.filter(i =>
      i.type === "npcfeature" && !i.system.isUnassignedSpell
    );

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

    // Assign unassigned spell
    html.find('.unassigned-spells .taglist-item').click(this._onAssignSpell.bind(this));

    // Assign unassigned mastery
    html.find('.masteries .taglist-item.unassigned-mastery').click(this._onAssignMastery.bind(this));
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

  /**
   * Handle assign unassigned spell
   */
  async _onAssignSpell(event) {
    // Don't trigger if clicking on action buttons
    if (event.target.closest('[data-action]')) return;

    event.preventDefault();
    const li = event.currentTarget.closest("[data-item-id]");
    const itemId = li?.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (item && item.system.isUnassignedSpell) {
      await SpellAssignmentDialog.show(this.actor, item, { useFuzzyPreselect: true });
    }
  }

  /**
   * Handle assign unassigned mastery
   */
  async _onAssignMastery(event) {
    // Don't trigger if clicking on action buttons
    if (event.target.closest('[data-action]')) return;

    event.preventDefault();
    const li = event.currentTarget.closest("[data-item-id]");
    const itemId = li?.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (item && item.system.isUnassignedMastery) {
      await MasteryAssignmentDialog.show(this.actor, item, { useFuzzyPreselect: true });
    }
  }
}
