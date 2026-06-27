
import { SYSTEM_GLOBAL_ACTION } from "./actions/builtin-actions.js";
import * as BRSW2_CONFIG from "./brsw2-config.js";
import { SettingsUtils } from "./utils.js";

/**
 * Menu for selecting which global actions are enabled
 */
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
export class GlobalActionsMenu extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "brsw-global-actions",
        tag: "form",
        form: {
            handler: GlobalActionsMenu.formHandler,
            submitOnChange: false,
            closeOnSubmit: true
        },
        classes: ["standard-form", "brsw-global-actions-form"],
        window: {
            title: "",
            minimizable: false,
            resizable: true,
            contentClasses: ["brsw-global-actions"],
        },
        position: { width: 600, height: 650 },
    };

    static PARTS = {
        tabs: { template: 'templates/generic/tab-navigation.hbs' },
        form: { template: "/modules/betterrolls-swade2/templates/global-actions-menu/form.hbs" },
        footer: { template: "/modules/betterrolls-swade2/templates/global-actions-menu/footer.hbs" },
    };

    constructor(options = {}) {
        super(options);

        this.createGroupData();
    }


    prepareTabs() {
      return Object.values(this.groups).reduce((tabs, group) => {
        const isActive = this.tabGroups.primary === group.name;
        tabs[group.name] = {
          id: group.name,
          group: "primary",
          label: group.name,
          active: isActive,
          cssClass: isActive ? "active" : "",
          tabCssClass: isActive ? 'tab active' : 'tab',
        };
        return tabs;
      }, {});
    }

    async _prepareContext(options) {
        await super._prepareContext(options);

        return {
            groups: this.groups,
            tabs: this.prepareTabs(),
            verticalTabs: true,
        };
    }

    static async formHandler(event, form, formData) {
        const disabledActions = [];
        for (const id in formData.object) {
            if (!formData.object[id]) {
                disabledActions.push(id);
            }
        }
        await SettingsUtils.setSetting(BRSW2_CONFIG.SETTING_KEYS.disabledSystemActions, disabledActions);
    }

    createGroupData() {
        this.groups = {};

        let disableActions = SettingsUtils.getSetting(BRSW2_CONFIG.SETTING_KEYS.disabledSystemActions);
        if (disableActions && disableActions[0] instanceof Array) {
            disableActions = disableActions[0];
        }

        for (const action of SYSTEM_GLOBAL_ACTION) {
            if (action.selector_type === "gm_action") {
                continue;
            }

            if (!Object.hasOwn(this.groups, action.group)) {
                this.groups[action.group] = { name: action.group, actions: [] };
            }

            this.groups[action.group].actions.push({
                id: action.id,
                name: game.i18n.localize(action.name),
                enabled: !disableActions.includes(action.id),
            });

            this.groups[action.group].actions.sort((a, b) => {
                return a.name > b.name ? 1 : -1;
            });
        }
    }
}