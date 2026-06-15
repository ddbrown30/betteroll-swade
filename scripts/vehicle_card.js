// Functions for cards representing vehicles
/* globals Token, game, ui, fromUuid, fromUuidSync */

import { get_action_from_click } from "./cards_common.js";
import { create_item_card } from "./item_card.js";
import { roll_skill } from "./skill_card.js";
import { Utils } from "./utils.js";

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
  const uuid = ev.target.closest("[data-member-uuid]")?.dataset.memberUuid;
  const driver_actor = vehicle_actor.system.crew.members.find(
    (m) => m.uuid === uuid,
  );
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

  const skill = Utils.traitFromString(driver_actor.actor, skill_id);
  if (!skill) {
    ui.notifications.warn(
      game.i18n.localize("BRSW.VehicleCharacterSkillMissingError"),
    );
    return;
  }

  // Show card
  const br_card = await game.brsw.create_skill_card(
    driver_actor.actor,
    skill.id,
    {
      vehicle: target,
    },
  );
  if (action.includes("dialog")) {
    game.brsw.dialog.show_card(br_card);
  } else if (action.includes("trait")) {
    await roll_skill(br_card, false);
  }
}

/**
 * Fired from an event clicking a vehicle weapon
 */
function vehicle_weapon_clicked(ev, target) {
  ev.stopImmediatePropagation();
  ev.preventDefault();
  ev.stopPropagation();
  const actor = target.actor ?? target;
  const item_id = ev.currentTarget.parentElement.dataset.itemId;
  const item = actor.items.get(item_id);
  const gunner = actor.system.getCrewMemberForWeapon(item);
  create_item_card(gunner, item.uuid);
}

/**
 * Activates the listeners in the vehicle sheet
 * @param app Sheet app
 * @param html Html code
 */
export function activate_vehicle_listeners(app, html) {
  console.log(app);
  const target = app.token || app.options.document;
  console.log(target);
  const maneuver_check_button = html.querySelector(
    "button[data-action='maneuverCheck']",
  );
  if (maneuver_check_button) {
    maneuver_check_button.addEventListener("click", async (ev) => {
      await vehicle_click_listener(ev, target, true);
    }, true);
  }
  const weapon_labels = html.querySelectorAll("a[data-action='showItem']");
  for (const label of weapon_labels) {
    const new_label = label.cloneNode(true);
    label.replaceWith(new_label);
    new_label.addEventListener("click", (ev) => {
      vehicle_weapon_clicked(ev, target);
    });
  }
}
