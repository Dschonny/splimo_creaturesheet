import { CreatureDataMapper } from "../util/creature-data-mapper.js";

/**
 * Dialog for assigning unassigned spells to proper spell items from compendiums
 */
export class SpellAssignmentDialog extends Application {

  /**
   * @param {Actor} actor - The creature actor
   * @param {Item} unassignedSpell - The npcfeature item representing the unassigned spell
   * @param {Object} options - Application options
   */
  constructor(actor, unassignedSpell, options = {}) {
    super(options);
    this.actor = actor;
    this.unassignedSpell = unassignedSpell;
    this.selectedSkillId = null;
    this.spells = [];
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "spell-assignment-dialog",
      classes: ["splittermond", "dialog", "spell-assignment"],
      template: "modules/splimo_creaturesheet/templates/apps/spell-assignment-dialog.hbs",
      width: 500,
      height: 500,
      resizable: true,
      title: game.i18n.localize("CREATURE.SpellAssignment.Title")
    });
  }

  async getData() {
    const availableSchools = this._getAvailableMagicSchools();

    // Pre-select school based on unassigned spell's spellSchool field
    if (!this.selectedSkillId && this.unassignedSpell.system.spellSchool) {
      const preselectedSkill = this._mapSchoolToSkill(this.unassignedSpell.system.spellSchool);
      if (preselectedSkill && availableSchools.find(s => s.id === preselectedSkill)) {
        this.selectedSkillId = preselectedSkill;
      }
    }

    // Load spells if a school is selected
    if (this.selectedSkillId) {
      this.spells = await this._loadSpellsForSkill(this.selectedSkillId);
    }

    return {
      unassignedSpell: this.unassignedSpell,
      spellName: this.unassignedSpell.name,
      spellGrade: this.unassignedSpell.system.spellGrade || 0,
      spellSchool: this.unassignedSpell.system.spellSchool || "",
      availableSchools,
      selectedSkillId: this.selectedSkillId,
      spells: this.spells,
      hasSpells: this.spells.length > 0,
      noSchoolSelected: !this.selectedSkillId
    };
  }

  /**
   * Get magic schools that the creature has (value > 0)
   * @returns {Array} Array of {id, label, value} objects
   */
  _getAvailableMagicSchools() {
    const schools = [];
    const magicSkills = CONFIG.splittermond.skillGroups.magic || [];

    for (const skillId of magicSkills) {
      const skill = this.actor.system.skills?.[skillId];
      const value = skill?.value || 0;
      if (value > 0) {
        schools.push({
          id: skillId,
          label: game.i18n.localize(`splittermond.skillLabel.${skillId}`),
          value: value
        });
      }
    }

    return schools;
  }

  /**
   * Map a German magic school name to Splittermond skill ID
   * @param {string} schoolName - German magic school name
   * @returns {string|null} Skill ID or null
   */
  _mapSchoolToSkill(schoolName) {
    if (!schoolName) return null;
    const normalized = schoolName.toLowerCase().trim();
    return CreatureDataMapper.MAGIC_SCHOOL_TO_SKILL[normalized] || null;
  }

  /**
   * Load spells from compendiums that match the selected skill and max grade
   * @param {string} skillId - The magic skill ID
   * @returns {Array} Array of spell data objects
   */
  async _loadSpellsForSkill(skillId) {
    const maxGrade = this.unassignedSpell.system.spellGrade || 5;
    const spells = [];

    // Get all spell compendiums
    const packs = game.packs.filter(p => p.documentName === "Item");

    for (const pack of packs) {
      try {
        const index = await pack.getIndex({ fields: ["system.skill", "system.skillLevel", "system.costs", "system.difficulty"] });

        for (const entry of index) {
          // Only include spell items
          if (entry.type !== "spell") continue;

          // Filter by skill ID
          if (entry.system?.skill !== skillId) continue;

          // Filter by max grade (skillLevel <= unassigned spell's grade)
          const spellGrade = entry.system?.skillLevel || 0;
          if (spellGrade > maxGrade) continue;

          spells.push({
            uuid: `Compendium.${pack.collection}.${entry._id}`,
            packId: pack.collection,
            id: entry._id,
            name: entry.name,
            grade: spellGrade,
            costs: entry.system?.costs || "",
            difficulty: entry.system?.difficulty || ""
          });
        }
      } catch (err) {
        console.warn(`SpellAssignmentDialog: Could not index pack ${pack.collection}:`, err);
      }
    }

    // Sort by name
    spells.sort((a, b) => a.name.localeCompare(b.name));

    return spells;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // School selection change
    html.find('.school-select').change(this._onSchoolChange.bind(this));

    // Spell click
    html.find('.spell-list-item').click(this._onSpellClick.bind(this));
  }

  /**
   * Handle school selection change
   */
  async _onSchoolChange(event) {
    this.selectedSkillId = event.currentTarget.value || null;
    this.render(true);
  }

  /**
   * Handle spell click - assign the spell
   */
  async _onSpellClick(event) {
    const uuid = event.currentTarget.dataset.uuid;
    if (!uuid) return;

    await this._assignSpell(uuid);
  }

  /**
   * Assign a spell from the compendium to the actor
   * @param {string} uuid - Compendium UUID of the spell
   */
  async _assignSpell(uuid) {
    try {
      // Get the spell document from compendium
      const spellDoc = await fromUuid(uuid);
      if (!spellDoc) {
        ui.notifications.error(game.i18n.localize("CREATURE.SpellAssignment.SpellNotFound"));
        return;
      }

      // Create the spell item on the actor
      const spellData = spellDoc.toObject();
      await this.actor.createEmbeddedDocuments("Item", [spellData]);

      // Delete the npcfeature (unassigned spell)
      await this.unassignedSpell.delete();

      // Show success notification
      ui.notifications.info(game.i18n.format("CREATURE.SpellAssignment.Success", { name: spellData.name }));

      // Close the dialog
      this.close();

    } catch (err) {
      console.error("SpellAssignmentDialog: Error assigning spell:", err);
      ui.notifications.error(game.i18n.format("CREATURE.SpellAssignment.Error", { error: err.message }));
    }
  }

  /**
   * Static method to open the dialog
   * @param {Actor} actor - The creature actor
   * @param {Item} unassignedSpell - The npcfeature item
   */
  static async show(actor, unassignedSpell) {
    const dialog = new SpellAssignmentDialog(actor, unassignedSpell);
    dialog.render(true);
    return dialog;
  }
}
