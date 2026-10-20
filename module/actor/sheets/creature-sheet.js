import { CreatureImporter } from "../../apps/creature-importer.js";
import { SpellAssignmentDialog } from "../../apps/spell-assignment-dialog.js";
import { MasteryAssignmentDialog } from "../../apps/mastery-assignment-dialog.js";
import {
  getCreatureInfo,
  getSpellGrade,
  getSpellSchool,
  isUnassignedMastery,
  isUnassignedSpell,
  MODULE_ID
} from "../../compat.js";

const TEMPLATE_PATH = `modules/${MODULE_ID}/templates/sheets`;

/**
 * Baut den Kreaturen-Bogen auf dem NSC-Bogen von Splittermond auf.
 *
 * Die Klasse wird erst zur Laufzeit erzeugt, weil Splittermond seine Bogenklassen nur ueber
 * CONFIG.Actor.sheetClasses bereitstellt (das System wird als ein Bundle ausgeliefert).
 * @param {typeof foundry.applications.sheets.ActorSheetV2} NpcSheet  Splittermonds NSC-Bogen
 */
export function createCreatureSheetClass(NpcSheet) {
  const creaturePart = {
    template: `${TEMPLATE_PATH}/creature-tab.hbs`,
    scrollable: [""],
    classes: ["scrollable"]
  };

  // Kreatur-Tab direkt hinter "Allgemein" einhaengen, Reihenfolge der uebrigen Teile beibehalten
  const parts = {};
  for (const [key, part] of Object.entries(NpcSheet.PARTS)) {
    parts[key] = part;
    if (key === "general") parts.creature = creaturePart;
  }
  parts.creature ??= creaturePart;

  const primary = NpcSheet.TABS.primary;
  const tabs = [];
  for (const tab of primary.tabs) {
    tabs.push(tab);
    if (tab.id === "general") tabs.push({ id: "creature", group: "primary", label: "CREATURE.TabCreature" });
  }
  if (!tabs.some(t => t.id === "creature")) tabs.push({ id: "creature", group: "primary", label: "CREATURE.TabCreature" });

  return class CreatureSheet extends NpcSheet {
    static DEFAULT_OPTIONS = {
      classes: ["splimo-creature"],
      window: {
        controls: [
          {
            icon: "fa-solid fa-file-import",
            label: "CREATURE.ImportCreature",
            action: "import-creature",
            visible: CreatureSheet.#canImport
          }
        ]
      },
      actions: {
        "import-creature": CreatureSheet.#onImportCreature,
        "assign-spell": CreatureSheet.#onAssignSpell,
        "assign-mastery": CreatureSheet.#onAssignMastery
      }
    };

    static PARTS = parts;

    static TABS = { ...NpcSheet.TABS, primary: { ...primary, tabs } };

    static #canImport() {
      return this.isEditable;
    }

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const info = getCreatureInfo(this.actor);

      context.creatureInfo = info;
      context.verfeinerungenByCategory = groupByCategory(info.verfeinerungen, "other", "CREATURE.RefinementCategories");
      context.abrichtungenByCategory = groupByCategory(info.abrichtungen, "allgemein", "CREATURE.AbrichtungCategory");

      // Nicht zugeordnete Zauber sind npcfeature-Items mit Markierung; sie gehoeren nicht in die Merkmalsliste
      context.unassignedSpells = (context.items ?? [])
        .filter(isUnassignedSpell)
        .map(i => ({ ...i, spellSchool: getSpellSchool(i), spellGrade: getSpellGrade(i) }));
      if (context.itemsByType?.npcfeature) {
        context.itemsByType.npcfeature = context.itemsByType.npcfeature.filter(i => !isUnassignedSpell(i));
      }
      context.unassignedMasteries = (context.items ?? []).filter(isUnassignedMastery);
      context.hasCreatureInfo = !!(info.basis || info.rolle || info.verfeinerungen.length || info.abrichtungen.length);
      return context;
    }

    static async #onImportCreature(event) {
      event.preventDefault();
      await CreatureImporter.import(this.actor);
    }

    static async #onAssignSpell(event, target) {
      if (event.target.closest("button")) return;
      const item = this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
      if (item && isUnassignedSpell(item)) {
        await SpellAssignmentDialog.show(this.actor, item, { useFuzzyPreselect: true });
      }
    }

    static async #onAssignMastery(event, target) {
      if (event.target.closest("button")) return;
      const item = this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
      if (item && isUnassignedMastery(item)) {
        await MasteryAssignmentDialog.show(this.actor, item, { useFuzzyPreselect: true });
      }
    }
  };
}

function groupByCategory(entries, fallback, labelPrefix) {
  const groups = {};
  for (const entry of entries ?? []) {
    const category = entry.category || entry.kategorie || fallback;
    (groups[category] ??= []).push({
      ...entry,
      cost: entry.cost ?? entry.kosten ?? entry.potentialCost
    });
  }
  const list = Object.entries(groups).map(([category, items]) => ({
    categoryKey: `${labelPrefix}.${category}`,
    category,
    items
  }));
  return list.length ? list : null;
}
