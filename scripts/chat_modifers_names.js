/* globals game */

import * as BRSW2_CONFIG from "./brsw2-config.js";
import { SettingsUtils } from "./utils.js";

/**
 * Settings configuration for modifier names
 */
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
export class ModifierSettingsConfiguration extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "brsw-modifier-names",
    tag: "form",
    form: {
      handler: ModifierSettingsConfiguration.formHandler,
      submitOnChange: false,
      closeOnSubmit: true
    },
    classes: ['standard-form'],
    window: {
      title: "",
      minimizable: false,
      resizable: true,
      contentClasses: ["brsw-modifier-names-content"],
    },
  };

  static PARTS = {
    form: { template: "/modules/betterrolls-swade2/templates/modifier_names_settings.hbs" },
  };

  async _prepareContext(options) {
    let chat_modifiers_names = SettingsUtils.getSetting(BRSW2_CONFIG.SETTING_KEYS.chatModifiersName);
    return { names: chat_modifiers_names };
  }

  static async formHandler(event, form, formData) {
    await SettingsUtils.setSetting(BRSW2_CONFIG.SETTING_KEYS.chatModifiersName, formData.object);
  }
}
