/**
 * Dialog for assigning unassigned masteries to proper mastery items from compendiums
 */
export class MasteryAssignmentDialog extends Application {

  /**
   * @param {Actor} actor - The creature actor
   * @param {Item} unassignedMastery - The mastery item that needs assignment
   * @param {Object} options - Application options
   */
  constructor(actor, unassignedMastery, options = {}) {
    super(options);
    this.actor = actor;
    this.unassignedMastery = unassignedMastery;
    this.selectedSkillId = unassignedMastery.system.skill || null;
    this.masteries = [];
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "mastery-assignment-dialog",
      classes: ["splittermond", "dialog", "mastery-assignment"],
      template: "modules/splimo_creaturesheet/templates/apps/mastery-assignment-dialog.hbs",
      width: 500,
      height: 500,
      resizable: true,
      title: game.i18n.localize("CREATURE.MasteryAssignment.Title")
    });
  }

  async getData() {
    const availableSkills = this._getAvailableSkills();

    // Pre-select skill if not already set
    if (!this.selectedSkillId && availableSkills.length > 0) {
      this.selectedSkillId = availableSkills[0].id;
    }

    // Load masteries if a skill is selected
    if (this.selectedSkillId) {
      this.masteries = await this._loadMasteriesForSkill(this.selectedSkillId);
    }

    return {
      unassignedMastery: this.unassignedMastery,
      masteryName: this.unassignedMastery.name,
      masteryLevel: this.unassignedMastery.system.level || 1,
      availableSkills,
      selectedSkillId: this.selectedSkillId,
      masteries: this.masteries,
      hasMasteries: this.masteries.length > 0,
      noSkillSelected: !this.selectedSkillId
    };
  }

  /**
   * Get skills that the creature has (value > 0)
   * @returns {Array} Array of {id, label, value} objects
   */
  _getAvailableSkills() {
    const skills = [];
    const allSkills = [
      ...CONFIG.splittermond.skillGroups.general,
      ...CONFIG.splittermond.skillGroups.fighting,
      ...CONFIG.splittermond.skillGroups.magic
    ];

    for (const skillId of allSkills) {
      const skill = this.actor.system.skills?.[skillId];
      const value = skill?.value || 0;
      if (value > 0) {
        skills.push({
          id: skillId,
          label: game.i18n.localize(`splittermond.skillLabel.${skillId}`),
          value: value
        });
      }
    }

    // Also add "none" option for general masteries
    skills.unshift({
      id: "none",
      label: game.i18n.localize("CREATURE.MasteryAssignment.GeneralMasteries"),
      value: 0
    });

    return skills;
  }

  /**
   * Load masteries from compendiums that match the selected skill
   * @param {string} skillId - The skill ID
   * @returns {Array} Array of mastery data objects
   */
  async _loadMasteriesForSkill(skillId) {
    const masteries = [];

    // Get all item compendiums
    const packs = game.packs.filter(p => p.documentName === "Item");

    for (const pack of packs) {
      try {
        const index = await pack.getIndex({ fields: ["system.skill", "system.level", "system.description"] });

        for (const entry of index) {
          // Only include mastery items
          if (entry.type !== "mastery") continue;

          // Filter by skill ID (or "none" for general masteries)
          const entrySkill = entry.system?.skill || "none";
          if (entrySkill !== skillId) continue;

          masteries.push({
            uuid: `Compendium.${pack.collection}.${entry._id}`,
            packId: pack.collection,
            id: entry._id,
            name: entry.name,
            level: entry.system?.level || 1,
            description: entry.system?.description || ""
          });
        }
      } catch (err) {
        console.warn(`MasteryAssignmentDialog: Could not index pack ${pack.collection}:`, err);
      }
    }

    // Sort by name
    masteries.sort((a, b) => a.name.localeCompare(b.name));

    return masteries;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Skill selection change
    html.find('.skill-select').change(this._onSkillChange.bind(this));

    // Mastery click
    html.find('.mastery-list-item').click(this._onMasteryClick.bind(this));
  }

  /**
   * Handle skill selection change
   */
  async _onSkillChange(event) {
    this.selectedSkillId = event.currentTarget.value || null;
    this.render(true);
  }

  /**
   * Handle mastery click - assign the mastery
   */
  async _onMasteryClick(event) {
    const uuid = event.currentTarget.dataset.uuid;
    if (!uuid) return;

    await this._assignMastery(uuid);
  }

  /**
   * Assign a mastery from the compendium to the actor
   * @param {string} uuid - Compendium UUID of the mastery
   */
  async _assignMastery(uuid) {
    try {
      // Get the mastery document from compendium
      const masteryDoc = await fromUuid(uuid);
      if (!masteryDoc) {
        ui.notifications.error(game.i18n.localize("CREATURE.MasteryAssignment.MasteryNotFound"));
        return;
      }

      // Create the mastery item on the actor
      const masteryData = masteryDoc.toObject();
      await this.actor.createEmbeddedDocuments("Item", [masteryData]);

      // Delete the unassigned mastery
      await this.unassignedMastery.delete();

      // Show success notification
      ui.notifications.info(game.i18n.format("CREATURE.MasteryAssignment.Success", { name: masteryData.name }));

      // Close the dialog
      this.close();

    } catch (err) {
      console.error("MasteryAssignmentDialog: Error assigning mastery:", err);
      ui.notifications.error(game.i18n.format("CREATURE.MasteryAssignment.Error", { error: err.message }));
    }
  }

  /**
   * Static method to open the dialog
   * @param {Actor} actor - The creature actor
   * @param {Item} unassignedMastery - The mastery item
   */
  static async show(actor, unassignedMastery) {
    const dialog = new MasteryAssignmentDialog(actor, unassignedMastery);
    dialog.render(true);
    return dialog;
  }
}

/**
 * Try to find a matching mastery in compendiums by name
 * @param {string} name - The mastery name to search for
 * @param {string} skillId - Optional skill ID to filter by
 * @returns {Object|null} The compendium mastery data or null
 */
export async function findCompendiumMastery(name, skillId = null) {
  const normalizedName = name.toLowerCase().trim();
  const packs = game.packs.filter(p => p.documentName === "Item");

  for (const pack of packs) {
    try {
      const index = await pack.getIndex({ fields: ["system.skill", "system.level"] });

      for (const entry of index) {
        if (entry.type !== "mastery") continue;

        // Check name match (case-insensitive)
        if (entry.name.toLowerCase().trim() === normalizedName) {
          // If skillId is specified, also check skill match
          if (skillId && entry.system?.skill !== skillId) continue;

          // Get the full document
          const doc = await pack.getDocument(entry._id);
          return doc?.toObject() || null;
        }
      }
    } catch (err) {
      console.warn(`findCompendiumMastery: Could not search pack ${pack.collection}:`, err);
    }
  }

  return null;
}
