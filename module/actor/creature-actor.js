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
}
