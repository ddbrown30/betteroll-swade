// Init scripts for version 2
/* globals Hooks, console, game, loadTemplates, Token, renderTemplate,
    Macro, CONFIG, foundry, Item, ModuleManagement, $ */
import { BrCommonCard } from "./BrCommonCard.js";
import {
    activateAttributeCardListeners,
    activate_attribute_listeners,
    exposeAttributeAPI,
} from "./attribute_card.js";
import * as BRSW2_CONFIG from "./brsw2-config.js";
import { BRSW2_CONST } from "./brsw2-const.js";
import { setupDialog } from "./card-dialog.js";
import {
    activateCommonListeners,
    exposeCardClass,
    getActionFromClick,
} from "./cards_common.js";
import { createUnshakeWrapper, createUnstunWrapper } from "./combat.js";
import { activateDamageCardListeners, fitDamageTargetText } from "./damage_card.js";
import {
    exposeGlobalActionsAPI,
    registerActions,
    registerGMActionsSettings
} from "./global_actions.js";
import { setupChatButton } from "./gm_actions.js";
import {
    activateIncapacitationCardListeners,
    exposeIncapacitationCardAPI,
} from "./incapacitation_card.js";
import {
    activateItemCardListeners,
    activate_item_listeners,
    exposeItemCardAPI,
} from "./item_card.js";
import { activateRemoveStatusCardListeners } from "./remove_status_cards.js";
import { migrateOptionalRules, registerDSNSettings, registerSettings, updateCachedUserSettings, updateCachedWorldSettings } from "./settings.js";
import {
    activateSkillCardListeners,
    activate_skill_listeners,
    exposeSkillCardAPI,
} from "./skill_card.js";
import { SettingsUtils, TelemetryUtils, Utils, cacheSkillData, measureDistance } from "./utils.js";
import { activate_vehicle_listeners } from "./vehicle_card.js";

// Init Hook
Hooks.on(`init`, () => {
    game.brsw = {};
    game.brsw.CONST = BRSW2_CONST;
    game.brsw.cascade_count = 0;
    Utils.exposeAPI("getActionFromClick", getActionFromClick, "get_action_from_click");
    Utils.exposeAPI("measureDistance", measureDistance);

    registerSettings();

    registerActions();
    registerGMActionsSettings();
});

// Base Hook
Hooks.on(`ready`, async () => {
    await TelemetryUtils.generateWorldInstallId();

    migrateOptionalRules();

    updateCachedWorldSettings();
    updateCachedUserSettings();

    // Create a base object to hook functions
    exposeAttributeAPI();
    exposeSkillCardAPI();
    exposeItemCardAPI();
    exposeGlobalActionsAPI();
    exposeCardClass();
    exposeIncapacitationCardAPI();
    setupChatButton();
    await cacheSkillData();

    // Load partials.
    const templatePaths = [
        "modules/betterrolls-swade2/templates/common_card_header.hbs",
        "modules/betterrolls-swade2/templates/trait_roll_partial.hbs",
        "modules/betterrolls-swade2/templates/trait_result_partial.hbs",
        "modules/betterrolls-swade2/templates/damage_partial.hbs",
        "modules/betterrolls-swade2/templates/actions_partial.hbs",
        "modules/betterrolls-swade2/templates/card_dialog.hbs",
        "modules/betterrolls-swade2/templates/action_section_partial.hbs",
        "modules/betterrolls-swade2/templates/setting_partial.hbs",
    ];
    foundry.applications.handlebars.loadTemplates(templatePaths).then(() => {
        console.info("Better Rolls templates preloaded");
    });

    Handlebars.registerHelper(`br2-cap`, s => s && String(s[0]).toUpperCase() + String(s).slice(1));

    // Add a hook to control combat flow.
    if (SettingsUtils.getWorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.autoStatusCards)) {
        game.swade.effectCallbacks.set("shaken", createUnshakeWrapper);
        game.swade.effectCallbacks.set("stunned", createUnstunWrapper);
    }

    compatibilityWarnings();
    setupDialog();

    // Remove the first hook from the hotbarDrop, hoping it is the system's
    const system_event = Hooks.events.hotbarDrop.find(
        (ev) => ev.fn.name === "onHotbarDrop",
    );
    Hooks.off("hotbarDrop", system_event.fn);

    console.info("Better Rolls 2 for SWADE | Ready");
    Hooks.callAll("brswReady");

    if (game.user.isGM) {
        TelemetryUtils.sendModuleReadyEvent();
    }

    TelemetryUtils.sendUserReadyEvent();
});

// Hooks on render

function activateCardListeners(brCard, html, message) {
    activateCommonListeners(brCard, html);
    if (brCard.type === BRSW2_CONST.BRSW_CARD_TYPES.TYPE_ATTRIBUTE_CARD) {
        activateAttributeCardListeners(brCard, html);
    } else if (brCard.type === BRSW2_CONST.BRSW_CARD_TYPES.TYPE_SKILL_CARD) {
        activateSkillCardListeners(brCard, html);
    } else if (brCard.type === BRSW2_CONST.BRSW_CARD_TYPES.TYPE_ITEM_CARD) {
        activateItemCardListeners(brCard, html);
    } else if (brCard.type === BRSW2_CONST.BRSW_CARD_TYPES.TYPE_DMG_CARD) {
        activateDamageCardListeners(message, html);
    } else if (brCard.type === BRSW2_CONST.BRSW_CARD_TYPES.TYPE_INC_CARD) {
        activateIncapacitationCardListeners(message, html);
    } else if (
        brCard.type === BRSW2_CONST.BRSW_CARD_TYPES.TYPE_UNSHAKE_CARD ||
        brCard.type === BRSW2_CONST.BRSW_CARD_TYPES.TYPE_UNSTUN_CARD
    ) {
        activateRemoveStatusCardListeners(brCard, html, brCard.type);
    }
}

Hooks.on("createChatMessage", (message, options, userId) => {
    const brData = message.getFlag("betterrolls-swade2", "br_data");
    if (brData) {
        if (brData.showPopout) {
            const relevantMessage = message.getFlag("betterrolls-swade2", "creator") === game.user.id || message.author.id === game.user.id;
            if (relevantMessage && SettingsUtils.getUserSetting(BRSW2_CONFIG.USER_SETTING_KEYS.autoPopoutChat)) {
                const brCard = new BrCommonCard(message);
                brCard.createPopout();
                return;
            }
        }
        ui.chat.notify(message, { newMessage: true });
    }
});

Hooks.on("hideNPCNamesChatMessageUpdated", (message, html, options) => {
    const brData = message.getFlag("betterrolls-swade2", "br_data");
    if (brData) {
        //We just updated the chat card to replace a name
        //Re-fit our target name so it's consistent with the replaced name
        const textMeasureContext = document.createElement("canvas").getContext("2d");
        fitDamageTargetText(html, textMeasureContext);
    }
});

Hooks.on("renderChatMessageHTML", (message, html, options) => {
    const brData = message.getFlag("betterrolls-swade2", "br_data");
    if (brData) {
        // This chat card is one of ours
        const brCard = new BrCommonCard(message);
        activateCardListeners(brCard, html, message);

        // Hide forms to non-master, non owner
        if (!message.isOwner) {
            html.querySelectorAll(".brsw-form").forEach((e) => e.classList.add("brsw-collapsed"));
        }

        if (!message.isOwner) {
            //Remove the PP and ammo management buttons for non-owners
            html.querySelector(".brsw-pp-toggle")?.remove();
            html.querySelector(".brsw-pp-manual")?.remove();
            html.querySelector(".brsw-ammo-toggle")?.remove();
            html.querySelector(".brsw-ammo-manual")?.remove();
        }

        // Hide master only sections
        if (!game.user.isGM) {
            html.querySelectorAll(".brsw-master-only").forEach((e) => e.remove());
        }

        // Hide save macro button from non-owner, non-trusted players
        if (!message.isOwner && !game.user.isTrusted) {
            html.querySelectorAll(".brsw-owner-trusted-only").forEach((e) => e.remove());
        }

        const damageSection = html.querySelector(".brsw-damage-section");
        if (damageSection) {
            //If we have damage, show the damage section
            damageSection.hidden = !brCard.damage;
        }

        const textMeasureContext = document.createElement("canvas").getContext("2d");

        const headerTitle = html.querySelector(".brsw-header-title");
        if (headerTitle) {
            textMeasureContext.font = `18px Signika`;
            const width = textMeasureContext.measureText(headerTitle.textContent).width;
            const maxWidth = 168;
            const defaultFontSize = 18;
            const fontSize = width > 0 ? Math.min(defaultFontSize, defaultFontSize * (maxWidth / width)) : defaultFontSize;
            headerTitle.style.setProperty("font-size", `${fontSize}px`);
        }

        fitDamageTargetText(html, textMeasureContext);

        if (game.user.isGM) {
            const applyDamageTitle = game.i18n.localize("BRSW.ApplyDamage");
            html.querySelectorAll(".brsw-apply-damage").forEach((applyButton) => {
                const targetId = applyButton.dataset.target;
                applyButton.disabled = !targetId;
                applyButton.title = targetId ? applyDamageTitle : "";
            });
        }

        // Scroll the chat to the bottom if this is the last message
        if (game.messages.contents[game.messages.contents.length - 1] === message) {
            const chat_bar = document.querySelector(".chat-log");
            if (chat_bar) {
                const rect = chat_bar.getBoundingClientRect();
                if (chat_bar.scrollHeight - rect.height * 2 < chat_bar.scrollTop) {
                    chat_bar.scrollTop = chat_bar.scrollHeight;
                }
            }
        }
        Hooks.call("BRSW-CardRendered", brCard);
    }
});

// Addon by JuanV, make attack target possible by drag and drop
Hooks.on("dropCanvasData", (canvas, item) => {
    if (item.type === "Item" || item.type === "target_click") {
        const grid_size = canvas.scene.grid.size;
        const square_size = grid_size * 0.3;
        canvas.tokens.targetObjects({
            x: item.x - square_size / 2,
            y: item.y - square_size / 2,
            height: square_size,
            width: square_size,
        });
        if (game.user.targets.size) {
            if (item.type === "Item") {
                Item.implementation.fromDropData(item).then((item) => {
                    let token_id;
                    let actor_id;
                    if (item.parent.parent) {
                        token_id = item.parent.parent.id;
                        actor_id = item.parent.parent.actorId;
                    } else {
                        actor_id = item.parent.id;
                    }
                    const command = create_macro_command(item, actor_id, token_id);
                    eval("(async () => {" + command + "})()");
                });
            } else if (item.type === "target_click") {
                const selector = `[data-message-id="${item.message_id}"] #${item.tag_id}`;
                document.querySelector(selector).click();
            }
        }
    }
});

function create_macro_command(data, actor_id, token_id) {
    const bt = "`";
    return `
            let behaviour = game.brsw.getActionFromClick(event);
            if (behaviour === 'system') {
                game.swade.rollItemMacro(${bt}${data.name}${bt});
                return;
            }
            let message;
            if (${data.type === "skill"}) {
                message = await game.brsw.createSkillCardFromId('${token_id}', '${actor_id}', '${data._id
        }');
            } else {
                message = await game.brsw.createItemCardFromId('${token_id}', '${actor_id}', '${data._id
        }');
            }
            if (event) {
                if (behaviour.includes('trait')) {
                    if (${data.type === "skill"}) {
                        game.brsw.rollSkill(message, $(message.content), false)
                    } else {
                        game.brsw.rollItem(message, $(message.content), false, behaviour.includes('damage'))
                    }
                }
            }
        `;
}

function create_attribute_macro(data) {
    return `
    let behaviour = game.brsw.getActionFromClick(event);
    if (behaviour === 'system') {
      game.swade.rollItemMacro("${data.attribute}");
    } else {
      origin = await fromUuid("${data.uuid}");
      const brCard = await game.brsw.createAttributeCard(origin, "${data.attribute}");
      if (behaviour.includes('trait')) {
        game.brsw.rollAttribute(brCard, false);
      }
    }
  `;
}

Hooks.on("hotbarDrop", (bar, data, slot) => {
    if (data.type === "Item") {
        Item.implementation.fromDropData(data).then((data) => {
            let token_id;
            let actor_id;
            if (data.parent.parent) {
                token_id = data.parent.parent.id;
                actor_id = data.parent.parent.actorId;
            } else {
                actor_id = data.parent.id;
            }
            const command = create_macro_command(data, actor_id, token_id);
            Macro.create({
                name: data?.name,
                type: "script",
                img: data?.img,
                command: command,
                scope: "global",
            }).then((macro) => {
                game.user.assignHotbarMacro(macro, slot);
            });
        });
        return false;
    } else if (data.type === "Attribute") {
        const command = create_attribute_macro(data);
        Macro.create({
            name: data.attribute,
            type: "script",
            img: "systems/swade/assets/icons/attribute.svg",
            command: command,
            scope: "global",
        }).then((macro) => {
            game.user.assignHotbarMacro(macro, slot);
        });
    }
    return true;
});

// Hooks for Dice So Nice
Hooks.once("diceSoNiceReady", () => {
    registerDSNSettings();
});

// Character sheet hooks

["SwadeNPCSheet"].forEach((name) => {
    Hooks.on("render" + name, (app, html, _) => {
        activate_attribute_listeners(app, html[0]);
        activate_skill_listeners(app, html[0]);
        activate_item_listeners(app, html[0]);
    });
});

["SwadeActorSheetV2"].forEach((name) => {
    Hooks.on("render" + name, (app, html, _) => {
        activate_attribute_listeners(app, html);
        activate_skill_listeners(app, html);
        activate_item_listeners(app, html);
    });
});

["renderSwadeVehicleSheet", "renderSwadeVehicleSheetV2"].forEach((name) => {
    Hooks.on(name, (app, html, _) => {
        activate_vehicle_listeners(app, html);
    });
});

//Compatibility warnings:
function compatibilityWarnings() {
    if (game.modules.get("swade-tools")?.active) {
        new foundry.applications.api.DialogV2({
            window: { title: "BRSW.CompatibilityHeadline" },
            position: { width: 400 },
            content: `<p>${game.i18n.localize(
                "BRSW.SwadeToolsCompatibilityWarning",
            )}</p>`,
            buttons: [
                {
                    label: "",
                    icon: "fas fa-check",
                    action: "one",
                    callback: (_) => {
                        new ModuleManagement().render(true);
                    },
                },
            ],
        }).render(true);
    }
}