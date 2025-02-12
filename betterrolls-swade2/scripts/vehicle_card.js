// Functions for cards representing vehicles
/* globals Token, game, ui, fromUuid, fromUuidSync */

import { get_action_from_click } from "./cards_common.js";
import { trait_from_string } from "./item_card.js";
import { roll_skill } from "./skill_card.js";

/**
 * Creates a card after an event.
 * @param ev javascript click event
 * @param {SwadeActor, Token} target token or actor from the char sheet
 */
async function vehicle_click_listener(ev, target) {
  const action = get_action_from_click(ev);
  if (action === "system") {
    return;
  }
  ev.stopImmediatePropagation();
  ev.preventDefault();
  ev.stopPropagation();

  const vehicle_actor = target.actor ?? target;

  const driver_actor = fromUuidSync(vehicle_actor.system.driver.id);
  if (!driver_actor) {
    return;
  }

  const skill_id =
    vehicle_actor.system.driver.skill ||
    vehicle_actor.system.driver.skillAlternative;
  if (!skill_id) {
    ui.notifications.warn(
      game.i18n.localize("BRSW.VehicleOperationSkillNotSetError"),
    );
    return;
  }

  const skill = trait_from_string(driver_actor, skill_id);
  if (!skill) {
    ui.notifications.warn(
      game.i18n.localize("BRSW.VehicleCharacterSkillMissingError"),
    );
    return;
  }

  // Show card
  const br_card = await game.brsw.create_skill_card(driver_actor, skill.id, {
    vehicle: target,
  });
  if (action.includes("dialog")) {
    game.brsw.dialog.show_card(br_card);
  } else if (action.includes("trait")) {
    await roll_skill(br_card, false);
  }
}

/**
 * Activates the listeners in the vehicle sheet
 * @param app Sheet app
 * @param html Html code
 */
export function activate_vehicle_listeners(app, html) {
  const target = app.token || app.object;
  // App V2 passes raw html, forcing it to jquery to avoid needing two functions
  const html_jquery = $(html);
  const maneuver_check_button =
    html_jquery.find("button[id='maneuverCheck'], button[data-action='maneuverCheck']");
  console.log(maneuver_check_button);
  maneuver_check_button.bindFirst("click", async (ev) => {
    await vehicle_click_listener(ev, target);
  });
}
