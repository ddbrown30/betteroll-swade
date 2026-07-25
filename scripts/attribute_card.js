// Functions for cards representing attributes
/* global TokenDocument, Token, game, CONST, $ */

import { BrCommonCard } from "./BrCommonCard.js";
import { BRSW2_CONST } from "./brsw2-const.js";
import {
  create_common_card,
  getActionFromClick,
  getActorFromIds,
  process_common_actions,
  roll_trait,
  spend_bennie,
  traitToDieString,
} from "./cards_common.js";
import { runMacros } from "./item_card.js";
import { Utils, addEventListenerAll } from "./utils.js";

/**
 * Creates a chat card for an attribute
 *
 * @param {Token, SwadeActor} origin  The actor or token owning the attribute
 * @param {string} name The name of the attribute like 'vigor'
 * @param {object} actions_stored An object with action ids as properties
 *   and a boolean meaning if they need to set on or off
 * @return {Promise} A promise for the BrCommonCard object
 */
async function createAttributeCard(origin, name, { actions_stored = {} } = {},) {
  const actor = Utils.toActor(origin);

  const translatedName = game.i18n.localize(BRSW2_CONST.ATTRIBUTES_TRANSLATION_KEYS[name]);
  const title = translatedName + " " + traitToDieString(actor.system.attributes[name.toLowerCase()]);

  const brCard = create_common_card(
    origin,
    {
      header: { type: game.i18n.localize("BRSW.Attribute"), title: title },
      trait: Utils.traitFromString(actor, translatedName),
    },
    "modules/betterrolls-swade2/templates/attribute_card.hbs",
  );

  brCard.type = BRSW2_CONST.BRSW_CARD_TYPES.TYPE_ATTRIBUTE_CARD;

  await brCard.render(actions_stored);
  return brCard;
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
function createAttributeCardFromId(
  token_id,
  actor_id,
  name,
  { actions_stored = {} } = {},
) {
  const actor = getActorFromIds(token_id, actor_id);
  return createAttributeCard(actor, name, {
    actions_stored: actions_stored,
  });
}

/**
 * Hooks the public functions to a global object
 */
export function exposeAttributeAPI() {
  Utils.exposeAPI("createAttributeCard", createAttributeCard, "create_atribute_card");
  Utils.exposeAPI("createAttributeCardFromId", createAttributeCardFromId, "create_attribute_card_from_id");
  Utils.exposeAPI("rollAttribute", rollAttribute, "roll_attribute");
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
  const brCard = await createAttributeCard(target, attribute_id);
  if (action.includes("dialog")) {
    game.brsw.dialog.show_card(brCard);
  } else if (action.includes("trait")) {
    await rollAttribute(brCard, false);
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
export function activateAttributeCardListeners(card, html) {
  const roll_buttons = html.querySelectorAll(".brsw-roll-button");
  for (const roll_button of roll_buttons) {
    roll_button.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      await rollAttribute(
        card,
        ev.currentTarget.classList.contains("roll-bennie-button"),
      );
    });
  }
}

/**
 * Roll an attribute showing from an existing card
 *
 * @param {BrCommonCard} brCard The card being rolled
 * @param {boolean} expend_bennie True if we want to spend a bennie
 */
export async function rollAttribute(brCard, expend_bennie) {
  const extra_data = { modifiers: [] };
  const macros = [];
  for (const action of brCard.getSelectedActions()) {
    process_common_actions(action.code, extra_data, macros, brCard.actor);
  }
  if (brCard.trait_roll.is_rolled) {
    brCard.trait_roll.reroll_mode = expend_bennie ? "benny" : "free";
  }
  if (expend_bennie) {
    await spend_bennie(brCard.actor);
  }
  await roll_trait(
    brCard,
    brCard.actor.system.attributes[brCard.attribute],
    game.i18n.localize(BRSW2_CONST.ATTRIBUTES_TRANSLATION_KEYS[brCard.attribute]),
    extra_data,
  );
  // noinspection ES6MissingAwait
  runMacros(macros, brCard);
}
