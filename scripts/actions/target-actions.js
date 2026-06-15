//
// target actions, i.e. where the target has some sort of effect, such as Dodge edge or Shroud generic power modifier
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
// NOTE: There are likely to be conflicts with the SWIM module, as it adds some world actions in its brsw_actions_setup.js, but if we take a dependency on SWIM, we end up with a circular dependency
//

export const TARGET_ACTIONS = [
  // DODGE EDGE ... Subtracts 2 from all ranged attacks.
  // TODO ... Look at how a skillMod -2 affects the activation, as the Bolt power should activate on a 4 result, ignoring the -2 imposed by Dodge.
  //      ... So on a 4 or 5, it will cost the full Power Points to activate, but still fail to hit the target.
  {
    id: "TARGET-HAS-DODGE",
    name: "Dodge",
    button_name: "has Dodge",
    skillMod: "-2",
    ignoresArcaneActivation: true,
    and_selector: [
      {
        selector_type: "target_has_edge",
        selector_value: "BRSW.EdgeName.Dodge",
      },
      {
        selector_type: "item_is_weapon_or_bolt",
        selector_value: "true"
      }
    ],
    defaultChecked: {
      selector_type: "is_ranged_attack",
      selector_value: "true",
    },
    section: "attack",
    group: "BRSW.Target",
  },

  // SHROUD GENERIC POWER MODIFIER ...
  // TODO ... Work out what the "attacks against her suffer a -1 penalty" actually covers, i.e. is it just weapons (melee & ranged), or also powers?
  {
    id: "TARGET-HAS-SHROUD-WEAPONS",
    name: "BRSW.HasShroudName",
    button_name: "BRSW.HasShroud",
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
    section: "attack",
    group: "BRSW.Target",
  },
  {
      id: "ArcaneResistance",
      name: "BRSW.EdgeName.ArcaneResistance",
      button_name: "BRSW.HasArcaneResistance",
      skillMod: "-2",
      ignoresArcaneActivation: true,
      dmgMod: "-2",
      defaultChecked: "on",
      and_selector: [
          { selector_type: "target_has_edge", selector_value: "BRSW.EdgeName.ArcaneResistance" },
          { selector_type: "item_type", selector_value: "power" },
          {
              not_selector: [
                  { selector_type: "target_has_edge", selector_value: "BRSW.EdgeName.ImprovedArcaneResistance" }
              ]
          }
      ],
      section: "attack",
      group: "BRSW.Target"
  },
  {
      id: "ImpArcaneResistance",
      name: "BRSW.EdgeName.ImprovedArcaneResistance",
      button_name: "BRSW.HasImprovedArcaneResistance",
      skillMod: "-4",
      ignoresArcaneActivation: true,
      dmgMod: "-4",
      defaultChecked: "on",
      and_selector: [
          { selector_type: "target_has_edge", selector_value: "BRSW.EdgeName.ImprovedArcaneResistance" },
          { selector_type: "item_type", selector_value: "power" }
      ],
      section: "attack",
      group: "BRSW.Target"
  },
];
