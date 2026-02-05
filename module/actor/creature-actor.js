import CreatureSkill from "./creature-skill.js";

// Import the base Actor class from Splittermond system
const SplittermondActor = game.splittermond?.apps?.SplittermondActor ||
  (await import("/systems/splittermond/module/actor/actor.js")).default;

/**
 * Creature Actor - Extends the base Actor with creature-specific behavior
 * Main difference: Uses CreatureSkill instead of regular Skill for fixed skill values
 */
export default class CreatureActor extends SplittermondActor {

    /**
     * Override prepareBaseData to use CreatureSkill instead of Skill
     */
    prepareBaseData() {
        console.log("CreatureActor.prepareBaseData() called");

        // Call parent prepareBaseData, but force re-creation of skills
        // Set skills to null first so parent will create them
        this.skills = null;
        super.prepareBaseData();

        // Now replace all skills with CreatureSkill instances
        console.log("Replacing skills with CreatureSkill instances");
        [...CONFIG.splittermond.skillGroups.general, ...CONFIG.splittermond.skillGroups.magic].forEach(id => {
            this.skills[id] = new CreatureSkill(this, id);
        });
    }

    /**
     * Override _prepareModifier to exclude size modifier for stealth
     * Creatures have fixed skill values that already include size considerations
     */
    _prepareModifier() {
        // Call parent to get all standard modifiers
        super._prepareModifier();

        // Remove the size modifier from stealth (it's already in the creature's fixed value)
        const sizeLabel = game.i18n.localize("splittermond.derivedAttribute.size.short");

        // Find and remove the size modifier for stealth
        if (this.modifier && this.modifier._modifiers && this.modifier._modifiers.stealth) {
            this.modifier._modifiers.stealth = this.modifier._modifiers.stealth.filter(mod =>
                mod.name !== sizeLabel
            );
        }
    }
}
