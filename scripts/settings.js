
import * as BRSW2_CONFIG from "./brsw2-config.js";
import { ModifierSettingsConfiguration } from "./chat_modifers_names.js";
import { SystemGlobalConfiguration, WorldGlobalActions } from "./global_actions.js";
import { OptionalRulesConfiguration } from "./optional_rules.js";
import { SettingsConfig } from "./settings_config.js";
import { SettingsUtils } from "./utils.js";


export function registerSettings() {

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
    SettingsUtils.registerSetting(BRSW2_CONFIG.SETTING_KEYS.worldSettings, {
        name: "World Settings",
        hint: "Collection of world settings",
        scope: "world",
        type: Object,
        default: BRSW2_CONFIG.WORLD_SETTINGS,
    });

    SettingsUtils.registerSetting(BRSW2_CONFIG.SETTING_KEYS.disabledSystemActions, {
        default: [],
        type: Array,
        scope: "world",
        config: false,
    });

    SettingsUtils.registerSetting(BRSW2_CONFIG.SETTING_KEYS.enabledOptionalRules, {
        default: [],
        type: Array,
        scope: "world",
        config: false,
    });

    SettingsUtils.registerSetting(BRSW2_CONFIG.SETTING_KEYS.worldGlobalActions, {
        default: [],
        type: Array,
        config: false,
        scope: "world",
    });

    SettingsUtils.registerSetting(BRSW2_CONFIG.SETTING_KEYS.chatModifiersName, {
        name: "Chat Modifiers Names",
        hint: "",
        default: { GM: "", Trait: "", Damage: "", ROF: "" },
        scope: "world",
        type: Object,
        config: false,
    });

    SettingsUtils.registerSetting(BRSW2_CONFIG.SETTING_KEYS.telemetryOptOut, {
        name: game.i18n.localize("BRSW.Settings.TelemetryOptOut.Name"),
        hint: game.i18n.localize("BRSW.Settings.TelemetryOptOut.Hint"),
        scope: "user",
        type: Boolean,
        default: false,
        config: true,
    });

    SettingsUtils.registerSetting(BRSW2_CONFIG.SETTING_KEYS.telemetryWorldInstallId, {
        scope: "world",
        type: String,
        default: "",
        config: false,
    });

    registerWorldSettings();
    registerUserSettings();
}

function registerWorldSettings() {
    const clickActionChoices = {
        system: game.i18n.localize("BRSW.ClickActionTypes.DefaultSystemRoll"),
        card: game.i18n.localize("BRSW.ClickActionTypes.ShowBetterrollsCard"),
        dialog: game.i18n.localize("BRSW.ClickActionTypes.ShowDialog"),
        trait: game.i18n.localize("BRSW.ClickActionTypes.ShowCardAndTrait"),
        trait_damage: game.i18n.localize("BRSW.ClickActionTypes.ShowCardDamage"),
    };

    SettingsUtils.registerBR2WorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.clickActionKeys.click, {
        name: game.i18n.localize("BRSW.Settings.SingleClickAction.Name"),
        hint: game.i18n.localize("BRSW.Settings.SingleClickAction.Hint"),
        default: "card",
        type: String,
        choices: clickActionChoices,
    });

    SettingsUtils.registerBR2WorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.clickActionKeys.shiftClick, {
        name: game.i18n.localize("BRSW.Settings.ShiftClickAction.Name"),
        hint: game.i18n.localize("BRSW.Settings.ShiftClickAction.Hint"),
        default: "system",
        type: String,
        choices: clickActionChoices,
    });

    SettingsUtils.registerBR2WorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.clickActionKeys.ctrlClick, {
        name: game.i18n.localize("BRSW.Settings.ControlClickAction.Name"),
        hint: game.i18n.localize("BRSW.Settings.ControlClickAction.Hint"),
        default: "trait",
        type: String,
        choices: clickActionChoices,
    });

    SettingsUtils.registerBR2WorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.clickActionKeys.altClick, {
        name: game.i18n.localize("BRSW.Settings.AltClickAction.Name"),
        hint: game.i18n.localize("BRSW.Settings.AltClickAction.Hint"),
        default: "system",
        type: String,
        choices: clickActionChoices,
    });

    SettingsUtils.registerBR2WorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.resultCard, {
        name: game.i18n.localize("BRSW.Settings.ResultCardVisibility.Name"),
        hint: game.i18n.localize("BRSW.Settings.ResultCardVisibility.Hint"),
        default: "all",
        type: String,
        choices: {
            master: game.i18n.localize("BRSW.VisibilityTypes.Owners"),
            all: game.i18n.localize("BRSW.VisibilityTypes.Everybody"),
        },
    });

    SettingsUtils.registerBR2WorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.defaultAmmoManagement, {
        name: game.i18n.localize("BRSW.Settings.AmmoManagement.Name"),
        hint: game.i18n.localize("BRSW.Settings.AmmoManagement.Hint"),
        default: true,
        scope: "world",
        type: Boolean,
        config: true,
    });

    SettingsUtils.registerBR2WorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.defaultPPManagement, {
        name: game.i18n.localize("BRSW.Settings.PPManagement.Name"),
        hint: game.i18n.localize("BRSW.Settings.PPManagement.Hint"),
        default: true,
        type: Boolean,
    });

    const modifiersSourceChoices = {
        swade: game.i18n.localize("BRSW.PPModSources.DefaultSWADE"),
        fc: game.i18n.localize("BRSW.PPModSources.FantasyCompanion"),
        swpf: game.i18n.localize("BRSW.PPModSources.Pathfinder"),
    };

    SettingsUtils.registerBR2WorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.genericPPModifiersSource, {
        name: game.i18n.localize("BRSW.Settings.PowerModifiersSource.Name"),
        hint: game.i18n.localize("BRSW.Settings.PowerModifiersSource.Hint"),
        default: "swade",
        type: String,
        choices: modifiersSourceChoices,
    });

    SettingsUtils.registerBR2WorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.hideWeaponActions, {
        name: game.i18n.localize("BRSW.Settings.HideWeaponActions.Name"),
        hint: game.i18n.localize("BRSW.Settings.HideWeaponActions.Hint"),
        default: false,
        type: Boolean,
    });

    SettingsUtils.registerBR2WorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.disableGangUp, {
        name: game.i18n.localize("BRSW.Settings.DisableGangUp.Name"),
        hint: game.i18n.localize("BRSW.Settings.DisableGangUp.Hint"),
        default: false,
        type: Boolean,
    });

    SettingsUtils.registerBR2WorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.ppChangeCardBehaviour, {
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

    SettingsUtils.registerBR2WorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.swdUnshake, {
        name: game.i18n.localize("BRSW.Settings.SWDUnshake.Name"),
        hint: game.i18n.localize("BRSW.Settings.SWDUnshake.Hint"),
        default: false,
        type: Boolean,
    });

    SettingsUtils.registerBR2WorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.autoStatusCards, {
        name: game.i18n.localize("BRSW.Settings.AutoStatusCards.Name"),
        hint: game.i18n.localize("BRSW.Settings.AutoStatusCards.Hint"),
        default: true,
        type: Boolean,
        requiresReload: true,
    });

    SettingsUtils.registerBR2WorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.rangeCalcGrid, {
        name: game.i18n.localize("BRSW.Settings.RangeCalcUseGrid.Name"),
        hint: game.i18n.localize("BRSW.Settings.RangeCalcUseGrid.Hint"),
        default: true,
        scope: "world",
        type: Boolean,
    });

    SettingsUtils.registerBR2WorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.undeadIgnoresIllumination, {
        name: game.i18n.localize("BRSW.Settings.UndeadIgnoresIllumination.Name"),
        hint: game.i18n.localize("BRSW.Settings.UndeadIgnoresIllumination.Hint"),
        default: false,
        type: Boolean,
    });

    SettingsUtils.registerBR2WorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.disableForActions, {
        name: game.i18n.localize("BRSW.Settings.DisableActions.Name"),
        hint: game.i18n.localize("BRSW.Settings.DisableActions.Hint"),
        default: false,
        type: Boolean,
    });

    SettingsUtils.registerBR2WorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.useSystemInjuryTable, {
        name: game.i18n.localize("BRSW.Settings.UseSystemInjuryTable.Name"),
        hint: game.i18n.localize("BRSW.Settings.UseSystemInjuryTable.Hint"),
        default: false,
        type: Boolean,
    });

    SettingsUtils.registerBR2WorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.showPPShotsInfo, {
        name: "BRSW.Settings.ShowPPShots.Name",
        label: "BRSW.Settings.ShowPPShots.Label",
        hint: "BRSW.Settings.ShowPPShots.Hint",
        type: Boolean,
        default: true,
    });

    SettingsUtils.registerBR2WorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.autoCheckExtraCritFailures, {
        name: "BRSW.Settings.AutoCheckExtraCritFailures.Name",
        hint: "BRSW.Settings.AutoCheckExtraCritFailures.Hint",
        type: Boolean,
        default: true,
    });

    SettingsUtils.registerBR2WorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.measureFromEdge, {
        name: "BRSW.Settings.MeasureFromEdge.Name",
        hint: "BRSW.Settings.MeasureFromEdge.Hint",
        type: Boolean,
        default: false,
        type: Boolean,
    });

    //Update our cached world settings with our saved data
    const worldSettings = SettingsUtils.getSetting(BRSW2_CONFIG.SETTING_KEYS.worldSettings);
    if (worldSettings) {
        for (const key in BRSW2_CONFIG.WORLD_SETTINGS) {
            if (worldSettings[key] !== undefined) {
                BRSW2_CONFIG.WORLD_SETTINGS[key].value = worldSettings[key].value;
            }
        }
    }
}

function registerUserSettings() {

    //Register BR2 user settings
    SettingsUtils.registerBR2UserSetting(BRSW2_CONFIG.USER_SETTING_KEYS.defaultRateOfFire, {
        name: game.i18n.localize("BRSW.Settings.DefaultRateOfFire.Name"),
        hint: game.i18n.localize("BRSW.Settings.DefaultRateOfFire.Hint"),
        default: "single_shot",
        type: String,
        choices: {
            single_shot: game.i18n.localize("BRSW.ROFTypes.SingleShot"),
            max_rof: game.i18n.localize("BRSW.ROFTypes.Max"),
        },
    });

    SettingsUtils.registerBR2UserSetting(BRSW2_CONFIG.USER_SETTING_KEYS.expandResults, {
        name: game.i18n.localize("BRSW.Settings.ExpandResults.Name"),
        hint: game.i18n.localize("BRSW.Settings.ExpandResults.Hint"),
        default: false,
        type: Boolean,
    });

    SettingsUtils.registerBR2UserSetting(BRSW2_CONFIG.USER_SETTING_KEYS.expandRolls, {
        name: game.i18n.localize("BRSW.Settings.ExpandRolls.Name"),
        hint: game.i18n.localize("BRSW.Settings.ExpandRolls.Hint"),
        default: false,
        scope: "world",
        type: Boolean,
        config: true,
    });

    SettingsUtils.registerBR2UserSetting(BRSW2_CONFIG.USER_SETTING_KEYS.expandDescriptions, {
        name: game.i18n.localize("BRSW.Settings.ExpandDescriptions.Name"),
        hint: game.i18n.localize("BRSW.Settings.ExpandDescriptions.Hint"),
        default: false,
        scope: "world",
        type: Boolean,
        config: true,
    });

    SettingsUtils.registerBR2UserSetting(BRSW2_CONFIG.USER_SETTING_KEYS.autoPopoutChat, {
        name: "BRSW.Settings.PopoutChat.Name",
        hint: "BRSW.Settings.PopoutChat.Hint",
        default: true,
        type: Boolean,
    });
}

export function updateCachedUserSettings() {
    //Update our cached user settings from the user's flags
    const userSettings = SettingsUtils.getModuleFlag(game.user, BRSW2_CONFIG.USER_FLAGS.userSettings);
    if (userSettings) {
        for (const key in BRSW2_CONFIG.USER_SETTINGS) {
            if (userSettings[key] !== undefined) {
                BRSW2_CONFIG.USER_SETTINGS[key].value = userSettings[key].value;
            }
        }
    }
}

// Settings related to Dice So Nice.

export function registerDSNSettings() {
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