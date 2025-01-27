// functions for the unshake and maybe un-stun card //
/* globals canvas, game, CONST, Hooks, succ, console */

import { get_owner } from "./damage_card.js";
import {
  BRSW_CONST,
  create_common_card,
  roll_trait,
  spend_bennie,
} from "./cards_common.js";
import { SettingsUtils } from "./utils.js";
import { BrCommonCard } from "./BrCommonCard.js";
import { TraitModifier } from "./modifiers.js";

/**
 * Shows the unshaken card
 * @param {ChatMessage} original_message
 * @param {SwadeActor} actor
 * @param {Number} type
 */
async function create_remove_status_card(original_message, actor, type) {
  let token_id;
  if (original_message) {
    const br_card = new BrCommonCard(original_message);
    actor = br_card.actor;
    token_id = br_card.token.id;
  } else if (actor) {
    token_id = actor.token ? actor.token.id : actor.getActiveTokens()[0].id;
  }
  if (!actor.system.status.isShaken && !actor.system.status.isStunned) {
    return;
  }
  let user = get_owner(actor);
  // noinspection JSUnresolvedVariable
  const text =
    type === BRSW_CONST.TYPE_UNSHAKE_CARD
      ? game.i18n.format("BRSW.UnshakenText", { token_name: actor.name })
      : game.i18n.format("BRSW.UnstunText", { token_name: actor.name });
  let title_name =
    type === BRSW_CONST.TYPE_UNSHAKE_CARD ? "BRSW.Unshake" : "BRSW.Unstun";
  const roll_title =
    type === BRSW_CONST.TYPE_UNSHAKE_CARD
      ? game.i18n.localize("BRSW.SpiritRoll")
      : game.i18n.localize("BRSW.VigorRoll");
  let br_message = await create_common_card(
    actor,
    {
      header: {
        type: "",
        title: game.i18n.localize(title_name),
        notes: actor.name,
      },
      roll_title: roll_title,
      text: text,
      show_roll_injury: false,
      attribute_name: "spirit",
    },
    "modules/betterrolls-swade2/templates/remove_status_card.html",
  );
  br_message.update_list = { ...br_message.update_list, ...{ user: user.id } };
  br_message.type = type;
  br_message.token_id = token_id;
  await br_message.render();
  await br_message.save();
  return br_message.message;
}

export async function create_unshaken_card(original_message, token_id) {
  await create_remove_status_card(
    original_message,
    token_id,
    BRSW_CONST.TYPE_UNSHAKE_CARD,
  );
}

/**
 * Shows the unstun card
 * @param {ChatMessage} original_message
 * @param {Number} token_id
 */
export async function create_unstun_card(original_message, token_id) {
  await create_remove_status_card(
    original_message,
    token_id,
    BRSW_CONST.TYPE_UNSTUN_CARD,
  );
}

/**
 * Activate the listeners of the unshake card
 * @param {BrCommonCard} br_card
 * @param html Html produced
 * @param card_type Type of card
 */
export function activate_remove_status_card_listeners(
  br_card,
  html,
  card_type,
) {
  const roll_function =
    card_type === BRSW_CONST.TYPE_UNSHAKE_CARD ? roll_unshaken : roll_unstun;
  html.find(".brsw-spirit-button, .brsw-roll-button").click((ev) => {
    let spend_bennie = false;
    if (
      ev.currentTarget.classList.contains("roll-bennie-button") ||
      ev.currentTarget.classList.contains("brsw-soak-button")
    ) {
      spend_bennie = true;
    }
    // noinspection JSIgnoredPromiseFromCall
    roll_function(br_card, spend_bennie);
  });
}

/**
 * Checks if a benny has been expended and rolls to remove shaken
 * @param {BrCommonCard} br_card
 * @param {Boolean} use_bennie
 */
async function roll_unshaken(br_card, use_bennie) {
  if (use_bennie) {
    // remove shaken
    await spend_bennie(br_card.actor);
    br_card.render_data.text = game.i18n.format("BRSW.UnshakeBennie", {
      name: br_card.actor.name,
    });
    br_card.actor
      .toggleStatusEffect("shaken", { active: false })
      .catch(console.error("Error removing shaken") || false);
  } else {
    // Check for Edges & Abilities
    const modifiers = await check_abilities(br_card.actor);
    // Make the roll
    await roll_trait(
      br_card,
      br_card.actor.system.attributes.spirit,
      game.i18n.localize("BRSW.SpiritRoll"),
      { modifiers: modifiers },
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
      if (SettingsUtils.getWorldSetting("swd-unshake") === true && result < 8) {
        br_card.render_data.text = game.i18n.format(
          "BRSW.UnshakeSuccessfulRollSWD",
          { name: br_card.actor.name },
        );
      } else {
        br_card.render_data.text = game.i18n.format(
          "BRSW.UnshakeSuccessfulRoll",
          { name: br_card.actor.name },
        );
      }
      br_card.actor.toggleStatusEffect("shaken", { active: false })
        .catch(console.error("Error removing shaken") || false);
    } else {
      br_card.render_data.text = game.i18n.format("BRSW.UnshakeFailure", {
        name: br_card.actor.name,
      });
    }
  }
  await br_card.render();
  await br_card.save();
  Hooks.call("BRSW-Unshake", br_card, br_card.actor);
}

async function check_abilities(actor) {
  let edgeAndAbilityNames = [
    game.i18n.localize("BRSW.EdgeName-CombatReflexes"), // index #0
    game.i18n.localize("BRSW.AbilityName-Demon_Hellfrost"), // index #1
    game.i18n.localize("BRSW.AbilityName-Construct"), // index #2
    game.i18n.localize("BRSW.AbilityName-Undead"), // index #3
    game.i18n.localize("BRSW.AbilityName-Amorphous_theAfter"), // index #4
  ];
  // Making all names lower case:
  edgeAndAbilityNames = edgeAndAbilityNames.map((name) => name.toLowerCase());
  // Check if these have an AE (using .entries() to not loose the index):
  for (let [index, value] of edgeAndAbilityNames.entries()) {
    let effect = actor.appliedEffects.find(
      (active_e) => active_e.name.toLowerCase() === value, // jshint ignore:line
    );
    // Only splice if the AE affects the generic bonus:
    let affectsUnshake = false;
    if (effect) {
      for (let change of effect.changes) {
        if (change.key === "system.attributes.spirit.unShakeBonus") {
          affectsUnshake = true;
        }
      }
    }
    // Remove from the list if ae is present and affects the generic bonus:
    if (effect && affectsUnshake === true) {
      edgeAndAbilityNames.splice(index, 1);
    }
  }
  // Adding AE bonuses
  let effectName = [];
  let effectValue = [];
  for (let effect of actor.appliedEffects) {
    if (effect.disabled === false) {
      // only apply changes if effect is enabled
      for (let change of effect.changes) {
        if (change.key === "system.attributes.spirit.unShakeBonus") {
          //Building an array of effect names and icons that affect the unShakeBonus
          effectName.push(effect.name);
          effectValue.push(change.value);
        }
      }
    }
  }
  // Get generic modifier
  let genericMod = parseInt(actor.system.attributes.spirit.unShakeBonus);
  if (effectValue.length > 0 && genericMod !== 0) {
    for (let each of effectValue) {
      genericMod -= each;
    }
  }
  // Checking if the actor has the Edges and Abilities:
  const edgesAndAbilities = actor.items.filter(function (item) {
    return (
      edgeAndAbilityNames.includes(item.name.toLowerCase()) &&
      (item.type === "edge" || item.type === "ability")
    );
  });

  // Building the final array of modifiers to be passed:
  let modifiers = [];
  for (let each of edgesAndAbilities) {
    modifiers.push({
      name: each.name,
      value: 2,
    });
  }
  for (let i = 0; i < effectName.length; i++) {
    modifiers.push({
      name: effectName[i],
      value: parseFloat(effectValue[i]),
    });
  }
  if (genericMod !== 0) {
    modifiers.push({
      name: "Generic Modifier",
      value: genericMod,
    });
  }
  // Returning the modifier array:
  return modifiers;
}

/**
 * Roll to remove stunned
 * @param {BrCommonCard} br_card
 */
async function roll_unstun(br_card) {
  let extra_options = {};
  // Unstun Bonus
  if (br_card.actor.system.attributes.vigor.unStunBonus) {
    const bonus = parseInt(br_card.actor.system.attributes.vigor.unStunBonus);
    if (bonus) {
      extra_options.modifiers = [
        new TraitModifier(game.i18n.localize("BRSW.UnstunBonus"), bonus),
      ];
      extra_options.total_modifiers += bonus;
    }
  }
  await roll_trait(
    br_card,
    br_card.actor.system.attributes.vigor,
    game.i18n.localize("BRSW.VigorRoll"),
    extra_options,
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
    br_card.render_data.text = game.i18n.format("BRSW.UnstunSuccessfulRoll", {
      name: br_card.actor.name,
    });
    br_card.actor.toggleStatusEffect("stunned", { active: false })
      .catch(console.error("Error removing stunned") || false);
  } else {
    br_card.render_data.text = game.i18n.format("BRSW.UnstunFailure", {
      name: br_card.actor.name,
    });
  }
  await br_card.render();
  await br_card.save();
  Hooks.call("BRSW-Unstun", br_card, br_card.actor);
}
