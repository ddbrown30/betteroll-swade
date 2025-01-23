import * as BRSW2_CONFIG from "./brsw2-config.js";

// Utility functions that can be used out of the module
/* globals ChatMessage, game, Dialog, console, foundry, ClientSetting */

export function getWhisperData() {
  let rollMode, whisper, blind;
  rollMode = game.settings.get("core", "rollMode");
  if (["gmroll", "blindroll"].includes(rollMode)) {
    whisper = ChatMessage.getWhisperRecipients("GM");
  }
  if (rollMode === "blindroll") {
    blind = true;
  } else if (rollMode === "selfroll") {
    whisper = [game.user._id];
  }
  return {
    rollMode: rollMode,
    whisper: whisper,
    blind: blind,
  };
}

export function makeExplotable(expression) {
  // Make all dice of a roll able to explode
  // Code from the SWADE system
  const reg_exp = /\d*d\d+[^kdrxc]/g;
  let new_expression = expression + " "; // Just because of my poor reg_exp foo
  let dice_strings = new_expression.match(reg_exp);
  let used = [];
  if (dice_strings) {
    dice_strings.forEach((match) => {
      if (used.indexOf(match.slice(0, -1)) === -1) {
        new_expression = new_expression.replace(
          new RegExp(match.slice(0, -1), "g"),
          match.slice(0, -1) + "x",
        );
        used.push(match.slice(0, -1));
      }
    });
  }
  return new_expression;
}

export async function spendMastersBenny() {
  // Spends one benny from the gamemaster stack
  // noinspection ES6MissingAwait
  for (let user of game.users) {
    if (user.isGM) {
      let value = user.getFlag("swade", "bennies");
      if (value > 0) {
        await user.setFlag("swade", "bennies", value - 1);
      }
    }
  }
}

export function broofa() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    let r = (Math.random() * 16) | 0, //jshint ignore:line
      v = c === "x" ? r : (r & 0x3) | 0x8; // jshint ignore:line
    return v.toString(16);
  });
}

/**
 * Show a simple form
 *
 * @param {string} title The form title
 * @param {[object]} fields Array of {id, label, default_value}, if there
 *  is no id it will use label as an id, beware of spaces
 * @param {function} callback A callback function to pass the data
 */
export function simple_form(title, fields, callback) {
  let content = "<form>";
  for (let field of fields) {
    const field_id = field.id || field.label;
    content += `<div class="form-group"><label>${field.label}</label>
            <input id='input_${field_id}' value='${field.default_value}'></div>`;
  }
  content += "</form>";
  new Dialog({
    title: title,
    content: content,
    buttons: {
      one: {
        label: "OK",
        callback: (html) => {
          let values = {};
          for (let field of fields) {
            const field_id = field.id || field.label;
            values[field_id] = html.find(`#input_${field_id}`).val();
          }
          callback(values);
        },
      },
      two: {
        label: "Cancel",
      },
    },
  }).render(true);
}

/**
 * Gets the first targeted token
 */
export function get_targeted_token() {
  /**
   * Sets the difficulty as the parry value of the targeted
   * or selected token
   */
  let targets = game.user.targets;
  let objective;
  if (targets.size) {
    objective = Array.from(targets)[0];
  }
  return objective;
}

/**
 * Sets or updates a condition
 * @param {string} condition_id
 * @param {SwadeActor} actor
 */
export async function set_or_update_condition(condition_id, actor) {
  // noinspection ES6RedundantAwait
  let condition;
  if (actor.statuses.has(condition_id)) {
    condition = await game.succ.getConditionFrom(condition_id, actor);
  } else {
    condition = await actor.toggleStatusEffect(condition_id, { active: true });
  }
  await condition.update({
    ["duration.startRound"]: game.combat ? game.combat.round : 0,
    ["duration.startTurn"]: game.combat ? game.combat.turn : 0,
  });
}

export class SettingsUtils {
  /**
   * Get a single setting using the provided key
   * @param {*} key
   * @returns {Object} setting
   */
  static getSetting(key) {
    return game.settings.get(BRSW2_CONFIG.MODULE_NAME, key);
  }

  /**
   * Sets a single game setting
   * @param {*} key
   * @param {*} value
   * @returns {Promise | ClientSetting}
   */
  static async setSetting(key, value) {
    await game.settings
      .set(BRSW2_CONFIG.MODULE_NAME, key, value)
      .then((result) => {
        return result;
      })
      .catch((rejected) => {
        throw rejected;
      });
  }

  /**
   * Register a single setting using the provided key and setting data
   * @param {*} key
   * @param {*} metadata
   */
  static registerSetting(key, metadata) {
    return game.settings.register(BRSW2_CONFIG.MODULE_NAME, key, metadata);
  }

  /**
   * Register a menu setting using the provided key and setting data
   * @param {*} key
   * @param {*} metadata
   */
  static registerMenu(key, metadata) {
    return game.settings.registerMenu(BRSW2_CONFIG.MODULE_NAME, key, metadata);
  }

  /**
   * Register a single setting using the provided key and setting data
   * @param {*} key
   * @param {*} metadata
   */
  static registerBR2WorldSetting(key, metadata) {
    if (BRSW2_CONFIG.WORLD_SETTINGS[key] || BRSW2_CONFIG.USER_SETTINGS[key]) {
      console.error("Duplicate setting key");
      return;
    }

    let setting = {};
    setting.key = key;
    foundry.utils.mergeObject(setting, metadata);
    BRSW2_CONFIG.WORLD_SETTINGS[key] = setting;
  }

  /**
   * Register a single setting using the provided key and setting data
   * @param {*} key
   * @param {*} metadata
   */
  static registerBR2UserSetting(key, metadata) {
    if (BRSW2_CONFIG.WORLD_SETTINGS[key] || BRSW2_CONFIG.USER_SETTINGS[key]) {
      console.error("Duplicate setting key");
      return;
    }

    let setting = {};
    setting.key = key;
    foundry.utils.mergeObject(setting, metadata);
    BRSW2_CONFIG.USER_SETTINGS[key] = setting;
  }

  static hasModuleFlags(obj) {
    if (!obj.flags) {
      return false;
    }

    return !!obj.flags[BRSW2_CONFIG.MODULE_NAME];
  }

  static getModuleFlag(obj, flag) {
    if (!SettingsUtils.hasModuleFlags(obj)) {
      return;
    }

    return obj.flags[BRSW2_CONFIG.MODULE_NAME][flag];
  }

  static getWorldSetting(key) {
    if (!BRSW2_CONFIG.WORLD_SETTINGS[key]) {
      return;
    }

    return BRSW2_CONFIG.WORLD_SETTINGS[key].value !== undefined
      ? BRSW2_CONFIG.WORLD_SETTINGS[key].value
      : BRSW2_CONFIG.WORLD_SETTINGS[key].default;
  }

  static getUserSetting(key) {
    if (!BRSW2_CONFIG.USER_SETTINGS[key]) {
      return;
    }

    return BRSW2_CONFIG.USER_SETTINGS[key].value !== undefined
      ? BRSW2_CONFIG.USER_SETTINGS[key].value
      : BRSW2_CONFIG.USER_SETTINGS[key].default;
  }
}
