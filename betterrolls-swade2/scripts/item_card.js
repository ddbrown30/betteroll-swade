// Functions for cards representing all items but skills
/* globals Token, TokenDocument, game, CONST, canvas, console, CONFIG, ChatMessage, ui, Hooks, Dialog, Roll, succ, structuredClone, $, fromUuid */
// noinspection JSCheckFunctionSignatures

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
} from "./cards_common.js";
import {
  FIGHTING_SKILLS,
  is_shooting_skill,
  SHOOTING_SKILLS,
  THROWING_SKILLS,
} from "./skill_card.js";
import {
  SettingsUtils,
  get_targeted_token,
  makeExplotable,
  set_or_update_condition,
  simple_form,
  broofa,
} from "./utils.js";
import { create_damage_card } from "./damage_card.js";
import { ATTRIBUTES_TRANSLATION_KEYS } from "./attribute_card.js";
import { get_enabled_gm_actions, get_gm_modifiers } from "./gm_modifiers.js";
import { BrCommonCard } from "./BrCommonCard.js";
import { DamageModifier, TraitModifier } from "./modifiers.js";
import { brAction } from "./actions.js";

const ARCANE_SKILLS = [
  "faith",
  "focus",
  "spellcasting",
  `glaube`,
  "fokus",
  "zaubern",
  "druidism",
  "elementalism",
  "glamour",
  "heahwisardry",
  "hrimwisardry",
  "solar magic",
  "song magic",
  "soul binding",
  "artificer",
  "astrology",
  "dervish",
  "divination",
  "jinn binding",
  "khem-hekau",
  "mathemagic",
  "sand magic",
  "sha'ir",
  "ship magic",
  "ushabti",
  "wizir magic",
  "word magic",
  "druidenmagie",
  "elementarmagie",
  "heahmagie",
  "hrimmagie",
  "gesangsmagie",
  "psiónica",
  "psionica",
  "fe",
  "hechicería",
  "hechiceria",
  "foi",
  "magie",
  "science étrange",
  "science etrange",
  "élémentalisme",
  "elementalisme",
  "druidisme",
  "magie solaire",
  "weird science",
  "voidomancy",
];
const UNTRAINED_SKILLS = [
  "untrained",
  "untrainiert",
  "desentrenada",
  "non entraine",
  "non entrainé",
  "unskilled",
  "unskilled attempt",
  "(unskilled)",
];

const ATTRIBUTES = ["agility", "smarts", "spirit", "strength", "vigor"];

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
async function create_item_card(origin, item_id, { actions_stored = {} } = {}) {
  let actor;
  if (origin instanceof TokenDocument || origin instanceof Token) {
    actor = origin.actor;
  } else {
    actor = origin;
  }
  const item = actor.items.find((item) => {
    return item.id === item_id;
  });
  if (item.type === "consumable") {
    // Show the system card
    item.show();
    return;
  }
  if (
    item.type === "action" &&
    SettingsUtils.getWorldSetting("disable_for_actions")
  ) {
    // Disable actions
    item.show();
    return;
  }
  const trait = get_item_trait(item, actor);
  let notes = "";
  if (item.system.notes && item.system.notes.length < 50) {
    notes = item.system.notes;
  }
  let { description, damage } = item.system;
  description =
    description.length <= SettingsUtils.getWorldSetting("max_tooltip_length")
      ? description
      : "";
  if (item.type === "weapon") {
    description = `<p>${game.i18n.localize("BRSW.Dmg")}: ${
      item.system.damage
    } ${game.i18n.localize("BRSW.ApShort")}: ${
      item.system.ap
    } ${game.i18n.localize("BRSW.Shots")}: ${item.system.currentShots}/${
      item.system.shots
    }</p>${description}`;
  }
  let possible_default_dmg_action;
  let ammon_enabled = parseInt(item.system.shots) || item.system.ammo;
  let power_points =
    !isNaN(parseFloat(item.system.pp)) || item.type === "power";
  const subtract_select = ammon_enabled
    ? SettingsUtils.getWorldSetting("default-ammo-management")
    : false;
  const subtract_pp_select = power_points
    ? SettingsUtils.getWorldSetting("default-pp-management")
    : false;
  if (!damage && item.system.actions) {
    for (let action in item.system.actions.additional) {
      const current_action = item.system.actions.additional[action];
      if (current_action.type === "damage" && current_action.override) {
        damage = true;
        break;
      }
    }
  }
  if (!damage && possible_default_dmg_action) {
    damage = possible_default_dmg_action;
  }
  let br_message = await create_common_card(
    origin,
    {
      header: { type: "Item", title: item.name, img: item.img },
      notes: notes,
      trait_id: trait ? trait.id || trait : false,
      ammo: ammon_enabled,
      subtract_selected: subtract_select,
      subtract_pp: subtract_pp_select,
      damage_rolls: [],
      powerpoints: power_points,
      used_shots: 0,
      description: description,
      swade_templates: get_template_from_item(item),
    },
    "modules/betterrolls-swade2/templates/item_card.html",
  );
  br_message.type = BRSW_CONST.TYPE_ITEM_CARD;
  br_message.damage = damage;
  br_message.item_id = item_id;
  await br_message.render(actions_stored);
  await br_message.save();
  // For the moment, assume that no roll is made if there is no skill. Hopefully, in the future, there'll be a better way.
  if (
    (item.type === "gear" && item.system.actions.trait === "") ||
    item.system.actions?.trait.toLowerCase() === "none" ||
    (item.system.hasOwnProperty("actions") === false && item.type !== "skill")
  ) {
    Hooks.call("BRSW-CreateItemCardNoRoll", br_message);
  }
  return br_message;
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
    let token = canvas.tokens.get(token_id);
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
}

/**
 * Listens to click events on character sheets
 * @param ev javascript click event
 * @param {SwadeActor, Token} target token or actor from the char sheet
 */
async function item_click_listener(ev, target) {
  const action = get_action_from_click(ev);
  if (action === "system") {
    return;
  }
  ev.stopImmediatePropagation();
  ev.preventDefault();
  ev.stopPropagation();
  // First term for PC, second one for NPCs
  const item_id =
    ev.currentTarget.parentElement.dataset.itemId ||
    ev.currentTarget.parentElement.parentElement.dataset.itemId ||
    ev.currentTarget.parentElement.parentElement.parentElement.dataset.itemId ||
    ev.currentTarget.parentElement.parentElement.parentElement.parentElement
      .dataset.itemId;
  // Show card
  let br_card = await create_item_card(target, item_id);
  if (action.includes("dialog")) {
    game.brsw.dialog.show_card(br_card);
  } else if (action.includes("trait")) {
    await roll_item(br_card, "", false, action.includes("damage"));
  }
  // Shortcut for rolling damage
  if (ev.currentTarget.classList.contains("damage-roll")) {
    await roll_dmg(br_card, $(br_card.message.content), false, false);
  }
}

/**
 * Overrides the default dragstart handle to allow itemIds in another part
 * of the tag chain
 * @param ev
 */
function drag_start_handle(ev) {
  if (!ev.currentTarget.dataset.itemId) {
    ev.currentTarget.dataset.itemId =
      ev.currentTarget.parentElement.dataset.itemId ||
      ev.currentTarget.parentElement.parentElement.dataset.itemId ||
      ev.currentTarget.parentElement.parentElement.parentElement.dataset.itemId;
  }
  ev.data.app._onDragStart(ev.originalEvent);
}

/**
 * Activates the listeners in the character sheet in items
 * @param app Sheet app
 * @param html Html code
 */
export function activate_item_listeners(app, html) {
  let target = app.token || app.object;
  const item_images = html.find(
    ".item-image, .item-img, .name.item-show, span.item>.item-control.item-edit," +
      " .gear-card .card-header>.item-name, .damage-roll, .item-name>h4," +
      " .power-header>.item-name, .card-button, .item-control.item-show," +
      " .power button.item-show, .weapon button.item-show, .edge-hindrance>.item-control" +
      " .item-control.item-edit, .item-control.item-show, .item.edge-hindrance>.item-show",
  );
  item_images.bindFirst("click", async (ev) => {
    await item_click_listener(ev, target);
  });
  let item_li = html.find(
    ".gear-card.item, .item.flexrow, .power.item, .weapon.item",
  );
  item_li.attr("draggable", "true");
  item_li.off("dragstart");
  item_li.bind("dragstart", { app: app }, drag_start_handle);
}

/**
 * Creates a template preview
 * @param ev javascript click event
 * @param {BrCommonCard} br_card
 */
function preview_template(ev, br_card) {
  let templateData = {
    user: game.user.id,
    distance: 0,
    direction: 0,
    x: 0,
    y: 0,
    fillColor: game.user.color,
  };
  const type = ev.currentTarget.dataset.size;
  if (type === "cone") {
    templateData.t = "cone";
    templateData.distance = 9;
  } else if (type === "stream") {
    templateData.t = "ray";
    templateData.distance = 12;
    templateData.width = 1;
  } else {
    templateData.t = "circle";
    templateData.distance = type === "sbt" ? 1 : type === "mbt" ? 2 : 3;
  }
  // Adjust to grid distance
  if (canvas.grid.distance % 5 === 0) {
    templateData.distance *= 5;
  }
  // noinspection JSPotentiallyInvalidConstructorUsage
  const template_base = new CONFIG.MeasuredTemplate.documentClass(
    templateData,
    { parent: canvas.scene },
  );
  // noinspection JSPotentiallyInvalidConstructorUsage
  CONFIG.MeasuredTemplate.objectClass.fromPreset(type);
  Hooks.call("BRSW-BeforePreviewingTemplate", CONFIG.SWADE.activeMeasuredTemplatePreview, br_card, ev);
}

/**
 * Activate the listeners in the item card
 * @param {BrCommonCard} br_card
 * @param html Html produced
 */
export function activate_item_card_listeners(br_card, html) {
  const { actor, item } = br_card;
  html.find(".brsw-header-img").click((_) => {
    item.sheet.render(true);
  });
  html.find(".brsw-roll-button").click(async (ev) => {
    await roll_item(
      br_card,
      html,
      ev.currentTarget.classList.contains("roll-bennie-button"),
    );
  });
  html.find(".brsw-damage-button, .brsw-damage-bennie-button").click((ev) => {
    // noinspection JSIgnoredPromiseFromCall
    roll_dmg(
      br_card,
      html,
      ev.currentTarget.classList.contains("brsw-damage-bennie-button"),
      {},
      ev.currentTarget.id.includes("raise"),
      ev.currentTarget.dataset.token,
    );
  });
  html.find(".brsw-ammo-manual").click(() => {
    item.reload();
  });
  html.find(".brsw-pp-manual").click(() => {
    manual_pp(actor, item).catch(() => {
      console.error("Error in manual PP management");
    });
  });
  html.find(".brsw-apply-damage").click((ev) => {
    create_damage_card(
      ev.currentTarget.dataset.token,
      ev.currentTarget.dataset.damage,
      `${actor.name} - ${item.name}`,
      ev.currentTarget.dataset.heavyDamage,
    ).then();
  });
  html.find(".brsw-target-tough").click((ev) => {
    // noinspection JSIgnoredPromiseFromCall
    edit_toughness(br_card, ev.currentTarget.dataset.index);
  });
  html.find(".brsw-add-damage-d6").click((ev) => {
    // noinspection JSIgnoredPromiseFromCall
    add_damage_dice(br_card, ev.currentTarget.dataset.index);
  });
  html.find(".brsw-half-damage").click((ev) => {
    // noinspection JSIgnoredPromiseFromCall
    half_damage(br_card, ev.currentTarget.dataset.index);
  });
  html
    .find(".brsw-add-damage-number")
    .bind("click", { message: br_card.message }, show_fixed_damage_dialog);
  html.find(".brsw-template-button").on("click", (ev) => {
    preview_template(ev, br_card);
  });
  html.find("#roll-damage").on("dragstart", (ev) => {
    ev.originalEvent.dataTransfer.setData(
      "text/plain",
      JSON.stringify({
        type: "target_click",
        tag_id: "roll-damage",
        message_id: br_card.message.id,
      }),
    );
  });
  html.find("#roll-raise-damage").on("dragstart", (ev) => {
    ev.originalEvent.dataTransfer.setData(
      "text/plain",
      JSON.stringify({
        type: "target_click",
        tag_id: "roll-raise-damage",
        message_id: br_card.message.id,
      }),
    );
  });
  html.find(".brsw-ammo-toggle").click((ev) => {
    ev.currentTarget.classList.toggle("twbr-bg-red-700");
    ev.currentTarget.classList.toggle("twbr-bg-gray-500");
  });
  html.find(".brsw-pp-toggle").click((ev) => {
    ev.currentTarget.classList.toggle("twbr-bg-red-700");
    ev.currentTarget.classList.toggle("twbr-bg-gray-500");
  });
  html.find(".brsw-macro-button").click((ev) => {
    const action =
      br_card.item.system.actions.additional[ev.currentTarget.dataset.macro];
    execute_macro(action, br_card).catch((err) => {
      console.error("Error in macro", err);
    });
  });
  html.find(".brsw-resist-button").click((ev) => {
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
  for (let token of canvas.tokens.controlled) {
    const trait_lower = trait.toLowerCase();
    let new_card;
    if (ATTRIBUTES.includes(trait_lower)) {
      new_card = await game.brsw.create_atribute_card(
        token,
        trait.toLowerCase(),
      );
    } else {
      new_card = await game.brsw.create_skill_card(
        token,
        trait_from_string(token.actor, trait).id,
      );
    }
    new_card.trait_roll.tn = get_trait_roll_difficulty(br_card);
    new_card.trait_roll.tn_reason = game.i18n.localize("BRSW.ResistingRoll");
    if (!isNaN(trait_mod)) {
      const localiced_name = game.i18n.localize("BRSW.ResistingRoll");
      const resist_action = new brAction(localiced_name, {
        id: broofa(),
        button_name: localiced_name,
        skillMod: trait_mod,
      });
      resist_action.selected = true;
      new_card.action_groups.resist_button = {
        defaultChecked: "on",
        name: localiced_name,
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

/**
 * Guess the skill/attribute that should be rolled for an item
 * @param {Item} item The item.
 * @param {string} item.system.arcane
 * @param {Object} item.data
 * @param {Object} item.system.actions
 * @param {string} item.system.range
 * @param {SwadeActor} actor The owner of the iem
 */
export function get_item_trait(item, actor) {
  // First, if the item has a skill in actions tab, we use it
  if (item.system.actions && item.system.actions.trait) {
    return trait_from_string(actor, item.system.actions.trait);
  }
  // Now check for a skill in additional actions.
  if (item.system.actions) {
    for (let action in item.system.actions.additional) {
      if (
        item.system.actions.additional[action].type === "trait" &&
        item.system.actions.additional[action].name
      ) {
        return trait_from_string(
          actor,
          item.system.actions.additional[action].name,
        );
      }
    }
  }
  // Some types of items don't have an associated skill
  if (
    ["armor", "shield", "gear", "edge", "hindrance"].includes(
      item.type.toLowerCase(),
    )
  ) {
    return;
  }
  // Now check if there is something in the Arcane field
  if (item.system.arcane) {
    return trait_from_string(actor, item.system.arcane);
  }
  // If there is no skill anyway, we are left to guessing
  let skill;
  if (item.type === "power") {
    skill = check_skill_in_actor(actor, ARCANE_SKILLS);
  } else if (item.type === "weapon") {
    if (parseInt(item.system.range) > 0) {
      // noinspection JSUnresolvedVariable
      if (item.system.damage.includes("str")) {
        skill = check_skill_in_actor(actor, THROWING_SKILLS);
      } else {
        skill = check_skill_in_actor(actor, SHOOTING_SKILLS);
      }
    } else {
      skill = check_skill_in_actor(actor, FIGHTING_SKILLS);
    }
  }
  if (skill === undefined) {
    skill =
      check_skill_in_actor(actor, UNTRAINED_SKILLS) ||
      check_skill_in_actor(
        actor,
        game.i18n.localize("BRSW.SkillName-untrained"),
      );
  }
  return skill;
}

/**
 * Get a skill or attribute from an actor and the skill name
 * @param {SwadeActor} actor Where search for the skill
 * @param {Object} actor.data
 * @param {Array} actor.items
 * @param {string} trait_name
 */
export function trait_from_string(actor, trait_name) {
  let skill = actor.items.find((skill) => {
    return (
      skill.name.toLowerCase().replace("★ ", "") ===
        trait_name.toLowerCase().replace("★ ", "") && skill.type === "skill"
    );
  });
  if (!skill) {
    // Time to check for an attribute
    for (let attribute of ATTRIBUTES) {
      const translation = game.i18n.localize(
        ATTRIBUTES_TRANSLATION_KEYS[attribute],
      );
      if (trait_name.toLowerCase() === translation.toLowerCase()) {
        skill = { system: structuredClone(actor.system.attributes[attribute]) };
        skill.name = translation;
      }
    }
  }
  if (!skill) {
    // No skill was found, we try to find untrained
    skill = check_skill_in_actor(actor, UNTRAINED_SKILLS);
  }
  return skill;
}

/**
 * Check if an actor has a skill in a list
 * @param {SwadeActor} actor
 * @param {Object} actor.items
 * @param {[string]} possible_skills List of skills to check
 * @return {Item} found skill or undefined
 */
function check_skill_in_actor(actor, possible_skills) {
  let skill_found;
  actor.items.forEach((skill) => {
    if (
      possible_skills.some((v) => skill.name.toLowerCase().includes(v)) &&
      skill.type === "skill"
    ) {
      skill_found = skill;
    }
  });
  return skill_found;
}

async function displayRemainingCard(content) {
  const show_card = SettingsUtils.getWorldSetting("remaining_card_behaviour");
  if (show_card !== "none") {
    let chat_data = { content: content };
    if (show_card === "master_and_gm") {
      chat_data.whisper = [ChatMessage.getWhisperRecipients("GM")[0]];
    }
    if (show_card === "master_only") {
      chat_data.whisper = [""];
    }
    await ChatMessage.create(chat_data);
  }
}

/**
 * Discount pps from an actor © Javier or Arcane Device © Salieri
 *
 * @param {BrCommonCard} br_card
 * @param pp_override
 * @param old_pp PPs expended in the current selected roll of this option
 * @param pp_modifier A number to be added or subtracted from PPs
 */
export async function discount_pp(br_card, pp_override, old_pp, pp_modifier) {
  if (
    SettingsUtils.getSetting("optional_rules_enabled").indexOf(
      "InnatePowersDontConsume",
    ) > -1 &&
    br_card.item.system.innate
  ) {
    return 0;
  }
  let success = false;
  for (let roll of br_card.trait_roll.current_roll.dice) {
    if (roll.result !== null && roll.result >= 0) {
      success = true;
    }
  }
  let base_pp_expended = pp_override
    ? parseInt(pp_override)
    : parseInt(br_card.item.system.pp);
  base_pp_expended += pp_modifier;
  const pp = success ? base_pp_expended : 1;
  br_card.render_data.used_pp = pp;
  await br_card.save();
  let current_pp;
  // If devicePP is found, it will be treated as an Arcane Device:
  let arcaneDevice = false;
  if (br_card.item.system.additionalStats.devicePP) {
    // Get the devices PP:
    current_pp = br_card.item.system.additionalStats.devicePP.value;
    arcaneDevice = true;
  } else if (
    br_card.actor.system.powerPoints.hasOwnProperty(
      br_card.item.system.arcane,
    ) &&
    br_card.actor.system.powerPoints[br_card.item.system.arcane].max
  ) {
    // Specific power points
    current_pp =
      br_card.actor.system.powerPoints[br_card.item.system.arcane].value;
  } else {
    // General pool
    current_pp = br_card.actor.system.powerPoints.general.value;
  }
  const final_pp = Math.max(current_pp - pp + old_pp, 0);
  let content = game.i18n.format("BRSW.ExpendedPoints", {
    name: br_card.actor.name,
    final_pp: final_pp,
    pp: pp,
  });
  if (current_pp < pp) {
    const message_text = game.i18n.localize("BRSW.NotEnoughPP");
    content = `<p class="brsw-fumble-row">${message_text}</p> ${content}`;
    ui.notifications.warn(message_text);
  }
  let data = {};
  if (arcaneDevice === true) {
    const updates = [
      {
        _id: br_card.item.id,
        "system.additionalStats.devicePP.value": `${final_pp}`,
      },
    ];
    // Updating the Arcane Device:
    br_card.actor.updateEmbeddedDocuments("Item", updates);
  } else if (
    br_card.actor.system.powerPoints.hasOwnProperty(
      br_card.item.system.arcane,
    ) &&
    br_card.actor.system.powerPoints[br_card.item.system.arcane].max
  ) {
    data["system.powerPoints." + br_card.item.system.arcane + ".value"] =
      final_pp;
  } else {
    data["system.powerPoints.general.value"] = final_pp;
  }
  if (arcaneDevice === false) {
    await br_card.actor.update(data);
  }
  if (pp !== old_pp) {
    await displayRemainingCard(content);
  }
  return pp;
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
    for (let macro_name of macros) {
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
    // Try Uuuid
    macro = await fromUuid(macro_name_or_id);
  }
  if (!macro) {
    // Search compendiums
    for (let compendium of game.packs.contents) {
      if (compendium.documentClass.documentName === "Macro") {
        let possible_macro =
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
  let macros = [];
  let shots_override; // Override the number of shots used
  let shots_modifier = 0; // Modifier to the number of shots
  let extra_data = { modifiers: [] };
  if (expend_bennie) {
    await spend_bennie(br_message.actor);
  }
  extra_data.rof = br_message.item.system.rof || 1;
  if (SettingsUtils.getUserSetting("default_rate_of_fire") === "single_shot") {
    extra_data.rof = 1;
  }
  // Actions
  for (let action of br_message.get_selected_actions()) {
    if (action.code.skillOverride) {
      let trait = trait_from_string(
        br_message.actor,
        action.code.skillOverride,
      );
      br_message.skill_id = trait.id;
    }
    if (action.code.shotsUsed || action.code.resourcesUsed) {
      let shots_used = action.code.shotsUsed || action.code.resourcesUsed;
      let first_char = "";
      try {
        first_char = shots_used.charAt(0);
      } catch {}
      if (first_char === "+" || first_char === "-") {
        // If we are using PP and the modifier starts with + or -
        // we use it as a relative number.
        if (parseInt(br_message.item.system.pp)) {
          shots_modifier += parseInt(shots_used);
        }
      } else {
        shots_override = parseInt(shots_used);
      }
    }
    process_common_actions(action.code, extra_data, macros, br_message.actor);
  }
  for (let action of get_enabled_gm_actions()) {
    process_common_actions(action, extra_data, macros, br_message.actor);
  }
  // Check for minimum strength
  if (
    br_message.item.system.minStr &&
    is_shooting_skill(get_item_trait(br_message.item, br_message.actor))
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
          game.i18n.localize("BRSW.EdgeName-Ambidextrous").toLowerCase(),
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
    for (let modifier of br_message.actor.system.stats.globalMods.attack) {
      extra_data.modifiers.push(
        new TraitModifier(modifier.label, modifier.value),
      );
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
      ? html.find(".twbr-bg-red-700.brsw-ammo-toggle").length
      : SettingsUtils.getWorldSetting("default-ammo-management");
    if (dis_ammo_selected || macros) {
      br_message.render_data.used_shots =
        shots_override || ROF_BULLETS[br_message.trait_roll.rof || 1];
      if (dis_ammo_selected && br_message.trait_roll.rolls.length === 1) {
        await br_message.item.consume(br_message.render_data.used_shots);
      }
    }
  }
  // Power points management
  const pp_selected = html
    ? html.find(".twbr-bg-red-700.brsw-pp-toggle").length
    : SettingsUtils.getWorldSetting("default-pp-management");
  let previous_pp = br_message.trait_roll.old_rolls.length
    ? br_message.render_data.used_pp
    : 0;
  if (
    (!isNaN(parseInt(br_message.item.system.pp)) ||
      br_message.item.type === "power") &&
    pp_selected
  ) {
    br_message.render_data.used_pp = await discount_pp(
      br_message,
      shots_override,
      previous_pp,
      shots_modifier,
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
  let objetive = target || get_targeted_token();
  if (!objetive) {
    canvas.tokens.controlled.forEach((token) => {
      // noinspection JSUnresolvedVariable
      if (token.actor !== acting_actor) {
        objetive = token;
      }
    });
  }
  let defense_values = {
    toughness: 4,
    armor: 0,
    name: game.i18n.localize("BRSW.Default"),
  };
  if (objetive && objetive.actor) {
    if (objetive.actor.type !== "vehicle") {
      defense_values.toughness = objetive.actor.system.stats.toughness.value;
      defense_values.armor =
        parseInt(objetive.actor.armorPerLocation[location]) ||
        objetive.actor.system.stats.toughness.armor ||
        0;
      defense_values.name = objetive.name;
      defense_values.token_id = objetive.id;
    } else {
      defense_values.toughness = parseInt(
        objetive.actor.system.toughness.total,
      );
      defense_values.armor = parseInt(objetive.actor.system.toughness.armor);
      defense_values.name = objetive.name;
      defense_values.token_id = objetive.id;
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
  for (let piece of roll_formula.split("d")) {
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
  let current_damage_roll = JSON.parse(JSON.stringify(damage_roll));
  // @zk-sn: If strength is 1, make @str not explode: fix for #211 (Str 1 can't be rolled)
  let shortcuts = actor.getRollData();
  if (shortcuts.str === "1d1x[Strength]") {
    shortcuts.str = "1d1[Strength]";
  }
  if (!damage_formulas.explodes) {
    for (let key of ["sma", "spi", "str", "agi", "vig"]) {
      shortcuts[key] = shortcuts[key].replace("x", "");
    }
  }
  let roll = new Roll(
    damage_formulas.damage + damage_formulas.raise,
    shortcuts,
  );
  await roll.evaluate();
  // Heavy armor
  if (target && !item.system.isHeavyWeapon && has_heavy_armor(target)) {
    const no_damage_mod = new DamageModifier(
      game.i18n.localize("BRSW.HeavyArmor"),
      -999999,
    );
    current_damage_roll.brswroll.modifiers.push(no_damage_mod);
    total_modifiers += -999999;
  }
  // Multiply modifiers must be last
  if (damage_formulas.multiplier !== 1) {
    const final_value = (roll.total + total_modifiers) * 2;
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
  for (let term of roll.terms) {
    if (term.hasOwnProperty("_faces")) {
      let new_die = {
        faces: term._faces,
        results: [],
        extra_class: "",
        label: game.i18n.localize("SWADE.Dmg") + ` (d${term._faces})`,
      };
      for (let result of term.results) {
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
        let modifier_value = parseInt(last_string_term + term.number);
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
  // Dice so nice
  if (game.dice3d) {
    // Dice buried in modifiers.
    let users = null;
    if (message.whisper.length > 0) {
      users = message.whisper;
    }
    for (let modifier of damage_roll.brswroll.modifiers) {
      if (modifier.dice) {
        // noinspection ES6MissingAwait
        game.dice3d.showForRoll(
          modifier.dice,
          game.user,
          true,
          users,
          message.blind,
        );
      }
    }
    let damage_theme = SettingsUtils.getUserSetting("damageDieTheme");
    if (damage_theme !== "None") {
      for (let die of roll.dice) {
        die.options.colorset = damage_theme;
      }
    }
    // noinspection ES6MissingAwait
    await game.dice3d.showForRoll(roll, game.user, true, users, message.blind);
  }
  current_damage_roll.damage_result = await calculate_damage_results(
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
  // GM Modifiers
  const gm_modifier = get_gm_modifiers();
  if (gm_modifier) {
    damage_roll.brswroll.modifiers.push(
      new DamageModifier(game.i18n.localize("BRSW.GMModifier"), gm_modifier),
    );
  }
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
    !is_shooting_skill(get_item_trait(item, actor)) &&
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
  let token_id = br_card.token?.id;
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
  for (let action of br_card.get_selected_actions()) {
    if (action.code.isHeavyWeapon) {
      damage_formulas.heavy_weapon = true;
    }
    if (action.code.dmgMod) {
      let action_name = action.code.name.includes("BRSW.")
        ? game.i18n.localize(action.code.name)
        : action.code.name;
      const new_modifier = new DamageModifier(action_name, action.code.dmgMod);
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
    if (action.code.rerollDamageMod && expend_bennie) {
      damage_roll.brswroll.modifiers.push(
        new DamageModifier(action.code.name, action.code.rerollDamageMod),
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
  let damage_formulas = {
    damage: item.system.damage,
    raise: `+${number_raise_dice}d${raise_die_size}x`,
    ap: parseInt(item.system.ap),
    multiplier: 1,
    explodes: true,
    heavy_weapon: false,
    location: "torso",
  };
  let macros = [];
  if (expend_bennie) {
    await spend_bennie(actor);
  }
  // Calculate modifiers
  let options = get_roll_options(default_options);
  // Shotgun
  if (damage_formulas.damage === "1-3d6" && item.type === "weapon") {
    // Bet that this is a shotgun
    damage_formulas.damage = "3d6";
  }
  let damage_roll = { label: "---", brswroll: new BRWSRoll(), raise: raise };
  get_chat_dmg_modifiers(options, damage_roll);
  joker_modifiers(br_card, damage_roll);
  // Item properties tab
  if (item.system.actions.dmgMod) {
    const new_modifier = new DamageModifier(
      game.i18n.localize("BRSW.ItemPropertiesDmgMod"),
      item.system.actions.dmgMod,
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
    damage_formulas.damage = "1";
  }
  //Conviction
  const conviction_modifier = await check_and_roll_conviction(actor);
  if (conviction_modifier) {
    damage_roll.brswroll.modifiers.push(conviction_modifier);
  }
  // System reroll mod
  if (expend_bennie && actor.system.stats.globalMods.bennyDamage.length) {
    for (const modifier of actor.system.stats.globalMods.bennyDamage) {
      damage_roll.brswroll.modifiers.push(
        new DamageModifier(modifier.label, modifier.value),
      );
    }
  }
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
  let total_modifiers = 0;
  for (let modifier of damage_roll.brswroll.modifiers) {
    total_modifiers += modifier.value;
  }
  let first_roll = true;
  for (let target of targets) {
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

/**
 * Return an array of actors from a token id or targeted tokens
 * @param {string} token_id
 * @param {BrCommonCard} br_card
 */
async function get_dmg_targets(token_id, br_card) {
  if (token_id) {
    let token = canvas.tokens.get(token_id);
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
  let render_data = br_card.message.getFlag(
    "betterrolls-swade2",
    "render_data",
  );
  let damage_rolls = render_data.damage_rolls[index].brswroll;
  let roll = new Roll("1d6x");
  await roll.evaluate();
  damage_rolls.rolls[0].result += roll.total;
  roll.terms.forEach((term) => {
    let new_die = {
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
  render_data.damage_rolls[index].damage_result =
    await calculate_damage_results(damage_rolls.rolls);
  if (game.dice3d) {
    let damage_theme = SettingsUtils.getUserSetting("damageDieTheme");
    if (damage_theme !== "None") {
      roll.dice.forEach((die) => {
        die.options.colorset = damage_theme;
      });
    }
    let users = null;
    if (br_card.message.whisper.length > 0) {
      users = br_card.message.whisper;
    }
    // noinspection ES6MissingAwait,JSIgnoredPromiseFromCall
    game.dice3d.showForRoll(roll, game.user, true, users);
  }
  // noinspection JSIgnoredPromiseFromCall
  await update_message(br_card, render_data);
}

async function show_fixed_damage_dialog(event) {
  // noinspection AnonymousFunctionJS
  simple_form(
    game.i18n.localize("BRSW.EditModifier"),
    [
      { label: "Label", default_value: "Mod" },
      { label: "Value", default_value: 0 },
    ],
    (values) => {
      add_fixed_damage(event, values);
    },
  );
}

/**
 * Adds a fixed amount of damage to a roll
 * @param event
 * @param form_results
 */
async function add_fixed_damage(event, form_results) {
  const modifier = parseInt(form_results.Value);
  if (!modifier) {
    return;
  }
  const { index } = event.currentTarget.dataset;
  let render_data = event.data.message.getFlag(
    "betterrolls-swade2",
    "render_data",
  );
  let damage_rolls = render_data.damage_rolls[index].brswroll;
  damage_rolls.modifiers.push({ value: modifier, name: form_results.Label });
  damage_rolls.rolls[0].result += modifier;
  render_data.damage_rolls[index].damage_result =
    await calculate_damage_results(damage_rolls.rolls);
  await update_message(event.data.message, render_data);
}

/**
 * Change damage to half
 * @param {BrCommonCard} br_card
 * @param {number} index
 */
async function half_damage(br_card, index) {
  let render_data = br_card.message.getFlag(
    "betterrolls-swade2",
    "render_data",
  );
  let damage_rolls = render_data.damage_rolls[index].brswroll;
  const half_damage = -Math.round(damage_rolls.rolls[0].result / 2);
  damage_rolls.modifiers.push({
    value: half_damage,
    name: game.i18n.localize("BRSW.HalfDamage"),
  });
  damage_rolls.rolls[0].result += half_damage;
  render_data.damage_rolls[index].damage_result =
    await calculate_damage_results(damage_rolls.rolls);
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
  let damage_rolls = render_data.damage_rolls[index].brswroll.rolls;
  damage_rolls[0].tn = defense_values.toughness;
  damage_rolls[0].armor = defense_values.armor;
  damage_rolls[0].target_id = defense_values.token_id || 0;
  render_data.damage_rolls[index].label = defense_values.name;
  render_data.damage_rolls[index].damage_result =
    await calculate_damage_results(damage_rolls);
  // noinspection JSIgnoredPromiseFromCall
  await update_message(br_card, render_data);
}

/**
 * Expends power points, called when the first button in the dialog is clicked.
 * @param {Number} number Number ot power points to remove
 * @param {string} mode 'reload' to recharge pp
 * @param {SwadeActor} actor The actor that casts the power
 * @param {Item} item The power itself
 */
function modify_power_points(number, mode, actor, item) {
  const arcaneDevice = item.system.additionalStats.devicePP;
  let ppv = arcaneDevice
    ? item.system.additionalStats.devicePP.value
    : actor.system.powerPoints.general.value;
  let ppm = arcaneDevice
    ? item.system.additionalStats.devicePP.max
    : actor.system.powerPoints.general.max;
  let otherArcane = false;
  if (
    actor.system.powerPoints.hasOwnProperty(item.system.arcane) &&
    actor.system.powerPoints[item.system.arcane].max
  ) {
    // Specific power points
    otherArcane = true;
    ppv = actor.system.powerPoints[item.system.arcane].value;
    ppm = actor.system.powerPoints[item.system.arcane].max;
  }
  if (ppv - number < 0) {
    ui.notifications.notify(game.i18n.localize("BRSW.InsufficientPP"));
    return;
  }
  let newPP = Math.max(ppv - number, 0);
  if (newPP > ppm) {
    const rechargedPP = -number - (newPP - ppm);
    newPP = ppm;
    ChatMessage.create({
      speaker: { alias: name },
      content: game.i18n.format("BRSW.RechargePPTextHitMax", {
        name: actor.name,
        rechargedPP: rechargedPP,
        ppm: ppm,
      }),
    });
  }
  newPP = Math.min(newPP, ppm);
  if (arcaneDevice === true) {
    const updates = [
      { _id: item.id, "system.additionalStats.devicePP.value": `${newPP}` },
    ];
    // Updating the Arcane Device:
    actor.updateEmbeddedDocuments("Item", updates);
  } else {
    const data_key = otherArcane
      ? `system.powerPoints.${item.system.arcane}.value`
      : "system.powerPoints.general.value";
    let data = {};
    data[data_key] = newPP;
    actor.update(data);
  }
  const text = {
    reload: game.i18n.format("BRSW.RechargePPText", {
      name: actor.name,
      number: -number,
      newPP: newPP,
    }),
    spend: game.i18n.format("BRSW.ExpendPPText", {
      name: actor.name,
      number: number,
      newPP: newPP,
    }),
    benny_reload: game.i18n.format("BRSW.RechargePPBennyText", {
      name: actor.name,
      newPP: newPP,
    }),
    soul_drain: game.i18n.format("BRSW.RechargePPSoulDrainText", {
      name: actor.name,
      newPP: newPP,
    }),
  };
  ChatMessage.create({
    speaker: { alias: actor.name },
    content: text[mode],
  });
  Hooks.call("BRSW-ManualPPManagement", actor, item);
}

/**
 * Function to manually manage power points © SalieriC
 * @param {SwadeActor} actor
 * @param {function} actor.update
 * @param {Item} item
 */
async function manual_pp(actor, item) {
  const amount_pp = game.i18n.localize("BRSW.AmountPP");
  new Dialog({
    title: game.i18n.localize("BRSW.PPManagement"),
    content: `<form> <div class="form-group"> 
            <label for="num">${amount_pp}: </label>
             <input id="brsw2-num" name="num" type="number" min="0" value="5">
              </div> </form><script>$("#brsw2-num").focus()</script>`,
    default: "one",
    buttons: {
      one: {
        label: game.i18n.localize("BRSW.ExpendPP"),
        callback: (html) =>
          modify_power_points(
            Number(html.find("#brsw2-num")[0].value),
            "spend",
            actor,
            item,
          ),
      },
      two: {
        label: game.i18n.localize("BRSW.RechargePP"),
        callback: (html) =>
          modify_power_points(
            -Number(html.find("#brsw2-num")[0].value),
            "reload",
            actor,
            item,
          ),
      },
      three: {
        label: game.i18n.localize("BRSW.PPBennieRecharge"),
        callback: () => {
          //Button 3: Benny Recharge (spends a benny and increases the data.powerPoints.value by 5 but does not increase it above the number given in data.powerPoints.max)
          if (actor.system.bennies.value < 1) {
            ui.notifications.notify(game.i18n.localize("BRSW.NoBennies"));
            return;
          }
          modify_power_points(-5, "benny_reload", actor, item);
          actor.spendBenny();
        },
      },
      four: {
        label: game.i18n.localize("BRSW.SoulDrain"),
        callback: () => {
          //Button 4: Soul Drain (increases data.fatigue.value by 1 and increases the data.powerPoints.value by 5 but does not increase it above the number given in data.powerPoints.max)
          const fv = actor.system.fatigue.value;
          const fm = actor.system.fatigue.max;
          let newFV = fv + 1;
          if (item.system.additionalStats?.devicePP) {
            ui.notifications.notify(
              "You cannot use Soul Drain to recharge Arcane Devices.",
            );
            return;
          }
          if (newFV > fm) {
            ui.notifications.notify(
              "You cannot exceed your maximum Fatigue using Soul Drain.",
            );
            return;
          }
          actor.update({ "system.fatigue.value": fv + 1 });
          modify_power_points(-5, "soul_drain", actor, item);
        },
      },
    },
  }).render(true);
}

/**
 * Gets a template name from an item description or an item value
 * @param {Item} item
 */
function get_template_from_item(item) {
  const TEMPLATE_KEYS = {
    cone: ["BRSW.Cone", "cone"],
    sbt: ["BRSW.SmallTemplate", "sbt", "small blast"],
    mbt: ["BRSW.MediumTemplate", "mbt", "medium blast"],
    lbt: ["BRSW.LargeTemplate", "lbt", "large blast"],
    stream: ["BRSW.StreamTemplate", "stream"],
  };
  const SYSTEM_KEYS = {
    cone: "cone",
    large: "lbt",
    medium: "mbt",
    small: "sbt",
    stream: "stream",
  };
  if (["weapon", "power", "action", "gear"].indexOf(item.type) < 0) {
    return;
  }
  let templates_found = [];
  for (let template_key in item.system.templates) {
    if (item.system.templates[template_key] === true) {
      templates_found.push(SYSTEM_KEYS[template_key]);
    }
  }
  for (let template_key in TEMPLATE_KEYS) {
    for (let key_text of TEMPLATE_KEYS[template_key]) {
      let translated_key_text = key_text;
      if (key_text.slice(0, 4) === "BRSW") {
        translated_key_text = game.i18n.localize(key_text);
      }
      if (
        (item.system?.description
          ?.toLowerCase() // jshint ignore:line
          .includes(translated_key_text) ||
          (typeof item.system?.range == "string" &&
            item.system?.range?.toLowerCase().includes(translated_key_text))) && // jshint ignore:line
        !templates_found.includes(template_key)
      ) {
        templates_found.push(template_key);
        break;
      }
    }
  }
  return templates_found;
}

/**
 * Returns true if the target wears a Heavy Armor
 * @param {PlaceableObject} target
 */
function has_heavy_armor(target) {
  // Equipped is equipStatus 3
  const heavy_armor = target.document.actor.items.filter(
    (item) =>
      item.type === "armor" &&
      item.system.isHeavyArmor &&
      item.system.locations.torso &&
      item.system.equipStatus === 3,
  );
  return heavy_armor.length > 0;
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
  let targetActor,
    targetToken = null;
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
