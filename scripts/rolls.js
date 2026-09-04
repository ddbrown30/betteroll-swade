// Definition of the roll clases
/* global game */

import { detectCritFail } from "./cards_common.js";

class Die {
    constructor(data) {
        this.sides = 0;
        this.extraClass = ""; // Extra class for rendering this die
        this.rawTotal = null; // Number rolled counting explosions
        this.modifiers = 0; // Modifiers to the roll
        this.result = null; // Result (total - target number) usually
        this.label = game.i18n.localize("BRSW.TraitDie");
        this.wild_die = false;
        if (data) {
            Object.assign(this, data);
        }
    }

    // noinspection JSUnusedGlobalSymbols, used in templates
    get result_text() {
        if (this.result === null) {
            return "";
        }
        if (this.result < 0) {
            return game.i18n.localize("BRSW.Failure");
        } else if (this.result < 4) {
            return game.i18n.localize("BRSW.Success");
        } else if (this.result < 8) {
            return game.i18n.localize("BRSW.Raise");
        } else {
            const raises = Math.floor(this.result / 4);
            return game.i18n.localize("BRSW.RaisePlural") + " " + raises;
        }
    }

    // noinspection JSUnusedGlobalSymbols, used in templates
    get result_icon() {
        if (this.result === null) {
            return "";
        } else if (this.result < 0) {
            return "brsw-red-text fas fa-xmark fa-xs";
        } else if (this.result < 4) {
            return "brsw-lime-text fas fa-check fa-xs";
        } else {
            return "brsw-lime-text fas fa-check-double fa-xs";
        }
    }

    // noinspection JSUnusedGlobalSymbols, used in templates
    get unexploded() {
        const unexplodedDie = [];
        let currentTotal = this.rawTotal;
        let out = false;
        while (!out) {
            if (currentTotal > this.sides) {
                unexplodedDie.push(this.sides);
                currentTotal -= this.sides;
            } else {
                unexplodedDie.push(currentTotal);
                out = true;
            }
        }
        return unexplodedDie;
    }

    get finalTotal() {
        return this.rawTotal + this.modifiers;
    }

    // noinspection JSUnusedGlobalSymbols, used in templates
    get is_not_discarded() {
        return this.result !== null;
    }

    // noinspection JSUnusedGlobalSymbols, used in templates
    get exploded() {
        return this.rawTotal > this.sides;
    }
}

class SingleRoll {
    constructor(data) {
        this.dice = [];
        this.isCritFail = false;
        this.isShorting = false;
        if (data) {
            this.load(data);
        }
    }

    add_roll(roll, wild_die, modifiers) {
        roll.terms.forEach((term) => {
            if (term.hasOwnProperty("_faces")) {
                let newDie = new Die(null);
                if (term.total === 1) {
                    newDie.extraClass = " brsw-red-text";
                }
                newDie.sides = term.faces;
                newDie.rawTotal = term.total;
                newDie.modifiers = modifiers;
                newDie.label = term.flavor ?? newDie.label;
                this.dice.push(newDie);
            }
        });
        if (wild_die) {
            this.dice[this.dice.length - 1].label =
                game.i18n.localize("SWADE.WildDie");
            this.dice[this.dice.length - 1].wild_die = wild_die;
        }
    }

    async calculateTraitResults(tn, hasWildDie, isShorting) {
        if (isShorting !== undefined) {
            this.isShorting = isShorting;
        }
        let minimumValue = 10000000;
        let highestTotal = -10000000;
        let minPosition = 0;
        let numFumbleResults = 0;
        for (const [index, roll] of this.dice.entries()) {
            numFumbleResults += roll.rawTotal == 1;
            if (roll.rawTotal <= minimumValue) {
                minPosition = index;
                minimumValue = roll.rawTotal;
            }
            if (roll.finalTotal > highestTotal) {
                highestTotal = roll.finalTotal;
            }
            roll.result = roll.finalTotal - tn;
        }

        this.removeDiscardedDie();

        // Mark the lower die as discarded.
        if (hasWildDie && this.dice.length) {
            this.dice[minPosition].extraClass += " brsw-discarded-roll";
            this.dice[minPosition].result = null;
        }

        this.isCritFail = await detectCritFail(hasWildDie, numFumbleResults, this.dice);

        //If we're shorting, any failed roll is a crit fail
        this.isCritFail = this.isCritFail || (this.isShorting && highestTotal < tn);
    }

    removeDiscardedDie() {
        for (let die of this.dice) {
            die.extraClass = die.extraClass.replace(/ brsw-discarded-roll/g, "");
        }
    }

    load(data) {
        Object.assign(this, data);
        let new_dice = [];
        for (let die of this.dice) {
            new_dice.push(new Die(die));
        }
        this.dice = new_dice;
    }
}

export class TraitRoll {
    constructor() {
        this.rolls = [];
        this.tn = 4;
        this.tn_reason = "BRSW.Default";
        this.target_id = null;
        this.wild_die = null;
        this.modifiers = [];
        this.selected_roll_index = null;
    }

    get is_rolled() {
        return this.rolls.length > 0;
    }

    /**
     * Adds a Foundry roll to the trait roll
     * @param roll
     */
    async add_roll(roll, isShorting) {
        const new_roll = new SingleRoll(null);
        new_roll.add_roll(roll, this.wild_die, this.total_modifiers);
        await new_roll.calculateTraitResults(this.tn, this.wild_die, isShorting);
        this.rolls.push(new_roll);
        this.selected_roll_index = this.rolls.indexOf(new_roll);
    }

    get currentRoll() {
        if (this.rolls.length > 0) {
            return this.rolls[this.selected_roll_index];
        }
    }

    get old_rolls() {
        return this.rolls.filter((arr, index) => {
            return index !== this.selected_roll_index;
        });
    }

    get total_modifiers() {
        let total = 0;
        this.modifiers.forEach((mod) => {
            if (mod && mod.value) {
                total += mod.value;
            }
        });
        // Round down the total in case it's a floating number
        return Math.floor(total);
    }

    /**
     * Loads data from an object
     * @param data
     */
    load(data) {
        Object.assign(this, data);
        let new_rolls = [];
        for (let roll of this.rolls) {
            new_rolls.push(new SingleRoll(roll));
        }
        this.rolls = new_rolls;
    }

    get rof() {
        if (this.currentRoll) {
            const wild_die = this.wild_die ? -1 : 0;
            return this.currentRoll.dice.length + wild_die;
        }
    }

    async recalculateTraitResults() {
        this._deep_update_modifiers();
        for (let roll of this.rolls) {
            await roll.calculateTraitResults(this.tn, this.wild_die);
        }
    }

    delete_range_modifiers() {
        this.modifiers = this.modifiers.filter(modifier => modifier.type !== "range");
    }

    _deep_update_modifiers() {
        for (let roll of this.rolls) {
            for (let die of roll.dice) {
                die.modifiers = this.total_modifiers;
            }
        }
    }
}
