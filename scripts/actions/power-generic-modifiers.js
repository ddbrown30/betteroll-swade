/// generic power modifiers for any power ...

const groupNameGenericPModifiers = "BRSW.PowerModifiers.Generic.GroupName";

export const GENERIC_POWER_MODIFIERS = [
  {
    id: "ARMORPIERCING2",
    name: "BRSW.PowerModifiers.Generic.ArmorPiercing2",
    button_name: "BRSW.PowerModifiers.Generic.ArmorPiercing2",
    overrideAp: "2",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_has_damage", selector_value: "true" },
    ],
    section: "power",
    group: groupNameGenericPModifiers,
    group_single: true,
  },
  {
    id: "ARMORPIERCING4",
    name: "BRSW.PowerModifiers.Generic.ArmorPiercing4",
    button_name: "BRSW.PowerModifiers.Generic.ArmorPiercing4",
    overrideAp: "4",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_has_damage", selector_value: "true" },
    ],
    section: "power",
    group: groupNameGenericPModifiers,
    group_single: true,
  },
  {
    id: "ARMORPIERCING6",
    name: "BRSW.PowerModifiers.Generic.ArmorPiercing6",
    button_name: "BRSW.PowerModifiers.Generic.ArmorPiercing6",
    overrideAp: "6",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_has_damage", selector_value: "true" },
    ],
    section: "power",
    group: groupNameGenericPModifiers,
    group_single: true,
  },
  {
    id: "HEAVYWEAPON",
    name: "BRSW.PowerModifiers.Generic.HeavyWeaponModifier",
    button_name: "BRSW.PowerModifiers.Generic.HeavyWeapon",
    isHeavyWeapon: true,
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_has_damage", selector_value: "true" },
    ],
    section: "power",
    group: groupNameGenericPModifiers,
  },
];
