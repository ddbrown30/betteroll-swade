import { refresh_gm_actions } from "./global_actions.js";
import { manage_selectable_gm } from "./gm_actions.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Dialog for configuring and executing a shape change
 */
export class GmActionsPopup extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "gm-actions-popup",
    tag: "form",
    classes: ["brsw-gm-popup", "application"],
    window: { frame: false, positioned: false },
  };

  static PARTS = {
    form: {
      template: "modules/betterrolls-swade2/templates/gm_actions_popup.hbs",
    }
  };

  constructor(args) {
    super(args);
    game.brsw.gmActionsPopup = this;
    this.anchorPosition = args.anchorPosition;
  }

  async _prepareContext(_options) {
    let action_groups = {};
    const gm_actions = await refresh_gm_actions();
    for (let action of gm_actions) {
      action_groups[action.group] ??= { actions: [] };
      action_groups[action.group].label = action.group;
      action_groups[action.group].actions.push(action);
    }

    return {
      action_groups: action_groups
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
        manage_selectable_gm(event);
      });
    }
  }

  async close(options={}) {
    options.animate ??= false;
    await super.close(options);
    document.removeEventListener("click", this.clickListener);
    delete game.brsw.gmActionsPopup;
  }
}