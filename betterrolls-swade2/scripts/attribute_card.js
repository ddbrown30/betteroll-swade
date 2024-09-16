// Functions for cards representing attributes
/* global TokenDocument, Token, game, CONST, $ */

import {
  BRSW_CONST,
  get_action_from_click,
  spend_bennie,
  get_actor_from_ids,
  trait_to_string,
  create_common_card,
  roll_trait,
  process_common_actions,
} from "./cards_common.js";
import { run_macros } from "./item_card.js";
import { get_enabled_gm_actions } from "./gm_modifiers.js";
import { BrCommonCard } from "./BrCommonCard.js";

/**
/ Translation map for attributes
*/

export const ATTRIBUTES_TRANSLATION_KEYS = {
  agility: "SWADE.AttrAgi",
  smarts: "SWADE.AttrSma",
  spirit: "SWADE.AttrSpr",
  strength: "SWADE.AttrStr",
  vigor: "SWADE.AttrVig",
};

/**
 * Creates a chat card for an attribute
 *
 * @param {Token, SwadeActor} origin  The actor or token owning the attribute
 * @param {string} name The name of the attribute like 'vigor'
 * @param {object} actions_stored An object with action ids as properties
 *   and a boolean meaning if they need to set on or off
 * @return {Promise} A promise for the BrCommonCard object
 */
async function create_attribute_card(
  origin,
  name,
  { actions_stored = {} } = {},
) {
  let actor;
  if (origin instanceof TokenDocument || origin instanceof Token) {
    actor = origin.actor;
  } else {
    actor = origin;
  }
  const translated_name = game.i18n.localize(ATTRIBUTES_TRANSLATION_KEYS[name]);
  let title =
    translated_name +
    " " +
    trait_to_string(actor.system.attributes[name.toLowerCase()]);
  let br_message = await create_common_card(
    origin,
    {
      header: { type: game.i18n.localize("BRSW.Attribute"), title: title },
      attribute_name: name,
    },
    "modules/betterrolls-swade2/templates/attribute_card.html",
  );
  // We always set the actor (as a fallback, and the token if possible)
  br_message.attribute_name = name;
  br_message.type = BRSW_CONST.TYPE_ATTRIBUTE_CARD;
  await br_message.render(actions_stored);
  await br_message.save();
  return br_message;
}

/**
 * Creates an attribute card from a token or actor id
 *
 * @param {string} token_id A token id, if it can be solved it will be used
 *  before actor
 * @param {string} actor_id An actor id, it could be set as fallback or
 *  if you keep token empty as the only way to find the actor
 * @param {string} name Name of the attribute to roll, like 'vigor'
 * @param {object} actions_stored An object with action ids as properties
 *   and a boolean meaning if they need to set on or off
 * @return {Promise} a promise fot the ChatMessage object
 */
function create_attribute_card_from_id(
  token_id,
  actor_id,
  name,
  { actions_stored = {} } = {},
) {
  const actor = get_actor_from_ids(token_id, actor_id);
  return create_attribute_card(actor, name, {
    actions_stored: actions_stored,
  });
}

/**
 * Hooks the public functions to a global object
 */
export function attribute_card_hooks() {
  game.brsw.create_atribute_card = create_attribute_card;
  game.brsw.create_attribute_card_from_id = create_attribute_card_from_id;
  game.brsw.roll_attribute = roll_attribute;
}

/**
 * Creates a card after an event.
 * @param ev javascript click event
 * @param {SwadeActor, Token} target token or actor from the char sheet
 */
async function attribute_click_listener(ev, target) {
  const action = get_action_from_click(ev);
  if (action === "system") {
    return;
  }
  ev.stopImmediatePropagation();
  ev.preventDefault();
  ev.stopPropagation();
  // The attribute id placement is sheet dependent.
  const attribute_id = ev.currentTarget.dataset.attribute;
  // Show card
  const br_card = await create_attribute_card(target, attribute_id);
  if (action.includes("dialog")) {
    game.brsw.dialog.show_card(br_card);
  } else if (action.includes("trait")) {
    await roll_attribute(br_card, false);
  }
}

/**
 * Activates the listeners in the character sheet for attribute cards
 * @param app Sheet app
 * @param html Html code
 */
export function activate_attribute_listeners(app, html) {
  let target = app.token || app.object;
  // We need a closure to hold data
  const attribute_labels = html.find(".attribute-value");
  attribute_labels.bindFirst("click", async (ev) => {
    await attribute_click_listener(ev, target);
  });
}

/**
 * Activate the listeners of the attribute card
 * @param {BrCommonCard} card Message date
 * @param html Html produced
 */
export function activate_attribute_card_listeners(card, html) {
  html.find(".brsw-roll-button").click(async (ev) => {
    await roll_attribute(
      card,
      ev.currentTarget.classList.contains("roll-bennie-button"),
    );
  });
}

/**
 * Roll an attribute showing from an existing card
 *
 * @param {BrCommonCard} br_card The card being rolled
 * @param {boolean} expend_bennie True if we want to spend a bennie
 */
export async function roll_attribute(br_card, expend_bennie) {
  let extra_data = { modifiers: [] };
  let macros = [];
  for (let action of br_card.get_selected_actions()) {
    process_common_actions(action.code, extra_data, macros, br_card.actor);
  }
  for (let action of get_enabled_gm_actions()) {
    process_common_actions(action, extra_data, macros, br_card.actor);
  }
  if (expend_bennie) {
    await spend_bennie(br_card.actor);
  }
  await roll_trait(
    br_card,
    br_card.actor.system.attributes[br_card.attribute_name],
    game.i18n.localize("BRSW.AbilityDie"),
    extra_data,
  );
  // noinspection ES6MissingAwait
  run_macros(macros, br_card.actor, null, br_card);
}
