import { SettingsUtils } from "../scripts/utils.js";

export function get_current_generic_mods() {
    const source = SettingsUtils.getWorldSetting("generic-pp-modifiers-source");
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
        name: "BRSW.PowerModifiersGenericArmorPiercing2",
        actionId: "ARMORPIERCING2",
        cost: "+1"
    },
    {
        name: "BRSW.PowerModifiersGenericArmorPiercing4",
        actionId: "ARMORPIERCING4",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiersGenericArmorPiercing6",
        actionId: "ARMORPIERCING6",
        cost: "+3"
    },
    {
        name: "BRSW.PowerModifiersGenericFatigue",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiersGenericGlowShroud",
        cost: "+1"
    },
    {
        name: "BRSW.PowerModifiersGenericHeavyWeapon",
        actionId: "HEAVYWEAPON",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiersGenericHinderHurry",
        cost: "+1"
    },
    {
        name: "BRSW.PowerModifiersGenericLingeringDamage",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiersGenericRange2",
        cost: "+1"
    },
    {
        name: "BRSW.PowerModifiersGenericRange3",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiersGenericSelective",
        cost: "+1"
    },
];

const FANTASY_COMPANION_GENERIC_POWER_MODIFIERS = [
    {
        name: "BRSW.PowerModifiersGenericArmorPiercing2",
        actionId: "ARMORPIERCING2",
        cost: "+1"
    },
    {
        name: "BRSW.PowerModifiersGenericArmorPiercing4",
        actionId: "ARMORPIERCING4",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiersGenericArmorPiercing6",
        actionId: "ARMORPIERCING6",
        cost: "+3"
    },
    {
        name: "BRSW.PowerModifiersGenericFatigue",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiersGenericGlowShroud",
        cost: "+1"
    },
    {
        name: "BRSW.PowerModifiersGenericHasty",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiersGenericHeavyWeapon",
        actionId: "HEAVYWEAPON",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiersGenericHinderHurry",
        cost: "+1"
    },
    {
        name: "BRSW.PowerModifiersGenericLingeringDamage",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiersGenericRange2",
        cost: "+1"
    },
    {
        name: "BRSW.PowerModifiersGenericRange3",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiersGenericSelective",
        cost: "+1"
    },
];

const PATHFINDER_GENERIC_POWER_MODIFIERS = [
    {
        name: "BRSW.PowerModifiersGenericAdaptableCaster",
        cost: "+1"
    },
    {
        name: "BRSW.PowerModifiersGenericArmorPiercing2",
        actionId: "ARMORPIERCING2",
        cost: "+1"
    },
    {
        name: "BRSW.PowerModifiersGenericArmorPiercing4",
        actionId: "ARMORPIERCING4",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiersGenericArmorPiercing6",
        actionId: "ARMORPIERCING6",
        cost: "+3"
    },
    {
        name: "BRSW.PowerModifiersGenericFatigue",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiersGenericGlowShroud",
        cost: "+1"
    },
    {
        name: "BRSW.PowerModifiersGenericHeavyWeapon",
        actionId: "HEAVYWEAPON",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiersGenericHinderHurry",
        cost: "+1"
    },
    {
        name: "BRSW.PowerModifiersGenericLingeringDamage",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiersGenericRange2",
        cost: "+1"
    },
    {
        name: "BRSW.PowerModifiersGenericRange3",
        cost: "+2"
    },
    {
        name: "BRSW.PowerModifiersGenericSelective",
        cost: "+1"
    },
];