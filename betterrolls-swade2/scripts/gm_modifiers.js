// Scripts to manage gm selectors
/* globals game */

import { SettingsUtils } from "./utils.js";

/**
 * Gm modifiers have been checked
 * @param ev
 */
export function manage_selectable_gm(ev) {
  const initial_status = !ev.currentTarget.classList.contains("brws-selected");
  const value = parseInt(ev.currentTarget.dataset.value);
  ev.currentTarget.classList.toggle("brws-permanent-selected");
  ev.currentTarget.classList.toggle("brws-selected");
  const value_list = SettingsUtils.getSetting("gm_modifiers");
  const indice = value_list.indexOf(value);
  if (indice >= 0 && !initial_status) {
    value_list.splice(indice, 1);
  } else if (indice === -1 && initial_status) {
    value_list.push(value);
  }
  // noinspection JSIgnoredPromiseFromCall
  SettingsUtils.setSetting("gm_modifiers", value_list);
  const gm_actions = SettingsUtils.getSetting("gm_actions");
  const selected_actions = [];
  for (const element of document.querySelectorAll(
    "#brsw-gm-actions .brws-permanent-selected",
  )) {
    selected_actions.push(element.dataset.actionName);
  }
  for (const gm_action of gm_actions) {
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
    for (const modifier of [-4, -2, -1, 1, 2, 4]) {
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
  for (const modifier of gm_modifiers_array) {
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
