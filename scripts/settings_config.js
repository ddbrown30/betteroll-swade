// An aplication to manage the settings

import { USER_SETTINGS, USER_SETTING_KEYS, WORLD_SETTINGS, WORLD_SETTING_KEYS } from "./brsw2-config.js";
import { SettingsUtils } from "./utils.js";


const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
export class SettingsConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "brsw-settings-config",
        tag: "form",
        form: {
            handler: SettingsConfig.formHandler,
            submitOnChange: false,
            closeOnSubmit: true
        },
        classes: ['standard-form', "sheet"],
        window: {
            title: "BRSW.Settings.Title",
            minimizable: false,
            resizable: true,
            contentClasses: ["brsw-settings-config"],
        },
        position: { width: 800, height: 700 },
        actions: {
            restoreDefaults: function (event, button) { this.onRestoreDefaults(event); }
        },
    };

    static PARTS = {
        tabs: { template: 'templates/generic/tab-navigation.hbs' },
        world: { template: "modules/betterrolls-swade2/templates/settings_config/world_tab.hbs" },
        user: { template: "modules/betterrolls-swade2/templates/settings_config/user_tab.hbs" },
        footer: { template: "modules/betterrolls-swade2/templates/settings_config/footer.hbs" }
    };

    static TABS = {
        world: {
            id: 'world',
            group: 'primary',
            label: 'BRSW.Settings.Tabs.World',
        },
        user: {
            id: 'user',
            group: 'primary',
            label: 'BRSW.Settings.Tabs.User',
        },
    };

    _getTabs() {
        return Object.values(this.constructor.TABS).reduce(
            (acc, v) => {
                const isActive = this.tabGroups[v.group] === v.id;
                acc[v.id] = {
                    ...v,
                    active: isActive,
                    cssClass: isActive ? 'active' : '',
                    tabCssClass: isActive ? 'tab scrollable active' : 'tab scrollable',
                };
                return acc;
            },
            {},
        );
    }

    async _prepareContext(options) {
        await super._prepareContext(options);
        return { tabs: this._getTabs() };
    }

    _configureRenderParts(options) {
        const parts = super._configureRenderParts(options);
        if (!game.user.hasPermission("SETTINGS_MODIFY")) {
            delete parts.world;
            delete parts.tabs;
        }
        return parts;
    }

    async _preparePartContext(partId, context, _options) {
        switch (partId) {
            case 'world':
                context.canModifyWorld = game.user.hasPermission("SETTINGS_MODIFY");
                context.worldSettings = [];
                context.groups = {};

                const clickActionKeys = WORLD_SETTING_KEYS.clickActionKeys;
                context.clickSettings = [
                    this.getSettingData(WORLD_SETTINGS[clickActionKeys.click]),
                    this.getSettingData(WORLD_SETTINGS[clickActionKeys.shiftClick]),
                    this.getSettingData(WORLD_SETTINGS[clickActionKeys.ctrlClick]),
                    this.getSettingData(WORLD_SETTINGS[clickActionKeys.altClick]),
                ];

                for (let setting of Object.values(WORLD_SETTINGS)) {
                    if (context.clickSettings.find(s => s.key === setting.key)) continue;
                    if (setting.group) {
                        context.groups[setting.group] ??= [];
                        context.groups[setting.group].push(this.getSettingData(setting));
                    } else {
                        context.worldSettings.push(this.getSettingData(setting));
                    }
                }
                break;
            case 'user':
                context.userSettings = [];
                for (let setting of Object.values(USER_SETTINGS)) {
                    if (setting.key === USER_SETTING_KEYS.playerDefaultPPManagement) {
                        if (!SettingsUtils.getWorldSetting(WORLD_SETTING_KEYS.ppManagementPlayerChoice)) {
                            //If this is the playerDefaultPPManagement setting and player choice is not enabled, don't render this setting
                            continue;
                        }
                    }
                    context.userSettings.push(this.getSettingData(setting));
                }
                break;
            case 'footer':
                break;
        }
        return context;
    }

    /**
     * Gets the data from a setting to pass it to handlebars
     * @param {object} setting - The setting object.
     * @returns {object} The setting data.
     */
    getSettingData(setting) {
        const s = foundry.utils.deepClone(setting);
        s.id = s.key;
        s.name = game.i18n.localize(s.name);
        s.hint = game.i18n.localize(s.hint);
        s.value = s.value ?? s.default;
        s.type = setting.type instanceof Function ? setting.type.name : "String";
        s.isCheckbox = setting.type === Boolean;
        s.isSelect = s.choices !== undefined;
        s.isRange = setting.type === Number && s.range;
        s.isNumber = setting.type === Number;
        return s;
    }

    static async formHandler(event, form, formData) {
        const canModifyWorld = game.user.hasPermission("SETTINGS_MODIFY");
        let requiresWorldReload = false;
        let requiresClientReload = false;
        const changedCallbacks = [];
        for (let [k, v] of Object.entries(foundry.utils.expandObject(formData.object))) {
            if (canModifyWorld && WORLD_SETTINGS[k] &&
                (WORLD_SETTINGS[k].value !== undefined
                    ? WORLD_SETTINGS[k].value !== v
                    : WORLD_SETTINGS[k].default !== v)) {
                WORLD_SETTINGS[k].value = v;
                if (WORLD_SETTINGS[k].onChange) changedCallbacks.push(() => WORLD_SETTINGS[k].onChange(v));
                requiresWorldReload = requiresWorldReload || !!WORLD_SETTINGS[k].requiresReload;
            } else if (USER_SETTINGS[k] &&
                (USER_SETTINGS[k].value !== undefined
                    ? USER_SETTINGS[k].value !== v
                    : USER_SETTINGS[k].default !== v)) {
                USER_SETTINGS[k].value = v;
                if (USER_SETTINGS[k].onChange) changedCallbacks.push(() => USER_SETTINGS[k].onChange(v));
                requiresClientReload = requiresClientReload || !!USER_SETTINGS[k].requiresReload;
            }
        }

        if (canModifyWorld) {
            await SettingsUtils.setWorldSettings();
        }

        await SettingsUtils.setUserSettings();

        changedCallbacks.forEach(cb => cb());

        if (requiresWorldReload || requiresClientReload) {
            await this.constructor.reloadConfirm({ world: requiresWorldReload });
        }

        this.close();
    }

    /**
     * Shows a confirmation dialog for reloading the game.
     * @param {object} options - The reload options.
     */
    static async reloadConfirm({ world = false } = {}) {
        const reload = await foundry.applications.api.DialogV2.confirm({
            window: { title: "SETTINGS.ReloadPromptTitle" },
            position: { width: 400 },
            content: `<p>${game.i18n.localize("SETTINGS.ReloadPromptBody")}</p>`,
        });

        if (!reload) {
            return;
        }

        if (world && game.user.isGM) {
            game.socket.emit("reload");
        }
        foundry.utils.debouncedReload();
    }

    /**
     *
     * @param {*} event
     */
    async onRestoreDefaults(event) {
        event.preventDefault();

        let content;
        switch (this.tabGroups.primary) {
            case "world":
                content = game.i18n.localize("BRSW.Settings.RestoreDefaultsWorldBody");
                break;

            case "user":
                content = game.i18n.localize("BRSW.Settings.RestoreDefaultsUserBody");
                break;
        }

        new foundry.applications.api.DialogV2({
            window: { title: "BRSW.Settings.RestoreDefaultsTitle" },
            content: content,
            buttons: [
                {
                    icon: `<i class="fas fa-check"></i>`,
                    label: game.i18n.localize("BRSW.Yes"),
                    action: "yes",
                    callback: () => {
                        this.restoreDefaults(this.tabGroups.primary);
                    },
                },
                {
                    icon: `<i class="fas fa-times"></i>`,
                    label: game.i18n.localize("BRSW.No"),
                    action: "no",
                    callback: () => { },
                },
            ],
            default: "no",
            close: () => { },
        }).render(true);
    }

    async restoreDefaults(dataTab) {
        let requiresWorldReload = false;
        let requiresClientReload = false;
        if (dataTab === "world") {
            for (let setting of Object.values(WORLD_SETTINGS)) {
                if (setting.requiresReload && setting.value !== undefined && setting.value !== setting.default) {
                    requiresWorldReload = true;
                }
                delete setting.value;
            }
        } else if (dataTab === "user") {
            for (let setting of Object.values(USER_SETTINGS)) {
                if (setting.requiresReload && setting.value !== undefined && setting.value !== setting.default) {
                    requiresClientReload = true;
                }
                delete setting.value;
            }
        }

        await SettingsUtils.setWorldSettings();
        await SettingsUtils.setUserSettings();

        this.render({ parts: [dataTab] });

        if (requiresWorldReload || requiresClientReload) {
            await this.constructor.reloadConfirm({ world: requiresWorldReload });
        }
    }
}
