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
  // ARCANE PROTECTION
  // plus Additional Recipients, which is handled by the generic clause above
  {
    id: "POWERARCANEPROTECTIONGREATER",
    name: "Greater Arcane Protection",
    button_name: "BRSW.PowerModifiers.ArcaneProtectionGreater",
    shotsUsed: "+2",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Arcane Protection" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.ArcaneProtection"
  },

  // BANISH (V)

  // BARRIER (S)
  {
    id: "POWERBARRIERDAMAGEIMMATERIAL",
    name: "Damage (2d4) (Immaterial)",
    button_name: "BRSW.PowerModifiers.BarrierDamageImmaterial",
    shotsUsed: "0",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Barrier" },
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Barrier"
  },
  {
    id: "POWERBARRIERDAMAGE",
    name: "Damage (2d4)",
    button_name: "BRSW.PowerModifiers.BarrierDamage",
    shotsUsed: "+1",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Barrier" },
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Barrier"
  },
  {
    id: "POWERBARRIERDEADLYIMMATERIAL",
    name: "☆ Deadly (2d6) (Immaterial)",
    button_name: "BRSW.PowerModifiers.BarrierDeadlyImmaterial",
    shotsUsed: "+1",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Barrier" },
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Barrier"
  },
  {
    id: "POWERBARRIERDEADLY",
    name: "☆ Deadly (2d6)",
    button_name: "BRSW.PowerModifiers.BarrierDeadly",
    dmgOverride: "2d6x",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Barrier" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Barrier"
  },
  {
    id: "POWERBARRIERHARDENED",
    name: "Hardened",
    button_name: "BRSW.PowerModifiers.BarrierHardened",
    shotsUsed: "+1",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Barrier" },
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Barrier"
  },
  {
    id: "POWERBARRIERIMMATERIAL",
    name: "Immaterial",
    button_name: "BRSW.PowerModifiers.BarrierImmaterial",
    shotsUsed: "0",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Barrier" },
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Barrier"
  },
  {
    id: "POWERBARRIERSHAPED",
    name: "Shaped",
    button_name: "BRSW.PowerModifiers.BarrierShaped",
    shotsUsed: "+1",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Barrier" },
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Barrier"
  },
  {
    id: "POWERBARRIERSIZE",
    name: "Size",
    button_name: "BRSW.PowerModifiers.BarrierSize",
    shotsUsed: "+1",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Barrier" },
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Barrier"
  },

  // BEAST FRIEND
  {
    id: "POWERBEASTFRIENDMODBESTIARIUM",
    name: "☆ Beastarium",
    button_name: "BRSW.PowerModifiers.BeastFriendBeastarium",
    shotsUsed: "+2",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Beast Friend" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.BeastFriend"
  },
  {
    id: "POWERBEASTFRIENDMODDURATION",
    name: "Duration (+1)",
    button_name: "Duration (+1)",
    shotsUsed: "+1",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Beast Friend" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.BeastFriend"
  },
  {
    id: "POWERBEASTFRIENDMODMINDRIDER",
    name: "Mind Rider (+1)",
    button_name: "Mind Rider (+1)",
    shotsUsed: "+1",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Beast Friend" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.BeastFriend"
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
    group: "BRSW.PowerModifiers.Blast"
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
    group: "BRSW.PowerModifiers.Blast"
  },
  {
    id: "POWERBLASTAREAEFFECTS1SMALL",
    name: "Small (SBT)",
    button_name: "BRSW.PowerModifiers.BlastAreaEffectSBT",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Blast" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Blast"
  },
  {
    id: "POWERBLASTAREAEFFECTS2MEDIUM",
    name: "Medium (MBT)",
    button_name: "BRSW.PowerModifiers.BlastAreaEffectMBT",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Blast" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Blast"
  },
  {
    id: "POWERBLASTAREAEFFECTS3LARGE",
    name: "Large (LBT)",
    button_name: "BRSW.PowerModifiers.BlastAreaEffectLBT",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Blast" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Blast"
  },

  // BLESSING (S)
  // no power specific modifiers

  // BLIND
  {
    id: "POWERBLINDMOD3STRONG",
    name: "Strong",
    button_name: "BRSW.PowerModifiers.BlindStrong",
    shotsUsed: "+1",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Blind" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Blind"
  },
  {
    id: "POWERBLINDMOD1MEDIUM",
    name: "Medium (LBT)",
    button_name: "BRSW.PowerModifiers.BlindAreaEffect2MBT",
    shotsUsed: "+2",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Blind" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Blind"
  },
  {
    id: "POWERBLINDMOD2LARGE",
    name: "Large (+3)",
    button_name: "BRSW.PowerModifiers.BlindAreaEffect3LBTStream",
    shotsUsed: "+3",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Blind" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Blind"
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
    group: "BRSW.PowerModifiers.Bolt"
  },
  {
    id: "POWERBOLTMOD3DISINTEGRATE",
    name: "Disintegrate",
    button_name: "BRSW.PowerModifiers.BoltDisintegrate",
    shotsUsed: "+2",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Bolt" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Bolt"
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
    group: "BRSW.PowerModifiers.Bolt"
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
    group: "BRSW.PowerModifiers.Bolt"
  },

  // BOOST/LOWER TRAIT
  // plus Additional Recipients, which is handled by the generic clause above
  {
    id: "POWERBOOSTLOWERTRAITMOGREATER",
    name: "Greater Boost/Lower Trait",
    button_name: "BRSW.PowerModifiers.BoostLowerGreater",
    shotsUsed: "+2",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Boost/Lower Trait" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.BoostLower"
  },
  {
    id: "POWERBOOSTLOWERTRAITMODSTRONG",
    name: "Strong (+1)",
    button_name: "BRSW.PowerModifiers.BoostLowerStrong",
    shotsUsed: "+1",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Boost/Lower Trait" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.BoostLower"
  },

  // BURROW
  // plus Additional Recipients, which is handled by the generic clause above
  {
    id: "POWERBURROWMODPOWER",
    name: "Power",
    button_name: "BRSW.PowerModifiers.BurrowPower",
    shotsUsed: "+1",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Burrow" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Burrow"
  },

  // BURST
  {
    id: "POWERBURSTMOD1DAMAGE",
    name: "Damage (+2d6)",
    button_name: "BRSW.PowerModifiers.BurstDamage",
    shotsUsed: "+2",
    dmgMod: "+d6x",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Burst" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Burst"
  },
  {
    id: "POWERBURSTMOD3GREATERBURST",
    name: "Greater Burst (+2d6)",
    button_name: "BRSW.PowerModifiers.BurstGreaterBurst",
    shotsUsed: "+4",
    dmgMod: "+2d6x",
    isHeavyWeapon: true,
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Burst" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Burst"
  },
  {
    id: "POWERBURSTMOD2PUSH",
    name: "Push (2d6 feet)",
    button_name: "BRSW.PowerModifiers.BurstPush",
    shotsUsed: "+1",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Burst" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Burst"
  },

  // CONFUSION
  {
    id: "POWERCONFUSIONGREATERCONFUSION",
    name: "Greater Confusion",
    button_name: "BRSW.PowerModifiers.ConfusionGreaterConfusion",
    shotsUsed: "+2",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Confusion" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Confusion"
  },
  {
    id: "POWERCONFUSIONAREAEFFECT1SMALL",
    name: "Small (SBT)",
    button_name: "BRSW.PowerModifiers.ConfusionAreaEffect1SBT",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Confusion" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Confusion"
  },
  {
    id: "POWERCONFUSIONAREAEFFECT2MEDIUM",
    name: "Medium (MBT)",
    button_name: "BRSW.PowerModifiers.ConfusionAreaEffect2MBT",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Confusion" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Confusion"
  },
  {
    id: "POWERCONFUSIONAREAEFFECT3LARGE",
    name: "Large (LBT)",
    button_name: "BRSW.PowerModifiers.ConfusionAreaEffect3LBT",
    shotsUsed: "+1",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Confusion" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Confusion"
  },
  /*
*/

  // CONJURE ITEM

  // CURSE (S)

  // DAMAGE FIELD (S)
  {
    id: "POWERDAMAGEFIELDAREAEFFECTS2MEDIUM",
    name: "Medium (MBT)",
    button_name: "BRSW.PowerModifiers.DamageFieldAreaEffectMBT",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Damage Field" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.DamageField"
  },
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
    group: "BRSW.PowerModifiers.DamageField"
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
    group: "BRSW.PowerModifiers.DamageField"
  },
  {
    id: "POWERDAMAGEFIELDMOBILE",
    name: "Mobile",
    button_name: "BRSW.PowerModifiers.DamageFieldMobile",
    shotsUsed: "+2",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Damage Field" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.DamageField"
  },

  // DARKSIGHT

  // DEFLECTION
  // just Additional Recipients, which is handled by the generic clause above

  // DETECT/CONCEAL ARCANA

  // DISGUISE (S)

  // DISPEL

  // DIVINATION (S)

  // DRAIN POWER POINTS (V)

  // ELEMENTAL MANIPULATION

  // EMPATHY

  // ENTANGLE
  {
    id: "POWERENTANGLEMOD1MEDIUM",
    name: "Medium (LBT)",
    button_name: "BRSW.PowerModifiers.EntangleAreaEffectMBT",
    shotsUsed: "+2",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Entangle" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Entangle"
  },
  {
    id: "POWERENTANGLEMOD2LARGE",
    name: "Large or Stream (+3)",
    button_name: "BRSW.PowerModifiers.EntangleAreaEffectLBTStream",
    shotsUsed: "+3",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Entangle" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Entangle"
  },
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
    group: "BRSW.PowerModifiers.Entangle"
  },
  {
    id: "POWERENTANGLEMOD5DEADLY",
    name: "☆ Deadly",
    button_name: "BRSW.PowerModifiers.EntangleDeadly",
    dmgOverride: "2d6x",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Entangle" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Entangle"
  },
  {
    id: "POWERENTANGLEMOD3TOUGH",
    name: "Tough (+1)",
    button_name: "BRSW.PowerModifiers.EntangleTough",
    shotsUsed: "+1",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Entangle" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Entangle"
  },

  // ENVIRONMENTAL PROTECTION
  {
    id: "POWERENVPROTECTIONMODRESISTANCE",
    name: "Environmental Resistance",
    button_name: "BRSW.PowerModifiers.EnvironmentalProtectionEnvironmentalResistance",
    shotsUsed: "+1",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Environmental Protection" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.EnvironmentalProtection"
  },

  // FARSIGHT (S)

  // FEAR

  // FLY (V)

  // GROWTH/SHRINK (S)

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
    group: "BRSW.PowerModifiers.Havoc"
  },
  {
    id: "POWERHAVOCMODAREA",
    name: "Area Effect (LBT)",
    button_name: "BRSW.PowerModifiers.HavocAreaEffect",
    shotsUsed: "+1",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Havoc" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Havoc"
  },

  // HEALING
  {
    id: "POWERHEALINGMOD4GREATERHEALING",
    name: "Greater Healing",
    button_name: "BRSW.PowerModifiers.HealingGreaterHealing",
    shotsUsed: "+10",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Healing" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Healing"
  },
  {
    id: "POWERHEALINGMOD5CRIPPLINGINJURIES",
    name: "Crippling Injuries",
    button_name: "BRSW.PowerModifiers.HealingCripplingInjuries",
    shotsUsed: "+20",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Healing" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Healing"
  },
  {
    id: "POWERHEALINGMOD2MASSHEALINGMEDIUMBLAST",
    name: "Mass Healing - MBT",
    button_name: "BRSW.PowerModifiers.HealingMassHealingMBT",
    shotsUsed: "+2",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Healing" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Healing"
  },
  {
    id: "POWERHEALINGMOD3MASSHEALINGLARGEBLAST",
    name: "Mass Healing - LBT",
    button_name: "BRSW.PowerModifiers.HealingMassHealingLBT",
    shotsUsed: "+3",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Healing" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Healing"
  },
  {
    id: "POWERHEALINGMOD1NEUTRALIZEPOISON",
    name: "Neutralize Poison or Disease",
    button_name: "BRSW.PowerModifiers.HealingNeutralisePoisonOrDisease",
    shotsUsed: "+1",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Healing" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Healing"
  },

  // ILLUSION

  // INTANGIBILITY (V)

  // INVISIBILITY (S)

  // LIGHT/DARKNESS

  // LOCATE

  // LOCK/UNLOCK

  // MIND LINK

  // MIND READING

  // MIND WIPE (V)

  // MYSTIC INTERVENTION (L)

  // OBJECT READING (S)

  // PLANAR BINDING (V)

  // PLANE SHIFT (V)

  // PROTECTION
  // just Additional Recipients, which is handled by the generic clause above

  // PUPPET (V)

  // RELIEF
  // plus Additional Recipients, which is handled by the generic clause above
  {
    id: "POWERRELIEFMODRESTORATION",
    name: "Restoration",
    button_name: "BRSW.PowerModifiers.ReliefRestoration",
    shotsUsed: "+3",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Relief" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Relief"
  },
  {
    id: "POWERRELIEFMODSTUNNED",
    name: "Stunned",
    button_name: "BRSW.PowerModifiers.ReliefStunned",
    shotsUsed: "+1",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Relief" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Relief"
  },

  // RESURRECTION (H)

  // SANCTUARY
  {
    id: "POWERSANCTUARYMODSTRONG",
    name: "☆ Strong",
    button_name: "BRSW.PowerModifiers.SanctuaryStrong",
    shotsUsed: "+1",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Sanctuary" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Sanctuary"
  },
  {
    id: "POWERSANCTUARYMODMEDIUMBLAST",
    name: "Medium Blast",
    button_name: "BRSW.PowerModifiers.SanctuaryAreaEffectMBT",
    shotsUsed: "+2",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Sanctuary" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Sanctuary"
  },
  {
    id: "POWERSANCTUARYMODLARGEBLAST",
    name: "Large Blast",
    button_name: "BRSW.PowerModifiers.SanctuaryAreaEffectLBT",
    shotsUsed: "+3",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Sanctuary" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.Sanctuary"
  },

  // SCRYING (S)

  // SHAPE CHANGE
  // plus Additional Recipients, which is handled by the generic clause above
  {
    id: "POWERSHAPECHANGEMODDURATION",
    name: "Duration",
    button_name: "BRSW.PowerModifiers.ShapeChangeDuration",
    shotsUsed: "+1",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Shape Change" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.ShapeChange"
  },
  {
    id: "POWERSHAPECHANGEMODTRANSFORMTOUCH",
    name: "☆ Transform (Touch)",
    button_name: "BRSW.PowerModifiers.ShapeChangeTransformTouch",
    shotsUsed: "+2",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Shape Change" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.ShapeChange"
  },
  {
    id: "POWERSHAPECHANGEMODTRANSFORMRANGE",
    name: "☆ Transform (Range)",
    button_name: "BRSW.PowerModifiers.ShapeChangeTransformRange",
    shotsUsed: "+3",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Shape Change" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.ShapeChange"
  },
  {
    id: "POWERSHAPECHANGEMODPOLYMORPH",
    name: "☆ Polymorph (+3)",
    button_name: "BRSW.PowerModifiers.ShapeChangePolymorph",
    shotsUsed: "+3",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Shape Change" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.ShapeChange"
  },
  {
    id: "POWERSHAPECHANGEMOD1SIZE-4",
    name: "Size -4 to -1",
    button_name: "BRSW.PowerModifiers.ShapeChangeSize-4to-1",
    shotsUsed: "3",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Shape Change" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.ShapeChangeSize",
    group_single: true,
    defaultChecked: "on"
  },
  {
    id: "POWERSHAPECHANGEMOD2SIZE0",
    name: "Size 0",
    button_name: "BRSW.PowerModifiers.ShapeChangeSize0",
    shotsUsed: "5",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Shape Change" },
      {
        or_selector: [
          {
            selector_type: "actor_value", selector_value: "system.advances.rank=Seasoned",
          },
          {
            selector_type: "actor_value", selector_value: "system.advances.rank=Veteran",
          },
          {
            selector_type: "actor_value", selector_value: "system.advances.rank=Heroic",
          },
          {
            selector_type: "actor_value", selector_value: "system.advances.rank=Legendary",
          }
        ],
      }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.ShapeChangeSize",
    group_single: true,
  },
  {
    id: "POWERSHAPECHANGEMOD3SIZE1",
    name: "Size 1 to 2",
    button_name: "BRSW.PowerModifiers.ShapeChangeSize1to2",
    shotsUsed: "8",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Shape Change" },
      {
        or_selector: [
          {
            selector_type: "actor_value", selector_value: "system.advances.rank=Veteran",
          },
          {
            selector_type: "actor_value", selector_value: "system.advances.rank=Heroic",
          },
          {
            selector_type: "actor_value", selector_value: "system.advances.rank=Legendary",
          }
        ],
      }

    ],
    section: "power",
    group: "BRSW.PowerModifiers.ShapeChangeSize",
    group_single: true,
  },
  {
    id: "POWERSHAPECHANGEMOD4SIZE3",
    name: "Size 3 to 4",
    button_name: "BRSW.PowerModifiers.ShapeChangeSize3to4",
    shotsUsed: "11",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Shape Change" },
      {
        or_selector: [
          {
            selector_type: "actor_value", selector_value: "system.advances.rank=Heroic",
          },
          {
            selector_type: "actor_value", selector_value: "system.advances.rank=Legendary",
          }
        ],
      }

    ],
    section: "power",
    group: "BRSW.PowerModifiers.ShapeChangeSize",
    group_single: true,
  },
  {
    id: "POWERSHAPECHANGEMOD5SIZE5",
    name: "Size 5 to 10",
    button_name: "BRSW.PowerModifiers.ShapeChangeSize5to10",
    shotsUsed: "15",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Shape Change" },
      {
        or_selector: [
          {
            selector_type: "actor_value", selector_value: "system.advances.rank=Legendary",
          }
        ],
      }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.ShapeChangeSize",
    group_single: true,
  },

  // SLOTH/SPEED (S)
  // plus Additional Recipients, which is handled by the generic clause above

  // SLUMBER (S)

  // SMITE

  // SOUND/SILENCE

  // SPEAK LANGUAGE

  // STUN

  // SUMMON ALLY
  {
    id: "POWERSUMMONALLYMOD1NOVICE",
    name: "Novice",
    button_name: "BRSW.PowerModifiers.SummonAlly1Novice",
    shotsUsed: "1",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Summon Ally" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.SummonAllyRank"
  },
  {
    id: "POWERSUMMONALLYMOD2SEASONED",
    name: "Seasoned",
    button_name: "BRSW.PowerModifiers.SummonAlly2Seasoned",
    shotsUsed: "3",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Summon Ally" },
      {
        or_selector: [
          {
            selector_type: "actor_value", selector_value: "system.advances.rank=Seasoned",
          },
          {
            selector_type: "actor_value", selector_value: "system.advances.rank=Veteran",
          },
          {
            selector_type: "actor_value", selector_value: "system.advances.rank=Heroic",
          },
          {
            selector_type: "actor_value", selector_value: "system.advances.rank=Legendary",
          }
        ],
      }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.SummonAllyRank"
  },
  {
    id: "POWERSUMMONALLYMOD3VETERAN",
    name: "Veteran",
    button_name: "BRSW.PowerModifiers.SummonAlly3Veteran",
    shotsUsed: "5",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Summon Ally" },
      {
        or_selector: [
          {
            selector_type: "actor_value", selector_value: "system.advances.rank=Veteran",
          },
          {
            selector_type: "actor_value", selector_value: "system.advances.rank=Heroic",
          },
          {
            selector_type: "actor_value", selector_value: "system.advances.rank=Legendary",
          }
        ],
      }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.SummonAllyRank"
  },
  {
    id: "POWERSUMMONALLYMOD4HEROIC",
    name: "Heroic",
    button_name: "BRSW.PowerModifiers.SummonAlly4Heroic",
    shotsUsed: "7",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Summon Ally" },
      {
        or_selector: [
          {
            selector_type: "actor_value", selector_value: "system.advances.rank=Heroic",
          },
          {
            selector_type: "actor_value", selector_value: "system.advances.rank=Legendary",
          }
        ],
      }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.SummonAllyRank"
  },
  {
    id: "POWERSUMMONALLYMODMINDRIDER",
    name: "Mind Rider",
    button_name: "BRSW.PowerModifiers.SummonAllyMindRider",
    shotsUsed: "+1",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Summon Ally" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.SummonAlly"
  },
  {
    id: "POWERSUMMONALLYMODFLIGHT",
    name: "Flight",
    button_name: "BRSW.PowerModifiers.SummonAllyFlight",
    shotsUsed: "+1",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Summon Ally" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.SummonAlly"
  },
  {
    id: "POWERSUMMONALLYMODADDITIONALALLIES",
    name: "Additional Allies",
    button_name: "BRSW.PowerModifiers.SummonAllyAdditionalAllies",
    shotsUsed: "+0",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Summon Ally" },
      { selector_type: "actor_has_arcane_mastery", selector_value: true }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.SummonAlly"
  },
  {
    id: "POWERSUMMONALLYMODCOMBATEDGE",
    name: "Combat Edge",
    button_name: "BRSW.PowerModifiers.SummonAllyCombatEdge",
    shotsUsed: "+0",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Summon Ally" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.SummonAlly"
  },
  {
    id: "POWERSUMMONALLYMODINCREASEDTRAIT",
    name: "Increased Trait",
    button_name: "BRSW.PowerModifiers.SummonAllyIncreasedTrait",
    shotsUsed: "+0",
    and_selector: [
      { selector_type: "item_type", selector_value: "power" },
      { selector_type: "item_name", selector_value: "Summon Ally" }
    ],
    section: "power",
    group: "BRSW.PowerModifiers.SummonAlly"
  },

  // SUMMON ANIMAL

  // SUMMON MONSTER

  // SUMMON UNDEAD

  // TELEKINESIS (S)

  // TELEPORT (S)

  // TIME STOP (H)

  // WALL WALKER
  // just Additional Recipients, which is handled by the generic clause above

  // WISH (L)

  // ZOMBIE (V)

];
