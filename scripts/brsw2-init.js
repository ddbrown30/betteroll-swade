// Init scripts for version 2
/* globals Hooks, console, game, loadTemplates, Token, renderTemplate,
    Macro, CONFIG, foundry, Item, ModuleManagement, $ */
import {
  activate_common_listeners,
  BRSW_CONST,
  get_action_from_click,
  expose_card_class,
} from "./cards_common.js";
import {
  attribute_card_hooks,
  activate_attribute_listeners,
  activate_attribute_card_listeners,
} from "./attribute_card.js";
import {
  skill_card_hooks,
  activate_skill_listeners,
  activate_skill_card_listeners,
} from "./skill_card.js";
import {
  activate_item_listeners,
  expose_item_functions,
  activate_item_card_listeners,
} from "./item_card.js";
import { activate_vehicle_listeners } from "./vehicle_card.js";
import { activate_damage_card_listeners } from "./damage_card.js";
import { SettingsConfig } from "./settings_config.js";
import {
  register_actions,
  register_gm_actions_settings,
  SystemGlobalConfiguration,
  WorldGlobalActions,
  expose_global_actions_functions,
} from "./global_actions.js";
import {
  activate_incapacitation_card_listeners,
  incapacitation_card_hooks,
} from "./incapacitation_card.js";
import { OptionalRulesConfiguration } from "./optional_rules.js";
import { activate_remove_status_card_listeners } from "./remove_status_cards.js";
import { create_unshaken_wrapper, create_unstun_wrapper } from "./combat.js";
import { ModifierSettingsConfiguration } from "./chat_modifers_names.js";
import { setup_dialog } from "./card-dialog.js";
import { SettingsUtils, measureDistance } from "./utils.js";
import {
  SETTING_KEYS,
  USER_FLAGS,
  USER_SETTINGS,
  WORLD_SETTINGS,
} from "./brsw2-config.js";
import { BrCommonCard } from "./BrCommonCard.js";
import { setup_chat_button } from "./gm_actions.js";

// Init Hook
Hooks.on(`init`, () => {
  game.brsw = {};
  game.brsw.CONST = {};
  game.brsw.cascade_count = 0;
  game.brsw.get_action_from_click = get_action_from_click;
  game.brsw.measureDistance = measureDistance;
  register_settings_version2();
  register_actions();
  register_gm_actions_settings();
});

// Base Hook
Hooks.on(`ready`, () => {
  //Update our cached user settings from the user's flags
  const user_settings = SettingsUtils.getModuleFlag(
    game.user,
    USER_FLAGS.user_settings,
  );

  if (user_settings) {
    for (const key in USER_SETTINGS) {
      if (user_settings[key] !== undefined) {
        USER_SETTINGS[key].value = user_settings[key].value;
      }
    }
  }
  // Create a base object to hook functions
  attribute_card_hooks();
  skill_card_hooks();
  expose_item_functions();
  expose_global_actions_functions();
  expose_card_class();
  incapacitation_card_hooks();
  setup_chat_button();
  // Load partials.
  const templatePaths = [
    "modules/betterrolls-swade2/templates/common_card_header.hbs",
    "modules/betterrolls-swade2/templates/trait_roll_partial.hbs",
    "modules/betterrolls-swade2/templates/trait_result_partial.hbs",
    "modules/betterrolls-swade2/templates/damage_partial.hbs",
    "modules/betterrolls-swade2/templates/actions_partial.hbs",
    "modules/betterrolls-swade2/templates/card_dialog.hbs",
    "modules/betterrolls-swade2/templates/action_section_partial.hbs",
    "modules/betterrolls-swade2/templates/setting_partial.hbs",
  ];
  foundry.applications.handlebars.loadTemplates(templatePaths).then(() => {
    console.info("Better Rolls templates preloaded");
  });
  Handlebars.registerHelper(`br2-cap`, s => s && String(s[0]).toUpperCase() + String(s).slice(1));
  // Add a hook to control combat flow.
  if (SettingsUtils.getWorldSetting("auto-status-cards")) {
    game.swade.effectCallbacks.set("shaken", create_unshaken_wrapper);
    game.swade.effectCallbacks.set("stunned", create_unstun_wrapper);
  }
  compatibility_warnings();
  setup_dialog();
  // Remove the first hook from the hotbarDrop, hoping it is the system's
  const system_event = Hooks.events.hotbarDrop.find(
    (ev) => ev.fn.name === "onHotbarDrop",
  );
  Hooks.off("hotbarDrop", system_event.fn);
  console.info("Better Rolls 2 for SWADE | Ready");
  Hooks.callAll("brswReady");
});

// Hooks on render

function activateCardListeners(card, html, message) {
  activate_common_listeners(card, html);
  if (card.type === BRSW_CONST.TYPE_ATTRIBUTE_CARD) {
    activate_attribute_card_listeners(card, html);
  } else if (card.type === BRSW_CONST.TYPE_SKILL_CARD) {
    activate_skill_card_listeners(card, html);
  } else if (card.type === BRSW_CONST.TYPE_ITEM_CARD) {
    activate_item_card_listeners(card, html);
  } else if (card.type === BRSW_CONST.TYPE_DMG_CARD) {
    activate_damage_card_listeners(message, html);
  } else if (card.type === BRSW_CONST.TYPE_INC_CARD) {
    activate_incapacitation_card_listeners(message, html);
  } else if (
    card.type === BRSW_CONST.TYPE_UNSHAKE_CARD ||
    card.type === BRSW_CONST.TYPE_UNSTUN_CARD
  ) {
    activate_remove_status_card_listeners(card, html, card.type);
  }
}

Hooks.on("renderChatMessageHTML", (message, html, options) => {
  const br_card = message.getFlag("betterrolls-swade2", "br_data");
  if (br_card) {
    // This chat card is one of ours
    const card = new BrCommonCard(message);
    activateCardListeners(card, html, message);
    // Hide forms to non-master, non owner
    if (!message.isOwner) {
      html
        .querySelectorAll(".brsw-form")
        .forEach((e) => e.classList.add("brsw-collapsed"));
    }
    // Hide master only sections
    if (!game.user.isGM) {
      html.querySelectorAll(".brsw-master-only").forEach((e) => e.remove());
    }
    // Hide save macro button from non-owner, non-trusted players
    if (!message.isOwner && !game.user.isTrusted) {
      html
        .querySelectorAll(".brsw-owner-trusted-only")
        .forEach((e) => e.remove());
    }
    if (Object.keys(message.apps).length < 1) {
      // Don't create popout when rendering popouts.
      card.create_popout();
    }
    // Scroll the chat to the bottom if this is the last message
    if (game.messages.contents[game.messages.contents.length - 1] === message) {
      const chat_bar = document.querySelector(".chat-log");
      if (chat_bar) {
        const rect = chat_bar.getBoundingClientRect();
        if (chat_bar.scrollHeight - rect.height * 2 < chat_bar.scrollTop) {
          chat_bar.scrollTop = chat_bar.scrollHeight;
        }
      }
    }
    Hooks.call("BRSW-CardRendered", card);
  }
});

// Addon by JuanV, make attack target possible by drag and drop
Hooks.on("dropCanvasData", (canvas, item) => {
  if (item.type === "Item" || item.type === "target_click") {
    const grid_size = canvas.scene.grid.size;
    const square_size = grid_size * 0.3;
    canvas.tokens.targetObjects({
      x: item.x - square_size / 2,
      y: item.y - square_size / 2,
      height: square_size,
      width: square_size,
    });
    if (game.user.targets.size) {
      if (item.type === "Item") {
        Item.implementation.fromDropData(item).then((item) => {
          let token_id;
          let actor_id;
          if (item.parent.parent) {
            token_id = item.parent.parent.id;
            actor_id = item.parent.parent.actorId;
          } else {
            actor_id = item.parent.id;
          }
          const command = create_macro_command(item, actor_id, token_id);
          eval("(async () => {" + command + "})()");
        });
      } else if (item.type === "target_click") {
        const selector = `[data-message-id="${item.message_id}"] #${item.tag_id}`;
        document.querySelector(selector).click();
      }
    }
  }
});

function create_macro_command(data, actor_id, token_id) {
  const bt = "`";
  return `
            let behaviour = game.brsw.get_action_from_click(event);
            if (behaviour === 'system') {
                game.swade.rollItemMacro(${bt}${data.name}${bt});
                return;
            }
            let message;
            if (${data.type === "skill"}) {
                message = await game.brsw.create_skill_card_from_id('${token_id}', '${actor_id}', '${
                  data._id
                }');
            } else {
                message = await game.brsw.create_item_card_from_id('${token_id}', '${actor_id}', '${
                  data._id
                }');
            }
            if (event) {
                if (behaviour.includes('trait')) {
                    if (${data.type === "skill"}) {
                        game.brsw.roll_skill(message, $(message.content), false)
                    } else {
                        game.brsw.roll_item(message, $(message.content), false, behaviour.includes('damage'))
                    }
                }
            }
        `;
}

function create_attribute_macro(data) {
  return `
    let behaviour = game.brsw.get_action_from_click(event);
    if (behaviour === 'system') {
      game.swade.rollItemMacro("${data.attribute}");
    } else {
      origin = await fromUuid("${data.uuid}");
      const br_card = await game.brsw.create_atribute_card(origin, "${data.attribute}");
      if (behaviour.includes('trait')) {
        game.brsw.roll_attribute(br_card, false);
      }
    }
  `;
}

Hooks.on("hotbarDrop", (bar, data, slot) => {
  if (data.type === "Item") {
    Item.implementation.fromDropData(data).then((data) => {
      let token_id;
      let actor_id;
      if (data.parent.parent) {
        token_id = data.parent.parent.id;
        actor_id = data.parent.parent.actorId;
      } else {
        actor_id = data.parent.id;
      }
      const command = create_macro_command(data, actor_id, token_id);
      Macro.create({
        name: data?.name,
        type: "script",
        img: data?.img,
        command: command,
        scope: "global",
      }).then((macro) => {
        game.user.assignHotbarMacro(macro, slot);
      });
    });
    return false;
  } else if (data.type === "Attribute") {
    const command = create_attribute_macro(data);
    Macro.create({
      name: data.attribute,
      type: "script",
      img: "systems/swade/assets/icons/attribute.svg",
      command: command,
      scope: "global",
    }).then((macro) => {
      game.user.assignHotbarMacro(macro, slot);
    });
  }
  return true;
});

// Hooks for Dice So Nice
Hooks.once("diceSoNiceReady", () => {
  register_dsn_settings();
});

// Character sheet hooks

["SwadeNPCSheet"].forEach((name) => {
  Hooks.on("render" + name, (app, html, _) => {
    activate_attribute_listeners(app, html[0]);
    activate_skill_listeners(app, html[0]);
    activate_item_listeners(app, html[0]);
  });
});

["SwadeActorSheetV2"].forEach((name) => {
  Hooks.on("render" + name, (app, html, _) => {
    activate_attribute_listeners(app, html);
    activate_skill_listeners(app, html);
    activate_item_listeners(app, html);
  });
});

["renderSwadeVehicleSheet", "renderSwadeVehicleSheetV2"].forEach((name) => {
  Hooks.on(name, (app, html, _) => {
    activate_vehicle_listeners(app, html);
  });
});

// Settings

function register_world_settings() {
  const br_choices = {
    system: game.i18n.localize("BRSW.ClickActionTypes.DefaultSystemRoll"),
    card: game.i18n.localize("BRSW.ClickActionTypes.ShowBetterrollsCard"),
    dialog: game.i18n.localize("BRSW.ClickActionTypes.ShowDialog"),
    trait: game.i18n.localize("BRSW.ClickActionTypes.ShowCardAndTrait"),
    trait_damage: game.i18n.localize("BRSW.ClickActionTypes.ShowCardDamage"),
  };
  SettingsUtils.registerBR2WorldSetting("click", {
    name: game.i18n.localize("BRSW.Settings.SingleClickAction.Name"),
    hint: game.i18n.localize("BRSW.Settings.SingleClickAction.Hint"),
    default: "card",
    type: String,
    choices: br_choices,
  });
  SettingsUtils.registerBR2WorldSetting("shift_click", {
    name: game.i18n.localize("BRSW.Settings.ShiftClickAction.Name"),
    hint: game.i18n.localize("BRSW.Settings.ShiftClickAction.Hint"),
    default: "system",
    type: String,
    choices: br_choices,
  });
  SettingsUtils.registerBR2WorldSetting("ctrl_click", {
    name: game.i18n.localize("BRSW.Settings.ControlClickAction.Name"),
    hint: game.i18n.localize("BRSW.Settings.ControlClickAction.Hint"),
    default: "trait",
    type: String,
    choices: br_choices,
  });
  SettingsUtils.registerBR2WorldSetting("alt_click", {
    name: game.i18n.localize("BRSW.Settings.AltClickAction.Name"),
    hint: game.i18n.localize("BRSW.Settings.AltClickAction.Hint"),
    default: "system",
    type: String,
    choices: br_choices,
  });
  SettingsUtils.registerBR2WorldSetting("no-action-message", {
    name: game.i18n.localize("BRSW.Settings.NoActionMessage.Name"),
    hint: game.i18n.localize("BRSW.Settings.NoActionMessage.Hint"),
    default: game.i18n.localize("BRSW.NoActionsSelected"),
    type: String,
  });
  SettingsUtils.registerBR2WorldSetting("result-card", {
    name: game.i18n.localize("BRSW.Settings.ResultCardVisibility.Name"),
    hint: game.i18n.localize("BRSW.Settings.ResultCardVisibility.Hint"),
    default: "all",
    type: String,
    choices: {
      master: game.i18n.localize("BRSW.VisibilityTypes.Owners"),
      all: game.i18n.localize("BRSW.VisibilityTypes.Everybody"),
    },
  });
  SettingsUtils.registerBR2WorldSetting("default-ammo-management", {
    name: game.i18n.localize("BRSW.Settings.AmmoManagement.Name"),
    hint: game.i18n.localize("BRSW.Settings.AmmoManagement.Hint"),
    default: true,
    scope: "world",
    type: Boolean,
    config: true,
  });
  SettingsUtils.registerBR2WorldSetting("default-pp-management", {
    name: game.i18n.localize("BRSW.Settings.PPManagement.Name"),
    hint: game.i18n.localize("BRSW.Settings.PPManagement.Hint"),
    default: true,
    type: Boolean,
  });
  const modifiers_source_choices = {
    swade: game.i18n.localize("BRSW.PPModSources.DefaultSWADE"),
    fc: game.i18n.localize("BRSW.PPModSources.FantasyCompanion"),
    swpf: game.i18n.localize("BRSW.PPModSources.Pathfinder"),
  };
  SettingsUtils.registerBR2WorldSetting("generic-pp-modifiers-source", {
    name: game.i18n.localize("BRSW.Settings.PowerModifiersSource.Name"),
    hint: game.i18n.localize("BRSW.Settings.PowerModifiersSource.Hint"),
    default: "swade",
    type: String,
    choices: modifiers_source_choices,
  });
  SettingsUtils.registerBR2WorldSetting("hide-weapon-actions", {
    name: game.i18n.localize("BRSW.Settings.HideWeaponActions.Name"),
    hint: game.i18n.localize("BRSW.Settings.HideWeaponActions.Hint"),
    default: false,
    type: Boolean,
  });
  SettingsUtils.registerBR2WorldSetting("disable-gang-up", {
    name: game.i18n.localize("BRSW.Settings.DisableGangUp.Name"),
    hint: game.i18n.localize("BRSW.Settings.DisableGangUp.Hint"),
    default: false,
    type: Boolean,
  });
  SettingsUtils.registerBR2WorldSetting("pp_change_card_behaviour", {
    name: game.i18n.localize("BRSW.Settings.PPChangeCardBehaviour.Name"),
    hint: game.i18n.localize("BRSW.Settings.PPChangeCardBehaviour.Hint"),
    default: "none",
    type: String,
    choices: {
      none: game.i18n.localize("BRSW.NoOne"),
      master_only: game.i18n.localize("BRSW.VisibilityTypes.Owners"),
      master_and_gm: game.i18n.localize("BRSW.VisibilityTypes.OwnersAndGM"),
      everybody: game.i18n.localize("BRSW.VisibilityTypes.Everybody"),
    },
  });
  SettingsUtils.registerBR2WorldSetting("swd-unshake", {
    name: game.i18n.localize("BRSW.Settings.SWDUnshake.Name"),
    hint: game.i18n.localize("BRSW.Settings.SWDUnshake.Hint"),
    default: false,
    type: Boolean,
  });
  SettingsUtils.registerBR2WorldSetting("auto-status-cards", {
    name: game.i18n.localize("BRSW.Settings.AutoStatusCards.Name"),
    hint: game.i18n.localize("BRSW.Settings.AutoStatusCards.Hint"),
    default: true,
    type: Boolean,
    requiresReload: true,
  });
  SettingsUtils.registerBR2WorldSetting("range_calc_grid", {
    name: game.i18n.localize("BRSW.Settings.RangeCalcUseGrid.Name"),
    hint: game.i18n.localize("BRSW.Settings.RangeCalcUseGrid.Hint"),
    default: false,
    scope: "world",
    type: Boolean,
  });
  SettingsUtils.registerBR2WorldSetting("undeadIgnoresIllumination", {
    name: game.i18n.localize("BRSW.Settings.UndeadIgnoresIllumination.Name"),
    hint: game.i18n.localize("BRSW.Settings.UndeadIgnoresIllumination.Hint"),
    default: false,
    type: Boolean,
  });
  SettingsUtils.registerBR2WorldSetting("disable_for_actions", {
    name: game.i18n.localize("BRSW.Settings.DisableActions.Name"),
    hint: game.i18n.localize("BRSW.Settings.DisableActions.Hint"),
    default: false,
    type: Boolean,
  });
  SettingsUtils.registerBR2WorldSetting("use_system_injury_table", {
    name: game.i18n.localize("BRSW.Settings.UseSystemInjuryTable.Name"),
    hint: game.i18n.localize("BRSW.Settings.UseSystemInjuryTable.Hint"),
    default: false,
    type: Boolean,
  });
  SettingsUtils.registerBR2WorldSetting("max_tooltip_length", {
    name: "BRSW.Settings.MaxTooltipLength.Name",
    label: "BRSW.Settings.MaxTooltipLength.Label",
    hint: "BRSW.Settings.MaxTooltipLength.Hint",
    type: Number,
    default: 500,
  });
  SettingsUtils.registerBR2WorldSetting("show_pp_shots_info", {
    name: "BRSW.Settings.ShowPPShots.Name",
    label: "BRSW.Settings.ShowPPShots.Label",
    hint: "BRSW.Settings.ShowPPShots.Hint",
    type: Boolean,
    default: true,
  });
  SettingsUtils.registerBR2WorldSetting(SETTING_KEYS.auto_check_extra_fumbles, {
    name: "BRSW.Settings.AutoCheckFumbles.Name",
    hint: "BRSW.Settings.AutoCheckFumbles.Hint",
    type: Boolean,
    default: true,
  });
  SettingsUtils.registerBR2WorldSetting("measure_from_edge", {
    name: "BRSW.Settings.MeasureFromEdge.Name",
    hint: "BRSW.Settings.MeasureFromEdge.Hint",
    type: Boolean,
    default: false,
    type: Boolean,
  });
}

function register_settings_version2() {
  //Register menus
  SettingsUtils.registerMenu("settings", {
    name: "Configure Settings",
    hint: "",
    label: "Settings",
    icon: "fas fa-cog",
    type: SettingsConfig,
  });
  SettingsUtils.registerMenu("system_global_actions", {
    name: "BRSW.Settings.SystemGlobalMenu.Name",
    label: "BRSW.Settings.SystemGlobalMenu.Label",
    hint: "BRSW.Settings.SystemGlobalMenu.Hint",
    type: SystemGlobalConfiguration,
  });
  SettingsUtils.registerMenu("world_global-Menus", {
    name: "BRSW.Settings.WorldGlobalMenu.Name",
    label: "BRSW.Settings.WorldGlobalMenu.Label",
    hint: "BRSW.Settings.WorldGlobalMenu.Hint",
    type: WorldGlobalActions,
  });
  SettingsUtils.registerMenu("optional_rules", {
    name: "BRSW.Settings.OptionalRules.Name",
    label: "BRSW.Settings.OptionalRules.Label",
    hint: "BRSW.Settings.OptionalRules.Hint",
    type: OptionalRulesConfiguration,
  });
  SettingsUtils.registerMenu("chat_modifiers_menu", {
    name: "BRSW.Settings.ChatModifiersMenu.Name",
    label: "BRSW.Settings.ChatModifiersMenu.Name",
    hint: "BRSW.Settings.ChatModifiersMenu.Hint",
    type: ModifierSettingsConfiguration,
  });

  // Register core settings. These should be config:false settings only. Everything else should be a world or user setting
  SettingsUtils.registerSetting(SETTING_KEYS.world_settings, {
    name: "World Settings",
    hint: "Collection of world settings",
    scope: "world",
    type: Object,
    default: WORLD_SETTINGS,
  });
  SettingsUtils.registerSetting("system_action_disabled", {
    name: "System_Actions_disabled",
    default: [],
    type: Array,
    scope: "world",
    config: false,
  });
  SettingsUtils.registerSetting("optional_rules_enabled", {
    name: "Optional rules enabled",
    default: [],
    type: Array,
    scope: "world",
    config: false,
  });
  SettingsUtils.registerSetting("world_global_actions", {
    name: "World global actions",
    default: [],
    type: Array,
    config: false,
    scope: "world",
  });
  SettingsUtils.registerSetting("chat_modifiers_names", {
    name: "Chat Modifiers Names",
    hint: "",
    default: { GM: "", Trait: "", Damage: "", ROF: "" },
    scope: "world",
    type: Object,
    config: false,
  });
  register_world_settings();
  //Register BR2 user settings
  SettingsUtils.registerBR2UserSetting("default_rate_of_fire", {
    name: game.i18n.localize("BRSW.Settings.DefaultRateOfFire.Name"),
    hint: game.i18n.localize("BRSW.Settings.DefaultRateOfFire.Hint"),
    default: "single_shot",
    type: String,
    choices: {
      single_shot: game.i18n.localize("BRSW.ROFTypes.SingleShot"),
      max_rof: game.i18n.localize("BRSW.ROFTypes.Max"),
    },
  });
  SettingsUtils.registerBR2UserSetting("expand-results", {
    name: game.i18n.localize("BRSW.Settings.ExpandResults.Name"),
    hint: game.i18n.localize("BRSW.Settings.ExpandResults.Hint"),
    default: false,
    type: Boolean,
  });
  SettingsUtils.registerBR2UserSetting("expand-rolls", {
    name: game.i18n.localize("BRSW.Settings.ExpandRolls.Name"),
    hint: game.i18n.localize("BRSW.Settings.ExpandRolls.Hint"),
    default: false,
    scope: "world",
    type: Boolean,
    config: true,
  });
  SettingsUtils.registerBR2UserSetting("expand-descriptions", {
    name: game.i18n.localize("BRSW.Settings.ExpandDescriptions.Name"),
    hint: game.i18n.localize("BRSW.Settings.ExpandDescriptions.Hint"),
    default: false,
    scope: "world",
    type: Boolean,
    config: true,
  });
  SettingsUtils.registerBR2UserSetting("auto_popout_chat", {
    name: "BRSW.Settings.PopoutChat.Name",
    hint: "BRSW.Settings.PopoutChat.Hint",
    default: true,
    type: Boolean,
  });
  SettingsUtils.registerBR2UserSetting("popout_chat_button", {
    name: "BRSW.Settings.PopoutChatButton.Name",
    hint: "BRSW.Settings.PopoutChatButton.Hint",
    default: false,
    type: Boolean,
  });

  //Update our cached world settings with our saved data
  const world_settings = SettingsUtils.getSetting(SETTING_KEYS.world_settings);
  if (world_settings) {
    for (const key in WORLD_SETTINGS) {
      if (world_settings[key] !== undefined) {
        WORLD_SETTINGS[key].value = world_settings[key].value;
      }
    }
  }
}

// Settings related to Dice So Nice.

function register_dsn_settings() {
  const theme_choice = {};
  for (const theme in game.dice3d.exports.COLORSETS) {
    if (game.dice3d.exports.COLORSETS.hasOwnProperty(theme)) {
      theme_choice[theme] = theme;
    }
  }
  const damage_theme_choice = Object.assign({}, theme_choice);
  damage_theme_choice.None = "None";
  SettingsUtils.registerBR2UserSetting("damageDieTheme", {
    name: game.i18n.localize("BRSW.Settings.DamageDiceTheme.Name"),
    hint: game.i18n.localize("BRSW.Settings.DamageDiceTheme.Hint"),
    default: "None",
    type: String,
    choices: damage_theme_choice,
  });
}

//Compatibility warnings:
function compatibility_warnings() {
  if (game.modules.get("swade-tools")?.active) {
    new foundry.applications.api.DialogV2({
      window: { title: "BRSW.CompatibilityHeadline" },
      position: { width: 400 },
      content: `<p>${game.i18n.localize(
        "BRSW.SwadeToolsCompatibilityWarning",
      )}</p>`,
      buttons: [
        {
          label: "",
          icon: "fas fa-check",
          action: "one",
          callback: (_) => {
            new ModuleManagement().render(true);
          },
        },
      ],
    }).render(true);
  }
}
