// Import the base Skill class from Splittermond system
const Skill = (await import("/systems/splittermond/module/actor/skill.js")).default;
const Tooltip = await import("/systems/splittermond/module/util/tooltip.js");

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
        value += this.mod;

        if (this._cache.enabled && this._cache.value === null)
            this._cache.value = value;
        return value;
    }

    /**
     * Override points getter to return 0 since creatures don't use the points system
     */
    get points() {
        return 0;
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
