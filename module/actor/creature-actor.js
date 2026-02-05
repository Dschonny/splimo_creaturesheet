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
        const data = this.system;

        // Character-specific modifiers (hero levels)
        if (this.type === "character") {
            if (data.experience.heroLevel > 1) {
                ["defense", "mindresist", "bodyresist"].forEach(d => {
                    this.modifier.add(d, game.i18n.localize(`splittermond.heroLevels.${data.experience.heroLevel}`), 2 * (data.experience.heroLevel - 1), this);
                });
                this.modifier.add("splinterpoints", game.i18n.localize(`splittermond.heroLevels.${data.experience.heroLevel}`), data.experience.heroLevel - 1);
            }
        }

        // SKIP the size modifier for stealth - creatures have fixed skill values
        // Original code:
        // let stealthModifier = 5 - this.derivedValues.size.value;
        // if (stealthModifier) {
        //     this.modifier.add("stealth", game.i18n.localize("splittermond.derivedAttribute.size.short"), stealthModifier);
        // }

        // Handicap modifiers
        let handicap = this.handicap;
        if (handicap) {
            let label = game.i18n.localize("splittermond.handicap");
            ["athletics", "acrobatics", "dexterity", "stealth", "locksntraps", "seafaring", "animals"].forEach(skill => {
                this.modifier.add(skill, label, -handicap, this, "equipment");
            });
            this.modifier.add("speed", label, -Math.floor(handicap / 2));
        }
    }
}
