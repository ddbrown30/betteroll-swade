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

/*
  format of power modifier elements ...
    name: "xxxxx", // text for line in damage roll details, currently NOT translated
    button_name: "BRSW.xxxxx", // button text in modal dialog, is translated
    { selector_type: "item_name", selector_value: "xxxxx" }           // "item_name"      is currently NOT translated
    { selector_type: "actor_has_edge", selector_value: "BRSW.xxxxx" } // "actor_has_edge" is translated
    group: "BRSW.xxxxx"

*/

export const POWER_MODIFIERS = [
  // BARRIER (S)
  {
    id: "POWERBARRIERDAMAGE",
    name: "Damage (2d4)",
    button_name: "BRSW.PowerModifiers.BarrierDamage",
    dmgOverride: "2d4x",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Barrier" },
    ],
    section: "power",
    group: "BRSW.PowerModifiers.PowerModifiers"
  },
  {
    id: "POWERBARRIERDEADLY",
    name: "Deadly (2d6)",
    button_name: "BRSW.PowerModifiers.BarrierDeadly",
    dmgOverride: "2d6x",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Barrier" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.PowerModifiers"
  },

  // BLAST (S)
  {
    id: "POWERBLASTMOD1DAMAGE",
    name: "Damage",
    button_name: "BRSW.PowerModifiers.BlastDamage",
    dmgOverride: "3d6x",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Blast" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.PowerModifiers"
  },
  {
    id: "POWERBLASTMOD3GREATERBLAST",
    name: "Greater Blast",
    button_name: "BRSW.PowerModifiers.BlastGreaterBlast",
    dmgOverride: "4d6x",
    isHeavyWeapon: true,
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Blast" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.PowerModifiers"
  },

  // BOLT
  {
    id: "POWERBOLTMOD1DAMAGE",
    name: "Damage",
    button_name: "BRSW.PowerModifiers.BoltDamage",
    dmgOverride: "3d6x",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Bolt" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.PowerModifiers"
  },
  {
    id: "POWERBOLTMOD2GREATERBOLT",
    name: "Greater Bolt",
    button_name: "BRSW.PowerModifiers.BoltGreaterBolt",
    dmgOverride: "4d6x",
    isHeavyWeapon: true,
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Bolt" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.PowerModifiers"
  },
  {
    id: "POWERBOLTMOD4RATEOFFIRE",
    name: "Rate of Fire",
    button_name: "BRSW.PowerModifiers.BoltRateOfFire",
    rof: "2",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Bolt" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.PowerModifiers"
  },

  // BURST
  {
    id: "POWERBURSTMOD1DAMAGE",
    name: "Damage (3d6)",
    button_name: "BRSW.PowerModifiers.BurstDamage",
    dmgMod: "3d6x",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Burst" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.PowerModifiers"
  },
  {
    id: "POWERBURSTMOD3GREATERBURST",
    name: "Greater Burst (4d6)",
    button_name: "BRSW.PowerModifiers.BurstGreaterBurst",
    dmgMod: "4d6x",
    isHeavyWeapon: true,
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Burst" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.PowerModifiers"
  },

  // DAMAGE FIELD (S)
  {
    id: "POWERDAMAGEFIELD1DAMAGE",
    name: "Damage",
    button_name: "BRSW.PowerModifiers.DamageFieldDamage",
    dmgOverride: "2d6x",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Damage Field" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.PowerModifiers"
  },
  {
    id: "POWERDAMAGEFIELD3GREATERDAMAGEFIELD",
    name: "Greater Damage Field",
    button_name: "BRSW.PowerModifiers.DamageFieldGreaterDamageField",
    dmgOverride: "3d6x",
    isHeavyWeapon: true,
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Damage Field" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.PowerModifiers"
  },

  // ENTANGLE
  {
    id: "POWERENTANGLEMOD4DAMAGE",
    name: "Damage",
    button_name: "BRSW.PowerModifiers.EntangleDamage",
    dmgOverride: "2d4x",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Entangle" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.PowerModifiers"
  },
  {
    id: "POWERENTANGLEMOD5DEADLY",
    name: "Deadly",
    button_name: "BRSW.PowerModifiers.EntangleDeadly",
    dmgOverride: "2d6x",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Entangle" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.PowerModifiers"
  },

  // HAVOC
  {
    id: "POWERHAVOCMODGREATER",
    name: "Greater Havoc",
    button_name: "BRSW.PowerModifiers.HavocGreaterHavoc",
    dmgOverride: "2d6x",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Havoc" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.PowerModifiers"
  },

];
