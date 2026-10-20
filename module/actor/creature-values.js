import { MODULE_ID, SHEET_ID } from "../compat.js";

/**
 * Wertberechnung fuer Kreaturen (Bestienmeister-Baukasten).
 *
 * Bei Kreaturen werden Grundwerte bei der Erschaffung festgelegt und gesteigert; sie haengen nicht von
 * Attributen ab. Modifikatoren (Gegenstaende, Meisterschaften, Abrichtungen, Zustaende, Wunden) wirken
 * dagegen wie bei jedem anderen Akteur.
 *
 *  - Abgeleitete Werte (GK, GSW, INI, LP, FO, VTD, KW, GW): Grundwert = gespeicherter Wert, auch wenn er 0 ist;
 *    Splittermond wuerde ihn sonst aus Attributen berechnen.
 *  - Fertigkeiten: Grundwert = gespeicherte Punkte, Attribute zaehlen nicht mit. Den automatischen
 *    Groessen-Zuschlag auf Heimlichkeit (5 - GK) gibt es nicht, weil die Kreaturwerte die Groesse schon enthalten.
 *
 * Splittermond stellt seine Klassen DerivedValue und Skill nicht bereit; sie werden an der ersten Instanz
 * abgegriffen und nur fuer Kreaturen angepasst. Alle anderen Akteure rechnen unveraendert.
 */

let derivedValuesPatched = false;
let skillsPatched = false;

export function isCreature(actor) {
  return actor?.type === "npc"
    && (actor.flags?.core?.sheetClass === SHEET_ID || !!actor.flags?.[MODULE_ID]?.creatureInfo);
}

/* -------------------------------------------- */
/*  Abgeleitete Werte                           */
/* -------------------------------------------- */

function patchDerivedValueClass(DerivedValue) {
  const proto = DerivedValue.prototype;
  const baseValue = Object.getOwnPropertyDescriptor(proto, "baseValue")?.get;
  const tooltip = proto.tooltip;
  if (!baseValue) {
    console.warn(`${MODULE_ID} | DerivedValue.baseValue nicht gefunden, Kreaturwerte werden berechnet`);
    return;
  }

  Object.defineProperty(proto, "baseValue", {
    configurable: true,
    get() {
      if (this._creatureTooltipBase !== undefined) return this._creatureTooltipBase;
      if (!isCreature(this.actor)) return baseValue.call(this);
      return Number(this.actor.system.derivedAttributes?.[this.id]?.value) || 0;
    }
  });

  // Splittermonds Tooltip zeigt die Formel aus Attributen. Fuer Kreaturen nutzen wir den Zweig fuer die
  // Groesse, der nur "Grundwert + Modifikatoren" ausgibt.
  Object.defineProperty(proto, "tooltip", {
    configurable: true,
    writable: true,
    value: function (...args) {
      if (!isCreature(this.actor) || this.id === "size") return tooltip.call(this, ...args);
      const id = this.id;
      this._creatureTooltipBase = this.baseValue;
      this.id = "size";
      try {
        return tooltip.call(this, ...args);
      } finally {
        this.id = id;
        delete this._creatureTooltipBase;
      }
    }
  });
}

/* -------------------------------------------- */
/*  Fertigkeiten                                */
/* -------------------------------------------- */

function sizeLabel() {
  return game.i18n.localize("splittermond.derivedAttribute.size.short");
}

function patchSkillClass(Skill) {
  const proto = Skill.prototype;
  const attribute1 = Object.getOwnPropertyDescriptor(proto, "attribute1")?.get;
  const attribute2 = Object.getOwnPropertyDescriptor(proto, "attribute2")?.get;
  const collectModifiers = proto.collectModifiers;
  const getFormula = proto.getFormula;
  if (!attribute1 || !attribute2 || !collectModifiers) {
    console.warn(`${MODULE_ID} | Skill-Klasse unerwartet aufgebaut, Kreatur-Fertigkeiten werden berechnet`);
    return;
  }

  // Attribute bleiben fuer attributbezogene Modifikatoren erkennbar (id), zaehlen aber nicht zum Wert.
  const withoutValue = (attribute) => attribute ? { ...attribute, value: 0 } : attribute;
  for (const [key, getter] of [["attribute1", attribute1], ["attribute2", attribute2]]) {
    Object.defineProperty(proto, key, {
      configurable: true,
      get() {
        const attribute = getter.call(this);
        if (!isCreature(this.actor)) return attribute;
        return this._creatureHideAttributes ? null : withoutValue(attribute);
      }
    });
  }

  Object.defineProperty(proto, "collectModifiers", {
    configurable: true,
    writable: true,
    value: function (...args) {
      const modifiers = collectModifiers.call(this, ...args);
      if (this.id !== "stealth" || !isCreature(this.actor)) return modifiers;
      const label = sizeLabel();
      return modifiers.filter(mod => !(mod.attributes?.type === "innate" && mod.attributes?.name === label));
    }
  });

  // Tooltip/Probe: nur Grundwert + Modifikatoren anzeigen, keine Attribute mit Wert 0
  if (getFormula) {
    Object.defineProperty(proto, "getFormula", {
      configurable: true,
      writable: true,
      value: function (...args) {
        if (!isCreature(this.actor)) return getFormula.call(this, ...args);
        this._creatureHideAttributes = true;
        try {
          return getFormula.call(this, ...args);
        } finally {
          delete this._creatureHideAttributes;
        }
      }
    });
  }
}

/* -------------------------------------------- */
/*  Einhaengen                                  */
/* -------------------------------------------- */

/**
 * Haengt sich an prepareBaseData, wo Splittermond Fertigkeiten und abgeleitete Werte anlegt.
 * Muss im init-Hook nach Splittermond laufen.
 */
export function installCreatureValues() {
  const proto = CONFIG.Actor.documentClass?.prototype;
  if (!proto) return;
  const prepareBaseData = proto.prepareBaseData;
  proto.prepareBaseData = function (...args) {
    const result = prepareBaseData.call(this, ...args);
    if (!derivedValuesPatched) {
      const derivedValue = Object.values(this.derivedValues ?? {})[0];
      if (derivedValue) {
        patchDerivedValueClass(derivedValue.constructor);
        derivedValuesPatched = true;
      }
    }
    if (!skillsPatched) {
      const skill = Object.values(this.skills ?? {})[0];
      if (skill) {
        patchSkillClass(skill.constructor);
        skillsPatched = true;
      }
    }
    return result;
  };
}
