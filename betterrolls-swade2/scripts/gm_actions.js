// Scripts to manage gm selectors
/* globals game */

import { GmActionsPopup } from "./gm_actions_popup.js";
import { SettingsUtils } from "./utils.js";

/**
 * Sets up the hooks for the chat button
 */
export function setup_chat_button() {
  if (!game.user.isGM) {
    return;
  }

  create_chat_button();
}

/**
 * Creates and inits the button that opens the GM actions popup
 */
function create_chat_button() {
  const privacyButtons = document.querySelector("#roll-privacy");
  const button = document.createElement("button");
  button.classList.add(
    "brsw-chat-button",
    "ui-control",
    "icon",
    "fas",
    "fa-plus-minus",
  );
  button.classList.add("vertical");
  button.type = "button";

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    toggle_global_mods_menu(event.target);
  });

  privacyButtons.insertAdjacentElement("afterend", button);
}

/**
 * Open/close the GM actions popup
 * @param element The toggle button
 */
function toggle_global_mods_menu(element) {
  if (game.brsw.gmActionsPopup) {
    game.brsw.gmActionsPopup.close();
  } else {
    const rect = element.getBoundingClientRect();
    new GmActionsPopup({ anchorPosition: { x: rect.x, y: rect.y } }).render(
      true,
    );
  }
}

/**
 * Gm modifiers have been checked
 * @param ev
 */
export function manage_selectable_gm(ev) {
  //First, mark what we just clicked as selected
  ev.currentTarget.classList.toggle("brsw-selected");

  //Next, if this action is group_single, deselect the other actions in its group
  const gm_actions = SettingsUtils.getSetting("gm_actions");
  const action = gm_actions.find(
    (a) => a.name === ev.currentTarget.dataset.actionName,
  );
  if (action?.group_single) {
    //Grab the actions from the group other than the one we just selected
    const group_actions = gm_actions.filter(
      (a) => a.group === action.group && action.name !== a.name,
    );
    for (const group_action of group_actions) {
      const element = document.querySelector(
        `[data-action-name="${group_action.name}"]`,
      );
      if (element) {
        element.classList.remove("brsw-selected");
      }
    }
  }

  //Grab all the selected elements and enable them in the settings
  const selected_actions = [];
  for (const element of document.querySelectorAll(
    "#brsw-gm-actions .brsw-selected",
  )) {
    selected_actions.push(element.dataset.actionName);
  }
  for (const gm_action of gm_actions) {
    gm_action.enable = selected_actions.includes(gm_action.name);
  }
  // noinspection JSIgnoredPromiseFromCall
  SettingsUtils.setSetting("gm_actions", gm_actions);
}

export function get_enabled_gm_actions() {
  return SettingsUtils.getSetting("gm_actions").filter(
    (action) => action.enable,
  );
}
