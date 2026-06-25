// An aplication to manage the settings

import { SettingsUtils } from "./utils.js";
import * as BRSW2_CONFIG from "./brsw2-config.js";

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

    async _preparePartContext(partId, context, _options) {
        switch (partId) {
            case 'world':
                context.canModifyWorld = game.user.hasPermission("SETTINGS_MODIFY");
                context.worldSettings = [];
                for (let setting of Object.values(BRSW2_CONFIG.WORLD_SETTINGS)) {
                    context.worldSettings.push(this.get_setting_data(setting));
                }
                break;
            case 'user':
                context.userSettings = [];
                for (let setting of Object.values(BRSW2_CONFIG.USER_SETTINGS)) {
                    context.userSettings.push(this.get_setting_data(setting));
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
    get_setting_data(setting) {
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
        for (let [k, v] of Object.entries(foundry.utils.expandObject(formData.object))) {
            if (
                canModifyWorld &&
                BRSW2_CONFIG.WORLD_SETTINGS[k] &&
                BRSW2_CONFIG.WORLD_SETTINGS[k].value !== v
            ) {
                BRSW2_CONFIG.WORLD_SETTINGS[k].value = v;
                requiresWorldReload =
                    requiresWorldReload || !!BRSW2_CONFIG.WORLD_SETTINGS[k].requiresReload;
            } else if (BRSW2_CONFIG.USER_SETTINGS[k] && BRSW2_CONFIG.USER_SETTINGS[k].value !== v) {
                BRSW2_CONFIG.USER_SETTINGS[k].value = v;
                requiresClientReload =
                    requiresClientReload || !!BRSW2_CONFIG.USER_SETTINGS[k].requiresReload;
            }
        }

        if (canModifyWorld) {
            await SettingsUtils.setSetting(
                BRSW2_CONFIG.SETTING_KEYS.worldSettings,
                BRSW2_CONFIG.WORLD_SETTINGS,
            );
        }

        await game.user.unsetFlag(BRSW2_CONFIG.MODULE_NAME, BRSW2_CONFIG.USER_FLAGS.userSettings);
        await game.user.setFlag(
            BRSW2_CONFIG.MODULE_NAME,
            BRSW2_CONFIG.USER_FLAGS.userSettings,
            BRSW2_CONFIG.USER_SETTINGS,
        );

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
        const active_data_tab = this.element.querySelector(".tab.active")
            .attributes["data-tab"].nodeValue;
        switch (active_data_tab) {
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
                        this.restoreDefaults(active_data_tab);
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

    async restoreDefaults(data_tab) {
        let requiresWorldReload = false;
        let requiresClientReload = false;
        if (data_tab === "world") {
            for (let setting of Object.values(BRSW2_CONFIG.WORLD_SETTINGS)) {
                if (
                    setting.requiresReload &&
                    setting.value !== undefined &&
                    setting.value !== setting.default
                ) {
                    requiresWorldReload = true;
                }
                delete setting.value;
            }
        } else if (data_tab === "user") {
            for (let setting of Object.values(BRSW2_CONFIG.USER_SETTINGS)) {
                if (
                    setting.requiresReload &&
                    setting.value !== undefined &&
                    setting.value !== setting.default
                ) {
                    requiresClientReload = true;
                }
                delete setting.value;
            }
        }

        await SettingsUtils.setSetting(BRSW2_CONFIG.SETTING_KEYS.worldSettings, BRSW2_CONFIG.WORLD_SETTINGS);

        await game.user.unsetFlag(BRSW2_CONFIG.MODULE_NAME, BRSW2_CONFIG.USER_FLAGS.userSettings);
        await game.user.setFlag(
            BRSW2_CONFIG.MODULE_NAME,
            BRSW2_CONFIG.USER_FLAGS.userSettings,
            BRSW2_CONFIG.USER_SETTINGS,
        );

        this.render(true);

        if (requiresWorldReload || requiresClientReload) {
            await this.constructor.reloadConfirm({ world: requiresWorldReload });
        }
    }
}
