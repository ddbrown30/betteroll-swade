
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Popup for managing PP for a card
 */
export class PPManagementPopup extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "pp-management-popup",
    tag: "form",
    classes: ["brsw-pp-popup", "application"],
    window: { title: "PP Management" },
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
      },
      confirm: async function (event, button) {
        await this.brCard.render();
        await this.brCard.save();
        this.close();
      }
    },
  };

  static PARTS = {
    form: {
      template: "modules/betterrolls-swade2/templates/pp_management_popup.hbs",
    }
  };

  constructor(args) {
    super(args);
    this.brCard = args.brCard;
  }

  async _prepareContext(_options) {
    return {
      genericMods: this.brCard.pp_modifiers.genericMods,
      powerMods: this.brCard.pp_modifiers.powerMods,
      additionalRecipientsMod: this.brCard.pp_modifiers.additionalRecipientsMod,
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
    });
  }

  async close(options = {}) {
    options.animate ??= false;
    await super.close(options);
    document.removeEventListener("click", this.clickListener);
    delete game.brsw.gmActionsPopup;
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
}