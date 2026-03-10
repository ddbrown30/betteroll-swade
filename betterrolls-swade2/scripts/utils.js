import * as BRSW2_CONFIG from "./brsw2-config.js";

// Utility functions that can be used out of the module
/* globals ChatMessage, game, console, foundry, ClientSetting, CONFIG */

export function getWhisperData() {
  let whisper, blind;
  const rollMode = game.settings.get("core", "rollMode");
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
  const dice_strings = new_expression.match(reg_exp);
  const used = [];
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
  for (const user of game.users) {
    if (user.isGM) {
      const value = user.getFlag("swade", "bennies");
      if (value > 0) {
        await user.setFlag("swade", "bennies", value - 1);
      }
    }
  }
}

export function broofa() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0, //jshint ignore:line
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
export async function simple_form(title, fields, callback) {
  let content = "<form>";
  for (const field of fields) {
    const field_id = field.id || field.label;
    content += `<div class="form-group"><label>${field.label}</label>
            <input id='input_${field_id}' value='${field.default_value}'></div>`;
  }
  content += "</form>";
  await foundry.applications.api.DialogV2.wait({
    window: { title: title },
    content: content,
    buttons: [
      {
        label: "OK",
        action: "one",
        callback: (event, target, dialog) => {
          const values = {};
          for (const field of fields) {
            const field_id = field.id || field.label;
            values[field_id] = dialog.element.querySelector(
              `#input_${field_id}`,
            ).value;
          }
          callback(values);
        },
      },
      {
        label: "Cancel",
        action: "two",
      },
    ],
  });
}

/**
 * Gets the first targeted token
 */
export function get_targeted_token() {
  /**
   * Sets the difficulty as the parry value of the targeted
   * or selected token
   */
  const targets = game.user.targets;
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
  let condition = actor.effects.find((ef) => {
    return ef.statuses.has(condition_id);
  });
  if (!condition) {
    condition = await actor.toggleStatusEffect(condition_id, { active: true });
  }
  await condition.update({
    ["duration.startRound"]: game.combat ? game.combat.round : 0,
    ["duration.startTurn"]: game.combat ? game.combat.turn : 0,
  });
}

export function addEventListenerAll(
  html,
  selector,
  type,
  listener,
  useCapture = false,
) {
  html.querySelectorAll(selector).forEach((e) => {
    e.addEventListener(type, listener, useCapture);
  });
}

function measurePath(waypoints) {
  const use_grid_calc = SettingsUtils.getWorldSetting("range_calc_grid");
  const path = canvas.grid.measurePath(waypoints);
  return use_grid_calc ? path.distance : path.euclidean;
}

function getTokenGridSpaces(token) {
  const gridSpaces = [];
  if (canvas.grid.isGridless) {
    //If we have a gridless grid, divide our token into 1" sections based on the grid size
    //We'll use those as our occupied "spaces" even though there are none
    const halfGrid = canvas.grid.size;
    const start = {
      x: token.bounds.left + halfGrid,
      y: token.bounds.top + halfGrid,
    };
    const dimensions = {
      width: Math.round(token.document.width),
      height: Math.round(token.document.height),
    };

    for (let i = 0; i < dimensions.width; ++i) {
      for (let j = 0; j < dimensions.height; ++j) {
        const coords = {
          x: start.x + i * canvas.grid.sizeX,
          y: start.y + j * canvas.grid.sizeY,
        };
        gridSpaces.push({ coords });
      }
    }
  } else {
    for (const space of token.document.getOccupiedGridSpaceOffsets()) {
      gridSpaces.push({ coords: canvas.grid.getCenterPoint(space) });
    }
  }
  return gridSpaces;
}

export function measureDistance(tokenA, tokenB) {
  if (!tokenA || !tokenB) {
    ui.notifications.error("measureDistance requires two tokens");
    return 0;
  }

  const tokenAGridSpaces = getTokenGridSpaces(tokenA);
  const tokenBGridSpaces = getTokenGridSpaces(tokenB);

  const distSq = function (a, b) {
    return Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2);
  };

  const closestPair = { a: null, b: null };
  for (const tokenASpace of tokenAGridSpaces) {
    for (const tokenBSpace of tokenBGridSpaces) {
      const dist = distSq(tokenASpace.coords, tokenBSpace.coords);
      if (!closestPair.a) {
        //If we don't have a closest pair yet, use this one
        closestPair.a = tokenASpace;
        closestPair.b = tokenBSpace;
        closestPair.dist = dist;
        continue;
      }

      if (dist < closestPair.dist) {
        //This pair is closer than our previous pair
        closestPair.a = tokenASpace;
        closestPair.b = tokenBSpace;
        closestPair.dist = dist;
      }
    }
  }
  let measured_distance = measurePath([
    closestPair.a.coords,
    closestPair.b.coords,
  ]);
  if (SettingsUtils.getWorldSetting("measure_from_edge")) {
    measured_distance -= game.scenes.current.grid.distance;
  }
  return measured_distance;
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

    const setting = {};
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

    const setting = {};
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

  //Compares lhs and rhs for equality
  //This pulls operators from rhs for the comparison or defaults to === if none is present
  static check_equality_with_operators(lhs, rhs) {
    const [, op = "===", raw] = String(rhs).match(/^\s*(>=|<=|!==|===|!=|==|=|>|<)?\s*(.*)$/);
    const val = raw.trim();

    const rhsVal =
      val === "true" && typeof lhs === "boolean" ? true :
      val === "false" && typeof lhs === "boolean" ? false :
      val !== "" && !isNaN(val) ? +val :
      val;

    if ([">", "<", ">=", "<="].includes(op)) {
      const a = typeof lhs === "number" ? lhs : NaN;
      const b = typeof rhsVal === "number" ? rhsVal : NaN;
      return !Number.isNaN(a) && !Number.isNaN(b) && { ">": a > b, ">=": a >= b, "<": a < b, "<=": a <= b }[op];
    }

    return {
      "==": lhs == rhsVal,
      "=": lhs == rhsVal,
      "!=": lhs != rhsVal,
      "===": lhs === rhsVal,
      "!==": lhs !== rhsVal
    }[op];
  }
}
