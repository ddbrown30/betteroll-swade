// functions for the incapacitation card
/* globals canvas, game, CONST, Roll, Hooks, succ, fromUuid, console */

import {
  BRSW_CONST,
  create_common_card,
  roll_trait,
  spend_bennie,
} from "./cards_common.js";
import { get_owner } from "./damage_card.js";
import { SettingsUtils } from "./utils.js";
import { BrCommonCard } from "./BrCommonCard.js";

const INJURY_BASE = {
  2: "BRSW.Unmentionables",
  3: "BRSW.Arm",
  5: "BRSW.Guts",
  10: "BRSW.Leg",
  12: "BRSW.Head",
};

const SECOND_INJURY_TABLES = {
  "BRSW.Guts": {
    1: "BRSW.Broken",
    3: "BRSW.Battered",
    5: "BRSW.Busted",
  },
  "BRSW.Head": {
    1: "BRSW.Scar",
    4: "BRSW.Blinded",
    6: "BRSW.Brain",
  },
};

const INJURY_ACTIVE_EFFECT = {
  "BRSW.Guts+BRSW.Broken": {
    changes: [
      { key: "system.attributes.agility.die.sides", mode: 2, value: -2 },
    ],
  },
  "BRSW.Guts+BRSW.Battered": {
    changes: [{ key: "system.attributes.vigor.die.sides", mode: 2, value: -2 }],
  },
  "BRSW.Guts+BRSW.Busted": {
    changes: [
      { key: "system.attributes.strength.die.sides", mode: 2, value: -2 },
    ],
  },
  "BRSW.Head+BRSW.Brain": {
    changes: [
      { key: "system.attributes.smarts.die.sides", mode: 2, value: -2 },
    ],
  },
  "BRSW.Leg+": {
    changes: [
      { key: "system.stats.speed.runningDie", mode: 2, value: -2 },
      { key: "system.stats.speed.value", mode: 2, value: -2 },
    ],
  },
  "BRSW.Head+BRSW.Blinded": {},
  "BRSW.Head+BRSW.Scar": {},
  "BRSW.Arm+": {},
  "BRSW.Unmentionables+": {},
};

/**
 * Shows an incapacitation card an
 * @param {string} token_id As it comes from damage its target is always a token
 */
export async function create_incapacitation_card(token_id) {
  let token = canvas.tokens.get(token_id);
  let { actor } = token;
  let user = get_owner(actor);
  // noinspection JSUnresolvedVariable
  const text = game.i18n.format("BRSW.IncapacitatedText", {
    token_name: token.name,
  });
  const text_after = game.i18n.localize("BRSW.IncapacitatedMustVigor");
  let br_message = await create_common_card(
    token,
    {
      header: {
        type: "",
        title: game.i18n.localize("BRSW.Incapacitation"),
        notes: token.name,
      },
      text: text,
      text_after: text_after,
      show_roll_injury: false,
      attribute_name: "vigor",
    },
    "modules/betterrolls-swade2/templates/incapacitation_card.html",
  );
  br_message.update_list = { ...br_message.update_list, ...{ user: user.id } };
  br_message.type = BRSW_CONST.TYPE_INC_CARD;
  await br_message.render();
  await br_message.save();
  return br_message.message;
}

/**
 * Hooks the public functions to a global object
 */
export function incapacitation_card_hooks() {
  game.brsw.create_incapacitation_card = create_incapacitation_card;
}

/**
 * Checks if a benny has been expended and rolls in the incapacitation table.
 * @param ev
 */
function roll_incapacitation_clicked(ev) {
  let spend_bennie = false;
  if (ev.currentTarget.classList.contains("roll-bennie-button")) {
    spend_bennie = true;
  }
  // noinspection JSIgnoredPromiseFromCall
  roll_incapacitation(ev.data.br_card, spend_bennie);
}

/**
 * Activate the listeners of the incapacitation card
 * @param message Message date
 * @param html Html produced
 */
export function activate_incapacitation_card_listeners(message, html) {
  const br_card = new BrCommonCard(message);
  html
    .find(".brsw-vigor-button, .brsw-roll-button")
    .bind("click", { br_card: br_card }, roll_incapacitation_clicked);
  html.find(".brsw-injury-button").click((ev) => {
    // noinspection JSIgnoredPromiseFromCall
    br_card.close_popout(); //We assume we're done with the card at this point so close any popouts
    create_injury_card(
      br_card.token_id,
      ev.currentTarget.dataset.injuryType,
    ).catch(() => {
      console.error("Error creating injury card");
    });
  });
}

/**
 * Males a vigor incapacitation roll
 * @param {BrCommonCard} br_card
 * @param {boolean} spend_benny
 */
async function roll_incapacitation(br_card, spend_benny) {
  if (spend_benny) {
    await spend_bennie(br_card.actor);
  }
  await roll_trait(
    br_card,
    br_card.actor.system.attributes.vigor,
    game.i18n.localize("BRSW.IncapacitationRoll"),
    {},
  );
  let result = 0;
  for (let roll of br_card.trait_roll.rolls) {
    for (let die of roll.dice) {
      if (die.result !== null) {
        result = Math.max(die.final_total, result);
      }
    }
  }
  br_card.render_data.show_roll_injury = true;
  br_card.render_data.injury_type = "none";
  if (br_card.trait_roll.current_roll.is_fumble) {
    br_card.render_data.text_after = `</p><p>${game.i18n.localize(
      "BRSW.Fumble",
    )}</p><p>${br_card.token.name} ${game.i18n.localize("BRSW.IsDead")}</p>`;
    br_card.render_data.show_roll_injury = false; // For what...
    await br_card.actor.toggleStatusEffect("incapacitated", { active: false });
    await br_card.actor.toggleStatusEffect("dead", { active: true });
  } else if (result < 4) {
    br_card.render_data.text_after = game.i18n.localize(
      "BRSW.BleedingOutResult",
    );
    br_card.render_data.injury_type = "permanent";
    if (game.succ.hasCondition("incapacitated", br_card.token)) {
      await br_card.actor.toggleStatusEffect("incapacitated", {
        active: false,
      });
      await br_card.actor.toggleStatusEffect("incapacitated", {
        active: true,
        overlay: false,
      });
    } //add it as regular (small) icon
    // noinspection ES6MissingAwait
    const ignoreBleedOut =
      game.settings.get("swade", "heroesNeverDie") ||
      br_card.actor.getFlag("swade", "ignoreBleedOut");
    if (!ignoreBleedOut) {
      game.succ
        .addCondition("bleeding-out", br_card.token, { forceOverlay: true })
        .catch(() => {
          console.error("Error while applying bleeding out");
        });
    } //make bleeding out overlay
  } else if (result < 8) {
    br_card.render_data.text_after = game.i18n.localize("BRSW.TempInjury");
    br_card.render_data.injury_type = "temporal-wounds";
  } else {
    br_card.render_data.text_after = game.i18n.localize("BRSW.TempInjury24");
    br_card.render_data.injury_type = "temporal-24";
  }
  await br_card.render();
  await br_card.save();
}

/**
 * Shows an injury card and rolls it.
 * @param token_id
 * @param {string} reason Reason for the injury
 */
export async function create_injury_card(token_id, reason) {
  if (SettingsUtils.getWorldSetting("use_system_injury_table")) {
    const injuryTable = await fromUuid(
      game.settings.get("swade", "injuryTable"),
    );
    if (injuryTable) {
      await injuryTable.draw();
    }
    return;
  }
  let token = canvas.tokens.get(token_id);
  let { actor } = token;
  let user = get_owner(actor);
  // First roll
  let first_roll = new Roll("2d6");
  await first_roll.evaluate();
  if (game.dice3d) {
    // noinspection ES6MissingAwait
    await game.dice3d.showForRoll(first_roll, game.user, true);
  }
  const first_result = read_table(INJURY_BASE, parseInt(first_roll.result));
  let second_result = "";
  // Check for another roll
  let second_roll = new Roll("1d6");
  for (let table in SECOND_INJURY_TABLES) {
    if (SECOND_INJURY_TABLES.hasOwnProperty(table) && first_result === table) {
      await second_roll.evaluate();
      if (game.dice3d) {
        // noinspection ES6MissingAwait
        await game.dice3d.showForRoll(second_roll, game.user, true);
      }
      second_result = read_table(
        SECOND_INJURY_TABLES[table],
        parseInt(second_roll.result),
      );
    }
  }
  const active_effect_index = `${first_result}+${second_result}`;
  let new_effect;
  let injury_effect;
  if (INJURY_ACTIVE_EFFECT.hasOwnProperty(active_effect_index)) {
    new_effect = { ...INJURY_ACTIVE_EFFECT[active_effect_index] };
    new_effect.name = game.i18n.localize(first_result);
    if (second_result) {
      if (first_result === "BRSW.Guts") {
        new_effect.name =
          game.i18n.localize(second_result) + " " + new_effect.name;
      } else {
        new_effect.name = game.i18n.localize(second_result);
      }
    }
    const injury_duration_name =
      reason === "permanent"
        ? "BRSW.PermanentInjuryName"
        : reason === "temporal-wounds"
          ? "BRSW.TempInjuryName"
          : "BRSW.TempInjury24Name";
    new_effect.name += game.i18n.localize(injury_duration_name);
    new_effect.icon = "/systems/swade/assets/icons/skills/medical-pack.svg";
    injury_effect = await actor.createEmbeddedDocuments("ActiveEffect", [
      new_effect,
    ]);
  }
  let br_message = await create_common_card(
    token,
    {
      header: {
        type: "",
        title: game.i18n.localize("BRSW.InjuryCard"),
        notes: token.name,
      },
      first_roll: first_roll,
      second_roll: second_roll,
      first_location: game.i18n.localize(first_result),
      second_location: game.i18n.localize(second_result),
    },
    "modules/betterrolls-swade2/templates/injury_card.html",
  );
  br_message.update_list = { ...br_message.update_list, ...{ user: user.id } };
  br_message.type = BRSW_CONST.TYPE_INJ_CARD;
  br_message.popup_shown = true; //The injury result has no action, so we don't show the popout
  await br_message.render();
  await br_message.save();
  Hooks.call("BRSW-InjuryAEApplied", br_message, injury_effect, reason);
  return br_message.message;
}

/**
 * Reads the result on a table
 * @param {object} table
 * @param {Number} value
 */
function read_table(table, value) {
  let result;
  for (let index in table) {
    if (table.hasOwnProperty(index) && parseInt(index) <= value) {
      result = table[index];
    }
  }
  return result;
}
