// Functions for cards representing vehicles

import { getActionFromClick } from "./cards_common.js";
import { createItemCard, roll_dmg } from "./item_card.js";
import { rollSkill } from "./skill_card.js";
import { Utils } from "./utils.js";

/**
 * Creates a card after an event.
 * @param ev javascript click event
 * @param {SwadeActor, Token} vehicle token or actor vehicle from the char sheet
 */
async function vehicle_click_listener(ev, vehicle) {
    const action = getActionFromClick(ev);
    if (action === "system") {
        return;
    }
    ev.stopImmediatePropagation();
    ev.preventDefault();
    ev.stopPropagation();

    const vehicleActor = vehicle.actor ?? vehicle;
    const uuid = ev.target.closest("[data-member-uuid]")?.dataset.memberUuid;
    const driverActor = vehicleActor.system.crew.members.find(
        (m) => m.uuid === uuid,
    );

    if (!driverActor) {
        return;
    }

    const skillId = vehicleActor.system.driver.skill || vehicleActor.system.driver.skillAlternative;
    if (!skillId) {
        ui.notifications.warn(game.i18n.localize("BRSW.VehicleOperationSkillNotSetError"));
        return;
    }

    const skill = Utils.traitFromString(driverActor.actor, skillId);
    if (!skill) {
        ui.notifications.warn(game.i18n.localize("BRSW.VehicleCharacterSkillMissingError"));
        return;
    }

    // Show card
    const brCard = await game.brsw.createSkillCard(
        driverActor.actor,
        skill.id,
        {
            vehicle: vehicle,
        },
    );
    if (action.includes("dialog")) {
        game.brsw.dialog.show_card(brCard);
    } else if (action.includes("trait")) {
        await rollSkill(brCard, false);
    }
}

/**
 * Fired from an event clicking a vehicle weapon
 */
async function vehicle_weapon_clicked(ev, vehicle) {
    const action = getActionFromClick(ev);
    if (action === "system") {
        return;
    }
    ev.stopImmediatePropagation();
    ev.preventDefault();
    ev.stopPropagation();
    const vehicleActor = vehicle.actor ?? vehicle;
    const item_id = ev.currentTarget.parentElement.dataset.itemId;
    const item = vehicleActor.items.get(item_id);
    let gunner = vehicleActor.system.getCrewMemberForWeapon(item);
    if (!gunner) {
        gunner = vehicleActor.system.operator;
    }

    if (gunner) {
        const brCard = await createItemCard(gunner, item.uuid);

        if (action.includes("dialog")) {
            game.brsw.dialog.show_card(brCard);
        } else {
            if (brCard.trait && action.includes("trait")) {
                await rollSkill(brCard, false);

                if (brCard.damage && action.includes("damage")) {
                    brCard.trait_roll.current_roll.dice.forEach((roll) => {
                        if (roll.result !== null && roll.result >= 0) {
                            roll_dmg(brCard, "", false, {}, roll.result > 3);
                        }
                    });
                }
            } else if (brCard.damage && action.includes("damage")) {
                await roll_dmg(brCard, "");
            }
        }
    } else {
        ui.notifications.error("BRSW.NoGunner");
    }
}

/**
 * Activates the listeners in the vehicle sheet
 * @param app Sheet app
 * @param html Html code
 */
export function activate_vehicle_listeners(app, html) {
    const vehicle = app.token || app.options.document;
    const maneuver_check_button = html.querySelector(
        "button[data-action='maneuverCheck']",
    );
    if (maneuver_check_button) {
        maneuver_check_button.addEventListener("click", async (ev) => {
            await vehicle_click_listener(ev, vehicle, true);
        }, true);
    }
    const weapon_labels = html.querySelectorAll("a[data-action='showItem']");
    for (const label of weapon_labels) {
        const new_label = label.cloneNode(true);
        label.replaceWith(new_label);
        new_label.addEventListener("click", (ev) => {
            vehicle_weapon_clicked(ev, vehicle);
        });
    }
}
