// functions for the unshake and maybe un-stun card //
/* globals canvas, game, CONST, Hooks, succ, console */

import { BrCommonCard } from "./BrCommonCard.js";
import * as BRSW2_CONFIG from "./brsw2-config.js";
import { BRSW2_CONST } from "./brsw2-const.js";
import {
    create_common_card,
    process_common_actions,
    roll_trait,
    spendBenny,
    withButtonSpinner,
} from "./cards_common.js";
import { get_owner } from "./damage_card.js";
import { TraitModifier } from "./modifiers.js";
import { SettingsUtils, Utils, addEventListenerAll } from "./utils.js";

/**
 * Shows the unshaken card
 * @param {ChatMessage} original_message
 * @param {SwadeActor} actor
 * @param {Number} type
 */
async function createRemoveStatusCard(original_message, actor, type) {
    let tokenId;
    if (original_message) {
        const originalCard = new BrCommonCard(original_message);
        actor = originalCard.actor;
        tokenId = originalCard.token?.id ?? originalCard.token_id;
    } else if (actor) {
        tokenId = actor.token ? actor.token.id : actor.getActiveTokens()[0].id;
    }
    if (type === BRSW2_CONST.BRSW_CARD_TYPES.TYPE_RENDING_CARD) {
        if (!actor.statuses.has(BRSW2_CONST.RENDING_ATTACK_NAME)) {
            return;
        }
    } else if (!actor.system.status.isShaken && !actor.system.status.isStunned) {
        return;
    }
    let user = get_owner(actor);
    let text, titleName, rollTitle, traitName;
    if (type === BRSW2_CONST.BRSW_CARD_TYPES.TYPE_UNSHAKE_CARD) {
        text = game.i18n.format("BRSW.UnshakenText", { token_name: actor.name });
        titleName = "BRSW.Unshake";
        rollTitle = game.i18n.localize("BRSW.SpiritRoll");
        traitName = "spirit";
    } else if (type === BRSW2_CONST.BRSW_CARD_TYPES.TYPE_RENDING_CARD) {
        text = game.i18n.format("BRSW.RendingAttackText", { token_name: actor.name });
        titleName = "BRSW.RendingAttack";
        rollTitle = game.i18n.localize("BRSW.VigorRoll");
        traitName = "vigor";
    } else {
        text = game.i18n.format("BRSW.UnstunText", { token_name: actor.name });
        titleName = "BRSW.Unstun";
        rollTitle = game.i18n.localize("BRSW.VigorRoll");
        traitName = "vigor";
    }
    const brCard = await create_common_card(
        actor,
        {
            header: {
                type: "",
                title: game.i18n.localize(titleName),
                notes: actor.name,
            },
            roll_title: rollTitle,
            text: text,
            show_roll_injury: false,
            trait: Utils.traitFromString(actor, traitName),
        },
        "modules/betterrolls-swade2/templates/remove_status_card.hbs",
    );
    brCard.update_list = { ...brCard.update_list, ...{ user: user.id } };
    brCard.type = type;
    brCard.token_id = tokenId;
    await brCard.render();
    return brCard.message;
}

export async function createUnshakeCard(original_message, token_id) {
    await createRemoveStatusCard(
        original_message,
        token_id,
        BRSW2_CONST.BRSW_CARD_TYPES.TYPE_UNSHAKE_CARD,
    );
}

/**
 * Shows the unstun card
 * @param {ChatMessage} original_message
 * @param {Number} token_id
 */
export async function createUnstunCard(original_message, token_id) {
    await createRemoveStatusCard(
        original_message,
        token_id,
        BRSW2_CONST.BRSW_CARD_TYPES.TYPE_UNSTUN_CARD,
    );
}

/**
 * Shows the rending attack card
 * @param {ChatMessage} original_message
 * @param {SwadeActor} actor
 */
export async function createRendingAttackCard(original_message, actor) {
    await createRemoveStatusCard(
        original_message,
        actor,
        BRSW2_CONST.BRSW_CARD_TYPES.TYPE_RENDING_CARD,
    );
}

/**
 * Activate the listeners of the unshake card
 * @param {BrCommonCard} brCard
 * @param html Html produced
 * @param card_type Type of card
 */
export function activateRemoveStatusCardListeners(
    brCard,
    html,
    card_type,
) {
    let roll_function;
    if (card_type === BRSW2_CONST.BRSW_CARD_TYPES.TYPE_UNSHAKE_CARD) {
        roll_function = rollUnshaken;
    } else if (card_type === BRSW2_CONST.BRSW_CARD_TYPES.TYPE_RENDING_CARD) {
        roll_function = rollRendingAttack;
        addEventListenerAll(html, ".brsw-apply-wound-button", "click", (ev) => {
            ev.stopPropagation();
            applyRendingWound(brCard);
        });
    } else {
        roll_function = rollUnstun;
    }
    addEventListenerAll(html, ".brsw-spirit-button, .brsw-roll-button", "click", (ev) => {
        ev.stopPropagation();
        let spendBenny = false;
        if (
            ev.currentTarget.classList.contains("roll-bennie-button") ||
            ev.currentTarget.classList.contains("brsw-soak-button")
        ) {
            spendBenny = true;
        }
        // noinspection JSIgnoredPromiseFromCall
        withButtonSpinner(ev.currentTarget, () => roll_function(brCard, spendBenny));
    });
}

/**
 * Checks if a benny has been expended and rolls to remove shaken
 * @param {BrCommonCard} brCard
 * @param {Boolean} expendBennie
 */
async function rollUnshaken(brCard, expendBennie) {
    if (expendBennie) {
        // remove shaken
        await spendBenny(brCard.actor);
        brCard.render_data.text = game.i18n.format("BRSW.UnshakeBennie", {
            name: brCard.actor.name,
        });
        brCard.actor
            .toggleStatusEffect("shaken", { active: false })
            .catch(console.error("Error removing shaken") || false);
    } else {
        // Check for Edges & Abilities
        const modifiers = await check_abilities(brCard.actor);
        // Make the roll
        await roll_trait(
            brCard,
            brCard.actor.system.attributes.spirit,
            game.i18n.localize(BRSW2_CONST.ATTRIBUTES_TRANSLATION_KEYS.spirit),
            { modifiers: modifiers },
        );
        let result = 0;
        for (let roll of brCard.traitRoll.rolls) {
            for (let die of roll.dice) {
                if (die.result !== null) {
                    result = Math.max(die.finalTotal, result);
                }
            }
        }
        if (result >= 4) {
            if (SettingsUtils.getWorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.swdUnshake) === true && result < 8) {
                brCard.render_data.text = game.i18n.format(
                    "BRSW.UnshakeSuccessfulRollSWD",
                    { name: brCard.actor.name },
                );
            } else {
                brCard.render_data.text = game.i18n.format(
                    "BRSW.UnshakeSuccessfulRoll",
                    { name: brCard.actor.name },
                );
            }
            brCard.actor.toggleStatusEffect("shaken", { active: false });
        } else {
            brCard.render_data.text = game.i18n.format("BRSW.UnshakeFailure", {
                name: brCard.actor.name,
            });
        }
    }
    await brCard.render();
    await brCard.save();
    Hooks.call("BRSW-Unshake", brCard, brCard.actor);
}

async function check_abilities(actor) {
    let edgeAndAbilityNames = [
        game.i18n.localize("BRSW.EdgeName.CombatReflexes"), // index #0
        game.i18n.localize("BRSW.AbilityName.DemonHellfrost"), // index #1
        game.i18n.localize("BRSW.AbilityName.Construct"), // index #2
        game.i18n.localize("BRSW.AbilityName.Undead"), // index #3
        game.i18n.localize("BRSW.AbilityName.Amorphous"), // index #4
    ];
    // Making all names lower case:
    edgeAndAbilityNames = edgeAndAbilityNames.map((name) => name.toLowerCase());
    // Check if these have an AE (using .entries() to not loose the index):
    for (let [index, value] of edgeAndAbilityNames.entries()) {
        let effect = actor.appliedEffects.find(
            (active_e) => active_e.name.toLowerCase() === value, // jshint ignore:line
        );
        // Only splice if the AE affects the generic bonus:
        let affectsUnshake = false;
        if (effect) {
            for (let change of effect.changes) {
                if (change.key === "system.attributes.spirit.unShakeBonus") {
                    affectsUnshake = true;
                }
            }
        }
        // Remove from the list if ae is present and affects the generic bonus:
        if (effect && affectsUnshake === true) {
            edgeAndAbilityNames.splice(index, 1);
        }
    }
    // Adding AE bonuses
    let effectName = [];
    let effectValue = [];
    for (let effect of actor.appliedEffects) {
        if (effect.disabled === false) {
            // only apply changes if effect is enabled
            for (let change of effect.changes) {
                if (change.key === "system.attributes.spirit.unShakeBonus") {
                    //Building an array of effect names and icons that affect the unShakeBonus
                    effectName.push(effect.name);
                    effectValue.push(change.value);
                }
            }
        }
    }
    // Get generic modifier
    let genericMod = parseInt(actor.system.attributes.spirit.unShakeBonus);
    if (effectValue.length > 0 && genericMod !== 0) {
        for (let each of effectValue) {
            genericMod -= each;
        }
    }
    // Checking if the actor has the Edges and Abilities:
    const edgesAndAbilities = actor.items.filter(function (item) {
        return (
            edgeAndAbilityNames.includes(item.name.toLowerCase()) &&
            (item.type === "edge" || item.type === "ability")
        );
    });

    // Building the final array of modifiers to be passed:
    let modifiers = [];
    for (let each of edgesAndAbilities) {
        modifiers.push({
            name: each.name,
            value: 2,
        });
    }
    for (let i = 0; i < effectName.length; i++) {
        modifiers.push({
            name: effectName[i],
            value: parseFloat(effectValue[i]),
        });
    }
    if (genericMod !== 0) {
        modifiers.push({
            name: "Generic Modifier",
            value: genericMod,
        });
    }
    // Returning the modifier array:
    return modifiers;
}

/**
 * Sets the reroll mode, adds reroll modifiers from actions (e.g. Elan) and spends a benny if needed
 * Only reroll actions are processed as these cards don't show the actions menu
 * @param {BrCommonCard} brCard
 * @param {Boolean} expendBenny
 * @param {Object} extraData
 */
async function prepareReroll(brCard, expendBenny, extraData) {
    for (const action of brCard.getSelectedActions()) {
        if (action.code.rerollSkillMod) {
            process_common_actions(action.code, extraData, [], brCard.actor);
        }
    }
    if (brCard.traitRoll.is_rolled) {
        brCard.traitRoll.reroll_mode = expendBenny ? "benny" : "free";
    }
    if (expendBenny) {
        await spendBenny(brCard.actor);
    }
}

/**
 * Roll to remove stunned
 * @param {BrCommonCard} brCard
 * @param {Boolean} expendBenny
 */
async function rollUnstun(brCard, expendBenny) {
    let extra_options = {};
    await prepareReroll(brCard, expendBenny, extra_options);
    // Unstun Bonus
    if (brCard.actor.system.attributes.vigor.unStunBonus) {
        const bonus = parseInt(brCard.actor.system.attributes.vigor.unStunBonus);
        if (bonus) {
            extra_options.modifiers = [
                new TraitModifier(game.i18n.localize("BRSW.UnstunBonus"), bonus),
            ];
            extra_options.total_modifiers += bonus;
        }
    }
    await roll_trait(
        brCard,
        brCard.actor.system.attributes.vigor,
        game.i18n.localize(BRSW2_CONST.ATTRIBUTES_TRANSLATION_KEYS.vigor),
        extra_options,
    );
    let result = 0;
    for (let roll of brCard.traitRoll.rolls) {
        for (let die of roll.dice) {
            if (die.result !== null) {
                result = Math.max(die.finalTotal, result);
            }
        }
    }
    if (result >= 4) {
        brCard.render_data.text = game.i18n.format("BRSW.UnstunSuccessfulRoll", {
            name: brCard.actor.name,
        });
        brCard.actor.toggleStatusEffect("stunned", { active: false })
            .catch(console.error("Error removing stunned") || false);
    } else {
        brCard.render_data.text = game.i18n.format("BRSW.UnstunFailure", {
            name: brCard.actor.name,
        });
    }
    await brCard.render();
    await brCard.save();
    Hooks.call("BRSW-Unstun", brCard, brCard.actor);
}

/**
 * Gets the rending attack effect of an actor
 * @param {SwadeActor} actor
 */
function getRendingEffect(actor) {
    return actor.effects.find((effect) => effect.statuses.has(BRSW2_CONST.RENDING_ATTACK_NAME));
}

/**
 * Roll vigor to resist a rending attack
 * @param {BrCommonCard} brCard
 * @param {Boolean} expendBenny
 */
async function rollRendingAttack(brCard, expendBenny) {
    if (brCard.render_data.rendingWoundApplied) {
        return;
    }
    const extraData = {};
    await prepareReroll(brCard, expendBenny, extraData);
    await roll_trait(
        brCard,
        brCard.actor.system.attributes.vigor,
        game.i18n.localize(BRSW2_CONST.ATTRIBUTES_TRANSLATION_KEYS.vigor),
        extraData,
    );
    await resolveRendingAttack(brCard);
}

/**
 * Applies the outcome of the currently selected rending attack roll
 * Raise stops the bleeding, success avoids the wound, failure offers to apply a wound
 * @param {BrCommonCard} brCard
 */
export async function resolveRendingAttack(brCard) {
    const currentRoll = brCard.traitRoll.currentRoll;
    let result = null;
    for (const die of currentRoll.dice) {
        if (die.result !== null) {
            result = Math.max(die.result, result ?? die.result);
        }
    }
    const actor = brCard.actor;
    let effect = getRendingEffect(actor);
    brCard.render_data.showApplyWound = false;
    if (!currentRoll.isCritFail && result >= 4) {
        brCard.render_data.text = game.i18n.format("BRSW.RendingAttackRaise", {
            name: actor.name,
        });
        await effect?.delete();
    } else {
        if (!effect) {
            // A previously selected roll was a raise and removed the effect
            await actor.toggleStatusEffect(BRSW2_CONST.RENDING_ATTACK_NAME, { active: true });
            effect = getRendingEffect(actor);
        }
        if (!currentRoll.isCritFail && result >= 0) {
            brCard.render_data.text = game.i18n.format("BRSW.RendingAttackSuccess", {
                name: actor.name,
            });
            await effect?.resetDuration();
        } else {
            brCard.render_data.text = game.i18n.format("BRSW.RendingAttackFailure", {
                name: actor.name,
            });
            brCard.render_data.showApplyWound = true;
        }
    }
    await brCard.render();
    await brCard.save();
    Hooks.call("BRSW-RendingAttack", brCard, actor);
}

/**
 * Applies the wound from a failed rending attack roll
 * @param {BrCommonCard} brCard
 */
async function applyRendingWound(brCard) {
    if (brCard.render_data.rendingWoundApplied) {
        return;
    }
    const actor = brCard.actor;
    const finalWounds = actor.system.wounds.value + 1;
    if (finalWounds > actor.system.wounds.max) {
        const downedCondition = actor.isWildcard ? "incapacitated" : "dead";
        await actor.toggleStatusEffect(downedCondition, { active: true, overlay: true });
    }
    await actor.update({
        "system.wounds.value": Math.min(finalWounds, actor.system.wounds.max),
    });
    await getRendingEffect(actor)?.resetDuration();
    brCard.render_data.text = game.i18n.format("BRSW.RendingAttackWounded", {
        name: actor.name,
    });
    brCard.render_data.showApplyWound = false;
    brCard.render_data.rendingWoundApplied = true;
    await brCard.render();
    await brCard.save();
}
