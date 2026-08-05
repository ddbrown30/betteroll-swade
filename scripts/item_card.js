// Functions for cards representing all items but skills
/* globals Token, TokenDocument, game, CONST, canvas, console, CONFIG, ChatMessage, ui, Hooks, Roll, succ, structuredClone, $, fromUuid */
// noinspection JSCheckFunctionSignatures

import { get_current_generic_mods } from "../config/generic_pp_modifiers.js";
import { BrCommonCard } from "./BrCommonCard.js";
import { brAction } from "./actions.js";
import { USER_SETTING_KEYS, WORLD_SETTING_KEYS } from "./brsw2-config.js";
import { BRSW2_CONST } from "./brsw2-const.js";
import {
    BRSWRoll,
    calculate_damage_results,
    check_and_roll_conviction,
    create_common_card,
    getActionFromClick,
    getRollOptions,
    has_joker,
    process_common_actions,
    process_minimum_str_modifiers,
    roll_dice,
    roll_trait,
    spendBenny,
    update_message,
    withButtonSpinner,
} from "./cards_common.js";
import { createDamageCard } from "./damage_card.js";
import { DamageModifier, TraitModifier } from "./modifiers.js";
import { PPManagementDialog } from "./pp_management_dialog.js";
import { calculateGangUp } from "./skill_card.js";
import {
    SettingsUtils,
    Utils,
    addEventListenerAll,
    broofa,
    getAuthor,
    getTargetedToken,
    getUserTargets,
    makeExplodable,
    set_or_update_condition,
    simple_form,
} from "./utils.js";

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
export async function createItemCard(
    origin,
    item_id,
    { actions_stored = {}, vehicle } = {},
) {
    const actor = Utils.toActor(origin);

    let item = actor.items.find((item) => {
        return item.id === item_id;
    });

    if (!item) {
        item = await fromUuid(item_id);
    }

    let notes = "";
    if (item.system.notes && item.system.notes.length < 50) {
        notes = item.system.notes;
    }

    const description = item.system.description;
    const ammoEnabled = parseInt(item.system.shots) || item.system.ammo;
    const is_power = !isNaN(parseFloat(item.system.pp)) || item.type === "power";
    const subtract_select = ammoEnabled
        ? SettingsUtils.getWorldSetting(WORLD_SETTING_KEYS.defaultAmmoManagement)
        : false;

    const trait = Utils.getItemTrait(item, actor);

    const brCard = create_common_card(
        origin,
        {
            header: { type: "Item", title: item.name, img: item.img },
            notes: notes,
            trait: trait ?? false,
            ammo: ammoEnabled,
            subtract_selected: subtract_select,
            subtractPP: is_power
                ? Utils.getDefaultPPManagementSetting()
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

    brCard.type = BRSW2_CONST.BRSW_CARD_TYPES.TYPE_ITEM_CARD;
    if (vehicle) {
        brCard.vehicleActorId = vehicle.actor?.id || vehicle.id;
        if (vehicle instanceof TokenDocument || vehicle instanceof foundry.canvas.placeables.Token) {
            brCard.vehicleTokenId = vehicle.id;
        }
    }
    brCard.damage = !!item.system.damage;
    brCard.item_id = item_id;
    brCard.applicable_effects = get_applicable_effects(item);
    brCard.pp_modifiers = is_power ? get_pp_mods(item) : {};
    brCard.checkWarnings(brCard.render_data);

    await brCard.render(actions_stored);

    call_create_item_card_hooks(item, brCard);

    return brCard;
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

    const processLis = (li) => {
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
    };

    let modifiers = [];

    const descriptionDoc = new DOMParser().parseFromString(item.system.description, "text/html");

    //If we have the Mega Modifiers text in our descriptions, we need to process the lis differently
    const megaModsText = game.i18n.localize("BRSW.PowerModifiers.MegaModifiers");
    if (descriptionDoc.documentElement.textContent.includes(megaModsText)) {
        const normalModLis = [];
        const megaModLis = [];

        let afterMegaMods = false;
        let node;
        const walker = descriptionDoc.createTreeWalker(descriptionDoc.body, NodeFilter.SHOW_ELEMENT);

        //Walk through all the nodes saving our lis
        //Once we hit the mega mods text, start putting the lis into a different array
        while ((node = walker.nextNode())) {
            if (!afterMegaMods && (node.tagName === "H2" || node.tagName === "H3")) {
                //If we hit the Mega Mods text, treat all lis after this point as mega mods
                afterMegaMods = node.textContent.includes(megaModsText);
                continue;
            }

            if (node.tagName === "LI") {
                if (afterMegaMods) megaModLis.push(node);
                else normalModLis.push(node);
            }
        }

        modifiers = Array.from(normalModLis).map(processLis).filter(Boolean);
        const megaMods = Array.from(megaModLis).map(processLis).filter(Boolean);
        megaMods.forEach(m => m.isEpic = true); //Set all mega mods as epic since processLis doesn't
        modifiers = modifiers.concat(megaMods);
    } else {
        modifiers = Array.from(descriptionDoc.querySelectorAll("li")).map(processLis).filter(Boolean);
    }

    if (modifiers.length) {
        for (let mod of modifiers) {
            for (let cost of mod.costs) {
                pp_mods.powerMods.push({
                    name: Utils.toTitleCase(mod.name),
                    cost: cost,
                    isEpic: mod.isEpic,
                    selected: false,
                    exclusiveGroup: mod.costs.length > 1 ? mod.name : undefined,
                });
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

export function calc_pp_cost(brCard) {
    if (brCard.item.system.innate && !SettingsUtils.getWorldSetting(WORLD_SETTING_KEYS.innatePowersSpendPP)) {
        return 0;
    }

    let ppCost = brCard.item.system.pp;

    ppCost += brCard.pp_modifiers.extraCost;

    if (brCard.pp_modifiers.additionalRecipientsMod.name) {
        ppCost += brCard.pp_modifiers.additionalRecipientsMod.cost * brCard.pp_modifiers.additionalRecipientsMod.count;
    }

    const modGroups = [brCard.pp_modifiers.genericMods, brCard.pp_modifiers.powerMods];
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
        tooltip += `${game.i18n.localize("BRSW.Dmg")}: ${item.system.damage} ${game.i18n.localize("BRSW.ApShort")}: ${item.system.ap}`;
        if (item.system.currentShots !== null && item.system.shots !== null) {
            tooltip += `<br>${game.i18n.localize("BRSW.Shots")}: ${item.system.currentShots}/${item.system.shots}`;
        }
    }
    return tooltip;
}

function call_create_item_card_hooks(item, brCard) {
    // For the moment, assume that no roll is made if there is no skill. Hopefully, in the future, there will be a better way.
    if (
        (item.type === "gear" && item.system.actions.trait === "") ||
        item.system.actions?.trait.toLowerCase() === "none" ||
        (item.system.hasOwnProperty("actions") === false && item.type !== "skill")
    ) {
        Hooks.call("BRSW-CreateItemCardNoRoll", brCard);
    }
}

/**
 * Creates an item card from a token or actor id, mainly for use in macros
 *
 * @param {string} token_id A token id, if it can be solved it will be used
 *  before actor
 * @param {string} actor_id An actor id, it could be set as fallback or
 *  if you keep token empty as the only way to find the actor
 * @param {string} itemId Id of the item
 * @param {object} actions_stored An object with action ids as properties
 *   and a boolean meaning if they need to set on or off
 * @return {Promise} a promise for the BrCommonCard object
 */
function createItemCardFromId(
    token_id,
    actor_id,
    itemId,
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
    return createItemCard(origin, itemId, {
        actions_stored: actions_stored,
    });
}

/**
 * Hooks the public functions to a global object
 */
export function exposeItemCardAPI() {
    Utils.exposeAPI("createItemCard", createItemCard, "create_item_card");
    Utils.exposeAPI("createItemCardFromId", createItemCardFromId, "create_item_card_from_id");
    Utils.exposeAPI("rollItem", rollItem, "roll_item");
    Utils.exposeAPI("createDamageCard", createDamageCard, "create_damage_card");
}

/**
 * Listens to click events on character sheets
 * @param ev javascript click event
 * @param {SwadeActor, Token} target token or actor from the char sheet
 * @param {HTMLElement} currentTarget the element that was clicked
 */
async function item_click_listener(ev, target, currentTarget) {
    let action = getActionFromClick(ev);
    if (action === "system") {
        return;
    }

    if ((action === "trait" || action === "trait_damage") &&
        ev.target.classList.contains("damage-roll")) {
        //If we clicked the damage button and we have auto-roll turned on, just show the card
        //This will ensure we only roll damage
        action = "card";
    }

    ev.stopImmediatePropagation();
    ev.preventDefault();
    ev.stopPropagation();
    const actor = Utils.toActor(target);
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
    const brCard = await createItemCard(target, item_id, {
        actions_stored: actions_stored,
    });
    if (action.includes("dialog")) {
        game.brsw.dialog.show_card(brCard);
    } else if (brCard.trait && action.includes("trait")) {
        await rollItem(brCard, "", false, action.includes("damage"));
    } else if (brCard.damage && action.includes("damage")) {
        await roll_dmg(brCard, "");
    }
    // Shortcut for rolling damage
    if (ev.target.classList.contains("damage-roll")) {
        await roll_dmg(brCard, $(brCard.message.content), false, false);
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
 * @param {BrCommonCard} brCard
 */
function preview_template(ev, brCard) {
    let type = ev.currentTarget.dataset.size;
    if (type === "cone") {
        type = "swcone";
    }
    swade.util.createRegionFromPreset(type, brCard.item);
    Hooks.call(
        "BRSW-BeforePreviewingTemplate",
        CONFIG.SWADE.activeMeasuredTemplatePreview,
        brCard,
        ev,
    );
}

/**
 * Activate the listeners in the item card
 * @param {BrCommonCard} brCard
 * @param html Html produced
 */
export function activateItemCardListeners(brCard, html) {
    const { actor, item } = brCard;
    html.querySelector(".brsw-header-img")?.addEventListener("click", (_) => {
        item.sheet.render(true);
    });

    addEventListenerAll(html, ".brsw-roll-button", "click", async (ev) => {
        ev.stopPropagation();
        await withButtonSpinner(ev.currentTarget, () =>
            rollItem(
                brCard,
                html,
                ev.currentTarget.classList.contains("roll-bennie-button"),
            ),
        );
    });

    addEventListenerAll(
        html,
        ".brsw-damage-button, .brsw-damage-bennie-button",
        "click",
        (ev) => {
            // noinspection JSIgnoredPromiseFromCall
            withButtonSpinner(ev.currentTarget, () =>
                roll_dmg(
                    brCard,
                    html,
                    ev.currentTarget.classList.contains("brsw-damage-bennie-button"),
                    {},
                    ev.currentTarget.id.includes("raise"),
                    ev.currentTarget.dataset.target,
                ),
            );
        },
    );

    html.querySelector(".brsw-ammo-manual")?.addEventListener("click", async (ev) => {
        await item.reload();
        //Update the ammo text of the card we just clicked on.
        //This won't affect change the popout or vice versa,
        //but doing that would require an update to the chat message which would refresh the render which is disruptive
        ev.target.parentElement.querySelector(".brsw-shots-pp").innerText =
            brCard.itemShots;
    });

    html.querySelector(".brsw-pp-manual")?.addEventListener("click", async (ev) => {
        await new PPManagementDialog({ brCard: brCard }).wait({ force: true });

        //Update the pp text of the card we just clicked on.
        //This won't affect the popout or vice versa,
        //but doing that would require an update to the chat message which would refresh the render which is disruptive
        if (game.settings.get("swade", "noPowerPoints")) {
            const ppPenalty = ev.target.parentElement.parentElement.querySelector(".brsw-pp-penalty");
            ppPenalty.innerText = -Math.ceil(calc_pp_cost(brCard) / 2);
        } else {
            const ppRemaining = ev.target.parentElement.parentElement.querySelector(".brsw-shots-pp");
            ppRemaining.innerText = brCard.itemShots;

            const ppCost = ev.target.parentElement.parentElement.querySelector(".brsw-pp-cost");
            ppCost.innerText = calc_pp_cost(brCard);
        }
    });

    addEventListenerAll(html, ".brsw-apply-damage", "click", (ev) => {
        createDamageCard(
            ev.currentTarget.dataset.target,
            ev.currentTarget.dataset.damage,
            `${actor.name} - ${item.name}`,
            ev.currentTarget.dataset.heavyDamage,
        ).then();
    });

    addEventListenerAll(html, ".brsw-target-tough", "click", (ev) => {
        edit_toughness(brCard, ev.currentTarget.dataset.index);
    });

    addEventListenerAll(html, ".brsw-add-damage-d6", "click", (ev) => {
        add_damage_dice(brCard, ev.currentTarget.dataset.index);
    });

    addEventListenerAll(html, ".brsw-half-damage", "click", (ev) => {
        half_damage(brCard, ev.currentTarget.dataset.index);
    });

    addEventListenerAll(html, ".brsw-add-damage-number", "click", (ev) => {
        show_fixed_damage_dialog(ev, brCard);
    });

    addEventListenerAll(html, ".brsw-template-button", "click", (ev) => {
        preview_template(ev, brCard);
    });

    html.querySelector("#roll-damage")?.addEventListener("dragstart", (ev) => {
        ev.originalEvent.dataTransfer.setData(
            "text/plain",
            JSON.stringify({
                type: "target_click",
                tag_id: "roll-damage",
                message_id: brCard.message.id,
            }),
        );
    });

    html.querySelector("#roll-raise-damage")?.addEventListener("dragstart", (ev) => {
        ev.originalEvent.dataTransfer.setData(
            "text/plain",
            JSON.stringify({
                type: "target_click",
                tag_id: "roll-raise-damage",
                message_id: brCard.message.id,
            }),
        );
    });

    html.querySelector(".brsw-ammo-toggle")?.addEventListener("click", (ev) => {
        ev.currentTarget.classList.toggle("brsw-toggle-active");
    });

    html.querySelector(".brsw-pp-toggle")?.addEventListener("click", async (ev) => {
        brCard.render_data.subtractPP = !brCard.render_data.subtractPP;
        await brCard.render();
        await brCard.save();
    });

    html.querySelector(".brsw-use-consumable-button")?.addEventListener("click", (ev) => {
        brCard.item.consume();
    });

    addEventListenerAll(html, ".brsw-macro-button", "click", (ev) => {
        const action =
            brCard.item.system.actions.additional[ev.currentTarget.dataset.macro];
        execute_macro(action, brCard).catch((err) => {
            console.error("Error in macro", err);
        });
    });

    addEventListenerAll(html, ".brsw-resist-button", "click", (ev) => {
        roll_resist(
            ev.currentTarget.dataset.trait,
            brCard,
            parseInt(ev.currentTarget.dataset.traitMod),
        );
    });
}

/**
 * Makes an attribute card for a resist roll
 *
 * @param {string} trait - The trait that will be rolled
 * @param {BrCommonCard} brCard - The card from where we get the TN
 * @param {integer} trait_mod
 */
async function roll_resist(trait, brCard, trait_mod) {
    if (!canvas.tokens?.controlled.length) {
        ui.notifications.warn(game.i18n.localize("BRSW.NoTokenSelectedError"));
        return;
    }
    for (const token of canvas.tokens.controlled) {
        let newCard;
        if (BRSW2_CONST.ATTRIBUTES.includes(trait.toLowerCase())) {
            newCard = await game.brsw.createAttributeCard(token, trait.toLowerCase());
        } else {
            newCard = await game.brsw.createSkillCard(token, Utils.traitFromString(token.actor, trait).id);
        }

        newCard.trait_roll.tn = getTraitRollDifficulty(brCard);
        newCard.trait_roll.tn_reason = game.i18n.localize("BRSW.ResistingRoll");
        if (!isNaN(trait_mod)) {
            const localized_name = game.i18n.localize("BRSW.ResistingRoll");
            const resist_action = new brAction(localized_name, {
                id: broofa(),
                button_name: localized_name,
                skillMod: trait_mod,
            });

            resist_action.selected = true;
            newCard.action_sections["none"].action_groups.resist_button = {
                defaultChecked: "on",
                name: localized_name,
                id: broofa(),
                single_choice: false,
                actions: [resist_action],
            };
        }
        await newCard.render();
        await newCard.save();
    }
}

/**
 * Calculates the difficulty of a resist trait roll
 *
 * @param {Object} brCard - The card object containing trait roll information.
 * @return {number} - The calculated difficulty of the trait roll.
 */
function getTraitRollDifficulty(brCard) {
    if (brCard.item && brCard.item.type === "power") {
        if (brCard.item.system.description.indexOf(game.i18n.localize("BRSW.Opposed")) === -1) {
            // If this is a power, and we can't find opposed in the description, it is probably a flat check.
            return 4;
        }
    }

    if (!brCard.trait_roll.current_roll) {
        return brCard.trait_roll.tn;
    }

    const results = brCard.trait_roll.current_roll.dice.map((die) => {
        return die.result;
    });

    return Math.max(...results) + brCard.trait_roll.tn;
}

export async function displayPPChangeCard(actor, chatData) {
    const show_card = SettingsUtils.getWorldSetting(WORLD_SETTING_KEYS.ppChangeCardBehaviour);
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
 * @param {BrCommonCard} brCard
 * @param prevSpentPP PP we already spent on a previous roll
 */
export async function spendPP(brCard, prevSpentPP) {
    if (game.settings.get("swade", "noPowerPoints")) {
        return 0;
    }

    prevSpentPP ??= 0;
    const actor = brCard.actor;
    const item = brCard.item;

    if (item.system.innate && !SettingsUtils.getWorldSetting(WORLD_SETTING_KEYS.innatePowersSpendPP)) {
        return 0;
    }

    let success = false;
    let raise = false;
    for (const roll of brCard.trait_roll.current_roll.dice) {
        if (roll.result === null) continue;

        //Subtract any arcaneActivationOffset from the roll result to get the activation roll
        //This is for cases like missing with bolt due to cover but the power still activates
        const rollResult = roll.result - (brCard.trait_roll.arcaneActivationOffset ?? 0);
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

    const basePPCost = success ? calc_pp_cost(brCard) : 1;
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

    brCard.render_data.used_pp = ppCost;
    await brCard.save();

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
export async function runMacros(macros, brCard) {
    if (macros) {
        for (const macroName of macros) {
            const macro = await findMacro(macroName);
            if (macro) {
                // Attempt script execution
                try {
                    const scope = {
                        speaker: ChatMessage.getSpeaker(),
                        actor: brCard.actor,
                        token: brCard.token,
                        item: brCard.item,
                        targets: brCard.targets,
                    };
                    await macro.execute(scope);
                } catch (err) {
                    ui.notifications.error(`There was an error in your macro syntax. See the console (F12) for details. Error: ${err}`);
                }
            }
        }
    }
}

/**
 * Finds a macro from a name or id
 * @param {string} macro_name_or_id
 */
async function findMacro(macro_name_or_id) {
    let macro = game.macros.getName(macro_name_or_id) || game.macros.get(macro_name_or_id);
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
 * Roll an existing item card
 *
 * @param {BrCommonCard } brCard Message that originates this roll
 * @param {string} html Html code to parse for extra options
 * @param {boolean} expendBennie Whenever to expend a bennie
 * @param {boolean} rollDamage true if we want to auto-roll damage
 *
 * @return {Promise<void>}
 */
export async function rollItem(brCard, html, expendBennie, rollDamage) {
    const macros = [];
    let shotsOverride; // Override the number of shots used
    const extraData = { modifiers: [] };
    if (brCard.trait_roll.is_rolled) {
        brCard.trait_roll.reroll_mode = expendBennie ? "benny" : "free";
    }

    if (expendBennie) {
        await spendBenny(brCard.actor);
    }

    extraData.rof = brCard.item.system.rof || 1;
    if (SettingsUtils.getUserSetting(USER_SETTING_KEYS.defaultRateOfFire) === "single_shot") {
        extraData.rof = 1;
    }

    // Actions
    for (const action of brCard.getSelectedActions()) {
        if (action.code.skillOverride) {
            const trait = Utils.traitFromString(
                brCard.actor,
                action.code.skillOverride,
            );
            brCard.setTrait(trait);
        }
        if (action.code.resourcesUsed) {
            const shots_used = action.code.resourcesUsed;
            let first_char = "";
            try {
                first_char = shots_used.charAt(0);
            } catch { }
            if (first_char !== "+" && first_char !== "-") {
                shotsOverride = parseInt(shots_used);
            }
        }
        process_common_actions(action.code, extraData, macros, brCard.actor);
    }

    // Check for minimum strength
    if (
        brCard.item.system.minStr &&
        Utils.isShootingSkill(Utils.getItemTrait(brCard.item, brCard.actor))
    ) {
        const penalty = process_minimum_str_modifiers(
            brCard.item,
            brCard.actor,
            "BRSW.NotEnoughStrength",
        );
        if (penalty) {
            extraData.modifiers.push(penalty);
        }
    }

    // Trademark weapon
    if (brCard.item.system.trademark) {
        extraData.modifiers.push(
            new TraitModifier(
                game.i18n.localize("BRSW.TrademarkWeapon"),
                brCard.item.system.trademark,
            ),
        );
    }

    // Offhand
    if (brCard.item.system.equipStatus === 2) {
        let isAmbidextrous = brCard.actor.items.find(
            (item) =>
                item.type === "edge" &&
                item.name.toLowerCase() ===
                game.i18n.localize("BRSW.EdgeName.Ambidextrous").toLowerCase(),
        );
        isAmbidextrous = isAmbidextrous || brCard.actor.getFlag("swade", "ambidextrous");
        if (!isAmbidextrous) {
            extraData.modifiers.push(
                new TraitModifier(game.i18n.localize("BRSW.Offhand"), -2),
            );
        }
    }

    // Item properties tab
    if (brCard.item.system.actions.traitMod) {
        const newModifier = new TraitModifier(
            game.i18n.localize("BRSW.ItemPropertiesTraitMod"),
            brCard.item.system.actions.traitMod,
        );
        await newModifier.evaluate();
        extraData.modifiers.push(newModifier);
    }

    // Item global modifiers
    if (
        brCard.item.type === "weapon" &&
        brCard.actor.system.stats.globalMods.attack
    ) {
        for (const modifier of brCard.actor.system.stats.globalMods.attack) {
            extraData.modifiers.push(
                new TraitModifier(modifier.label, modifier.value),
            );
        }
    }

    // Target global modifiers.
    const targets = brCard.targets;
    if (targets.length > 0 && Utils.isWeaponOrBolt(brCard.item)) {
        function addMods(mods) {
            for (const modifier of mods) {
                if (modifier.ignore) continue;
                extraData.modifiers.push(new TraitModifier(modifier.label, modifier.value));
            }
        }

        const target = targets[0];
        if (target && target.actor) {
            const targetGlobalMods = target.actor.system.stats.globalMods;
            addMods(targetGlobalMods.targetAttack);
            if (Utils.isMeleeAttack(brCard.item, brCard.skill)) {
                addMods(targetGlobalMods.targetAttackMelee);
            } else if (Utils.isRangedAttack(brCard.item, target.actor, brCard.skill)) {
                addMods(targetGlobalMods.targetAttackRanged);
            }
        }
    }

    await roll_trait(
        brCard,
        brCard.traitDie,
        brCard.render_data.trait?.name,
        extraData,
    );

    // Ammo management
    if (parseInt(brCard.item.system.shots) || brCard.item.system.autoReload) {
        const consumeAmmoSelected = html
            ? !!html.querySelector(".brsw-ammo-toggle.brsw-toggle-active")
            : SettingsUtils.getWorldSetting(WORLD_SETTING_KEYS.defaultAmmoManagement);
        if (consumeAmmoSelected || macros.length) {
            brCard.render_data.used_shots = shotsOverride || ROF_BULLETS[brCard.trait_roll.rof || 1];
            if (consumeAmmoSelected && brCard.trait_roll.rolls.length === 1) {
                await brCard.item.consume(brCard.render_data.used_shots);
            }
        }
    }

    // Power points management
    const subtractPP = brCard.render_data.subtractPP;
    const previous_pp = brCard.trait_roll.old_rolls.length ? brCard.render_data.used_pp : 0;
    if (subtractPP && !isNaN(parseInt(brCard.item.system.pp)) && brCard.item.type === "power") {
        brCard.render_data.used_pp = await spendPP(brCard, previous_pp);
    }

    await brCard.render();
    await brCard.save();

    await runMacros(macros, brCard);

    //Call a hook after roll for other modules
    Hooks.call("BRSW-RollItem", brCard, html);
    if (rollDamage && brCard.damage) {
        brCard.trait_roll.current_roll.dice.forEach((roll) => {
            if (roll.result !== null && roll.result >= 0) {
                roll_dmg(brCard, html, false, {}, roll.result > 3);
            }
        });
    }
}

// DAMAGE ROLLS
/**
 * Gets the toughness value for the targeted token
 * @param {SwadeActor} originActor
 * @param {Token} target
 * @param {string} location
 */
function get_target_defense(
    originActor,
    target = undefined,
    location = "torso",
) {
    const objective = target || getTargetedToken([originActor]);
    const defense_values = {
        toughness: 4,
        armor: 0,
        name: game.i18n.localize("BRSW.Default"),
    };
    if (objective?.actor) {
        if (objective.actor.type !== "vehicle") {
            //Get the base toughness without armor
            const base_toughness =
                objective.actor.system.stats.toughness.value -
                objective.actor.system.stats.toughness.armor;

            //Get the armor of the location we're targeting
            defense_values.armor = objective.actor.calcArmor(location);

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
    damageRoll,
    damageFormulas,
    target,
    totalModifiers,
    message,
) {
    const brCard = new BrCommonCard(message);
    const { actor, item, vehicleActor } = brCard;
    const damageSourceActor = vehicleActor ?? brCard.actor;
    const currentDamageRoll = JSON.parse(JSON.stringify(damageRoll));

    const rollData = damageSourceActor.getRollData();
    if (!damageFormulas.explodes) {
        for (const key of ["sma", "spi", "str", "agi", "vig"]) {
            rollData[key] = rollData[key].replace("x", "");
        }
    }

    const roll = new Roll(damageFormulas.damage + damageFormulas.raise, rollData);
    await roll.evaluate();

    // Heavy armor
    if (target && !item.system.isHeavyWeapon && !damageFormulas.heavyWeapon && hasHeavyArmor(target.actor, damageFormulas.location)) {
        const no_damage_mod = new DamageModifier(
            game.i18n.localize("BRSW.HeavyArmor"),
            -999999,
        );
        currentDamageRoll.brswroll.modifiers.push(no_damage_mod);
        totalModifiers += -999999;
    }

    // Target damage global mods
    if (target) {
        for (const mod of target.actor.system.stats.globalMods.targetDamage) {
            if (!mod.ignore) {
                const targetDamage = new DamageModifier(mod.label, mod.value);
                currentDamageRoll.brswroll.modifiers.push(targetDamage);
                totalModifiers += mod.value;
            }
        }
    }

    // Multiply modifiers must be last
    if (damageFormulas.multiplier !== 1) {
        const multiplier = parseFloat(damageFormulas.multiplier) || 2;
        const final_value = (roll.total + totalModifiers) * multiplier;
        const multiply_mod = new DamageModifier(
            `x ${damageFormulas.multiplier}`,
            final_value - totalModifiers - roll.total,
        );
        currentDamageRoll.brswroll.modifiers.push(multiply_mod);
        totalModifiers = final_value - roll.total;
    }

    const defenseValues = get_target_defense(
        actor,
        target,
        damageFormulas.location,
    );

    currentDamageRoll.brswroll.rolls.push({
        result: roll.total + totalModifiers,
        tn: defenseValues.toughness,
        armor: defenseValues.armor,
        ap: damageFormulas.ap || 0,
        target_id: defenseValues.token_id || null,
    });

    let lastStringTerm = "";
    for (const term of roll.terms) {
        if (term.hasOwnProperty("_faces")) {
            const newDie = {
                faces: term._faces,
                results: [],
                extraClass: "",
            };
            newDie.label = term.flavor
                ? `${term.flavor.charAt(0).toUpperCase()}${term.flavor.slice(1)}`
                : game.i18n.localize("SWADE.Dmg");
            newDie.label += ` (d${term._faces})`;
            for (const result of term.results) {
                newDie.results.push(result.result);
                if (result.result >= term._faces) {
                    newDie.extraClass = " brsw-blue-text";
                    if (!currentDamageRoll.brswroll.rolls[0].extraClass) {
                        currentDamageRoll.brswroll.rolls[0].extraClass = " brsw-blue-text";
                    }
                }
            }
            currentDamageRoll.brswroll.dice.push(newDie);
        } else {
            if (term.number) {
                const modifierValue = parseInt(lastStringTerm + term.number);
                if (modifierValue) {
                    const newMod = new DamageModifier(
                        game.i18n.localize("SWADE.Dmg") + ` (${modifierValue})`,
                        modifierValue,
                    );
                    currentDamageRoll.brswroll.modifiers.unshift(newMod);
                }
            }
            lastStringTerm = term.operator;
        }
    }

    if (damageFormulas.raise) {
        // The Last die is raise die.
        currentDamageRoll.brswroll.dice[
            currentDamageRoll.brswroll.dice.length - 1
        ].label = game.i18n.localize("BRSW.Raise");
    }

    currentDamageRoll.label = defenseValues.name;

    const damageTheme = SettingsUtils.getUserSetting("damageDieTheme");
    if (damageTheme !== "None") {
        for (const die of roll.dice) {
            die.options.colorset = damageTheme;
        }
    }

    await roll_dice(message, damageRoll.brswroll, roll);

    currentDamageRoll.damageResult = calculate_damage_results(
        currentDamageRoll.brswroll.rolls,
    );

    return currentDamageRoll;
}

function get_chat_dmg_modifiers(options, damage_roll) {
    // Betterrolls modifiers
    options.dmgMods.forEach((mod) => {
        damage_roll.brswroll.modifiers.push(
            new DamageModifier("Better Rolls", mod),
        );
    });
}

function calc_min_str_penalty(item, actor, damageFormulas, damage_roll) {
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
        damageFormulas.damage = adjust_dmg_str(
            damage_roll,
            damageFormulas.damage,
            str_die_size,
        );
    }
}

/**
 * Calculates the modifier from jokers to the damage roll.
 * @param {BrCommonCard} brCard
 * @param damage_roll
 */
function joker_modifiers(brCard, damage_roll) {
    const token_id = brCard.token?.id;
    if (token_id && has_joker(token_id)) {
        damage_roll.brswroll.modifiers.push(
            new DamageModifier(
                "Joker",
                brCard.actor.getFlag("swade", "jokerBonus") ?? 2,
            ),
        );
    }
}

async function getDamageModsFromActions(
    brCard,
    damageFormulas,
    damageRoll,
    macros,
    expendBenny,
) {
    const damageSourceActor = brCard.vehicleActor ?? brCard.actor;
    for (const action of brCard.getSelectedActions()) {
        if (action.code.isHeavyWeapon) {
            damageFormulas.heavyWeapon = true;
        }

        if (action.code.dmgMod) {
            let dmgMod = action.code.dmgMod;
            if (action.code.isWildAttack) {
                const newDamage = brCard.actor?.getFlag('swade', 'wildAttackDamage');
                if (newDamage != undefined) {
                    //wildAttackDamage replaces the default mod
                    dmgMod = newDamage;
                }
            }

            const actionName = game.i18n.localize(action.code.name);
            const newModifier = new DamageModifier(
                actionName,
                dmgMod,
                { rollData: damageSourceActor?.getRollData() },
            );

            await newModifier.evaluate();
            damageRoll.brswroll.modifiers.push(newModifier);
        }

        if (action.code.dmgOverride) {
            damageFormulas.damage = action.code.dmgOverride;
        }

        if (action.code.self_add_status) {
            set_or_update_condition(action.code.self_add_status, brCard.actor);
        }

        if (action.code.runDamageMacro) {
            macros.push(action.code.runDamageMacro);
        }

        if (action.code.raiseDamageFormula) {
            damageFormulas.raise = action.code.raiseDamageFormula;
        }

        if (action.code.overrideAp) {
            damageFormulas.ap = action.code.overrideAp;
        }

        if (action.code.apMod) {
            damageFormulas.ap += parseInt(action.code.apMod);
        }

        const rerollMode = expendBenny ? "benny" : "free";
        if (action.code.rerollDamageMod && (!action.code.rerollMode || action.code.rerollMode === rerollMode)) {
            damageRoll.brswroll.modifiers.push(
                new DamageModifier(
                    game.i18n.localize(action.code.name),
                    action.code.rerollDamageMod,
                    { rollData: damageSourceActor?.getRollData() },
                ),
            );
        }

        if (action.code.multiplyDmgMod) {
            damageFormulas.multiplier = action.code.multiplyDmgMod;
        }

        if (action.code.avoid_exploding_damage) {
            damageFormulas.explodes = false;
        }

        if (action.code.change_location) {
            damageFormulas.location = action.code.change_location;
        }
    }
}

/**
 * Rolls damage dor an item
 * @param {BrCommonCard} brCard
 * @param html
 * @param expendBenny
 * @param defaultOptions
 * @param {boolean} raise
 * @param {string} targetTokenId
 * @return {Promise<void>}*
 */
export async function roll_dmg(
    brCard,
    html,
    expendBenny,
    defaultOptions,
    raise,
    targetTokenId,
) {
    const { render_data, actor, item } = brCard;
    const raiseDieSize = item.system.bonusDamageDie || 6;
    const numberRaiseDice = item.system.bonusDamageDice || 1;
    let raiseFormula = `+${numberRaiseDice}d${raiseDieSize}x`;

    const damage = item.system.damage;

    const damageFormulas = {
        damage: damage,
        raise: raiseFormula,
        ap: parseInt(item.system.ap ?? 0),
        multiplier: 1,
        explodes: true,
        heavyWeapon: false,
        location: "torso",
    };

    const macros = [];
    if (expendBenny) {
        await spendBenny(actor);
    }

    // Calculate modifiers
    const options = getRollOptions(defaultOptions, brCard);

    // Shotgun
    if (damageFormulas.damage?.includes("1-3d6") && item.type === "weapon") {
        // Bet that this is a shotgun
        damageFormulas.damage = "3d6";
    }

    const damageRoll = { label: "---", brswroll: new BRSWRoll(), raise: raise };
    get_chat_dmg_modifiers(options, damageRoll);
    joker_modifiers(brCard, damageRoll);

    // Item properties tab
    if (item.system.actions.dmgMod) {
        const newModifier = new DamageModifier(
            game.i18n.localize("BRSW.ItemPropertiesDmgMod"),
            item.system.actions.dmgMod,
            brCard.vehicleActor ? brCard.vehicleActor.getRollData() : brCard.actor?.getRollData(),
        );
        await newModifier.evaluate();
        damageRoll.brswroll.modifiers.push(newModifier);
    }

    // Minimum strength
    if (item.system.minStr) {
        calc_min_str_penalty(item, actor, damageFormulas, damageRoll);
    }

    // Actions
    await getDamageModsFromActions(
        brCard,
        damageFormulas,
        damageRoll,
        macros,
        expendBenny,
    );

    //If our selected damage has a type use that otherwise fall back to the type on the item
    const damageTypeMatch = damageFormulas.damage.match(/\[([^\]]+)\]/) ?? damage?.match(/\[([^\]]+)\]/);
    const damageType = damageTypeMatch?.[0];
    if (damageType) {
        const addDamageType = (formula, damageType) =>
        formula.replace(
            /((?:\d+)?d\d+(?:[a-zA-Z]+(?:[<>=]+-?\d+)?)*)/g,
            (match, captured, offset, string) =>
                string[offset + match.length] === "["
                    ? match
                    : `${match}${damageType}`,
        );

        damageFormulas.raise = addDamageType(damageFormulas.raise, damageType);
    }

    //Conviction
    const conviction_modifier = await check_and_roll_conviction(actor);
    if (conviction_modifier) {
        damageRoll.brswroll.modifiers.push(conviction_modifier);
    }

    get_global_modifiers(expendBenny, actor, damageRoll, damageFormulas);

    // Roll
    if (damageFormulas.explodes) {
        damageFormulas.damage = makeExplodable(damageFormulas.damage);
    } else {
        const removeExplode = (formula) => formula.replace(/((?:\d+)?d\d+(?:[a-zA-Z]+(?:[<>=]+-?\d+)?)*?)x(?=[a-zA-Z<>=+\-\[]|$)/g, "$1");
        damageFormulas.damage = removeExplode(damageFormulas.damage);
        damageFormulas.raise = removeExplode(damageFormulas.raise);
    }

    const targets = await get_dmg_targets(targetTokenId, brCard);
    if (!raise) {
        damageFormulas.raise = "";
    }

    // Gang Up on Damage
    if (Utils.isMeleeAttack(item, brCard.skill) && actor?.system.stats?.gangUpDamage && targets[0]) {
        const gangUp = calculateGangUp(brCard.token, targets[0]);
        if (gangUp.bonus) {
            damageRoll.brswroll.modifiers.push(
                new DamageModifier(gangUp.name, gangUp.bonus)
            );
        }
    }

    let total_modifiers = 0;
    for (const modifier of damageRoll.brswroll.modifiers) {
        total_modifiers += modifier.value;
    }

    let first_roll = true;
    for (const target of targets) {
        if (target || first_roll) {
            render_data.damage_rolls.push(
                await roll_dmg_target(
                    damageRoll,
                    damageFormulas,
                    target,
                    total_modifiers,
                    brCard.message,
                ),
            );
            first_roll = false; // Only roll once without targets.
        }
    }

    await update_message(brCard, render_data);

    // Run macros
    await runMacros(macros, brCard);

    Hooks.call("BRSW-RollDamage", brCard, html);
}

function get_global_modifiers(
    expendBenny,
    actor,
    damageRoll,
    damageFormulas,
) {
    if (expendBenny && actor.system.stats.globalMods.bennyDamage.length) {
        for (const modifier of actor.system.stats.globalMods.bennyDamage) {
            damageRoll.brswroll.modifiers.push(
                new DamageModifier(modifier.label, modifier.value),
            );
        }
    }
    for (const modifier of actor.system.stats.globalMods.ap) {
        damageFormulas.ap += modifier.value;
        damageRoll.brswroll.modifiers.push(
            new DamageModifier(
                `${game.i18n.localize("BRSW.APModifier")}: ${modifier.label}`,
                0,
            ),
        );
    }
}

/**
 * Return an array of actors from a token id or targeted tokens
 * @param {string} tokenId
 * @param {BrCommonCard} brCard
 */
async function get_dmg_targets(tokenId, brCard) {
    if (tokenId) {
        const token = canvas.tokens?.get(tokenId);
        if (token) {
            return [token];
        }
    }
    let targets = getUserTargets();
    if (targets.length > 0) {
        targets = Array.from(targets).filter((token) => token.actor);
    } else if (brCard.targets.length > 0) {
        targets = brCard.targets;
    } else {
        targets = [undefined];
    }
    return targets;
}

/**
 * Add a d6 to a damage roll
 * @param {BrCommonCard} brCard
 * @param {int} index
 */
async function add_damage_dice(brCard, index) {
    const render_data = brCard.message.getFlag(
        "betterrolls-swade2",
        "render_data",
    );
    const damageRolls = render_data.damage_rolls[index].brswroll;
    const roll = new Roll("1d6x");
    await roll.evaluate();
    damageRolls.rolls[0].result += roll.total;
    roll.terms.forEach((term) => {
        const newDie = {
            faces: term.faces,
            results: [],
            extraClass: "",
            label: game.i18n.localize("SWADE.Dmg"),
        };
        if (term.total > term.faces) {
            newDie.extraClass = " brsw-blue-text";
        }
        term.results.forEach((result) => {
            newDie.results.push(result.result);
        });
        damageRolls.dice.push(newDie);
    });
    render_data.damage_rolls[index].damageResult = calculate_damage_results(
        damageRolls.rolls,
    );

    const damage_theme = SettingsUtils.getUserSetting("damageDieTheme");
    if (damage_theme !== "None") {
        roll.dice.forEach((die) => {
            die.options.colorset = damage_theme;
        });
    }
    await roll_dice(brCard.message, render_data.damage_rolls[index].brswroll, roll);
    // noinspection JSIgnoredPromiseFromCall
    await update_message(brCard, render_data);
}

function show_fixed_damage_dialog(event, brCard) {
    // noinspection AnonymousFunctionJS
    const target = event.currentTarget;
    simple_form(
        game.i18n.localize("BRSW.EditModifier"),
        [
            { label: "Label", default_value: "Mod" },
            { label: "Value", default_value: 0 },
        ],
        (values) => {
            add_fixed_damage(target, brCard, values);
        },
    );
}

/**
 * Adds a fixed amount of damage to a roll
 * @param event
 * @param formResults
 */
async function add_fixed_damage(target, brCard, formResults) {
    const modifier = parseInt(formResults.Value);
    if (!modifier) {
        return;
    }
    const { index } = target.dataset;
    const render_data = brCard.message.getFlag("betterrolls-swade2", "render_data");
    const damageRolls = render_data.damage_rolls[index].brswroll;
    damageRolls.modifiers.push({ value: modifier, name: formResults.Label });
    damageRolls.rolls[0].result += modifier;
    render_data.damage_rolls[index].damageResult = calculate_damage_results(
        damageRolls.rolls,
    );
    await update_message(brCard, render_data);
}

/**
 * Change damage to half
 * @param {BrCommonCard} brCard
 * @param {number} index
 */
async function half_damage(brCard, index) {
    const render_data = brCard.message.getFlag(
        "betterrolls-swade2",
        "render_data",
    );
    const damageRolls = render_data.damage_rolls[index].brswroll;
    const halfDamage = -Math.round(damageRolls.rolls[0].result / 2);
    damageRolls.modifiers.push({
        value: halfDamage,
        name: game.i18n.localize("BRSW.HalfDamage"),
    });
    damageRolls.rolls[0].result += halfDamage;
    render_data.damage_rolls[index].damageResult = calculate_damage_results(
        damageRolls.rolls,
    );
    await update_message(brCard, render_data);
}

/**
 * Changes the damage target of one of the rolls.
 *
 * @param {BrCommonCard} brCard
 * @param {int} index
 */
async function edit_toughness(brCard, index) {
    const { render_data, actor } = brCard;
    const defenseValues = get_target_defense(actor);
    const damageRolls = render_data.damage_rolls[index].brswroll.rolls;
    damageRolls[0].tn = defenseValues.toughness;
    damageRolls[0].armor = defenseValues.armor;
    damageRolls[0].target_id = defenseValues.token_id || null;
    render_data.damage_rolls[index].label = defenseValues.name;
    render_data.damage_rolls[index].damageResult =
        calculate_damage_results(damageRolls);
    // noinspection JSIgnoredPromiseFromCall
    await update_message(brCard, render_data);
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
    const templatesFound = [];
    for (const templateKey in item.system.templates) {
        if (item.system.templates[templateKey] === true) {
            const template = TEMPLATE_KEYS[templateKey];
            templatesFound.push(template);
        }
    }
    for (const [templateKey, templateValue] of Object.entries(TEMPLATE_KEYS)) {
        for (const key_text of templateValue.key_text) {
            const translated_key_text = game.i18n.localize(key_text);
            if (templatesFound.find((t) => t.key == templateKey)) {
                break;
            }
            if (
                item.system?.description?.toLowerCase().includes(translated_key_text)
            ) {
                templatesFound.push(templateValue);
                break;
            } else if (typeof item.system?.range === "string") {
                const range = item.system.range.toLowerCase();
                if (range.includes(translated_key_text)) {
                    if (
                        templateKey == "cone" &&
                        templatesFound.find((t) => t.key == "scone")
                    ) {
                        //If we have the small cone, don't add a normal cone
                        break;
                    }
                    templatesFound.push(templateValue);
                    break;
                }
            }
        }
    }
    return templatesFound;
}

/**
 * Returns true if the target wears a Heavy Armor
 * @param {PlaceableObject} target
 */
function hasHeavyArmor(target, location = "torso") {
    // Equipped is equipStatus 3
    return target.itemTypes.armor.some(
        (item) =>
            item.system.isHeavyArmor &&
            item.system.locations[location] &&
            item.system.equipStatus === 3,
    );
}

async function execute_macro(action, brCard) {
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
        targetActor = brCard.actor;
        targetToken = brCard.token;
    } else if (action.macroActor === "target") {
        targetToken = getUserTargets()[0] || brCard.token;
        targetActor = targetToken.actor;
    } else {
        targetToken = game.canvas.tokens?.controlled.length < 1 ? brCard.token : game.canvas.tokens?.controlled[0];
        targetActor = game.canvas.tokens?.controlled.length < 1 ? brCard.actor : game.canvas.tokens?.controlled[0].actor;
    }
    await macro.execute({
        actor: targetActor,
        token: targetToken,
        item: brCard.item,
    });
    return null;
}
