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

const BOLT_SELECTOR = [
    { selector_type: "item_type", selector_value: "power" },
    { selector_type: "item_name", selector_value: "Bolt" },
    {
        not_selector: [
            { selector_type: "item_name", selector_value: "Minor Bolt" }
        ]
    },
];

export const POWER_MODIFIERS = [
    // BARRIER (S)
    {
        id: "POWERBARRIERDAMAGE",
        name: "BRSW.PowerModifiers.BarrierDamageName",
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
        name: "BRSW.PowerModifiers.BarrierDeadlyName",
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
        name: "BRSW.PowerModifiers.BlastDamageName",
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
        name: "BRSW.PowerModifiers.BlastGreaterBlastName",
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
        name: "BRSW.PowerModifiers.BoltDamageName",
        button_name: "BRSW.PowerModifiers.BoltDamage",
        dmgOverride: "3d6x",
        and_selector: [
            ...BOLT_SELECTOR
        ],
        section: "power",
        group: "BRSW.PowerModifiers.PowerModifiers"
    },
    {
        id: "POWERBOLTMOD2GREATERBOLT",
        name: "BRSW.PowerModifiers.BoltGreaterBoltName",
        button_name: "BRSW.PowerModifiers.BoltGreaterBolt",
        dmgOverride: "4d6x",
        isHeavyWeapon: true,
        and_selector: [
            ...BOLT_SELECTOR,
            { selector_type: "actor_has_arcane_mastery", selector_value: true }
        ],
        section: "power",
        group: "BRSW.PowerModifiers.PowerModifiers"
    },
    {
        id: "POWERBOLTMOD4RATEOFFIRE",
        name: "BRSW.PowerModifiers.BoltRateOfFireName",
        button_name: "BRSW.PowerModifiers.BoltRateOfFire",
        rof: "2",
        and_selector: [
            ...BOLT_SELECTOR,
            { selector_type: "actor_has_arcane_mastery", selector_value: true }
        ],
        section: "power",
        group: "BRSW.PowerModifiers.PowerModifiers"
    },

    // BURST
    {
        id: "POWERBURSTMOD1DAMAGE",
        name: "BRSW.PowerModifiers.BurstDamageName",
        button_name: "BRSW.PowerModifiers.BurstDamage",
        dmgOverride: "3d6x",
        and_selector: [
            { selector_type: "item_type", selector_value: "power" },
            { selector_type: "item_name", selector_value: "Burst" }
        ],
        section: "power",
        group: "BRSW.PowerModifiers.PowerModifiers"
    },
    {
        id: "POWERBURSTMOD3GREATERBURST",
        name: "BRSW.PowerModifiers.BurstGreaterBurstName",
        button_name: "BRSW.PowerModifiers.BurstGreaterBurst",
        dmgOverride: "4d6x",
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
        name: "BRSW.PowerModifiers.DamageFieldDamageName",
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
        name: "BRSW.PowerModifiers.DamageFieldGreaterDamageFieldName",
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
        name: "BRSW.PowerModifiers.EntangleDamageName",
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
        name: "BRSW.PowerModifiers.EntangleDeadlyName",
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
        name: "BRSW.PowerModifiers.HavocGreaterHavocName",
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
