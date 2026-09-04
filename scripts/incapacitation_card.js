// functions for the incapacitation card

import { BrCommonCard } from "./BrCommonCard.js";
import { BRSW2_CONST } from "./brsw2-const.js";
import {
    create_common_card,
    roll_trait,
    spendBenny,
    withButtonSpinner,
} from "./cards_common.js";
import { get_owner } from "./damage_card.js";
import { Utils, addEventListenerAll } from "./utils.js";


/**
 * Shows an incapacitation card
 * @param {string} token_id As it comes from damage its target is always a token
 */
export async function createIncapacitationCard(token_id) {
    let token = canvas.tokens.get(token_id);
    let { actor } = token;
    let user = get_owner(actor);
    // noinspection JSUnresolvedVariable
    const text = game.i18n.format("BRSW.IncapacitatedText", {
        token_name: token.name,
    });
    const text_after = game.i18n.localize("BRSW.IncapacitatedMustVigor");
    const brCard = await create_common_card(
        token,
        {
            header: {
                type: "",
                title: game.i18n.localize("BRSW.Incapacitation"),
                notes: token.name,
            },
            text: text,
            text_after: text_after,
            show_roll_injury: false,
            trait: Utils.traitFromString(actor, "vigor"),
        },
        "modules/betterrolls-swade2/templates/incapacitation_card.hbs",
    );
    brCard.update_list = { ...brCard.update_list, ...{ user: user.id } };
    brCard.type = BRSW2_CONST.BRSW_CARD_TYPES.TYPE_INC_CARD;
    await brCard.render();
    return brCard.message;
}

/**
 * Hooks the public functions to a global object
 */
export function exposeIncapacitationCardAPI() {
    Utils.exposeAPI("createIncapacitationCard", createIncapacitationCard, "create_incapacitation_card");
    Utils.exposeAPI("createInjuryCard", createInjuryCard, "create_injury_card");
    Utils.exposeAPI("createInjuryEffect", createInjuryEffect, "create_injury_effect");
}

/**
 * Checks if a benny has been expended and rolls in the incapacitation table.
 * @param ev
 */
function roll_incapacitation_clicked(ev, brCard) {
    ev.stopPropagation();
    let spendBenny = false;
    if (ev.currentTarget.classList.contains("roll-bennie-button")) {
        spendBenny = true;
    }
    // noinspection JSIgnoredPromiseFromCall
    withButtonSpinner(ev.currentTarget, () =>
        roll_incapacitation(brCard, spendBenny),
    );
}

/**
 * Activate the listeners of the incapacitation card
 * @param message Message date
 * @param html Html produced
 */
export function activateIncapacitationCardListeners(message, html) {
    const brCard = new BrCommonCard(message);
    addEventListenerAll(html, ".brsw-vigor-button, .brsw-roll-button", "click", (ev) => {
        roll_incapacitation_clicked(ev, brCard);
    });
    html.querySelector(".brsw-injury-button")?.addEventListener("click", (ev) => {
        // noinspection JSIgnoredPromiseFromCall
        brCard.closePopout(); //We assume we're done with the card at this point so close any popouts
        createInjuryCard(
            brCard.token_id,
            ev.currentTarget.dataset.injuryType,
        );
    });
}

/**
 * Males a vigor incapacitation roll
 * @param {BrCommonCard} brCard
 * @param {boolean} spend_benny
 */
async function roll_incapacitation(brCard, spend_benny) {
    if (spend_benny) {
        await spendBenny(brCard.actor);
    }
    await roll_trait(
        brCard,
        brCard.actor.system.attributes.vigor,
        game.i18n.localize(BRSW2_CONST.ATTRIBUTES_TRANSLATION_KEYS.vigor),
        {},
    );
    let result = 0;
    for (let roll of brCard.traitRoll.rolls) {
        for (let die of roll.dice) {
            if (die.result !== null) {
                result = Math.max(die.finalTotal, result);
            }
        }
    }
    brCard.render_data.show_roll_injury = true;
    brCard.render_data.injury_type = "none";
    if (brCard.traitRoll.currentRoll.isCritFail) {
        brCard.render_data.text_after = `</p><p>${game.i18n.localize(
            "BRSW.Fumble",
        )}</p><p>${brCard.token.name} ${game.i18n.localize("BRSW.IsDead")}</p>`;
        brCard.render_data.show_roll_injury = false; // For what...
        await brCard.actor.toggleStatusEffect("incapacitated", { active: false });
        await brCard.actor.toggleStatusEffect("dead", { active: true });
    } else if (result < 4) {
        brCard.render_data.text_after = game.i18n.localize(
            "BRSW.BleedingOutResult",
        );
        brCard.render_data.injury_type = "permanent";
        if (brCard.actor.statuses.has("incapacitated")) {
            await brCard.actor.toggleStatusEffect("incapacitated", {
                active: false,
            });
            await brCard.actor.toggleStatusEffect("incapacitated", {
                active: true,
                overlay: false,
            });
        } //add it as regular (small) icon
        // noinspection ES6MissingAwait
        const ignoreBleedOut =
            game.settings.get("swade", "heroesNeverDie") ||
            brCard.actor.getFlag("swade", "ignoreBleedOut");
        if (!ignoreBleedOut) {
            brCard.actor.toggleStatusEffect("bleeding-out", { active: true, overlay: true })
                .catch(() => {
                    console.error("Error while applying bleeding out");
                });
        } //make bleeding out overlay
    } else if (result < 8) {
        brCard.render_data.text_after = game.i18n.localize("BRSW.TempInjury");
        brCard.render_data.injury_type = "temporal-wounds";
    } else {
        brCard.render_data.text_after = game.i18n.localize("BRSW.TempInjury24");
        brCard.render_data.injury_type = "temporal-24";
    }
    await brCard.render();
    await brCard.save();
}

/**
 * Shows an injury card and rolls it.
 * @param token_id
 * @param {string} reason Reason for the injury
 */
export async function createInjuryCard(token_id, reason) {
    let token = canvas.tokens.get(token_id);
    let { actor } = token;
    let user = get_owner(actor);
    // First roll
    let first_roll = new Roll("2d6");
    await first_roll.evaluate();
    if (!game.dice3d) {
        game.audio.play(CONFIG.sounds.dice, { context: game.audio.interface });
    }
    if (game.dice3d) {
        // noinspection ES6MissingAwait
        await game.dice3d.showForRoll(first_roll, game.user, true);
    }
    const first_result = read_table(BRSW2_CONST.INJURY_BASE, parseInt(first_roll.result));
    let second_result = "";
    // Check for another roll
    let second_roll = new Roll("1d6");
    for (let table in BRSW2_CONST.SECOND_INJURY_TABLES) {
        if (BRSW2_CONST.SECOND_INJURY_TABLES.hasOwnProperty(table) && first_result === table) {
            await second_roll.evaluate();
            if (game.dice3d) {
                // noinspection ES6MissingAwait
                await game.dice3d.showForRoll(second_roll, game.user, true);
            }
            second_result = read_table(
                BRSW2_CONST.SECOND_INJURY_TABLES[table],
                parseInt(second_roll.result),
            );
        }
    }
    let injury_effect = await createInjuryEffect(actor, reason, first_result, second_result);
    let brCard = await create_common_card(
        token,
        {
            header: {
                type: "",
                title: game.i18n.localize("BRSW.InjuryCard"),
                notes: token.name,
            },
            first_roll: first_roll,
            second_roll: second_roll,
            first_location: game.i18n.localize(first_result),
            second_location: game.i18n.localize(second_result),
        },
        "modules/betterrolls-swade2/templates/injury_card.hbs",
    );
    brCard.update_list = { ...brCard.update_list, ...{ user: user.id } };
    brCard.type = BRSW2_CONST.BRSW_CARD_TYPES.TYPE_INJ_CARD;
    brCard.basicRoll = true;
    brCard.showPopout = false; //The injury result has no action, so we don't show the popout
    await brCard.render();
    Hooks.call("BRSW-InjuryAEApplied", brCard, injury_effect, reason);
    return brCard.message;
}

/**
 * Reads the result on a table
 * @param {object} table
 * @param {Number} value
 */
function read_table(table, value) {
    let result;
    for (let index in table) {
        if (table.hasOwnProperty(index) && parseInt(index) <= value) {
            result = table[index];
        }
    }
    return result;
}

/**
 * Creates an injury active effect on the designated actor
 * @param actor
 * @param {string} reason Reason for the injury
 * @param {string} first_result The first result of an injury roll e.g. BRSW.Guts
 * @param {string} second_result The second result of an injury roll e.g. BRSW.Broken
 */
export async function createInjuryEffect(actor, reason, first_result, second_result) {
    const active_effect_index = `${first_result}+${second_result}`;
    let new_effect;
    let injury_effect;
    if (BRSW2_CONST.INJURY_ACTIVE_EFFECT.hasOwnProperty(active_effect_index)) {
        new_effect = { ...BRSW2_CONST.INJURY_ACTIVE_EFFECT[active_effect_index] };
        new_effect.name = game.i18n.localize(first_result);
        if (second_result) {
            if (first_result === "BRSW.Guts") {
                new_effect.name =
                    game.i18n.localize(second_result) + " " + new_effect.name;
            } else {
                new_effect.name = game.i18n.localize(second_result);
            }
        }
        const injury_duration_name =
            reason === "permanent"
                ? "BRSW.PermanentInjuryName"
                : reason === "temporal-wounds"
                    ? "BRSW.TempInjuryName"
                    : "BRSW.TempInjury24Name";
        new_effect.name += game.i18n.localize(injury_duration_name);
        new_effect.img = "/systems/swade/assets/icons/skills/medical-pack.svg";
        injury_effect = await actor.createEmbeddedDocuments("ActiveEffect", [
            new_effect,
        ]);
    }
    return injury_effect;
}
