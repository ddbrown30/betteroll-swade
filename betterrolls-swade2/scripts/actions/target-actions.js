//
// target actions, i.e. where the target has some sort of effect, such as Dodge
//

//
// NOTE: The actions using the "target_has_effect" selector are opinionated in the name of the effect.
// NOTE: The suffixes of "weapon" and "power" refer to the source of the "attack" on the target, i.e. physical weapons and arcane powers.
// NOTE: There is a question on the logic for actions where the skillMod of a power is reduced.
//       Currently this meaning the activation fails, so the cost is 1 PP. 
//       But the power is activated, e.g. a Bolt that misses because of Deflection is still activated on a 4 or greater, it just needs a 6 or greater to hit the target.
//

export const TARGET_ACTIONS = [
  // DODGE EDGE ...
  // TODO ... Look at how a skillMod -2/-4 affects the activation, as the power will activate on a 4 result, ignoring the -2/-4 imposed by Arcane Protection.
  //      ... It will just fail to affect the target. 
  {
    id: "TARGET-HAS-DODGE-POWERS",
    name: "BRSW.TargetHasDodgePower",
    button_name: "BRSW.TargetHasDodgePower",
    skillMod: "-2",
    and_selector: [
      {
        selector_type: "target_has_edge",
        selector_value: "BRSW.EdgeName-Dodge", // NOTE this works because the global_actions.js expects the ... value.includes("BRSW.EdgeName-")
      },
      {
        selector_type: "item_type",
        selector_value: "power"
      },
    ],
    defaultChecked: "on",
    group: "BRSW.Target",
  },
  {
    id: "TARGET-HAS-DODGE-WEAPONS",
    name: "BRSW.TargetHasDodgeWeapon",
    button_name: "BRSW.TargetHasDodgeWeapon",
    skillMod: "-2",
    and_selector: [
      {
        selector_type: "item_type",
        selector_value: "weapon"
      },
      {
        selector_type: "target_has_edge",
        selector_value: "BRSW.EdgeName-Dodge",
      },
      {
        or_selector: [
          {
            selector_type: "skill",
            selector_value: "BRSW.SkillName-UnskilledAttempt"
          },
          {
            selector_type: "skill",
            selector_value: "BRSW.SkillName-Shooting"
          },
          {
            selector_type: "skill",
            selector_value: "BRSW.SkillName-Athletics"
          },
        ],
      },
    ],
    defaultChecked: "on",
    group: "BRSW.Target",
  },
  // SHROUD GENERIC POWER MODIFIER ...
  {
    id: "TARGET-HAS-SHROUD-WEAPONS",
    name: "TargetHasShroudWeapon",
    button_name: "has Shroud",
    skillMod: "-1",
    and_selector: [
      {
        selector_type: "item_type",
        selector_value: "weapon"
      },
      {
        selector_type: "target_has_effect",
        selector_value: "Shroud",
      },
    ],
    defaultChecked: "on",
    group: "BRSW.Target",
  },
  // ARCANE PROTECTION POWER 
  // NOTE ... This action currently has NO actual effect, i.e, for now, it just shows a target has Arcane Protection.
  // TODO ... Look at how a skillMod -2/-4 affects the activation, as the power will activate on a 4 result, ignoring the -2/-4 imposed by Arcane Protection.
  //      ... It will just fail to affect the target.
  // TODO ... Add the skillMod -2 and handle the -4 for a raise.
  // TODO ... Add the skillMod -4 and -6 for the epic modifier Greater Arcane Protection.
  {
    id: "TARGET-HAS-ARCANE-PROTECTION",
    name: "TargetHasArcaneProtection",
    button_name: "has Arcane Protection",
    and_selector: [
      {
        selector_type: "target_has_effect",
        selector_value: "Protection"
      },
      {
        selector_type: "item_type",
        selector_value: "power"
      },
    ],
    defaultChecked: "on",
    group: "BRSW.Target",
  },
  // PROTECTION POWER
  // NOTE ... This action does NOT have any actual effect, i.e, it just shows a target has Protection. 
  //      ... The assumption is the target has an Active Effect with increases to either Armour or Toughness, i.e.,
  //      ...   system.stats.toughness.armor Add 2  (with activation)
  //      ...   system.stats.toughness.value Add 2  (with raise)
  {
    id: "TARGET-HAS-PROTECTION",
    name: "TargetHasProtection",
    button_name: "has Protection",
    and_selector: [
      {
        selector_type: "target_has_effect",
        selector_value: "Protection"
      },
      {
        "not_selector": [
          {
            "selector_type": "target_has_effect",
            "selector_value": "Arcane Protection"
          }
        ]
      },
    ],
    defaultChecked: "on",
    group: "BRSW.Target",
  },
  // SANCTUARY POWER 
  // ... no actual effect, but shows target has Sanctuary
  {
    id: "TARGET-HAS-SANCTUARY",
    name: "TargetHasSanctuary",
    button_name: "has Sanctuary",
    selector_type: "target_has_effect",
    selector_value: "Sanctuary",
    defaultChecked: "on",
    group: "BRSW.Target",
  },

];
