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
      const creData = JSON.parse(content);

      // Validate format
      const validation = CreatureDataMapper.validateCreFormat(creData);
      if (!validation.valid) {
        ui.notifications.error(game.i18n.format("CREATURE.ImportError", { error: validation.error }));
        return;
      }

      // Map to actor data
      const { actorData, items, weaponLinks } = CreatureDataMapper.mapCreToActorData(creData);

      // Show confirmation dialog
      const confirmed = await this._showConfirmationDialog(
        actorData.name,
        items.filter(i => i.type === "refinement").length,
        items.filter(i => i.type === "training").length,
        items.filter(i => i.type === "npcattack").length
      );

      if (!confirmed) return;

      // Create or update actor
      let targetActor = actor;

      if (targetActor) {
        // Update existing actor
        await targetActor.update(actorData);
        // Delete existing items
        const existingItemIds = targetActor.items.map(i => i.id);
        await targetActor.deleteEmbeddedDocuments("Item", existingItemIds);
      } else {
        // Create new actor
        targetActor = await Actor.create(actorData);
      }

      // Create items
      const createdItems = await targetActor.createEmbeddedDocuments("Item", items);

      // Link weapons to refinements
      if (weaponLinks.size > 0) {
        const updates = [];

        for (const [refinementName, weaponName] of weaponLinks.entries()) {
          const refinement = createdItems.find(i => i.name === refinementName);
          const weapon = createdItems.find(i => i.name === weaponName);

          if (refinement && weapon) {
            updates.push({
              _id: refinement.id,
              "system.zusaetzlicheWaffeId": weapon.id
            });
          }
        }

        if (updates.length > 0) {
          await targetActor.updateEmbeddedDocuments("Item", updates);
        }
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
