/**
 * Training (Abrichtung) item class for creatures
 */
export class TrainingItem extends Item {

  /**
   * Prepare derived data for training
   */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Ensure proper data structure
    if (!this.system.kategorie) {
      this.system.kategorie = "sonstiges";
    }

    if (!this.system.potenzialKosten) {
      this.system.potenzialKosten = 0;
    }

    if (!this.system.customMeisterschaften) {
      this.system.customMeisterschaften = [];
    }
  }

  /**
   * Get localized category name
   */
  getCategoryLabel() {
    const key = `CREATURE.TrainingCategories.${this.system.kategorie}`;
    return game.i18n.localize(key);
  }

  /**
   * Parse great tricks choice (e.g., "2xS1" = two S1 masteries)
   */
  parseGreatTricksChoice() {
    const choice = this.system.grosseTricksWahl;
    if (!choice) return [];

    const tricks = [];
    const parts = choice.split('+');

    for (const part of parts) {
      const match = part.match(/(\d+)x(S\d+)|S(\d+)/);
      if (match) {
        const count = match[1] ? parseInt(match[1]) : 1;
        const level = match[2] || `S${match[3]}`;

        for (let i = 0; i < count; i++) {
          tricks.push(level);
        }
      }
    }

    return tricks;
  }
}
