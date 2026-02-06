/**
 * Dialog for assigning unassigned masteries to proper mastery items from compendiums
 */
export class MasteryAssignmentDialog extends Application {

  /**
   * @param {Actor} actor - The creature actor
   * @param {Item} unassignedMastery - The mastery item that needs assignment
   * @param {Object} options - Application options
   * @param {Function} options.onClose - Callback when dialog closes (assigned: boolean)
   * @param {boolean} options.useFuzzyPreselect - Whether to pre-select best fuzzy match
   */
  constructor(actor, unassignedMastery, options = {}) {
    super(options);
    this.actor = actor;
    this.unassignedMastery = unassignedMastery;
    this.selectedSkillId = unassignedMastery.system.skill || null;
    this.masteries = [];
    this.onCloseCallback = options.onClose || null;
    this.useFuzzyPreselect = options.useFuzzyPreselect || false;
    this.preselectedUuid = null;
    this.wasAssigned = false;
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

    // If using fuzzy preselect, find best match and mark it
    if (this.useFuzzyPreselect && this.masteries.length > 0 && !this.preselectedUuid) {
      const fuzzyMatches = await findFuzzyMasteryMatches(
        this.unassignedMastery.name,
        this.selectedSkillId,
        this.unassignedMastery.system.level || 4
      );

      if (fuzzyMatches.length > 0) {
        this.preselectedUuid = fuzzyMatches[0].uuid;
      }
    }

    // Mark preselected mastery
    for (const m of this.masteries) {
      m.isPreselected = m.uuid === this.preselectedUuid;
    }

    return {
      unassignedMastery: this.unassignedMastery,
      masteryName: this.unassignedMastery.name,
      masteryLevel: this.unassignedMastery.system.level || 1,
      availableSkills,
      selectedSkillId: this.selectedSkillId,
      masteries: this.masteries,
      hasMasteries: this.masteries.length > 0,
      noSkillSelected: !this.selectedSkillId,
      hasPreselection: !!this.preselectedUuid
    };
  }

  /**
   * Get all skills grouped by category
   * @returns {Array} Array of skill groups with {category, label, skills} objects
   */
  _getAvailableSkills() {
    const groups = [];

    // General masteries (no skill)
    groups.push({
      category: "none",
      label: game.i18n.localize("CREATURE.MasteryAssignment.NoSkill"),
      skills: [{
        id: "none",
        label: game.i18n.localize("CREATURE.MasteryAssignment.GeneralMasteries"),
        value: 0
      }]
    });

    // General skills
    const generalSkills = CONFIG.splittermond.skillGroups.general.map(skillId => {
      const skill = this.actor.system.skills?.[skillId];
      return {
        id: skillId,
        label: game.i18n.localize(`splittermond.skillLabel.${skillId}`),
        value: skill?.value || 0
      };
    }).sort((a, b) => a.label.localeCompare(b.label));

    groups.push({
      category: "general",
      label: game.i18n.localize("splittermond.generalSkills"),
      skills: generalSkills
    });

    // Fighting skills
    const fightingSkills = CONFIG.splittermond.skillGroups.fighting.map(skillId => {
      const skill = this.actor.system.skills?.[skillId];
      return {
        id: skillId,
        label: game.i18n.localize(`splittermond.skillLabel.${skillId}`),
        value: skill?.value || 0
      };
    }).sort((a, b) => a.label.localeCompare(b.label));

    groups.push({
      category: "fighting",
      label: game.i18n.localize("splittermond.fightingSkills"),
      skills: fightingSkills
    });

    // Magic skills
    const magicSkills = CONFIG.splittermond.skillGroups.magic.map(skillId => {
      const skill = this.actor.system.skills?.[skillId];
      return {
        id: skillId,
        label: game.i18n.localize(`splittermond.skillLabel.${skillId}`),
        value: skill?.value || 0
      };
    }).sort((a, b) => a.label.localeCompare(b.label));

    groups.push({
      category: "magic",
      label: game.i18n.localize("splittermond.magicSkills"),
      skills: magicSkills
    });

    return groups;
  }

  /**
   * Load masteries from compendiums that match the selected skill and max level
   * @param {string} skillId - The skill ID
   * @returns {Array} Array of mastery data objects
   */
  async _loadMasteriesForSkill(skillId) {
    const maxLevel = this.unassignedMastery.system.level || 4;
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

          // Filter by max level (threshold)
          const entryLevel = entry.system?.level || 1;
          if (entryLevel > maxLevel) continue;

          masteries.push({
            uuid: `Compendium.${pack.collection}.${entry._id}`,
            packId: pack.collection,
            id: entry._id,
            name: entry.name,
            level: entryLevel,
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

      // Mark as assigned before closing
      this.wasAssigned = true;

      // Close the dialog
      this.close();

    } catch (err) {
      console.error("MasteryAssignmentDialog: Error assigning mastery:", err);
      ui.notifications.error(game.i18n.format("CREATURE.MasteryAssignment.Error", { error: err.message }));
    }
  }

  /**
   * Override close to call callback
   */
  async close(options = {}) {
    await super.close(options);

    if (this.onCloseCallback) {
      this.onCloseCallback(this.wasAssigned);
    }
  }

  /**
   * Static method to open the dialog
   * @param {Actor} actor - The creature actor
   * @param {Item} unassignedMastery - The mastery item
   * @param {Object} options - Additional options
   * @param {Function} options.onClose - Callback when dialog closes
   * @param {boolean} options.useFuzzyPreselect - Pre-select best fuzzy match
   */
  static async show(actor, unassignedMastery, options = {}) {
    const dialog = new MasteryAssignmentDialog(actor, unassignedMastery, options);
    dialog.render(true);
    return dialog;
  }

  /**
   * Show assignment dialogs sequentially for multiple unassigned masteries
   * @param {Actor} actor - The creature actor
   * @param {Array<Item>} unassignedMasteries - Array of unassigned mastery items
   */
  static async showSequential(actor, unassignedMasteries) {
    if (!unassignedMasteries || unassignedMasteries.length === 0) return;

    let index = 0;

    const showNext = () => {
      if (index >= unassignedMasteries.length) {
        ui.notifications.info(game.i18n.localize("CREATURE.MasteryAssignment.SequenceComplete"));
        return;
      }

      const mastery = unassignedMasteries[index];
      index++;

      // Check if mastery still exists (might have been deleted in previous iteration)
      if (!actor.items.get(mastery.id)) {
        showNext();
        return;
      }

      MasteryAssignmentDialog.show(actor, mastery, {
        useFuzzyPreselect: true,
        onClose: (assigned) => {
          // Small delay to let the UI update
          setTimeout(showNext, 100);
        }
      });
    };

    showNext();
  }
}

/**
 * Calculate fuzzy match score between two strings (0-1, higher is better)
 * @param {string} search - The search term
 * @param {string} target - The target string to match against
 * @returns {number} Score from 0 to 1
 */
function fuzzyScore(search, target) {
  const s = search.toLowerCase().trim();
  const t = target.toLowerCase().trim();

  // Exact match
  if (s === t) return 1.0;

  // Target starts with search (prefix match)
  if (t.startsWith(s)) return 0.9 + (s.length / t.length) * 0.1;

  // Search starts with target (reverse prefix)
  if (s.startsWith(t)) return 0.8;

  // Calculate Levenshtein-based similarity
  const maxLen = Math.max(s.length, t.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(s, t);
  const similarity = 1 - distance / maxLen;

  return similarity * 0.7; // Scale down non-prefix matches
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find best fuzzy matches for a mastery name in compendiums
 * @param {string} name - The mastery name to search for
 * @param {string} skillId - Optional skill ID to filter by
 * @param {number} maxLevel - Maximum mastery level to include
 * @returns {Array} Array of {uuid, name, score} sorted by score descending
 */
export async function findFuzzyMasteryMatches(name, skillId = null, maxLevel = 4) {
  const packs = game.packs.filter(p => p.documentName === "Item");
  const matches = [];

  for (const pack of packs) {
    try {
      const index = await pack.getIndex({ fields: ["system.skill", "system.level"] });

      for (const entry of index) {
        if (entry.type !== "mastery") continue;

        // Filter by skill if specified
        if (skillId && skillId !== "undefined" && skillId !== "none") {
          if (entry.system?.skill !== skillId) continue;
        }

        // Filter by max level
        const entryLevel = entry.system?.level || 1;
        if (entryLevel > maxLevel) continue;

        const score = fuzzyScore(name, entry.name);

        // Only include if score is above threshold
        if (score >= 0.3) {
          matches.push({
            uuid: `Compendium.${pack.collection}.${entry._id}`,
            packId: pack.collection,
            id: entry._id,
            name: entry.name,
            level: entryLevel,
            score
          });
        }
      }
    } catch (err) {
      console.warn(`findFuzzyMasteryMatches: Could not search pack ${pack.collection}:`, err);
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  return matches;
}

/**
 * Try to find a matching mastery in compendiums by name
 * Uses prefix matching but only returns a result if exactly one match is found
 * @param {string} name - The mastery name to search for
 * @param {string} skillId - Optional skill ID to filter by
 * @returns {Object|null} The compendium mastery data or null
 */
export async function findCompendiumMastery(name, skillId = null) {
  const normalizedName = name.toLowerCase().trim();
  const packs = game.packs.filter(p => p.documentName === "Item");
  const matches = [];

  for (const pack of packs) {
    try {
      const index = await pack.getIndex({ fields: ["system.skill", "system.level"] });

      for (const entry of index) {
        if (entry.type !== "mastery") continue;

        const entryName = entry.name.toLowerCase().trim();

        // Check for exact match or prefix match (compendium name starts with import name)
        const isExactMatch = entryName === normalizedName;
        const isPrefixMatch = entryName.startsWith(normalizedName);

        if (isExactMatch || isPrefixMatch) {
          // If skillId is specified, also check skill match
          if (skillId && skillId !== "undefined" && entry.system?.skill !== skillId) continue;

          matches.push({
            pack,
            entry,
            isExactMatch
          });
        }
      }
    } catch (err) {
      console.warn(`findCompendiumMastery: Could not search pack ${pack.collection}:`, err);
    }
  }

  // If we have exactly one exact match, use it
  const exactMatches = matches.filter(m => m.isExactMatch);
  if (exactMatches.length === 1) {
    const { pack, entry } = exactMatches[0];
    const doc = await pack.getDocument(entry._id);
    console.log(`findCompendiumMastery: Exact match for "${name}" -> "${entry.name}"`);
    return doc?.toObject() || null;
  }

  // If no exact match but exactly one prefix match, use it
  if (exactMatches.length === 0 && matches.length === 1) {
    const { pack, entry } = matches[0];
    const doc = await pack.getDocument(entry._id);
    console.log(`findCompendiumMastery: Unique prefix match for "${name}" -> "${entry.name}"`);
    return doc?.toObject() || null;
  }

  // Multiple matches or no matches - don't auto-assign
  if (matches.length > 1) {
    console.log(`findCompendiumMastery: Multiple matches for "${name}" (${matches.length}), skipping auto-assign:`,
      matches.map(m => m.entry.name));
  } else {
    console.log(`findCompendiumMastery: No match found for "${name}"`);
  }

  return null;
}
