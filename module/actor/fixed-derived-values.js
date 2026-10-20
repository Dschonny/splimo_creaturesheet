import { MODULE_ID, SHEET_ID } from "../compat.js";

/**
 * Kreaturen haben feste abgeleitete Werte (Groesse, GSW, INI, LP, FO, VTD, KW, GW): Es gilt genau der Wert aus
 * dem Creature-Editor bzw. dem Bogen. Splittermond berechnet abgeleitete Werte dagegen aus Attributen und
 * rechnet Modifikatoren (Meisterschaften, Zustaende, Ausruestung) sowie Multiplikatoren hinzu.
 *
 * Splittermond stellt die Klasse DerivedValue nicht bereit; sie wird deshalb an der ersten Instanz abgegriffen
 * und fuer Kreaturen angepasst. Fuer alle anderen Akteure bleibt das Verhalten unveraendert.
 */

const NO_MODIFIER_ID = `${MODULE_ID}.no-modifier`;
let patched = false;

export function isFixedValueCreature(actor) {
  return actor?.type === "npc"
    && (actor.flags?.core?.sheetClass === SHEET_ID || !!actor.flags?.[MODULE_ID]?.creatureInfo);
}

/** Leere Modifikatorliste im jeweiligen Splittermond-Format (Summe 0, Produkt 1). */
function noModifiers(actor) {
  return actor.modifier.getForId(NO_MODIFIER_ID).notSelectable().getModifiers();
}

function patchDerivedValueClass(DerivedValue) {
  const proto = DerivedValue.prototype;

  const baseValue = Object.getOwnPropertyDescriptor(proto, "baseValue")?.get;
  if (baseValue) {
    Object.defineProperty(proto, "baseValue", {
      configurable: true,
      get() {
        if (!isFixedValueCreature(this.actor)) return baseValue.call(this);
        return Number(this.actor.system.derivedAttributes?.[this.id]?.value) || 0;
      }
    });
  }

  const collectModifiers = proto.collectModifiers;
  Object.defineProperty(proto, "collectModifiers", {
    configurable: true,
    writable: true,
    value: function () {
      return isFixedValueCreature(this.actor) ? noModifiers(this.actor) : collectModifiers.call(this);
    }
  });

  const multiplierAsExpression = proto.multiplierAsExpression;
  if (multiplierAsExpression) {
    Object.defineProperty(proto, "multiplierAsExpression", {
      configurable: true,
      writable: true,
      value: function () {
        return isFixedValueCreature(this.actor)
          ? noModifiers(this.actor).multiplyExpressions()
          : multiplierAsExpression.call(this);
      }
    });
  }

  const tooltip = proto.tooltip;
  Object.defineProperty(proto, "tooltip", {
    configurable: true,
    writable: true,
    value: function (...args) {
      return isFixedValueCreature(this.actor) ? "" : tooltip.call(this, ...args);
    }
  });
}

/**
 * Haengt sich an prepareBaseData, wo Splittermond die DerivedValue-Instanzen anlegt. Muss im init-Hook
 * nach Splittermond laufen.
 */
export function installFixedDerivedValues() {
  const proto = CONFIG.Actor.documentClass?.prototype;
  if (!proto) return;
  const prepareBaseData = proto.prepareBaseData;
  proto.prepareBaseData = function (...args) {
    const result = prepareBaseData.call(this, ...args);
    if (!patched) {
      const derivedValue = Object.values(this.derivedValues ?? {})[0];
      if (derivedValue) {
        patchDerivedValueClass(derivedValue.constructor);
        patched = true;
      }
    }
    return result;
  };
}
