// This file defines the BrCommonCard class and directly related code.
/* globals game, ChatPopout, console, canvas, Hooks, renderTemplate, TextEditor, ChatMessage,
     Roll, CONST */

import * as BRSW2_CONFIG from "./brsw2-config.js";
import { TraitRoll } from "./rolls.js";
import { broofa, getAuthor, getWhisperData, SettingsUtils, Utils } from "./utils.js";
import { calc_pp_cost } from "./item_card.js";
import { get_actions, process_action } from "./global_actions.js";
import { brAction } from "./actions.js";
import { are_bennies_available, trait_to_string } from "./cards_common.js";

/**
 * Stores a flag with the render data, deletes data can't be stored
 *
 * @param {Object} flags
 * @param render_object
 */
function store_render_flag(flags, render_object) {
    for (const property of ["actor", "skill"]) {
        delete render_object[property];
    }
    // Get sure thar there is a diff so update socket gets fired.
    if (flags.render_data) {
        flags.render_data.update_uid = broofa();
    }
    flags.render_data = render_object;
}

const cascade_starting_left = 250;
const cascade_left_increment = 35;
const cascade_starting_top = 700;
const cascade_top_increment = 20;
const cascade_max_cascades = 3;

// A file to host the probably too complex BrCommonCard class
export class BrCommonCard {
    constructor(message) {
        this.message = message;
        this.type = undefined;
        this.token_id = undefined;
        this.actor_id = undefined;
        this.item_id = undefined;
        this.damage = undefined;
        this.vehicle_actor_id = undefined;
        this.vehicle_token_id = undefined;
        this.target_ids = [];
        this.environment = { light: "bright" };
        this.extra_text = "";
        this.action_sections = {};
        this.macro_buttons = []; // Macro buttons from items
        this.render_data = {}; // Old render data, to be removed
        this.update_list = {}; // List of properties pending to be updated
        this.resist_buttons = [];
        this.trait_roll = new TraitRoll();
        this.popoutShown = false;
        this.manual_mods = {};
        this.applicable_effects = [];
        this.pp_modifiers = {};
        if (message) {
            const data = this.message.getFlag("betterrolls-swade2", "br_data");
            if (data) {
                this.load(data);
                // TODO: Check if activate_common_listeners can be made a method of this class and simplified.
            }
        } else {
            this.id = broofa();
            this.recover_targets_from_user();
        }
    }

    async save() {
        if (!this.message) {
            await this.render();
        }
        const { update_list } = this;
        update_list.id = this.message.id;
        update_list.flags = this.message.flags;
        const br_flags = this.message.flags["betterrolls-swade2"] || {};
        br_flags.br_data = JSON.parse(JSON.stringify(this.get_data()));
        // Temporary
        store_render_flag(br_flags, this.render_data);
        update_list.flags["betterrolls-swade2"] = br_flags;
        await this.message.update(update_list);
        this.update_list = {};
    }

    createPopout() {
        if (game.user.id !== this.message.author.id || this.popoutShown) {
            return;
        }

        if (SettingsUtils.getUserSetting(BRSW2_CONFIG.USER_SETTING_KEYS.autoPopoutChat)) {
            this.showPopout();
        }
    }

    showPopout() {
        const top = cascade_starting_left + game.brsw.cascade_count * cascade_left_increment;
        const left = cascade_starting_top + game.brsw.cascade_count * cascade_top_increment;

        game.brsw.cascade_count =
            game.brsw.cascade_count + 1 < cascade_max_cascades
                ? game.brsw.cascade_count + 1
                : 0;

        new CONFIG.ChatMessage.popoutClass({
            message: this.message,
            position: { top: top, left: left },
        }).render(true);

        this.popoutShown = true;

        this.save().catch(() => {
            console.error("Error saving card data after popout rendering");
        });
    }

    closePopout() {
        for (const app of Object.values(this.message.apps)) {
            if (app.constructor.name === "ChatPopout") {
                app.close();
            }
        }
    }

    /**
     * Prepares the data to be saved
     **/
    get_data() {
        return {
            type: this.type,
            token_id: this.token_id,
            actor_id: this.actor_id,
            item_id: this.item_id,
            vehicle_actor_id: this.vehicle_actor_id,
            vehicle_token_id: this.vehicle_token_id,
            environment: this.environment,
            extra_text: this.extra_text,
            action_sections: this.action_sections,
            macro_buttons: this.macro_buttons,
            id: this.id,
            target_ids: this.target_ids,
            trait_roll: this.trait_roll,
            resist_buttons: this.resist_buttons,
            damage: this.damage,
            popoutShown: this.popoutShown,
            manual_mods: this.manual_mods,
            applicable_effects: this.applicable_effects,
            pp_modifiers: this.pp_modifiers,
            pp_cost: this.pp_cost,
            showActions: this.showActions,
            trait: this.trait,
        };
    }

    load(data) {
        const FIELDS = [
            "id",
            "type",
            "token_id",
            "actor_id",
            "item_id",
            "trait",
            "vehicle_actor_id",
            "vehicle_token_id",
            "environment",
            "extra_text",
            "action_sections",
            "target_ids",
            "macro_buttons",
            "resist_buttons",
            "damage",
            "popoutShown",
            "manual_mods",
            "applicable_effects",
            "pp_modifiers",
            "pp_cost",
            "showActions",
        ];
        for (const field of FIELDS) {
            this[field] = data[field];
        }
        this.trait_roll.load(data.trait_roll);
        if (this.message) {
            this.render_data = this.message.getFlag(
                "betterrolls-swade2",
                "render_data",
            );
        }
        //Backwards compatibility so that we don't show a bunch of old popouts
        if (data.popup_shown !== undefined) {
            this.popoutShown = true;
        }
    }

    get token() {
        if (canvas.tokens) {
            if (this.token_id) {
                return canvas.tokens.get(this.token_id);
            }
            if (this.actor_id) {
                return this.actor.getActiveTokens()[0];
            }
        }
        return undefined;
    }

    get actor() {
        // We always prefer the token actor if available
        if (this.token_id) {
            const { token } = this;
            if (token) {
                // Token can be undefined even with and id the scene is note
                // ready or the token has been removed.
                return token.actor;
            }
        }
        if (this.actor_id) {
            return game.actors.get(this.actor_id);
        }
        return undefined;
    }

    get vehicle_token() {
        if (canvas.tokens) {
            if (this.vehicle_token_id) {
                return canvas.tokens.get(this.vehicle_token_id);
            }
            if (this.vehicle_actor_id) {
                return this.vehicle_actor.getActiveTokens()[0];
            }
        }
        return undefined;
    }

    get vehicle_actor() {
        // We always prefer the token actor if available
        if (this.vehicle_token_id) {
            const { vehicle_token } = this;
            if (vehicle_token) {
                // Token can be undefined even with an id if the scene is not
                // ready or the token has been removed.
                return vehicle_token.actor;
            }
        }
        if (this.vehicle_actor_id) {
            return game.actors.get(this.vehicle_actor_id);
        }
        return undefined;
    }

    get item() {
        let item = this.actor.items.find((item) => item.id === this.item_id);
        if (!item) {
            item = fromUuidSync(this.item_id);
        }
        return item;
    }

    setTrait(trait) {
        this.trait = null;
        if (!trait) return;

        this.trait = {};
        if( trait.type === "skill") {
            this.trait.id = trait.id;
        } else {
            this.trait.name = trait.name.toLowerCase();
        }
    }

    get traitDie() {
        if (this.trait) {
            if (this.trait.name) {
                return this.actor.system.attributes[this.trait.name];
            }
            return this.actor.items.get(this.trait.id)?.system;
        }

        if (this.item_id) {
            const trait = Utils.getItemTrait(this.item, this.actor);
            if (trait?.type === "skill") {
                this.trait = { id: trait.id };
                return trait.system;
            } else if (trait?.name) {
                this.trait = { name: trait.name.toLowerCase() };
                return this.actor.system.attributes[this.trait.name];
            }
        }

        return undefined;
    }

    get skill() {
        if (this.trait) {
            if (this.trait.name) {
                //This is an attribute not a skill
                return undefined;
            }
            return this.actor.items.get(this.trait.id);
        }

        if (this.item_id) {
            const trait = Utils.getItemTrait(this.item, this.actor);
            if (trait?.type === "skill") {
                return trait;
            }
        }

        return undefined;
    }

    get attribute() {
        if (this.trait) {
            if (this.trait.id) {
                //This is an skill not an attribute
                return undefined;
            }
            return this.trait.name;
        }

        if (this.item_id) {
            const trait = Utils.getItemTrait(this.item, this.actor);
            if (trait && trait.type !== "skill") {
                return trait?.name.toLowerCase();
            }
        }

        return undefined;
    }

    get skill_tooltip() {
        if (!this.skill || !this.skill.system.description) {
            return;
        }
        return this.skill.system.description.length <=
            BRSW2_CONFIG.MAX_TOOLTIP_LENGTH
            ? this.skill.system.description
            : "";
    }

    get targets() {
        const target_array = [];
        for (const target_id of this.target_ids) {
            const tokenDoc = fromUuidSync(target_id);
            if (tokenDoc) {
                target_array.push(tokenDoc.object);
            }
        }
        return target_array;
    }

    get bennie_available() {
        return are_bennies_available(this.actor);
    }

    recover_targets_from_user() {
        this.target_ids = [];
        for (const target of game.user.targets) {
            this.target_ids.push(target.document.uuid);
        }
    }

    populateMacroButtons() {
        if (!this.item.system?.actions?.additional) {
            return;
        }
        const additional_actions = this.item.system?.actions?.additional;
        for (const action in additional_actions) {
            if (additional_actions[action].type === "macro") {
                this.macro_buttons.push({ key: action, ...additional_actions[action] });
            }
        }
    }

    /**
     * Populates the card with actions
     * @param {object} stored_selections An object with action ids as properties
     *   and a boolean meaning if they need to set on or off
     */
    populateActions(stored_selections) {
        this.action_sections = {};
        this.populateWorldActions();

        if (this.item) {
            this.populateItemActions();
        }

        this.populateActiveEffectActions();
        this.populateResistActions();
        this.populateNoPowerPointsActions();

        Utils.forEachActionGroup(this, group => {
            group.actions.sort((a, b) => {
                if (group.name === "Active effects" || group.name === "Item actions") {
                    return a.code.name > b.code.name ? 1 : -1;
                }
                return a.code.id > b.code.id ? 1 : -1;
            });

            for (const action of group.actions) {
                if (stored_selections.hasOwnProperty(action.code.id)) {
                    action.selected = stored_selections[action.code.id];
                }
            }
        });

        Hooks.call("BRSWCardActionsPopulated", this);
    }

    populateWorldActions() {
        const item = this.item || this.skill || { type: "attribute", name: this.attribute };

        for (const global_action of get_actions(item, this.actor)) {
            const name = game.i18n.localize(global_action.button_name);
            const section_name = (global_action.section ? global_action.section : "none").toLowerCase();
            const group_name = global_action.group || "BRSW.NoGroup";
            const group_name_id = group_name.split(".").join("");
            const group_single = global_action.hasOwnProperty("group_single");

            if (global_action.hasOwnProperty("extra_text")) {
                this.extra_text += global_action.extra_text;
            }

            if (!this.action_sections.hasOwnProperty(section_name)) {
                this.action_sections[section_name] = {
                    action_groups: {},
                };
            }

            if (!this.action_sections[section_name].action_groups.hasOwnProperty(group_name_id)) {
                const translated_group = game.i18n.localize(group_name);
                this.action_sections[section_name].action_groups[group_name_id] = {
                    name: translated_group,
                    actions: [],
                    id: broofa(),
                    single_choice: group_single,
                };
            }

            const new_action = new brAction(name, global_action);
            if (global_action.hasOwnProperty("defaultChecked")) {
                if (global_action.defaultChecked === "on") {
                    new_action.selected = true;
                } else {
                    new_action.selected = process_action(global_action, item, this.actor, true);
                }
            }

            this.action_sections[section_name].action_groups[group_name_id].actions.push(new_action);
        }
    }

    populateItemActions() {
        const item_actions = [];
        for (const action in this.item.system?.actions?.additional) {
            const current_action = this.item.system.actions.additional[action];
            if (current_action.type !== "macro" && current_action.type !== "resist") {
                const br_action = new brAction(
                    current_action.name,
                    current_action,
                    "item",
                    action,
                );

                item_actions.push(br_action);
            }
        }

        if (!item_actions.length) {
            return;
        }

        //For power item actions, check if any of them match power modifiers
        //If so, use the item action instead
        if (this.item.type === "power") {
            const modsGroupName = game.i18n.localize("BRSW.PowerModifiers.PowerModifiers");
            const modsGroupId = "BRSW.PowerModifiers.PowerModifiers".split(".").join("");

            const modsGroup = this.action_sections["power"]?.action_groups[modsGroupId];
            for (let i = item_actions.length - 1; i >= 0; --i) {
                const itemAction = item_actions[i];
                let isInGlobal = false;
                for (const globalAction of game.brsw.GLOBAL_ACTIONS) {
                    const nameSimilarity = Utils.actionNameSimilarity(itemAction.name, game.i18n.localize(globalAction.name));
                    if (nameSimilarity === 1) {
                        isInGlobal = true;
                        break;
                    }
                }

                let foundAction = false;
                if (modsGroup) {
                    for (const action of modsGroup.actions) {
                        const nameSimilarity = Utils.actionNameSimilarity(itemAction.name, action.name);
                        const codeSimilarity = Utils.actionNameSimilarity(itemAction.name, game.i18n.localize(action.code.name));
                        if (nameSimilarity === 1 || codeSimilarity === 1) {
                            const name = action.name;
                            const codeName = action.code.name;
                            Object.assign(action, foundry.utils.deepClone(itemAction));
                            action.name = name; //Keep the BR2 action name since it will be localized
                            action.code.name = codeName; //Keep the BR2 code name since we use it to compare elsewhere
                            item_actions.splice(i, 1);
                            foundAction = true;
                            break;
                        }
                    }
                }

                if (foundAction) {
                    continue;
                }

                if (isInGlobal) {
                    //We have an action for this but it wasn't in our current actions
                    //This means that the selector determined it shouldn't be available, so remove the item action too
                    item_actions.splice(i, 1);
                    continue;
                }

                //Check if this item action exists in our PP mods
                //If so, add it to the PP mods group
                for (const ppMod of this.pp_modifiers.powerMods) {
                    const nameSimilarity = Utils.actionNameSimilarity(itemAction.name, game.i18n.localize(ppMod.name));
                    if (nameSimilarity === 1) {
                        if (!this.action_sections.hasOwnProperty("power")) {
                            this.action_sections["power"] = {
                                action_groups: {},
                            };
                        }

                        if (!this.action_sections["power"].action_groups[modsGroupId]) {
                            this.action_sections["power"].action_groups[modsGroupId] = {
                                name: modsGroupName,
                                actions: [],
                                id: broofa(),
                                single_choice: false,
                            };
                        }

                        this.action_sections["power"]?.action_groups[modsGroupId].actions.push(itemAction);
                        item_actions.splice(i, 1);
                        break;
                    }
                }
            }
        }

        if (item_actions.length) {
            const section = "none";
            if (!this.action_sections.hasOwnProperty(section)) {
                this.action_sections[section] = {
                    action_groups: {},
                };
            }
            const name = game.i18n.localize("BRSW.ItemActions");
            this.action_sections[section].action_groups[name] = {
                name: name,
                actions: item_actions,
                id: broofa(),
                single_choice: false,
            };
        }
    }

    populateActiveEffectActions() {
        if (this.skill) {
            const attGlobalMods = this.actor.system.stats.globalMods[this.skill.system.attribute] ?? [];
            const effectArray = [
                ...this.actor.system.stats.globalMods.trait,
                ...attGlobalMods,
                ...this.skill.system.effects,
            ];
            this.populate_active_effect_actions_from_array(effectArray);
        } else if (this.attribute) {
            const abl = this.actor.system.attributes[this.attribute];
            const effectArray = [
                ...abl.effects,
                ...this.actor.system.stats.globalMods[this.attribute],
                ...this.actor.system.stats.globalMods.trait,
            ];
            this.populate_active_effect_actions_from_array(effectArray);
        }
        if (this.damage && this.actor.system.stats.globalMods.damage.length > 0) {
            this.populate_active_effect_actions_from_array(this.actor.system.stats.globalMods.damage, "dmgMod");
        }
    }

    populate_active_effect_actions_from_array(effectArray, type = "skillMod") {
        const effectActions = [];
        for (const effect of effectArray) {
            const code = { name: effect.label, id: broofa() };
            code[type] = effect.value;
            const br_action = new brAction(effect.label, code, "active_effect");
            br_action.selected = !effect.ignore;
            effectActions.push(br_action);
        }
        if (effectActions.length) {
            const name = game.i18n.localize("BRSW.ActiveEffects");
            if (!this.action_sections.hasOwnProperty("character")) {
                this.action_sections["character"] = {
                    action_groups: {},
                };
            }
            if (this.action_sections["character"].action_groups.hasOwnProperty(name)) {
                this.action_sections["character"].action_groups[name].actions = [
                    ...this.action_sections["character"].action_groups[name].actions,
                    ...effectActions,
                ];
            } else {
                this.action_sections["character"].action_groups[name] = {
                    name: name,
                    actions: effectActions,
                    id: broofa(),
                    single_choice: false,
                };
            }
        }
    }

    populateResistActions() {
        if (!this.item || !this.item.system.actions) {
            return;
        }

        for (const action in this.item.system.actions.additional) {
            const current_action = this.item.system.actions.additional[action];
            if (current_action.type === "resist") {
                this.resist_buttons.push({
                    name: current_action.name,
                    trait: current_action.override || (this.skill?.name ?? this.attribute),
                    trait_mod: current_action.modifier,
                });
            }
        }
    }

    /**
     * Populates actions needed for the No Power Points optional rule
     */
    populateNoPowerPointsActions() {
        if (!game.settings.get("swade", "noPowerPoints") || !this.item || !this.item.system.pp) {
            return;
        }

        const ppCost = calc_pp_cost(this);
        const penaltySelections = Utils.getNoPPPenaltySelections(ppCost);

        const action_array = [];
        for (let penalty = 1; penalty <= BRSW2_CONFIG.MAX_NOPP_PENALTY_ACTION; ++penalty) {
            const new_action = new brAction(
                `PP ${-penalty}`,
                {
                    name: `${game.i18n.localize("BRSW.NoPP")} ${-penalty}`,
                    id: `no_pp_${penalty}`,
                    skillMod: -penalty,
                },
                "no_pp",
            );

            new_action.selected = penaltySelections.includes(penalty);

            action_array.push(new_action);
        }
        this.action_sections["power"] ??= { action_groups: {} };
        this.action_sections["power"].action_groups[game.i18n.localize("BRSW.NoPP")] = {
            name: game.i18n.localize("BRSW.NoPP"),
            actions: action_array,
            id: broofa(),
        };
    }

    get hasFooterButtons() {
        return this.resist_buttons?.length > 0 || this.macro_buttons?.length > 0;
    }

    setActiveActions(actions) {
        Utils.forEachActionGroup(this, group => {
            for (const action of group.actions) {
                action.selected = actions.includes(action.code.id);
            }
        });
    }

    refreshPPModsFromActions() {
        if (this.pp_modifiers.genericMods) {
            for (const mod of this.pp_modifiers.genericMods) {
                if (mod.actionId) {
                    const action = this.getActionById(mod.actionId);
                    if (action) {
                        mod.selected = action.selected;
                    }
                }
            }
        }

        if (this.pp_modifiers.powerMods) {
            for (const mod of this.pp_modifiers.powerMods) {
                const action = this.getActionByName(mod.name);
                if (action) {
                    mod.selected = action.selected;
                }
            }
        }
    }

    refreshDamageFromActions() {
        if (this.item?.system.damage) {
            //An item with damage doesn't need refreshing as it will always have damage
            return;
        }

        this.damage = false;
        for (const action of this.getSelectedActions()) {
            if (action.code.dmgOverride) {
                this.damage = true;
                return;
            }
        }
    }

    /**
     * Set the trait for the render_data
     */
    setTraitUsingSkillOverride() {
        this.resetDefaultTrait();

        const action = this.getSelectedActions().find((a) => a.code.skillOverride);
        if (!this.actor || !action) {
            this.setTrait(this.render_data.trait);
            return;
        }

        const trait = Utils.traitFromString(this.actor, action.code.skillOverride);
        this.render_data.trait = trait;
        this.setTrait(trait);
    }

    /**
     * Revert the trait to the default for the item
     */
    resetDefaultTrait() {
        if (this.item) {
            this.render_data.trait = Utils.getItemTrait(this.item, this.actor);
        }
    }

    /**
     * Selects fallback trait and damage actions when appropriate
     */
    selectFallbackActions() {
        if (!this.item) return;

        const selectedActions = this.getSelectedActions();

        const trait = Utils.getItemTrait(this.item, this.actor);
        if (!trait) {
            const hasSkillOverride = selectedActions.some((a) => a.code.skillOverride);
            if (!hasSkillOverride) {
                const invalidProperties = new Set([
                    "add_wild_die",
                    "aiming_ignores",
                    "aimingIgnoreMod",
                    "apMod",
                    "avoid_exploding_damage",
                    "change_location",
                    "dmgMod",
                    "dmgOverride",
                    "ignoresArcaneActivation",
                    "isHeavyWeapon",
                    "multiplyDmgMod",
                    "overrideAp",
                    "raiseDamageFormula",
                    "rerollDamageMod",
                    "rerollMode",
                    "rerollSkillMod",
                    "rof",
                    "runDamageMacro",
                    "self_add_status",
                    "tnOverride",
                    "wildDieFormula",
                ]);

                //Find the first action with a skill override that does not also have any of the properties above
                Utils.forEachActionGroup(this, group => {
                    const skillAction = group.actions.find((a) => a.code.skillOverride && !invalidProperties.some((prop) => a.code[prop]));
                    if (skillAction) {
                        //We've found a valid action so mark it as selected and stop searching
                        skillAction.selected = true;
                        return true;
                    }
                });
            }
        }

        const damage = this.item?.system.damage || selectedActions.some((a) => a.code.dmgOverride);
        if (!damage) {
            const invalidProperties = new Set([
                "add_wild_die",
                "aiming_ignores",
                "aimingIgnoreMod",
                "change_location",
                "rerollDamageMod",
                "rerollMode",
                "rerollSkillMod",
                "resourcesUsed",
                "rof",
                "runSkillMacro",
                "self_add_status",
                "skillMod",
                "skillOverride",
                "tnOverride",
                "wildDieFormula",
            ]);

            //Find the first action with a skill override that does not also have any of the properties above
            Utils.forEachActionGroup(this, group => {
                const damageAction = group.actions.find((a) => a.code.dmgOverride && !invalidProperties.some((prop) => a.code[prop]));
                if (damageAction) {
                    //We've found a valid action so mark it as selected and stop searching
                    damageAction.selected = true;
                    return true;
                }
            });
        }
    }

    /**
     * Creates an object to store some data in the old render_data flag.
     * @param render_data
     * @param template
     * @returns {*}
     */
    generateRenderData(render_data, template) {
        render_data.actor = this.actor;
        render_data.result_master_only = SettingsUtils.getWorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.resultCard) === "master";

        // Benny image
        render_data.benny_image = game.settings.get("swade", "bennyImage3DFront") || "/systems/swade/assets/benny/benny-chip-front.png";

        render_data.collapse_results = !SettingsUtils.getUserSetting(BRSW2_CONFIG.USER_SETTING_KEYS.expandResults);
        render_data.collapse_descriptions = !SettingsUtils.getUserSetting(BRSW2_CONFIG.USER_SETTING_KEYS.expandDescriptions);

        if (template) {
            render_data.template = template;
        }

        this.checkWarnings(render_data);
        this.render_data = render_data;
        return render_data;
    }

    get show_rerolls() {
        if (game.settings.get("swade", "dumbLuck") || !this.trait_roll.current_roll) {
            return true;
        }

        return this.trait_roll.current_roll && !this.trait_roll.current_roll.is_fumble;
    }

    /**
     * Recovers the trait used in card
     */
    getTrait() {
        if (this.render_data.trait) {
            let trait;
            if (this.render_data.trait.id) {
                //This is a skill
                trait = this.actor.items.get(this.render_data.trait.id);
            } else {
                // This is an attribute
                trait = this.render_data.trait;
            }

            this.render_data.trait = trait;
            this.render_data.traitTitle = trait
                ? trait.name + " " + trait_to_string(trait.system)
                : "";
        }
    }

    /**
     * Checks and creates a warning in the top of the card
     */
    checkWarnings(render_data) {
        if (this.actor.system.status.isStunned) {
            render_data.warning = `<span class="br2-unstun-card brsw-clickable">${game.i18n.localize(
                "BRSW.CharacterIsStunned",
            )}</span>`;
        } else if (this.actor.system.status.isShaken) {
            render_data.warning = `<span class="br2-unshake-card brsw-clickable">${game.i18n.localize(
                "BRSW.CharacterIsShaken",
            )}</span>`;
        } else if (
            this.item?.system.actions?.trait.toLowerCase() ===
            game.i18n.localize("BRSW.none").toLowerCase()
        ) {
            render_data.warning = game.i18n.localize("BRSW.NoRollRequired");
        } else if (this.item?.system.quantity <= 0) {
            render_data.warning = game.i18n.localize("BRSW.QuantityIsZero");
        } else {
            render_data.warning = "";
        }
    }

    /**
     * Renders the card
     * @param stored_selections An object with action ids as properties
     *   and a boolean meaning if they need to set on or off
     * @returns {Promise<void>}
     */
    async render(stored_selections = {}) {
        if (!Object.keys(this.action_sections).length) {
            this.populateActions(stored_selections);

            if (this.item) {
                this.selectFallbackActions();
                this.showActions = this.shouldShowActionsMenu();
            }
        }

        if (this.item && this.macro_buttons.length === 0) {
            this.populateMacroButtons();
        }

        this.setTraitUsingSkillOverride();
        this.refreshDamageFromActions();

        this.getTrait();

        this.pp_cost = this.render_data.is_power ? calc_pp_cost(this) : 0;
        const new_content = await foundry.applications.handlebars.renderTemplate(
            this.render_data.template,
            this.getDataRender(),
        );

        await foundry.applications.ux.TextEditor.implementation.enrichHTML(new_content);

        if (this.message) {
            this.update_list.content = new_content;
        } else {
            await this.createFoundryMessage(new_content);

            //If auto-popout is disabled, mark our popout as shown so that we won't show a bunch of old popouts if it's later enabled
            this.popoutShown = !SettingsUtils.getUserSetting(BRSW2_CONFIG.USER_SETTING_KEYS.autoPopoutChat);

            if (!this.message.author.active) {
                //If the author isn't connected, mark the popout as shown so that we don't pop it out when they connect
                this.popoutShown = true;
            }
        }
    }

    /**
     * Temporal stop gap until render_data is removed, and we pass the class
     * to the template
     */
    getDataRender() {
        const data = {
            ...this.get_data(),
            ...this.render_data,
        };
        data.actor = this.actor;
        data.vehicle_actor = this.vehicle_actor;
        data.item = this.item;
        data.bennie_available = this.bennie_available;
        data.show_rerolls = this.show_rerolls;
        data.selected_actions = this.getSelectedActions();
        data.hasFooterButtons = this.hasFooterButtons;
        data.skill_tooltip = this.skill_tooltip;
        data.supports_manual_mods = !!(this.trait || this.damage);
        data.noPowerPoints = game.settings.get("swade", "noPowerPoints");
        data.ppPenalty = -Math.ceil(this.pp_cost / 2);
        data.shots_pp_info = this.itemShots;
        data.applicable_effects = this.applicable_effects;
        return data;
    }


    /**
     * Returns an action by name
     */
    getActionById(actionId) {
        return Utils.forEachActionGroup(this, group => {
            for (const action of group.actions) {
                if (action.code.id === actionId) {
                    return action;
                }
            }
        });
    }

    /**
     * Returns an action by both localized and un-localized partial name
     */
    getActionByName(actionName) {
        const lowerName = actionName.toLowerCase();
        const localLower = game.i18n.localize(actionName).toLowerCase();
        return Utils.forEachActionGroup(this, group => {
            for (const action of group.actions) {
                const nameSimilarity = Utils.actionNameSimilarity(action.code.name, lowerName);
                const locSimilarity = Utils.actionNameSimilarity(game.i18n.localize(action.name), localLower);
                if (nameSimilarity === 1 || locSimilarity === 1) {
                    return action;
                }
            }
        });
    }

    get itemShots() {
        if (!this.item) {
            return;
        }
        if (this.item.system.pp != undefined) {
            if (
                this.actor.system.powerPoints.hasOwnProperty(this.item.system.arcane) &&
                this.actor.system.powerPoints[this.item.system.arcane].max
            ) {
                return `${this.actor.system.powerPoints[this.item.system.arcane].value}/${this.actor.system.powerPoints[this.item.system.arcane].max}`;
            }
            return `${this.actor.system.powerPoints.general.value}/${this.actor.system.powerPoints.general.max}`;
        }
        return `${this.item.system.currentShots}/${this.item.system.shots}`;
    }

    /**
     * Returns the actions currently selected in the card
     */
    getSelectedActions() {
        const selected_actions = [];
        Utils.forEachActionGroup(this, group => {
            for (const action of group.actions) {
                if (action.selected) {
                    selected_actions.push(action);
                }
            }
        });
        return selected_actions;
    }

    shouldShowActionsMenu() {
        if (this.trait || this.damage) return true;
        return !!Utils.forEachActionGroup(this, group => {
            if (group.actions.some((a) => a.code.skillOverride || a.code.dmgOverride)) {
                return true;
            }
        });
    }

    /**
     * Creates the Foundry message object
     */
    async createFoundryMessage(new_content) {
        const chatData = await this.createBasicChatData();
        if (new_content) {
            chatData.content = new_content;
        }
        this.message = await ChatMessage.create(chatData);
    }

    /**
     * Creates the basic chat data common to most cards
     * @return {Object} An object suitable to create a ChatMessage
     */
    async createBasicChatData() {
        const whisperData = getWhisperData();
        const chatData = {
            author: getAuthor(this.actor),
            content: "<p>Default content, likely an error in Better Rolls</p>",
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            blind: whisperData.blind,
            flags: { core: { canPopout: true } },
        };
        if (whisperData.whisper) {
            chatData.whisper = whisperData.whisper;
        }
        chatData.sound = "";
        chatData.messageMode = whisperData.messageMode;
        return chatData;
    }
}
