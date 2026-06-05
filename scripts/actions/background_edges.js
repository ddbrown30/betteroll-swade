// Actions for the Background Edges

export const BACKGROUND_EDGES = [
  {
    id: "ALERTNESS",
    name: "BRSW.EdgeName-Alertness",
    button_name: "BRSW.EdgeName-Alertness",
    skillMod: "+2",
    and_selector: [
      {
        selector_type: "actor_has_edge",
        selector_value: "BRSW.EdgeName-Alertness",
      },
      { selector_type: "skill", selector_value: "BRSW.SkillName-Notice" },
    ],
    defaultChecked: "on",
    section: "character",
    group: "BRSW.Edges",
  },
  {
    id: "Aristocrat",
    name: "BRSW.EdgeName-Aristocrat",
    button_name: "BRSW.EdgeName-Aristocrat",
    skillMod: "+2",
    and_selector: [
      {
        selector_type: "actor_has_edge",
        selector_value: "BRSW.EdgeName-Aristocrat",
      },
      {
        or_selector: [
          {
            selector_type: "skill",
            selector_value: "BRSW.SkillName-Persuasion",
          },
          {
            selector_type: "skill",
            selector_value: "BRSW.SkillName-CommonKnowledge",
          },
        ],
      },
    ],
    section: "character",
    group: "BRSW.Edges",
  },
  {
    id: "Attractive",
    name: "BRSW.EdgeName-Attractive",
    button_name: "BRSW.EdgeName-Attractive",
    skillMod: "+1",
    and_selector: [
      {
        selector_type: "actor_has_edge",
        selector_value: "BRSW.EdgeName-Attractive",
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
        ],
      },
      {
        not_selector: [
          {
            selector_type: "actor_has_edge",
            selector_value: "BRSW.EdgeName-VeryAttractive",
          },
        ],
      },
    ],
    section: "character",
    group: "BRSW.Edges",
  },
  {
    id: "Very Attractive",
    name: "BRSW.EdgeName-VeryAttractive",
    button_name: "BRSW.EdgeName-VeryAttractive",
    skillMod: "+2",
    and_selector: [
      {
        selector_type: "actor_has_edge",
        selector_value: "BRSW.EdgeName-VeryAttractive",
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
        ],
      },
    ],
    section: "character",
    group: "BRSW.Edges",
  },
  {
    id: "ELAN",
    name: "BRSW.EdgeName-Elan",
    button_name: "BRSW.EdgeName-Elan",
    rerollSkillMod: "+2",
    rerollMode: "benny",
    selector_type: "actor_has_edge",
    selector_value: "BRSW.EdgeName-Elan",
    defaultChecked: "on",
    section: "character",
    group: "BRSW.Edges",
  },
  {
    id: "Fame",
    name: "Fame",
    button_name: "BRSW.EdgeName-Fame",
    skillMod: "+1",
    and_selector: [
      { selector_type: "actor_has_edge", selector_value: "BRSW.EdgeName-Fame" },
      { selector_type: "skill", selector_value: "BRSW.SkillName-Persuasion" },
      {
        not_selector: [
          {
            selector_type: "actor_has_edge",
            selector_value: "BRSW.EdgeName-Famous",
          },
        ],
      },
    ],
    section: "character",
    group: "BRSW.Edges",
  },
  {
    id: "Famous",
    name: "Famous",
    button_name: "BRSW.EdgeName-Famous",
    skillMod: "+2",
    and_selector: [
      {
        selector_type: "actor_has_edge",
        selector_value: "BRSW.EdgeName-Famous",
      },
      { selector_type: "skill", selector_value: "BRSW.SkillName-Persuasion" },
    ],
    section: "character",
    group: "BRSW.Edges",
  },
];
