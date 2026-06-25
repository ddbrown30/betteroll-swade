import * as BRSW2_CONFIG from "../scripts/brsw2-config.js";
import { SettingsUtils } from "../scripts/utils.js";

export function get_current_generic_mods() {
    const source = SettingsUtils.getWorldSetting(BRSW2_CONFIG.WORLD_SETTING_KEYS.genericPPModifiersSource);
    if (source === "fc") {
        return FANTASY_COMPANION_GENERIC_POWER_MODIFIERS;
    }
    if (source === "swpf") {
        return PATHFINDER_GENERIC_POWER_MODIFIERS;
    }

    return DEFAULT_SWADE_GENERIC_POWER_MODIFIERS;
}

const DEFAULT_SWADE_GENERIC_POWER_MODIFIERS = [
    {
        name: "BRSW.PowerModifiers.Generic.ArmorPiercing2",
        actionId: "ARMORPIERCING2",
        cost: "+1",
        exclusiveGroup: "AP"
    },
    {
        name: "BRSW.PowerModifiers.Generic.ArmorPiercing4",
        actionId: "ARMORPIERCING4",
        cost: "+2",
        exclusiveGroup: "AP"
    },
    {
        name: "BRSW.PowerModifiers.Generic.ArmorPiercing6",
        actionId: "ARMORPIERCING6",
        cost: "+3",
        exclusiveGroup: "AP"
    },
    {
        name: "BRSW.PowerModifiers.Generic.Fatigue",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiers.Generic.GlowShroud",
        cost: "+1"
    },
    {
        name: "BRSW.PowerModifiers.Generic.HeavyWeapon",
        actionId: "HEAVYWEAPON",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiers.Generic.HinderHurry",
        cost: "+1"
    },
    {
        name: "BRSW.PowerModifiers.Generic.LingeringDamage",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiers.Generic.Range2",
        cost: "+1",
        exclusiveGroup: "Range"
    },
    {
        name: "BRSW.PowerModifiers.Generic.Range3",
        cost: "+2",
        exclusiveGroup: "Range"
    },
    {
        name: "BRSW.PowerModifiers.Generic.Selective",
        cost: "+1"
    },
];

const FANTASY_COMPANION_GENERIC_POWER_MODIFIERS = [
    {
        name: "BRSW.PowerModifiers.Generic.ArmorPiercing2",
        actionId: "ARMORPIERCING2",
        cost: "+1"
    },
    {
        name: "BRSW.PowerModifiers.Generic.ArmorPiercing4",
        actionId: "ARMORPIERCING4",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiers.Generic.ArmorPiercing6",
        actionId: "ARMORPIERCING6",
        cost: "+3"
    },
    {
        name: "BRSW.PowerModifiers.Generic.Fatigue",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiers.Generic.GlowShroud",
        cost: "+1"
    },
    {
        name: "BRSW.PowerModifiers.Generic.Hasty",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiers.Generic.HeavyWeapon",
        actionId: "HEAVYWEAPON",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiers.Generic.HinderHurry",
        cost: "+1"
    },
    {
        name: "BRSW.PowerModifiers.Generic.LingeringDamage",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiers.Generic.Range2",
        cost: "+1"
    },
    {
        name: "BRSW.PowerModifiers.Generic.Range3",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiers.Generic.Selective",
        cost: "+1"
    },
];

const PATHFINDER_GENERIC_POWER_MODIFIERS = [
    {
        name: "BRSW.PowerModifiers.Generic.AdaptableCaster",
        cost: "+1"
    },
    {
        name: "BRSW.PowerModifiers.Generic.ArmorPiercing2",
        actionId: "ARMORPIERCING2",
        cost: "+1"
    },
    {
        name: "BRSW.PowerModifiers.Generic.ArmorPiercing4",
        actionId: "ARMORPIERCING4",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiers.Generic.ArmorPiercing6",
        actionId: "ARMORPIERCING6",
        cost: "+3"
    },
    {
        name: "BRSW.PowerModifiers.Generic.Fatigue",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiers.Generic.GlowShroud",
        cost: "+1"
    },
    {
        name: "BRSW.PowerModifiers.Generic.HeavyWeapon",
        actionId: "HEAVYWEAPON",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiers.Generic.HinderHurry",
        cost: "+1"
    },
    {
        name: "BRSW.PowerModifiers.Generic.LingeringDamage",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiers.Generic.Range2",
        cost: "+1"
    },
    {
        name: "BRSW.PowerModifiers.Generic.Range3",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiers.Generic.Selective",
        cost: "+1"
    },
];