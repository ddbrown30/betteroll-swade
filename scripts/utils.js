import * as BRSW2_CONFIG from "./brsw2-config.js";

// Utility functions that can be used out of the module
/* globals ChatMessage, game, console, foundry, ClientSetting, CONFIG */

export function getWhisperData() {
    let whisper, blind;
    const messageMode = game.settings.get("core", "messageMode");
    if (["gm", "blind"].includes(messageMode)) {
        whisper = ChatMessage.getWhisperRecipients("GM");
    }
    if (messageMode === "blind") {
        blind = true;
    } else if (messageMode === "self") {
        whisper = [game.user._id];
    }
    return {
        messageMode: messageMode,
        whisper: whisper,
        blind: blind,
    };
}

export function getAuthor(actor) {
    if (!actor || !game.user.isGM) {
        return game.user.id;
    }

    //Filter out the default and local user
    const ownership = Object.entries(actor.ownership).filter(o => o[0] != "default" &&
        o[0] != game.user.id &&
        o[1] === CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);

    //If we have no owners, use the GM
    if (ownership.length == 0) {
        return game.user.id;
    }

    //If we have exactly one owner, use that
    if (ownership.length == 1) {
        return ownership[0][0];
    }

    //If we have multiple owners, get the player that represents this actor
    //If there is none, fall back to the first owner in the list
    let fallbackAuthor;
    for (let owner of ownership) {
        const user = game.users.get(owner[0]);
        if (user) {
            if (user.isGM) {
                //Skip other GMs
                continue;
            }

            if (user.character === actor) {
                return owner[0];
            }
            else if (!fallbackAuthor) {
                fallbackAuthor = owner[0];
            }
        }
    }

    //There is no player rep so use the fallback or the GM
    return fallbackAuthor ?? game.user.id;
}

export function makeExplotable(expression) {
    // Make all dice of a roll able to explode
    // Code from the SWADE system
    const reg_exp = /\d*d\d+[^kdrxc]/g;
    let new_expression = expression + " "; // Just because of my poor reg_exp foo
    const dice_strings = new_expression.match(reg_exp);
    const used = [];
    if (dice_strings) {
        dice_strings.forEach((match) => {
            if (used.indexOf(match.slice(0, -1)) === -1) {
                new_expression = new_expression.replace(
                    new RegExp(match.slice(0, -1), "g"),
                    match.slice(0, -1) + "x",
                );
                used.push(match.slice(0, -1));
            }
        });
    }
    return new_expression;
}

export async function spendMastersBenny() {
    // Spends one benny from the gamemaster stack
    // noinspection ES6MissingAwait
    for (const user of game.users) {
        if (user.isGM) {
            const value = user.getFlag("swade", "bennies");
            if (value > 0) {
                await user.setFlag("swade", "bennies", value - 1);
            }
        }
    }
}

export function broofa() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0, //jshint ignore:line
            v = c === "x" ? r : (r & 0x3) | 0x8; // jshint ignore:line
        return v.toString(16);
    });
}

export async function cacheSkillData() {
    game.brsw.SKILLS_DATA = {};
    for (const pack of game.packs) {
        if (pack.metadata.type === "Item") {
            let packIndex = await pack.getIndex({ fields: ["system"] });
            const skills = packIndex.filter(i => i.type === "skill");
            for (const skill of skills) {
                if (skill.system.swid && !game.brsw.SKILLS_DATA[skill.system.swid] && skill.system.attribute) {
                    game.brsw.SKILLS_DATA[skill.system.swid] = {
                        name: skill.name,
                        attribute: skill.system.attribute,
                    }
                }
            }
        }
    }
}

/**
 * Show a simple form
 *
 * @param {string} title The form title
 * @param {[object]} fields Array of {id, label, default_value}, if there
 *  is no id it will use label as an id, beware of spaces
 * @param {function} callback A callback function to pass the data
 */
export async function simple_form(title, fields, callback) {
    let content = "<form>";
    for (const field of fields) {
        const field_id = field.id || field.label;
        content += `<div class="form-group"><label>${field.label}</label>
            <input id='input_${field_id}' value='${field.default_value}'></div>`;
    }
    content += "</form>";
    await foundry.applications.api.DialogV2.wait({
        window: { title: title },
        content: content,
        buttons: [
            {
                label: "OK",
                action: "one",
                callback: (event, target, dialog) => {
                    const values = {};
                    for (const field of fields) {
                        const field_id = field.id || field.label;
                        values[field_id] = dialog.element.querySelector(
                            `#input_${field_id}`,
                        ).value;
                    }
                    callback(values);
                },
            },
            {
                label: "Cancel",
                action: "two",
            },
        ],
    });
}

/**
 * Gets the first targeted token
 */
export function get_targeted_token() {
    /**
     * Sets the difficulty as the parry value of the targeted
     * or selected token
     */
    const targets = game.user.targets;
    let objective;
    if (targets.size) {
        objective = Array.from(targets)[0];
    }
    return objective;
}

/**
 * Sets or updates a condition
 * @param {string} condition_id
 * @param {SwadeActor} actor
 */
export async function set_or_update_condition(condition_id, actor) {
    // noinspection ES6RedundantAwait
    let condition = actor.effects.find((ef) => {
        return ef.statuses.has(condition_id);
    });
    if (!condition) {
        condition = await actor.toggleStatusEffect(condition_id, { active: true });
    }
    await condition.update({
        ["duration.startRound"]: game.combat ? game.combat.round : 0,
        ["duration.startTurn"]: game.combat ? game.combat.turn : 0,
    });
}

export function addEventListenerAll(
    html,
    selector,
    type,
    listener,
    useCapture = false,
) {
    html.querySelectorAll(selector).forEach((e) => {
        e.addEventListener(type, listener, useCapture);
    });
}

function measurePath(waypoints) {
    const use_grid_calc = SettingsUtils.getWorldSetting("range_calc_grid");
    const path = canvas.grid.measurePath(waypoints);
    return use_grid_calc ? path.distance : path.euclidean;
}

function getTokenGridSpaces(token) {
    const gridSpaces = [];
    if (canvas.grid.isGridless) {
        //If we have a gridless grid, divide our token into 1" sections based on the grid size
        //We'll use those as our occupied "spaces" even though there are none
        const halfGrid = canvas.grid.size;
        const start = {
            x: token.bounds.left + halfGrid,
            y: token.bounds.top + halfGrid,
        };
        const dimensions = {
            width: Math.max(1, Math.round(token.document.width)),
            height: Math.max(1, Math.round(token.document.height)),
        };

        for (let i = 0; i < dimensions.width; ++i) {
            for (let j = 0; j < dimensions.height; ++j) {
                const coords = {
                    x: start.x + i * canvas.grid.sizeX,
                    y: start.y + j * canvas.grid.sizeY,
                };
                gridSpaces.push({ coords });
            }
        }
    } else {
        for (const space of token.document.getOccupiedGridSpaceOffsets()) {
            gridSpaces.push({ coords: canvas.grid.getCenterPoint(space) });
        }
    }
    return gridSpaces;
}

export function measureDistance(tokenA, tokenB) {
    if (!tokenA || !tokenB) {
        ui.notifications.error("measureDistance requires two tokens");
        return 0;
    }

    const tokenAGridSpaces = getTokenGridSpaces(tokenA);
    const tokenBGridSpaces = getTokenGridSpaces(tokenB);

    const distSq = function (a, b) {
        return Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2);
    };

    const closestPair = { a: null, b: null };
    for (const tokenASpace of tokenAGridSpaces) {
        for (const tokenBSpace of tokenBGridSpaces) {
            const dist = distSq(tokenASpace.coords, tokenBSpace.coords);
            if (!closestPair.a) {
                //If we don't have a closest pair yet, use this one
                closestPair.a = tokenASpace;
                closestPair.b = tokenBSpace;
                closestPair.dist = dist;
                continue;
            }

            if (dist < closestPair.dist) {
                //This pair is closer than our previous pair
                closestPair.a = tokenASpace;
                closestPair.b = tokenBSpace;
                closestPair.dist = dist;
            }
        }
    }
    let measured_distance = measurePath([
        closestPair.a.coords,
        closestPair.b.coords,
    ]);
    if (SettingsUtils.getWorldSetting("measure_from_edge")) {
        measured_distance -= game.scenes.current.grid.distance;
    }
    return measured_distance;
}

export class Utils {
    //Compares lhs and rhs for equality
    //This pulls operators from rhs for the comparison or defaults to === if none is present
    static check_equality_with_operators(lhs, rhs) {
        const [, op = "===", raw] = String(rhs).match(/^\s*(>=|<=|!==|===|!=|==|=|>|<)?\s*(.*)$/);
        const val = raw.trim();

        const rhsVal =
            val === "true" && typeof lhs === "boolean" ? true :
                val === "false" && typeof lhs === "boolean" ? false :
                    val !== "" && !isNaN(val) ? +val :
                        val;

        if ([">", "<", ">=", "<="].includes(op)) {
            const a = typeof lhs === "number" ? lhs : NaN;
            const b = typeof rhsVal === "number" ? rhsVal : NaN;
            return !Number.isNaN(a) && !Number.isNaN(b) && { ">": a > b, ">=": a >= b, "<": a < b, "<=": a <= b }[op];
        }

        return {
            "==": lhs == rhsVal,
            "=": lhs == rhsVal,
            "!=": lhs != rhsVal,
            "===": lhs === rhsVal,
            "!==": lhs !== rhsVal
        }[op];
    }

    static toTitleCase(str) {
        return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    }

    static forEachActionGroup(brCard, callbackFn) {
        for (const sectionName in brCard.action_sections) {
            const section = brCard.action_sections[sectionName];
            for (const group in section.action_groups) {
                const retVal = callbackFn(section.action_groups[group]);
                if (retVal !== undefined) {
                    return retVal;
                }
            }
        }
    }

    static actionNameSimilarity(a, b) {
        function normalizeName(name) {
            return name
                .replace(/\s*\([^)]*\)/g, "")     // Remove stuff in parentheses e.g. Greater Damage (4d6)
                .replace(/[^\p{L}\p{N}]+/gu, " ") // Remove non-alphanumeric characters
                .replace(/\s+/g, " ")             // Remove all whitespace except a single space between words
                .trim()
                .toLowerCase();
        }

        const aWords = new Set(normalizeName(a).split(" "));
        const bWords = new Set(normalizeName(b).split(" "));

        const intersection = [...aWords].filter(word => bWords.has(word)).length;
        const union = new Set([...aWords, ...bWords]).size;

        return union === 0 ? 1 : intersection / union;
    }

    /**
     * Get a skill or attribute from an actor and the skill name
     * @param {SwadeActor} actor Where search for the skill
     * @param {Object} actor.data
     * @param {Array} actor.items
     * @param {string} trait_name
     */
    static traitFromString(actor, traitName) {
        const traitLower = traitName.toLowerCase();
        let trait = actor.items.find((skill) => {
            return (
                skill.type === "skill" &&
                skill.name.toLowerCase().replace("★ ", "") ===
                traitLower.replace("★ ", "")
            );
        });

        if (!trait) {
            // Time to check for an attribute
            for (const attribute of BRSW2_CONFIG.ATTRIBUTES) {
                const translation = game.i18n.localize(
                    BRSW2_CONFIG.ATTRIBUTES_TRANSLATION_KEYS[attribute],
                );
                if (traitLower === translation.toLowerCase()) {
                    trait = { system: structuredClone(actor.system.attributes[attribute]) };
                    trait.name = translation;
                }
            }
        }

        if (!trait) {
            // No skill was found, we try to find untrained
            trait = Utils.findFirstSkillInActor(actor, [
                ...BRSW2_CONFIG.UNTRAINED_SKILLS,
                game.i18n.localize("BRSW.SkillName.UnskilledAttempt").toLowerCase(),
            ]);
        }

        return trait;
    }

    /**
     * Guess the skill/attribute that should be rolled for an item
     * @param {Item} item The item.
     * @param {string} item.system.arcane
     * @param {Object} item.data
     * @param {Object} item.system.actions
     * @param {string} item.system.range
     * @param {SwadeActor} actor The owner of the item
     */
    static getItemTrait(item, actor) {
        // First, if the item has a skill in actions tab, we use it
        if (item.system.actions && item.system.actions.trait) {
            return Utils.traitFromString(actor, item.system.actions.trait);
        }
        // Now check for a skill in additional actions.
        if (item.system.actions) {
            for (const action in item.system.actions.additional) {
                if (
                    item.system.actions.additional[action].type === "trait" &&
                    item.system.actions.additional[action].override // name => override (use override if we really want to check for action trait name)
                ) {
                    return Utils.traitFromString(
                        actor,
                        item.system.actions.additional[action].override, // name => override  (use override if we really want to check for action trait name)
                    );
                }
            }
        }
        // Some types of items don't have an associated skill
        if (
            [
                "armor",
                "shield",
                "gear",
                "edge",
                "hindrance",
                "ability",
                "consumable",
            ].includes(item.type.toLowerCase())
        ) {
            return "";
        }

        // Now check if there is something in the Arcane field
        if (item.system.arcane) {
            return Utils.traitFromString(actor, item.system.arcane);
        }

        // If there is no skill anyway, we are left to guessing
        let skill;
        if (item.type === "power") {
            skill = Utils.findFirstSkillInActor(actor, BRSW2_CONFIG.ARCANE_SKILLS);
        } else if (item.type === "weapon") {
            if (parseInt(item.system.range) > 0) {
                // noinspection JSUnresolvedVariable
                if (item.system.damage.includes("str")) {
                    skill = Utils.findFirstSkillInActor(actor, [
                        ...BRSW2_CONFIG.THROWING_SKILLS,
                        game.i18n.localize("BRSW.SkillName.Athletics").toLowerCase(), // add localization
                    ]);
                } else {
                    skill = Utils.findFirstSkillInActor(actor, [
                        ...BRSW2_CONFIG.SHOOTING_SKILLS,
                        game.i18n.localize("BRSW.SkillName.Shooting").toLowerCase(), // add localization
                    ]);
                }
            } else {
                skill = Utils.findFirstSkillInActor(actor, [
                    ...BRSW2_CONFIG.FIGHTING_SKILLS,
                    game.i18n.localize("BRSW.SkillName.Fighting").toLowerCase(), // bag add localization
                ]);
            }
        }

        if (skill === undefined) {
            skill = Utils.findFirstSkillInActor(actor, [
                ...BRSW2_CONFIG.UNTRAINED_SKILLS,
                game.i18n.localize("BRSW.SkillName.UnskilledAttempt").toLowerCase(),
            ]);
        }

        return skill;
    }

    /**
     * Check if an actor has a skill in a list
     * @param {SwadeActor} actor
     * @param {[string]} possibleSkills List of skills to check
     * @return {Item} found skill or undefined
     */
    static findFirstSkillInActor(actor, possibleSkills) {
        let skillFound;
        actor.items.forEach((skill) => {
            if (possibleSkills.some((v) => skill.name.toLowerCase().includes(v)) && skill.type === "skill") {
                skillFound = skill;
            }
        });
        return skillFound;
    }

    /***
     * Checks if a skill is fighting, likely not the best way
     *
     * @param skill
     * @return {boolean}
     */
    static isFightingSkill(skill) {
        const configured_skill_swid = game.settings.get("swade", "parryBaseSwid").toLowerCase();
        if (skill.system.swid === configured_skill_swid) {
            return true;
        }

        const configured_skill_name = game.settings.get("swade", "parryBaseSkill").toLowerCase();
        const fightingNames = BRSW2_CONFIG.FIGHTING_SKILLS;
        fightingNames.push(configured_skill_name);
        return fightingNames.includes(skill.name.toLowerCase());
    }

    /***
     * Checks if a skill is shooting.
     * @param skill
     * @return {boolean}
     */
    static isShootingSkill(skill) {
        if (!skill) return false;
        if (skill.system.swid === "shooting") return true;

        const shootingNames = BRSW2_CONFIG.SHOOTING_SKILLS;
        shootingNames.push(game.i18n.localize("BRSW.SkillName.Shooting"));
        return shootingNames.includes(skill.name.toLowerCase());
    }

    /***
     * Checks if a skill is throwing.
     * @param skill
     * @return {boolean}
     */
    static isThrowingSkill(skill) {
        if (!skill) return false;
        if (skill.system.swid === "athletics") return true;

        const throwingNames = BRSW2_CONFIG.THROWING_SKILLS;
        throwingNames.push(game.i18n.localize("BRSW.SkillName.Athletics"));
        return throwingNames.includes(skill.name.toLowerCase());
    }

    static isWeapon(item) {
        return item && item.type === "weapon";
    }

    static isBolt(item) {
        return item && item.type === "power" && (item.system.swid === "bolt" || item.name.toLowerCase().includes("bolt"));
    }

    static isWeaponOrBolt(item) {
        return Utils.isWeapon(item) || Utils.isBolt(item);
    }

    static isMeleeAttack(item, actor, trait) {
        if (Utils.isBolt(item) || !Utils.isWeapon(item)) {
            return false;
        }

        trait = trait ?? Utils.getItemTrait(item, actor);
        return item.system.isMelee && (!item.system.isRanged || trait?.system.swid === 'fighting');
    }

    static isRangedAttack(item, actor, trait) {
        if (Utils.isBolt(item)) {
            return true;
        }

        if (!Utils.isWeapon(item)) {
            return false;
        }

        trait = trait ?? Utils.getItemTrait(item, actor);
        return item.system.isRanged && (!item.system.isMelee || trait?.system.swid !== 'fighting');
    }

    static actorHasArcaneMastery(actor) {
        const edgeNames = BRSW2_CONFIG.ARCANE_MASTERY_EDGES.map((edge) => game.i18n.localize(edge).toLowerCase());
        const edge = actor?.items.find((item) => {
            return (
                item.type === "edge" &&
                edgeNames.some((edgeName) => item.name.toLowerCase().includes(edgeName))
            );
        });

        return !!edge;
    }

    static getNoPPPenaltySelections(ppCost) {
        const result = [];
        if (ppCost === 0) return result;

        let penalty = Math.ceil(ppCost / 2);

        for (let p = BRSW2_CONFIG.MAX_NOPP_PENALTY_ACTION; p >= 1 && penalty > 0; --p) {
            if (penalty >= p) {
                result.push(p);
                penalty -= p;
            }
        }

        return result;
    }
}

export class SettingsUtils {
    /**
     * Get a single setting using the provided key
     * @param {*} key
     * @returns {Object} setting
     */
    static getSetting(key) {
        return game.settings.get(BRSW2_CONFIG.MODULE_NAME, key);
    }

    /**
     * Sets a single game setting
     * @param {*} key
     * @param {*} value
     * @returns {Promise | ClientSetting}
     */
    static async setSetting(key, value) {
        await game.settings
            .set(BRSW2_CONFIG.MODULE_NAME, key, value)
            .then((result) => {
                return result;
            })
            .catch((rejected) => {
                throw rejected;
            });
    }

    /**
     * Register a single setting using the provided key and setting data
     * @param {*} key
     * @param {*} metadata
     */
    static registerSetting(key, metadata) {
        return game.settings.register(BRSW2_CONFIG.MODULE_NAME, key, metadata);
    }

    /**
     * Register a menu setting using the provided key and setting data
     * @param {*} key
     * @param {*} metadata
     */
    static registerMenu(key, metadata) {
        return game.settings.registerMenu(BRSW2_CONFIG.MODULE_NAME, key, metadata);
    }

    /**
     * Register a single setting using the provided key and setting data
     * @param {*} key
     * @param {*} metadata
     */
    static registerBR2WorldSetting(key, metadata) {
        if (BRSW2_CONFIG.WORLD_SETTINGS[key] || BRSW2_CONFIG.USER_SETTINGS[key]) {
            console.error("Duplicate setting key");
            return;
        }

        const setting = {};
        setting.key = key;
        foundry.utils.mergeObject(setting, metadata);
        BRSW2_CONFIG.WORLD_SETTINGS[key] = setting;
    }

    /**
     * Register a single setting using the provided key and setting data
     * @param {*} key
     * @param {*} metadata
     */
    static registerBR2UserSetting(key, metadata) {
        if (BRSW2_CONFIG.WORLD_SETTINGS[key] || BRSW2_CONFIG.USER_SETTINGS[key]) {
            console.error("Duplicate setting key");
            return;
        }

        const setting = {};
        setting.key = key;
        foundry.utils.mergeObject(setting, metadata);
        BRSW2_CONFIG.USER_SETTINGS[key] = setting;
    }

    static isOptionalRuleEnabled(rule) {
        return SettingsUtils.getSetting("optional_rules_enabled").indexOf(rule) > -1;
    }

    static hasModuleFlags(obj) {
        if (!obj.flags) {
            return false;
        }

        return !!obj.flags[BRSW2_CONFIG.MODULE_NAME];
    }

    static getModuleFlag(obj, flag) {
        if (!SettingsUtils.hasModuleFlags(obj)) {
            return;
        }

        return obj.flags[BRSW2_CONFIG.MODULE_NAME][flag];
    }

    static getWorldSetting(key) {
        if (!BRSW2_CONFIG.WORLD_SETTINGS[key]) {
            return;
        }

        return BRSW2_CONFIG.WORLD_SETTINGS[key].value !== undefined
            ? BRSW2_CONFIG.WORLD_SETTINGS[key].value
            : BRSW2_CONFIG.WORLD_SETTINGS[key].default;
    }

    static getUserSetting(key) {
        if (!BRSW2_CONFIG.USER_SETTINGS[key]) {
            return;
        }

        return BRSW2_CONFIG.USER_SETTINGS[key].value !== undefined
            ? BRSW2_CONFIG.USER_SETTINGS[key].value
            : BRSW2_CONFIG.USER_SETTINGS[key].default;
    }
}
