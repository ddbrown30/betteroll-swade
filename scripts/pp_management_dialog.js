import { calc_pp_cost, displayPPChangeCard } from "./item_card.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Popup for managing PP for a card
 */
export class PPManagementDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "pp-management-dialog",
    tag: "form",
    classes: ["brsw-pp-dialog", "application"],
    window: { title: "BRSW.PPManagement.Title" },
    position: { width: "auto", height: "auto" },
    actions: {
      toggleMod: function (event, button) {
        event.stopPropagation();
        event.preventDefault();
        const isGeneric = button.closest("div").getAttribute("name") === "generic-mods";
        const mods = isGeneric ? this.brCard.pp_modifiers.genericMods : this.brCard.pp_modifiers.powerMods;
        const modName = button.dataset.modname;
        const mod = mods.find(m => m.name == modName);
        if (mod.selected) {
          //Deselect
          button.classList.remove("selected");
          if (isGeneric) {
            if (mod.actionId) {
              const action = this.brCard.get_action_by_id(mod.actionId);
              if (action) {
                action.selected = false;
              }
            }
          } else {
            const action = this.brCard.get_action_by_name(mod.name);
            if (action) {
              action.selected = false;
            }
          }
        } else {
          //Select
          button.classList.add("selected");
          if (isGeneric) {
            if (mod.actionId) {
              const action = this.brCard.get_action_by_id(mod.actionId);
              if (action) {
                action.selected = true;
              }
            }
          } else {
            const action = this.brCard.get_action_by_name(mod.name);
            if (action) {
              action.selected = true;
            }
          }
        }
        mod.selected = !mod.selected;
        this.refreshPPCost();
      },
      set: async function (event, button) {
        await this.brCard.render();
        await this.brCard.save();
        this.close({ revertChanges: false });
      },
      recharge: async function (event, button) {
        this.bennyRechargePP();
      },
      soulDrain: async function (event, button) {
        this.soulDrain();
      },
      spendPP: async function (event, button) {
        this.spendPP();
      },
      cancel: async function (event, button) {
        this.close({ revertChanges: true });
      }
    },
  };

  static PARTS = {
    form: {
      template: "modules/betterrolls-swade2/templates/pp_management_dialog.hbs",
    }
  };

  constructor(args) {
    super(args);
    this.brCard = args.brCard;
    this.brCardOld = JSON.parse(JSON.stringify(this.brCard));
  }

  async _prepareContext(_options) {
    const actor = this.brCard.actor;
    const item = this.brCard.item;

    const bennyImage = game.settings.get("swade", "bennyImage3DFront") || "/systems/swade/assets/benny/benny-chip-front.png";
    const isArcaneDevice = item.system.additionalStats.devicePP;

    const soulDrainName = game.i18n.localize("BRSW.EdgeName.SoulDrain").toLowerCase();
    const hasSoulDrain = !!actor.items.find((item) => { return (item.type === "edge" && item.name.toLowerCase().includes(soulDrainName)); });

    const ppCost = calc_pp_cost(this.brCard);

    return {
      genericMods: this.brCard.pp_modifiers.genericMods,
      powerMods: this.brCard.pp_modifiers.powerMods,
      additionalRecipientsMod: this.brCard.pp_modifiers.additionalRecipientsMod,
      extraCost: this.brCard.pp_modifiers.extraCost,
      bennyImage,
      isArcaneDevice,
      hasSoulDrain,
      ppCost,
    };
  };

  /**
 * Actions performed after any render of the Application.
 * Post-render steps are not awaited by the render process.
 * @param {ApplicationRenderContext} context      Prepared context data
 * @param {RenderOptions} options                 Provided render options
 * @protected
 */
  _onRender(context, options) {
    this.element.querySelector('input[id="additional-recipients"]')?.addEventListener("change", async event => {
      let value = Number(event.currentTarget.value);
      if (isNaN(value)) {
        value = 0;
      }
      event.currentTarget.value = value;
      this.brCard.pp_modifiers.additionalRecipientsMod.count = value;
      this.refreshPPCost();
    });

    this.element.querySelector('input[id="extra-pp"]')?.addEventListener("change", async event => {
      let value = Number(event.currentTarget.value);
      if (isNaN(value)) {
        value = 0;
      }
      event.currentTarget.value = value;
      this.brCard.pp_modifiers.extraCost = value;
      this.refreshPPCost();
    });
  }

  refreshPPCost() {
    const ppCost = calc_pp_cost(this.brCard);
    const ppCostEl = this.element.querySelector('[id="ppCost"');
    ppCostEl.textContent = game.i18n.format("BRSW.PPManagement.Spend", { ppCost });
  }

  async close(options = {}) {
    if (options.revertChanges || options.revertChanges === undefined) {
      Object.assign(this.brCard.action_sections, foundry.utils.deepClone(this.brCardOld.action_sections));
      Object.assign(this.brCard.pp_modifiers, foundry.utils.deepClone(this.brCardOld.pp_modifiers));
    }

    await super.close(options);
  }

  /**
   * Renders the dialog and awaits until the dialog is submitted or closed
   */
  async wait() {
    return new Promise((resolve, reject) => {
      // Wrap submission handler with Promise resolution.
      this.submit = async result => {
        resolve(result);
        this.close();
      };

      this.addEventListener("close", event => {
        resolve(false);
      }, { once: true });

      this.render({ force: true });
    });
  }

  getPPValues() {
    const actor = this.brCard.actor;
    const item = this.brCard.item;

    const arcaneDevice = item.system.additionalStats.devicePP;

    let currentPP = arcaneDevice
      ? item.system.additionalStats.devicePP.value
      : actor.system.powerPoints.general.value;

    let maxPP = arcaneDevice
      ? item.system.additionalStats.devicePP.max
      : actor.system.powerPoints.general.max;

    let dataKey = arcaneDevice
      ? "system.additionalStats.devicePP.value"
      : "system.powerPoints.general.value";

    if (actor.system.powerPoints.hasOwnProperty(item.system.arcane) && actor.system.powerPoints[item.system.arcane].max) {
      //Use the specific PP for this arcane type
      currentPP = actor.system.powerPoints[item.system.arcane].value;
      maxPP = actor.system.powerPoints[item.system.arcane].max;
      dataKey = `system.powerPoints.${item.system.arcane}.value`;
    }

    return {
      currentPP,
      maxPP,
      dataKey
    }
  }

  bennyRechargePP() {
    const actor = this.brCard.actor;
    const item = this.brCard.item;

    if (actor.system.bennies.value < 1) {
      ui.notifications.notify(game.i18n.localize("BRSW.NoBennies"));
      return;
    }

    const { currentPP, maxPP, dataKey } = this.getPPValues();

    if (currentPP >= maxPP) {
      //PP is already full
      ui.notifications.notify(game.i18n.localize("BRSW.PPManagement.PPFull"));
      return;
    }

    let newPP = Math.min(currentPP + 5, maxPP);
    actor.update({ [dataKey]: newPP });
    actor.spendBenny();

    displayPPChangeCard(actor, {
      content: game.i18n.format("BRSW.RechargePPBennyText", {
        name: actor.name,
        newPP,
      })
    });
  }

  soulDrain() {
    const actor = this.brCard.actor;
    const item = this.brCard.item;

    let currentPP = actor.system.powerPoints.general.value;
    let maxPP = actor.system.powerPoints.general.max;
    let dataKey = "system.powerPoints.general.value";

    if (actor.system.powerPoints.hasOwnProperty(item.system.arcane) && actor.system.powerPoints[item.system.arcane].max) {
      //Use the specific PP for this arcane type
      currentPP = actor.system.powerPoints[item.system.arcane].value;
      maxPP = actor.system.powerPoints[item.system.arcane].max;
      dataKey = `system.powerPoints.${item.system.arcane}.value`;
    }

    if (currentPP >= maxPP) {
      //PP is already full
      ui.notifications.notify(game.i18n.localize("BRSW.PPManagement.PPFull"));
      return;
    }

    const currentFatigue = actor.system.fatigue.value;
    const maxFatigue = actor.system.fatigue.max;

    if (currentFatigue + 1 > maxFatigue) {
      ui.notifications.notify(game.i18n.localize("BRSW.PPManagement.SoulDrainMaxFatigue"));
      return;
    }

    actor.update({ "system.fatigue.value": currentFatigue + 1 });

    let newPP = Math.min(currentPP + 5, maxPP);
    actor.update({ [dataKey]: newPP });

    displayPPChangeCard(actor, {
      content: game.i18n.format("BRSW.PPManagement.RechargePPSoulDrainText", {
        name: actor.name,
        newPP,
      })
    });
  }

  spendPP() {
    const actor = this.brCard.actor;
    const item = this.brCard.item;

    const arcaneDevice = item.system.additionalStats.devicePP;

    let currentPP = arcaneDevice
      ? item.system.additionalStats.devicePP.value
      : actor.system.powerPoints.general.value;

    let maxPP = arcaneDevice
      ? item.system.additionalStats.devicePP.max
      : actor.system.powerPoints.general.max;

    let dataKey = arcaneDevice
      ? "system.additionalStats.devicePP.value"
      : "system.powerPoints.general.value";

    if (actor.system.powerPoints.hasOwnProperty(item.system.arcane) && actor.system.powerPoints[item.system.arcane].max) {
      //Use the specific PP for this arcane type
      currentPP = actor.system.powerPoints[item.system.arcane].value;
      maxPP = actor.system.powerPoints[item.system.arcane].max;
      dataKey = `system.powerPoints.${item.system.arcane}.value`;
    }

    const ppCost = calc_pp_cost(this.brCard);
    const newPP = currentPP - ppCost;

    if (newPP < 0) {
      ui.notifications.notify(game.i18n.localize("BRSW.InsufficientPP"));
      return;
    }

    if (arcaneDevice) {
      actor.updateEmbeddedDocuments("Item", { _id: item.id, [dataKey]: newPP });
    } else {
      actor.update({ [dataKey]: newPP });
    }

    displayPPChangeCard(actor, {
      content: game.i18n.format("BRSW.PPManagement.SpendPPText", {
        name: actor.name,
        ppCost,
        newPP,
      })
    });
  }
}