/**
 * Refinement (Verfeinerung) item class for creatures
 */
export class RefinementItem extends Item {

  /**
   * Prepare derived data for refinements
   */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Ensure proper data structure
    if (!this.system.kategorie) {
      this.system.kategorie = "sonstiges";
    }

    if (!this.system.kosten) {
      this.system.kosten = 0;
    }
  }

  /**
   * Get the linked weapon item if exists
   */
  getLinkedWeapon() {
    if (!this.system.zusaetzlicheWaffeId) return null;

    const actor = this.parent;
    if (!actor) return null;

    return actor.items.get(this.system.zusaetzlicheWaffeId);
  }

  /**
   * Get localized category name
   */
  getCategoryLabel() {
    const key = `CREATURE.RefinementCategories.${this.system.kategorie}`;
    return game.i18n.localize(key);
  }
}
