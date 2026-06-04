import { BACKGROUND_EDGES } from "./background_edges.js";
import { COMBAT_OPTIONS } from "./combat_options.js";
import { GENERIC_POWER_MODIFIERS } from "./power-generic-modifiers.js";
import { POWER_MODIFIERS } from "./power-modifiers.js";
import { TARGET_ACTIONS } from "./target-actions.js";

export const SYSTEM_GLOBAL_ACTION = [
  {
    id: "NO_MERCY",
    name: "BRSW.EdgeName-NoMercy",
    button_name: "BRSW.EdgeName-NoMercy",
    rerollDamageMod: "+2",
    rerollMode: "benny",
    and_selector: [
      { selector_type: "actor_has_edge", selector_value: "BRSW.EdgeName-NoMercy" },
      { selector_type: "item_has_damage", selector_value: "true" },
    ],
    defaultChecked: "on",
    group: "BRSW.Edges",
  },
  {
    id: "FRENZY",
    name: "BRSW.EdgeName-Frenzy",
    button_name: "BRSW.EdgeName-Frenzy",
    and_selector: [
      { selector_type: "skill", selector_value: "fighting" },
      {
        selector_type: "actor_has_edge",
        selector_value: "BRSW.EdgeName-Frenzy",
      },
      { selector_type: "item_type", selector_value: "weapon" },
      {
        not_selector: [
          {
            selector_type: "actor_has_edge",
            selector_value: "BRSW.EdgeName-ImprovedFrenzy",
          },
        ],
      },
    ],
    defaultChecked: "on",
    group: "BRSW.Edges",
    rof: "2",
  },
  {
    id: "IMPROVED FRENZY",
    name: "BRSW.EdgeName-ImprovedFrenzy",
    button_name: "BRSW.EdgeName-ImprovedFrenzy",
    and_selector: [
      { selector_type: "skill", selector_value: "fighting" },
      {
        selector_type: "actor_has_edge",
        selector_value: "BRSW.EdgeName-ImprovedFrenzy",
      },
      { selector_type: "item_type", selector_value: "weapon" },
    ],
    defaultChecked: "on",
    group: "BRSW.Edges",
    rof: "3",
  },
  {
    id: "MARKSMAN",
    name: "BRSW.EdgeName-Marksman",
    button_name: "BRSW.EdgeName-Marksman",
    skillMod: 1,
    aimingIgnoreMod: 2,
    and_selector: [
      {
        selector_type: "actor_has_edge",
        selector_value: "BRSW.EdgeName-Marksman",
      },
      { selector_type: "skill", selector_value: "BRSW.Shooting" },
    ],
    group: "BRSW.Edges",
  },
  {
    id: "MRFIXIT",
    name: "BRSW.EdgeName-MrFixIt",
    button_name: "BRSW.EdgeName-MrFixIt",
    skillMod: "+2",
    and_selector: [
      {
        selector_type: "actor_has_edge",
        selector_value: "BRSW.EdgeName-MrFixIt",
      },
      { selector_type: "skill", selector_value: "BRSW.SkillName-Repair" },
    ],
    defaultChecked: "on",
    group: "BRSW.Edges",
  },
  {
    id: "UNARMEDDEFENDER",
    name: "BRSW.UnarmedDefender",
    button_name: "BRSW.UnarmedDefender",
    skillMod: "+2",
    selector_type: "skill",
    selector_value: "fighting",
    group: "BRSW.SituationalModifiers",
  },
  {
    id: "RANSTEADY",
    name: "BRSW.RanSteady",
    button_name: "BRSW.RanSteady",
    skillMod: "-1",
    and_selector: [
      {
        selector_type: "actor_has_edge",
        selector_value: "BRSW.EdgeName-Steady-Hands",
      },
      { selector_type: "all" },
    ],
    group: "BRSW.SituationalModifiers",
  },
  {
    id: "ALLTHUMBS",
    name: "BRSW.EdgeName-All-Thumbs",
    button_name: "BRSW.EdgeName-All-Thumbs",
    skillMod: "-2",
    selector_type: "actor_has_hindrance",
    selector_value: "BRSW.EdgeName-All-Thumbs",
    group: "BRSW.Hindrances",
  },
  {
    id: "BLIND",
    name: "BRSW.EdgeName-Blind",
    button_name: "BRSW.EdgeName-Blind",
    skillMod: "-6",
    selector_type: "actor_has_hindrance",
    selector_value: "BRSW.EdgeName-Blind",
    defaultChecked: "on",
    group: "BRSW.Hindrances",
  },
  {
    id: "CANTSWIN",
    name: "BRSW.EdgeName-Cant-Swim",
    button_name: "BRSW.EdgeName-Cant-Swim",
    skillMod: "-2",
    and_selector: [
      { selector_type: "actor_has_hindrance", selector_value: "Can't Swim" },
      { selector_type: "skill", selector_value: "Athletics" },
    ],
    group: "BRSW.Hindrances",
  },
  {
    id: "Clueless",
    name: "BRSW.EdgeName-Clueless",
    button_name: "BRSW.EdgeName-Clueless",
    skillMod: "-1",
    and_selector: [
      {
        selector_type: "actor_has_hindrance",
        selector_value: "BRSW.EdgeName-Clueless",
      },
      {
        or_selector: [
          {
            selector_type: "skill",
            selector_value: "BRSW.SkillName-CommonKnowledge",
          },
          { selector_type: "skill", selector_value: "BRSW.SkillName-Notice" },
        ],
      },
    ],
    defaultChecked: "on",
    group: "BRSW.Hindrances",
  },
  {
    id: "Clumsy",
    name: "BRSW.EdgeName-Clumsy",
    button_name: "BRSW.EdgeName-Clumsy",
    skillMod: "-2",
    and_selector: [
      {
        selector_type: "actor_has_hindrance",
        selector_value: "BRSW.EdgeName-Clumsy",
      },
      {
        or_selector: [
          {
            selector_type: "skill",
            selector_value: "BRSW.SkillName-Athletics",
          },
          { selector_type: "skill", selector_value: "BRSW.SkillName-Stealth" },
        ],
      },
    ],
    defaultChecked: "on",
    group: "BRSW.Hindrances",
  },
  {
    id: "Hard of Hearing",
    name: "BRSW.EdgeName-HardOfHearing",
    button_name: "BRSW.EdgeName-HardOfHearing",
    skillMod: "-4",
    and_selector: [
      {
        selector_type: "actor_has_hindrance",
        selector_value: "BRSW.EdgeName-HardOfHearing",
      },
      { selector_type: "skill", selector_value: "BRSW.SkillName-Notice" },
    ],
    group: "BRSW.Hindrances",
  },
  {
    id: "Mean",
    name: "BRSW.EdgeName-Mean",
    button_name: "BRSW.EdgeName-Mean",
    skillMod: "-1",
    and_selector: [
      {
        selector_type: "actor_has_hindrance",
        selector_value: "BRSW.EdgeName-Mean",
      },
      { selector_type: "skill", selector_value: "BRSW.SkillName-Persuasion" },
      {
        selector_type: "module_is_not_active",
        selector_value: "swade-core-rules",
      },
    ],
    defaultChecked: "on",
    group: "BRSW.Hindrances",
  },
  {
    id: "Mild Mannered",
    name: "BRSW.EdgeName-MildMannered",
    button_name: "BRSW.EdgeName-MildMannered",
    skillMod: "-2",
    and_selector: [
      {
        selector_type: "actor_has_hindrance",
        selector_value: "BRSW.EdgeName-MildMannered",
      },
      { selector_type: "skill", selector_value: "BRSW.SkillName-Intimidation" },
    ],
    defaultChecked: "on",
    group: "BRSW.Hindrances",
  },
  {
    id: "Outsider",
    name: "BRSW.EdgeName-Outsider",
    button_name: "BRSW.EdgeName-Outsider",
    skillMod: "-2",
    and_selector: [
      {
        selector_type: "actor_has_hindrance",
        selector_value: "BRSW.EdgeName-Outsider",
      },
      { selector_type: "skill", selector_value: "BRSW.SkillName-Persuasion" },
      {
        not_selector: [
          { selector_type: "actor_has_hindrance", selector_value: "Outsider+" },
        ],
      },
    ],
    defaultChecked: "on",
    group: "BRSW.Hindrances",
  },
  {
    id: "Tongue Tied",
    name: "BRSW.EdgeName-TongueTied",
    button_name: "BRSW.EdgeName-TongueTied",
    skillMod: "-1",
    and_selector: [
      {
        selector_type: "actor_has_hindrance",
        selector_value: "BRSW.EdgeName-TongueTied",
      },
      {
        or_selector: [
          {
            selector_type: "skill",
            selector_value: "BRSW.SkillName-Performance",
          },
          {
            selector_type: "skill",
            selector_value: "BRSW.SkillName-Persuasion",
          },
          { selector_type: "skill", selector_value: "BRSW.SkillName-Taunt" },
          {
            selector_type: "skill",
            selector_value: "BRSW.SkillName-Intimidation",
          },
        ],
      },
    ],
    defaultChecked: "on",
    group: "BRSW.Hindrances",
  },
  {
    id: "Free runner",
    name: "BRSW.ApplyFreeRunner",
    button_name: "BRSW.ApplyFreeRunner",
    skillMod: "+2",
    and_selector: [
      {
        selector_type: "actor_has_edge",
        selector_value: "BRSW.EdgeName-FreeRunner",
      },
      { selector_type: "skill", selector_value: "BRSW.SkillName-Athletics" },
    ],
    group: "BRSW.Edges",
  },
  {
    id: "Giant Killer",
    name: "BRSW.EdgeName-GiantKiller",
    button_name: "BRSW.EdgeName-GiantKiller",
    dmgMod: "+1d6x",
    and_selector: [
      {
        selector_type: "actor_has_edge",
        selector_value: "BRSW.EdgeName-GiantKiller",
      },
      {
        or_selector: [
          { selector_type: "item_type", selector_value: "weapon" },
          { selector_type: "item_type", selector_value: "power" },
        ],
      },
    ],
    group: "BRSW.Edges",
  },
  {
    id: "Martial Artist",
    name: "BRSW.EdgeName-MartialArtist",
    button_name: "BRSW.EdgeName-MartialArtist",
    skillMod: "+1",
    and_selector: [
      {
        selector_type: "actor_has_edge",
        selector_value: "BRSW.EdgeName-MartialArtist",
      },
      { selector_type: "item_name", selector_value: "BRSW.Unarmed" },
      {
        not_selector: [
          {
            selector_type: "actor_has_edge",
            selector_value: "BRSW.EdgeName-MartialWarrior",
          },
        ],
      },
    ],
    defaultChecked: "on",
    group: "BRSW.Edges",
  },
  {
    id: "Martial Warrior",
    name: "BRSW.EdgeName-MartialWarrior",
    button_name: "BRSW.EdgeName-MartialWarrior",
    skillMod: "+2",
    and_selector: [
      {
        selector_type: "actor_has_edge",
        selector_value: "BRSW.EdgeName-MartialWarrior",
      },
      { selector_type: "item_name", selector_value: "BRSW.Unarmed" },
    ],
    defaultChecked: "on",
    group: "BRSW.Edges",
  },
  {
    id: "Assassin",
    name: "BRSW.EdgeName-Assassin",
    button_name: "BRSW.EdgeName-Assassin",
    dmgMod: "+2",
    and_selector: [
      {
        selector_type: "actor_has_edge",
        selector_value: "BRSW.EdgeName-Assassin",
      },
      {
        or_selector: [
          { selector_type: "item_type", selector_value: "weapon" },
          { selector_type: "item_type", selector_value: "power" },
        ],
      },
    ],
    group: "BRSW.Edges",
  },
  {
    id: "Investigator",
    name: "BRSW.EdgeName-Investigator",
    button_name: "BRSW.EdgeName-Investigator",
    skillMod: "+2",
    and_selector: [
      {
        selector_type: "actor_has_edge",
        selector_value: "BRSW.EdgeName-Investigator",
      },
      {
        or_selector: [
          { selector_type: "skill", selector_value: "BRSW.SkillName-Notice" },
          { selector_type: "skill", selector_value: "BRSW.SkillName-Research" },
        ],
      },
    ],
    defaultChecked: "on",
    group: "BRSW.Edges",
  },
  {
    id: "SWEEP",
    name: "BRSW.EdgeName-Sweep",
    button_name: "BRSW.EdgeName-Sweep",
    skillMod: "-2",
    //extra_text: "TEMP: Applying -2 penalty for One-Handed Weapon, so add +2 if using Two-Handed Weapon. <br>Target <b>ALL</b> targets within weapon reach",
    and_selector: [
      { selector_type: "skill", selector_value: "fighting" },
      {
        selector_type: "actor_has_edge",
        selector_value: "BRSW.EdgeName-Sweep",
      },
      { selector_type: "item_type", selector_value: "weapon" },
      {
        not_selector: [
          {
            selector_type: "actor_has_edge",
            selector_value: "BRSW.EdgeName-SweepImproved",
          },
        ],
      },
    ],
    group: "BRSW.Edges",
  },
  {
    id: "IMPROVED-SWEEP",
    name: "BRSW.EdgeName-SweepImproved",
    button_name: "BRSW.EdgeName-SweepImproved",
    skillMod: "-2",
    // extra_text: "TEMP: Applying -2 penalty for One-Handed Weapon, so add +2 if using Two-Handed Weapon. Target all targets within weapon reach, <b>avoiding</b> allies",
    and_selector: [
      { selector_type: "skill", selector_value: "fighting" },
      {
        selector_type: "actor_has_edge",
        selector_value: "BRSW.EdgeName-SweepImproved",
      },
      { selector_type: "item_type", selector_value: "weapon" },
    ],
    group: "BRSW.Edges",
  },
  {
    id: "Double Shot",
    name: "BRSW.EdgeName-DoubleShot",
    button_name: "BRSW.EdgeName-DoubleShot",
    and_selector: [
      {
        or_selector: [
          { selector_type: "skill", selector_value: "athletics" },
          { selector_type: "skill", selector_value: "shooting" },
        ],
      },
      {
        or_selector: [
          {
            selector_type: "actor_has_edge",
            selector_value: "BRSW.EdgeName-DoubleShot",
          },
          {
            selector_type: "actor_has_edge",
            selector_value: "BRSW.EdgeName-ImprovedDoubleShot",
          },
        ],
      },
      { selector_type: "item_type", selector_value: "weapon" },
    ],
    defaultChecked: "on",
    group: "BRSW.Edges",
    rof: "2",
  },
  {
    id: "Rapid Shot",
    name: "BRSW.EdgeName-RapidShot",
    button_name: "BRSW.EdgeName-RapidShot",
    and_selector: [
      { selector_type: "skill", selector_value: "shooting" },
      {
        or_selector: [
          {
            selector_type: "actor_has_edge",
            selector_value: "BRSW.EdgeName-RapidShot",
          },
          {
            selector_type: "actor_has_edge",
            selector_value: "BRSW.EdgeName-ImprovedRapidShot",
          },
        ],
      },
      { selector_type: "item_type", selector_value: "weapon" },
    ],
    defaultChecked: "on",
    group: "BRSW.Edges",
    rof: "2",
  },
]
  .concat(COMBAT_OPTIONS)
  .concat(BACKGROUND_EDGES)
  .concat(GENERIC_POWER_MODIFIERS)
  .concat(POWER_MODIFIERS)
  .concat(TARGET_ACTIONS);
