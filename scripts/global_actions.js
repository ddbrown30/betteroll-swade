/* globals game, console, saveDataToFile, ui,
  readTextFromFile, renderTemplate, foundry, canvas, $ */
/* jshint -W089 */

import { SYSTEM_GLOBAL_ACTION } from "./actions/builtin-actions.js";
import * as BRSW2_CONFIG from "./brsw2-config.js";
import { get_roll_options } from "./cards_common.js";
import { get_enabled_gm_actions } from "./gm_actions.js";
import { check_for_actions_with_damage } from "./item_card.js";
import {
    SettingsUtils,
    Utils,
    measureDistance,
} from "./utils.js";


// DMG override is still not implemented.
/**
 * Registers all the available global actions
 */
export function registerActions() {
    let worldActions = SettingsUtils.getSetting(BRSW2_CONFIG.SETTING_KEYS.worldGlobalActions);
    if (worldActions && worldActions[0] instanceof Array) {
        worldActions = worldActions[0];
    }

    game.brsw.GLOBAL_ACTIONS = SYSTEM_GLOBAL_ACTION;

    for (const worldAction of worldActions) {
        if (worldAction.replaceExisting) {
            //The action will replace any existing actions in the default list. Filter them out and assign the array
            game.brsw.GLOBAL_ACTIONS = game.brsw.GLOBAL_ACTIONS.filter(
                (a) => a.id !== worldAction.id,
            );
        }
    }

    game.brsw.GLOBAL_ACTIONS = game.brsw.GLOBAL_ACTIONS.concat(worldActions);
}

/**
 * Adds an array of actions to the available ones. The array should be in the same format as builtin-actions.js.
 * The array is cleared when reloading and should be set again
 * @param {Array} actions
 */
function add_actions(actions) {
    // Delete duplicate actions
    const actions_ids = actions.map((action) => action.id);
    const actions_to_delete = game.brsw.GLOBAL_ACTIONS.filter((action) =>
        actions_ids.includes(action.id),
    );
    game.brsw.GLOBAL_ACTIONS = game.brsw.GLOBAL_ACTIONS.filter(
        (action) => !actions_to_delete.includes(action),
    );
    game.brsw.GLOBAL_ACTIONS = game.brsw.GLOBAL_ACTIONS.concat(actions);
}

/**
 * Process the not selector
 */
function process_not_selector(action, item, actor) {
    return !process_action(action.not_selector[0], item, actor);
}

/**
 * Expose some functions to be used in macros.
 */
export function expose_global_actions_functions() {
    game.brsw.add_actions = add_actions;
    game.brsw.get_roll_options = get_roll_options;
}

/**
 * Process and selector.
 * @param action
 * @param item
 * @param actor
 * @return {boolean}
 */
function process_and_selector(action, item, actor) {
    let selected = true;
    for (const selection_option of action.and_selector) {
        if (!process_action(selection_option, item, actor)) {
            selected = false;
            break;
        }
    }
    return selected;
}

/**
 * Checks if an or selector should be used
 * @param action
 * @param item
 * @param actor
 * @return {boolean}
 */
function process_or_selector(action, item, actor) {
    let selected = false;
    for (const selection_option of action.or_selector) {
        if (process_action(selection_option, item, actor)) {
            selected = true;
            break;
        }
    }
    return selected;
}

/**
 * Check if an action applies to a roll
 * @param action
 * @param item
 * @param actor
 * @return {boolean}
 */
function process_action(action, item, actor) {
    let selected = false;
    if (action.hasOwnProperty("disable_if_module_present")) {
        const module_data = game.modules.get(action.disable_if_module_present);
        selected = !(module_data && module_data.active);
    }
    if (action.hasOwnProperty("selector_type")) {
        selected = check_selector(
            action.selector_type,
            action.selector_value,
            item,
            actor,
        );
    } else if (action.hasOwnProperty("and_selector")) {
        selected = process_and_selector(action, item, actor);
    } else if (action.hasOwnProperty("or_selector")) {
        selected = process_or_selector(action, item, actor);
    } else if (action.hasOwnProperty("not_selector")) {
        selected = process_not_selector(action, item, actor);
    }
    return selected;
}

/**
 * Returns the global actions available for an item
 * @param {Item} item
 * @param {SwadeActor} actor
 */
export function get_actions(item, actor) {
    const availableActions = [];

    let disabledActions = SettingsUtils.getSetting(BRSW2_CONFIG.SETTING_KEYS.disabledSystemActions);
    if (disabledActions && disabledActions[0] instanceof Array) {
        disabledActions = disabledActions[0];
    }

    for (const action of game.brsw.GLOBAL_ACTIONS) {
        if (!disabledActions.includes(action.id) && process_action(action, item, actor)) {
            availableActions.push(action);
        }
    }

    availableActions.sort((a, b) => { return a.id < b.id ? -1 : 1; });

    return availableActions;
}

// noinspection OverlyComplexFunctionJS,FunctionTooLongJS
/**
 * Check if a selector matches
 * @param type Type of the selector
 * @param value Value of the selector
 * @param item item been checked
 * @param actor actor been checked
 */
// eslint-disable-next-line complexity
export function check_selector(type, value, item, actor) {
    let selected = false;
    if (type === "skill") {
        if (item.type === "attribute") {
            selected = false;
        } else {
            let skillName = "";
            if (item.type === "skill") {
                skillName = item.name;
            } else {
                skillName = item.system.actions && item.system.actions.trait;
            }

            if (!skillName) {
                const skill = Utils.getItemTrait(item, actor);
                skillName = skill ? skill.name : "";
            }

            if (skillName) {
                const skillNameLower = skillName.toLowerCase();
                value = game.i18n.localize(value);
                const locStringValue = game.i18n.localize("BRSW.SkillName." + Utils.toTitleCase(value));
                selected = skillNameLower.includes(value.toLowerCase()) || skillNameLower.includes(locStringValue.toLowerCase());
            }
        }
    } else if (type === "skill_linked_attribute") {
        if (item.type === "attribute") {
            selected = false;
        } else {
            let attribute;
            if (item.type === "skill") {
                attribute = item.system.attribute;
            } else {
                const itemSkillName = item.system.actions && item.system.actions.trait.toLowerCase();
                if (itemSkillName) {
                    const itemSkillSwid = game.swade.util.slugify(itemSkillName);

                    if(game.brsw.SKILLS_DATA[itemSkillName]) {
                        attribute = game.brsw.SKILLS_DATA[itemSkillName].attribute;
                    } else if(game.brsw.SKILLS_DATA[itemSkillSwid]) {
                        attribute = game.brsw.SKILLS_DATA[itemSkillSwid].attribute;
                    } else {
                        for (const skillData of Object.values(game.brsw.SKILLS_DATA)) {
                            if (skillData.name.toLowerCase() == itemSkillName) {
                                attribute = skillData.attribute;
                                break;
                            }
                        }
                    }
                }
            }

            if (!attribute) {
                const skill = Utils.getItemTrait(item, actor);
                if (skill) {
                    attribute = skill.system.attribute;
                }
            }

            if (attribute) {
                value = game.i18n.localize(value);
                selected = attribute.toLowerCase().includes(value.toLowerCase());
            }
        }
    } else if (type === "attribute") {
        selected =
            item.type === "attribute" &&
            item.name.toLowerCase().includes(value.toLowerCase());
    } else if (type === "all") {
        selected = true;
    } else if (type === "item_type") {
        selected = item.type === value;
    } else if (type === "is_weapon_or_bolt") {
        selected = Utils.isWeaponOrBolt(item);
        if (value === "false") {
            selected = !selected;
        }
    } else if (type === "actor_name") {
        selected = actor.name.toLowerCase().includes(value.toLowerCase());
    } else if (type === "actor_has_skill") {
        const item = actor.items.find((item) => {
            return (
                item.type === "skill" &&
                item.name.toLowerCase() === game.i18n.localize(value).toLowerCase()
            );
        });
        return !!item;
    } else if (type === "actor_has_item") {
        const ITEM_TYPES = ["weapon", "armor", "shield", "gear", "consumable"];
        const item = actor.items.find((item) => {
            return (
                ITEM_TYPES.indexOf(item.type) !== -1 &&
                item.name.toLowerCase() === game.i18n.localize(value).toLowerCase()
            );
        });
        return !!item;
    } else if (type === "actor_equips_item") {
        const items = actor.items.find((item) => {
            return (
                item.name.toLowerCase() === game.i18n.localize(value).toLowerCase() &&
                item.system.equipStatus > 1
            );
        });
        return !!items;
    } else if (type === "item_name" && item.type !== "skill") {
        selected = item.name.toLowerCase().includes(value.toLowerCase());
    } else if (type === "item_description_includes") {
        const description = `${item?.system?.description} ${item?.system?.trapping} ${item?.system?.category} ${item?.system?.notes}`;
        selected = description.toLowerCase().includes(value.toLowerCase());
    } else if (type === "actor_has_effect") {
        // noinspection AnonymousFunctionJS
        const effect = actor.appliedEffects.find((effect) =>
            effect.name
                .toLowerCase()
                .includes(game.i18n.localize(value).toLowerCase()),
        );
        selected = effect ? !effect.disabled : false;
    } else if (type === "actor_has_edge") {
        const edge_name = game.i18n.localize(value);
        // noinspection AnonymousFunctionJS
        const edge = actor.items.find((item) => {
            return (
                item.type === "edge" &&
                item.name.toLowerCase().includes(edge_name.toLowerCase())
            );
        });
        selected = !!edge;
    } else if (type === "actor_has_ability") {
        const ability_name = game.i18n.localize(value);
        // noinspection AnonymousFunctionJS
        const ability = actor.items.find((item) => {
            return (
                item.type === "ability" &&
                item.name.toLowerCase().includes(ability_name.toLowerCase())
            );
        });
        selected = !!ability;
    } else if (type === "actor_has_hindrance") {
        const hindrance_name = game.i18n.localize(value);
        // noinspection AnonymousFunctionJS
        const hindrance = actor.items.find((item) => {
            return (
                item.type === "hindrance" &&
                item.name.toLowerCase().includes(hindrance_name.toLowerCase())
            );
        });
        selected = !!hindrance;
    } else if (type === "actor_has_major_hindrance") {
        const hindrance_name = game.i18n.localize(value);
        // noinspection AnonymousFunctionJS
        const hindrance = actor.items.find((item) => {
            return (
                item.type === "hindrance" &&
                item.name.toLowerCase().includes(hindrance_name.toLowerCase()) &&
                item.system?.isMajor
            );
        });
        selected = !!hindrance;
    } else if (type.indexOf("actor_additional_stat_") === 0) {
        const additional_stat = type.slice(22);
        if (actor.system.additionalStats.hasOwnProperty(additional_stat)) {
            selected = Utils.check_equality_with_operators(actor.system.additionalStats[additional_stat].value, value);
        }
    } else if (type.indexOf("item_additional_stat_") === 0) {
        const additional_stat = type.slice(21);
        if (item?.system?.additionalStats.hasOwnProperty(additional_stat)) {
            selected = Utils.check_equality_with_operators(item.system.additionalStats[additional_stat].value, value);
        }
    } else if (type.indexOf("target_additional_stat_") === 0) {
        const additional_stat = type.slice(23);
        for (const targeted_token of game.user.targets) {
            if (targeted_token?.actor?.system?.additionalStats.hasOwnProperty(additional_stat)) {
                if (Utils.check_equality_with_operators(targeted_token.actor.system.additionalStats[additional_stat].value, value)) {
                    selected = true;
                    break;
                }
            }
        }
    } else if (type === "actor_has_joker") {
        selected = actor.hasJoker;
    } else if (type === "target_has_edge") {
        const edge_name = game.i18n.localize(value);
        for (const targeted_token of game.user.targets) {
            const edge = targeted_token.actor?.items.find((item) => {
                return (
                    item.type === "edge" &&
                    item.name.toLowerCase().includes(edge_name.toLowerCase())
                );
            });
            selected = selected || !!edge;
        }
    } else if (type === "actor_has_arcane_mastery") {
        const hasMastery = Utils.actorHasArcaneMastery(actor);
        selected = hasMastery == value;
    } else if (type === "target_has_hindrance") {
        const hindrance_name = game.i18n.localize(value);
        for (const targeted_token of game.user.targets) {
            const hindrance = targeted_token.actor?.items.find((item) => {
                return (
                    item.type === "hindrance" &&
                    item.name.toLowerCase().includes(hindrance_name.toLowerCase())
                );
            });
            selected = selected || !!hindrance;
        }
    } else if (type === "target_has_major_hindrance") {
        const hindrance_name = game.i18n.localize(value);
        // noinspection AnonymousFunctionJS
        for (const targeted_token of game.user.targets) {
            const hindrance = targeted_token.actor?.items.find((item) => {
                return (
                    item.type === "hindrance" &&
                    item.name.toLowerCase().includes(hindrance_name.toLowerCase()) &&
                    item.system?.isMajor
                );
            });
            selected = selected || !!hindrance;
        }
    } else if (type === "target_has_ability") {
        const ability_name = game.i18n.localize(value);
        for (const targeted_token of game.user.targets) {
            const ability = targeted_token.actor?.items.find((item) => {
                return (
                    item.type === "ability" &&
                    item.name.toLowerCase().includes(ability_name.toLowerCase())
                );
            });
            selected = selected || !!ability;
        }
    } else if (type === "target_has_effect") {
        selected = false;
        for (const targeted_token of game.user.targets) {
            const effect = targeted_token.actor?.appliedEffects.find(
                (ef) => ef.name.toLowerCase().includes(value.toLowerCase()), // jshint ignore:line
            );
            if (effect) {
                selected = selected || effect ? !effect.disabled : false;
            }
        }
    } else if (type === "gm_action_enabled") {
        const gm_actions = get_enabled_gm_actions();
        selected = !!gm_actions.find((a) => a.id == value);
    } else if (type === "faction") {
        const tokens = actor.getActiveTokens();
        if (
            game.user.targets.size > 0 &&
            tokens.length > 0 &&
            tokens[0] !== game.user.targets.first()
        ) {
            const actor_disposition = tokens[0].document.disposition;
            const target_disposition = game.user.targets.first().document.disposition;
            if (value === "same") {
                selected = actor_disposition === target_disposition;
            } else {
                selected = actor_disposition !== target_disposition;
            }
        } else {
            selected = false;
        }
    } else if (type === "is_wildcard") {
        selected = actor.system.wildcard;
        if (value === "false") {
            selected = !selected;
        }
    } else if (type === "item_source_contains") {
        const item_source = item?.system?.source;
        if (item_source) {
            selected = item_source.toLowerCase().includes(value.toLowerCase());
        }
    } else if (type === "actor_value") {
        selected = check_document_value(actor, value);
    } else if (type === "item_value") {
        selected = check_document_value(item, value);
    } else if (type === "target_value") {
        const targeted_token = game.user.targets.first();
        if (targeted_token) {
            selected = check_document_value(targeted_token.actor, value);
        }
    } else if (type === "item_has_damage") {
        selected = !!item?.system && (!!item.system.damage || check_for_actions_with_damage(item));
        if (value === "false") {
            selected = !selected;
        }
    } else if (type === "is_ranged_attack") {
        selected = Utils.isRangedAttack(item, actor);
        if (value === "false") {
            selected = !selected;
        }
    } else if (type === "range_less_than") {
        const tokens = actor.getActiveTokens();
        if (tokens && game.user.targets.size) {
            const distance = measureDistance(tokens[0], game.user.targets.first(),
            );
            selected = parseInt(value) >= distance;
        }
    } else if (type === "undead_and_ignores_illumination") {
        const undeadIgnores = SettingsUtils.getWorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.undeadIgnoresIllumination);
        if (!undeadIgnores) {
            selected = false;
        } else {
            const undeadName = game.i18n.localize("BRSW.AbilityName.Undead").toLowerCase();
            const undeadAbility = actor.items.find((item) => {
                return item.type === "ability" && item.name.toLowerCase().includes(undeadName);
            });
            selected = !!undeadAbility;
        }
    } else if (type === "module_is_not_active") {
        const module = game.modules.get(value);
        selected = module && !module.active;
    } else {
        selected = false;
    }
    return selected;
}

/**
 * Checks for a value in the actor data structure
 * @param {Document} document
 * @param {string} value
 */
function check_document_value(document, value) {
    const [path, result] = value.split("=");
    const data = foundry.utils.getProperty(document, path);
    // noinspection EqualityComparisonWithCoercionJS
    return result != undefined ? Utils.check_equality_with_operators(data, result) : !!data;
}

/**
 * Get the global actions with the gm selector.
 */
function get_gm_actions() {
    const gm_actions = [];
    const disabledActions = SettingsUtils.getSetting(BRSW2_CONFIG.SETTING_KEYS.disabledSystemActions);
    for (const action of game.brsw.GLOBAL_ACTIONS) {
        if (
            action.selector_type === "gm_action" &&
            !disabledActions.includes(action.id)
        ) {
            action.enable = false;
            gm_actions.push(action);
        }
    }
    return gm_actions;
}

export function register_gm_actions_settings() {
    SettingsUtils.registerSetting("gm_actions", {
        name: "GM Actions",
        default: get_gm_actions(),
        type: Array,
        scope: "world",
        config: false,
    });
}

export async function refresh_gm_actions() {
    const old_actions = SettingsUtils.getSetting("gm_actions");
    const new_actions = get_gm_actions().map((n) => {
        n.enable = !!old_actions.find((o) => o?.id === n.id)?.enable;
        return n;
    });
    await SettingsUtils.setSetting("gm_actions", new_actions);
    return new_actions;
}
