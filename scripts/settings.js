
import { SETTING_KEYS, USER_FLAGS, USER_SETTINGS, USER_SETTING_KEYS, WORLD_SETTINGS, WORLD_SETTING_KEYS } from "./brsw2-config.js";
import { GlobalActionsMenu } from "./global-actions-menu.js";
import { SettingsConfig } from "./settings_config.js";
import { SettingsUtils } from "./utils.js";
import { WorldGlobalActions } from "./world-global-actions.js";


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
        type: GlobalActionsMenu,
    });

    SettingsUtils.registerMenu("world_global-Menus", {
        name: "BRSW.Settings.WorldGlobalMenu.Name",
        label: "BRSW.Settings.WorldGlobalMenu.Label",
        hint: "BRSW.Settings.WorldGlobalMenu.Hint",
        type: WorldGlobalActions,
    });

    // Register core settings. These should be config:false settings only. Everything else should be a world or user setting
    SettingsUtils.registerSetting(SETTING_KEYS.worldSettings, {
        name: "World Settings",
        hint: "Collection of world settings",
        scope: "world",
        type: Object,
        default: WORLD_SETTINGS,
    });

    SettingsUtils.registerSetting(SETTING_KEYS.disabledSystemActions, {
        default: [],
        type: Array,
        scope: "world",
        config: false,
    });

    SettingsUtils.registerSetting(SETTING_KEYS.enabledOptionalRules, {
        default: [],
        type: Array,
        scope: "world",
        config: false,
    });

    SettingsUtils.registerSetting(SETTING_KEYS.worldGlobalActions, {
        default: [],
        type: Array,
        config: false,
        scope: "world",
    });

    SettingsUtils.registerSetting(SETTING_KEYS.invalidWorldGlobalActions, {
        default: [],
        type: Array,
        config: false,
        scope: "world",
    });

    SettingsUtils.registerSetting(SETTING_KEYS.telemetryOptOut, {
        name: game.i18n.localize("BRSW.Settings.TelemetryOptOut.Name"),
        hint: game.i18n.localize("BRSW.Settings.TelemetryOptOut.Hint"),
        scope: "user",
        type: Boolean,
        default: false,
        config: true,
    });

    SettingsUtils.registerSetting(SETTING_KEYS.telemetryWorldInstallId, {
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
        card: game.i18n.localize("BRSW.ClickActionTypes.ShowBetterRollsCard"),
        dialog: game.i18n.localize("BRSW.ClickActionTypes.ShowDialog"),
        trait: game.i18n.localize("BRSW.ClickActionTypes.ShowCardAndTrait"),
        trait_damage: game.i18n.localize("BRSW.ClickActionTypes.ShowCardDamage"),
    };

    SettingsUtils.registerBR2WorldSetting(WORLD_SETTING_KEYS.clickActionKeys.click, {
        name: game.i18n.localize("BRSW.Settings.SingleClickAction.Name"),
        hint: game.i18n.localize("BRSW.Settings.SingleClickAction.Hint"),
        default: "card",
        type: String,
        choices: clickActionChoices,
    });

    SettingsUtils.registerBR2WorldSetting(WORLD_SETTING_KEYS.clickActionKeys.shiftClick, {
        name: game.i18n.localize("BRSW.Settings.ShiftClickAction.Name"),
        hint: game.i18n.localize("BRSW.Settings.ShiftClickAction.Hint"),
        default: "system",
        type: String,
        choices: clickActionChoices,
    });

    SettingsUtils.registerBR2WorldSetting(WORLD_SETTING_KEYS.clickActionKeys.ctrlClick, {
        name: game.i18n.localize("BRSW.Settings.ControlClickAction.Name"),
        hint: game.i18n.localize("BRSW.Settings.ControlClickAction.Hint"),
        default: "trait",
        type: String,
        choices: clickActionChoices,
    });

    SettingsUtils.registerBR2WorldSetting(WORLD_SETTING_KEYS.clickActionKeys.altClick, {
        name: game.i18n.localize("BRSW.Settings.AltClickAction.Name"),
        hint: game.i18n.localize("BRSW.Settings.AltClickAction.Hint"),
        default: "system",
        type: String,
        choices: clickActionChoices,
    });

    SettingsUtils.registerBR2WorldSetting(WORLD_SETTING_KEYS.resultCard, {
        name: game.i18n.localize("BRSW.Settings.ResultCardVisibility.Name"),
        hint: game.i18n.localize("BRSW.Settings.ResultCardVisibility.Hint"),
        default: "all",
        type: String,
        choices: {
            master: game.i18n.localize("BRSW.VisibilityTypes.GM"),
            all: game.i18n.localize("BRSW.VisibilityTypes.Everybody"),
        },
    });

    SettingsUtils.registerBR2WorldSetting(WORLD_SETTING_KEYS.defaultAmmoManagement, {
        name: game.i18n.localize("BRSW.Settings.AmmoManagement.Name"),
        hint: game.i18n.localize("BRSW.Settings.AmmoManagement.Hint"),
        default: true,
        scope: "world",
        type: Boolean,
        config: true,
    });

    SettingsUtils.registerBR2WorldSetting(WORLD_SETTING_KEYS.defaultPPManagement, {
        name: game.i18n.localize("BRSW.Settings.PPManagement.Name"),
        hint: game.i18n.localize("BRSW.Settings.PPManagement.Hint"),
        default: true,
        type: Boolean,
        group: "BRSW.Settings.PowersGroup",
    });

    SettingsUtils.registerBR2WorldSetting(WORLD_SETTING_KEYS.ppManagementPlayerChoice, {
        name: game.i18n.localize("BRSW.Settings.PPManagementPlayerChoice.Name"),
        hint: game.i18n.localize("BRSW.Settings.PPManagementPlayerChoice.Hint"),
        default: true,
        type: Boolean,
        group: "BRSW.Settings.PowersGroup",
    });

    const modifiersSourceChoices = {
        swade: game.i18n.localize("BRSW.PPModSources.DefaultSWADE"),
        fc: game.i18n.localize("BRSW.PPModSources.FantasyCompanion"),
        swpf: game.i18n.localize("BRSW.PPModSources.Pathfinder"),
    };

    SettingsUtils.registerBR2WorldSetting(WORLD_SETTING_KEYS.genericPPModifiersSource, {
        name: game.i18n.localize("BRSW.Settings.PowerModifiersSource.Name"),
        hint: game.i18n.localize("BRSW.Settings.PowerModifiersSource.Hint"),
        default: "swade",
        type: String,
        choices: modifiersSourceChoices,
        group: "BRSW.Settings.PowersGroup",
    });

    SettingsUtils.registerBR2WorldSetting(WORLD_SETTING_KEYS.ppChangeCardBehaviour, {
        name: game.i18n.localize("BRSW.Settings.PPChangeCardBehaviour.Name"),
        hint: game.i18n.localize("BRSW.Settings.PPChangeCardBehaviour.Hint"),
        default: "none",
        type: String,
        group: "BRSW.Settings.PowersGroup",
        choices: {
            none: game.i18n.localize("BRSW.NoOne"),
            master_only: game.i18n.localize("BRSW.VisibilityTypes.Owners"),
            master_and_gm: game.i18n.localize("BRSW.VisibilityTypes.OwnersAndGM"),
            everybody: game.i18n.localize("BRSW.VisibilityTypes.Everybody"),
        },
    });

    SettingsUtils.registerBR2WorldSetting(WORLD_SETTING_KEYS.grittyDamage, {
        name: game.i18n.localize("BRSW.Settings.GrittyDamage.Name"),
        hint: game.i18n.localize("BRSW.Settings.GrittyDamage.Hint"),
        default: false,
        type: Boolean,
        group: "BRSW.Settings.RulesGroup",
    });

    SettingsUtils.registerBR2WorldSetting(WORLD_SETTING_KEYS.riftsGrittyDamage, {
        name: game.i18n.localize("BRSW.Settings.RiftsGrittyDamage.Name"),
        hint: game.i18n.localize("BRSW.Settings.RiftsGrittyDamage.Hint"),
        default: false,
        type: Boolean,
        group: "BRSW.Settings.RulesGroup",
    });

    SettingsUtils.registerBR2WorldSetting(WORLD_SETTING_KEYS.innatePowersSpendPP, {
        name: game.i18n.localize("BRSW.Settings.InnatePowersSpendPP.Name"),
        hint: game.i18n.localize("BRSW.Settings.InnatePowersSpendPP.Hint"),
        default: false,
        type: Boolean,
        group: "BRSW.Settings.RulesGroup",
    });

    SettingsUtils.registerBR2WorldSetting(WORLD_SETTING_KEYS.npcsUseEncumbrance, {
        name: game.i18n.localize("BRSW.Settings.NPCsUseEncumbrance.Name"),
        hint: game.i18n.localize("BRSW.Settings.NPCsUseEncumbrance.Hint"),
        default: false,
        type: Boolean,
        group: "BRSW.Settings.RulesGroup",
    });

    SettingsUtils.registerBR2WorldSetting(WORLD_SETTING_KEYS.autoStatusCards, {
        name: game.i18n.localize("BRSW.Settings.AutoStatusCards.Name"),
        hint: game.i18n.localize("BRSW.Settings.AutoStatusCards.Hint"),
        default: true,
        type: Boolean,
        requiresReload: true,
    });

    SettingsUtils.registerBR2WorldSetting(WORLD_SETTING_KEYS.rangeCalcGrid, {
        name: game.i18n.localize("BRSW.Settings.RangeCalcUseGrid.Name"),
        hint: game.i18n.localize("BRSW.Settings.RangeCalcUseGrid.Hint"),
        default: true,
        scope: "world",
        type: Boolean,
        group: "BRSW.Settings.MeasurementGroup",
    });

    SettingsUtils.registerBR2WorldSetting(WORLD_SETTING_KEYS.measureFromEdge, {
        name: "BRSW.Settings.MeasureFromEdge.Name",
        hint: "BRSW.Settings.MeasureFromEdge.Hint",
        type: Boolean,
        default: false,
        group: "BRSW.Settings.MeasurementGroup",
    });

    SettingsUtils.registerBR2WorldSetting(WORLD_SETTING_KEYS.undeadIgnoresIllumination, {
        name: game.i18n.localize("BRSW.Settings.UndeadIgnoresIllumination.Name"),
        hint: game.i18n.localize("BRSW.Settings.UndeadIgnoresIllumination.Hint"),
        default: false,
        type: Boolean,
        group: "BRSW.Settings.RulesGroup",
    });

    SettingsUtils.registerBR2WorldSetting(WORLD_SETTING_KEYS.disableGangUp, {
        name: game.i18n.localize("BRSW.Settings.DisableGangUp.Name"),
        hint: game.i18n.localize("BRSW.Settings.DisableGangUp.Hint"),
        default: false,
        type: Boolean,
        group: "BRSW.Settings.RulesGroup",
    });

    SettingsUtils.registerBR2WorldSetting(WORLD_SETTING_KEYS.swdUnshake, {
        name: game.i18n.localize("BRSW.Settings.SWDUnshake.Name"),
        hint: game.i18n.localize("BRSW.Settings.SWDUnshake.Hint"),
        default: false,
        type: Boolean,
        group: "BRSW.Settings.RulesGroup",
    });

    SettingsUtils.registerBR2WorldSetting(WORLD_SETTING_KEYS.autoCheckExtraCritFailures, {
        name: "BRSW.Settings.AutoCheckExtraCritFailures.Name",
        hint: "BRSW.Settings.AutoCheckExtraCritFailures.Hint",
        type: Boolean,
        default: true,
    });
}

function registerUserSettings() {

    //Register BR2 user settings
    SettingsUtils.registerBR2UserSetting(USER_SETTING_KEYS.defaultRateOfFire, {
        name: game.i18n.localize("BRSW.Settings.DefaultRateOfFire.Name"),
        hint: game.i18n.localize("BRSW.Settings.DefaultRateOfFire.Hint"),
        default: "single_shot",
        type: String,
        choices: {
            single_shot: game.i18n.localize("BRSW.ROFTypes.SingleShot"),
            max_rof: game.i18n.localize("BRSW.ROFTypes.Max"),
        },
    });

    SettingsUtils.registerBR2UserSetting(USER_SETTING_KEYS.playerDefaultPPManagement, {
        name: game.i18n.localize("BRSW.Settings.PPManagement.Name"),
        hint: game.i18n.localize("BRSW.Settings.PPManagement.Hint"),
        default: "world",
        type: String,
        choices: {
            world: game.i18n.localize("BRSW.Settings.PPManagement.WorldDefault"),
            enabled: game.i18n.localize("BRSW.Enabled"),
            disabled: game.i18n.localize("BRSW.Disabled"),
        },
    });

    SettingsUtils.registerBR2UserSetting(USER_SETTING_KEYS.expandResults, {
        name: game.i18n.localize("BRSW.Settings.ExpandResults.Name"),
        hint: game.i18n.localize("BRSW.Settings.ExpandResults.Hint"),
        default: false,
        type: Boolean,
    });

    SettingsUtils.registerBR2UserSetting(USER_SETTING_KEYS.expandDescriptions, {
        name: game.i18n.localize("BRSW.Settings.ExpandDescriptions.Name"),
        hint: game.i18n.localize("BRSW.Settings.ExpandDescriptions.Hint"),
        default: false,
        scope: "world",
        type: Boolean,
        config: true,
    });

    SettingsUtils.registerBR2UserSetting(USER_SETTING_KEYS.autoPopoutChat, {
        name: "BRSW.Settings.PopoutChat.Name",
        hint: "BRSW.Settings.PopoutChat.Hint",
        default: true,
        type: Boolean,
    });

    SettingsUtils.registerBR2UserSetting(USER_SETTING_KEYS.allowDarkMode, {
        name: "BRSW.Settings.AllowDarkMode.Name",
        hint: "BRSW.Settings.AllowDarkMode.Hint",
        default: false,
        type: Boolean,
        onChange: () => {
            const messages = game.messages.contents.filter(m => m.getFlag("betterrolls-swade2", "br_data"));
            for (const message of messages) {
                ui.chat.updateMessage(message);

                //Loop over all the apps of this message and trigger their render
                //This is needed to refresh things like popped out chat cards
                for (const app of Object.values(message.apps)) {
                    app.render();
                }
            }
        },
    });
}

function cacheSettings(savedSettings, settingsCache) {
    for (const key in settingsCache) {
        if (Object.hasOwn(savedSettings, key)) {
            if (savedSettings[key].name !== undefined) {
                //If we have a name, this is old data which means we need to migrate it to the new structure
                if (savedSettings[key].value === savedSettings[key].default ||
                    savedSettings[key].value === settingsCache[key].default) {
                    //If the old value was the old default or is the new default,
                    //we'll use the current default which means we don't need a value
                    continue;
                }

                settingsCache[key].value = savedSettings[key].value;
                continue;
            }

            settingsCache[key].value = savedSettings[key];
        }
    }
}

export function updateCachedWorldSettings() {
    //Update our cached world settings with our saved data
    const worldSettings = SettingsUtils.getSetting(SETTING_KEYS.worldSettings);
    if (worldSettings) {
        cacheSettings(worldSettings, WORLD_SETTINGS);
        SettingsUtils.setWorldSettings();
    }
}

export function updateCachedUserSettings() {
    //Update our cached user settings from the user's flags
    const userSettings = SettingsUtils.getModuleFlag(game.user, USER_FLAGS.userSettings);
    if (userSettings) {
        cacheSettings(userSettings, USER_SETTINGS);
        SettingsUtils.setUserSettings();
    }
}

export function migrateOptionalRules() {
    const enabledRules = SettingsUtils.getSetting(SETTING_KEYS.enabledOptionalRules);
    if (!enabledRules || !enabledRules.length) {
        return;
    }

    enabledRules.forEach(r => {
        if (r === "GrittyDamage") {
            WORLD_SETTINGS[WORLD_SETTING_KEYS.grittyDamage].value = true;
        } else if (r === "RiftsGrittyDamage") {
            WORLD_SETTINGS[WORLD_SETTING_KEYS.riftsGrittyDamage].value = true;
        } else if (r === "InnatePowersDontConsume") {
            WORLD_SETTINGS[WORLD_SETTING_KEYS.innatePowersSpendPP].value = false;
        } else if (r === "NPCDontUseEncumbrance") {
            WORLD_SETTINGS[WORLD_SETTING_KEYS.npcsUseEncumbrance].value = false;
        }
    });

    SettingsUtils.setSetting(SETTING_KEYS.enabledOptionalRules, undefined);
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