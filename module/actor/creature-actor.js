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
     * Override prepareDerivedData to use CreatureSkill instead of Skill
     */
    prepareDerivedData() {
        // Call parent prepareDerivedData first, but we'll override skills
        super.prepareDerivedData();

        // Re-initialize skills with CreatureSkill instead of Skill
        if (this.skills) {
            // Replace each skill with a CreatureSkill instance
            [...CONFIG.splittermond.skillGroups.general, ...CONFIG.splittermond.skillGroups.magic].forEach(id => {
                this.skills[id] = new CreatureSkill(this, id);
            });
        }
    }
}
