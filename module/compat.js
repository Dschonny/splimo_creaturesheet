/**
 * Datenhaltung und Migration fuer Kreaturen.
 *
 * Seit Splittermond 0.12.20 haben Akteure und Items feste Datenmodelle; unbekannte Felder unter `system`
 * werden verworfen. Alles Kreatur-spezifische liegt deshalb unter `flags.splimo_creaturesheet`:
 *   Actor: flags.splimo_creaturesheet.creatureInfo = { basis, rolle, verfeinerungen, abrichtungen }
 *   Item:  flags.splimo_creaturesheet.unassignedSpell / unassignedMastery / spellSchool / spellGrade
 *
 * Fertigkeiten und abgeleitete Werte nutzen das NSC-Modell von Splittermond: Der Bogen zeigt den Endwert,
 * gespeichert werden Punkte so, dass Attribut1 + Attribut2 + Punkte (+ Modifikatoren) den Endwert ergeben.
 */

export const MODULE_ID = "splimo_creaturesheet";
export const SHEET_ID = `${MODULE_ID}.CreatureSheet`;

const ITEM_FLAG_KEYS = {
  isUnassignedSpell: "unassignedSpell",
  isUnassignedMastery: "unassignedMastery",
  spellSchool: "spellSchool",
  spellGrade: "spellGrade"
};

/* -------------------------------------------- */
/*  Lesen                                       */
/* -------------------------------------------- */

export function getCreatureInfo(actor) {
  const info = actor?.getFlag?.(MODULE_ID, "creatureInfo") ?? actor?.flags?.[MODULE_ID]?.creatureInfo ?? {};
  return {
    basis: info.basis || null,
    rolle: info.rolle || null,
    verfeinerungen: info.verfeinerungen || [],
    abrichtungen: info.abrichtungen || []
  };
}

function itemFlag(item, key) {
  return item?.flags?.[MODULE_ID]?.[key];
}

export const isUnassignedSpell = (item) => item?.type === "npcfeature" && !!itemFlag(item, "unassignedSpell");
export const isUnassignedMastery = (item) => item?.type === "mastery" && !!itemFlag(item, "unassignedMastery");
export const getSpellSchool = (item) => itemFlag(item, "spellSchool") || "";
export const getSpellGrade = (item) => itemFlag(item, "spellGrade") ?? "";

/**
 * Endwert einer Fertigkeit als Zahl. Splittermond 13 liefert eine Zahl, Splittermond 14 einen Ausdruck
 * (mit calculateSync()/display).
 */
export function getSkillValue(actor, skillId) {
  const value = actor?.skills?.[skillId]?.value;
  if (typeof value === "number") return value;
  if (typeof value?.calculateSync === "function") return Number(value.calculateSync()) || 0;
  return Number(value?.display ?? value) || 0;
}

/* -------------------------------------------- */
/*  Umwandeln vor dem Speichern                 */
/* -------------------------------------------- */

/**
 * Verschiebt die Zuordnungs-Markierungen eines Item-Datensatzes von `system` nach `flags`.
 * Arbeitet in-place auf rohen Daten (Import, Altbestand) und gibt sie zurueck.
 */
export function moveItemMarkersToFlags(itemData) {
  const system = itemData?.system;
  if (!system || typeof system !== "object") return itemData;
  for (const [oldKey, flagKey] of Object.entries(ITEM_FLAG_KEYS)) {
    if (!(oldKey in system)) continue;
    const value = system[oldKey];
    delete system[oldKey];
    if (value === undefined || value === null || value === false || value === "") continue;
    itemData.flags ??= {};
    itemData.flags[MODULE_ID] ??= {};
    itemData.flags[MODULE_ID][flagKey] ??= value;
  }
  return itemData;
}

/**
 * Rechnet feste Kreatur-Fertigkeitswerte in Splittermond-NSC-Punkte um.
 * @param {object} system          Roher system-Block eines NSC (attributes, skills, derivedAttributes)
 * @param {object} fixedValues     { skillId: Endwert }
 */
export function fixedSkillValuesToPoints(system, fixedValues) {
  const skillAttributes = CONFIG.splittermond?.skillAttributes ?? {};
  const attr = (id) => Number(system.attributes?.[id]?.value) || 0;
  const size = Number(system.derivedAttributes?.size?.value) || 5;
  system.skills ??= {};
  for (const [skillId, raw] of Object.entries(fixedValues)) {
    const target = Number(raw) || 0;
    const [a1, a2] = skillAttributes[skillId] ?? [];
    let points = target - attr(a1) - attr(a2);
    // Splittermond gibt NSC automatisch (5 - Groesse) auf Heimlichkeit. Die Kreaturwerte enthalten die
    // Groesse schon, deshalb wird der Zuschlag hier herausgerechnet.
    if (skillId === "stealth") points -= 5 - size;
    system.skills[skillId] = { points, value: 0 };
  }
  return system;
}

/* -------------------------------------------- */
/*  Migration alter Kreaturen (Modul < 2.0)     */
/* -------------------------------------------- */

function isLegacyCreatureSource(source) {
  return !!source?.system?.creatureInfo
    || source?.flags?.core?.sheetClass === SHEET_ID && !source?.flags?.[MODULE_ID]?.version;
}

/**
 * Wird aus Actor.migrateData aufgerufen, also bevor Splittermond unbekannte Felder verwirft.
 * Markiert migrierte Akteure mit `flags.splimo_creaturesheet.needsPersist`, damit der SL sie speichert.
 */
export function migrateLegacyActorSource(source) {
  if (source?.type !== "npc" || !isLegacyCreatureSource(source)) return source;
  const system = source.system ?? {};
  source.flags ??= {};
  const flags = source.flags[MODULE_ID] ??= {};

  if (system.creatureInfo) {
    flags.creatureInfo ??= system.creatureInfo;
    delete system.creatureInfo;
  }

  // Der alte Importer schrieb Mystik unter "mysticism"; Splittermond nutzt "mystic".
  const mysticism = system.attributes?.mysticism;
  if (mysticism) {
    if (!Number(system.attributes.mystic?.value)) {
      system.attributes.mystic = { ...(system.attributes.mystic ?? {}), value: Number(mysticism.value) || 0 };
    }
    delete system.attributes.mysticism;
  }

  // Frueher war skills.X.value der feste Endwert (points war nur informativ); Splittermond 13+ rechnet
  // ausschliesslich mit points.
  const fixedValues = {};
  for (const [skillId, skill] of Object.entries(system.skills ?? {})) {
    const value = Number(skill?.value);
    if (value > 0) fixedValues[skillId] = value;
  }
  if (Object.keys(fixedValues).length) fixedSkillValuesToPoints(system, fixedValues);

  for (const item of source.items ?? []) moveItemMarkersToFlags(item);

  flags.version = 2;
  flags.needsPersist = true;
  return source;
}

export function migrateLegacyItemSource(source) {
  return moveItemMarkersToFlags(source);
}

/**
 * Haengt die Migration an die Dokumentklassen. Muss im init-Hook nach Splittermond laufen.
 */
export function installMigrations() {
  wrapMigrateData(CONFIG.Actor.documentClass, migrateLegacyActorSource);
  wrapMigrateData(CONFIG.Item.documentClass, migrateLegacyItemSource);
}

function wrapMigrateData(cls, migrate) {
  if (!cls || cls.migrateData?.[`${MODULE_ID}Wrapped`]) return;
  const original = cls.migrateData;
  const wrapped = function (source, ...args) {
    try {
      migrate(source);
    } catch (err) {
      console.error(`${MODULE_ID} | Migration fehlgeschlagen`, err);
    }
    return original.call(this, source, ...args);
  };
  wrapped[`${MODULE_ID}Wrapped`] = true;
  Object.defineProperty(cls, "migrateData", { value: wrapped, configurable: true, writable: true });
}

/**
 * Schreibt im Speicher migrierte Kreaturen dauerhaft zurueck (nur aktiver SL, Welt-Akteure).
 */
export async function persistMigratedActors() {
  if (!game.user?.isActiveGM) return;
  const pending = game.actors.filter(a => a.getFlag(MODULE_ID, "needsPersist"));
  for (const actor of pending) {
    const data = actor.toObject();
    delete data.flags[MODULE_ID].needsPersist;
    await actor.update(data, { diff: false, recursive: false, render: false });
    console.log(`${MODULE_ID} | Kreatur ${actor.name} auf das neue Datenformat umgestellt`);
  }
  if (pending.length) {
    ui.notifications.info(game.i18n.format("CREATURE.MigrationDone", { count: pending.length }));
  }
}
