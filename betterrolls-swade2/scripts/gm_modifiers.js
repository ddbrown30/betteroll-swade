// Scripts to manage gm selectors
/* globals game */

import { SettingsUtils } from "./utils.js";

/**
 * Gm modifiers have been checked
 * @param ev
 */
export function manage_selectable_gm(ev) {
  ev.currentTarget.classList.toggle("brws-permanent-selected");
  ev.currentTarget.classList.toggle("brws-selected");
  const is_selected = ev.currentTarget.classList.contains("brws-selected");

  //Handle value modifiers
  const value = parseInt(ev.currentTarget.dataset.value);
  if (value != NaN) {
    let value_list = SettingsUtils.getSetting("gm_modifiers");
    value_list = value_list.filter((v) => v != null); //Clear out null entries to clean up old, bad data
    let indice = value_list.indexOf(value);
    if (indice >= 0 && !is_selected) {
      //We were selected and now we're not. Remove us from the list
      value_list.splice(indice, 1);
    } else if (indice === -1 && is_selected) {
      //We weren't selected and now we are. Add us to the list
      value_list.push(value);
    }
    // noinspection JSIgnoredPromiseFromCall
    SettingsUtils.setSetting("gm_modifiers", value_list);
  }

  //Handle GM actions
  let gm_actions = SettingsUtils.getSetting("gm_actions");
  let action = gm_actions.find((a) => a.name == ev.currentTarget.dataset.actionName);
  if (action?.group_single) {
    let group_actions = gm_actions.filter((a) => a.group == action.group && action.name != a.name);
    for (let group_action of group_actions) {
      let element = document.querySelector(`[data-action-name="${group_action.name}"]`);
      if (element) {
        element.classList.remove("brws-permanent-selected");
        element.classList.remove("brws-selected");
      }
    }
  }
  let selected_actions = [];
  for (let element of document.querySelectorAll(
    "#brsw-gm-actions .brws-permanent-selected",
  )) {
    selected_actions.push(element.dataset.actionName);
  }
  for (let gm_action of gm_actions) {
    gm_action.enable = selected_actions.includes(gm_action.name);
  }
  // noinspection JSIgnoredPromiseFromCall
  SettingsUtils.setSetting("gm_actions", gm_actions);
}

/**
 * Register the settings used to store the gm modifiers
 */
export function register_gm_modifiers_settings() {
  SettingsUtils.registerSetting("gm_modifiers", {
    name: "GM Modifiers",
    default: [],
    type: Array,
  });
}

export function recover_html_from_gm_modifiers() {
  if (game.user.isGM) {
    const gm_modifiers_array = SettingsUtils.getSetting("gm_modifiers");
    for (let modifier of [-4, -2, -1, 1, 2, 4]) {
      let class_str = "brsw-clickable brws-selectable";
      if (gm_modifiers_array.includes(modifier)) {
        class_str += " brws-selected brws-permanent-selected";
      }
      const element = document.getElementById(`brsw-gm-mod-${modifier}`);
      if (element) {
        element.className = class_str;
      }
    }
  }
}

export function get_gm_modifiers() {
  const gm_modifiers_array = SettingsUtils.getSetting("gm_modifiers");
  let total_modifier = 0;
  for (let modifier of gm_modifiers_array) {
    total_modifier += modifier;
  }
  return total_modifier;
}

export function manage_gm_tabs() {
  $(".brsw-chat-tab").on("click", function () {
    $(".brsw-chat-tab").removeClass("brsw-tab-active");
    this.classList.add("brsw-tab-active");
    const tab_id = this.dataset.tab;
    $(".brsw-tab-content").each(function () {
      if (this.id === tab_id) {
        // noinspection JSPotentiallyInvalidUsageOfThis
        this.classList.remove("brsw-collapsed");
      } else {
        // noinspection JSPotentiallyInvalidUsageOfThis
        this.classList.add("brsw-collapsed");
      }
    });
  });
}

export function get_enabled_gm_actions() {
  return SettingsUtils.getSetting("gm_actions").filter(
    (action) => action.enable,
  );
}
