/* globals FormApplication, game */

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
    form: { template: "/modules/betterrolls-swade2/templates/modifier_names_settings.html" },
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    let chat_modifiers_names = SettingsUtils.getSetting("chat_modifiers_names");
    return foundry.utils.mergeObject(context, { names: chat_modifiers_names });
  }

  static async formHandler(event, form, formData) {
    await SettingsUtils.setSetting("chat_modifiers_names", formData.object);
  }
}
