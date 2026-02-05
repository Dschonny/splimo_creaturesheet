// Import the base Skill class from Splittermond system
const Skill = (await import("/systems/splittermond/module/actor/skill.js")).default;
const Tooltip = await import("/systems/splittermond/module/util/tooltip.js");

/**
 * Creature Skill - Extends the base Skill class with fixed values
 * Creatures have fixed skill values that are not calculated from attributes
 */
export default class CreatureSkill extends Skill {

    /**
     * Get the size modifier label for filtering
     */
    get _sizeModifierLabel() {
        return game.i18n.localize("splittermond.derivedAttribute.size.short");
    }

    /**
     * Check if a modifier is the size modifier for stealth
     */
    _isSizeModifier(mod) {
        return this.id === "stealth" && mod.name === this._sizeModifierLabel;
    }

    /**
     * Override mod getter to exclude size modifier for stealth
     * Size is already factored into creature's fixed skill value
     */
    get mod() {
        // Get all static modifiers, excluding size modifier for stealth
        const modifiers = this.actor.modifier.static(this._modifierPath)
            .filter(mod => !this._isSizeModifier(mod));

        let total = modifiers.reduce((acc, mod) => acc + parseInt(mod.value), 0);

        // Apply equipment and magic bonus caps
        let bonusEquipment = modifiers.filter(mod => mod.type === "equipment" && mod.isBonus)
            .reduce((acc, mod) => acc + mod.value, 0);
        let bonusMagic = modifiers.filter(mod => mod.type === "magic" && mod.isBonus)
            .reduce((acc, mod) => acc + mod.value, 0);

        total -= Math.max(0, bonusEquipment - this.actor.bonusCap);
        total -= Math.max(0, bonusMagic - this.actor.bonusCap);

        return total;
    }

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
     * Override points getter to return the base value for creatures
     * This will be displayed as "FP" in the chat
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
     * Override to exclude size modifier from tooltip
     */
    addModifierTooltipFormulaElements(formula, bonusPrefix = "+", malusPrefix = "-") {
        this.actor.modifier.static(this._modifierPath)
            .filter(mod => !this._isSizeModifier(mod))
            .forEach((e) => {
                e.addTooltipFormulaElements(formula, bonusPrefix, malusPrefix);
            });
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
