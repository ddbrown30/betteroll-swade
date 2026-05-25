//
// target actions, i.e. where the target has some sort of effect, such as Dodge edge, Deflection power, or Shroud generic power modifier
//

/*
  format of target actions ...
    id: "xxxxx"                // unique id for the actions, sets the sort order of the action
    name: "xxxxx",             // text for line in damage roll details, currently NOT translated
    button_name: "BRSW.xxxxx", // button text in modal dialog, is translated. Actual text comes from the en.json file
    { selector_type: "item_name", selector_value: "xxxxx" }          // "item_name"         is currently NOT translated
    { selector_type: "target_has_effect", selector_value: "xxxxx" }  // "target_has_effect" is currently NOT translated
    group: "BRSW.xxxxx"        // again actual text comes from the en.json file
*/

//
// NOTE: The actions using the "target_has_effect" selector are opinionated in the name of the effect.
// NOTE: The suffixes of "weapon" and "power" refer to the source of the "attack" on the target, i.e. physical weapons and arcane powers.
// NOTE: There is a question on the logic for actions where the skillMod of a power is reduced.
//       Currently this means the activation fails, so the cost is 1 PP.
//       But in the rules, the power is activated,
//       e.g., a Bolt that misses because the target has Deflection, is still activated on a 4 or greater, it just needs a 6 or greater to hit the target.
// NOTE: There are likely to be conflicts with the SWIM module, as it adds some world actions in its brsw_actions_setup.js, but if we take a dependency on SWIM, we end up with a circular dependency
//

export const TARGET_ACTIONS = [
  // DODGE EDGE ... Subtracts 2 from all ranged attacks.
  // TODO ... Look at how a skillMod -2 affects the activation, as the Bolt power should activate on a 4 result, ignoring the -2 imposed by Dodge.
  //      ... So on a 4 or 5, it will cost the full Power Points to activate, but still fail to hit the target.
  {
    id: "TARGET-HAS-DODGE-BOLT",
    name: "Dodge vs Bolt",
    button_name: "has Dodge vs Bolt",
    //skillMod: "0",  //TODO this was so the power in the card Rolls section, but "0" seems to cause an error, so leave out for now.
    and_selector: [
      {
        selector_type: "target_has_edge",
        selector_value: "BRSW.EdgeName-Dodge", // NOTE This works because the global_actions.js expects ... value.includes("BRSW.EdgeName-")
      },
      {
        selector_type: "item_type",
        selector_value: "power"
      },
      {
        selector_type: "item_name",
        selector_value: "Bolt"
      }
    ],
    defaultChecked: "on",
    group: "BRSW.Target",
  },
  {
    id: "TARGET-HAS-DODGE-WEAPONS",
    name: "Dodge vs Ranged",
    button_name: "has Dodge vs Ranged",
    skillMod: "-2",
    and_selector: [
      {
        selector_type: "target_has_edge",
        selector_value: "BRSW.EdgeName-Dodge",
      },
      {
        selector_type: "item_type",
        selector_value: "weapon"
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

  // DEFLECTION POWER ... Subtracts 2 from either melee or ranged attacks
  // TODO ... How to handle melee attacks when the attacker does NOT have "Fighting", so uses "Unskilled Attempt"
  {
    id: "TARGET-HAS-DEFLECTION-MELEE",
    name: "Deflection (melee)",
    button_name: "has Deflection (melee)",
    skillMod: -2,
    and_selector: [
      {
        selector_type: "target_has_effect",
        selector_value: "Deflection (melee)"
      },
      {
        selector_type: "item_type",
        selector_value: "weapon"
      },
      {
        selector_type: "skill",
        selector_value: "Fighting"
      },
      // TODO ... How to handle Unskilled Attempt melee attacks
      // {
      //   or_selector: [
      //     {
      //       selector_type: "skill",
      //       selector_value: "Fighting"
      //     },
      //     {
      //       selector_type: "skill",
      //       selector_value: "Unskilled Attempt"
      //     },
      //   ],
      // },
    ],
    defaultChecked: "on",
    group: "BRSW.Target",
  },
  // TODO ... Look at how a skillMod -2/-4 affects the power activation, really just Bolt, as it will activate on a 4 result, ignoring the -2/-4 imposed by Deflection.
  //      ... It will just fail to hit the target.
  {
    id: "TARGET-HAS-DEFLECTION-RANGED",
    name: "TargetHasDeflectionRanged",
    button_name: "has Deflection (ranged)",
    skillMod: -2,
    and_selector: [
      {
        selector_type: "target_has_effect",
        selector_value: "Deflection (ranged)"
      },
      {
        selector_type: "item_type",
        selector_value: "weapon"
      },
      {
        or_selector: [
          {
            selector_type: "skill",
            selector_value: "BRSW.SkillName-Athletics"
          },
          {
            selector_type: "skill",
            selector_value: "BRSW.SkillName-Shooting"
          },
          // TODO ... How to handle ranged attacks when the attacker does NOT have "Shooting" or "Athletics", so uses "Unskilled Attempt"
          // {
          //   selector_type: "skill",
          //   selector_value: "BRSW.SkillName-UnskilledAttempt"
          // },
        ],
      },
    ],
    defaultChecked: "on",
    group: "BRSW.Target",
  },
  {
    id: "TARGET-HAS-DEFLECTION-BOTH",
    name: "TargetHasDeflectionBoth",
    button_name: "has Deflection",
    skillMod: -2,
    and_selector: [
      {
        selector_type: "target_has_effect",
        selector_value: "Deflection"
      },
      {
        not_selector: [
          {
            or_selector: [
              {
                selector_type: "target_has_effect",
                selector_value: "Deflection (melee)"
              },
              {
                selector_type: "target_has_effect",
                selector_value: "Deflection (ranged)"
              },
            ]
          }
        ]
      },
      {
        selector_type: "item_type",
        selector_value: "weapon"
      },
      {
        or_selector: [
          {
            selector_type: "skill",
            selector_value: "BRSW.SkillName-Athletics"
          },
          {
            selector_type: "skill",
            selector_value: "BRSW.SkillName-Shooting"
          },
          {
            selector_type: "skill",
            selector_value: "Fighting"
          },
          // TODO ... How to handle ranged attacks when the attacker does NOT have "Shooting" or "Athletics", so uses "Unskilled Attempt"
          // {
          //   selector_type: "skill",
          //   selector_value: "BRSW.SkillName-UnskilledAttempt"
          // },
        ],
      },
    ],
    defaultChecked: "on",
    group: "BRSW.Target",
  },

  // SHROUD GENERIC POWER MODIFIER ...
  // TODO ... Work out what the "attacks against her suffer a -1 penalty" actually covers, i.e. is it just weapons (melee & ranged), or also powers?
  {
    id: "TARGET-HAS-SHROUD-WEAPONS",
    name: "TargetHasShroudWeapon",
    button_name: "has Shroud",
    skillMod: "-1",
    and_selector: [
      {
        selector_type: "target_has_effect",
        selector_value: "Shroud",
      },
      {
        or_selector: [
          {
            selector_type: "item_type",
            selector_value: "weapon"
          },
          {
            selector_type: "item_type",
            selector_value: "power"
          },
        ],
      },],
    defaultChecked: "on",
    group: "BRSW.Target",
  },

];
