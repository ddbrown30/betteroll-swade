// Functions to control combat flow
/* globals canvas, game */

import {create_unshaken_card, create_unstun_card} from "./remove_status_cards.js";

export async function create_unstun_wrapper(effect) {
    await create_unstun_card(undefined, effect.parent)
}

export async function create_unshaken_wrapper(effect) {
    await create_unshaken_card(undefined, effect.parent)
}