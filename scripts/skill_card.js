// Functions for cards representing skills
/* globals TokenDocument, Token, game, CONST, canvas, console, Ray, succ, fromUuid, ui, $ */

import {
    BRSW_CONST,
    create_common_card,
    get_action_from_click,
    get_actor_from_ids,
    roll_trait,
    spend_bennie,
    trait_to_string,
    process_common_actions,
} from "./cards_common.js";
import { run_macros } from "./item_card.js";
import {
    SettingsUtils,
    Utils,
    addEventListenerAll,
    measureDistance,
} from "./utils.js";
import { BrCommonCard } from "./BrCommonCard.js";
import { TraitModifier } from "./modifiers.js";

/**
 * Creates a chat card for a skill
 *
 * @param {Token, SwadeActor} origin  The actor or token who is creating this card
 * @param {string} skill_id The id of the skill that we want to show
 * @param {object} actions_stored An object with action ids as properties
 *   and a boolean meaning if they need to set on or off
 * @param {SwadeActor} vehicle
 * @return {Promise} A promise for the ChatMessage object
 */
async function create_skill_card(
    origin,
    skill_id,
    { actions_stored = {}, vehicle } = {},
) {
    let actor;
    if (
        origin instanceof TokenDocument ||
        origin instanceof foundry.canvas.placeables.Token
    ) {
        actor = origin.actor;
    } else {
        actor = origin;
    }
    const skill = actor.items.find((item) => {
        return item.id === skill_id;
    });
    const extra_name = skill.name + " " + trait_to_string(skill.system);
    const br_message = create_common_card(
        origin,
        {
            header: {
                type: game.i18n.localize("ITEM.TypeSkill"),
                title: extra_name,
                img: skill.img,
            },
            trait_id: skill.id,
            description: skill.system.description,
        },
        "modules/betterrolls-swade2/templates/skill_card.hbs",
    );
    br_message.type = BRSW_CONST.TYPE_SKILL_CARD;
    br_message.skill_id = skill.id;
    if (vehicle) {
        br_message.vehicle_actor_id = vehicle.actor?.id || vehicle.id;
        if (
            vehicle instanceof TokenDocument ||
            vehicle instanceof foundry.canvas.placeables.Token
        ) {
            br_message.vehicle_token_id = vehicle.id;
        }
    }
    await br_message.render(actions_stored);
    await br_message.save();
    return br_message;
}

/**
 * Creates a skill card from a token or actor id, mainly for use in macros
 *
 * @param {string} token_id A token id, if it can be solved it will be used
 *  before actor
 * @param {string} actor_id An actor id, it could be set as fallback or
 *  if you keep token empty as the only way to find the actor
 * @param {string} skill_id Id of the skill item
 * @param {object} actions_stored An object with action ids as properties
 *   and a boolean meaning if they need to set on or off
 * @return {Promise} a promise fot the ChatMessage object
 */
function create_skill_card_from_id(
    token_id,
    actor_id,
    skill_id,
    { actions_stored = {} } = {},
) {
    const actor = get_actor_from_ids(token_id, actor_id);
    return create_skill_card(actor, skill_id, {
        actions_stored: actions_stored,
    });
}

/**
 * Hooks the public functions to a global object
 */
export function skill_card_hooks() {
    game.brsw.create_skill_card = create_skill_card;
    game.brsw.create_skill_card_from_id = create_skill_card_from_id;
    game.brsw.roll_skill = roll_skill;
}

/**
 * Creates a card after an event.
 * @param ev javascript click event
 * @param {SwadeActor, Token} target token or actor from the char sheet
 */
async function skill_click_listener(ev, target) {
    const action = get_action_from_click(ev);
    if (action === "system") {
        return;
    }
    ev.stopImmediatePropagation();
    ev.preventDefault();
    ev.stopPropagation();
    // First term for PC, second one for NPCs
    const skill_id =
        ev.currentTarget.parentElement.parentElement.dataset.itemId ||
        ev.currentTarget.parentElement.dataset.itemId;
    // Show card
    const br_card = await create_skill_card(target, skill_id);
    if (action.includes("dialog")) {
        game.brsw.dialog.show_card(br_card);
    } else if (action.includes("trait")) {
        await roll_skill(br_card, false);
    }
}

/**
 * Activates the listeners in the character sheet for skills
 * @param app Sheet app
 * @param html Html code
 */
export function activate_skill_listeners(app, html) {
    const target = app.token || app.actor || app.object;
    addEventListenerAll(
        html,
        ".skill-label a, .skill.item>a, .skill-name, .skill-die",
        "click",
        async (ev) => {
            await skill_click_listener(ev, target);
        },
        true,
    );
}

/**
 * Activate the listeners in the skill card
 * @param {BrCommonCard} br_card
 * @param html Html produced
 */
export function activate_skill_card_listeners(br_card, html) {
    addEventListenerAll(html, ".brsw-roll-button", "click", async (ev) => {
        ev.stopPropagation();
        await roll_skill(
            br_card,
            ev.currentTarget.classList.contains("roll-bennie-button"),
        );
    });
    html.querySelector(".brsw-header-img").addEventListener("click", (_) => {
        const { render_data, actor } = br_card;
        const item = actor.items.get(render_data.trait_id);
        item.sheet.render(true);
    });
}

/**
 * Roll an existing skill card
 *
 * @param {BrCommonCard} br_card
 * @param {boolean} expend_bennie True if we want to spend a bennie
 */
export async function roll_skill(br_card, expend_bennie) {
    const extra_data = { modifiers: [] };
    const macros = [];
    // Actions
    for (const action of br_card.get_selected_actions()) {
        process_common_actions(action.code, extra_data, macros, br_card.actor);
    }
    if (br_card.trait_roll.is_rolled) {
        br_card.trait_roll.reroll_mode = expend_bennie ? "benny" : "free";
    }
    if (expend_bennie) {
        await spend_bennie(br_card.actor);
    }
    await roll_trait(
        br_card,
        br_card.skill.system,
        game.i18n.localize("BRSW.SkillDie"),
        extra_data,
    );
    await run_macros(macros, br_card.actor, null, br_card);
}

/**
 * Calculates the distance modifier for normal weapons
 * @param item
 * @param distance
 * @param origin_token
 * @param target_token
 * @param skill
 * @param tn
 * @returns {number}
 */
function calculate_generic_distance_modifier(
    item,
    distance,
    origin_token,
    target_token,
    skill,
    tn,
    extra_data,
) {
    const range = item.system.range.split("/");
    if (origin_token.document.elevation !== target_token.document.elevation) {
        const h_diff = Math.abs(
            origin_token.document.elevation - target_token.document.elevation,
        );
        distance = Math.sqrt(Math.pow(h_diff, 2) + Math.pow(distance, 2));
    }
    let distance_penalty = 0;
    let rangeEffects;
    if (!Utils.isShootingSkill(skill)) {
        // Throwing skill them
        rangeEffects = origin_token.actor.appliedEffects.find((e) =>
            e.changes.find((ch) => ch.key === "brsw.thrown-range-modifier"),
        );
        if (rangeEffects) {
            if (rangeEffects.disabled) {
                rangeEffects = null;
            } else {
                rangeEffects = rangeEffects.changes.find(
                    (ch) => ch.key === "brsw.thrown-range-modifier",
                ).value;
            }
        }
    }
    const extreme_range = 0;
    for (let i = 0; i < 3 && i < range.length; i++) {
        let range_int = parseInt(range[i]);
        if (rangeEffects) {
            range_int += rangeEffects * (i + 1);
        }
        if (range_int && range_int < distance) {
            distance_penalty = i < 2 ? (i + 1) * 2 : 8;
        }
    }
    if (extreme_range && distance > extreme_range * 4) {
        tn.modifiers.push(
            new TraitModifier(game.i18n.localize("BRSW.OverExtremeRange"), -999),
        );
    }
    if (distance_penalty) {
        tn.modifiers.push(
            new TraitModifier(
                game.i18n.localize("BRSW.Range") + " " + distance.toFixed(2),
                -distance_penalty,
            ),
        );
        //Range penalties can be ignored by aiming so add it to the total
        extra_data.total_aiming_ignorable_penalties =
            extra_data.total_aiming_ignorable_penalties ?? 0;
        extra_data.total_aiming_ignorable_penalties += distance_penalty;
    }
}

/**
 * Calculates the distance between tokens
 * @param origin_token
 * @param target_token
 * @param item
 * @param tn
 * @param {SwadeItem} skill
 * @return {boolean} True if parry should be used as the tn (tokens are adjacent)
 */
export function calculate_distance(
    origin_token,
    target_token,
    item,
    tn,
    skill,
    extra_data,
) {
    if (item.system.isVehicular && origin_token.actor.type !== "vehicle") {
        return false;
    }
    const grid_unit = canvas.grid.distance;
    let use_parry_as_tn = false;
    let distance = measureDistance(origin_token, target_token);
    if (
        distance / grid_unit < SettingsUtils.getWorldSetting("meleeDistance") + 1 &&
        item
    ) {
        use_parry_as_tn = item.type !== "power";
    } else if (item) {
        if (grid_unit % 5 === 0) {
            distance /= 5;
        }
        if (item.type === "power") {
            if (distance > item.system.range) {
                ui.notifications.error(game.i18n.localize("BRSW.SpellOverRange"));
            }
        } else {
            calculate_generic_distance_modifier(
                item,
                distance,
                origin_token,
                target_token,
                skill,
                tn,
                extra_data,
            );
        }
    }
    return use_parry_as_tn;
}

/**
 * Gets the tn for a vehicle
 * @param tn
 * @param target_token
 */
async function get_vehicle_tn(tn, target_token) {
    tn.reason = `Veh - ${target_token.name}`;
    //lookup the vehicle operator and get their maneuveringSkill
    let operator_skill;
    const target_operator_id = target_token.actor.system.driver.id;
    const target_operator = await fromUuid(target_operator_id);
    const operatorItems = target_operator ? target_operator.items : [];
    const maneuveringSkill = target_token.actor.system.driver.skill;
    for (const value of operatorItems) {
        if (value.name === maneuveringSkill) {
            operator_skill = value.system.die.sides;
        }
    }
    if (operator_skill === null) {
        operator_skill = 0;
    }
    tn.value = operator_skill / 2 + 2 + target_token.actor.system.handling;
}

/**
 * Get a target number and modifiers from a token appropriated to a skill
 *
 * @param {Item} skill
 * @param {Token} target_token
 * @param {Token} origin_token
 * @param {Item} item
 */
export async function get_tn_from_token(
    skill,
    target_token,
    origin_token,
    origin_actor,
    item,
    extra_data,
) {
    const tn = {
        reason: game.i18n.localize("BRSW.Default"),
        value: 4,
        modifiers: [],
    };
    const is_fighting = Utils.isFightingSkill(skill);
    let use_parry_as_tn = is_fighting;
    if (origin_token) {
        if (is_fighting) {
            const gangup = calculateGangUp(origin_token, target_token);
            if (gangup.bonus) {
                tn.modifiers.push(new TraitModifier(gangup.name, gangup.bonus));
            }
        } else if (item && item.system.range) {
            use_parry_as_tn = calculate_distance(
                origin_token,
                target_token,
                item,
                tn,
                skill,
                extra_data,
            );
        }
    }
    if (use_parry_as_tn) {
        if (target_token.actor.type !== "vehicle") {
            tn.reason = `${game.i18n.localize("SWADE.Parry")} - ${target_token.name}`;
            tn.value = parseInt(target_token.actor.system.stats.parry.value);
        } else {
            await get_vehicle_tn(tn, target_token);
        }
    }
    // Size modifiers
    if (shouldUseScale(origin_actor, target_token, item, skill)) {
        getScaleModifier(origin_actor, target_token.actor, item, tn, extra_data);
    }
    if (
        target_token.actor.system.status.isVulnerable ||
        target_token.actor.system.status.isStunned
    ) {
        tn.modifiers.push(
            new TraitModifier(
                `${target_token.name}: ${game.i18n.localize("SWADE.Vuln")}`,
                2,
            ),
        );
    }
    return tn;
}

function shouldUseScale(origin_actor, target_token, item, skill) {
    if (!origin_actor || !target_token) return false;
    if (item?.system?.isVehicular || origin_actor.type === "vehicle") return false;

    if (!item) {
        return Utils.isFightingSkill(skill) || Utils.isShootingSkill(skill) || Utils.isThrowingSkill(skill);
    }

    if (item.type === "weapon") return true;
    if (item.type === "power" && item.name.toLowerCase().includes("bolt")) return true;

    return false;
}

/**
 * Get the scale modifier
 **/

function getScaleModifier(origin_actor, target_actor, item, tn, extra_data) {

    const originScaleMod = sizeToScale(origin_actor?.system?.stats?.size || 1);
    const targetScaleMod = sizeToScale(
        target_actor?.system?.size || // Vehicles
        target_actor?.system?.stats?.size ||
        1,
    ); // actor or default

    if (originScaleMod === targetScaleMod) {
        //Actors are the same scale so there is no mod
        return;
    }

    const scaleMod = targetScaleMod - originScaleMod;
    if (scaleMod > 0 && Utils.isBolt(item)) {
        //Bolt is only affected by scale penalties, not bonuses
        return;
    }

    tn.modifiers.push(
        new TraitModifier(game.i18n.localize("BRSW.Scale"), scaleMod),
    );

    if (extra_data.arcaneActivationOffset !== undefined) {
        //Scale does not affect arcane activation
        extra_data.arcaneActivationOffset += scaleMod;
    }

    // If the scale mod is negative, check if the attacking actor has the swat ability
    if (scaleMod < 0 && origin_actor) {
        let unignoredPenalty = scaleMod * -1;

        const swat = origin_actor.items.find((item) => {
            return (
                item.type === "ability" &&
                item.name
                    .toLowerCase()
                    .includes(game.i18n.localize("BRSW.Swat").toLowerCase())
            );
        });

        if (swat) {
            // The swat ability ignores up to 4 points of scale penalties
            const swatMod = scaleMod < -4 ? 4 : scaleMod * -1;
            unignoredPenalty -= swatMod;
            tn.modifiers.push(
                new TraitModifier(game.i18n.localize("BRSW.Swat"), swatMod),
            );
        }

        if (unignoredPenalty > 0) {
            //Scale penalties can be ignored by aiming so add it to the total
            extra_data.total_aiming_ignorable_penalties =
                extra_data.total_aiming_ignorable_penalties ?? 0;
            extra_data.total_aiming_ignorable_penalties += unignoredPenalty;
        }
    }
}

/**
 * Get the size modifier from size
 *
 * @param {int} size
 **/

function sizeToScale(size) {
    //p179 swade core
    if (size === -4) {
        return -6;
    } else if (size === -3) {
        return -4;
    } else if (size === -2) {
        return -2;
    } else if (size >= -1 && size <= 3) {
        return 0;
    } else if (size >= 4 && size <= 7) {
        return 2;
    } else if (size >= 8 && size <= 11) {
        return 4;
    } else if (size >= 12) {
        return 6;
    }
    return 0; // Failsafe.
}

/**
 *  Calculates gangup modifier, by Bruno Calado
 * @param {Token|TokenDocument} attacker
 * @param {Token|TokenDocument} target
 * @return {number} modifier
 * pg 101 swade core
 * - Each additional adjacent foe (who is not Stunned)
 * - adds +1 to all the attackers’ Fighting rolls, up to a maximum of +4.
 * - Each ally adjacent to the defender cancels out one point of Gang Up bonus from an attacker adjacent to both.
 */
export function calculateGangUp(attacker, target) {
    if (SettingsUtils.getWorldSetting("disable-gang-up")) {
        return { name: "NoGangup", bonus: 0 };
    }

    if (!attacker || !target) {
        console.warn(
            "BetterRolls 2: Trying to calculate gangup with no token",
            attacker,
            target,
        );
        return 0;
    }

    if (attacker.document.disposition === target.document.disposition) {
        return 0;
    }

    let attackerAllies = 0;
    let targetAllies = 0;
    if (attacker.document.disposition === 1 || attacker.document.disposition === -1) {
        const item_range = SettingsUtils.getWorldSetting("meleeDistance") + 1;

        // disposition -1 means NPC (hostile) is attacking PCs (friendly)
        // disposition 1 means PC (friendly) is attacking NPC (hostile)
        const attackerAlliesWithinRangeOfTarget = canvas.tokens.placeables.filter(
            (t) =>
                t.id !== attacker.id &&
                t.document.disposition === attacker.document.disposition &&
                t.visible &&
                withinRange(target, t, item_range) &&
                combatant_gives_gangup(t.combatant, t.actor),
        );

        const targetAlliesWithinRangeOfTarget = canvas.tokens.placeables.filter(
            (t) =>
                t.id !== target.id &&
                t.document.disposition === attacker.document.disposition * -1 &&
                withinRange(target, t, item_range) &&
                combatant_gives_gangup(t.combatant, t.actor),
        );

        //alliedWithinRangeOfTargetAndAttacker intersection with attacker and target
        const targetAlliesWithinRangeOfBoth = targetAlliesWithinRangeOfTarget.filter(
            (t) =>
                t.document.disposition === attacker.document.disposition * -1 &&
                withinRange(attacker, t, item_range) &&
                combatant_gives_gangup(t.combatant, t.actor),
        );

        targetAllies = targetAlliesWithinRangeOfBoth.length;

        const formationFighterName = game.i18n.localize("BRSW.EdgeName.FormationFighter").toLowerCase();

        const attackerHasFormationFighter = attacker.actor?.items.find((item) => {
            return item.name.toLowerCase().includes(formationFighterName);
        });

        const attackerAlliesWithFormationFighter = attackerAlliesWithinRangeOfTarget.filter(
            (t) =>
                // no need to check for all the things that attackerAlliesWithinRangeOfTarget
                // is already filtered for
                t.actor?.items.find((item) => {
                    return item.name.toLowerCase().includes(formationFighterName);
                }),
        );

        attackerAllies = attackerAlliesWithinRangeOfTarget.length + attackerAlliesWithFormationFighter.length;
        if (attackerAllies > 0 && attackerHasFormationFighter) {
            attackerAllies += 1;
        }
    }

    const reduction = gang_up_reduction(target.actor);
    const addition = gang_up_addition(attacker.actor);

    let modifier = Math.max(0, attackerAllies - targetAllies - reduction + addition);

    const blockName = game.i18n.localize("BRSW.EdgeName.Block").toLowerCase();
    const impBlockName = game.i18n.localize("BRSW.EdgeName.ImprovedBlock").toLowerCase();

    if (target.actor) {
        const blockEffects = target.actor.appliedEffects.filter((e) =>
            e.name.toLowerCase().includes(blockName) &&
            !e.changes.find(c => c.key === "brsw-ac.gangup-reduction")
        );

        const impBlockEffects = target.actor.appliedEffects.filter((e) =>
            e.name.toLowerCase().includes(impBlockName) &&
            !e.changes.find(c => c.key === "brsw-ac.gangup-reduction")
        );

        if (impBlockEffects.length) {
            modifier = Math.max(0, modifier - 2);
        } else if (blockEffects.length) {
            modifier = Math.max(0, modifier - 1);
        }
    }

    return { name: game.i18n.localize("BRSW.GangUp"), bonus: Math.min(4, modifier) };
}

/**
 * Gets the gangup reduction from an actor (using a custom AE
 * @param {Actor} target
 */
function gang_up_reduction(target) {
    let reduction = 0;
    for (const effect of target.appliedEffects) {
        if (!effect.disabled) {
            for (const change of effect.changes) {
                if (change.key === "brsw-ac.gangup-reduction") {
                    reduction += parseInt(change.value) || 0;
                }
            }
        }
    }
    return reduction;
}

/**
 * Gets the gangup addition from an actor (using a custom AE)
 * @param {Actor} attacker
 */
function gang_up_addition(attacker) {
    let addition = 0;
    for (const effect of attacker.appliedEffects) {
        if (!effect.disabled) {
            for (const change of effect.changes) {
                if (change.key === "brsw-ac.gangup-addition") {
                    addition += parseInt(change.value) ? change.value : 0;
                }
            }
        }
    }
    return addition;
}

// function from Kekilla
function withinRange(origin, target, range) {
    if (Math.abs(origin.document.elevation - target.document.elevation) >= 1) {
        return false;
    }
    const grid_unit = canvas.grid.distance;
    let distance = measureDistance(origin, target);
    distance /= grid_unit;
    return range > distance;
}

/**
 * Check if a combatant is able to contribute to gang-up
 * @param {Combatant} combatant
 * @param {SwadeActor} actor
 */
function combatant_gives_gangup(combatant, actor) {
    let unable_to_contribute =
        actor.system.status.isStunned || actor.statuses.has("incapacitated");
    if (combatant) {
        unable_to_contribute = unable_to_contribute || combatant.defeated;
    }
    return !unable_to_contribute;
}
