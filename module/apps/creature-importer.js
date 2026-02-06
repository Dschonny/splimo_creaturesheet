import { CreatureDataMapper } from "../util/creature-data-mapper.js";
import { findCompendiumMastery, MasteryAssignmentDialog } from "./mastery-assignment-dialog.js";

/**
 * Handles importing VTT Import JSON files into creature actors
 */
export class CreatureImporter {

  /**
   * Import a creature from a VTT Import JSON file
   * @param {Actor} actor - Optional existing actor to update
   */
  static async import(actor = null) {
    // Show file picker
    const file = await this._showFileDialog();
    if (!file) return;

    try {
      // Read and parse file
      const content = await this._readFile(file);
      console.log("File content read, length:", content?.length);

      const jsonData = JSON.parse(content);
      console.log("Parsed VTT Import JSON:", jsonData);

      // Validate format
      const validation = CreatureDataMapper.validateJsonFormat(jsonData);
      if (!validation.valid) {
        console.error("Validation failed:", validation.error);
        ui.notifications.error(game.i18n.format("CREATURE.ImportError", { error: validation.error }));
        return;
      }

      // Map to actor data
      const { actorData, items } = CreatureDataMapper.mapJsonToActorData(jsonData);

      // Try to match masteries with compendium items
      await this._matchMasteriesWithCompendium(items);

      // Show confirmation dialog with counts from JSON data
      const unassignedMasteryCount = items.filter(i => i.type === "mastery" && i.system.isUnassignedMastery).length;
      const counts = {
        features: items.filter(i => i.type === "npcfeature" && !i.system.isUnassignedSpell).length,
        weapons: items.filter(i => i.type === "npcattack").length,
        masteries: items.filter(i => i.type === "mastery").length,
        spells: items.filter(i => i.type === "npcfeature" && i.system.isUnassignedSpell).length,
        skills: jsonData.skills?.length || 0,
        magicSchools: jsonData.magicSchools?.length || 0,
        refinements: jsonData.verfeinerungen?.length || 0,
        training: jsonData.abrichtungen?.length || 0,
        unassignedMasteries: unassignedMasteryCount
      };
      const result = await this._showConfirmationDialog(actorData.name, counts);

      if (!result || result === "cancel") return;

      const assignNow = result === "assign";

      // Create or update actor
      let targetActor = actor;

      if (targetActor) {
        // Update existing actor
        await targetActor.update(actorData);
        // Delete existing items that will be replaced
        const existingItems = targetActor.items.filter(i =>
          i.type === "npcattack" || i.type === "npcfeature" || i.type === "mastery" || i.type === "spell"
        );
        if (existingItems.length > 0) {
          await targetActor.deleteEmbeddedDocuments("Item", existingItems.map(i => i.id));
        }
      } else {
        // Create new actor
        targetActor = await Actor.create(actorData);
      }

      // Set creature sheet as default for this actor
      await targetActor.setFlag("core", "sheetClass", "splimo_creaturesheet.CreatureSheet");

      // Create items
      if (items.length > 0) {
        await targetActor.createEmbeddedDocuments("Item", items);
      }

      // Show success message
      ui.notifications.info(game.i18n.localize("CREATURE.ImportSuccess"));

      // Render actor sheet if newly created
      if (!actor) {
        targetActor.sheet.render(true);
      }

      // If user chose to assign masteries now, start sequential assignment
      if (assignNow) {
        const unassignedMasteries = targetActor.items.filter(i =>
          i.type === "mastery" && i.system.isUnassignedMastery
        );

        if (unassignedMasteries.length > 0) {
          MasteryAssignmentDialog.showSequential(targetActor, Array.from(unassignedMasteries));
        }
      }

    } catch (error) {
      console.error("Error importing creature:", error);
      ui.notifications.error(game.i18n.format("CREATURE.ImportError", { error: error.message }));
    }
  }

  /**
   * Show file picker dialog
   */
  static async _showFileDialog() {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";

      input.onchange = (e) => {
        const file = e.target.files[0];
        resolve(file);
      };

      input.oncancel = () => {
        resolve(null);
      };

      input.click();
    });
  }

  /**
   * Read file content
   */
  static async _readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        resolve(e.target.result);
      };

      reader.onerror = (e) => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Try to match masteries with compendium items
   * @param {Array} items - The items array to modify in place
   */
  static async _matchMasteriesWithCompendium(items) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type !== "mastery" || !item.system.isUnassignedMastery) continue;

      // Try to find matching mastery in compendium
      const compendiumMastery = await findCompendiumMastery(item.name, item.system.skill);

      if (compendiumMastery) {
        // Replace with compendium data
        const originalSkill = item.system.skill;
        items[i] = compendiumMastery;
        // Only keep original skill if it was valid, otherwise use compendium's skill
        if (originalSkill && originalSkill !== "undefined") {
          items[i].system.skill = originalSkill;
        }
        // Remove the unassigned flag since we found a match
        delete items[i].system.isUnassignedMastery;
        console.log(`Matched mastery "${item.name}" with compendium item (skill: ${items[i].system.skill})`);
      } else {
        console.log(`Could not find compendium match for mastery "${item.name}"`);
      }
    }
  }

  /**
   * Show confirmation dialog
   * @returns {Promise<string|null>} "import", "assign", or null for cancel
   */
  static async _showConfirmationDialog(name, counts) {
    // Build content lines, only showing non-zero counts
    const lines = [];
    if (counts.features) lines.push(`${counts.features} ${game.i18n.localize("CREATURE.Import.Features")}`);
    if (counts.weapons) lines.push(`${counts.weapons} ${game.i18n.localize("CREATURE.Import.Weapons")}`);
    if (counts.masteries) lines.push(`${counts.masteries} ${game.i18n.localize("CREATURE.Import.Masteries")}`);
    if (counts.spells) lines.push(`${counts.spells} ${game.i18n.localize("CREATURE.Import.Spells")}`);
    if (counts.skills) lines.push(`${counts.skills} ${game.i18n.localize("CREATURE.Import.Skills")}`);
    if (counts.magicSchools) lines.push(`${counts.magicSchools} ${game.i18n.localize("CREATURE.Import.MagicSchools")}`);
    if (counts.refinements) lines.push(`${counts.refinements} ${game.i18n.localize("CREATURE.Import.Refinements")}`);
    if (counts.training) lines.push(`${counts.training} ${game.i18n.localize("CREATURE.Import.Training")}`);

    let content = `<div class="import-confirmation"><p><strong>${name}</strong></p><ul>${lines.map(l => `<li>${l}</li>`).join("")}</ul>`;

    // Add unassigned mastery warning if any
    if (counts.unassignedMasteries > 0) {
      content += `<div class="unassigned-warning">
        <p>${game.i18n.format("CREATURE.MasteryAssignment.UnassignedRemaining", { count: counts.unassignedMasteries })}</p>
      </div>`;
    }

    content += "</div>";

    // If there are unassigned masteries, show a three-button dialog
    if (counts.unassignedMasteries > 0) {
      return new Promise((resolve) => {
        new Dialog({
          title: game.i18n.localize("CREATURE.ImportConfirmTitle"),
          content: content,
          buttons: {
            assign: {
              icon: '<i class="fas fa-check-double"></i>',
              label: game.i18n.localize("CREATURE.MasteryAssignment.AssignNow"),
              callback: () => resolve("assign")
            },
            import: {
              icon: '<i class="fas fa-file-import"></i>',
              label: game.i18n.localize("CREATURE.ImportConfirmTitle"),
              callback: () => resolve("import")
            },
            cancel: {
              icon: '<i class="fas fa-times"></i>',
              label: game.i18n.localize("Cancel"),
              callback: () => resolve("cancel")
            }
          },
          default: "assign",
          close: () => resolve("cancel")
        }).render(true);
      });
    }

    // No unassigned masteries - simple confirm dialog
    return Dialog.confirm({
      title: game.i18n.localize("CREATURE.ImportConfirmTitle"),
      content: content,
      yes: () => "import",
      no: () => "cancel",
      defaultYes: true
    });
  }
}
