// Import the base DerivedValue class from Splittermond system
const DerivedValue = (await import("/systems/splittermond/module/actor/derived-value.js")).default;

/**
 * Creature Derived Value - Uses fixed imported values without calculations
 * Creatures have fixed derived values that are not calculated from attributes
 */
export default class CreatureDerivedValue extends DerivedValue {

    /**
     * Override baseValue to always return the stored value
     * No calculations based on attributes
     */
    get baseValue() {
        return this.actor.system.derivedAttributes?.[this.id]?.value || 0;
    }

    /**
     * Override value to return baseValue directly without adding modifiers
     * Creatures have fixed values that should not be modified
     */
    get value() {
        if (this._cache.enabled && this._cache.value !== null) return this._cache.value;

        // For creatures, use the stored value directly without modifiers
        let value = this.baseValue;

        if (this._cache.enabled && this._cache.value === null)
            this._cache.value = value;
        return value;
    }

    /**
     * Override mod to return 0 - creatures don't use modifiers on derived values
     */
    get mod() {
        return 0;
    }

    /**
     * Override tooltip to return empty string - no calculation formula needed
     */
    tooltip() {
        return "";
    }
}
