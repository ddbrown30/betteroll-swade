
import { MAX_NOPP_PENALTY_ACTION, MODULE_NAME, SETTING_KEYS, USER_FLAGS, USER_SETTINGS, USER_SETTING_KEYS, WORLD_SETTINGS, WORLD_SETTING_KEYS } from "./brsw2-config.js";
import { BRSW2_CONST } from "./brsw2-const.js";

// Utility functions that can be used out of the module

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
    const ownership = Object.entries(actor.ownership).filter(o =>
        o[0] !== "default" &&
        o[0] !== game.user.id &&
        o[1] === CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);

    //If we have no owners, use the GM
    if (ownership.length === 0) {
        return game.user.id;
    }

    //If we have exactly one owner, use that
    if (ownership.length === 1) {
        return ownership[0][0];
    }

    //If we have multiple owners, get the player that represents this actor
    //If there is none, fall back to the first owner in the list
    let fallbackAuthor;
    for (const owner of ownership) {
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

export function makeExplodable(expression) {
    return expression.replace(
        /((?:\d+)?d\d+)([a-zA-Z]+(?:[<>=]+-?\d+)*)?/g,
        (match, dice, modifiers = "") => {
            return modifiers ? match : `${dice}x`;
        },
    );
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

    const skillPacks = game.packs.filter((pack) =>
        pack.metadata.type === "Item" &&
        pack.metadata.name.toLowerCase().includes("skill"));

    for (const pack of skillPacks) {
        const packIndex = await pack.getIndex({ fields: ["system"] });
        const skills = packIndex.filter(i => i.type === "skill");
        for (const skill of skills) {
            if (skill.system.swid && !game.brsw.SKILLS_DATA[skill.system.swid] && skill.system.attribute) {
                game.brsw.SKILLS_DATA[skill.system.swid] = {
                    name: skill.name,
                    attribute: skill.system.attribute,
                };
            }
        }
    }

    for (const item of game.items) {
        if (item.type === "skill" && item.system.swid && !game.brsw.SKILLS_DATA[item.system.swid] && item.system.attribute) {
            game.brsw.SKILLS_DATA[item.system.swid] = {
                name: item.name,
                attribute: item.system.attribute,
            };
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
 * Gets the user's list of targets
 */
export function getUserTargets() {
    if (game.user.targets.size || !game.brsw.targetIds?.length) {
        return Array.from(game.user.targets).map(t => Utils.toTokenDoc(t));
    }
    return game.brsw.targetIds.map(t => fromUuidSync(t)).filter(Boolean);
}

/**
 * Gets the first targeted token
 */
export function getTargetedToken(originActors) {
    return getUserTargets()[0] ?? getSelectedToken(originActors);
}

/**
 * Gets the first selected token
 */
export function getSelectedToken(originActors) {
    const originActorIds = new Set(originActors?.map(a => a.id) ?? []);
    return Utils.toTokenDoc(canvas.tokens?.controlled.find((t) => t.actor && !originActorIds.has(t.actor.id)));
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
    const useGridCalc = SettingsUtils.getWorldSetting(WORLD_SETTING_KEYS.rangeCalcGrid);
    const path = canvas.grid.measurePath(waypoints);
    return useGridCalc ? path.distance : path.euclidean;
}

function getTokenGridSpaces(tokenDoc) {
    const gridSpaces = [];
    if (canvas.grid.isGridless) {
        //If we have a gridless grid, divide our token into 1" sections based on the grid size
        //We'll use those as our occupied "spaces" even though there are none
        const halfGrid = canvas.grid.size / 2;
        const start = {
            x: tokenDoc.x + halfGrid,
            y: tokenDoc.y + halfGrid,
        };
        const dimensions = {
            width: Math.max(1, Math.round(tokenDoc.width)),
            height: Math.max(1, Math.round(tokenDoc.height)),
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
        for (const space of tokenDoc.getOccupiedGridSpaceOffsets()) {
            gridSpaces.push({ coords: canvas.grid.getCenterPoint(space) });
        }
    }
    return gridSpaces;
}

export function measureDistance(tokenA, tokenB) {
    tokenA = Utils.toTokenDoc(tokenA);
    tokenB = Utils.toTokenDoc(tokenB);
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

    let measuredDistance = measurePath([
        closestPair.a.coords,
        closestPair.b.coords,
    ]);

    if (SettingsUtils.getWorldSetting(WORLD_SETTING_KEYS.measureFromEdge)) {
        //If we're measuring from the edge, we need to offset from the center of the grid space to the edge
        //To do this, we need to find the intersection distance from center to edge based on the angle between the two tokens
        const dist = Math.sqrt(closestPair.dist);
        if (dist > 0) {
            const dir = {
                x: (closestPair.b.coords.x - closestPair.a.coords.x) / dist,
                y: (closestPair.b.coords.y - closestPair.a.coords.y) / dist,
            };

            const distanceToEdge = (tokenA.scene.grid.distance / 2) / Math.max(Math.abs(dir.x), Math.abs(dir.y));
            measuredDistance -= (distanceToEdge * 2); //Times 2 because we're offsetting the distance for both tokens
        }
    }

    return measuredDistance;
}

export class Utils {
    static warnedDeprecatedAPIs = new Set();
    static exposeAPI(name, fn, deprecatedName) {
        game.brsw[name] = fn;

        if (deprecatedName) {
            game.brsw[deprecatedName] = (...args) => {
                if (!Utils.warnedDeprecatedAPIs.has(deprecatedName)) {
                    foundry.utils.logCompatibilityWarning(
                        `game.brsw.${deprecatedName} is deprecated. Use game.brsw.${name} instead.`,
                        { since: "5.19.0" }
                    );
                    Utils.warnedDeprecatedAPIs.add(deprecatedName);
                }
                return fn(...args);
            };
        }
    }

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

    //Converts a string to headline case
    static toTitleCase(str) {
        const minorWords = new Set([
            "a", "an", "the",
            "and", "but", "or", "nor",
            "as", "at", "by", "for", "from",
            "in", "into", "of", "on", "onto",
            "per", "to", "up", "via", "with"
        ]);

        return str
            .toLowerCase()
            .split(/\s+/)
            .map((word, index, words) => {
                if (index !== 0 && index !== words.length - 1 && minorWords.has(word)) {
                    return word;
                }
                return word.charAt(0).toUpperCase() + word.slice(1);
            }).join(" ");
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
                skill.name.toLowerCase().replace("★ ", "") === traitLower.replace("★ ", "")
            );
        });

        if (!trait) {
            // Time to check for an attribute
            for (const attribute of BRSW2_CONST.ATTRIBUTES) {
                const translation = game.i18n.localize(BRSW2_CONST.ATTRIBUTES_TRANSLATION_KEYS[attribute]);
                if (traitLower === attribute || traitLower === translation.toLowerCase()) {
                    trait = { system: structuredClone(actor.system.attributes[attribute]) };
                    trait.name = attribute;
                    trait.translatedName = translation;
                    break;
                }
            }
        }

        if (!trait) {
            // No skill was found, we try to find untrained
            trait = Utils.findFirstSkillInActor(actor, [
                ...BRSW2_CONST.UNTRAINED_SKILLS,
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
            skill = Utils.findFirstSkillInActor(actor, BRSW2_CONST.ARCANE_SKILLS);
        } else if (item.type === "weapon") {
            if (parseInt(item.system.range) > 0) {
                // noinspection JSUnresolvedVariable
                if (item.system.damage.includes("str")) {
                    skill = Utils.findFirstSkillInActor(actor, [
                        ...BRSW2_CONST.THROWING_SKILLS,
                        game.i18n.localize("BRSW.SkillName.Athletics").toLowerCase(), // add localization
                    ]);
                } else {
                    skill = Utils.findFirstSkillInActor(actor, [
                        ...BRSW2_CONST.SHOOTING_SKILLS,
                        game.i18n.localize("BRSW.SkillName.Shooting").toLowerCase(), // add localization
                    ]);
                }
            } else {
                skill = Utils.findFirstSkillInActor(actor, [
                    ...BRSW2_CONST.FIGHTING_SKILLS,
                    game.i18n.localize("BRSW.SkillName.Fighting").toLowerCase(), // bag add localization
                ]);
            }
        }

        if (skill === undefined) {
            skill = Utils.findFirstSkillInActor(actor, [
                ...BRSW2_CONST.UNTRAINED_SKILLS,
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
        if (!skill) return false;
        const configured_skill_swid = game.settings.get("swade", "parryBaseSwid").toLowerCase();
        if (skill.system.swid === configured_skill_swid) {
            return true;
        }

        const configured_skill_name = game.settings.get("swade", "parryBaseSkill").toLowerCase();
        const fightingNames = BRSW2_CONST.FIGHTING_SKILLS;
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

        const shootingNames = BRSW2_CONST.SHOOTING_SKILLS;
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

        const throwingNames = BRSW2_CONST.THROWING_SKILLS;
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

    static isMeleeAttack(item, skill) {
        if (Utils.isBolt(item) || !Utils.isWeapon(item)) {
            return false;
        }

        return item.system.isMelee && (!item.system.isRanged || skill?.system.swid === 'fighting');
    }

    static isRangedAttack(item, actor, skill) {
        if (Utils.isBolt(item)) {
            return true;
        }

        if (!Utils.isWeapon(item)) {
            return false;
        }

        skill = skill ?? Utils.getItemTrait(item, actor);
        return item.system.isRanged && (!item.system.isMelee || skill?.system?.swid !== 'fighting');
    }

    static actorHasArcaneMastery(actor) {
        const edgeNames = BRSW2_CONST.ARCANE_MASTERY_EDGES.map((edge) => game.i18n.localize(edge).toLowerCase());
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

        for (let p = MAX_NOPP_PENALTY_ACTION; p >= 1 && penalty > 0; --p) {
            if (penalty >= p) {
                result.push(p);
                penalty -= p;
            }
        }

        return result;
    }

    static getDefaultPPManagementSetting() {
        const playerChoiceEnabled = SettingsUtils.getWorldSetting(WORLD_SETTING_KEYS.ppManagementPlayerChoice);
        const worldValue = SettingsUtils.getWorldSetting(WORLD_SETTING_KEYS.defaultPPManagement);

        if (!playerChoiceEnabled) {
            return worldValue;
        }

        const playerValue = SettingsUtils.getUserSetting(USER_SETTING_KEYS.playerDefaultPPManagement);
        if (playerValue === "world") {
            return worldValue;
        }

        return playerValue === "enabled";
    }

    static shouldShowInjury(heavyDamage) {
        if (SettingsUtils.getWorldSetting(WORLD_SETTING_KEYS.grittyDamage)) {
            return true;
        }

        if (SettingsUtils.getWorldSetting(WORLD_SETTING_KEYS.riftsGrittyDamage)) {
            return heavyDamage;
        }

        return false;
    }

    static toTokenDoc(entity) {
        if (entity instanceof TokenDocument) { return entity; }
        if (entity instanceof foundry.canvas.placeables.Token) { return entity.document; }
        return null;
    }

    static toToken(entity) {
        if (entity instanceof foundry.canvas.placeables.Token) { return entity; }
        if (entity instanceof TokenDocument) { return entity.object; }
        return null;
    }

    static toActor(entity) {
        if (entity instanceof Actor) { return entity; }
        if (entity instanceof TokenDocument || entity instanceof foundry.canvas.placeables.Token) { return entity.actor; }
        return null;
    }
}

export class SettingsUtils {
    /**
     * Get a single setting using the provided key
     * @param {*} key
     * @returns {Object} setting
     */
    static getSetting(key) {
        return game.settings.get(MODULE_NAME, key);
    }

    /**
     * Sets a single game setting
     * @param {*} key
     * @param {*} value
     * @returns {Promise | ClientSetting}
     */
    static async setSetting(key, value) {
        await game.settings
            .set(MODULE_NAME, key, value)
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
        return game.settings.register(MODULE_NAME, key, metadata);
    }

    /**
     * Register a menu setting using the provided key and setting data
     * @param {*} key
     * @param {*} metadata
     */
    static registerMenu(key, metadata) {
        return game.settings.registerMenu(MODULE_NAME, key, metadata);
    }

    /**
     * Register a single setting using the provided key and setting data
     * @param {*} key
     * @param {*} metadata
     */
    static registerBR2WorldSetting(key, metadata) {
        if (WORLD_SETTINGS[key] || USER_SETTINGS[key]) {
            console.error("Duplicate setting key");
            return;
        }

        const setting = {};
        setting.key = key;
        foundry.utils.mergeObject(setting, metadata);
        WORLD_SETTINGS[key] = setting;
    }

    static async setWorldSettings() {
        if (!game.user.hasPermission("SETTINGS_MODIFY")) {
            return;
        }

        const worldSettings = Object.fromEntries(
            Object.entries(WORLD_SETTINGS).filter(([, value]) => value.value !== undefined && value.value !== value.default).map(([key, value]) => [
                key,
                value.value
            ])
        );

        await SettingsUtils.setSetting(SETTING_KEYS.worldSettings, worldSettings);
    }

    /**
     * Register a single setting using the provided key and setting data
     * @param {*} key
     * @param {*} metadata
     */
    static registerBR2UserSetting(key, metadata) {
        if (WORLD_SETTINGS[key] || USER_SETTINGS[key]) {
            console.error("Duplicate setting key");
            return;
        }

        const setting = {};
        setting.key = key;
        foundry.utils.mergeObject(setting, metadata);
        USER_SETTINGS[key] = setting;
    }

    static async setUserSettings() {
        const userSettings = Object.fromEntries(
            Object.entries(USER_SETTINGS).filter(([, value]) => value.value !== undefined && value.value !== value.default).map(([key, value]) => [
                key,
                value.value
            ])
        );

        await SettingsUtils.unsetModuleFlag(game.user, USER_FLAGS.userSettings);
        await SettingsUtils.setModuleFlag(game.user, USER_FLAGS.userSettings, userSettings);
    }

    static hasModuleFlags(obj) {
        if (!obj.flags) {
            return false;
        }

        return !!obj.flags[MODULE_NAME];
    }

    static getModuleFlag(obj, flag) {
        if (!SettingsUtils.hasModuleFlags(obj)) {
            return undefined;
        }

        return obj.flags[MODULE_NAME][flag];
    }

    static async setModuleFlag(obj, flag, data) {
        return await obj.setFlag(MODULE_NAME, flag, data);
    }

    static async unsetModuleFlag(obj, flag) {
        return await obj.unsetFlag(MODULE_NAME, flag);
    }

    static getWorldSetting(key) {
        if (!WORLD_SETTINGS[key]) {
            return undefined;
        }

        return WORLD_SETTINGS[key].value !== undefined
            ? WORLD_SETTINGS[key].value
            : WORLD_SETTINGS[key].default;
    }

    static getUserSetting(key) {
        if (!USER_SETTINGS[key]) {
            return undefined;
        }

        return USER_SETTINGS[key].value !== undefined
            ? USER_SETTINGS[key].value
            : USER_SETTINGS[key].default;
    }
}

export class TelemetryUtils {
    static POSTHOG_API_KEY = "phc_pTRr4oK26yQDbmFSkPuCNswLTtZABEHktpn9cNqYuAnr";

    static #worldInstallIdPromise;
    static generateWorldInstallId() {
        if (!game.user.isGM) {
            return "";
        }

        const id = SettingsUtils.getSetting(SETTING_KEYS.telemetryWorldInstallId);
        if (id) {
            return id;
        }

        if (!this.#worldInstallIdPromise) {
            this.#worldInstallIdPromise = (async () => {
                const id = foundry.utils.randomID();
                await SettingsUtils.setSetting(SETTING_KEYS.telemetryWorldInstallId, id);
                return id;
            })();
        }
        return this.#worldInstallIdPromise;
    }

    static async getWorldInstallId() {
        let id = SettingsUtils.getSetting(SETTING_KEYS.telemetryWorldInstallId);

        if (!id) {
            console.warn("Getting the world install ID before it has been set");
            id = await TelemetryUtils.generateWorldInstallId();
        }

        return id;
    }

    static async sendTelemetry(event, includeUserId, properties = {}) {
        if (SettingsUtils.getSetting(SETTING_KEYS.telemetryOptOut)) return;

        const installId = await TelemetryUtils.getWorldInstallId();
        if (!installId) {
            return;
        }

        const distinctId = includeUserId ? `${installId}:${game.user.id}` : installId;

        const br2Version = game.modules.get(MODULE_NAME).version;

        properties = {
            ...properties,
            module: MODULE_NAME,
            moduleVersion: br2Version,
            foundryVersion: game.version,
            isTest: br2Version === "0.0.0",
        };

        try {
            await fetch("https://us.i.posthog.com/capture/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    api_key: TelemetryUtils.POSTHOG_API_KEY,
                    event,
                    distinct_id: distinctId,
                    properties
                })
            });
        } catch (error) {
            console.warn("BR2 telemetry request failed: ", error);
        }
    }

    static sendModuleReadyEvent() {
        const worldSettings = {};
        const nonDefaultSettings = {};

        Object.entries(WORLD_SETTINGS).forEach(([k, v]) => {
            if (v.value !== undefined && v.value !== v.default) {
                worldSettings[k] = v.value;
                worldSettings[`${k}_is_default`] = false;
                nonDefaultSettings[k] = v.value;
            }
        });

        TelemetryUtils.sendTelemetry("module_ready", false, {
            ...worldSettings,
            has_non_default_settings: nonDefaultSettings.length ? true : undefined,
            non_default_settings: Object.keys(nonDefaultSettings).length ? nonDefaultSettings : undefined,
        });
    }

    static sendUserReadyEvent() {
        const userSettings = {};
        const nonDefaultSettings = {};

        Object.entries(USER_SETTINGS).forEach(([k, v]) => {
            if (v.value !== undefined && v.value !== v.default) {
                userSettings[k] = v.value;
                userSettings[`${k}_is_default`] = false;
                nonDefaultSettings[k] = v.value;
            }
        });

        TelemetryUtils.sendTelemetry("user_ready", true, {
            isGM: game.user.isGM,
            lang: game.i18n.lang,
            ...userSettings,
            has_non_default_settings: nonDefaultSettings.length ? true : undefined,
            non_default_settings: Object.keys(nonDefaultSettings).length ? nonDefaultSettings : undefined,
        });
    }
}