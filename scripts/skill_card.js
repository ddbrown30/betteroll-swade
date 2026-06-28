// Functions for cards representing skills
/* globals TokenDocument, Token, game, CONST, canvas, console, Ray, succ, fromUuid, ui, $ */

import { BrCommonCard } from "./BrCommonCard.js";
import * as BRSW2_CONFIG from "./brsw2-config.js";
import { BRSW2_CONST } from "./brsw2-const.js";
import {
    create_common_card,
    getActionFromClick,
    get_actor_from_ids,
    process_common_actions,
    roll_trait,
    spend_bennie,
    trait_to_string,
} from "./cards_common.js";
import { runMacros } from "./item_card.js";
import { TraitModifier } from "./modifiers.js";
import {
    SettingsUtils,
    Utils,
    addEventListenerAll,
    measureDistance,
} from "./utils.js";

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
    br_message.type = BRSW2_CONST.BRSW_CARD_TYPES.TYPE_SKILL_CARD;
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
    const action = getActionFromClick(ev);
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
    for (const action of br_card.getSelectedActions()) {
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
    await runMacros(macros, br_card);
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
    if (distance / grid_unit < 1 && item) {
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
    let operator_skill = 0;
    const target_operator_id = target_token.actor.system.driver.id;
    const target_operator = await fromUuid(target_operator_id);
    const operatorItems = target_operator ? target_operator.items : [];
    const maneuveringSkill = target_token.actor.system.driver.skill;
    for (const value of operatorItems) {
        if (value.name === maneuveringSkill) {
            operator_skill = value.system.die.sides || 0;
        }
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

    if (Utils.isWeaponOrBolt(item)) return true;

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
 * @param {Token|TokenDocument} attackerToken
 * @param {Token|TokenDocument} targetToken
 * @return {number} modifier
 * pg 101 swade core
 * - Each additional adjacent foe (who is not Stunned)
 * - adds +1 to all the attackers’ Fighting rolls, up to a maximum of +4.
 * - Each ally adjacent to the defender cancels out one point of Gang Up bonus from an attacker adjacent to both.
 */
export function calculateGangUp(attackerToken, targetToken) {
    if (SettingsUtils.getWorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.disableGangUp)) {
        return { name: "NoGangup", bonus: 0 };
    }

    if (!attackerToken || !targetToken) {
        console.warn(
            "BetterRolls 2: Trying to calculate gangup with no token",
            attackerToken,
            targetToken,
        );
        return 0;
    }

    if (attackerToken.document.disposition * targetToken.document.disposition !== -1) {
        return 0;
    }

    const attackerActor = attackerToken.actor;
    const targetActor = targetToken.actor;
    if (!attackerActor) return 0;

    const scene = targetToken.scene;
    if (!scene) return 0;

    let meleeRange = SettingsUtils.getWorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.measureFromEdge) ?
        0 : //0 when using edge distance since edges have to be touching
        Math.SQRT2; //Range is SQRT2 to account for diagonals

    if (scene.grid.isGridless) {
        //If we're gridless, give a bit of extra buffer so placement doesn't have to be so exact
        meleeRange += 0.5;
    }

    //Get all the attacker allies that are next to the target
    const attackerAllies =
        scene.tokens?.filter((t) => {
            if (t === attackerToken.document) return false;
            if (t.disposition !== attackerToken.document.disposition) return false;
            if (isIgnoredForGangUp(t)) return false;
            return withinRange(targetToken, t, meleeRange);
        });

    //We can only benefit from gang up if we have at least one ally
    if (attackerAllies.length === 0) return 0;

    //Get the total bonus of all attacker allies
    const totalAttackerAllyBonus =
        attackerAllies.reduce((accumulator, t) => {
            let gangUpContribution = 1;

            //gangUpAttack applies both when attacking and as an ally during an attack
            const tGlobalMods = foundry.utils.getProperty(t.actor, 'system.stats.globalMods');
            if (tGlobalMods?.gangUpAttack && Array.isArray(tGlobalMods.gangUpAttack)) {
              tGlobalMods.gangUpAttack.forEach((m) => {
                if (!m.ignore) {
                  gangUpContribution += Number(m.value);
                }
              });
            }
            return accumulator + gangUpContribution;
        }, 0) ?? 0;

    //Get all the defender allies that are next to the target
    const defenderAllies =
        scene.tokens?.filter((t) => {
            if (t === targetToken.document) return false;
            if (t.disposition !== targetToken.document.disposition) return false;
            if (isIgnoredForGangUp(t)) return false;
            return withinRange(targetToken, t, meleeRange);
        });

    //Of the defender allies, count how many are also next to the attacker
    const numDefenderAllies =
        defenderAllies.filter((t) => {
            return withinRange(attackerToken, t, meleeRange);
        }).length ?? 0;

    let gangUpBonus = totalAttackerAllyBonus - numDefenderAllies;

    const attackerGlobalMods = foundry.utils.getProperty(attackerActor, 'system.stats.globalMods');

    if (attackerGlobalMods?.gangUpAttack && Array.isArray(attackerGlobalMods.gangUpAttack)) {
        attackerGlobalMods.gangUpAttack.forEach((m) => {
            if (!m.ignore) {
                gangUpBonus += Number(m.value);
            }
        });
    }

    if (gangUpBonus <= 0) return 0;

    gangUpBonus = Math.min(4, gangUpBonus);

    const targetGlobalMods = targetActor
        ? (foundry.utils.getProperty(targetActor, 'system.stats.globalMods'))
        : {};

    if (targetGlobalMods?.gangUpDefend && Array.isArray(targetGlobalMods.gangUpDefend)) {
        targetGlobalMods.gangUpDefend.forEach((m) => {
            if (!m.ignore) {
                gangUpBonus -= Number(m.value);
            }
        });
    }

    if (gangUpBonus < 0) return 0;

    return { name: game.i18n.localize("BRSW.GangUp"), bonus: gangUpBonus };
}

function withinRange(origin, target, range, epsilon = Number.EPSILON) {
    origin = origin instanceof TokenDocument ? origin.object : origin;
    target = target instanceof TokenDocument ? target.object : target;
    if (Math.abs(origin.document.elevation - target.document.elevation) >= 1) {
        return false;
    }
    const grid_unit = canvas.grid.distance;
    let distance = measureDistance(origin, target);
    distance /= grid_unit;
    return distance <= (range + epsilon);
}

/**
 * Check if a combatant is able to contribute to gang-up
 * @param {Token} token
 */
function isIgnoredForGangUp(token) {
    const ignoreStatuses = ['defeated', 'dead', 'incapacitated', 'stunned'];
    if (ignoreStatuses.some((status) => token.hasStatusEffect(status))) {
        return true;
    }

    if (token.combatant?.defeated || token.combatant?.isDefeated) {
        return true;
    }

    if (!token.actor) {
        //skip if the token has no actor
        console.warn(`Token ${token.uuid} has no actor!`);
        return true;
    }

    const actorIncapacitated = foundry.utils.getProperty(token.actor, 'system.status.isIncapacitated');
    return !!actorIncapacitated;
}
