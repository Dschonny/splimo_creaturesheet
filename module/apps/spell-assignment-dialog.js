import { CreatureDataMapper } from "../util/creature-data-mapper.js";

/**
 * Calculate fuzzy match score between two strings (0-1, higher is better)
 */
function fuzzyScore(search, target) {
  const s = search.toLowerCase().trim();
  const t = target.toLowerCase().trim();

  if (s === t) return 1.0;
  if (t.startsWith(s)) return 0.9 + (s.length / t.length) * 0.1;
  if (s.startsWith(t)) return 0.8;

  const maxLen = Math.max(s.length, t.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(s, t);
  const similarity = 1 - distance / maxLen;

  return similarity * 0.7;
}

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Parse availableIn string to check if skill is available and get its grade
 * @param {string} availableIn - String like "motionmagic 0 , windmagic 0"
 * @param {string} skillId - The skill to check for
 * @returns {Object|null} {matched: true, grade: number} or null
 */
function parseAvailableIn(availableIn, skillId) {
  if (!availableIn || typeof availableIn !== 'string') return null;

  const entries = availableIn.split(',').map(s => s.trim());
  for (const e of entries) {
    const parts = e.split(/\s+/);
    if (parts.length >= 1 && parts[0] === skillId) {
      return {
        matched: true,
        grade: parts.length >= 2 ? (parseInt(parts[1]) || 0) : 0
      };
    }
  }
  return null;
}

/**
 * Find best fuzzy matches for a spell name in compendiums
 */
export async function findFuzzySpellMatches(name, skillId = null, maxGrade = 5) {
  const packs = game.packs.filter(p => p.documentName === "Item");
  const matches = [];

  for (const pack of packs) {
    try {
      const index = await pack.getIndex({ fields: ["system.skill", "system.skillLevel", "system.schoolGrade", "system.availableIn"] });

      for (const entry of index) {
        if (entry.type !== "spell") continue;

        // Check skill match (primary skill or via availableIn)
        let spellGrade;
        if (skillId) {
          const availableInMatch = parseAvailableIn(entry.system?.availableIn, skillId);
          if (entry.system?.skill === skillId) {
            spellGrade = parseInt(entry.system?.skillLevel ?? entry.system?.schoolGrade) || 0;
          } else if (availableInMatch) {
            spellGrade = availableInMatch.grade;
          } else {
            continue; // Doesn't match this skill
          }
        } else {
          spellGrade = parseInt(entry.system?.skillLevel ?? entry.system?.schoolGrade) || 0;
        }

        if (spellGrade > maxGrade) continue;

        const score = fuzzyScore(name, entry.name);

        if (score >= 0.3) {
          matches.push({
            uuid: `Compendium.${pack.collection}.${entry._id}`,
            packId: pack.collection,
            id: entry._id,
            name: entry.name,
            grade: spellGrade,
            skillId: entry.system?.skill,
            score
          });
        }
      }
    } catch (err) {
      console.warn(`findFuzzySpellMatches: Could not search pack ${pack.collection}:`, err);
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches;
}

/**
 * Try to find a matching spell in compendiums by name
 * Uses prefix matching but only returns a result if exactly one match is found
 */
export async function findCompendiumSpell(name, skillId = null) {
  const normalizedName = name.toLowerCase().trim();
  const packs = game.packs.filter(p => p.documentName === "Item");
  const matches = [];

  for (const pack of packs) {
    try {
      const index = await pack.getIndex({ fields: ["system.skill", "system.skillLevel", "system.schoolGrade"] });

      for (const entry of index) {
        if (entry.type !== "spell") continue;

        const entryName = entry.name.toLowerCase().trim();
        const isExactMatch = entryName === normalizedName;
        const isPrefixMatch = entryName.startsWith(normalizedName);

        if (isExactMatch || isPrefixMatch) {
          if (skillId && entry.system?.skill !== skillId) continue;

          matches.push({
            pack,
            entry,
            isExactMatch
          });
        }
      }
    } catch (err) {
      console.warn(`findCompendiumSpell: Could not search pack ${pack.collection}:`, err);
    }
  }

  const exactMatches = matches.filter(m => m.isExactMatch);
  if (exactMatches.length === 1) {
    const { pack, entry } = exactMatches[0];
    const doc = await pack.getDocument(entry._id);
    console.log(`findCompendiumSpell: Exact match for "${name}" -> "${entry.name}"`);
    return doc?.toObject() || null;
  }

  if (exactMatches.length === 0 && matches.length === 1) {
    const { pack, entry } = matches[0];
    const doc = await pack.getDocument(entry._id);
    console.log(`findCompendiumSpell: Unique prefix match for "${name}" -> "${entry.name}"`);
    return doc?.toObject() || null;
  }

  if (matches.length > 1) {
    console.log(`findCompendiumSpell: Multiple matches for "${name}" (${matches.length}), skipping auto-assign:`,
      matches.map(m => m.entry.name));
  } else {
    console.log(`findCompendiumSpell: No match found for "${name}"`);
  }

  return null;
}

/**
 * Dialog for assigning unassigned spells to proper spell items from compendiums
 */
export class SpellAssignmentDialog extends Application {

  /**
   * @param {Actor} actor - The creature actor
   * @param {Item} unassignedSpell - The npcfeature item representing the unassigned spell
   * @param {Object} options - Application options
   * @param {Function} options.onClose - Callback when dialog closes (result: "assigned"|"skipped"|"cancelled")
   * @param {boolean} options.useFuzzyPreselect - Whether to pre-select best fuzzy match
   * @param {boolean} options.isSequential - Whether this is part of a sequential assignment
   */
  constructor(actor, unassignedSpell, options = {}) {
    super(options);
    this.actor = actor;
    this.unassignedSpell = unassignedSpell;
    this.selectedSkillId = null;
    this.spells = [];
    this.onCloseCallback = options.onClose || null;
    this.useFuzzyPreselect = options.useFuzzyPreselect || false;
    this.isSequential = options.isSequential || false;
    this.preselectedUuid = null;
    this.selectedUuid = null;
    this.closeResult = "cancelled";
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

    // If using fuzzy preselect and no valid skill selected, find best matching skill
    if (this.useFuzzyPreselect && !this.selectedSkillId) {
      const bestMatch = await this._findBestMatchingSkill(this.unassignedSpell.name);
      if (bestMatch) {
        this.selectedSkillId = bestMatch.skillId;
        this.preselectedUuid = bestMatch.uuid;
      }
    }

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

    // If using fuzzy preselect but no preselectedUuid yet, find best match in current skill
    if (this.useFuzzyPreselect && this.spells.length > 0 && !this.preselectedUuid) {
      const rawGrade = this.unassignedSpell.system.spellGrade;
      const maxGrade = (rawGrade !== undefined && rawGrade !== null && rawGrade !== "") ? parseInt(rawGrade) : 5;
      const fuzzyMatches = await findFuzzySpellMatches(
        this.unassignedSpell.name,
        this.selectedSkillId,
        maxGrade
      );

      if (fuzzyMatches.length > 0) {
        this.preselectedUuid = fuzzyMatches[0].uuid;
      }
    }

    // Auto-select preselected spell if nothing selected yet
    if (this.preselectedUuid && !this.selectedUuid) {
      this.selectedUuid = this.preselectedUuid;
    }

    // Mark preselected and selected spells
    for (const s of this.spells) {
      s.isPreselected = s.uuid === this.preselectedUuid;
      s.isSelected = s.uuid === this.selectedUuid;
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
      noSchoolSelected: !this.selectedSkillId,
      hasPreselection: !!this.preselectedUuid,
      selectedUuid: this.selectedUuid,
      isSequential: this.isSequential
    };
  }

  /**
   * Find the best matching skill for a spell name by searching all compendiums
   */
  async _findBestMatchingSkill(name) {
    const rawGrade = this.unassignedSpell.system.spellGrade;
    const maxGrade = (rawGrade !== undefined && rawGrade !== null && rawGrade !== "") ? parseInt(rawGrade) : 5;
    const packs = game.packs.filter(p => p.documentName === "Item");
    const matches = [];

    for (const pack of packs) {
      try {
        const index = await pack.getIndex({ fields: ["system.skill", "system.skillLevel", "system.schoolGrade", "system.availableIn"] });

        for (const entry of index) {
          if (entry.type !== "spell") continue;

          const score = fuzzyScore(name, entry.name);
          if (score < 0.5) continue;

          // Parse availableIn to get all skills this spell is available in
          const availableIn = entry.system?.availableIn;
          const skillsToCheck = [];

          // Add primary skill
          const primarySkill = entry.system?.skill;
          const primaryGrade = parseInt(entry.system?.skillLevel ?? entry.system?.schoolGrade) || 0;
          if (primarySkill && primaryGrade <= maxGrade) {
            skillsToCheck.push({ skillId: primarySkill, grade: primaryGrade });
          }

          // Parse availableIn string for additional skills
          if (availableIn && typeof availableIn === 'string') {
            const entries = availableIn.split(',').map(s => s.trim());
            for (const e of entries) {
              const parts = e.split(/\s+/);
              if (parts.length >= 1) {
                const skillId = parts[0];
                const grade = parts.length >= 2 ? (parseInt(parts[1]) || 0) : 0;
                if (grade <= maxGrade && !skillsToCheck.some(s => s.skillId === skillId)) {
                  skillsToCheck.push({ skillId, grade });
                }
              }
            }
          }

          // Add a match for each skill
          for (const { skillId, grade } of skillsToCheck) {
            const skillLabel = skillId
              ? game.i18n.localize(`splittermond.skillLabel.${skillId}`)
              : "";

            matches.push({
              skillId,
              skillLabel,
              uuid: `Compendium.${pack.collection}.${entry._id}`,
              name: entry.name,
              grade,
              score
            });
          }
        }
      } catch (err) {
        console.warn(`_findBestMatchingSkill: Could not search pack ${pack.collection}:`, err);
      }
    }

    if (matches.length === 0) return null;

    // Sort by score descending, then by skill label alphabetically
    matches.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.skillLabel.localeCompare(b.skillLabel);
    });

    const bestMatch = matches[0];
    console.log(`SpellAssignment._findBestMatchingSkill: Best match for "${name}" -> "${bestMatch.name}" (skill: ${bestMatch.skillId}, score: ${bestMatch.score.toFixed(2)})`);

    return bestMatch;
  }

  /**
   * Get magic schools that the creature has (value > 0)
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
   */
  _mapSchoolToSkill(schoolName) {
    if (!schoolName) return null;
    const normalized = schoolName.toLowerCase().trim();
    return CreatureDataMapper.MAGIC_SCHOOL_TO_SKILL[normalized] || null;
  }

  /**
   * Load spells from compendiums that match the selected skill and max grade
   */
  async _loadSpellsForSkill(skillId) {
    const rawGrade = this.unassignedSpell.system.spellGrade;
    const maxGrade = (rawGrade !== undefined && rawGrade !== null && rawGrade !== "")
      ? parseInt(rawGrade)
      : 5;
    const spells = [];

    console.log(`_loadSpellsForSkill: Loading spells for skill "${skillId}", maxGrade: ${maxGrade}`);

    const packs = game.packs.filter(p => p.documentName === "Item");

    for (const pack of packs) {
      try {
        // Request multiple possible field names for spell grade and multi-school availability
        const index = await pack.getIndex({
          fields: ["system.skill", "system.skillLevel", "system.schoolGrade", "system.costs", "system.difficulty", "system.enhancementCosts", "system.availableIn", "system.skills"]
        });

        let spellCount = 0;
        let matchCount = 0;

        for (const entry of index) {
          if (entry.type !== "spell") continue;
          spellCount++;

          // Debug: Log first few spells to see their full structure
          if (spellCount <= 3) {
            console.log(`Sample spell from ${pack.collection}:`, entry.name);
            console.log(`  - system keys:`, Object.keys(entry.system || {}));
            console.log(`  - system.skill:`, entry.system?.skill);
            console.log(`  - system.availableIn:`, entry.system?.availableIn);
            console.log(`  - system.skills:`, entry.system?.skills);
            console.log(`  - full system:`, JSON.stringify(entry.system, null, 2));
          }

          // Check if spell matches the skill - either as primary skill or in availableIn string
          const primarySkill = entry.system?.skill;
          const availableIn = entry.system?.availableIn; // string like "motionmagic 0 , windmagic 0"

          let matchesSkill = primarySkill === skillId;
          let gradeFromAvailableIn = null;

          // Check availableIn string (format: "skillId grade , skillId grade , ...")
          if (!matchesSkill && availableIn && typeof availableIn === 'string') {
            // Split by comma and check each entry
            const entries = availableIn.split(',').map(s => s.trim());
            for (const e of entries) {
              // Parse "skillId grade" format
              const parts = e.split(/\s+/);
              if (parts.length >= 1 && parts[0] === skillId) {
                matchesSkill = true;
                // Extract grade if present
                if (parts.length >= 2) {
                  gradeFromAvailableIn = parseInt(parts[1]) || 0;
                }
                break;
              }
            }
          }

          if (!matchesSkill) continue;
          matchCount++;

          // Use grade from availableIn if matched that way, otherwise use skillLevel
          let spellGrade;
          if (gradeFromAvailableIn !== null) {
            spellGrade = gradeFromAvailableIn;
          } else {
            const gradeValue = entry.system?.skillLevel ?? entry.system?.schoolGrade ?? 0;
            spellGrade = parseInt(gradeValue) || 0;
          }

          console.log(`Found spell "${entry.name}" with grade ${spellGrade} (maxGrade: ${maxGrade}, fromAvailableIn: ${gradeFromAvailableIn !== null})`);

          if (spellGrade > maxGrade) continue;

          spells.push({
            uuid: `Compendium.${pack.collection}.${entry._id}`,
            packId: pack.collection,
            id: entry._id,
            name: entry.name,
            grade: spellGrade,
            costs: entry.system?.costs || entry.system?.enhancementCosts || "",
            difficulty: entry.system?.difficulty || ""
          });
        }

        console.log(`Pack ${pack.collection}: ${spellCount} spells total, ${matchCount} match skill "${skillId}"`);
      } catch (err) {
        console.warn(`SpellAssignmentDialog: Could not index pack ${pack.collection}:`, err);
      }
    }

    console.log(`_loadSpellsForSkill: Found ${spells.length} spells for skill "${skillId}"`);
    spells.sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name));
    return spells;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('.school-select').change(this._onSchoolChange.bind(this));
    html.find('.spell-list-item').click(this._onSpellClick.bind(this));
    html.find('.confirm-btn').click(this._onConfirm.bind(this));
    html.find('.skip-btn').click(this._onSkip.bind(this));

    this._scrollToSelected(html);
  }

  _scrollToSelected(html) {
    const selectedItem = html.find('.spell-list-item.selected')[0];
    if (selectedItem) {
      setTimeout(() => {
        selectedItem.scrollIntoView({ block: 'center', behavior: 'instant' });
      }, 50);
    }
  }

  async _onSchoolChange(event) {
    this.selectedSkillId = event.currentTarget.value || null;
    this.selectedUuid = null;
    this.preselectedUuid = null;
    this.render(true);
  }

  _onSpellClick(event) {
    const uuid = event.currentTarget.dataset.uuid;
    if (!uuid) return;

    this.selectedUuid = uuid;
    this.render(true);
  }

  async _onConfirm(event) {
    event.preventDefault();
    if (!this.selectedUuid) return;

    await this._assignSpell(this.selectedUuid);
  }

  _onSkip(event) {
    event.preventDefault();
    this.closeResult = "skipped";
    this.close();
  }

  async _assignSpell(uuid) {
    try {
      const spellDoc = await fromUuid(uuid);
      if (!spellDoc) {
        ui.notifications.error(game.i18n.localize("CREATURE.SpellAssignment.SpellNotFound"));
        return;
      }

      const spellData = spellDoc.toObject();
      await this.actor.createEmbeddedDocuments("Item", [spellData]);
      await this.unassignedSpell.delete();

      ui.notifications.info(game.i18n.format("CREATURE.SpellAssignment.Success", { name: spellData.name }));

      this.closeResult = "assigned";
      this.close();

    } catch (err) {
      console.error("SpellAssignmentDialog: Error assigning spell:", err);
      ui.notifications.error(game.i18n.format("CREATURE.SpellAssignment.Error", { error: err.message }));
    }
  }

  async close(options = {}) {
    await super.close(options);

    if (this.onCloseCallback) {
      this.onCloseCallback(this.closeResult);
    }
  }

  /**
   * Static method to open the dialog
   */
  static async show(actor, unassignedSpell, options = {}) {
    const dialog = new SpellAssignmentDialog(actor, unassignedSpell, options);
    dialog.render(true);
    return dialog;
  }

  /**
   * Show assignment dialogs sequentially for multiple unassigned spells
   */
  static async showSequential(actor, unassignedSpells) {
    if (!unassignedSpells || unassignedSpells.length === 0) return;

    let index = 0;

    const showNext = () => {
      if (index >= unassignedSpells.length) {
        ui.notifications.info(game.i18n.localize("CREATURE.SpellAssignment.SequenceComplete"));
        return;
      }

      const spell = unassignedSpells[index];
      index++;

      if (!actor.items.get(spell.id)) {
        showNext();
        return;
      }

      SpellAssignmentDialog.show(actor, spell, {
        useFuzzyPreselect: true,
        isSequential: true,
        onClose: (result) => {
          if (result === "assigned" || result === "skipped") {
            setTimeout(showNext, 100);
          } else {
            ui.notifications.info(game.i18n.localize("CREATURE.SpellAssignment.SequenceAborted"));
          }
        }
      });
    };

    showNext();
  }
}
