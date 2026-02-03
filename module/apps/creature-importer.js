import { CreatureDataMapper } from "../util/creature-data-mapper.js";

/**
 * Handles importing .cre files into creature actors
 */
export class CreatureImporter {

  /**
   * Import a creature from a .cre file
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

      const creData = JSON.parse(content);
      console.log("Parsed .cre data:", creData);

      // Validate format
      const validation = CreatureDataMapper.validateCreFormat(creData);
      if (!validation.valid) {
        console.error("Validation failed:", validation.error);
        ui.notifications.error(game.i18n.format("CREATURE.ImportError", { error: validation.error }));
        return;
      }

      // Map to actor data
      const { actorData, items } = CreatureDataMapper.mapCreToActorData(creData);

      // Show confirmation dialog
      const confirmed = await this._showConfirmationDialog(
        actorData.name,
        actorData.system.verfeinerungen?.length || 0,
        actorData.system.abrichtungen?.length || 0,
        items.length
      );

      if (!confirmed) return;

      // Create or update actor
      let targetActor = actor;

      if (targetActor) {
        // Update existing actor
        await targetActor.update(actorData);
        // Delete existing weapon items only
        const existingWeapons = targetActor.items.filter(i => i.type === "npcattack");
        if (existingWeapons.length > 0) {
          await targetActor.deleteEmbeddedDocuments("Item", existingWeapons.map(i => i.id));
        }
      } else {
        // Create new actor
        targetActor = await Actor.create(actorData);
      }

      // Set creature sheet as default for this actor
      await targetActor.setFlag("core", "sheetClass", "splimo_creaturesheet.CreatureSheet");

      // Create weapon items only
      if (items.length > 0) {
        await targetActor.createEmbeddedDocuments("Item", items);
      }

      // Show success message
      ui.notifications.info(game.i18n.localize("CREATURE.ImportSuccess"));

      // Render actor sheet if newly created
      if (!actor) {
        targetActor.sheet.render(true);
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
      input.accept = ".cre,.json";

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
   * Show confirmation dialog
   */
  static async _showConfirmationDialog(name, refinementCount, trainingCount, weaponCount) {
    return Dialog.confirm({
      title: game.i18n.localize("CREATURE.ImportConfirmTitle"),
      content: `<p>${game.i18n.format("CREATURE.ImportConfirmContent", {
        name: name,
        refinements: refinementCount,
        trainings: trainingCount,
        weapons: weaponCount
      })}</p>`,
      yes: () => true,
      no: () => false,
      defaultYes: true
    });
  }
}
