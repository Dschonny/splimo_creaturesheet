/**
 * Splittermond Creature Sheet Module
 * Main entry point
 */

import { createCreatureSheetClass } from "./module/actor/sheets/creature-sheet.js";
import { installCreatureValues } from "./module/actor/creature-values.js";
import { CreatureImporter } from "./module/apps/creature-importer.js";
import { installMigrations, MODULE_ID, persistMigratedActors } from "./module/compat.js";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once("init", function () {
  console.log("Splimo Creaturesheet | Initializing module");

  // Alte Kreaturen (system.creatureInfo, feste Fertigkeitswerte) beim Laden umschreiben,
  // bevor Splittermond unbekannte Felder verwirft
  installMigrations();

  // Kreaturen: Grundwerte ohne Attribut-Abhaengigkeit, Modifikatoren wirken normal
  installCreatureValues();

  game.splimoCreaturesheet = {
    CreatureImporter,
    importCreature: CreatureImporter.import.bind(CreatureImporter)
  };
});

/* -------------------------------------------- */
/*  Bogen registrieren                          */
/* -------------------------------------------- */

// Foundry sammelt Bogen-Registrierungen bis zum ready-Zeitpunkt und legt CONFIG.Actor.sheetClasses erst
// dann an; vorher ist Splittermonds NSC-Bogen nicht erreichbar. Nach game.ready wirkt registerSheet sofort.
function registerCreatureSheet() {
  const npcSheets = Object.values(CONFIG.Actor.sheetClasses?.npc ?? {});
  const npcSheet = (npcSheets.find(entry => entry.id === "splittermond.SplittermondNPCSheet")
    ?? npcSheets.find(entry => entry.id.startsWith("splittermond.")))?.cls;
  if (!npcSheet) {
    console.error("Splimo Creaturesheet | Splittermond NPC sheet not found, creature sheet not registered");
    return;
  }
  const CreatureSheet = createCreatureSheetClass(npcSheet);
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, MODULE_ID, CreatureSheet, {
    types: ["npc"],
    makeDefault: false,
    label: "Creature Sheet"
  });
  game.splimoCreaturesheet.CreatureSheet = CreatureSheet;
}

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function () {
  registerCreatureSheet();
  await persistMigratedActors();
});

/* -------------------------------------------- */
/*  Actor Directory Hook                        */
/* -------------------------------------------- */

Hooks.on("renderActorDirectory", (app, html) => {
  if (!game.user.can("ACTOR_CREATE")) return;
  const root = html instanceof HTMLElement ? html : html[0];
  const container = root?.querySelector(".directory-header .header-actions, .directory-header .action-buttons");
  if (!container || container.querySelector(".import-creature-directory")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "import-creature-directory";
  button.innerHTML = `<i class="fas fa-file-import"></i> ${game.i18n.localize("CREATURE.ImportCreature")}`;
  button.addEventListener("click", () => game.splimoCreaturesheet?.importCreature());
  container.append(button);
});
