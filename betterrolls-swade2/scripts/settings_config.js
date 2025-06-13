// An aplication to manage the settings

import { SettingsUtils } from "./utils.js";
import {
  MODULE_NAME,
  SETTING_KEYS,
  USER_FLAGS,
  USER_SETTINGS,
  WORLD_SETTINGS,
} from "./brsw2-config.js";

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
      title: "BRSW.Settings",
      minimizable: false,
      resizable: true,
    },
    position: { width: 800, height: 700 },
    actions: {
      restoreDefaults: function (event, button) { this.onRestoreDefaults(event); }
    },
  };

  static PARTS = {
    tabs: { template: 'templates/generic/tab-navigation.hbs' },
    world: { template: "modules/betterrolls-swade2/templates/settings_config/world_tab.html" },
    user: { template: "modules/betterrolls-swade2/templates/settings_config/user_tab.html" },
    footer: { template: "modules/betterrolls-swade2/templates/settings_config/footer.html" }
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
    const context = await super._prepareContext(options);
    return foundry.utils.mergeObject(context, {
      tabs: this._getTabs(),
    });
  }

  async _preparePartContext(partId, context, _options) {
    switch (partId) {
      case 'world':
        context.can_modify_world = game.user.hasPermission("SETTINGS_MODIFY");
        context.world_settings = [];
        for (let setting of Object.values(WORLD_SETTINGS)) {
          context.world_settings.push(this.get_setting_data(setting));
        }
        break;
      case 'user':
        context.user_settings = [];
        for (let setting of Object.values(USER_SETTINGS)) {
          context.user_settings.push(this.get_setting_data(setting));
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
    const can_modify_world = game.user.hasPermission("SETTINGS_MODIFY");
    let requires_world_reload = false;
    let requires_client_reload = false;
    for (let [k, v] of Object.entries(foundry.utils.expandObject(formData.object))) {
      if (
        can_modify_world &&
        WORLD_SETTINGS[k] &&
        WORLD_SETTINGS[k].value !== v
      ) {
        WORLD_SETTINGS[k].value = v;
        requires_world_reload =
          requires_world_reload || !!WORLD_SETTINGS[k].requiresReload;
      } else if (USER_SETTINGS[k] && USER_SETTINGS[k].value !== v) {
        USER_SETTINGS[k].value = v;
        requires_client_reload =
          requires_client_reload || !!USER_SETTINGS[k].requiresReload;
      }
    }

    if (can_modify_world) {
      await SettingsUtils.setSetting(
        SETTING_KEYS.world_settings,
        WORLD_SETTINGS,
      );
    }

    await game.user.unsetFlag(MODULE_NAME, USER_FLAGS.user_settings);
    await game.user.setFlag(
      MODULE_NAME,
      USER_FLAGS.user_settings,
      USER_SETTINGS,
    );

    if (requires_world_reload || requires_client_reload) {
      await this.constructor.reloadConfirm({ world: requires_world_reload });
    }

    this.close();
  }

  /**
   * Shows a confirmation dialog for reloading the game.
   * @param {object} options - The reload options.
   */
  static async reloadConfirm({ world = false } = {}) {
    const reload = await Dialog.confirm({
      title: game.i18n.localize("SETTINGS.ReloadPromptTitle"),
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
          callback: () => {},
        },
      ],
      default: "no",
      close: () => {},
    }).render(true);
  }

  async restoreDefaults(data_tab) {
    let requires_world_reload = false;
    let requires_client_reload = false;
    if (data_tab === "world") {
      for (let setting of Object.values(WORLD_SETTINGS)) {
        if (
          setting.requiresReload &&
          setting.value !== undefined &&
          setting.value !== setting.default
        ) {
          requires_world_reload = true;
        }
        delete setting.value;
      }
    } else if (data_tab === "user") {
      for (let setting of Object.values(USER_SETTINGS)) {
        if (
          setting.requiresReload &&
          setting.value !== undefined &&
          setting.value !== setting.default
        ) {
          requires_client_reload = true;
        }
        delete setting.value;
      }
    }

    await SettingsUtils.setSetting(SETTING_KEYS.world_settings, WORLD_SETTINGS);

    await game.user.unsetFlag(MODULE_NAME, USER_FLAGS.user_settings);
    await game.user.setFlag(
      MODULE_NAME,
      USER_FLAGS.user_settings,
      USER_SETTINGS,
    );

    this.render(true);

    if (requires_world_reload || requires_client_reload) {
      await this.constructor.reloadConfirm({ world: requires_world_reload });
    }
  }
}
