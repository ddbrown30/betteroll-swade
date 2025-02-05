// This file defines the BrCommonCard class and directly related code.
/* globals game, ChatPopout, console, canvas, Hooks, renderTemplate, TextEditor, ChatMessage,
     Roll, CONST */

import { TraitRoll } from "./rolls.js";
import { broofa, getWhisperData, SettingsUtils } from "./utils.js";
import { get_item_trait, trait_from_string } from "./item_card.js";
import { get_actions } from "./global_actions.js";
import { brAction } from "./actions.js";
import { are_bennies_available, trait_to_string } from "./cards_common.js";

/**
 * Stores a flag with the render data, deletes data can't be stored
 *
 * @param {Object} flags
 * @param render_object
 */
function store_render_flag(flags, render_object) {
  for (let property of ["actor", "skill"]) {
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
    this.skill_id = undefined;
    this.damage = undefined;
    this.vehicle_actor_id = undefined;
    this.vehicle_token_id = undefined;
    this.target_ids = [];
    this.environment = { light: "bright" };
    this.extra_text = "";
    this.attribute_name = ""; // If this is an attribute card, its name
    this.action_groups = {};
    this.macro_buttons = []; // Macro buttons from items
    this.render_data = {}; // Old render data, to be removed
    this.update_list = {}; // List of properties pending to be updated
    this.resist_buttons = [];
    this.trait_roll = new TraitRoll();
    this.popup_shown = false;
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
    br_flags.br_data = this.get_data();
    // Temporary
    store_render_flag(br_flags, this.render_data);
    update_list.flags["betterrolls-swade2"] = br_flags;
    await this.message.update(update_list);
    this.update_list = {};
  }

  create_popout() {
    if (game.user.id !== this.message.author.id || this.popup_shown) {
      return;
    }
    if (SettingsUtils.getUserSetting("auto_popout_chat")) {
      this.show_popup();
    }
  }

  show_popup() {
    let top =
      cascade_starting_left + game.brsw.cascade_count * cascade_left_increment;
    let left =
      cascade_starting_top + game.brsw.cascade_count * cascade_top_increment;
    game.brsw.cascade_count =
      game.brsw.cascade_count + 1 < cascade_max_cascades
        ? game.brsw.cascade_count + 1
        : 0;
    new ChatPopout(this.message, { top: top, left: left }).render(true);
    this.popup_shown = true;
    this.save().catch(() => {
      console.error("Error saving card data after popup rendering");
    });
  }

  close_popout() {
    for (let app of Object.values(this.message.apps)) {
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
      skill_id: this.skill_id,
      vehicle_actor_id: this.vehicle_actor_id,
      vehicle_token_id: this.vehicle_token_id,
      environment: this.environment,
      extra_text: this.extra_text,
      attribute_name: this.attribute_name,
      action_groups: this.action_groups,
      macro_buttons: this.macro_buttons,
      id: this.id,
      target_ids: this.target_ids,
      trait_roll: this.trait_roll,
      resist_buttons: this.resist_buttons,
      damage: this.damage,
      popup_shown: this.popup_shown,
    };
  }

  load(data) {
    const FIELDS = [
      "id",
      "type",
      "token_id",
      "actor_id",
      "item_id",
      "skill_id",
      "vehicle_actor_id",
      "vehicle_token_id",
      "environment",
      "extra_text",
      "attribute_name",
      "action_groups",
      "target_ids",
      "macro_buttons",
      "resist_buttons",
      "damage",
      "popup_shown",
    ];
    for (let field of FIELDS) {
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
    if (data.popup_shown_to?.length > 0) {
      data.popup_shown = true;
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
    return this.actor.items.find((item) => item.id === this.item_id);
  }

  get skill() {
    if (this.skill_id) {
      return this.actor.items.find((item) => item.id === this.skill_id);
    }
    if (this.item_id) {
      const trait = get_item_trait(this.item, this.actor);
      if (trait && Object.hasOwn(trait, "type") && trait.type === "skill") {
        this.skill_id = trait.id;
      }
      return trait;
    }
  }

  get skill_tooltip() {
    if (!this.skill || !this.skill.system.description) {
      return;
    }
    return this.skill.system.description.length <=
      SettingsUtils.getWorldSetting("max_tooltip_length")
      ? this.skill.system.description
      : "";
  }

  get sorted_action_groups() {
    let groups_array = Object.values(this.action_groups);
    return groups_array.sort((a, b) => {
      return a.name > b.name ? 1 : -1;
    });
  }

  get targets() {
    const target_array = [];
    for (const target_id in this.target_ids) {
      target_array.push(canvas.tokens.get(target_id));
    }
    return target_array;
  }

  get bennie_available() {
    return are_bennies_available(this.actor);
  }

  recover_targets_from_user() {
    this.target_ids = [];
    for (const target of game.user.targets) {
      this.target_ids.push(target.id);
    }
  }

  populate_macro_buttons() {
    if (!this.item.system?.actions?.additional) {
      return;
    }
    const additional_actions = this.item.system?.actions?.additional;
    for (let action in additional_actions) {
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
  populate_actions(stored_selections) {
    this.action_groups = {};
    this.populate_world_actions();
    if (this.item && !SettingsUtils.getWorldSetting("hide-weapon-actions")) {
      this.populate_item_actions();
    }
    this.populate_active_effect_actions();
    this.populate_resist_actions();
    this.populate_no_power_points_actions();
    for (const group in this.action_groups) {
      this.action_groups[group].actions.sort((a, b) => {
        if (group === "Active effects" || group === "Item actions") {
          return a.code.name > b.code.name ? 1 : -1;
        }
        return a.code.id > b.code.id ? 1 : -1;
      });
      for (let action of this.action_groups[group].actions) {
        if (stored_selections.hasOwnProperty(action.code.id)) {
          action.selected = stored_selections[action.code.id];
        }
      }
    }
    Hooks.call("BRSWCardActionsPopulated", this);
  }

  populate_world_actions() {
    const item = this.item ||
      this.skill || { type: "attribute", name: this.attribute_name };
    for (const global_action of get_actions(item, this.actor)) {
      const name =
        global_action.button_name.slice(0, 5) === "BRSW."
          ? game.i18n.localize(global_action.button_name)
          : global_action.button_name;
      let group_name = global_action.group || "BRSW.NoGroup";
      let group_name_id = group_name.split(".").join("");
      let group_single = global_action.hasOwnProperty("group_single");
      if (global_action.hasOwnProperty("extra_text")) {
        this.extra_text += global_action.extra_text;
      }
      if (!this.action_groups.hasOwnProperty(group_name_id)) {
        const translated_group = game.i18n.localize(group_name);
        this.action_groups[group_name_id] = {
          name: translated_group,
          actions: [],
          id: broofa(),
          single_choice: group_single,
        };
      }
      let new_action = new brAction(name, global_action);
      if (global_action.hasOwnProperty("defaultChecked")) {
        new_action.selected = true;
      }
      this.action_groups[group_name_id].actions.push(new_action);
    }
  }

  populate_item_actions() {
    let item_actions = [];
    for (let action in this.item.system?.actions?.additional) {
      const current_action = this.item.system.actions.additional[action];
      if (current_action.type !== "macro" && current_action.type !== "resist") {
        let br_action = new brAction(
          current_action.name,
          current_action,
          "item",
          action,
        );
        item_actions.push(br_action);
      }
    }
    if (item_actions.length) {
      const name = game.i18n.localize("BRSW.ItemActions");
      this.action_groups[name] = {
        name: name,
        actions: item_actions,
        id: broofa(),
        single_choice: false,
      };
    }
  }

  populate_active_effect_actions() {
    if (this.skill) {
      const attGlobalMods =
        this.actor.system.stats.globalMods[this.skill.system.attribute] ?? [];
      const effectArray = [
        ...this.actor.system.stats.globalMods.trait,
        ...attGlobalMods,
        ...this.skill.system.effects,
      ];
      this.populate_active_effect_actions_from_array(effectArray);
    } else if (this.attribute_name) {
      const abl = this.actor.system.attributes[this.attribute_name];
      const effectArray = [
        ...abl.effects,
        ...this.actor.system.stats.globalMods[this.attribute_name],
        ...this.actor.system.stats.globalMods.trait,
      ];
      this.populate_active_effect_actions_from_array(effectArray);
    }
    if (this.damage && this.actor.system.stats.globalMods.damage.length > 0) {
      this.populate_active_effect_actions_from_array(
        this.actor.system.stats.globalMods.damage,
        "dmgMod",
      );
    }
  }

  populate_active_effect_actions_from_array(effectArray, type = "skillMod") {
    let effectActions = [];
    for (let effect of effectArray) {
      let code = { name: effect.label, id: broofa() };
      code[type] = effect.value;
      const br_action = new brAction(effect.label, code, "active_effect");
      br_action.selected = !effect.ignore;
      effectActions.push(br_action);
    }
    if (effectActions.length) {
      const name = game.i18n.localize("BRSW.ActiveEffects");
      if (this.action_groups.hasOwnProperty(name)) {
        this.action_groups[name].actions = [
          ...this.action_groups[name].actions,
          ...effectActions,
        ];
      } else {
        this.action_groups[name] = {
          name: name,
          actions: effectActions,
          id: broofa(),
          single_choice: false,
        };
      }
    }
  }

  populate_resist_actions() {
    if (!this.item || !this.item.system.actions) {
      return;
    }
    for (let action in this.item.system.actions.additional) {
      const current_action = this.item.system.actions.additional[action];
      if (current_action.type === "resist") {
        this.resist_buttons.push({
          name: current_action.name,
          trait: current_action.override || this.skill.name,
          trait_mod: current_action.skillMod,
        });
      }
    }
  }

  /**
   * Populates actions needed for the No Power Points optional rule
   */
  populate_no_power_points_actions() {
    if (
      !game.settings.get("swade", "noPowerPoints") ||
      !this.item ||
      !this.item.system.pp
    ) {
      return;
    }
    const action_array = [];
    for (let penalty = -1; penalty > -7; penalty--) {
      const new_action = new brAction(
        `PP ${penalty}`,
        {
          name: `${game.i18n.localize("BRSW.NoPP")} ${penalty}`,
          id: `no_pp_${-penalty}`,
          skillMod: penalty,
        },
        "no_pp",
      );
      if (penalty === -Math.ceil(this.item.system.pp / 2)) {
        new_action.selected = true;
      }
      action_array.push(new_action);
    }
    this.action_groups[game.i18n.localize("BRSW.NoPP")] = {
      name: game.i18n.localize("BRSW.NoPP"),
      actions: action_array,
      id: broofa(),
      single_choice: true,
    };
  }

  get has_feet_buttons() {
    return Boolean(this.resist_buttons) && Boolean(this.macro_buttons);
  }

  set_active_actions(actions) {
    for (let group in this.action_groups) {
      for (let action of this.action_groups[group].actions) {
        action.selected = actions.includes(action.code.id);
      }
    }
  }

  /**
   * Set the trait_id for the render_data
   */
  set_trait_using_skill_override() {
    const actions = this.get_selected_actions();

    this.reset_default_trait();
    const action = actions.find(
      (a) => a.code.hasOwnProperty("skillOverride") && a.code.skillOverride,
    );
    if (!this.actor || !action) {
      return;
    }
    const skill = trait_from_string(this.actor, action.code.skillOverride);
    if (skill.hasOwnProperty("name")) {
      // Attribute
      this.render_data.trait_id = skill;
    } else {
      // Skill
      this.render_data.trait_id = skill.id;
    }
  }

  /**
   * Revert the trait to the default for the item
   */
  reset_default_trait() {
    if (this.item) {
      this.render_data.trait_id = get_item_trait(this.item, this.actor);
    }
  }

  /**
   * Creates an object to store some data in the old render_data flag.
   * @param render_data
   * @param template
   * @returns {*}
   */
  generate_render_data(render_data, template) {
    render_data.actor = this.actor;
    render_data.result_master_only =
      SettingsUtils.getWorldSetting("result-card") === "master";
    // Benny image
    render_data.benny_image =
      game.settings.get("swade", "bennyImage3DFront") ||
      "/systems/swade/assets/benny/benny-chip-front.png";
    render_data.collapse_results =
      !SettingsUtils.getUserSetting("expand-results");
    render_data.collapse_rolls = !SettingsUtils.getUserSetting("expand-rolls");
    if (template) {
      render_data.template = template;
    }
    this.check_warnings(render_data);
    this.render_data = render_data;
    return render_data;
  }

  get show_rerolls() {
    if (
      game.settings.get("swade", "dumbLuck") ||
      !this.trait_roll.current_roll
    ) {
      return true;
    }
    return (
      this.trait_roll.current_roll && !this.trait_roll.current_roll.is_fumble
    );
  }

  /**
   * Recovers the trait used in card
   */
  get_trait() {
    if (
      this.render_data.hasOwnProperty("trait_id") &&
      this.render_data.trait_id
    ) {
      let trait;
      if (this.render_data.trait_id.hasOwnProperty("name")) {
        // This is an attribute
        trait = this.render_data.trait_id;
      } else {
        // Should be a skill
        trait = this.actor.items.get(this.render_data.trait_id);
      }
      this.render_data.skill = trait;
      this.render_data.skill_title = trait
        ? trait.name + " " + trait_to_string(trait.system)
        : "";
    }
  }

  /**
   * Checks and creates a warning in the top of the card
   */
  check_warnings(render_data) {
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
    if (Object.keys(this.action_groups).length === 0) {
      this.populate_actions(stored_selections);
    }
    if (this.item && this.macro_buttons.length === 0) {
      this.populate_macro_buttons();
    }
    this.get_trait();
    let new_content = await renderTemplate(
      this.render_data.template,
      this.get_data_render(),
    );
    await TextEditor.enrichHTML(new_content);
    if (this.message) {
      this.update_list.content = new_content;
    } else {
      await this.create_foundry_message(new_content);
    }
  }

  /**
   * Temporal stop gap until render_data is removed, and we pass the class
   * to the template
   */
  get_data_render() {
    const data = {
      ...this.get_data(),
      ...this.render_data,
      ...{ sorted_action_groups: this.sorted_action_groups },
    };
    data.actor = this.actor;
    data.vehicle_actor = this.vehicle_actor;
    data.item = this.item;
    data.bennie_avaliable = this.bennie_available;
    data.show_rerolls = this.show_rerolls;
    data.selected_actions = this.get_selected_actions();
    data.no_actions_message =
      SettingsUtils.getWorldSetting("no-action-message");
    data.has_feet_buttons = this.has_feet_buttons;
    data.skill_tooltip = this.skill_tooltip;
    data.show_popup_button = SettingsUtils.getUserSetting("popout_chat_button");
    data.shots_pp_info = SettingsUtils.getWorldSetting("show_pp_shots_info")
      ? this.item_shots
      : "";
    return data;
  }

  /**
   * Returns an action from an id
   */
  get_action_from_id(action_id) {
    for (let group in this.action_groups) {
      for (let action of this.action_groups[group].actions) {
        if (action.code.name === action_id) {
          return action;
        }
      }
    }
    return null;
  }

  get item_shots() {
    if (!this.item) {
      return;
    }
    if (this.item.system.pp) {
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
  get_selected_actions() {
    let selected_actions = [];
    for (let group in this.action_groups) {
      for (let action of this.action_groups[group].actions) {
        if (action.selected) {
          selected_actions.push(action);
        }
      }
    }
    return selected_actions;
  }

  /**
   * Creates the Foundry message object
   */
  async create_foundry_message(new_content) {
    let chatData = this.create_basic_chat_data();
    if (new_content) {
      chatData.content = new_content;
    }
    this.message = await ChatMessage.create(chatData);
  }

  /**
   * Creates the basic chat data common to most cards
   * @return {Object} An object suitable to create a ChatMessage
   */
  create_basic_chat_data() {
    let whisper_data = getWhisperData();
    let chatData = {
      user: this.actor._idx,
      content: "<p>Default content, likely an error in Better Rolls</p>",
      speaker: {
        actor: this.actor._idx,
        token: this.token?.id,
        alias: this.actor.name,
      },
      blind: whisper_data.blind,
      flags: { core: { canPopout: true } },
    };
    if (whisper_data.whisper) {
      chatData.whisper = whisper_data.whisper;
    }
    chatData.roll = new Roll("0").roll();
    chatData.rollMode = whisper_data.rollMode;
    return chatData;
  }
}
