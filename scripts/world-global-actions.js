
import * as BRSW2_CONFIG from "./brsw2-config.js";
import { registerActions } from "./global_actions.js";
import { SettingsUtils } from "./utils.js";

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
            newAction: function (event, _button) {
                this.addAction(event);
            },
            export: function (_event, _button) {
                this.exportGlobalActions();
            },
            import: function (_event, _button) {
                this.importGlobalActions();
            },
            trash: function (event, _button) {
                const row = event.target.parentElement.parentElement;
                row.remove();
            },
            accordion: function (event, _button) {
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

    nextFormId = 1;

    constructor(options = {}) {
        super(options);

        this.actions = SettingsUtils.getSetting(BRSW2_CONFIG.SETTING_KEYS.worldGlobalActions).map(a => ({
            action: a,
            formId: this.nextFormId++
        }));

        this.invalidActions = SettingsUtils.getSetting(BRSW2_CONFIG.SETTING_KEYS.invalidWorldGlobalActions).map(a => ({
            ...a,
            formId: this.nextFormId++
        }));
    }

    _prepareContext(_options) {
        const formattedActions = [];

        for (const action of this.actions) {
            formattedActions.push({
                id: action.action.id,
                formId: action.formId,
                json: JSON.stringify(action.action, undefined, 2).trim(),
            });
        }

        for (const invalidAction of this.invalidActions) {
            formattedActions.push({
                id: invalidAction.error,
                formId: invalidAction.formId,
                json: invalidAction.json,
            });
        }

        formattedActions.sort((a, b) => {
            return a.id <= b.id ? -1 : 1;
        });

        return { actions: formattedActions };
    }

    static async formHandler(_event, _form, formData) {
        const newWorldActions = [];
        const newInvalidActions = [];
        for (const [formId, json] of Object.entries(formData.object)) {
            const formIdNumber = Number(formId);
            if (this.actions.find(a => a.formId === formIdNumber)) {
                const newAction = JSON.parse(json);
                delete newAction.formId; //We don't want the formId in the saved data
                newWorldActions.push(newAction);
            } else {
                const invalidAction = this.invalidActions.find(a => a.formId === formIdNumber);
                newInvalidActions.push({
                    json: json,
                    error: invalidAction.error
                });
            }
        }

        await SettingsUtils.setSetting(BRSW2_CONFIG.SETTING_KEYS.worldGlobalActions, newWorldActions);
        await SettingsUtils.setSetting(BRSW2_CONFIG.SETTING_KEYS.invalidWorldGlobalActions, newInvalidActions);

        registerActions();
    }

    async _onRender(_context, _options) {
        this.editors = [];

        for (const textarea of this.element.querySelectorAll(".brsw-action-json")) {
            const editor = await foundry.applications.elements.HTMLCodeMirrorElement.create({
                language: "json",
                value: textarea.value,
                name: textarea.name
            });

            textarea.replaceWith(editor);
            this.editors.push(editor);

            editor.addEventListener("focusout", () => {
                this.checkJson({ currentTarget: editor }, this);
            });
        }
    }

    checkJson(ev, app) {
        // Checks the json in a textarea
        const textArea = ev.currentTarget;
        let error = "";
        let action;

        // Json loads.
        try {
            action = JSON.parse(textArea.value);
        } catch (_) {
            error = game.i18n.localize("BRSW.InvalidJSONError");
        }

        if (!error) {
            // Need to have an id, name
            for (const requisite of ["id", "name"]) {
                if (!Object.hasOwn(action, requisite)) {
                    error = game.i18n.localize("BRSW.MissingJSON") + requisite;
                }
            }
        }

        if (!error) {
            // Check that the keys are supported
            const SUPPORTED_KEYS = [
                "add_wild_die",
                "aiming_ignores",
                "aimingIgnoreMod",
                "and_selector",
                "apMod",
                "avoid_exploding_damage",
                "button_name",
                "change_location",
                "defaultChecked",
                "dmgMod",
                "dmgOverride",
                "extra_text",
                "gm_action",
                "group_single",
                "group",
                "id",
                "ignoresArcaneActivation",
                "multiplyDmgMod",
                "name",
                "not_selector",
                "or_selector",
                "overrideAp",
                "raiseDamageFormula",
                "replaceExisting",
                "rerollDamageMod",
                "rerollMode",
                "rerollSkillMod",
                "resourcesUsed",
                "rof",
                "runDamageMacro",
                "runSkillMacro",
                "section",
                "selector_type",
                "selector_value",
                "self_add_status",
                "skillMod",
                "skillOverride",
                "tnOverride",
                "wildDieFormula",
            ];

            for (const key in action) {
                if (key === "formId") continue;

                if (SUPPORTED_KEYS.indexOf(key) < 0) {
                    error = game.i18n.localize("BRSW.UnknownActionKey") + key;
                }
            }
        }

        const actionTitle = textArea.parentElement.parentElement.querySelector("button>span");
        const formId = Number(textArea.parentElement.parentElement.dataset.formid);

        if (!error) {
            if (app.actions.find(a => a.action.id === action.id && a.formId !== formId)) {
                error = game.i18n.localize("BRSW.DuplicateId");
            }
        }

        textArea.name = formId;
        actionTitle.textContent = error || action.id;

        if (error) {
            //This is an invalid action so add it to our list
            const existingIndex = app.invalidActions.findIndex(a => a.formId === formId);
            if (existingIndex !== -1) {
                //We're already in the list. Update our values instead
                app.invalidActions[existingIndex].json = textArea.value;
                app.invalidActions[existingIndex].error = error;
            } else {
                app.invalidActions.push({
                    json: textArea.value,
                    formId: formId,
                    error: error
                });
            }

            //If this action was in our valid list, we need to remove it
            const actionIndex = app.actions.findIndex(a => a.formId === formId);
            if (actionIndex !== -1) {
                app.actions.splice(actionIndex, 1);
            }
        } else {
            //This is a valid action so add it to our list
            const existingIndex = app.actions.findIndex(a => a.formId === formId);
            if (existingIndex !== -1) {
                //We're already in the list. Update our action instead
                app.actions[existingIndex].action = action;
            } else {
                app.actions.push({
                    action: action,
                    formId: formId
                });
            }

            //If this action was in our invalid list, we need to remove it
            const invalidActionIndex = app.invalidActions.findIndex(a => a.formId === formId);
            if (invalidActionIndex !== -1) {
                app.invalidActions.splice(invalidActionIndex, 1);
            }
        }
    }

    async addAction(ev) {
        ev.preventDefault();

        const formId = this.nextFormId++;
        this.invalidActions.push({
            json: "",
            formId: formId,
        });

        await this.render(true);

        //Rendering will collapse everything and show our new action
        //Expand the new action and focus it
        for (const textInput of document.getElementsByClassName("brsw-edit-action")) {
            if (Number(textInput.parentElement.dataset.formid) === formId) {
                textInput.classList.remove("brsw-collapsed");

                const actionTitle = textInput.parentElement.querySelector("button>span");
                actionTitle.textContent = game.i18n.localize("BRSW.NewAction");

                textInput.querySelector("textarea").focus();

                //Scroll the view to the bottom in case we have a long list of actions
                const scrollable = this.element.querySelector(".scrollable");
                scrollable.scrollTop = scrollable.scrollHeight;
                break;
            }
        }
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
                    callback: async (_event, _target, dialog) => {
                        const form = dialog.element.querySelector("form");
                        if (!form.data.files.length) {
                            ui.notifications.error("You did not upload a data file!");
                            return;
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

    /**
     * Exports custom global actions to a JSON file.
     */
    exportGlobalActions() {
        const actions = this.actions.map(a => a.action);
        foundry.utils.saveDataToFile(JSON.stringify(actions, undefined, 2), "json", "brsw2_world_actions.json");
    }
}
