// ============================================
// power modifiers for powers ...
// ============================================

/* NOTE:
    The various "epic" power modifiers require the edge "Epic Mastery",
      found in the SWADE Fantasy Companion, p.36 or "Arcane Mastery" or
      "Divine Mastery" if using SWPF
    They are restricted by the following selector_type ...
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
*/

// TODO ... some way to handle different Areas of Effect using the single button selector ???

/*
  format of power modifier elements ...
    name: "xxxxx", // text for line in damage roll details, currently NOT translated
    button_name: "BRSW.xxxxx", // button text in modal dialog, is translated
    { selector_type: "item_name", selector_value: "xxxxx" }           // "item_name"      is currently NOT translated
    { selector_type: "actor_has_edge", selector_value: "BRSW.xxxxx" } // "actor_has_edge" is translated
    group: "BRSW.xxxxx"

*/

export const POWER_MODIFIERS = [
  /*// BARRIER (S)
  {
    id: "POWERBARRIERDAMAGE",
    name: "Damage (2d4)",
    button_name: "BRSW.PowerModifiersBarrierDamage",
    dmgOverride: "2d4x",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Barrier" },
    ],
    group: "BRSW.PowerModifiersBarrier"
  },
  {
    id: "POWERBARRIERDEADLY",
    name: "☆ Deadly (2d6)",
    button_name: "BRSW.PowerModifiersBarrierDeadly",
    dmgOverride: "2d6x",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Barrier" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    group: "BRSW.PowerModifiersBarrier"
  },

  // BLAST (S)
  {
    id: "POWERBLASTMOD1DAMAGE",
    name: "Damage",
    button_name: "BRSW.PowerModifiersBlastDamage",
    dmgOverride: "3d6x",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Blast" }
    ],
    group: "BRSW.PowerModifiersBlast"
  },
  {
    id: "POWERBLASTMOD3GREATERBLAST",
    name: "Greater Blast",
    button_name: "BRSW.PowerModifiersBlastGreaterBlast",
    dmgOverride: "4d6x",
    isHeavyWeapon: true,
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Blast" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    group: "BRSW.PowerModifiersBlast"
  },

  // BOLT
  {
    id: "POWERBOLTMOD1DAMAGE",
    name: "Damage",
    button_name: "BRSW.PowerModifiersBoltDamage",
    dmgOverride: "3d6x",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Bolt" }
    ],
    group: "BRSW.PowerModifiersBolt"
  },
  {
    id: "POWERBOLTMOD2GREATERBOLT",
    name: "Greater Bolt",
    button_name: "BRSW.PowerModifiersBoltGreaterBolt",
    dmgOverride: "4d6x",
    isHeavyWeapon: true,
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Bolt" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    group: "BRSW.PowerModifiersBolt"
  },
  {
    id: "POWERBOLTMOD4RATEOFFIRE",
    name: "Rate of Fire",
    button_name: "BRSW.PowerModifiersBoltRateOfFire",
    rof: "2",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Bolt" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    group: "BRSW.PowerModifiersBolt"
  },

  // DAMAGE FIELD (S)
  {
    id: "POWERDAMAGEFIELD1DAMAGE",
    name: "Damage",
    button_name: "BRSW.PowerModifiersDamageFieldDamage",
    dmgOverride: "2d6x",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Damage Field" }
    ],
    group: "BRSW.PowerModifiersDamageField"
  },
  {
    id: "POWERDAMAGEFIELD3GREATERDAMAGEFIELD",
    name: "Greater Damage Field",
    button_name: "BRSW.PowerModifiersDamageFieldGreaterDamageField",
    dmgOverride: "3d6x",
    isHeavyWeapon: true,
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Damage Field" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    group: "BRSW.PowerModifiersDamageField"
  },

  // ENTANGLE
  {
    id: "POWERENTANGLEMOD4DAMAGE",
    name: "Damage",
    button_name: "BRSW.PowerModifiersEntangleDamage",
    dmgOverride: "2d4x",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Entangle" }
    ],
    group: "BRSW.PowerModifiersEntangle"
  },
  {
    id: "POWERENTANGLEMOD5DEADLY",
    name: "☆ Deadly",
    button_name: "BRSW.PowerModifiersEntangleDeadly",
    dmgOverride: "2d6x",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Entangle" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    group: "BRSW.PowerModifiersEntangle"
  },

  // HAVOC
  {
    id: "POWERHAVOCMODGREATER",
    name: "Greater Havoc",
    button_name: "BRSW.PowerModifiersHavocGreaterHavoc",
    dmgOverride: "2d6x",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Havoc" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    group: "BRSW.PowerModifiersHavoc"
  },*/
];
