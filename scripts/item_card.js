// Functions for cards representing all items but skills
/* globals Token, TokenDocument, game, CONST, canvas, console, CONFIG, ChatMessage, ui, Hooks, Roll, succ, structuredClone, $, fromUuid */
// noinspection JSCheckFunctionSignatures

import * as BRSW2_CONFIG from "./brsw2-config.js";
import {
    BRSW_CONST,
    BRWSRoll,
    calculate_damage_results,
    check_and_roll_conviction,
    create_common_card,
    get_action_from_click,
    get_roll_options,
    roll_trait,
    spend_bennie,
    update_message,
    has_joker,
    process_common_actions,
    process_minimum_str_modifiers,
    roll_dice,
} from "./cards_common.js";
import {
    SettingsUtils,
    get_targeted_token,
    makeExplotable,
    set_or_update_condition,
    simple_form,
    broofa,
    addEventListenerAll,
    Utils,
    getAuthor,
} from "./utils.js";
import { create_damage_card } from "./damage_card.js";
import { BrCommonCard } from "./BrCommonCard.js";
import { DamageModifier, TraitModifier } from "./modifiers.js";
import { brAction } from "./actions.js";
import { PPManagementDialog } from "./pp_management_dialog.js";
import { get_current_generic_mods } from "../config/generic_pp_modifiers.js";
import { calculateGangUp } from "./skill_card.js";

const ROF_BULLETS = { 1: 1, 2: 5, 3: 10, 4: 20, 5: 40, 6: 50 };

/**
 * Creates a chat card for an item
 *
 * @param {Token, SwadeActor} origin  The actor or token, owning the attribute
 * @param {string} item_id The id of the item that we want to show
 * @param {object} actions_stored An object with action ids as properties
 *   and a boolean meaning if they need to set on or off
 * @return {Promise} A promise for the BrCommonCard object
 */
// eslint-disable-next-line complexity
export async function create_item_card(
    origin,
    item_id,
    { actions_stored = {} } = {},
) {
    let actor = origin;
    if (origin instanceof TokenDocument || origin instanceof foundry.canvas.placeables.Token) {
        actor = origin.actor;
    }


    let item = actor.items.find((item) => {
        return item.id === item_id;
    });

    if (!item) {
        item = await fromUuid(item_id);
    }

    if (item.type === "action" && SettingsUtils.getWorldSetting("disable_for_actions")) {
        // Disable actions
        item.show();
        return;
    }

    let notes = "";
    if (item.system.notes && item.system.notes.length < 50) {
        notes = item.system.notes;
    }

    const description = item.system.description;
    let damage = item.system.damage;
    const ammoEnabled = parseInt(item.system.shots) || item.system.ammo;
    const is_power = !isNaN(parseFloat(item.system.pp)) || item.type === "power";
    const subtract_select = ammoEnabled
        ? SettingsUtils.getWorldSetting("default-ammo-management")
        : false;

    if (!damage && item.system.actions) {
        damage = check_for_actions_with_damage(item);
    }

    const trait = Utils.getItemTrait(item, actor);

    const br_message = create_common_card(
        origin,
        {
            header: { type: "Item", title: item.name, img: item.img },
            notes: notes,
            trait_id: trait ? trait.id || trait : false,
            ammo: ammoEnabled,
            subtract_selected: subtract_select,
            subtractPP: is_power
                ? SettingsUtils.getWorldSetting("default-pp-management")
                : false,
            damage_rolls: [],
            is_power: is_power,
            used_shots: 0,
            description: description,
            tooltip: create_item_card_tooltip(item),
            swade_templates: get_template_from_item(item),
        },
        "modules/betterrolls-swade2/templates/item_card.hbs",
    );
    br_message.type = BRSW_CONST.TYPE_ITEM_CARD;
    br_message.damage = damage;
    br_message.item_id = item_id;
    br_message.applicable_effects = get_applicable_effects(item);
    br_message.pp_modifiers = is_power ? get_pp_mods(item) : {};
    br_message.check_warnings(br_message.render_data);
    await br_message.render(actions_stored);
    await br_message.save();
    call_create_item_card_hooks(item, br_message);
    // eslint-disable-next-line consistent-return
    return br_message;
}

function get_applicable_effects(item) {
    const effects = [];
    for (const effect of item.effects) {
        effects.push({ id: effect.id, name: effect.name, uuid: effect.uuid });
    }
    return effects;
}

function get_pp_mods(item) {
    const pp_mods = {
        powerMods: [],
        additionalRecipientsMod: {},
        extraCost: 0,
    };
    pp_mods.genericMods = get_current_generic_mods().map(mod => ({ ...mod, selected: false }));

    const descriptionDoc = new DOMParser().parseFromString(item.system.description, "text/html");
    const modifiers = Array.from(descriptionDoc.querySelectorAll("li"))
        .map(li => {
            const text = li.textContent.trim();
            const match = text.match(/^(.+?)\s*\(([+-]?\d+(?:\/[+-]?\d+)*)\):/);
            if (!match) return null;

            const mod = {
                name: match[1],
                costs: match[2].split("/"),
                isEpic: li.classList.contains("star-icon"),
            };

            if (mod.name.toLowerCase() == "additional recipients") {
                pp_mods.additionalRecipientsMod = {
                    name: Utils.toTitleCase(mod.name),
                    cost: mod.costs[0],
                    isEpic: mod.isEpic,
                    count: 0,
                };
                return null;
            }

            return mod;
        })
        .filter(Boolean);

    if (modifiers.length) {
        for (let mod of modifiers) {
            for (let cost of mod.costs) {
                if (cost !== "+0") {
                    pp_mods.powerMods.push({
                        name: Utils.toTitleCase(mod.name),
                        cost: cost,
                        isEpic: mod.isEpic,
                        selected: false,
                    });
                }
            }
        }

        pp_mods.powerMods.sort((a, b) => {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            if (nameA < nameB) {
                return -1;
            }
            if (nameA > nameB) {
                return 1;
            }

            return a.cost - b.cost;
        });
    }

    return pp_mods;
}

export function calc_pp_cost(br_card) {
    if (SettingsUtils.isOptionalRuleEnabled("InnatePowersDontConsume") && br_card.item.system.innate) {
        return 0;
    }

    let ppCost = br_card.item.system.pp;

    ppCost += br_card.pp_modifiers.extraCost;

    if (br_card.pp_modifiers.additionalRecipientsMod.name) {
        ppCost += br_card.pp_modifiers.additionalRecipientsMod.cost * br_card.pp_modifiers.additionalRecipientsMod.count;
    }

    const modGroups = [br_card.pp_modifiers.genericMods, br_card.pp_modifiers.powerMods];
    for (const group of modGroups) {
        for (const mod of group) {
            if (mod.selected) {
                const cost = parseInt(mod.cost);
                if (!isNaN(cost)) {
                    ppCost += cost;
                }
            }
        }
    }

    return ppCost;
}

export function check_for_actions_with_damage(item) {
    if (!item.system.actions?.additional) {
        return false;
    }
    for (const action in item.system.actions?.additional) {
        const current_action = item.system.actions.additional[action];
        if (current_action.type === "damage" && current_action.override) {
            return true;
        }
    }
    return false;
}

function create_item_card_tooltip(item) {
    let tooltip = "";
    if (item.type === "weapon") {
        tooltip = `<p>${game.i18n.localize("BRSW.Dmg")}: ${item.system.damage} ${game.i18n.localize("BRSW.ApShort")}: ${item.system.ap} ${game.i18n.localize("BRSW.Shots")}: ${item.system.currentShots}/${item.system.shots}</p>${tooltip}`;
    }
    return tooltip;
}

function call_create_item_card_hooks(item, br_message) {
    // For the moment, assume that no roll is made if there is no skill. Hopefully, in the future, there will be a better way.
    if (
        (item.type === "gear" && item.system.actions.trait === "") ||
        item.system.actions?.trait.toLowerCase() === "none" ||
        (item.system.hasOwnProperty("actions") === false && item.type !== "skill")
    ) {
        Hooks.call("BRSW-CreateItemCardNoRoll", br_message);
    }
}

/**
 * Creates an item card from a token or actor id, mainly for use in macros
 *
 * @param {string} token_id A token id, if it can be solved it will be used
 *  before actor
 * @param {string} actor_id An actor id, it could be set as fallback or
 *  if you keep token empty as the only way to find the actor
 * @param {string} skill_id Id of the item
 * @param {object} actions_stored An object with action ids as properties
 *   and a boolean meaning if they need to set on or off
 * @return {Promise} a promise for the BrCommonCard object
 */
function create_item_card_from_id(
    token_id,
    actor_id,
    skill_id,
    { actions_stored = {} } = {},
) {
    let origin;
    if (canvas && token_id) {
        const token = canvas.tokens.get(token_id);
        if (token) {
            origin = token;
        }
    }
    if (!origin && actor_id) {
        origin = game.actors.get(actor_id);
    }
    return create_item_card(origin, skill_id, {
        actions_stored: actions_stored,
    });
}

/**
 * Hooks the public functions to a global object
 */
export function expose_item_functions() {
    game.brsw.create_item_card = create_item_card;
    game.brsw.create_item_card_from_id = create_item_card_from_id;
    game.brsw.roll_item = roll_item;
    game.brsw.create_damage_card = create_damage_card;
}

/**
 * Listens to click events on character sheets
 * @param ev javascript click event
 * @param {SwadeActor, Token} target token or actor from the char sheet
 * @param {HTMLElement} currentTarget the element that was clicked
 */
async function item_click_listener(ev, target, currentTarget) {
    const action = get_action_from_click(ev);
    if (action === "system") {
        return;
    }
    ev.stopImmediatePropagation();
    ev.preventDefault();
    ev.stopPropagation();
    let actor =
        target instanceof Actor
            ? target
            : target instanceof foundry.canvas.placeables.Token ||
                target instanceof TokenDocument
                ? target.actor
                : null;
    const item_action = ev.currentTarget.dataset.action;
    const item_id = ev.target.closest("[data-item-id]").dataset.itemId;
    const item = actor.items.find((item) => {
        return item.id === item_id;
    });
    const actionObj = foundry.utils.getProperty(
        item,
        "system.actions.additional." + item_action,
    );
    const actions_stored = {};
    if (actionObj) {
        if (actionObj.type === "trait" || actionObj.type === "damage") {
            // This is a trait or damage action
            // Start with the action enabled
            actions_stored[item_action] = true;
        } else if (actionObj.type === "macro") {
            // This is a macro action
            // Execute the macro and return; no need to create a card
            const macro = await fromUuid(actionObj.uuid);
            if (macro) {
                await macro.execute({
                    actor: actor,
                    token: actor ? actor.token : null,
                    item: item,
                });
            }
            return;
        }
    }
    // Show card
    const br_card = await create_item_card(target, item_id, {
        actions_stored: actions_stored,
    });
    if (action.includes("dialog")) {
        game.brsw.dialog.show_card(br_card);
    } else if (br_card.skill && action.includes("trait")) {
        await roll_item(br_card, "", false, action.includes("damage"));
    } else if (br_card.damage && action.includes("damage")) {
        await roll_dmg(br_card, "");
    }
    // Shortcut for rolling damage
    if (ev.target.classList.contains("damage-roll")) {
        await roll_dmg(br_card, $(br_card.message.content), false, false);
    }
}

/**
 * Activates the listeners in the character sheet in items
 * @param app Sheet app
 * @param html Html code
 */
export function activate_item_listeners(app, html) {
    const target = app.token || app.actor || app.object;
    // It is possible that the Super Powers module had updated the sheet, so we get it again
    addEventListenerAll(
        html,
        ".item-image, .item-img, .name.item-show, span.item>.item-control.item-edit," +
        " .gear-card .card-header>.item-name, .damage-roll, .item-name>h4," +
        " .power-header>.item-name, .card-button, .item-control.item-show," +
        " .power button.item-show, .weapon button.item-show, .edge-hindrance>.item-control" +
        " .item-control.item-edit, .item-control.item-show, .item.edge-hindrance>.item-show," +
        " .item>.item-show",
        "click",
        async (ev) => {
            await item_click_listener(ev, target, ev.currentTarget);
        },
        true,
    );
}

/**
 * Creates a template preview
 * @param ev javascript click event
 * @param {BrCommonCard} br_card
 */
function preview_template(ev, br_card) {
    let type = ev.currentTarget.dataset.size;
    if (type === "cone") {
        type = "swcone";
    }
    swade.util.createRegionFromPreset(type, br_card.item);
    Hooks.call(
        "BRSW-BeforePreviewingTemplate",
        CONFIG.SWADE.activeMeasuredTemplatePreview,
        br_card,
        ev,
    );
}

/**
 * Activate the listeners in the item card
 * @param {BrCommonCard} br_card
 * @param html Html produced
 */
export function activate_item_card_listeners(br_card, html) {
    const { actor, item } = br_card;
    html.querySelector(".brsw-header-img")?.addEventListener("click", (_) => {
        item.sheet.render(true);
    });
    addEventListenerAll(html, ".brsw-roll-button", "click", async (ev) => {
        ev.stopPropagation();
        await roll_item(
            br_card,
            html,
            ev.currentTarget.classList.contains("roll-bennie-button"),
        );
    });
    addEventListenerAll(
        html,
        ".brsw-damage-button, .brsw-damage-bennie-button",
        "click",
        (ev) => {
            // noinspection JSIgnoredPromiseFromCall
            roll_dmg(
                br_card,
                html,
                ev.currentTarget.classList.contains("brsw-damage-bennie-button"),
                {},
                ev.currentTarget.id.includes("raise"),
                ev.currentTarget.dataset.token,
            );
        },
    );
    html
        .querySelector(".brsw-ammo-manual")
        ?.addEventListener("click", async (ev) => {
            await item.reload();
            //Update the ammo text of the card we just clicked on.
            //This won't affect change the popout or vice versa,
            //but doing that would require an update to the chat message which would refresh the render which is disruptive
            ev.target.parentElement.querySelector(".brsw-shots-pp").innerText =
                br_card.item_shots;
        });

    html
        .querySelector(".brsw-pp-manual")
        ?.addEventListener("click", async (ev) => {
            await new PPManagementDialog({ brCard: br_card }).wait({ force: true });

            if (SettingsUtils.getWorldSetting("show_pp_shots_info")) {
                //Update the pp text of the card we just clicked on.
                //This won't affect the popout or vice versa,
                //but doing that would require an update to the chat message which would refresh the render which is disruptive
                if (game.settings.get("swade", "noPowerPoints")) {
                    const ppPenalty = ev.target.parentElement.parentElement.querySelector(".brsw-pp-penalty");
                    ppPenalty.innerText = -Math.ceil(calc_pp_cost(br_card) / 2);
                } else {
                    const ppRemaining = ev.target.parentElement.parentElement.querySelector(".brsw-shots-pp");
                    ppRemaining.innerText = br_card.item_shots;

                    const ppCost = ev.target.parentElement.parentElement.querySelector(".brsw-pp-cost");
                    ppCost.innerText = calc_pp_cost(br_card);
                }
            }
        });

    addEventListenerAll(html, ".brsw-apply-damage", "click", (ev) => {
        create_damage_card(
            ev.currentTarget.dataset.token,
            ev.currentTarget.dataset.damage,
            `${actor.name} - ${item.name}`,
            ev.currentTarget.dataset.heavyDamage,
        ).then();
    });
    addEventListenerAll(html, ".brsw-target-tough", "click", (ev) => {
        // noinspection JSIgnoredPromiseFromCall
        edit_toughness(br_card, ev.currentTarget.dataset.index);
    });
    addEventListenerAll(html, ".brsw-add-damage-d6", "click", (ev) => {
        // noinspection JSIgnoredPromiseFromCall
        add_damage_dice(br_card, ev.currentTarget.dataset.index);
    });
    addEventListenerAll(html, ".brsw-half-damage", "click", (ev) => {
        // noinspection JSIgnoredPromiseFromCall
        half_damage(br_card, ev.currentTarget.dataset.index);
    });
    addEventListenerAll(html, ".brsw-add-damage-number", "click", (ev) => {
        show_fixed_damage_dialog(ev, br_card.message);
    });
    addEventListenerAll(html, ".brsw-template-button", "click", (ev) => {
        preview_template(ev, br_card);
    });
    html.querySelector("#roll-damage")?.addEventListener("dragstart", (ev) => {
        ev.originalEvent.dataTransfer.setData(
            "text/plain",
            JSON.stringify({
                type: "target_click",
                tag_id: "roll-damage",
                message_id: br_card.message.id,
            }),
        );
    });
    html
        .querySelector("#roll-raise-damage")
        ?.addEventListener("dragstart", (ev) => {
            ev.originalEvent.dataTransfer.setData(
                "text/plain",
                JSON.stringify({
                    type: "target_click",
                    tag_id: "roll-raise-damage",
                    message_id: br_card.message.id,
                }),
            );
        });
    html.querySelector(".brsw-ammo-toggle")?.addEventListener("click", (ev) => {
        ev.currentTarget.classList.toggle("twbr:bg-red-700");
        ev.currentTarget.classList.toggle("twbr:bg-gray-500");
    });
    html.querySelector(".brsw-pp-toggle")?.addEventListener("click", async (ev) => {
        br_card.render_data.subtractPP = !br_card.render_data.subtractPP;
        await br_card.render();
        await br_card.save();
    });
    html
        .querySelector(".brsw-use-consumable-button")
        ?.addEventListener("click", (ev) => {
            br_card.item.consume();
        });
    addEventListenerAll(html, ".brsw-macro-button", "click", (ev) => {
        const action =
            br_card.item.system.actions.additional[ev.currentTarget.dataset.macro];
        execute_macro(action, br_card).catch((err) => {
            console.error("Error in macro", err);
        });
    });
    addEventListenerAll(html, ".brsw-resist-button", "click", (ev) => {
        roll_resist(
            ev.currentTarget.dataset.trait,
            br_card,
            parseInt(ev.currentTarget.dataset.traitMod),
        ).catch((err) => {
            console.error(`Error while rolling resistance ${err}`);
        });
    });
}

/**
 * Makes an attribute card for a resist roll
 *
 * @param {string} trait - The trait that will be rolled
 * @param {BrCommonCard} br_card - The card from where we get the TN
 * @param {integer} trait_mod
 */
async function roll_resist(trait, br_card, trait_mod) {
    if (canvas.tokens.controlled.length === 0) {
        ui.notifications.warn(game.i18n.localize("BRSW.NoTokenSelectedError"));
        return;
    }
    for (const token of canvas.tokens.controlled) {
        const trait_lower = trait.toLowerCase();
        let new_card;
        if (BRSW2_CONFIG.ATTRIBUTES.includes(trait_lower)) {
            new_card = await game.brsw.create_atribute_card(
                token,
                trait.toLowerCase(),
            );
        } else {
            new_card = await game.brsw.create_skill_card(
                token,
                Utils.traitFromString(token.actor, trait).id,
            );
        }
        new_card.trait_roll.tn = get_trait_roll_difficulty(br_card);
        new_card.trait_roll.tn_reason = game.i18n.localize("BRSW.ResistingRoll");
        if (!isNaN(trait_mod)) {
            const localized_name = game.i18n.localize("BRSW.ResistingRoll");
            const resist_action = new brAction(localized_name, {
                id: broofa(),
                button_name: localized_name,
                skillMod: trait_mod,
            });
            resist_action.selected = true;
            new_card.action_sections["none"].action_groups.resist_button = {
                defaultChecked: "on",
                name: localized_name,
                id: broofa(),
                single_choice: false,
                actions: [resist_action],
            };
        }
        await new_card.render();
        await new_card.save();
    }
}

/**
 * Calculates the difficulty of a resist trait roll
 *
 * @param {Object} br_card - The card object containing trait roll information.
 * @return {number} - The calculated difficulty of the trait roll.
 */
function get_trait_roll_difficulty(br_card) {
    if (br_card.item && br_card.item.type === "power") {
        if (
            br_card.item.system.description.indexOf(
                game.i18n.localize("BRSW.Opposed"),
            ) === -1
        ) {
            // If this is a power, and we can't find opposed in the description, it is probably a flat check.
            return 4;
        }
    }
    const results = br_card.trait_roll.current_roll.dice.map((die) => {
        return die.result;
    });
    return Math.max(...results) + br_card.trait_roll.tn;
}

export async function displayPPChangeCard(actor, chatData) {
    const show_card = SettingsUtils.getWorldSetting("pp_change_card_behaviour");
    if (show_card !== "none") {
        chatData.author = getAuthor(actor);
        chatData.speaker = { alias: actor.name };

        if (show_card === "master_and_gm") {
            chatData.whisper = ChatMessage.getWhisperRecipients("GM");
        }

        if (show_card === "master_only") {
            chatData.whisper = [""];
        }

        await ChatMessage.create(chatData);
    }
}

/**
 * Discount pps from an actor © Javier or Arcane Device © Salieri
 *
 * @param {BrCommonCard} br_card
 * @param prevSpentPP PP we already spent on a previous roll
 */
export async function spendPP(br_card, prevSpentPP) {
    if (game.settings.get("swade", "noPowerPoints")) {
        return 0;
    }

    prevSpentPP ??= 0;
    const actor = br_card.actor;
    const item = br_card.item;

    if (SettingsUtils.isOptionalRuleEnabled("InnatePowersDontConsume") && item.system.innate) {
        return 0;
    }

    let success = false;
    let raise = false;
    for (const roll of br_card.trait_roll.current_roll.dice) {
        if (roll.result === null) continue;

        //Subtract any arcaneActivationOffset from the roll result to get the activation roll
        //This is for cases like missing with bolt due to cover but the power still activates
        const rollResult = roll.result - (br_card.trait_roll.arcaneActivationOffset ?? 0);
        success = success || rollResult >= 0;
        raise = raise || rollResult >= 4;
    }

    const arcaneDevice = item.system.additionalStats.devicePP;

    let currentPP = arcaneDevice
        ? item.system.additionalStats.devicePP.value
        : actor.system.powerPoints.general.value;

    let dataKey = arcaneDevice
        ? "system.additionalStats.devicePP.value"
        : "system.powerPoints.general.value";

    if (actor.system.powerPoints.hasOwnProperty(item.system.arcane) && actor.system.powerPoints[item.system.arcane].max) {
        //Use the specific PP for this arcane type
        currentPP = actor.system.powerPoints[item.system.arcane].value;
        dataKey = `system.powerPoints.${item.system.arcane}.value`;
    }

    const basePPCost = success ? calc_pp_cost(br_card) : 1;
    let ppCost = basePPCost;

    if (raise) {
        const channelingName = game.i18n.localize("BRSW.EdgeName.Channeling").toLowerCase();
        const hasChanneling = !!actor.items.find((i) => {
            return (i.type === "edge" && (i.name.toLowerCase().includes(channelingName) || i.name.toLowerCase().includes("channeling")));
        });

        if (hasChanneling) {
            ppCost = Math.max(ppCost - 1, 0);
        }
    }

    br_card.render_data.used_pp = ppCost;
    await br_card.save();

    const newPP = currentPP - ppCost + prevSpentPP;
    if (newPP < 0) {
        ui.notifications.warn(game.i18n.localize("BRSW.InsufficientPP"));
        return;
    } else {
        if (arcaneDevice) {
            await actor.updateEmbeddedDocuments("Item", { _id: item.id, [dataKey]: newPP });
        } else {
            await actor.update({ [dataKey]: newPP });
        }
    }

    if (ppCost > 0) {
        displayPPChangeCard(actor, {
            content: game.i18n.format("BRSW.ExpendedPoints", {
                name: actor.name,
                final_pp: newPP,
                pp: ppCost,
            })
        });
    } else if (basePPCost > 0) {
        //Power wasn't free and now is so display a message
        displayPPChangeCard(actor, {
            content: game.i18n.localize("BRSW.PowerCostReducedFree")
        });
    }

    return ppCost;
}

/**
 * Execute a list of macros
 * @param macros
 * @param actor_param
 * @param item_param
 * @param br_card_param
 */
export async function run_macros(
    macros,
    actor_param,
    item_param,
    br_card_param,
) {
    if (macros) {
        for (const macro_name of macros) {
            const real_macro = await find_macro(macro_name);
            if (real_macro) {
                const actor = actor_param;
                const item = item_param;
                const speaker = ChatMessage.getSpeaker();
                const token = canvas.tokens.get(speaker.token);
                const { character, targets } = game.user;
                const br_card = br_card_param;
                // Attempt script execution
                const body = `(async () => {${real_macro.command}})()`;
                // prettier-ignore
                const fn = Function( // jshint ignore:line
                    "speaker",
                    "actor",
                    "token",
                    "character",
                    "item",
                    "message",
                    "targets",
                    "br_card",
                    body,
                );
                try {
                    fn.call(
                        this,
                        speaker,
                        actor,
                        token,
                        character,
                        item,
                        br_card.message,
                        targets,
                        br_card,
                    );
                } catch (err) {
                    ui.notifications.error(
                        `There was an error in your macro syntax. See the console (F12) for details`,
                    );
                }
            }
        }
    }
}

/**
 * Finds a macro from a name or id
 * @param {string} macro_name_or_id
 */
async function find_macro(macro_name_or_id) {
    let macro =
        game.macros.getName(macro_name_or_id) || game.macros.get(macro_name_or_id);
    if (!macro) {
        // Try UUID
        macro = await fromUuid(macro_name_or_id);
    }
    if (!macro) {
        // Search compendiums
        for (const compendium of game.packs.contents) {
            if (compendium.documentClass.documentName === "Macro") {
                const possible_macro =
                    compendium.index.getName(macro_name_or_id) ||
                    compendium.index.get(macro_name_or_id);
                if (possible_macro) {
                    macro = await compendium.getDocument(possible_macro._id);
                }
            }
        }
    }
    return macro;
}

/**
 * Roll and existing item card
 *
 * @param {BrCommonCard } br_message Message that originates this roll
 * @param {string} html Html code to parse for extra options
 * @param {boolean} expend_bennie Whenever to expend a bennie
 * @param {boolean} roll_damage true if we want to auto-roll damage
 *
 * @return {Promise<void>}
 */
export async function roll_item(br_message, html, expend_bennie, roll_damage) {
    const macros = [];
    let shots_override; // Override the number of shots used
    let shots_modifier = 0; // Modifier to the number of shots
    const extra_data = { modifiers: [] };
    if (br_message.trait_roll.is_rolled) {
        br_message.trait_roll.reroll_mode = expend_bennie ? "benny" : "free";
    }

    if (expend_bennie) {
        await spend_bennie(br_message.actor);
    }

    extra_data.rof = br_message.item.system.rof || 1;
    if (SettingsUtils.getUserSetting("default_rate_of_fire") === "single_shot") {
        extra_data.rof = 1;
    }

    // Actions
    for (const action of br_message.get_selected_actions()) {
        if (action.code.skillOverride) {
            const trait = Utils.traitFromString(
                br_message.actor,
                action.code.skillOverride,
            );
            br_message.skill_id = trait.id;
        }
        if (action.code.resourcesUsed) {
            const shots_used = action.code.resourcesUsed;
            let first_char = "";
            try {
                first_char = shots_used.charAt(0);
            } catch { }
            if (first_char !== "+" && first_char !== "-") {
                shots_override = parseInt(shots_used);
            }
        }
        process_common_actions(action.code, extra_data, macros, br_message.actor);
    }

    // Check for minimum strength
    if (
        br_message.item.system.minStr &&
        Utils.isShootingSkill(Utils.getItemTrait(br_message.item, br_message.actor))
    ) {
        const penalty = process_minimum_str_modifiers(
            br_message.item,
            br_message.actor,
            "BRSW.NotEnoughStrength",
        );
        if (penalty) {
            extra_data.modifiers.push(penalty);
        }
    }

    // Trademark weapon
    if (br_message.item.system.trademark) {
        extra_data.modifiers.push(
            new TraitModifier(
                game.i18n.localize("BRSW.TrademarkWeapon"),
                br_message.item.system.trademark,
            ),
        );
    }

    // Offhand
    if (br_message.item.system.equipStatus === 2) {
        let is_ambidextrous = br_message.actor.items.find(
            (item) =>
                item.type === "edge" &&
                item.name.toLowerCase() ===
                game.i18n.localize("BRSW.EdgeName.Ambidextrous").toLowerCase(),
        );
        is_ambidextrous =
            is_ambidextrous || br_message.actor.getFlag("swade", "ambidextrous");
        if (!is_ambidextrous) {
            extra_data.modifiers.push(
                new TraitModifier(game.i18n.localize("BRSW.Offhand"), -2),
            );
        }
    }

    // Item properties tab
    if (br_message.item.system.actions.traitMod) {
        const new_modifier = new TraitModifier(
            game.i18n.localize("BRSW.ItemPropertiesTraitMod"),
            br_message.item.system.actions.traitMod,
        );
        await new_modifier.evaluate();
        extra_data.modifiers.push(new_modifier);
    }

    // Item global modifiers
    if (
        br_message.item.type === "weapon" &&
        br_message.actor.system.stats.globalMods.attack
    ) {
        for (const modifier of br_message.actor.system.stats.globalMods.attack) {
            extra_data.modifiers.push(
                new TraitModifier(modifier.label, modifier.value),
            );
        }
    }

    // Target global modifiers.
    const targets = br_message.targets;
    if (targets.length > 0 && Utils.isWeaponOrBolt(br_message.item)) {
        function addMods(mods) {
            for (const modifier of mods) {
                if (modifier.ignore) continue;
                extra_data.modifiers.push(new TraitModifier(modifier.label, modifier.value));
            }
        }

        const target = targets[0];
        if (target && target.actor) {
            const targetGlobalMods = target.actor.system.stats.globalMods;
            addMods(targetGlobalMods.targetAttack);
            if (Utils.isMeleeAttack(br_message.item, target.actor, br_message.skill)) {
                addMods(targetGlobalMods.targetAttackMelee);
            } else if (Utils.isRangedAttack(br_message.item, target.actor, br_message.skill)) {
                addMods(targetGlobalMods.targetAttackRanged);
            }
        }
    }

    await roll_trait(
        br_message,
        br_message.skill.system,
        game.i18n.localize("BRSW.SkillDie"),
        extra_data,
    );

    // Ammo management
    if (
        parseInt(br_message.item.system.shots) ||
        br_message.item.system.autoReload
    ) {
        const dis_ammo_selected = html
            ? !!html.querySelector(".twbr\\:bg-red-700.brsw-ammo-toggle")
            : SettingsUtils.getWorldSetting("default-ammo-management");
        if (dis_ammo_selected || macros.length) {
            br_message.render_data.used_shots =
                shots_override || ROF_BULLETS[br_message.trait_roll.rof || 1];
            if (dis_ammo_selected && br_message.trait_roll.rolls.length === 1) {
                await br_message.item.consume(br_message.render_data.used_shots);
            }
        }
    }

    // Power points management
    const subtractPP = br_message.render_data.subtractPP;
    const previous_pp = br_message.trait_roll.old_rolls.length ? br_message.render_data.used_pp : 0;
    if (subtractPP && !isNaN(parseInt(br_message.item.system.pp)) && br_message.item.type === "power") {
        br_message.render_data.used_pp = await spendPP(
            br_message,
            previous_pp,
        );
    }

    await br_message.render();
    await br_message.save();

    await run_macros(macros, br_message.actor, br_message.item, br_message);

    //Call a hook after roll for other modules
    Hooks.call("BRSW-RollItem", br_message, html);
    if (roll_damage) {
        br_message.trait_roll.current_roll.dice.forEach((roll) => {
            if (roll.result !== null && roll.result >= 0) {
                roll_dmg(br_message, html, false, {}, roll.result > 3);
            }
        });
    }
}

// DAMAGE ROLLS
/**
 * Gets the toughness value for the targeted token
 * @param {SwadeActor} acting_actor
 * @param {Token} target
 * @param {string} location
 */
function get_target_defense(
    acting_actor,
    target = undefined,
    location = "torso",
) {
    let objective = target || get_targeted_token();
    if (!objective) {
        canvas.tokens.controlled.forEach((token) => {
            // noinspection JSUnresolvedVariable
            if (token.actor !== acting_actor) {
                objective = token;
            }
        });
    }
    const defense_values = {
        toughness: 4,
        armor: 0,
        name: game.i18n.localize("BRSW.Default"),
    };
    if (objective && objective.actor) {
        if (objective.actor.type !== "vehicle") {
            //Get the base toughness without armor
            const base_toughness =
                objective.actor.system.stats.toughness.value -
                objective.actor.system.stats.toughness.armor;
            //Get the armor of the location we're targeting
            defense_values.armor =
                location === "torso" ? objective.actor.system.stats.toughness.armor :
                    objective.actor.armorPerLocation[location] ?? objective.actor.system.stats.toughness.armor;
            //Add that armor to the base toughness to get the correct toughness
            defense_values.toughness = base_toughness + defense_values.armor;
            defense_values.name = objective.name;
            defense_values.token_id = objective.id;
        } else {
            defense_values.toughness = parseInt(
                objective.actor.system.toughness.total,
            );
            defense_values.armor = parseInt(objective.actor.system.toughness.armor);
            defense_values.name = objective.name;
            defense_values.token_id = objective.id;
        }
    }
    return defense_values;
}

/**
 * Adjust a roll formula to a strength limit
 * @param damage_roll
 * @param roll_formula
 * @param str_die_size
 * @return {string}
 */
function adjust_dmg_str(damage_roll, roll_formula, str_die_size) {
    // Minimum strength is not meet
    damage_roll.brswroll.modifiers.push(
        new DamageModifier(game.i18n.localize("BRSW.NotEnoughStrength"), 0),
    );
    let new_roll_formula = "";
    for (const piece of roll_formula.split("d")) {
        const piece_value = parseInt(piece);
        let new_piece = piece;
        if (piece_value && piece_value > str_die_size) {
            new_piece = new_piece.replace(
                piece_value.toString(),
                str_die_size.toString(),
            );
        }
        new_roll_formula += new_piece + "d";
    }
    return new_roll_formula.slice(0, new_roll_formula.length - 1);
}

async function roll_dmg_target(
    damage_roll,
    damage_formulas,
    target,
    total_modifiers,
    message,
) {
    const br_card = new BrCommonCard(message);
    const { actor, item } = br_card;
    const current_damage_roll = JSON.parse(JSON.stringify(damage_roll));
    // @zk-sn: If strength is 1, make @str not explode: fix for #211 (Str 1 can't be rolled)
    const shortcuts = actor.getRollData();
    if (shortcuts.str === "1d1x[Strength]") {
        shortcuts.str = "1d1[Strength]";
    }
    if (!damage_formulas.explodes) {
        for (const key of ["sma", "spi", "str", "agi", "vig"]) {
            shortcuts[key] = shortcuts[key].replace("x", "");
        }
    }
    const roll = new Roll(
        damage_formulas.damage + damage_formulas.raise,
        shortcuts,
    );
    await roll.evaluate();

    // Heavy armor
    if (
        target &&
        !item.system.isHeavyWeapon &&
        !damage_formulas.heavy_weapon &&
        has_heavy_armor(target, damage_formulas.location)
    ) {
        const no_damage_mod = new DamageModifier(
            game.i18n.localize("BRSW.HeavyArmor"),
            -999999,
        );
        current_damage_roll.brswroll.modifiers.push(no_damage_mod);
        total_modifiers += -999999;
    }

    // Target damage global mods
    if (target) {
        for (const mod of target.actor.system.stats.globalMods.targetDamage) {
            if (!mod.ignore) {
                const targetDamage = new DamageModifier(mod.label, mod.value);
                current_damage_roll.brswroll.modifiers.push(targetDamage);
                total_modifiers += mod.value;
            }
        }
    }

    // Multiply modifiers must be last
    if (damage_formulas.multiplier !== 1) {
        const multiplier = parseFloat(damage_formulas.multiplier) || 2;
        const final_value = (roll.total + total_modifiers) * multiplier;
        const multiply_mod = new DamageModifier(
            `x ${damage_formulas.multiplier}`,
            final_value - total_modifiers - roll.total,
        );
        current_damage_roll.brswroll.modifiers.push(multiply_mod);
        total_modifiers = final_value - roll.total;
    }

    const defense_values = get_target_defense(
        actor,
        target,
        damage_formulas.location,
    );

    current_damage_roll.brswroll.rolls.push({
        result: roll.total + total_modifiers,
        tn: defense_values.toughness,
        armor: defense_values.armor,
        ap: damage_formulas.ap || 0,
        target_id: defense_values.token_id || 0,
    });

    let last_string_term = "";
    for (const term of roll.terms) {
        if (term.hasOwnProperty("_faces")) {
            const new_die = {
                faces: term._faces,
                results: [],
                extra_class: "",
            };
            new_die.label = term.flavor
                ? `${term.flavor.charAt(0).toUpperCase()}${term.flavor.slice(1)}`
                : game.i18n.localize("SWADE.Dmg");
            new_die.label += ` (d${term._faces})`;
            for (const result of term.results) {
                new_die.results.push(result.result);
                if (result.result >= term._faces) {
                    new_die.extra_class = " brsw-blue-text";
                    if (!current_damage_roll.brswroll.rolls[0].extra_class) {
                        current_damage_roll.brswroll.rolls[0].extra_class =
                            " brsw-blue-text";
                    }
                }
            }
            current_damage_roll.brswroll.dice.push(new_die);
        } else {
            if (term.number) {
                const modifier_value = parseInt(last_string_term + term.number);
                if (modifier_value) {
                    const new_mod = new DamageModifier(
                        game.i18n.localize("SWADE.Dmg") + ` (${modifier_value})`,
                        modifier_value,
                    );
                    current_damage_roll.brswroll.modifiers.unshift(new_mod);
                }
            }
            last_string_term = term.operator;
        }
    }

    if (damage_formulas.raise) {
        // The Last die is raise die.
        current_damage_roll.brswroll.dice[
            current_damage_roll.brswroll.dice.length - 1
        ].label = game.i18n.localize("BRSW.Raise");
    }

    current_damage_roll.label = defense_values.name;

    const damage_theme = SettingsUtils.getUserSetting("damageDieTheme");
    if (damage_theme !== "None") {
        for (const die of roll.dice) {
            die.options.colorset = damage_theme;
        }
    }

    await roll_dice(message, damage_roll.brswroll, roll);

    current_damage_roll.damage_result = calculate_damage_results(
        current_damage_roll.brswroll.rolls,
    );

    return current_damage_roll;
}

function get_chat_dmg_modifiers(options, damage_roll) {
    // Betterrolls modifiers
    options.dmgMods.forEach((mod) => {
        damage_roll.brswroll.modifiers.push(
            new DamageModifier("Better Rolls", mod),
        );
    });
}

function calc_min_str_penalty(item, actor, damage_formulas, damage_roll) {
    const splited_minStr = item.system.minStr.split("d");
    const min_str_die_size = parseInt(splited_minStr[splited_minStr.length - 1]);
    let str_die_size = actor?.system?.attributes?.strength?.die?.sides;
    if (actor?.system?.attributes?.strength.encumbranceSteps) {
        str_die_size += Math.max(
            actor?.system?.attributes?.strength.encumbranceSteps * 2,
            0,
        );
    }
    if (
        min_str_die_size &&
        !Utils.isShootingSkill(Utils.getItemTrait(item, actor)) &&
        min_str_die_size > str_die_size
    ) {
        damage_formulas.damage = adjust_dmg_str(
            damage_roll,
            damage_formulas.damage,
            str_die_size,
        );
    }
}

/**
 * Calculates the modifier from jokers to the damage roll.
 * @param {BrCommonCard} br_card
 * @param damage_roll
 */
function joker_modifiers(br_card, damage_roll) {
    const token_id = br_card.token?.id;
    if (token_id && has_joker(token_id)) {
        damage_roll.brswroll.modifiers.push(
            new DamageModifier(
                "Joker",
                br_card.actor.getFlag("swade", "jokerBonus") ?? 2,
            ),
        );
    }
}

async function get_damage_mods_from_actions(
    br_card,
    damage_formulas,
    damage_roll,
    macros,
    expend_bennie,
) {
    for (const action of br_card.get_selected_actions()) {
        if (action.code.isHeavyWeapon) {
            damage_formulas.heavy_weapon = true;
        }
        if (action.code.dmgMod) {
            let dmgMod = action.code.dmgMod;
            if (action.code.isWildAttack) {
                const newDamage = br_card.actor?.getFlag('swade', 'wildAttackDamage');
                if (newDamage != undefined) {
                    //wildAttackDamage replaces the default mod
                    dmgMod = newDamage;
                }
            }

            const action_name = game.i18n.localize(action.code.name);
            const new_modifier = new DamageModifier(
                action_name,
                dmgMod,
                br_card.actor?.getRollData(),
            );
            await new_modifier.evaluate();
            damage_roll.brswroll.modifiers.push(new_modifier);
        }
        if (action.code.dmgOverride) {
            damage_formulas.damage = action.code.dmgOverride;
        }
        if (action.code.self_add_status) {
            set_or_update_condition(action.code.self_add_status, br_card.actor).catch(
                () => {
                    console.error("BR2: Unable to update condition");
                },
            );
        }
        if (action.code.runDamageMacro) {
            macros.push(action.code.runDamageMacro);
        }
        if (action.code.raiseDamageFormula) {
            damage_formulas.raise = action.code.raiseDamageFormula;
        }
        if (action.code.overrideAp) {
            damage_formulas.ap = action.code.overrideAp;
        }
        if (action.code.apMod) {
            damage_formulas.ap += parseInt(action.code.apMod);
        }
        const reroll_mode = expend_bennie ? "benny" : "free";
        if (
            action.code.rerollDamageMod &&
            (!action.code.rerollMode || action.code.rerollMode === reroll_mode)
        ) {
            damage_roll.brswroll.modifiers.push(
                new DamageModifier(
                    game.i18n.localize(action.code.name),
                    action.code.rerollDamageMod,
                    br_card.actor?.getRollData(),
                ),
            );
        }
        if (action.code.multiplyDmgMod) {
            damage_formulas.multiplier = action.code.multiplyDmgMod;
        }
        if (action.code.avoid_exploding_damage) {
            damage_formulas.explodes = false;
        }
        if (action.code.change_location) {
            damage_formulas.location = action.code.change_location;
        }
    }
}

/**
 * Gets any damage from any action
 * @param {BrCommonCard} br_card
 */
function get_any_damage_from_actions(br_card) {
    let damage = "1";
    Utils.forEachActionGroup(br_card, group => {
        for (const action of group.actions) {
            if (action.code.dmgOverride) {
                if (action.selected || action.code.dmgOverride != 0) {
                    damage = action.code.dmgOverride;
                    return true;
                }
            }
        }
    });
    return damage;
}

/**
 * Rolls damage dor an item
 * @param {BrCommonCard} br_card
 * @param html
 * @param expend_bennie
 * @param default_options
 * @param {boolean} raise
 * @param {string} target_token_id
 * @return {Promise<void>}*
 */
export async function roll_dmg(
    br_card,
    html,
    expend_bennie,
    default_options,
    raise,
    target_token_id,
) {
    const { render_data, actor, item } = br_card;
    const raise_die_size = item.system.bonusDamageDie || 6;
    const number_raise_dice = item.system.bonusDamageDice || 1;
    const damage_formulas = {
        damage: item.system.damage,
        raise: `+${number_raise_dice}d${raise_die_size}x`,
        ap: parseInt(item.system.ap),
        multiplier: 1,
        explodes: true,
        heavy_weapon: false,
        location: "torso",
    };

    const macros = [];
    if (expend_bennie) {
        await spend_bennie(actor);
    }

    // Calculate modifiers
    const options = get_roll_options(default_options, br_card);

    // Shotgun
    if (damage_formulas.damage === "1-3d6" && item.type === "weapon") {
        // Bet that this is a shotgun
        damage_formulas.damage = "3d6";
    }

    const damage_roll = { label: "---", brswroll: new BRWSRoll(), raise: raise };
    get_chat_dmg_modifiers(options, damage_roll);
    joker_modifiers(br_card, damage_roll);

    // Item properties tab
    if (item.system.actions.dmgMod) {
        const new_modifier = new DamageModifier(
            game.i18n.localize("BRSW.ItemPropertiesDmgMod"),
            item.system.actions.dmgMod,
            br_card.actor?.getRollData(),
        );
        await new_modifier.evaluate();
        damage_roll.brswroll.modifiers.push(new_modifier);
    }

    // Minimum strength
    if (item.system.minStr) {
        calc_min_str_penalty(item, actor, damage_formulas, damage_roll);
    }

    // Actions
    await get_damage_mods_from_actions(
        br_card,
        damage_formulas,
        damage_roll,
        macros,
        expend_bennie,
    );

    if (!damage_formulas.damage) {
        // Damage is empty and damage action has not been selected...
        damage_formulas.damage = get_any_damage_from_actions(br_card);
    }

    //Conviction
    const conviction_modifier = await check_and_roll_conviction(actor);
    if (conviction_modifier) {
        damage_roll.brswroll.modifiers.push(conviction_modifier);
    }

    get_global_modifiers(expend_bennie, actor, damage_roll, damage_formulas);

    // Roll
    if (damage_formulas.explodes) {
        damage_formulas.damage = makeExplotable(damage_formulas.damage);
    } else {
        damage_formulas.damage = damage_formulas.damage.replace("x", "");
        damage_formulas.raise = damage_formulas.raise.replace("x", "");
    }

    const targets = await get_dmg_targets(target_token_id, br_card);
    if (!raise) {
        damage_formulas.raise = "";
    }

    // Gang Up on Damage
    if (Utils.isMeleeAttack(item, actor, br_card.skill) && actor?.system.stats?.gangUpDamage && targets[0]) {
        const gangUp = calculateGangUp(br_card.token, targets[0]);
        if (gangUp.bonus) {
            damage_roll.brswroll.modifiers.push(
                new DamageModifier(gangUp.name, gangUp.bonus)
            );
        }
    }

    let total_modifiers = 0;
    for (const modifier of damage_roll.brswroll.modifiers) {
        total_modifiers += modifier.value;
    }

    let first_roll = true;
    for (const target of targets) {
        if (target || first_roll) {
            render_data.damage_rolls.push(
                await roll_dmg_target(
                    damage_roll,
                    damage_formulas,
                    target,
                    total_modifiers,
                    br_card.message,
                ),
            );
            first_roll = false; // Only roll once without targets.
        }
    }

    await update_message(br_card, render_data);

    // Run macros
    await run_macros(macros, actor, item, br_card);

    Hooks.call("BRSW-RollDamage", br_card, html);
}

function get_global_modifiers(
    expend_bennie,
    actor,
    damage_roll,
    damage_formulas,
) {
    if (expend_bennie && actor.system.stats.globalMods.bennyDamage.length) {
        for (const modifier of actor.system.stats.globalMods.bennyDamage) {
            damage_roll.brswroll.modifiers.push(
                new DamageModifier(modifier.label, modifier.value),
            );
        }
    }
    for (const modifier of actor.system.stats.globalMods.ap) {
        damage_formulas.ap += modifier.value;
        damage_roll.brswroll.modifiers.push(
            new DamageModifier(
                `${game.i18n.localize("BRSW.APModifier")}: ${modifier.label}`,
                0,
            ),
        );
    }
}

/**
 * Return an array of actors from a token id or targeted tokens
 * @param {string} token_id
 * @param {BrCommonCard} br_card
 */
async function get_dmg_targets(token_id, br_card) {
    if (token_id) {
        const token = canvas.tokens.get(token_id);
        if (token) {
            return [token];
        }
    }
    let targets = await game.user.targets;
    if (targets.size > 0) {
        targets = Array.from(targets).filter((token) => token.actor);
    } else if (br_card.targets.length > 0) {
        targets = br_card.targets;
    } else {
        targets = [undefined];
    }
    return targets;
}

/**
 * Add a d6 to a damage roll
 * @param {BrCommonCard} br_card
 * @param {int} index
 */
async function add_damage_dice(br_card, index) {
    const render_data = br_card.message.getFlag(
        "betterrolls-swade2",
        "render_data",
    );
    const damage_rolls = render_data.damage_rolls[index].brswroll;
    const roll = new Roll("1d6x");
    await roll.evaluate();
    damage_rolls.rolls[0].result += roll.total;
    roll.terms.forEach((term) => {
        const new_die = {
            faces: term.faces,
            results: [],
            extra_class: "",
            label: game.i18n.localize("SWADE.Dmg"),
        };
        if (term.total > term.faces) {
            new_die.extra_class = " brsw-blue-text";
        }
        term.results.forEach((result) => {
            new_die.results.push(result.result);
        });
        damage_rolls.dice.push(new_die);
    });
    render_data.damage_rolls[index].damage_result = calculate_damage_results(
        damage_rolls.rolls,
    );

    const damage_theme = SettingsUtils.getUserSetting("damageDieTheme");
    if (damage_theme !== "None") {
        roll.dice.forEach((die) => {
            die.options.colorset = damage_theme;
        });
    }
    await roll_dice(br_card.message, render_data.damage_rolls[index].brswroll, roll);
    // noinspection JSIgnoredPromiseFromCall
    await update_message(br_card, render_data);
}

function show_fixed_damage_dialog(event, message) {
    // noinspection AnonymousFunctionJS
    const target = event.currentTarget;
    simple_form(
        game.i18n.localize("BRSW.EditModifier"),
        [
            { label: "Label", default_value: "Mod" },
            { label: "Value", default_value: 0 },
        ],
        (values) => {
            add_fixed_damage(target, message, values);
        },
    );
}

/**
 * Adds a fixed amount of damage to a roll
 * @param event
 * @param form_results
 */
async function add_fixed_damage(target, message, form_results) {
    const modifier = parseInt(form_results.Value);
    if (!modifier) {
        return;
    }
    const { index } = target.dataset;
    const render_data = message.getFlag("betterrolls-swade2", "render_data");
    const damage_rolls = render_data.damage_rolls[index].brswroll;
    damage_rolls.modifiers.push({ value: modifier, name: form_results.Label });
    damage_rolls.rolls[0].result += modifier;
    render_data.damage_rolls[index].damage_result = calculate_damage_results(
        damage_rolls.rolls,
    );
    await update_message(message, render_data);
}

/**
 * Change damage to half
 * @param {BrCommonCard} br_card
 * @param {number} index
 */
async function half_damage(br_card, index) {
    const render_data = br_card.message.getFlag(
        "betterrolls-swade2",
        "render_data",
    );
    const damage_rolls = render_data.damage_rolls[index].brswroll;
    const half_damage = -Math.round(damage_rolls.rolls[0].result / 2);
    damage_rolls.modifiers.push({
        value: half_damage,
        name: game.i18n.localize("BRSW.HalfDamage"),
    });
    damage_rolls.rolls[0].result += half_damage;
    render_data.damage_rolls[index].damage_result = calculate_damage_results(
        damage_rolls.rolls,
    );
    await update_message(br_card, render_data);
}

/**
 * Changes the damage target of one of the rolls.
 *
 * @param {BrCommonCard} br_card
 * @param {int} index
 */
async function edit_toughness(br_card, index) {
    const { render_data, actor } = br_card;
    const defense_values = get_target_defense(actor);
    const damage_rolls = render_data.damage_rolls[index].brswroll.rolls;
    damage_rolls[0].tn = defense_values.toughness;
    damage_rolls[0].armor = defense_values.armor;
    damage_rolls[0].target_id = defense_values.token_id || 0;
    render_data.damage_rolls[index].label = defense_values.name;
    render_data.damage_rolls[index].damage_result =
        calculate_damage_results(damage_rolls);
    // noinspection JSIgnoredPromiseFromCall
    await update_message(br_card, render_data);
}

/**
 * Gets a template name from an item description or an item value
 * @param {Item} item
 */
function get_template_from_item(item) {
    const TEMPLATE_KEYS = {
        scone: {
            key: "scone",
            key_text: ["BRSW.SmallCone", "small cone"],
            type: "swscone",
            label: "BRSW.SmallConeShort",
        },
        cone: {
            key: "cone",
            key_text: ["BRSW.Cone", "cone"],
            type: "swcone",
            label: "BRSW.ConeShort",
        },
        small: {
            key: "small",
            key_text: ["BRSW.SmallTemplate", "sbt", "small blast"],
            type: "sbt",
            label: "BRSW.SmallTemplateShort",
        },
        medium: {
            key: "medium",
            key_text: ["BRSW.MediumTemplate", "mbt", "medium blast"],
            type: "mbt",
            label: "BRSW.MediumTemplateShort",
        },
        large: {
            key: "large",
            key_text: ["BRSW.LargeTemplate", "lbt", "large blast"],
            type: "lbt",
            label: "BRSW.LargeTemplateShort",
        },
        stream: {
            key: "stream",
            key_text: ["BRSW.StreamTemplate", "stream"],
            type: "stream",
            label: "BRSW.StreamTemplateShort",
        },
    };
    if (["weapon", "power", "action", "gear", "shield"].indexOf(item.type) < 0) {
        return [];
    }
    const templates_found = [];
    for (const template_key in item.system.templates) {
        if (item.system.templates[template_key] === true) {
            const template = TEMPLATE_KEYS[template_key];
            templates_found.push(template);
        }
    }
    for (const [template_key, template_value] of Object.entries(TEMPLATE_KEYS)) {
        for (const key_text of template_value.key_text) {
            const translated_key_text = game.i18n.localize(key_text);
            if (templates_found.find((t) => t.key == template_key)) {
                break;
            }
            if (
                item.system?.description?.toLowerCase().includes(translated_key_text)
            ) {
                templates_found.push(template_value);
                break;
            } else if (typeof item.system?.range === "string") {
                const range = item.system.range.toLowerCase();
                if (range.includes(translated_key_text)) {
                    if (
                        template_key == "cone" &&
                        templates_found.find((t) => t.key == "scone")
                    ) {
                        //If we have the small cone, don't add a normal cone
                        break;
                    }
                    templates_found.push(template_value);
                    break;
                }
            }
        }
    }
    return templates_found;
}

/**
 * Returns true if the target wears a Heavy Armor
 * @param {PlaceableObject} target
 */
function has_heavy_armor(target, location = "torso") {
    // Equipped is equipStatus 3
    return target.document.actor.itemTypes.armor.some(
        (item) =>
            item.system.isHeavyArmor &&
            item.system.locations[location] &&
            item.system.equipStatus === 3,
    );
}

async function execute_macro(action, br_card) {
    if (!action.uuid) {
        return null;
    }
    const macro = await fromUuid(action.uuid);
    if (!macro) {
        console.warn(
            game.i18n.format("SWADE.CouldNotFindMacro", { uuid: action.uuid }),
            { toast: true },
        );
        return null;
    }
    //The System uses an item actor if macroActor is set to 'self' or the first selected tokens actor if not.
    let targetActor, targetToken;
    if (action.macroActor === "self") {
        targetActor = br_card.actor;
        targetToken = br_card.token;
    } else if (action.macroActor === "target") {
        targetToken = game.user.targets.first() || br_card.token;
        targetActor = targetToken.actor;
    } else {
        targetToken =
            game.canvas.tokens.controlled.length < 1
                ? br_card.token
                : game.canvas.tokens.controlled[0];
        targetActor =
            game.canvas.tokens.controlled.length < 1
                ? br_card.actor
                : game.canvas.tokens.controlled[0].actor;
    }
    await macro.execute({
        actor: targetActor,
        token: targetToken,
        item: br_card.item,
    });
    return null;
}
