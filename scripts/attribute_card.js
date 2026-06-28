// Functions for cards representing attributes
/* global TokenDocument, Token, game, CONST, $ */

import { BrCommonCard } from "./BrCommonCard.js";
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
import { addEventListenerAll } from "./utils.js";

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
  if (
    origin instanceof TokenDocument ||
    origin instanceof foundry.canvas.placeables.Token
  ) {
    actor = origin.actor;
  } else {
    actor = origin;
  }
  const translated_name = game.i18n.localize(BRSW2_CONST.ATTRIBUTES_TRANSLATION_KEYS[name]);
  const title =
    translated_name +
    " " +
    trait_to_string(actor.system.attributes[name.toLowerCase()]);
  const br_message = create_common_card(
    origin,
    {
      header: { type: game.i18n.localize("BRSW.Attribute"), title: title },
      attribute_name: name,
    },
    "modules/betterrolls-swade2/templates/attribute_card.hbs",
  );
  // We always set the actor (as a fallback, and the token if possible)
  br_message.attribute_name = name;
  br_message.type = BRSW2_CONST.BRSW_CARD_TYPES.TYPE_ATTRIBUTE_CARD;
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
 * @return {Promise} a promise for the ChatMessage object
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
  const action = getActionFromClick(ev);
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
  const target = app.token || app.actor || app.object;
  addEventListenerAll(html, ".attribute-value", "click", async (ev) => {
    await attribute_click_listener(ev, target);
  }, true);
}

/**
 * Activate the listeners of the attribute card
 * @param {BrCommonCard} card Message date
 * @param html Html produced
 */
export function activate_attribute_card_listeners(card, html) {
  const roll_buttons = html.querySelectorAll(".brsw-roll-button");
  for (const roll_button of roll_buttons) {
    roll_button.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      await roll_attribute(
        card,
        ev.currentTarget.classList.contains("roll-bennie-button"),
      );
    });
  }
}

/**
 * Roll an attribute showing from an existing card
 *
 * @param {BrCommonCard} br_card The card being rolled
 * @param {boolean} expend_bennie True if we want to spend a bennie
 */
export async function roll_attribute(br_card, expend_bennie) {
  const extra_data = { modifiers: [] };
  const macros = [];
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
    br_card.actor.system.attributes[br_card.attribute_name],
    game.i18n.localize("BRSW.AbilityDie"),
    extra_data,
  );
  // noinspection ES6MissingAwait
  runMacros(macros, br_card.actor, null, br_card);
}
