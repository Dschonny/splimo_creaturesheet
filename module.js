/**
 * Splittermond Creature Sheet Module
 * Main entry point
 */

import CreatureActor from "./module/actor/creature-actor.js";
import { CreatureSheet } from "./module/actor/sheets/creature-sheet.js";
import { RefinementItem } from "./module/item/refinement.js";
import { TrainingItem } from "./module/item/training.js";
import { CreatureImporter } from "./module/apps/creature-importer.js";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once("init", function() {
  console.log("Splimo Creaturesheet | Initializing module");

  // Register CreatureActor as the document class for npc actors
  CONFIG.Actor.documentClasses = CONFIG.Actor.documentClasses || {};
  CONFIG.Actor.documentClasses.npc = CreatureActor;
  console.log("Splimo Creaturesheet | Registered CreatureActor for npc type");

  // Register creature actor sheet for npc type
  Actors.registerSheet("splimo_creaturesheet", CreatureSheet, {
    types: ["npc"],
    makeDefault: false,
    label: "Creature Sheet"
  });

  // Register item document classes
  CONFIG.Item.documentClasses = CONFIG.Item.documentClasses || {};
  CONFIG.Item.documentClasses.refinement = RefinementItem;
  CONFIG.Item.documentClasses.training = TrainingItem;

  // Add to global namespace
  game.splimoCreaturesheet = {
    CreatureActor,
    CreatureSheet,
    RefinementItem,
    TrainingItem,
    CreatureImporter,
    importCreature: CreatureImporter.import.bind(CreatureImporter)
  };

  console.log("Splimo Creaturesheet | Module initialized");
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", function() {
  console.log("Splimo Creaturesheet | Module ready");
});

/* -------------------------------------------- */
/*  Actor Directory Hook                        */
/* -------------------------------------------- */

Hooks.on("renderActorDirectory", (app, html, data) => {
  // Add import button to actor directory
  const importButton = $(`<button class="import-creature-directory">
    <i class="fas fa-file-import"></i> ${game.i18n.localize("CREATURE.ImportCreature")}
  </button>`);

  importButton.css({
    "margin": "5px",
    "padding": "5px 10px",
    "background": "#4a7ba7",
    "color": "white",
    "border": "none",
    "border-radius": "4px",
    "cursor": "pointer"
  });

  importButton.on("mouseenter", function() {
    $(this).css("background", "#3a6b97");
  });

  importButton.on("mouseleave", function() {
    $(this).css("background", "#4a7ba7");
  });

  importButton.on("click", () => {
    game.splimoCreaturesheet.importCreature();
  });

  html.find(".directory-header .action-buttons").append(importButton);
});

/* -------------------------------------------- */
/*  Console Message                             */
/* -------------------------------------------- */

console.log(`
╔═══════════════════════════════════════╗
║  Splittermond Creature Sheet v1.0.0  ║
║  Module loaded successfully          ║
╚═══════════════════════════════════════╝
`);
