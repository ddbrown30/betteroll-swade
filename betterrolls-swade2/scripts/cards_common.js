// Common functions used in all cards
/* globals game, Token, TokenDocument, Roll, canvas, console, $, foundry,
      duplicate, ChatMessage, ui, Macro */
// noinspection JSUnusedAssignment

import {
  get_targeted_token,
  set_or_update_condition,
  SettingsUtils,
  simple_form,
  spendMastersBenny,
} from "./utils.js";
import {
  discount_pp,
  get_item_trait,
  roll_item,
  run_macros,
} from "./item_card.js";
import {
  calculate_distance,
  get_tn_from_token,
  roll_skill,
} from "./skill_card.js";
import { roll_attribute } from "./attribute_card.js";
import {
  create_unshaken_card,
  create_unstun_card,
} from "./remove_status_cards.js";
import { get_gm_modifiers } from "./gm_modifiers.js";
import { TraitRoll } from "./rolls.js";
import { BrCommonCard } from "./BrCommonCard.js";
import { TraitModifier } from "./modifiers.js";
import { SETTING_KEYS } from "./brsw2-config.js";

export const BRSW_CONST = {
  TYPE_ATTRIBUTE_CARD: 1,
  TYPE_SKILL_CARD: 2,
  TYPE_ITEM_CARD: 3,
  TYPE_DMG_CARD: 10,
  TYPE_INC_CARD: 11,
  TYPE_INJ_CARD: 12,
  TYPE_UNSHAKE_CARD: 13,
  TYPE_UNSTUN_CARD: 14,
  TYPE_RESULT_CARD: 100,
};

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
 * Makes the br_card class accesible
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
  let actor;
  if (origin instanceof TokenDocument || origin instanceof Token) {
    actor = origin.actor;
  } else {
    actor = origin;
  }
  if (render_data.tooltip) {
    render_data.tooltip = // Limit tooltip size.
      render_data.tooltip.length <
      SettingsUtils.getWorldSetting("max_tooltip_length")
        ? render_data.tooltip
        : null;
  }
  const br_message = new BrCommonCard(undefined);
  br_message.actor_id = actor.id;
  if (actor !== origin) {
    br_message.token_id = origin.id;
  } else if (actor.isToken) {
    br_message.token_id = actor.token.id;
  }
  br_message.generate_render_data(render_data, template);
  return br_message;
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
export function get_actor_from_ids(token_id, actor_id) {
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
 * @param {BrCommonCard} br_card
 */
function save_macro(br_card) {
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
  const command = create_macro_command_from_card(br_card);
  Macro.create({
    name: br_card.render_data.header.title,
    img: br_card.render_data.header.img || "icons/svg/aura.svg",
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
 * Connects the listener for all chat cards
 * @param {BrCommonCard} br_card
 * @param {HTMLElement} html - html of the card
 */
export function activate_common_listeners(br_card, html) {
  const html_jquery = $(html); // Get sure html is a Jquery element.
  // The message will be rendered at creation and each time a flag is added
  // Actor will be undefined if this is called before flags are set
  if (br_card.actor) {
    html_jquery
      .find(".brws-actor-img")
      .addClass("bound")
      .click(async () => {
        await manage_sheet(br_card.actor);
      });
    html_jquery
      .find(".brws-vehicle-img")
      .addClass("bound")
      .click(async () => {
        await manage_sheet(br_card.vehicle_actor);
      });
    html_jquery.find(".br2-unshake-card").on("click", () => {
      create_unshaken_card(br_card.message, undefined).catch(() => {
        console.error("BR2 unable to show unshaken card");
      });
    });
    html_jquery.find(".br2-unstun-card").on("click", () => {
      create_unstun_card(br_card.message, undefined).catch(() => {
        console.error("BR2 unable to show unstun card");
      });
    });
  }
  html_jquery.find(".brsw-selected-actions").on("click", () => {
    game.brsw.dialog.show_card(br_card);
  });
  // Selectable modifiers
  html_jquery
    .find(".brws-selectable")
    .click((ev) => manage_selectable_click(ev, br_card.message));
  // Collapsibles
  manage_collapsables(html_jquery, br_card.message);
  // Old rolls
  html_jquery.find(".brsw-old-roll").click(async (ev) => {
    await old_roll_clicked(ev, br_card);
  });
  // Add modifiers
  html_jquery.find(".brsw-add-modifier").click(() => {
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
        await add_modifier(br_card, {
          label: values.label,
          value: values.value,
        });
      },
    );
  });
  // Edit modifiers
  html_jquery.find(".brsw-edit-modifier").click((ev) => {
    const label_mod = game.i18n.localize("BRSW.Modifier");
    const { value, label, index } = ev.currentTarget.dataset;
    simple_form(
      game.i18n.localize("BRSW.EditModifier"),
      [
        { label: "Label", default_value: label },
        { id: "value", label: label_mod, default_value: value },
      ],
      async (values) => {
        await edit_modifier(br_card, parseInt(index), {
          name: values.Label,
          value: values.value,
          extra_class: parseInt(values.value) < 0 ? " brsw-red-text" : "",
        });
      },
    );
  });
  // Edit die results
  html_jquery.find(".brsw-override-die").click((ev) => {
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
        await override_die_result(br_card, die_index, new_value);
      },
    );
  });
  // Delete modifiers
  html_jquery.find(".brsw-delete-modifier").click(async (ev) => {
    ev.stopPropagation();
    await delete_modifier(br_card, parseInt(ev.currentTarget.dataset.index));
  });
  // Edit TNs
  html_jquery.find(".brsw-edit-tn").click((ev) => {
    const old_tn = ev.currentTarget.dataset.value;
    const tn_trans = game.i18n.localize("BRSW.TN");
    simple_form(
      game.i18n.localize("BRSW.EditTN"),
      [{ id: "tn", label: tn_trans, default_value: old_tn }],
      async (values) => {
        await edit_tn(br_card, values.tn, "");
      },
    );
  });
  // TNs from target
  html_jquery.find(".brsw-target-tn, .brsw-selected-tn").click((ev) => {
    ev.stopPropagation();
    const { index } = ev.currentTarget.dataset;
    get_tn_from_target(
      br_card,
      parseInt(index),
      ev.currentTarget.classList.contains("brsw-selected-tn"),
    ).catch((e) => {
      console.error("ERROR getting_tn_from_target. Error:" + e);
    });
  });
  // Repeat card
  html_jquery.find(".brsw-repeat-card").click((ev) => {
    // noinspection JSIgnoredPromiseFromCall
    duplicate_message(br_card.message, ev);
  });
  // Save a macro using the current settings
  html_jquery.find(".brsw-save-macro").click(() => {
    save_macro(br_card);
  });
  // Popout card
  html_jquery.find(".brsw-popout-button").click(() => {
    br_card.show_popup();
  });
}

function create_macro_command_from_card(br_card) {
  let actions_stored = "";
  for (const group of Object.values(br_card.action_groups)) {
    for (const action of group.actions) {
      actions_stored += `'${action.code.id}':` + action.selected + `,`;
    }
  }
  let card_function_name = "";
  let roll_function = "";
  let id = "";
  if (br_card.item_id) {
    card_function_name = "create_item_card_from_id";
    roll_function =
      "game.brsw.roll_item(message, $(message.content), false, behaviour.includes('damage'));";
    id = br_card.item_id;
  } else if (br_card.skill_id) {
    card_function_name = "create_skill_card_from_id";
    roll_function = "game.brsw.roll_skill(message, $(message.content), false);";
    id = br_card.skill_id;
  } else if (br_card.attribute_name) {
    card_function_name = "create_attribute_card_from_id";
    roll_function =
      "game.brsw.roll_attribute(message, $(message.content), false);";
    id = br_card.attribute_name;
  }
  return `
  let behaviour = game.brsw.get_action_from_click(event);
  if (behaviour === 'system') {
    game.swade.rollItemMacro(\`${br_card.render_data.header.title}\`);
    return;
  }
  let message = await game.brsw.${card_function_name}(
    '${br_card.token_id}',
    '${br_card.actor_id}',
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
 * Manage collapsable fields
 * @param html
 */
export function manage_collapsables(html, message) {
  const collapse_buttons = html.find(".brsw-collapse-button");
  collapse_buttons.click((e) => {
    e.preventDefault();
    e.stopPropagation();
    const clicked = $(e.currentTarget);
    const data_collapse = clicked.attr("data-collapse");
    const collapsable_span = html.find("." + data_collapse);
    collapsable_span.toggleClass("brsw-collapsed");
    if (collapsable_span.hasClass("brsw-collapsed")) {
      const button = clicked.find(".fas.fa-caret-down");
      button.removeClass("fa-caret-down");
      button.addClass("fa-caret-right");
    } else {
      const button = clicked.find(".fas.fa-caret-right");
      button.removeClass("fa-caret-right");
      button.addClass("fa-caret-down");
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
 * Mark and unmark selectable items
 * @param ev mouse click event
 * @param {ChatMessage} message - The message that contains the selectable item
 */
export async function manage_selectable_click(ev, message) {
  ev.preventDefault();
  ev.stopPropagation();
  if (!message || !ev.currentTarget.dataset.action_id) {
    return manage_html_selectables(ev);
  }
  const br_card = new BrCommonCard(message);
  const action = br_card.get_action_from_id(ev.currentTarget.dataset.action_id);
  action.selected = !action.selected;
  await br_card.render();
  await br_card.save();
  return null;
}

/**
 * Manage selectables not based on cards
 * @param ev
 */
function manage_html_selectables(ev) {
  if (ev.currentTarget.classList.contains("brws-permanent-selected")) {
    ev.currentTarget.classList.remove("brws-permanent-selected");
    ev.currentTarget.classList.remove("brws-selected");
  } else if (ev.currentTarget.classList.contains("brws-selected")) {
    ev.currentTarget.classList.add("brws-permanent-selected");
  } else {
    ev.currentTarget.classList.add("brws-selected");
  }
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
export function get_action_from_click(event) {
  let setting_name = "click";
  // noinspection JSUnresolvedVariable
  if (event.shiftKey) {
    setting_name = "shift_click";
  } else if (event.ctrlKey) {
    setting_name = "ctrl_click";
  } else if (event.altKey) {
    setting_name = "alt_click";
  }
  return SettingsUtils.getWorldSetting(setting_name);
}

/**
 * Gets the roll options from the card html
 *
 * @param old_options - Options used as default
 */
export function get_roll_options(old_options) {
  const modifiers = old_options?.additionalMods || [];
  const dmg_modifiers = old_options?.dmgMods || [];
  const tn = old_options?.tn || 4;
  const tn_reason =
    old_options?.tn_reason || game.i18n.localize("BRSW.Default");
  let rof = old_options?.rof || 1;
  // We only check for modifiers when there are no old ones.
  if (!old_options?.hasOwnProperty("additionalMods")) {
    $(".brsw-chat-form .brws-selectable.brws-selected").each((_, element) => {
      if (element.dataset.type === "modifier") {
        modifiers.push(element.dataset.value);
      } else if (element.dataset.type === "dmg_modifier") {
        dmg_modifiers.push(element.dataset.value);
      } else if (element.dataset.type === "rof") {
        rof = parseInt(element.dataset.value);
      }
      // Unmark mod
      if (!element.classList.contains("brws-permanent-selected")) {
        element.classList.remove("brws-selected");
      }
    });
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
export function trait_to_string(trait) {
  let string = `d${trait.die.sides}`;
  const modifier = parseInt(trait.die.modifier);
  if (modifier) {
    string = string + (modifier > 0 ? "+" : "") + modifier;
  }
  return string;
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
      if (
        !SettingsUtils.getWorldSetting(SETTING_KEYS.auto_check_extra_fumbles)
      ) {
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
 * @param {[]} rolls A rolls list see BSWRoll doc
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
 * @param {ChatMessage, BrCommonCard} br_message
 * @param render_data
 */
export async function update_message(br_message, render_data) {
  if (!br_message.hasOwnProperty("action_groups")) {
    br_message = new BrCommonCard(br_message);
  }
  if (br_message.type === BRSW_CONST.TYPE_ITEM_CARD) {
    render_data.skill = get_item_trait(br_message.item, br_message.actor);
  }
  br_message.generate_render_data(render_data, undefined);
  await br_message.render();
  await br_message.save();
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
  // Master Modifiers
  const master_modifiers = get_gm_modifiers();
  if (master_modifiers) {
    roll_options.modifiers.push(
      new TraitModifier(
        game.i18n.localize("BRSW.GMModifier"),
        master_modifiers,
      ),
    );
    roll_options.total_modifiers += master_modifiers;
  }
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
 * @param {BrCommonCard} br_card
 * @param extra_data
 * @param trait_dice
 * @param roll_options - An object with the current roll_options
 */
async function get_new_roll_options(
  br_card,
  extra_data,
  trait_dice,
  roll_options,
) {
  const extra_options = {};
  let target_token = get_targeted_token();
  if (!target_token) {
    canvas.tokens.controlled.forEach((token) => {
      // noinspection JSUnresolvedVariable
      if (
        token.actor !== br_card.actor &&
        token.actor !== br_card.vehicle_actor
      ) {
        target_token = token;
      }
    });
  }
  if (target_token && br_card.skill) {
    const origin_token = br_card.token;
    const target_data = await get_tn_from_token(
      br_card.skill,
      target_token,
      origin_token,
      br_card.actor,
      br_card.item,
      extra_data,
    );
    br_card.trait_roll.tn = target_data.value;
    br_card.trait_roll.tn_reason = target_data.reason;
    extra_options.target_modifiers = target_data.modifiers;
  }
  if (extra_data.hasOwnProperty("tn")) {
    extra_options.tn = extra_data.tn;
    extra_options.tn_reason = extra_data.tn_reason.slice(0, 20);
  }
  if (extra_data.hasOwnProperty("rof")) {
    extra_options.rof = extra_data.rof;
  }
  const options = get_roll_options(extra_options);
  roll_options.rof = options.rof || 1;
  // Trait modifier
  if (parseInt(trait_dice.die.modifier)) {
    const mod_value = parseInt(trait_dice.die.modifier);
    roll_options.modifiers.push(
      new TraitModifier(game.i18n.localize("BRSW.TraitMod"), mod_value),
    );
  }
  get_below_chat_modifiers(options, roll_options);
  get_actor_own_modifiers(br_card.actor, roll_options);
  // Armor min str
  if (br_card.skill?.system.attribute === "agility") {
    const armor_penalty = get_actor_armor_minimum_strength(br_card.actor);
    if (armor_penalty) {
      roll_options.modifiers.push(armor_penalty);
    }
  }
  // Target Mods
  if (extra_options.target_modifiers) {
    extra_options.target_modifiers.forEach((modifier) => {
      roll_options.modifiers.push(modifier);
    });
  }
  // Options set from card
  if (extra_data.modifiers) {
    extra_data.modifiers.forEach((modifier) => {
      roll_options.modifiers.push(modifier);
    });
  }
  //Conviction
  const conviction_modifier = await check_and_roll_conviction(br_card.actor);
  if (conviction_modifier) {
    roll_options.modifiers.push(conviction_modifier);
  }
  // Joker
  if (br_card.token && has_joker(br_card.token.id)) {
    roll_options.modifiers.push(
      new TraitModifier(
        "Joker",
        br_card.actor.getFlag("swade", "jokerBonus") ?? 2,
      ),
    );
  }
  // Encumbrance
  const npc_avoid_encumbrance =
    SettingsUtils.getSetting("optional_rules_enabled").indexOf(
      "NPCDontUseEncumbrance",
    ) > -1;
  if (
    (br_card.actor.type === "character" || !npc_avoid_encumbrance) &&
    br_card.actor.system.encumbered &&
    (br_card.attribute_name === "agility" ||
      br_card.skill?.system.attribute === "agility")
  ) {
    roll_options.modifiers.push(
      new TraitModifier(game.i18n.localize("SWADE.Encumbered"), -2),
    );
  }
  // Vehicle
  if (br_card.vehicle_actor) {
    const vehicle = br_card.vehicle_actor;
    let handling = vehicle.system.handling;
    handling -= Math.max(
      vehicle.system.wounds.value - vehicle.system.wounds.ignored,
      0,
    );
    handling = Math.max(handling, -4); //Handling cannot be lower than -4
    if (handling !== 0) {
      roll_options.modifiers.push(new TraitModifier("Handling", handling));
    }
  }
}

/**
 * Get the options for a reroll
 * @param {BrCommonCard} br_card - The card to get the options from
 * @param {Object} extra_data
 */
function get_reroll_options(br_card, extra_data) {
  // Reroll, keep old options
  for (const mod of br_card.trait_roll.modifiers) {
    if (mod.name.includes("(reroll)")) {
      return;
    }
  }
  if (br_card.actor.system.stats.globalMods.bennyTrait.length) {
    for (const mod of br_card.actor.system.stats.globalMods.bennyTrait) {
      br_card.trait_roll.modifiers.push(
        new TraitModifier(mod.label, mod.value),
      );
    }
  }
  // Modifiers from actions
  if (extra_data.reroll_modifier) {
    const new_modifier = new TraitModifier(
      `${extra_data.reroll_modifier.name} (reroll)`,
      extra_data.reroll_modifier.value,
    );
    new_modifier.evaluate();
    br_card.trait_roll.modifiers.push(new_modifier);
  }
}

/**
 * Show the 3d dice for a trait roll
 * @param {BrCommonCard} br_card
 * @param {Roll} roll
 */
async function show_3d_dice(br_card, roll) {
  if (br_card.trait_roll.wild_die) {
    set_wild_die_theme(roll.dice[roll.dice.length - 1]);
  }
  let users = null;
  if (br_card.message.whisper.length > 0) {
    users = br_card.message.whisper;
  }
  const { blind } = br_card.message;
  // Dice buried in modifiers.
  for (const modifier of br_card.trait_roll.modifiers) {
    if (modifier.dice && modifier.dice instanceof Roll) {
      // noinspection ES6MissingAwait
      game.dice3d.showForRoll(modifier.dice, game.user, true, users, blind);
    }
  }
  await game.dice3d.showForRoll(roll, game.user, true, users, blind);
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
 * @param trait_dice
 * @param rof
 * @return {string}
 */
function create_roll_string(trait_dice, rof) {
  let roll_string = `1d${trait_dice.die.sides}x`;
  // @zk-sn: If roll is a 1d1x (example: Strength score of 1), change it to 1d1 to prevent exploding die recursion.  (Fix for #211)
  if (roll_string === `1d1x`) {
    roll_string = `1d1`;
    for (let i = 0; i < rof - 1; i++) {
      roll_string += `+1d${trait_dice.die.sides}`;
    }
  } else {
    for (let i = 0; i < rof - 1; i++) {
      roll_string += `+1d${trait_dice.die.sides}x`;
    }
  }
  return roll_string;
}

/**
 * Makes a roll trait
 * @param {BrCommonCard}br_card
 * @param trait_dice - An object representing a trait dice
 * @param dice_label - Label for the trait die
 * @param extra_data - Extra data to add to render options
 */
export async function roll_trait(br_card, trait_dice, dice_label, extra_data) {
  const { actor } = br_card;
  const roll_options = { modifiers: [], rof: undefined };
  if (!br_card.trait_roll.is_rolled) {
    await get_new_roll_options(br_card, extra_data, trait_dice, roll_options);
  } else {
    roll_options.modifiers = br_card.trait_roll.modifiers;
    roll_options.rof = br_card.trait_roll.rof;
    get_reroll_options(br_card, extra_data);
  }
  let roll_string = create_roll_string(trait_dice, roll_options.rof);
  // Wild Die
  let wild_die_formula = `+1d${trait_dice["wild-die"].sides}x`;
  if (extra_data.hasOwnProperty("wildDieFormula")) {
    wild_die_formula = extra_data.wildDieFormula;
    if (wild_die_formula.charAt(0) !== "+") {
      wild_die_formula = `+${wild_die_formula}`;
    }
  }
  if ((actor.isWildcard || extra_data.add_wild_die) && wild_die_formula) {
    roll_string += wild_die_formula;
    br_card.trait_roll.wild_die = true;
  } else {
    br_card.trait_roll.wild_die = false;
  }
  if (
    extra_data.total_aiming_ignorable_penalties > 0 &&
    extra_data.aiming_ignore_data?.length > 0
  ) {
    //We are aiming and we have penalties that we can ignore
    apply_aiming_ignore(extra_data);
  }
  br_card.trait_roll.modifiers = roll_options.modifiers;
  if (extra_data.tn) {
    br_card.trait_roll.tn = extra_data.tn;
    br_card.trait_roll.tn_reason = extra_data.tn_reason;
  }
  const roll = new Roll(roll_string);
  await roll.evaluate();
  await br_card.trait_roll.add_roll(roll);
  if (game.dice3d) {
    await show_3d_dice(br_card, roll);
  }
  await br_card.render();
  await br_card.save();
}

/**
 * Function that exchanges roll when clicked
 * @param event - mouse click event
 * @param {BrCommonCard } br_card - The card to be updated
 */
async function old_roll_clicked(event, br_card) {
  let index = parseInt(event.currentTarget.dataset.index);
  if (index >= br_card.trait_roll.selected_roll_index) {
    index += 1;
  }
  br_card.trait_roll.selected_roll_index = index;
  if (
    br_card.item &&
    !isNaN(parseInt(br_card.item.system.pp)) &&
    br_card.render_data.used_pp
  ) {
    br_card.render_data.used_pp = await discount_pp(
      br_card,
      0,
      br_card.render_data.used_pp,
      0,
    );
  }
  await br_card.render();
  br_card
    .save()
    .catch((err) =>
      console.error("Error while selecting and old roll: " + err),
    );
}

/**
 * Overrides the rolled result of a singular die in a given roll
 * @param {BrCommonCard} br_card
 * @param {int} die_index
 * @param {int, string} new_value
 */
async function override_die_result(br_card, die_index, new_value) {
  br_card.trait_roll.current_roll.dice[die_index].raw_total =
    parseInt(new_value);
  await br_card.trait_roll.current_roll.recalculate_trait_results(
    br_card.trait_roll.tn,
    br_card.trait_roll.wild_die,
  );
  await br_card.render();
  await br_card.save();
  // Rerun macros.
  const macro_actions = br_card.get_selected_actions().filter((action) => {
    return action.code.hasOwnProperty("runSkillMacro");
  });
  if (macro_actions) {
    const macros = [];
    for (const macro of macro_actions) {
      macros.push(macro.code.runSkillMacro);
    }
    await run_macros(macros, br_card.actor, br_card.item, br_card);
  }
}

/**
 * Add a modifier to a message
 * @param {BrCommonCard} br_card
 * @param modifier - A {name, value} modifier
 */
async function add_modifier(br_card, modifier) {
  if (modifier.value) {
    const name = modifier.label || game.i18n.localize("BRSW.ManuallyAdded");
    const new_mod = new TraitModifier(name, modifier.value);
    await new_mod.evaluate();
    if (game.dice3d && new_mod.dice) {
      let users = null;
      if (br_card.message.whisper.length > 0) {
        users = br_card.message.whisper;
      }
      await game.dice3d.showForRoll(
        new_mod.dice,
        game.user,
        true,
        users,
        br_card.message.blind,
      );
    }
    br_card.trait_roll.modifiers.push(new_mod);
    await br_card.trait_roll.recalculate_trait_results();
    await br_card.render();
    br_card.save().catch(() => {
      console.error("Error saving a card after adding a modifier");
    });
  }
}

/**
 * Deletes a modifier from a message
 * @param {BrCommonCard} br_card
 * @param {int} index - Index of the modifier to delete.
 */
async function delete_modifier(br_card, index) {
  br_card.trait_roll.modifiers.splice(index, 1);
  await br_card.trait_roll.recalculate_trait_results();
  await br_card.render();
  br_card.save().catch(() => {
    console.error("Error saving a card after deleting a modifier");
  });
}

/**
 * Edits one modifier
 * @param {BrCommonCard} br_card
 * @param {int} index
 * @param {Object} new_modifier
 */
async function edit_modifier(br_card, index, new_modifier) {
  // noinspection JSCheckFunctionSignatures
  // Add float modifier support
  const mod_value = parseFloat(new_modifier.value);
  if (mod_value) {
    br_card.trait_roll.modifiers[index].label = new_modifier.label;
    br_card.trait_roll.modifiers[index].value = mod_value;
    await br_card.trait_roll.recalculate_trait_results();
    await br_card.render();
    br_card.save().catch(() => {
      console.error("Error saving a card after editing a modifier");
    });
  }
}

/**
 * Changes the of one of the rolls.
 *
 * @param {BrCommonCard} br_card
 * @param {int} new_tn
 * @param {string} reason - If it is set the reason will be changed
 */
async function edit_tn(br_card, new_tn, reason) {
  br_card.trait_roll.tn = new_tn;
  if (reason) {
    br_card.trait_roll.tn_reason = reason;
  }
  await br_card.trait_roll.recalculate_trait_results();
  await br_card.render();
  br_card.save().catch(() => {
    console.error("Error saving a card after editing a TN");
  });
}

/**
 * Change the TNs of a roll from a token (targeted or selected)
 *
 * @param {BrCommonCard} br_card
 * @param {int} index
 * @param {boolean} selected - True to select targeted, false for selected
 */
async function get_tn_from_target(br_card, index, selected) {
  let target_token;
  if (selected) {
    canvas.tokens.controlled.forEach((token) => {
      // noinspection JSUnresolvedVariable
      if (token.actor !== br_card.actor) {
        target_token = token;
      }
    });
  } else {
    target_token = get_targeted_token();
  }
  if (target_token) {
    const extra_data = { modifiers: [] };
    const origin_token = br_card.token;
    const target = await get_tn_from_token(
      br_card.skill,
      target_token,
      origin_token,
      br_card.actor,
      br_card.item,
      extra_data,
    );
    if (target.value) {
      await edit_tn(br_card, target.value, target.reason).catch(() => {
        console.error("Error editing TN");
      });
    }
    const tn = { modifiers: [] };
    calculate_distance(origin_token, target_token, br_card.item, tn, br_card.skill, extra_data);
    br_card.trait_roll.delete_range_modifiers();
    br_card.trait_roll.modifiers = br_card.trait_roll.modifiers.concat(
      tn.modifiers,
    );
    await br_card.trait_roll.recalculate_trait_results();
    await br_card.render();
    await br_card.save();
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
  const data = duplicate(message);
  // Remove rolls
  data.timestamp = new Date().getTime();
  delete data._id;
  const new_message = await ChatMessage.create(data);
  const br_card = new BrCommonCard(new_message);
  br_card.trait_roll = new TraitRoll();
  br_card.render_data.damage_rolls = [];
  await br_card.render();
  await br_card.save();
  const action = get_action_from_click(event);
  if (action.includes("dialog")) {
    game.brsw.dialog.show_card(br_card);
  } else if (action.includes("trait")) {
    // noinspection JSUnresolvedVariable
    const br_card = new BrCommonCard(message);
    const card_type = br_card.type;
    if (card_type === BRSW_CONST.TYPE_ATTRIBUTE_CARD) {
      await roll_attribute(br_card, false);
    } else if (card_type === BRSW_CONST.TYPE_SKILL_CARD) {
      await roll_skill(br_card, false);
    } else if (card_type === BRSW_CONST.TYPE_ITEM_CARD) {
      const roll_damage = action.includes("damage");
      await roll_item(br_card, $(br_card.message.content), false, roll_damage);
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
  }
  if (action.rerollSkillMod) {
    //Reroll
    extra_data.reroll_modifier = new TraitModifier(
      action_name,
      action.rerollSkillMod,
    );
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
