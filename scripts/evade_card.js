// Functions for cards representing attributes

import { BRSW2_CONST } from "./brsw2-const.js";
import {
    create_common_card,
    traitToDieString,
} from "./cards_common.js";
import { Utils } from "./utils.js";

/**
 * Creates a chat card for rolling evasion
 *
 * @param {Token, SwadeActor} origin  The actor or token owning the attribute
 * @return {Promise} A promise for the BrCommonCard object
 */
async function createEvadeCard(origin, { options = {} } = {},) {
    const actor = Utils.toActor(origin);

    const translatedName = game.i18n.localize(BRSW2_CONST.ATTRIBUTES_TRANSLATION_KEYS.agility);
    const title = game.i18n.format("BRSW.EvadeCardTitle", { agility: traitToDieString(actor.system.attributes.agility) });

    const brCard = create_common_card(
        origin,
        {
            header: { title: title },
            trait: Utils.traitFromString(actor, translatedName),
            isEvade: true,
            evadeTN: options.evadeTN ?? 4,
        },
        "modules/betterrolls-swade2/templates/attribute_card.hbs",
        options,
    );

    brCard.type = BRSW2_CONST.BRSW_CARD_TYPES.TYPE_ATTRIBUTE_CARD;

    await brCard.render();
    return brCard;
}

/**
 * Hooks the public functions to a global object
 */
export function exposeEvadeAPI() {
    Utils.exposeAPI("createEvadeCard", createEvadeCard);
}
