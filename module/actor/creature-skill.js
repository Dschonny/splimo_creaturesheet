// Import the base Skill class from Splittermond system
const Skill = (await import("/systems/splittermond/module/actor/skill.js")).default;
const Tooltip = await import("/systems/splittermond/module/util/tooltip.js");
const Chat = await import("/systems/splittermond/module/util/chat.js");

/**
 * Creature Skill - Extends the base Skill class with fixed values
 * Creatures have fixed skill values that are not calculated from attributes
 */
export default class CreatureSkill extends Skill {

    /**
     * Override the value getter to return the stored value directly
     * instead of calculating from attributes + points
     */
    get value() {
        if (this._cache.enabled && this._cache.value !== null) return this._cache.value;

        // For creatures, use the stored value directly
        let value = parseInt(this.actor.system.skills[this.id]?.value || 0);

        // Add modifiers, but exclude size modifier for stealth
        // (size is already factored into the creature's stealth value)
        let modValue = this.mod;
        if (this.id === "stealth" && this.actor.derivedValues?.size) {
            const sizeModifier = 5 - this.actor.derivedValues.size.value;
            modValue -= sizeModifier;
        }
        value += modValue;

        if (this._cache.enabled && this._cache.value === null)
            this._cache.value = value;
        return value;
    }

    /**
     * Override points getter to return the base value for creatures
     * This will be displayed as "FW" (Fertigkeitswert) in the chat
     */
    get points() {
        return parseInt(this.actor.system.skills[this.id]?.value || 0);
    }

    /**
     * Override attributeValues to return empty object since creatures don't use attributes
     */
    get attributeValues() {
        return {};
    }

    /**
     * Override formula to show only the fixed value
     */
    getFormula() {
        let formula = new Tooltip.TooltipFormula();
        formula.addPart(parseInt(this.actor.system.skills[this.id]?.value || 0), game.i18n.localize("splittermond.skillValueAbbrev"));
        this.addModifierTooltipFormulaElements(formula);
        return formula;
    }
}
