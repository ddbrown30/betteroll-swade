// Functions for the damage card
/* global game, canvas, CONST, Token, CONFIG, Hooks, succ, console */
import { BrCommonCard } from "./BrCommonCard.js";
import { WORLD_SETTING_KEYS } from "./brsw2-config.js";
import { BRSW2_CONST } from "./brsw2-const.js";
import {
    are_bennies_available,
    create_common_card,
    roll_trait,
    spend_bennie,
} from "./cards_common.js";
import {
    create_incapacitation_card,
    create_injury_card,
} from "./incapacitation_card.js";
import { SettingsUtils, Utils, addEventListenerAll } from "./utils.js";

/**
 * Shows a damage card and applies damage to the token/actor
 * @param {string} token_id
 * @param {int} damage
 * @param {string} damage_text
 * @param {string} heavyDamage
 */
export async function create_damage_card(
    token_id,
    damage,
    damage_text,
    heavyDamage,
) {
    const token = canvas.tokens.get(token_id);
    const { actor } = token;
    const user = get_owner(actor);

    const undo_values = {
        wounds: actor.system.wounds.value,
        shaken: actor.system.status.isShaken,
    };

    let wounds = Math.floor(damage / 4);
    if (game.settings.get('swade', 'woundCap')) {
        wounds = Math.min(wounds, 4);
    }

    heavyDamage = heavyDamage === "true";
    const can_soak = wounds || actor.system.status.isShaken;
    const damageResult = await apply_damage(token, wounds, 0);
    let showInjury = Utils.shouldShowInjury(heavyDamage);
    showInjury = showInjury && can_soak && actor.system.wounds.max > 1;
    const brCard = create_common_card(
        token,
        {
            header: {
                type: game.i18n.localize("SWADE.Dmg"),
                title: game.i18n.localize("SWADE.Dmg"),
                notes: damage_text,
            },
            text: damageResult.text,
            undo_values: undo_values,
            wounds: wounds,
            soaked: 0,
            soak_possible: are_bennies_available(actor) && can_soak,
            show_incapacitation: damageResult.incapacitated && actor.isWildcard,
            showInjury: showInjury,
            heavyDamage: heavyDamage,
            trait: Utils.traitFromString(actor, "vigor"),
        },
        "modules/betterrolls-swade2/templates/damage_card.hbs",
    );
    if (wounds === 0) {
        //If we're not dealing any wounds, don't bother popping out the card since there's no action required
        brCard.popoutShown = true;
    }
    brCard.update_list = { ...brCard.update_list, ...{ user: user.id } };
    brCard.type = BRSW2_CONST.BRSW_CARD_TYPES.TYPE_DMG_CARD;
    await brCard.render();
    await brCard.save();
    Hooks.call("BRSW-AfterShowDamageCard", actor, wounds, brCard);
    return brCard.message;
}

/**
 * Gets the owner of an actor
 * @param {SwadeActor} actor
 */
export function get_owner(actor) {
    let owner;
    let player;
    let gm;
    game.users.forEach((user) => {
        if (user.isGM) {
            gm = user;
        } else if (user.character?.id === actor.id) {
            owner = user;
        } else if (actor.getUserLevel(user) > 2) {
            player = user;
        }
    });
    return owner || player || gm;
}

/**
 * Applies damage to a token
 * @param token_or_token_id
 * @param {int} wounds
 * @param {int} soaked
 */
async function apply_damage(token_or_token_id, wounds, soaked = 0) {
    if (wounds < 0) {
        return ("", false);
    }
    const token =
        token_or_token_id instanceof foundry.canvas.placeables.Token
            ? token_or_token_id
            : canvas.tokens.get(token_or_token_id);
    // We take the starting situation
    const initial_wounds = token.actor.system.wounds.value;
    // noinspection JSUnresolvedVariable
    const initial_shaken = token.actor.system.status.isShaken;
    // We test for double shaken
    let damage_wounds = wounds;
    let final_shaken = true; // Any damage also shakes the token
    let text = "";
    if (wounds < 1 && initial_shaken) {
        // Shaken twice
        const has_hardy = token.actor.items.find((item) => {
            return (
                item.name
                    .toLowerCase()
                    .includes(game.i18n.localize("BRSW.HardyIdentifier")) &&
                (item.type === "edge" || item.type === "ability")
            );
        });
        if (has_hardy || token.actor.getFlag("swade", "hardy")) {
            text += game.i18n.localize("BRSW.HardyActivated");
            damage_wounds = 0;
        } else {
            damage_wounds = 1;
        }
    }
    text += wounds
        ? game.i18n.format("BRSW.TokenWounded", {
            token_name: token.name,
            wounds: wounds,
        })
        : damage_wounds
            ? game.i18n.format("BRSW.DoubleShaken", { token_name: token.name })
            : game.i18n.format("BRSW.TokenShaken", { token_name: token.name });
    // Now we look for soaking
    if (soaked) {
        damage_wounds -= soaked;
        if (damage_wounds <= 0) {
            // All damage soaked, remove shaken
            damage_wounds = 0;
            final_shaken = false;
            text += game.i18n.localize("BRSW.AllSoaked");
        } else {
            text += game.i18n.format("BRSW.SomeSoaked", { soaked: soaked });
        }
    }
    // Final damage
    let final_wounds = initial_wounds + damage_wounds;
    const incapacitated = final_wounds > token.actor.system.wounds.max;
    const downed_condition = token.actor.isWildcard ? "incapacitated" : "dead";
    if (incapacitated) {
        await token.actor.toggleStatusEffect(downed_condition, { active: true, overlay: true });
    } else {
        await token.actor.toggleStatusEffect(downed_condition, { active: false });
    }
    if (incapacitated) {
        final_shaken = false;
    }
    // We cap damage on actor number of wounds
    final_wounds = Math.min(final_wounds, token.actor.system.wounds.max);
    // Finally, we update actor and mark defeated
    await token.actor.update({ "system.wounds.value": final_wounds });
    if (final_shaken) {
        await token.actor.toggleStatusEffect("shaken", { active: true });
    } else {
        await token.actor.toggleStatusEffect("shaken", { active: false });
    }
    Hooks.call(
        "BRSW-AfterApplyDamage",
        token,
        final_wounds,
        final_shaken,
        incapacitated,
        initial_wounds,
        initial_shaken,
        soaked,
    );
    return { text: text, incapacitated: incapacitated };
}

/**
 * Undo the damage in one card
 * @param {ChatMessage} message
 */
async function undo_damage(message) {
    const brCard = new BrCommonCard(message);
    const { actor, render_data } = brCard;
    await actor.update({ "system.wounds.value": render_data.undo_values.wounds });
    if (brCard.token) {
        // Remove incapacitation and shaken
        await actor.toggleStatusEffect("shaken", {
            active: render_data.undo_values.shaken,
        });
        await actor.toggleStatusEffect("incapacitated", { active: false });
        await actor.toggleStatusEffect("dead", { active: false });
    }
    await message.delete();
}

/**
 * Activate the listeners of the damage card
 * @param message Message date
 * @param html Html produced
 */
export function activate_damage_card_listeners(message, html) {
    const brCard = new BrCommonCard(message);
    html.querySelector(".brsw-undo-damage")?.addEventListener("click", async () => {
        await undo_damage(message);
    });
    addEventListenerAll(html, ".brsw-soak-button, .brsw-roll-button", "click", (ev) => {
        ev.stopPropagation();
        let spend_bennie = false;
        if (
            ev.currentTarget.classList.contains("roll-bennie-button") ||
            ev.currentTarget.classList.contains("brsw-soak-button")
        ) {
            spend_bennie = true;
        }
        // noinspection JSIgnoredPromiseFromCall
        roll_soak(brCard, spend_bennie);
    });
    html.querySelector(".brsw-show-incapacitation")?.addEventListener("click", () => {
        // noinspection JSIgnoredPromiseFromCall
        brCard.closePopout(); //We assume we're done with the card at this point so close any popouts
        create_incapacitation_card(brCard.token_id);
    });
    html.querySelector(".brsw-mark-defeated")?.addEventListener("click", async () => {
        await brCard.actor.toggleStatusEffect("incapacitated", { active: false });
        await brCard.actor.toggleStatusEffect("bleeding-out", { active: false });
        await brCard.actor.toggleStatusEffect("dead", { active: true });
    });
    html.querySelector(".brsw-injury-button")?.addEventListener("click", () => {
        // noinspection JSIgnoredPromiseFromCall
        create_injury_card(brCard.token_id, "gritty");
    });
}

/**
 * Males a soak roll
 * @param {BrCommonCard} brCard
 * @param {Boolean} use_bennie
 */
async function roll_soak(brCard, use_bennie) {
    if (use_bennie) {
        await spend_bennie(brCard.actor);
    }

    let undo_wound_modifier = Math.min(brCard.actor.system.wounds.value, 3) - brCard.render_data.undo_values.wounds;

    const ignored_wounds = parseInt(brCard.actor.system.wounds.ignored) + (parseInt(brCard.actor.system.woundsOrFatigue.ignored) || 0);

    if (ignored_wounds) {
        undo_wound_modifier = Math.max(
            0,
            Math.min(brCard.actor.system.wounds.value, 3) - ignored_wounds - Math.max(0, brCard.render_data.undo_values.wounds - ignored_wounds),
        );
    }

    const soak_modifiers = [
        {
            name: game.i18n.localize("BRSW.RemoveWounds"),
            value: undo_wound_modifier,
        },
    ];

    if (
        brCard.actor.items.find((item) => {
            return (
                item.type === "edge" &&
                item.name.toLowerCase().includes(game.i18n.localize("BRSW.EdgeName.IronJaw").toLowerCase())
            );
        })
    ) {
        soak_modifiers.push({ name: game.i18n.localize("BRSW.EdgeName.IronJaw"), value: 2 });
    }

    // Active effects
    const soak_active_effects = brCard.actor.appliedEffects.filter((e) =>
        e.changes.find((ch) => ch.key === "brsw.soak-modifier" || ch.key === "system.attributes.vigor.soakBonus")
    );

    for (const effect of soak_active_effects) {
        const change =
            effect.changes.find((ch) => ch.key === "brsw.soak-modifier") ||
            effect.changes.find((ch) => ch.key === "system.attributes.vigor.soakBonus");

        soak_modifiers.push({ name: effect.label, value: parseInt(change.value) });
    }

    // Unarmored hero
    if (game.settings.get("swade", "unarmoredHero") && brCard.actor.isUnarmored) {
        soak_modifiers.push({ name: game.i18n.localize("BRSW.UnarmoredHero"), value: 2 });
    }

    await roll_trait(
        brCard,
        brCard.actor.system.attributes.vigor,
        game.i18n.localize("BRSW.SoakRoll"),
        { modifiers: soak_modifiers },
    );

    let result = 0;
    for (const roll of brCard.trait_roll.rolls) {
        for (const die of roll.dice) {
            if (die.result !== null) {
                result = Math.max(die.final_total, result);
            }
        }
    }

    if (result >= 4) {
        brCard.render_data.soaked = Math.floor(result / 4);

        await brCard.actor.update({ "system.wounds.value": brCard.render_data.undo_values.wounds });

        const damageResult = await apply_damage(
            brCard.token,
            brCard.render_data.wounds,
            brCard.render_data.soaked,
        );

        brCard.render_data.text = damageResult.text;
        brCard.render_data.show_incapacitation = damageResult.incapacitated && brCard.actor.isWildcard;
        brCard.render_data.showInjury = Utils.shouldShowInjury(brCard.render_data.heavyDamage) && brCard.render_data.wounds > brCard.render_data.soaked;

        await brCard.render();
        await brCard.save();
    }
}
