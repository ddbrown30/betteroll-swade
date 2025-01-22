// Functions for the damage card
/* global game, canvas, CONST, Token, CONFIG, Hooks, succ, console */
import {
  BRSW_CONST,
  create_common_card,
  are_bennies_available,
  roll_trait,
  spend_bennie,
} from "./cards_common.js";
import {
  create_incapacitation_card,
  create_injury_card,
} from "./incapacitation_card.js";
import { SettingsUtils } from "./utils.js";
import { BrCommonCard } from "./BrCommonCard.js";

/**
 * Shows a damage card and applies damage to the token/actor
 * @param {string} token_id
 * @param {int} damage
 * @param {string} damage_text
 * @param {string} heavy_damage
 */
export async function create_damage_card(
  token_id,
  damage,
  damage_text,
  heavy_damage,
) {
  let token = canvas.tokens.get(token_id);
  let { actor } = token;
  let user = get_owner(actor);
  // noinspection JSUnresolvedVariable
  let undo_values = {
    wounds: actor.system.wounds.value,
    shaken: actor.system.status.isShaken,
  };
  let wounds = Math.floor(damage / 4);
  if (SettingsUtils.getSetting("wound-cap")) {
    wounds = Math.min(wounds, SettingsUtils.getSetting("wound-cap"));
  }
  // noinspection JSUnresolvedVariable
  const can_soak = wounds || actor.system.status.isShaken;
  const damage_result = await apply_damage(token, wounds, 0);
  let show_injury =
    SettingsUtils.getSetting("optional_rules_enabled").indexOf("GrittyDamage") >
    -1;
  show_injury =
    show_injury ||
    (SettingsUtils.getSetting("optional_rules_enabled").indexOf(
      "RiftsGrittyDamage",
    ) > -1 &&
      heavy_damage === "true");
  show_injury = show_injury && can_soak && actor.system.wounds.max > 1;
  let br_message = await create_common_card(
    token,
    {
      header: {
        type: game.i18n.localize("SWADE.Dmg"),
        title: game.i18n.localize("SWADE.Dmg"),
        notes: damage_text,
      },
      text: damage_result.text,
      undo_values: undo_values,
      wounds: wounds,
      soaked: 0,
      soak_possible: are_bennies_available(actor) && can_soak,
      show_incapacitation: damage_result.incapacitated && actor.isWildcard,
      show_injury: show_injury,
      attribute_name: "vigor",
    },
    "modules/betterrolls-swade2/templates/damage_card.html",
  );
  if (wounds === 0) {
    //If we're not dealing any wounds, don't bother popping out the card since there's no action required
    br_message.popup_shown = true;
  }
  br_message.update_list = { ...br_message.update_list, ...{ user: user.id } };
  br_message.type = BRSW_CONST.TYPE_DMG_CARD;
  await br_message.render();
  await br_message.save();
  Hooks.call("BRSW-AfterShowDamageCard", actor, wounds, br_message);
  return br_message.message;
}

/**
 * Gets the owner of an actor
 * @param {SwadeActor} actor
 */
export function get_owner(actor) {
  let owner;
  let player;
  let gm;
  game.users.forEach((user) => {
    if (user.isGM) {
      gm = user;
    } else if (user.character?.id === actor.id) {
      owner = user;
    } else if (actor.getUserLevel(user) > 2) {
      player = user;
    }
  });
  return owner || player || gm;
}

/**
 * Applies damage to a token
 * @param token_or_token_id
 * @param {int} wounds
 * @param {int} soaked
 */
async function apply_damage(token_or_token_id, wounds, soaked = 0) {
  if (wounds < 0) {
    return;
  }
  let incapacitated;
  const token =
    token_or_token_id instanceof Token
      ? token_or_token_id
      : canvas.tokens.get(token_or_token_id);
  // We take the starting situation
  let initial_wounds = token.actor.system.wounds.value;
  // noinspection JSUnresolvedVariable
  let initial_shaken = token.actor.system.status.isShaken;
  // We test for double shaken
  let damage_wounds = wounds;
  let final_shaken = true; // Any damage also shakes the token
  let text = "";
  if (wounds < 1 && initial_shaken) {
    // Shaken twice
    const has_hardy = token.actor.items.find((item) => {
      return (
        item.name
          .toLowerCase()
          .includes(game.i18n.localize("BRSW.HardyIdentifier")) &&
        (item.type === "edge" || item.type === "ability")
      );
    });
    if (has_hardy || token.actor.getFlag("swade", "hardy")) {
      text += game.i18n.localize("BRSW.HardyActivated");
      damage_wounds = 0;
    } else {
      damage_wounds = 1;
    }
  }
  text += wounds
    ? game.i18n.format("BRSW.TokenWounded", {
        token_name: token.name,
        wounds: wounds,
      })
    : damage_wounds
      ? game.i18n.format("BRSW.DoubleShaken", { token_name: token.name })
      : game.i18n.format("BRSW.TokenShaken", { token_name: token.name });
  // Now we look for soaking
  if (soaked) {
    damage_wounds -= soaked;
    if (damage_wounds <= 0) {
      // All damage soaked, remove shaken
      damage_wounds = 0;
      final_shaken = false;
      text += game.i18n.localize("BRSW.AllSoaked");
    } else {
      text += game.i18n.format("BRSW.SomeSoaked", { soaked: soaked });
    }
  }
  // Final damage
  let final_wounds = initial_wounds + damage_wounds;
  incapacitated = final_wounds > token.actor.system.wounds.max;
  const downed_condition = token.actor.isWildcard ? "incapacitated" : "dead";
  if (incapacitated) {
    await token.actor.toggleStatusEffect(downed_condition, { active: true });
  } else {
    await token.actor.toggleStatusEffect(downed_condition, { active: false });
  }
  if (incapacitated) {
    final_shaken = false;
  }
  // We cap damage on actor number of wounds
  final_wounds = Math.min(final_wounds, token.actor.system.wounds.max);
  // Finally, we update actor and mark defeated
  await token.actor.update({ "system.wounds.value": final_wounds });
  if (final_shaken) {
    await token.actor.toggleStatusEffect("shaken", { active: true });
  } else {
    await token.actor.toggleStatusEffect("shaken", { active: false });
  }
  Hooks.call(
    "BRSW-AfterApplyDamage",
    token,
    final_wounds,
    final_shaken,
    incapacitated,
    initial_wounds,
    initial_shaken,
    soaked,
  );
  return { text: text, incapacitated: incapacitated };
}

/**
 * Undo the damage in one card
 * @param {ChatMessage} message
 */
async function undo_damage(message) {
  const br_card = new BrCommonCard(message);
  const { actor, render_data } = br_card;
  await actor.update({ "system.wounds.value": render_data.undo_values.wounds });
  if (br_card.token) {
    // Remove incapacitation and shaken
    let token_object = br_card.token.document;
    if (render_data.undo_values.shaken) {
    await actor.toggleStatusEffect("shaken", {active: true});
    } else {
      await actor.toggleStatusEffect("shaken", {active: true});
    }
    let inc_effects = [...token_object.actor.allApplicableEffects()]
      .filter((e) => {
        return e.flags?.succ?.conditionId === "incapacitated";
      })
      .map((effect) => {
        return effect.id;
      });
    await token_object.actor.deleteEmbeddedDocuments(
      "ActiveEffect",
      inc_effects,
    );
  }
  await message.delete();
}

/**
 * Activate the listeners of the damage card
 * @param message Message date
 * @param html Html produced
 */
export function activate_damage_card_listeners(message, html) {
  const br_card = new BrCommonCard(message);
  html.find(".brsw-undo-damage").click(async () => {
    await undo_damage(message);
  });
  html.find(".brsw-soak-button, .brsw-roll-button").click((ev) => {
    let spend_bennie = false;
    if (
      ev.currentTarget.classList.contains("roll-bennie-button") ||
      ev.currentTarget.classList.contains("brsw-soak-button")
    ) {
      spend_bennie = true;
    }
    // noinspection JSIgnoredPromiseFromCall
    roll_soak(br_card, spend_bennie);
  });
  html.find(".brsw-show-incapacitation").click(() => {
    // noinspection JSIgnoredPromiseFromCall
    br_card.close_popout(); //We assume we're done with the card at this point so close any popouts
    create_incapacitation_card(br_card.token_id).catch(() => {
      console.error("Error creating incapacitation card");
    });
  });
  html.find(".brsw-mark-defeated").click(async () => {
    await br_card.actor.toggleStatusEffect("incapacitated", {active: false});
    await br_card.actor.toggleStatusEffect("bleeding-out", {active: false});
    await br_card.actor.toggleStatusEffect("dead", {active: true});
  });
  html.find(".brsw-injury-button").click(() => {
    // noinspection JSIgnoredPromiseFromCall
    create_injury_card(br_card.token_id, "gritty");
  });
}

/**
 * Males a soak roll
 * @param {BrCommonCard} br_card
 * @param {Boolean} use_bennie
 */
async function roll_soak(br_card, use_bennie) {
  if (use_bennie) {
    await spend_bennie(br_card.actor);
  }
  let undo_wound_modifier =
    Math.min(br_card.actor.system.wounds.value, 3) -
    br_card.render_data.undo_values.wounds;
  const ignored_wounds =
    parseInt(br_card.actor.system.wounds.ignored) +
    (parseInt(br_card.actor.system.woundsOrFatigue.ignored) || 0);
  if (ignored_wounds) {
    undo_wound_modifier = Math.max(
      0,
      Math.min(br_card.actor.system.wounds.value, 3) -
        ignored_wounds -
        Math.max(0, br_card.render_data.undo_values.wounds - ignored_wounds),
    );
  }
  let soak_modifiers = [
    {
      name: game.i18n.localize("BRSW.RemoveWounds"),
      value: undo_wound_modifier,
    },
  ];
  if (
    br_card.actor.items.find((item) => {
      return (
        item.type === "edge" &&
        item.name
          .toLowerCase()
          .includes(game.i18n.localize("BRSW.EdgeName-IronJaw").toLowerCase())
      );
    })
  ) {
    soak_modifiers.push({
      name: game.i18n.localize("BRSW.EdgeName-IronJaw"),
      value: 2,
    });
  }
  // Active effects
  let soak_active_effects = br_card.actor.appliedEffects.filter((e) =>
    e.changes.find(
      (ch) =>
        ch.key === "brsw.soak-modifier" ||
        ch.key === "system.attributes.vigor.soakBonus",
    ),
  );
  for (let effect of soak_active_effects) {
    let change =
      effect.changes.find((ch) => ch.key === "brsw.soak-modifier") ||
      effect.changes.find(
        (ch) => ch.key === "system.attributes.vigor.soakBonus",
      );
    soak_modifiers.push({ name: effect.label, value: parseInt(change.value) });
  }
  // Unarmored hero
  if (
    game.settings.get("swade", "unarmoredHero") &&
    br_card.actor.isUnarmored
  ) {
    soak_modifiers.push({
      name: game.i18n.localize("BRSW.UnarmoredHero"),
      value: 2,
    });
  }
  await roll_trait(
    br_card,
    br_card.actor.system.attributes.vigor,
    game.i18n.localize("BRSW.SoakRoll"),
    { modifiers: soak_modifiers },
  );
  let result = 0;
  for (let roll of br_card.trait_roll.rolls) {
    for (let die of roll.dice) {
      if (die.result !== null) {
        result = Math.max(die.final_total, result);
      }
    }
  }
  if (result >= 4) {
    br_card.render_data.soaked = Math.floor(result / 4);
    await br_card.actor.update({
      "system.wounds.value": br_card.render_data.undo_values.wounds,
    });
    const damage_result = await apply_damage(
      br_card.token,
      br_card.render_data.wounds,
      br_card.render_data.soaked,
    );
    br_card.render_data.text = damage_result.text;
    br_card.render_data.show_incapacitation =
      damage_result.incapacitated && br_card.actor.isWildcard;
    br_card.render_data.show_injury =
      SettingsUtils.getSetting("optional_rules_enabled").indexOf(
        "GrittyDamage",
      ) > -1 && br_card.render_data.wounds > br_card.render_data.soaked;
    await br_card.render();
    await br_card.save();
  }
}
