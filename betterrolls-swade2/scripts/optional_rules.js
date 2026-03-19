/* globals game */

import { SettingsUtils } from "./utils.js";

const OPTIONAL_RULES = [
  "GrittyDamage",
  "RiftsGrittyDamage",
  "InnatePowersDontConsume",
  "NPCDontUseEncumbrance",
];

// noinspection JSPrimitiveTypeWrapperUsage
/**
 * Setting for optional rules
 */
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
export class OptionalRulesConfiguration extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "brsw-optional-rules",
    tag: "form",
    form: {
      handler: OptionalRulesConfiguration.formHandler,
      submitOnChange: false,
      closeOnSubmit: true
    },
    classes: ['standard-form'],
    window: {
      title: "",
      minimizable: false,
      resizable: true,
      contentClasses: ["brsw-optional-rules-content"],
    },
  };

  static PARTS = {
    form: { template: "/modules/betterrolls-swade2/templates/optional_rules.hbs" },
  };

  async _prepareContext(options) {
    let rules = [];
    // No idea why the 0...
    let enable_rules = SettingsUtils.getSetting("optional_rules_enabled");
    for (let rule of OPTIONAL_RULES) {
      rules.push({
        id: rule,
        name: game.i18n.localize("BRSW.OR." + rule),
        enabled: enable_rules.indexOf(rule) > -1,
      });
    }
    // noinspection JSValidateTypes
    return { rules: rules };
  }

  static async formHandler(event, form, formData) {
    let enabled = [];
    for (let id in formData.object) {
      if (formData.object[id]) {
        enabled.push(id);
      }
    }
    await SettingsUtils.setSetting("optional_rules_enabled", enabled);
  }
}
