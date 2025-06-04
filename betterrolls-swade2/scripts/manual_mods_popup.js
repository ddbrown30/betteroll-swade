
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Dialog for configuring and executing a shape change
 */
export class ManualModifiersPopup extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "manual-modifiers-popup",
    tag: "form",
    classes: ["brsw-manual-popup", "application"],
    window: { frame: false, positioned: false },
  };

  static PARTS = {
    form: {
      template: "modules/betterrolls-swade2/templates/manual_mods_popup.hbs",
    }
  };

  static TRAIT_MODS = ["-8","-4","-2","-1","+1","+2","+4"];
  static TRAIT_DICE = ["1","2","3","4","5","6"];
  static DAMAGE_MODS = ["-2","-1","+1","+2","+4","+8"];

  constructor(args) {
    super(args);
    game.brsw.manualModsPopup = this;
    this.br_card = args.br_card;
    this.anchorPosition = args.anchorPosition;
  }

  async _prepareContext(_options) {
    const trait_mods = this.constructor.TRAIT_MODS.map((t) => ({ value: t, enabled: !!this.br_card.manual_mods?.trait_mods?.find((m) => t == m) }));
    const trait_dice = this.constructor.TRAIT_DICE.map((t) => ({ value: t, enabled: t == this.br_card.manual_mods?.rof }));
    const damage_mods = this.constructor.DAMAGE_MODS.map((t) => ({ value: t, enabled: !!this.br_card.manual_mods?.dmg_modifiers?.find((m) => t == m) }));
    return {
      trait: !!(this.br_card.attribute_name || this.br_card.skill),
      damage: !!this.br_card.damage,
      trait_mods: trait_mods,
      trait_dice: trait_dice,
      damage_mods: damage_mods,
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
    //Position the popup relative to the button
    const { clientWidth, clientHeight } = document.documentElement;
    this.element.style.bottom = `${clientHeight - this.anchorPosition.y}px`;
    this.element.style.right = `${clientWidth - this.anchorPosition.x}px`;

    //Close the popup if we click outside of it
    document.addEventListener("click", this.clickListener = (event) => {
      if (!event.composedPath().includes(this.element)) {
        this.close();
      }
    }, { passive: true });

    const modButtons = this.element.querySelectorAll(".brsw-selectable");
    for (const modButton of modButtons) {
      modButton.addEventListener("click", async event => {
        this.onModifierSelected(event.target);
      });
    }
  }

  onModifierSelected(element) {
    element.classList.toggle("brsw-selected");
    const type = element.dataset.type;
    const {value} = element.dataset;
    this.br_card.manual_mods ??= {};
    if (type == "modifier") {
      this.br_card.manual_mods.trait_mods ??= [];
      const modIdx = this.br_card.manual_mods.trait_mods.findIndex((m) => m == value);
      if (modIdx >= 0) {
        this.br_card.manual_mods.trait_mods.splice(modIdx, 1);
      } else {
        this.br_card.manual_mods.trait_mods.push(value);
      }
    } else if (type == "dmg_modifier") {
      this.br_card.manual_mods.dmg_modifiers ??= [];
      const modIdx = this.br_card.manual_mods.dmg_modifiers.findIndex((m) => m == value);
      if (modIdx >= 0) {
        this.br_card.manual_mods.dmg_modifiers.splice(modIdx, 1);
      } else {
        this.br_card.manual_mods.dmg_modifiers.push(value);
      }
    }else if (type == "rof") {
      this.br_card.manual_mods.rof = element.classList.contains("brsw-selected") ? value : undefined;
    }
  }

  async close(options={}) {
    options.animate ??= false;
    await super.close(options);
    document.removeEventListener("click", this.clickListener);
    delete game.brsw.manualModsPopup;
  }
}