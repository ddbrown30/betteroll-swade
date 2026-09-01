// Functions for cards representing skills

import * as BRSW2_CONFIG from "./brsw2-config.js";
import { BRSW2_CONST } from "./brsw2-const.js";
import {
    create_common_card,
    getActionFromClick,
    getActorFromIds,
    process_common_actions,
    roll_trait,
    spendBenny,
    traitToDieString,
    withButtonSpinner,
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
 * @param {string} skillId The id of the skill that we want to show
 * @param {object} actions_stored An object with action ids as properties
 *   and a boolean meaning if they need to set on or off
 * @param {SwadeActor} vehicle
 * @return {Promise} A promise for the ChatMessage object
 */
async function createSkillCard(
    origin,
    skillId,
    { actions_stored = {}, vehicle, options = {} } = {},
) {
    const actor = Utils.toActor(origin);
    const skill = actor.items.get(skillId);
    const extra_name = skill.name + " " + traitToDieString(skill.system);
    const brCard = create_common_card(
        origin,
        {
            header: {
                type: game.i18n.localize("ITEM.TypeSkill"),
                title: extra_name,
                img: skill.img,
            },
            trait: skill,
            description: skill.system.description,
        },
        "modules/betterrolls-swade2/templates/skill_card.hbs",
        options,
    );
    brCard.type = BRSW2_CONST.BRSW_CARD_TYPES.TYPE_SKILL_CARD;
    if (vehicle) {
        brCard.vehicleActorId = vehicle.actor?.id || vehicle.id;
        if (vehicle instanceof TokenDocument || vehicle instanceof foundry.canvas.placeables.Token) {
            brCard.vehicleTokenId = vehicle.id;
        }
    }
    await brCard.render(actions_stored);
    return brCard;
}

/**
 * Creates a skill card from a token or actor id, mainly for use in macros
 *
 * @param {string} tokenId A token id, if it can be solved it will be used
 *  before actor
 * @param {string} actorId An actor id, it could be set as fallback or
 *  if you keep token empty as the only way to find the actor
 * @param {string} skillId Id of the skill item
 * @param {object} actions_stored An object with action ids as properties
 *   and a boolean meaning if they need to set on or off
 * @return {Promise} a promise for the ChatMessage object
 */
function createSkillCardFromId(
    tokenId,
    actorId,
    skillId,
    { actions_stored = {}, options = {} } = {},
) {
    const actor = getActorFromIds(tokenId, actorId);
    return createSkillCard(actor, skillId, {
        actions_stored: actions_stored,
    });
}

/**
 * Hooks the public functions to a global object
 */
export function exposeSkillCardAPI() {
    Utils.exposeAPI("createSkillCard", createSkillCard, "create_skill_card");
    Utils.exposeAPI("createSkillCardFromId", createSkillCardFromId, "create_skill_card_from_id");
    Utils.exposeAPI("rollSkill", rollSkill, "roll_skill");
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
    const skillId =
        ev.currentTarget.parentElement.parentElement.dataset.itemId ||
        ev.currentTarget.parentElement.dataset.itemId;
    // Show card
    const brCard = await createSkillCard(target, skillId);
    if (action.includes("dialog")) {
        game.brsw.dialog.show_card(brCard);
    } else if (action.includes("trait")) {
        await rollSkill(brCard, false);
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
 * @param {BrCommonCard} brCard
 * @param html Html produced
 */
export function activateSkillCardListeners(brCard, html) {
    addEventListenerAll(html, ".brsw-roll-button", "click", async (ev) => {
        ev.stopPropagation();
        await withButtonSpinner(ev.currentTarget, () =>
            rollSkill(
                brCard,
                ev.currentTarget.classList.contains("roll-bennie-button"),
            ),
        );
    });
    html.querySelector(".brsw-header-img").addEventListener("click", (_) => {
        const { render_data, actor } = brCard;
        const item = actor.items.get(render_data.trait.id);
        item.sheet.render(true);
    });
}

/**
 * Roll an existing skill card
 *
 * @param {BrCommonCard} brCard
 * @param {boolean} expendBennie True if we want to spend a bennie
 */
export async function rollSkill(brCard, expendBennie) {
    const extraData = { modifiers: [] };
    const macros = [];
    // Actions
    for (const action of brCard.getSelectedActions()) {
        process_common_actions(action.code, extraData, macros, brCard.actor);
    }
    if (brCard.traitRoll.is_rolled) {
        brCard.traitRoll.reroll_mode = expendBennie ? "benny" : "free";
    }
    if (expendBennie) {
        await spendBenny(brCard.actor);
    }
    await roll_trait(
        brCard,
        brCard.skill.system,
        brCard.skill.name,
        extraData,
    );
    await runMacros(macros, brCard);
}

/**
 * Calculates the distance modifier for normal weapons
 * @param item
 * @param distance
 * @param originToken
 * @param targetToken
 * @param skill
 * @param tn
 * @returns {number}
 */
function calculateGenericDistanceModifier(
    item,
    distance,
    originToken,
    targetToken,
    skill,
    tn,
    extraData,
) {
    const range = item.system.range.split("/");
    if (originToken.elevation !== targetToken.elevation) {
        const elevationDiff = Math.abs(
            originToken.elevation - targetToken.elevation,
        );
        distance = Math.sqrt(Math.pow(elevationDiff, 2) + Math.pow(distance, 2));
    }

    let rangeEffects = 0;
    if (Utils.isThrowingSkill(skill)) {
        rangeEffects = originToken.actor.appliedEffects
            .filter(effect => !effect.disabled)
            .reduce((total, effect) => {
                const change = effect.changes.find(ch => ch.key === "brsw.thrown-range-modifier");
                return total + (change ? Number(change.value) : 0);
            }, 0);
    }

    let distancePenalty = 0;
    for (let i = 0; i < Math.min(3, range.length); i++) {
        range[i] = Number(range[i]) + rangeEffects * (2 ** i);
        if (range[i] < distance) {
            distancePenalty = i < 2 ? (i + 1) * 2 : 8;
        }
    }

    const extremeRange = range.length ? range[range.length - 1] * 4 : 0;
    if (extremeRange && distance > extremeRange) {
        tn.modifiers.push(
            new TraitModifier(game.i18n.localize("BRSW.OverExtremeRange"), -999),
        );
    }

    if (distancePenalty) {
        const rangeString = BRSW2_CONST.RANGE_STRINGS[-distancePenalty] ?? "BRSW.Range";
        tn.modifiers.push(
            new TraitModifier(
                game.i18n.format(rangeString, { distance: distance.toFixed(1) }),
                -distancePenalty,
                { type: "range" }
            ),
        );
        //Range penalties can be ignored by aiming so add it to the total
        extraData.total_aiming_ignorable_penalties = extraData.total_aiming_ignorable_penalties ?? 0;
        extraData.total_aiming_ignorable_penalties += distancePenalty;
    }
}

/**
 * Calculates the distance between tokens
 * @param originToken
 * @param targetToken
 * @param item
 * @param tn
 * @param {SwadeItem} skill
 * @return {boolean} True if parry should be used as the tn (tokens are adjacent)
 */
export function calculateDistance(
    originToken,
    targetToken,
    item,
    tn,
    skill,
    extraData,
) {
    if (item.system.isVehicular && originToken.actor.type !== "vehicle") {
        return false;
    }
    const grid_unit = canvas.grid.distance;
    let useParryAsTN = false;
    let distance = measureDistance(originToken, targetToken);
    if (distance / grid_unit <= 1 && item) {
        useParryAsTN = item.type !== "power";
    } else if (item) {
        if (grid_unit % 5 === 0) {
            distance /= 5;
        }
        if (item.type === "power") {
            if (distance > item.system.range) {
                ui.notifications.error(game.i18n.localize("BRSW.SpellOverRange"));
            }
        } else {
            calculateGenericDistanceModifier(
                item,
                distance,
                originToken,
                targetToken,
                skill,
                tn,
                extraData,
            );
        }
    }
    return useParryAsTN;
}

/**
 * Gets the tn for a vehicle
 * @param tn
 * @param targetToken
 */
async function get_vehicle_tn(tn, targetToken) {
    tn.reason = `Veh - ${targetToken.name}`;
    //lookup the vehicle operator and get their maneuveringSkill
    let operator_skill = 0;
    const target_operator_id = targetToken.actor.system.driver.id;
    const target_operator = await fromUuid(target_operator_id);
    const operatorItems = target_operator ? target_operator.items : [];
    const maneuveringSkill = targetToken.actor.system.driver.skill;
    for (const value of operatorItems) {
        if (value.name === maneuveringSkill) {
            operator_skill = value.system.die.sides || 0;
        }
    }
    tn.value = operator_skill / 2 + 2 + targetToken.actor.system.handling;
}

/**
 * Get a target number and modifiers from a token appropriated to a skill
 *
 * @param {Item} skill
 * @param {Token} targetToken
 * @param {Token} originToken
 * @param {Item} item
 */
export async function getTNFromToken(
    skill,
    targetToken,
    originToken,
    originActor,
    item,
    extraData,
) {
    const tn = {
        reason: game.i18n.localize("BRSW.Default"),
        value: 4,
        modifiers: [],
    };

    originToken = Utils.toTokenDoc(originToken);
    targetToken = Utils.toTokenDoc(targetToken);

    const targetActor = targetToken.actor;

    const isFighting = Utils.isFightingSkill(skill);
    let useParryAsTN = isFighting;
    if (originToken) {
        if (isFighting) {
            const gangUp = calculateGangUp(originToken, targetToken);
            if (gangUp.bonus) {
                tn.modifiers.push(new TraitModifier(gangUp.name, gangUp.bonus));
            }
        } else if (item && item.system.range) {
            useParryAsTN = calculateDistance(
                originToken,
                targetToken,
                item,
                tn,
                skill,
                extraData,
            );
        }
    }

    if (useParryAsTN) {
        if (targetActor.type !== "vehicle") {
            tn.reason = `${game.i18n.localize("SWADE.Parry")} - ${targetToken.name}`;
            tn.value = parseInt(targetActor.system.stats.parry.value);
        } else {
            await get_vehicle_tn(tn, targetToken);
        }
    }

    // Size modifiers
    if (shouldUseScale(originActor, targetToken, item, skill)) {
        getScaleModifier(originActor, targetActor, item, tn, extraData);
    }

    if (targetActor.system.status.isVulnerable && shouldApplyVulnerable(originToken, targetToken, item, skill)) {
        tn.modifiers.push(new TraitModifier(`${targetToken.name}: ${game.i18n.localize("SWADE.Vuln")}`, 2));
    }
    return tn;
}

function shouldApplyVulnerable(originToken, targetToken, item, skill) {
    if (!originToken || !targetToken) return false;

    //Can't be vulnerable to yourself
    if (originToken.id === targetToken.id) return false;

    if (!item) {
        return Utils.isFightingSkill(skill) || Utils.isShootingSkill(skill) || Utils.isThrowingSkill(skill);
    }

    if (Utils.isWeaponOrBolt(item)) return true;

    return false;
}

function shouldUseScale(originActor, targetToken, item, skill) {
    if (!originActor || !targetToken) return false;
    if (item?.system?.isVehicular || originActor.type === "vehicle") return false;

    if (!item) {
        return Utils.isFightingSkill(skill) || Utils.isShootingSkill(skill) || Utils.isThrowingSkill(skill);
    }

    if (Utils.isWeaponOrBolt(item)) return true;

    return false;
}

/**
 * Get the scale modifier
 **/

function getScaleModifier(originActor, targetActor, item, tn, extraData) {
    const originScaleMod = sizeToScale(originActor?.system.stats.size ?? 0);
    const targetScaleMod = sizeToScale(
        targetActor?.system.size ?? // Vehicles
        targetActor?.system.stats.size ?? 0 // actor or default
    );

    if (originScaleMod === targetScaleMod) {
        //Actors are the same scale so there is no mod
        return;
    }

    const scaleMod = targetScaleMod - originScaleMod;
    if (scaleMod > 0 && Utils.isBolt(item)) {
        //Bolt is only affected by scale penalties, not bonuses
        return;
    }

    tn.modifiers.push(new TraitModifier(game.i18n.localize("BRSW.Scale"), scaleMod));

    if (extraData.arcaneActivationOffset !== undefined) {
        //Scale does not affect arcane activation
        extraData.arcaneActivationOffset += scaleMod;
    }

    // If the scale mod is negative, check if the attacking actor has the swat ability
    if (scaleMod < 0 && originActor) {
        let unignoredPenalty = -scaleMod;

        const swatName = game.i18n.localize("BRSW.Swat");
        const swatNameLower = swatName.toLowerCase();
        const swatAbility = originActor.items.find((item) => {
            return item.type === "ability" && item.name.toLowerCase().includes(swatNameLower);
        });

        if (swatAbility) {
            // The swat ability ignores up to 4 points of scale penalties
            const swatMod = Math.min(4, -scaleMod);
            unignoredPenalty -= swatMod;
            tn.modifiers.push(new TraitModifier(swatName, swatMod));
        }

        if (unignoredPenalty > 0) {
            //Scale penalties can be ignored by aiming so add it to the total
            extraData.total_aiming_ignorable_penalties ??= 0;
            extraData.total_aiming_ignorable_penalties += unignoredPenalty;
        }
    }
}

/**
 * Get the size modifier from size
 *
 * @param {int} size
 **/

function sizeToScale(size) {
    if (!Number.isFinite(size)) return 0;

    //p179 swade core
    if (size === -4) return -6;
    if (size === -3) return -4;
    if (size === -2) return -2;
    if (size <= 3) return 0;
    if (size <= 7) return 2;
    if (size <= 11) return 4;
    return 6;
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

    if (attackerToken.disposition * targetToken.disposition !== -1) {
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
            if (t === attackerToken) return false;
            if (t.disposition !== attackerToken.disposition) return false;
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
            if (t === targetToken) return false;
            if (t.disposition !== targetToken.disposition) return false;
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
    if (Math.abs(origin.elevation - target.elevation) >= 1) {
        return false;
    }
    let distance = measureDistance(origin, target);
    distance /= canvas.grid.distance;
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
