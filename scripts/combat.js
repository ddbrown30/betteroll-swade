// Functions to control combat flow
/* globals canvas, game */

import {createUnshakeCard, createUnstunCard} from "./remove_status_cards.js";

export async function createUnstunWrapper(effect) {
    await createUnstunCard(undefined, effect.parent)
}

export async function createUnshakeWrapper(effect) {
    await createUnshakeCard(undefined, effect.parent)
}