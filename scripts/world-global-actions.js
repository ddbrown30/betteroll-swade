
import * as BRSW2_CONFIG from "./brsw2-config.js";
import { registerActions } from "./global_actions.js";
import { SettingsUtils, addEventListenerAll } from "./utils.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
export class WorldGlobalActions extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "brsw-world-actions",
        tag: "form",
        form: {
            handler: WorldGlobalActions.formHandler,
            submitOnChange: false,
            closeOnSubmit: true,
        },
        window: {
            minimizable: false,
            resizable: true,
            contentClasses: ["brsw-world-actions"],
        },
        position: { width: 800, height: 700 },
        actions: {
            newAction: function (event, button) {
                this.add_action(event, this.element);
            },
            export: function (event, button) {
                this.exportGlobalActions();
            },
            import: function (event, button) {
                this.importGlobalActions();
            },
            trash: function (event, button) {
                const row = event.target.parentElement.parentElement;
                row.remove();
            },
            accordion: function (event, button) {
                const actionContent = event.target.parentElement.nextElementSibling;
                const isCollapsed = actionContent.classList.contains("brsw-collapsed");

                this.element.querySelectorAll(".brsw-edit-action").forEach((act) => {
                    act.classList.add("brsw-collapsed");
                });

                if (isCollapsed) {
                    actionContent.classList.remove("brsw-collapsed");
                }
            },
        },
    };

    static PARTS = {
        form: {
            template: "/modules/betterrolls-swade2/templates/world_globals/form.hbs",
        },
        footer: {
            template:
                "/modules/betterrolls-swade2/templates/world_globals/footer.hbs",
        },
    };

    async _prepareContext(options) {
        let actions = SettingsUtils.getSetting(BRSW2_CONFIG.SETTING_KEYS.worldGlobalActions);
        if (actions && actions[0] instanceof Array) {
            actions = actions[0];
        }

        const formatted_actions = [];
        for (const action of actions) {
            formatted_actions.push({
                name: action.name,
                id: action.id,
                json: JSON.stringify(action, undefined, 4).trim(),
            });
        }

        formatted_actions.sort((a, b) => {
            return a.id <= b.id ? -1 : 1;
        });

        return { actions: formatted_actions };
    }

    static async formHandler(event, form, formData) {
        const newWorldActions = [];
        for (const form_action in formData.object) {
            const actions = formData.object[form_action] instanceof Array ? formData.object[form_action] : [formData.object[form_action]];
            for (const action of actions) {
                newWorldActions.push(JSON.parse(action));
            }
        }

        await SettingsUtils.setSetting(BRSW2_CONFIG.SETTING_KEYS.worldGlobalActions, newWorldActions);
        registerActions();
    }

    _onRender(context, options) {
        addEventListenerAll(this.element, "textarea", "keydown", async (ev) => {
            if (ev.key === "Tab") {
                ev.preventDefault();
                const start = ev.currentTarget.selectionStart;
                const end = ev.currentTarget.selectionEnd;
                ev.currentTarget.value = ev.currentTarget.value.substring(0, start) + "    " + ev.currentTarget.value.substring(end);
                ev.currentTarget.selectionStart = start + 4;
                ev.currentTarget.selectionEnd = start + 4;
            }
        });

        // Activate JSON check on old actions
        addEventListenerAll(this.element, ".brsw-action-json", "blur", this.checkJson);
    }

    checkJson(ev) {
        // Checks the json in a textarea
        const text_area = ev.currentTarget;
        let error = "";
        let action;

        // Json loads.
        try {
            action = JSON.parse(text_area.value);
        } catch (_) {
            error = game.i18n.localize("BRSW.InvalidJSONError");
        }

        if (!error) {
            // Need to have an id, name
            for (const requisite of ["id", "name"]) {
                if (!action.hasOwnProperty(requisite)) {
                    error = game.i18n.localize("BRSW.MissingJSON") + requisite;
                }
            }
        }

        if (!error) {
            // Check that the keys are supported
            const SUPPORTED_KEYS = [
                "id",
                "name",
                "button_name",
                "skillMod",
                "skillOverride",
                "dmgMod",
                "apMod",
                "dmgOverride",
                "defaultChecked",
                "runSkillMacro",
                "runDamageMacro",
                "raiseDamageFormula",
                "wildDieFormula",
                "rerollSkillMod",
                "rerollMode",
                "rerollDamageMod",
                "selector_type",
                "selector_value",
                "and_selector",
                "section",
                "group",
                "resourcesUsed",
                "or_selector",
                "rof",
                "self_add_status",
                "not_selector",
                "tnOverride",
                "extra_text",
                "overrideAp",
                "multiplyDmgMod",
                "add_wild_die",
                "avoid_exploding_damage",
                "change_location",
                "group_single",
                "gm_action",
                "disable_if_module_present",
                "replaceExisting",
            ];

            for (const key in action) {
                if (SUPPORTED_KEYS.indexOf(key) < 0) {
                    error = game.i18n.localize("BRSW.UnknownActionKey") + key;
                }
            }
        }

        const action_title = text_area.parentElement.parentElement.querySelector("button>span");

        if (error) {
            // Inputs without a name are not passed to updateObject
            action_title.innerHTML = error;
            text_area.removeAttribute("name");
        } else {
            action_title.innerHTML = action.name;
            text_area.name = action.id;
        }
    }

    add_action(ev, html) {
        ev.preventDefault();
        for (const text_input of document.getElementsByClassName("brsw-edit-action")) {
            text_input.classList.add("brsw-collapsed");
        }

        const action_list = html.querySelector(".brsw-action-list");
        const new_span = document.createElement("span");
        new_span.insertAdjacentHTML(
            "beforeend",
            '<h2 class=\'mb-0 border-none\'><button type="button" class="p-5 font-medium border border-b-0 border-gray-200 {{#if @first}}rounded-t-xl{{/if}} bg-gray-600 focus:ring-4 focus:ring-gray-700 hover:text-white hover:bg-gray-700 gap-3"><span>New</span></button></h2>',
        );
        new_span.insertAdjacentHTML(
            "beforeend",
            "<div class='p-5 border border-b-0 border-gray-200 bg-gray-500'></div>",
        );
        new_span.insertAdjacentHTML(
            "beforeend",
            "<textarea class='brsw-action-json' rows='9'></textarea>",
        );

        new_span.querySelector("textarea").addEventListener("blur", this.checkJson);

        action_list.append(new_span);
    }

    /**
     * Exports custom global actions to a JSON file.
     */
    exportGlobalActions() {
        const actions = SettingsUtils.getSetting(BRSW2_CONFIG.SETTING_KEYS.worldGlobalActions);
        foundry.utils.saveDataToFile(JSON.stringify(actions), "json", "worldActions.json");
    }

    /**
     * Import global actions from disc
     * @return {Promise<void>}
     */
    async importGlobalActions() {
        const content = document.createElement(`div`);
        content.innerHTML = await foundry.applications.handlebars.renderTemplate(
            "templates/apps/import-data.hbs",
            {
                hint1: "Select file to import",
            },
        );

        new foundry.applications.api.DialogV2({
            window: { title: "Import Data" },
            position: { width: 400 },
            content: content,
            buttons: [
                {
                    icon: "fas fa-file-import",
                    label: "Import",
                    action: "import",
                    callback: async (event, target, dialog) => {
                        const form = dialog.element.querySelector("form");
                        if (!form.data.files.length) {
                            return ui.notifications.error("You did not upload a data file!");
                        }
                        const jsonText = await foundry.utils.readTextFromFile(form.data.files[0]);
                        await SettingsUtils.setSetting(BRSW2_CONFIG.SETTING_KEYS.worldGlobalActions, JSON.parse(jsonText));
                        this.render(true);
                    },
                },
                {
                    icon: "fas fa-times",
                    label: "Cancel",
                    action: "no",
                },
            ],
            default: "import",
        }).render(true);
    }
}
