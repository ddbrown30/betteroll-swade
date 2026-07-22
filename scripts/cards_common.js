// Common functions used in all cards
/* globals game, Token, TokenDocument, Roll, canvas, console, $, foundry,
      duplicate, ChatMessage, ui, Macro */
// noinspection JSUnusedAssignment

import { BrCommonCard } from "./BrCommonCard.js";
import { rollAttribute } from "./attribute_card.js";
import * as BRSW2_CONFIG from "./brsw2-config.js";
import { WORLD_SETTING_KEYS } from "./brsw2-config.js";
import { BRSW2_CONST } from "./brsw2-const.js";
import {
    rollItem,
    runMacros,
    spendPP,
} from "./item_card.js";
import { ManualModifiersPopup } from "./manual_mods_popup.js";
import { TraitModifier } from "./modifiers.js";
import {
    create_unshaken_card,
    create_unstun_card,
} from "./remove_status_cards.js";
import { TraitRoll } from "./rolls.js";
import {
    calculateDistance,
    getTNFromToken,
    rollSkill,
} from "./skill_card.js";
import {
    SettingsUtils,
    Utils,
    addEventListenerAll,
    getSelectedToken,
    getTargetedToken,
    set_or_update_condition,
    simple_form,
    spendMastersBenny,
} from "./utils.js";

/**
 * A constructor for our own roll object, this code is here just for legacy
 * support, please use the new classes in rolls.js
 * @constructor
 */
export function BRWSRoll() {
    this.rolls = []; // Array with all the dice rolled {sides, result,
    // extra_class, tn, result_txt, result_icons, ap, armor, target_id}
    this.modifiers = []; // Array of modifiers {name, value, extra_class, dice}
    this.dice = []; // Array with the dice {sides, results: [int], label, extra_class}
    // noinspection JSUnusedGlobalSymbols
    this.is_fumble = false;
}

/**
 * Makes the BrCommonCard class accessible
 *
 */
export function expose_card_class() {
    game.brsw.BrCommonCard = BrCommonCard;
}

/**
 * Creates a common card.
 *
 * @async
 * @function
 * @param {PlaceableObject|SwadeActor} origin - The origin of this card.
 * @param {Object} render_data - Data to pass to the render template.
 * @param {string} template - Path to the template that renders this card.
 * @returns {BrCommonCard} The created common card.
 */
export function create_common_card(origin, render_data, template) {
    const actor = Utils.toActor(origin);

    if (render_data.tooltip) {
        render_data.tooltip = // Limit tooltip size.
            render_data.tooltip.length <=
                BRSW2_CONFIG.MAX_TOOLTIP_LENGTH
                ? render_data.tooltip
                : null;
    }

    const brCard = new BrCommonCard(undefined);
    brCard.actor_id = actor.id;

    if (actor !== origin) {
        brCard.token_id = origin.id;
    } else if (actor.isToken) {
        brCard.token_id = actor.token.id;
    }

    brCard.setTrait(render_data.trait);

    brCard.generateRenderData(render_data, template);
    return brCard;
}

/**
 * Returns true if an actor has bennies available or is master controlled.
 * @param {SwadeActor} actor - The actor that we are checking
 */
export function are_bennies_available(actor) {
    if (actor.hasPlayerOwner) {
        return actor.system.bennies.value > 0;
    } else if (actor.system.wildcard && actor.system.bennies.value > 0) {
        return true;
    }
    return game.user.getFlag("swade", "bennies") > 0;
}

/**
 * Expends a bennie
 * @param {SwadeActor} actor - Actor who is going to expend the bennie
 */
export async function spend_bennie(actor) {
    // Dice so Nice animation
    if (actor.hasPlayerOwner) {
        await actor.spendBenny();
    } else if (actor.system.wildcard && actor.system.bennies.value > 0) {
        await actor.spendBenny();
    } else {
        await spendMastersBenny();
        if (game.dice3d) {
            const benny = await new Roll("1dB").roll();
            // noinspection JSIgnoredPromiseFromCall,ES6MissingAwait
            game.dice3d.showForRoll(benny, game.user, true, null, false);
        }
    }
}

/**
 * Try to get an actor from a token or an actor id
 * @param token_id
 * @param actor_id
 */
export function getActorFromIds(token_id, actor_id) {
    if (canvas.tokens) {
        let token;
        if (token_id) {
            try {
                token = canvas.tokens.get(token_id);
            } catch (_) {
                // At boot the canvas can be still not drawn, we wait
                // noinspection AnonymousFunctionJS
                setTimeout(() => {
                    token = canvas.tokens.get(token_id);
                }, 500);
            }
            if (token) {
                return token.actor;
            }
        }
    }
    // If we couldn't get the token, maybe because it was not a defined actor.
    if (actor_id) {
        return game.actors.get(actor_id);
    }
    return null;
}

/**
 * Saves a card as a macro
 * @param {BrCommonCard} brCard
 */
function save_macro(brCard) {
    let macro_slot = 0;
    let { page } = ui.hotbar;
    // Starting from the current hotbar page, find the first empty slot
    do {
        const macros = game.user.getHotbarMacros(page);
        for (const macro of macros) {
            if (macro.macro === undefined || macro.macro === null) {
                macro_slot = macro.slot;
                break;
            }
        }
        page = page < 5 ? page + 1 : 1;
    } while (macro_slot === 0 && page !== ui.hotbar.page);
    const command = create_macro_command_from_card(brCard);
    Macro.create({
        name: brCard.render_data.header.title,
        img: brCard.render_data.header.img || "icons/svg/aura.svg",
        type: "script",
        command: command,
        scope: "global",
    }).then((macro) => {
        // noinspection JSIgnoredPromiseFromCall
        // If we found an empty slot, assign the macro to that slot
        if (macro_slot > 0) {
            game.user.assignHotbarMacro(macro, macro_slot).catch(() => {
                console.error("Error assigning macro to Hot Bar");
            });
        }
    });
}

/**
 * Saves a card as a macro
 * @param {BrCommonCard} brCard
 */
function toggle_mods_popup(element, brCard) {
    if (game.brsw.manualModsPopup) {
        game.brsw.manualModsPopup.close();
    } else {
        const rect = element.getBoundingClientRect();
        new ManualModifiersPopup({
            anchorPosition: { x: rect.x, y: rect.y },
            brCard,
        }).render(true);
    }
}

/**
 * Connects the listener for all chat cards
 * @param {BrCommonCard} brCard
 * @param {HTMLElement} html - html of the card
 */
export function activate_common_listeners(brCard, html) {
    // The message will be rendered at creation and each time a flag is added
    // Actor will be undefined if this is called before flags are set
    if (brCard.actor) {
        const actor_img = html.querySelector(".brws-actor-img");
        if (actor_img) {
            actor_img.classList.add("bound");
            actor_img.addEventListener("click", async (ev) => {
                await manage_sheet(brCard.actor);
            });
        }
        const vehicle_img = html.querySelector(".brws-vehicle-img");
        if (vehicle_img) {
            vehicle_img.classList.add("bound");
            vehicle_img.addEventListener("click", async (ev) => {
                await manage_sheet(brCard.vehicle_actor);
            });
        }
        html
            .querySelector(".br2-unshake-card")
            ?.addEventListener("click", async (ev) => {
                create_unshaken_card(brCard.message, undefined).catch(() => {
                    console.error("BR2 unable to show unshaken card");
                });
            });
        html
            .querySelector(".br2-unstun-card")
            ?.addEventListener("click", async (ev) => {
                create_unstun_card(brCard.message, undefined).catch(() => {
                    console.error("BR2 unable to show unstun card");
                });
            });
    }
    if (brCard.message.isOwner) {
        html
            .querySelector(".brsw-selected-actions")
            ?.addEventListener("click", () => {
                game.brsw.dialog.show_card(brCard);
            });
    }
    // Collapsible
    manage_collapsables(html, brCard.message);
    // Old rolls
    if (brCard.message.isOwner) {
        const old_rolls = html.querySelectorAll(".brsw-old-roll");
        for (const old_roll of old_rolls) {
            old_roll.addEventListener("click", async (ev) => {
                await old_roll_clicked(ev, brCard);
            });
        }
    }
    // Add modifiers
    html.querySelector(".brsw-add-modifier")?.addEventListener("click", () => {
        const label_mod = game.i18n.localize("BRSW.Modifier");
        simple_form(
            game.i18n.localize("BRSW.AddModifier"),
            [
                {
                    id: "label",
                    label: game.i18n.localize("BRSW.Label"),
                    default_value: "",
                },
                {
                    id: "value",
                    label: label_mod,
                    default_value: 1,
                },
            ],
            async (values) => {
                await add_modifier(brCard, {
                    label: values.label,
                    value: values.value,
                });
            },
        );
    });
    // Edit modifiers
    addEventListenerAll(html, ".brsw-edit-modifier", "click", (ev) => {
        const label_mod = game.i18n.localize("BRSW.Modifier");
        const { value, label, index } = ev.currentTarget.dataset;
        simple_form(
            game.i18n.localize("BRSW.EditModifier"),
            [
                { label: "Label", default_value: label },
                { id: "value", label: label_mod, default_value: value },
            ],
            async (values) => {
                await edit_modifier(brCard, parseInt(index), {
                    name: values.Label,
                    value: values.value,
                    extra_class: parseInt(values.value) < 0 ? " brsw-red-text" : "",
                });
            },
        );
    });
    // Edit die results
    addEventListenerAll(html, ".brsw-override-die", "click", (ev) => {
        // Retrieve additional data
        const die_index = Number(ev.currentTarget.dataset.dieIndex);
        // Show modal
        const label_new_result = game.i18n.localize("BRSW.NewDieResult");
        simple_form(
            game.i18n.localize("BRSW.EditDieResult"),
            [{ label: label_new_result, default_value: 0, id: "new_result" }],
            async (values) => {
                const new_value = values.new_result;
                // Actual roll manipulation
                await override_die_result(brCard, die_index, new_value);
            },
        );
    });
    // Delete modifiers
    addEventListenerAll(html, ".brsw-delete-modifier", "click", async (ev) => {
        ev.stopPropagation();
        await delete_modifier(brCard, parseInt(ev.currentTarget.dataset.index));
    });
    // Edit TNs
    addEventListenerAll(html, ".brsw-edit-tn", "click", (ev) => {
        const old_tn = ev.currentTarget.dataset.value;
        const tn_trans = game.i18n.localize("BRSW.TN");
        simple_form(
            game.i18n.localize("BRSW.EditTN"),
            [{ id: "tn", label: tn_trans, default_value: old_tn }],
            async (values) => {
                await edit_tn(brCard, values.tn, "");
            },
        );
    });
    // TNs from target
    addEventListenerAll(html, ".brsw-target-tn, .brsw-selected-tn", "click", (ev) => {
        ev.stopPropagation();
        getTNFromTarget(brCard, ev.currentTarget.classList.contains("brsw-selected-tn"));
    });
    // Repeat card
    html.querySelector(".brsw-repeat-card")?.addEventListener("click", (ev) => {
        // noinspection JSIgnoredPromiseFromCall
        duplicate_message(brCard.message, ev);
    });
    // Save a macro using the current settings
    html.querySelector(".brsw-save-macro")?.addEventListener("click", () => {
        save_macro(brCard);
    });
    // Open the manual mods popup
    html
        .querySelector(".brsw-manual-mods")
        ?.addEventListener("click", (event) => {
            event.stopPropagation();
            toggle_mods_popup(event.target, brCard);
        });
    // Popout card
    html.querySelector(".brsw-popout-button")?.addEventListener("click", () => {
        brCard.showPopout();
    });
}

function create_macro_command_from_card(brCard) {
    let actions_stored = "";
    Utils.forEachActionGroup(brCard, group => {
        for (const action of group.actions) {
            actions_stored += `'${action.code.id}':` + action.selected + `,`;
        }
    });

    let card_function_name = "";
    let roll_function = "";
    let id = "";
    if (brCard.item_id) {
        card_function_name = "createItemCardFromId";
        roll_function =
            "game.brsw.rollItem(message, $(message.content), false, behaviour.includes('damage'));";
        id = brCard.item_id;
    } else if (brCard.skill) {
        card_function_name = "createSkillCardFromId";
        roll_function = "game.brsw.rollSkill(message, $(message.content), false);";
        id = brCard.trait.id;
    } else if (brCard.attribute) {
        card_function_name = "createAttributeCardFromId";
        roll_function =
            "game.brsw.rollAttribute(message, $(message.content), false);";
        id = brCard.trait.name;
    }
    return `
  let behaviour = game.brsw.get_action_from_click(event);
  if (behaviour === 'system') {
    game.swade.rollItemMacro(\`${brCard.render_data.header.title}\`);
    return;
  }
  let message = await game.brsw.${card_function_name}(
    '${brCard.token_id}',
    '${brCard.actor_id}',
    '${id}',
    {actions_stored:{${actions_stored}}});
  if (event) {
    if (behaviour.includes('trait')) {
      ${roll_function}
    }
  }
  `;
}

/**
 * Manage collapsible fields
 * @param html
 */
export function manage_collapsables(html, message) {
    addEventListenerAll(html, ".brsw-collapse-button", "click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const data_collapse = e.currentTarget.attributes["data-collapse"].nodeValue;
        const collapsable_spans = html.querySelectorAll("." + data_collapse);
        for (const collapsable_span of collapsable_spans) {
            collapsable_span.classList.toggle("brsw-collapsed");
        }
        //Call setPosition on any popouts so that they resize to fit the new content
        if (message) {
            for (const app of Object.values(message.apps)) {
                if (app.constructor.name === "ChatPopout") {
                    app.setPosition();
                }
            }
        }
    });
}

/**
 * Controls the sheet status when the portrait in the header is clicked
 * @param {SwadeActor} actor - The actor's instance that created the chat card
 */
async function manage_sheet(actor) {
    if (actor.sheet.rendered) {
        // noinspection JSAccessibilityCheck
        if (actor.sheet._minimized) {
            await actor.sheet.maximize();
            await actor.sheet.render(true);
        } else {
            await actor.sheet.minimize();
        }
    } else {
        await actor.sheet.render(true);
    }
}

/**
 * Gets the expected action, whenever to show the card, do a system roll, etc.,
 * from a click event and the settings
 * @param {event} event
 */
export function getActionFromClick(event) {
    let setting_name = WORLD_SETTING_KEYS.clickActionKeys.click;

    if (event?.shiftKey) {
        setting_name = WORLD_SETTING_KEYS.clickActionKeys.shiftClick;
    } else if (event?.ctrlKey) {
        setting_name = WORLD_SETTING_KEYS.clickActionKeys.ctrlClick;
    } else if (event?.altKey) {
        setting_name = WORLD_SETTING_KEYS.clickActionKeys.altClick;
    }

    return SettingsUtils.getWorldSetting(setting_name);
}

/**
 * Gets the roll options from the card html
 *
 * @param old_options - Options used as default
 */
export function get_roll_options(old_options, brCard) {
    const modifiers = old_options?.additionalMods || [];
    const dmg_modifiers = old_options?.dmgMods || [];
    const tn = old_options?.tn || 4;
    const tn_reason =
        old_options?.tn_reason || game.i18n.localize("BRSW.Default");
    let rof = old_options?.rof || 1;
    // We only check for modifiers when there are no old ones.
    if (!old_options?.hasOwnProperty("additionalMods")) {
        if (brCard.manual_mods) {
            if (brCard.manual_mods.trait_mods?.length) {
                const total = brCard.manual_mods.trait_mods.reduce(
                    (acc, val) => acc + parseInt(val),
                    0,
                );
                modifiers.push(total);
            }
            if (brCard.manual_mods.dmg_modifiers?.length) {
                const total = brCard.manual_mods.dmg_modifiers.reduce(
                    (acc, val) => acc + parseInt(val),
                    0,
                );
                dmg_modifiers.push(total);
            }
            if (brCard.manual_mods.rof) {
                rof = parseInt(brCard.manual_mods.rof);
            }
        }
        const dice_tray_input = $("input.dice-tray__input");
        const tray_modifier = parseInt(dice_tray_input.val());
        if (tray_modifier) {
            modifiers.push(tray_modifier);
            dice_tray_input.val("0");
        }
    }
    return {
        additionalMods: modifiers,
        dmgMods: dmg_modifiers,
        tn: tn,
        rof: rof,
        tn_reason: tn_reason,
    };
}

/**
 * Function to convert trait dice and modifiers into a string
 * @param trait
 */
export function traitToDieString(trait) {
    const { sides, modifier } = trait.die;
    const mod = Number(modifier);
    return `d${sides}${mod ? (mod > 0 ? "+" : "") + mod : ""}`;
}

export async function detect_fumble(has_wild_die, num_fumble_results, dice) {
    if (num_fumble_results === 0) {
        //No dice came up as a 1 so it's not possible to fumble
        return false;
    }

    if (!has_wild_die) {
        if (dice.length === 1) {
            //The extra is only rolling a single trait die and it came up as 1
            //In this case, we need to roll an extra d6 to confirm if it's a fumble
            if (!SettingsUtils.getWorldSetting(WORLD_SETTING_KEYS.autoCheckExtraCritFailures)) {
                //The option to auto-check for fumbles on extras is disabled, so we can return false
                return false;
            }

            const test_fumble_roll = new Roll("1d6");
            await test_fumble_roll.roll();
            await test_fumble_roll.toMessage({
                flavor: game.i18n.localize("BRSW.Testing_fumbles"),
            });

            //If the new roll comes up as a 1, it's a fumble
            return test_fumble_roll.total === 1;
        }
    } else {
        //This roll does have a wild die so we need to check if it came up as a 1
        const wild_die = dice.find((d) => d.wild_die);
        if (wild_die.raw_total !== 1) {
            //It's not possible to fumble unless the wild die is a 1
            return false;
        }
    }
    //If we made it here, either we're an Extra rolling multiple dice or we're a wild card
    //To count as a fumble, more than half the results need to be 1s
    //This also covers the case of a normal Trait+Wild Die roll since it would require both dice to be 1s
    const fumble_threshold = dice.length / 2;
    return num_fumble_results > fumble_threshold;
}

/**
 * Calculates the results of a roll
 * @param {[]} rolls A rolls list.
 */
export function calculate_damage_results(rolls) {
    let result = 0;
    for (const [index, roll] of rolls.entries()) {
        result = roll.result - roll.tn;
        if (roll.ap) {
            // We have an AP value, add it to the result
            result += Math.min(roll.ap, roll.armor);
        }
        if (result < 0) {
            roll.result_text = game.i18n.localize("BRSW.Failure");
            roll.result_icon = '<i class="brsw-red-text fas fa-minus-circle"></i>';
        } else if (result < 4) {
            roll.result_text = game.i18n.localize("BRSW.Shaken");
            roll.result_icon = '<i class="brsw-blue-text fas fa-certificate"></i>';
        } else if (result < 8) {
            roll.result_text = game.i18n.localize("BRSW.Wound");
            roll.result_icon = '<i class="brsw-red-text fas fa-tint"></i>';
        } else {
            const raises = Math.floor(result / 4);
            roll.result_text = game.i18n.localize("BRSW.Wounds") + " " + raises;
            roll.result_icon =
                raises.toString() + " " + '<i class="brsw-red-text fas fa-tint"></i>';
        }
    }
    if (result < 0) {
        result = 0;
    } else if (result === 0) {
        result = 0.01; // Ugly hack to differentiate from failure
    }
    return result;
}

/**
 * Updates a message using a new render_data
 * @param {ChatMessage, BrCommonCard} brCard
 * @param render_data
 */
export async function update_message(brCard, render_data) {
    if (brCard.type === BRSW2_CONST.BRSW_CARD_TYPES.TYPE_ITEM_CARD) {
        render_data.skill = Utils.getItemTrait(brCard.item, brCard.actor);
    }
    brCard.generateRenderData(render_data, undefined);
    await brCard.render();
    await brCard.save();
}

/**
 * Checks and rolls convictions
 * @param {SwadeActor }actor
 * @return Modifiers Array
 */
export async function check_and_roll_conviction(actor) {
    let conviction_modifier;
    if (
        actor.isWildcard &&
        game.settings.get("swade", "enableConviction") &&
        foundry.utils.getProperty(actor.system, "details.conviction.active")
    ) {
        const conviction_roll = new Roll("1d6x");
        await conviction_roll.roll();
        // noinspection JSIgnoredPromiseFromCall
        conviction_roll.toMessage({
            flavor: game.i18n.localize("BRSW.ConvictionRoll"),
        });
        conviction_modifier = new TraitModifier(
            game.i18n.localize("SWADE.Conv"),
            conviction_roll.total,
        );
    }
    return conviction_modifier;
}

function get_below_chat_modifiers(options, roll_options) {
    // Betterrolls modifiers
    options.additionalMods.forEach((mod) => {
        const mod_value = parseInt(mod);
        roll_options.modifiers.push(new TraitModifier("Better Rolls", mod_value));
        roll_options.total_modifiers += mod_value;
    });
}

function get_actor_own_modifiers(actor, roll_options) {
    // Wounds
    const woundPenalties = actor.calcWoundPenalties();
    if (woundPenalties !== 0) {
        roll_options.modifiers.push(
            new TraitModifier(game.i18n.localize("SWADE.Wounds"), woundPenalties),
        );
        roll_options.total_modifiers += woundPenalties;
    }
    // Fatigue
    const fatiguePenalties = actor.calcFatiguePenalties();
    if (fatiguePenalties !== 0) {
        roll_options.modifiers.push(
            new TraitModifier(game.i18n.localize("SWADE.Fatigue"), fatiguePenalties),
        );
        roll_options.total_modifiers += fatiguePenalties;
    }
    // Wounds or Fatigue ignored
    if (actor.system.woundsOrFatigue.ignored) {
        const ignored = Math.min(
            parseInt(actor.system.woundsOrFatigue.ignored) || 0,
            -fatiguePenalties - woundPenalties,
        );
        if (ignored) {
            roll_options.modifiers.push(
                new TraitModifier(
                    game.i18n.localize("BRSW.WoundsOrFatigueIgnored"),
                    ignored,
                ),
            );
            roll_options.total_modifiers += ignored;
        }
    }
    // Own status
    const statusPenalties = actor.calcStatusPenalties();
    if (statusPenalties !== 0) {
        roll_options.modifiers.push(
            new TraitModifier(game.i18n.localize("SWADE.Status"), statusPenalties),
        );
        roll_options.total_modifiers += statusPenalties;
    }
}

/**
 * Get all the options needed for a new roll
 * @param {BrCommonCard} brCard
 * @param extraData
 * @param traitDice
 * @param rollOptions - An object with the current roll_options
 */
async function getNewRollOptions(
    brCard,
    extraData,
    traitDice,
    rollOptions,
) {
    const extraOptions = {};

    const targetToken = getTargetedToken([brCard.actor, brCard.vehicle_actor].filter(Boolean));
    if (targetToken) {
        const originToken = brCard.token;
        const targetData = await getTNFromToken(
            brCard.skill,
            targetToken,
            originToken,
            brCard.actor,
            brCard.item,
            extraData,
        );
        brCard.trait_roll.tn = targetData.value;
        brCard.trait_roll.tn_reason = targetData.reason;
        extraOptions.target_modifiers = targetData.modifiers;
    }

    if (extraData.hasOwnProperty("tn")) {
        extraOptions.tn = extraData.tn;
        extraOptions.tn_reason = extraData.tn_reason.slice(0, 20);
    }

    if (extraData.hasOwnProperty("rof")) {
        extraOptions.rof = extraData.rof;
    }

    const options = get_roll_options(extraOptions, brCard);
    rollOptions.rof = options.rof || 1;

    // Trait modifier
    if (parseInt(traitDice.die.modifier)) {
        const mod_value = parseInt(traitDice.die.modifier);
        rollOptions.modifiers.push(
            new TraitModifier(game.i18n.localize("BRSW.TraitMod"), mod_value),
        );
    }

    get_below_chat_modifiers(options, rollOptions);
    get_actor_own_modifiers(brCard.actor, rollOptions);

    // Armor min str
    if (brCard.skill?.system.attribute === "agility" || brCard.attribute === "agility") {
        const armor_penalty = get_actor_armor_minimum_strength(brCard.actor);
        if (armor_penalty) {
            rollOptions.modifiers.push(armor_penalty);
        }
    }

    // Target Mods
    if (extraOptions.target_modifiers) {
        extraOptions.target_modifiers.forEach((modifier) => {
            rollOptions.modifiers.push(modifier);
        });
    }

    // Options set from card
    if (extraData.modifiers) {
        extraData.modifiers.forEach((modifier) => {
            rollOptions.modifiers.push(modifier);
        });
    }

    //Conviction
    const conviction_modifier = await check_and_roll_conviction(brCard.actor);
    if (conviction_modifier) {
        rollOptions.modifiers.push(conviction_modifier);
    }

    // Joker
    if (brCard.token && has_joker(brCard.token.id)) {
        rollOptions.modifiers.push(
            new TraitModifier(
                "Joker",
                brCard.actor.getFlag("swade", "jokerBonus") ?? 2,
            ),
        );
    }

    // Encumbrance
    const npcsUseEncumbrance = SettingsUtils.getWorldSetting(WORLD_SETTING_KEYS.npcsUseEncumbrance);
    if ((brCard.actor.type === "character" || npcsUseEncumbrance) &&
        brCard.actor.system.encumbered &&
        (brCard.attribute === "agility" || brCard.skill?.system.attribute === "agility")) {
        rollOptions.modifiers.push(new TraitModifier(game.i18n.localize("SWADE.Encumbered"), -2),);
    }

    // Vehicle
    if (brCard.vehicle_actor) {
        const vehicle = brCard.vehicle_actor;
        let handling = vehicle.system.handling;
        handling -= Math.max(
            vehicle.system.wounds.value - vehicle.system.wounds.ignored,
            0,
        );
        handling = Math.max(handling, -4); //Handling cannot be lower than -4
        if (handling !== 0) {
            rollOptions.modifiers.push(new TraitModifier("Handling", handling));
        }
    }
}

/**
 * Get the options for a re-roll
 * @param {BrCommonCard} brCard - The card to get the options from
 * @param {Object} extra_data
 */
async function get_reroll_options(brCard, extra_data) {
    // Reroll, clear out old reroll mods so we don't double add
    // This doesn't use filter() because the array is referenced elsewhere
    brCard.trait_roll.modifiers.splice(
        0,
        brCard.trait_roll.modifiers.length,
        ...brCard.trait_roll.modifiers.filter((mod) => !mod.isReroll)
    );
    //Reroll any dice modifiers
    const modifiers = brCard.trait_roll.modifiers;
    for (let i = 0; i < modifiers.length; ++i) {
        if (modifiers[i].dice) {
            modifiers[i] = new TraitModifier(modifiers[i].name, modifiers[i].dice.formula);
            await modifiers[i].evaluate();
        }
    }
    // Modifiers from effects
    if (brCard.trait_roll.reroll_mode === "benny") {
        for (const mod of brCard.actor.system.stats.globalMods.bennyTrait) {
            const new_modifier = new TraitModifier(mod.label, mod.value);
            new_modifier.isReroll = true;
            brCard.trait_roll.modifiers.push(new_modifier);
        }
    }
    // Modifiers from actions
    if (extra_data.reroll_modifier &&
        (!brCard.trait_roll.reroll_mode ||
            brCard.trait_roll.reroll_mode === extra_data.reroll_mode)) {
        const new_modifier = new TraitModifier(
            extra_data.reroll_modifier.name,
            extra_data.reroll_modifier.value,
        );
        new_modifier.isReroll = true;
        new_modifier.evaluate();
        brCard.trait_roll.modifiers.push(new_modifier);
    }
}

/**
 * Handle the feedback of rolling the dice
 * @param {ChatMessage} message
 * @param {BRWSRoll} brswroll
 * @param {Roll} roll
 */
export async function roll_dice(message, brswroll, roll) {
    if (game.dice3d) {
        await show_3d_dice(message, brswroll, roll);
    } else {
        game.audio.play(CONFIG.sounds.dice, { context: game.audio.interface });
    }
}

/**
 * Show the 3d dice for a roll
 * @param {ChatMessage} message
 * @param {BRWSRoll} brswroll
 * @param {Roll} roll
 */
async function show_3d_dice(message, brswroll, roll) {
    if (brswroll.wild_die) {
        set_wild_die_theme(roll.dice[roll.dice.length - 1]);
    }
    let users = null;
    if (message.whisper.length > 0) {
        users = message.whisper;
    }
    // Dice buried in modifiers.
    for (const modifier of brswroll.modifiers) {
        if (modifier.dice && modifier.dice instanceof Roll) {
            // noinspection ES6MissingAwait
            game.dice3d.showForRoll(modifier.dice, game.user, true, users);
        }
    }
    await game.dice3d.showForRoll(roll, game.user, true, users);
}

function set_wild_die_theme(wildDie) {
    const dieSystem = game.user.getFlag("swade", "dsnWildDiePreset") || "none";
    if (!dieSystem || dieSystem === "none") {
        return;
    }
    const colorSet = game.user.getFlag("swade", "dsnWildDie") || "none";
    if (colorSet === "customWildDie") {
        // Build the custom appearance and set it
        const customColors = game.user.getFlag("swade", "dsnCustomWildDieColors");
        const customOptions = game.user.getFlag("swade", "dsnCustomWildDieOptions");
        const customAppearance = {
            colorset: "custom",
            foreground: customColors?.labelColor,
            background: customColors?.diceColor,
            edge: customColors?.edgeColor,
            outline: customColors?.outlineColor,
            font: customOptions?.font,
            material: customOptions?.material,
            texture: customOptions?.texture,
            system: dieSystem,
        };
        foundry.utils.setProperty(wildDie, "options.appearance", customAppearance);
    } else {
        // Set the preset
        foundry.utils.setProperty(wildDie, "options.colorset", colorSet);
        foundry.utils.setProperty(wildDie, "options.appearance.system", dieSystem);
    }
    // Get the dicePreset for the given die type
    const dicePreset = game.dice3d?.DiceFactory.systems
        .get(dieSystem)
        ?.dice?.get("d" + wildDie.faces);
    if (!dicePreset) {
        return;
    }
    if (dicePreset?.modelFile && !dicePreset.modelLoaded) {
        // Load the modelFile
        dicePreset.loadModel(game.dice3d?.DiceFactory.loaderGLTF);
    }
    // Load the textures
    dicePreset.loadTextures();
}

/**
 * Creates a roll string from a trait a number of dice
 * @param traitDie
 * @param rof
 * @param traitName
 * @return {string}
 */
function createRollString(traitDie, rof, traitName) {
    const sides = traitDie.die.sides;
    const flavor = traitName ? `[${traitName}]` : "";
    //Don't explode on a d1 otherwise it will explode infinitely
    const die = `1d${sides}${sides !== 1 ? "x" : ""}${flavor}`;
    const count = Math.max(1, Number(rof) || 1);
    return [die, ...Array.from({ length: count - 1 }, () => die)].join("+");
}

/**
 * Makes a roll trait
 * @param {BrCommonCard}brCard
 * @param traitDie - An object representing a trait die
 * @param traitName - Label for the trait die
 * @param extra_data - Extra data to add to render options
 */
export async function roll_trait(brCard, traitDie, traitName, extra_data) {
    const { actor } = brCard;
    const roll_options = { modifiers: [], rof: undefined };

    if (!brCard.trait_roll.is_rolled) {
        await getNewRollOptions(brCard, extra_data, traitDie, roll_options);
    } else {
        roll_options.modifiers = brCard.trait_roll.modifiers;
        roll_options.rof = brCard.trait_roll.rof;
        await get_reroll_options(brCard, extra_data);
    }

    let rollString = createRollString(traitDie, roll_options.rof, traitName);

    // Wild Die
    let wild_die_formula = `+1d${traitDie["wild-die"].sides}x`;
    if (extra_data.hasOwnProperty("wildDieFormula")) {
        wild_die_formula = extra_data.wildDieFormula;
        if (wild_die_formula.charAt(0) !== "+") {
            wild_die_formula = `+${wild_die_formula}`;
        }
    }

    if ((actor.isWildcard || extra_data.add_wild_die) && wild_die_formula) {
        rollString += wild_die_formula;
        brCard.trait_roll.wild_die = true;
    } else {
        brCard.trait_roll.wild_die = false;
    }

    if (extra_data.total_aiming_ignorable_penalties > 0 && extra_data.aiming_ignore_data?.length > 0) {
        //We are aiming and we have penalties that we can ignore
        apply_aiming_ignore(extra_data);
    }

    brCard.trait_roll.modifiers = roll_options.modifiers;

    if (extra_data.tn) {
        brCard.trait_roll.tn = extra_data.tn;
        brCard.trait_roll.tn_reason = extra_data.tn_reason;
    }

    brCard.trait_roll.arcaneActivationOffset = extra_data.arcaneActivationOffset;

    const roll = new Roll(rollString);
    await roll.evaluate();
    await brCard.trait_roll.add_roll(roll);
    await roll_dice(brCard.message, brCard.trait_roll, roll);

    await brCard.render();
    await brCard.save();
}

/**
 * Function that exchanges roll when clicked
 * @param event - mouse click event
 * @param {BrCommonCard } brCard - The card to be updated
 */
async function old_roll_clicked(event, brCard) {
    let index = parseInt(event.currentTarget.dataset.index);
    if (index >= brCard.trait_roll.selected_roll_index) {
        index += 1;
    }
    brCard.trait_roll.selected_roll_index = index;
    if (
        brCard.item &&
        !isNaN(parseInt(brCard.item.system.pp)) &&
        brCard.render_data.used_pp
    ) {
        brCard.render_data.used_pp = await spendPP(
            brCard,
            brCard.render_data.used_pp,
        );
    }
    await brCard.render();
    brCard
        .save()
        .catch((err) =>
            console.error("Error while selecting and old roll: " + err),
        );
}

/**
 * Overrides the rolled result of a singular die in a given roll
 * @param {BrCommonCard} brCard
 * @param {int} die_index
 * @param {int, string} new_value
 */
async function override_die_result(brCard, die_index, new_value) {
    brCard.trait_roll.current_roll.dice[die_index].raw_total =
        parseInt(new_value);
    await brCard.trait_roll.recalculate_trait_results(
        brCard.trait_roll.tn,
        brCard.trait_roll.wild_die,
    );
    await brCard.render();
    await brCard.save();
    // Rerun macros.
    const macro_actions = brCard.getSelectedActions().filter((action) => {
        return action.code.hasOwnProperty("runSkillMacro");
    });
    if (macro_actions) {
        const macros = [];
        for (const macro of macro_actions) {
            macros.push(macro.code.runSkillMacro);
        }
        await runMacros(macros, brCard);
    }
}

/**
 * Add a modifier to a message
 * @param {BrCommonCard} brCard
 * @param modifier - A {name, value} modifier
 */
async function add_modifier(brCard, modifier) {
    if (modifier.value) {
        const name = modifier.label || game.i18n.localize("BRSW.ManuallyAdded");
        const new_mod = new TraitModifier(name, modifier.value);
        await new_mod.evaluate();
        if (new_mod.dice) {
            await roll_dice(brCard.message, brCard.trait_roll, new_mod.dice);
        }
        brCard.trait_roll.modifiers.push(new_mod);
        await brCard.trait_roll.recalculate_trait_results();
        await brCard.render();
        brCard.save().catch(() => {
            console.error("Error saving a card after adding a modifier");
        });
    }
}

/**
 * Deletes a modifier from a message
 * @param {BrCommonCard} brCard
 * @param {int} index - Index of the modifier to delete.
 */
async function delete_modifier(brCard, index) {
    brCard.trait_roll.modifiers.splice(index, 1);
    await brCard.trait_roll.recalculate_trait_results();
    await brCard.render();
    brCard.save().catch(() => {
        console.error("Error saving a card after deleting a modifier");
    });
}

/**
 * Edits one modifier
 * @param {BrCommonCard} brCard
 * @param {int} index
 * @param {Object} new_modifier
 */
async function edit_modifier(brCard, index, new_modifier) {
    // noinspection JSCheckFunctionSignatures
    // Add float modifier support
    const mod_value = parseFloat(new_modifier.value);
    if (mod_value) {
        brCard.trait_roll.modifiers[index].label = new_modifier.label;
        brCard.trait_roll.modifiers[index].value = mod_value;
        await brCard.trait_roll.recalculate_trait_results();
        await brCard.render();
        brCard.save().catch(() => {
            console.error("Error saving a card after editing a modifier");
        });
    }
}

/**
 * Changes the of one of the rolls.
 *
 * @param {BrCommonCard} brCard
 * @param {int} new_tn
 * @param {string} reason - If it is set the reason will be changed
 */
async function edit_tn(brCard, new_tn, reason) {
    brCard.trait_roll.tn = new_tn;
    if (reason) {
        brCard.trait_roll.tn_reason = reason;
    }
    await brCard.trait_roll.recalculate_trait_results();
    await brCard.render();
    brCard.save().catch(() => {
        console.error("Error saving a card after editing a TN");
    });
}

/**
 * Change the TNs of a roll from a token (targeted or selected)
 *
 * @param {BrCommonCard} brCard
 * @param {boolean} selected - True to select targeted, false for selected
 */
async function getTNFromTarget(brCard, selected) {
    const targetToken = selected ? getSelectedToken([brCard.actor]) : getTargetedToken([brCard.actor]);
    if (targetToken) {
        const extra_data = { modifiers: [] };
        const originToken = brCard.token;
        const target = await getTNFromToken(
            brCard.skill,
            targetToken,
            originToken,
            brCard.actor,
            brCard.item,
            extra_data,
        );

        if (target.value) {
            await edit_tn(brCard, target.value, target.reason).catch(() => {
                console.error("Error editing TN");
            });
        }

        const tn = { modifiers: [] };
        calculateDistance(
            originToken,
            targetToken,
            brCard.item,
            tn,
            brCard.skill,
            extra_data,
        );

        brCard.trait_roll.delete_range_modifiers();
        brCard.trait_roll.modifiers = brCard.trait_roll.modifiers.concat(
            tn.modifiers,
        );

        await brCard.trait_roll.recalculate_trait_results();
        await brCard.render();
        await brCard.save();
    }
}

/**
 * Returns true if a token has drawn a joker.
 * @param token_id
 * @return {boolean}
 */
export function has_joker(token_id) {
    let joker = false;
    game.combat?.combatants.forEach((combatant) => {
        if (combatant.token && combatant.token?.id === token_id) {
            joker = combatant.hasJoker;
        }
    });
    return joker;
}

/**
 * Duplicate a message and clean rolls
 * @param {ChatMessage} message
 * @param event - javascript event for click
 */
async function duplicate_message(message, event) {
    const data = foundry.utils.duplicate(message);
    // Remove rolls
    data.timestamp = new Date().getTime();
    delete data._id;
    const new_message = await ChatMessage.create(data);
    const brCard = new BrCommonCard(new_message);
    brCard.trait_roll = new TraitRoll();
    brCard.render_data.damage_rolls = [];
    await brCard.render();
    await brCard.save();
    const action = getActionFromClick(event);
    if (action.includes("dialog")) {
        game.brsw.dialog.show_card(brCard);
    } else if (action.includes("trait")) {
        // noinspection JSUnresolvedVariable
        const brCard = new BrCommonCard(message);
        const card_type = brCard.type;
        if (card_type === BRSW2_CONST.BRSW_CARD_TYPES.TYPE_ATTRIBUTE_CARD) {
            await rollAttribute(brCard, false);
        } else if (card_type === BRSW2_CONST.BRSW_CARD_TYPES.TYPE_SKILL_CARD) {
            await rollSkill(brCard, false);
        } else if (card_type === BRSW2_CONST.BRSW_CARD_TYPES.TYPE_ITEM_CARD) {
            const roll_damage = action.includes("damage");
            await rollItem(brCard, $(brCard.message.content), false, roll_damage);
        }
    }
    return new_message;
}

/**
 * Processes actions common to skill and item cards
 */
export function process_common_actions(action, extra_data, macros, actor) {
    let action_name = action.name || action.button_name;
    action_name = action_name.includes("BRSW.")
        ? game.i18n.localize(action_name)
        : action_name;
    // noinspection JSUnresolvedVariable
    if (action.skillMod) {
        const modifier = new TraitModifier(action_name, action.skillMod);
        modifier.evaluate();
        if (extra_data.modifiers) {
            extra_data.modifiers.push(modifier);
        } else {
            extra_data.modifiers = [modifier];
        }
        if (action.aimingIgnoreMod > 0) {
            //This is an aiming type action which can ignore certain penalties
            //Save some data about it so we can process it later
            add_aiming_ignore_modifier(extra_data, modifier, action.aimingIgnoreMod);
        } else if (action.aiming_ignores) {
            //This is an action that can be ignored by aiming
            //Save some data about it so we can process it later
            extra_data.total_aiming_ignorable_penalties =
                extra_data.total_aiming_ignorable_penalties ?? 0;
            extra_data.total_aiming_ignorable_penalties += Math.abs(modifier.value);
        }

        const skillModValue = Number(action.skillMod);
        if (action.ignoresArcaneActivation && !isNaN(skillModValue)) {
            extra_data.arcaneActivationOffset ??= 0;
            extra_data.arcaneActivationOffset += skillModValue;
        }
    }
    if (action.rerollSkillMod) {
        //Reroll
        extra_data.reroll_modifier = new TraitModifier(
            action_name,
            action.rerollSkillMod,
        );
        extra_data.reroll_mode = action.rerollMode;
    }
    if (action.rof) {
        extra_data.rof = action.rof;
    }
    if (action.dice) {
        extra_data.rof = action.dice;
    }
    if (action.tnOverride) {
        if (
            isNaN(action.tnOverride) &&
            action.tnOverride.toLowerCase() === "parry" &&
            game.user.targets
        ) {
            extra_data.tn = parseInt(
                game.user.targets.first().actor.system.stats.parry.value,
            );
        } else {
            extra_data.tn = parseInt(action.tnOverride);
        }
        extra_data.tn_reason = action.button_name;
    }
    // noinspection JSUnresolvedVariable
    if (action.self_add_status) {
        set_or_update_condition(action.self_add_status, actor).catch(() => {
            console.error("BR2: Unable to update condition");
        });
    }
    if (action.hasOwnProperty("wildDieFormula")) {
        extra_data.wildDieFormula = action.wildDieFormula;
        if (extra_data.wildDieFormula.charAt(0) !== "+") {
            extra_data.wildDieFormula = "+" + extra_data.wildDieFormula;
        }
    }
    if (action.runSkillMacro) {
        macros.push(action.runSkillMacro);
    }
    if (action.type === "macro") {
        macros.push(action.uuid);
    }
    if (action.add_wild_die) {
        extra_data.add_wild_die = true;
    }
}

/**
 * Gets the bigger minimum strength
 * @param actor
 */
function get_actor_armor_minimum_strength(actor) {
    // This should affect only Agility related skills
    const min_str_armors = actor.items.filter((item) => /** equipStatus codes:
   * Weapons:
   * Stored = 0; Carried = 1; Off-Hand = 2; Main Hand = 4; Two Hands = 5
   * All other:
   * Stored = 0; Carried = 1; Equipped = 3
   */ {
        return (
            item.type === "armor" &&
            item.system.minStr &&
            item.system.equipStatus >= 2
        );
    });
    for (const armor of min_str_armors) {
        const penalty = process_minimum_str_modifiers(
            armor,
            actor,
            "BRSW.NotEnoughStrengthArmor",
        );
        if (penalty) {
            return penalty;
        }
    }
    return 0;
}

/**
 * Calculates minimum str modifiers
 * @param item
 * @param actor
 * @param name
 */
export function process_minimum_str_modifiers(item, actor, name) {
    const splited_minStr = item.system.minStr.split("d");
    const min_str_die_size = parseInt(splited_minStr[splited_minStr.length - 1]);
    let new_mod;
    let str_die_size = actor?.system?.attributes?.strength?.die?.sides;
    if (actor?.system?.attributes?.strength.encumbranceSteps) {
        str_die_size += Math.max(
            actor?.system?.attributes?.strength.encumbranceSteps * 2,
            0,
        );
    }
    if (min_str_die_size > str_die_size) {
        // Minimum strength is not meet
        new_mod = new TraitModifier(
            game.i18n.localize(name),
            -Math.trunc((min_str_die_size - str_die_size) / 2),
        );
    }
    return new_mod;
}

/**
 * Added a penalty that can be ignored by aiming to the extra_data
 * @param extra_data
 * @param modifier
 */
export function add_aiming_ignore_modifier(extra_data, modifier, ignore_mod) {
    const aiming_ignore_data = {
        modifier: modifier,
        ignore_mod: ignore_mod,
    };
    if (extra_data.aiming_ignore_data) {
        extra_data.aiming_ignore_data.push(aiming_ignore_data);
    } else {
        extra_data.aiming_ignore_data = [aiming_ignore_data];
    }
}

/**
 * Adjust our action modifiers to reflect ignored penalties
 * @param extra_data
 */
function apply_aiming_ignore(extra_data) {
    //Sort the list so that the smaller mods are used first. This ensures we maximize the benefit
    extra_data.aiming_ignore_data = extra_data.aiming_ignore_data.sort(
        (a, b) => a.ignore_mod - b.ignore_mod,
    );
    //Loop over our aiming modifiers and adjust them to reflect the ignored penalties
    for (const ignore_data of extra_data.aiming_ignore_data) {
        if (
            ignore_data.modifier.value >= extra_data.total_aiming_ignorable_penalties
        ) {
            //The default skill mod is more than we would ignore so just use that
            continue;
        }
        ignore_data.modifier.value = Math.min(
            extra_data.total_aiming_ignorable_penalties,
            ignore_data.ignore_mod,
        );
        extra_data.total_aiming_ignorable_penalties -= ignore_data.modifier.value;
        if (extra_data.total_aiming_ignorable_penalties === 0) {
            break;
        }
    }
}
