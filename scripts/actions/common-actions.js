const ILLUMINATION_SKILLS_SELECTORS =
{
  or_selector: [
    {
      selector_type: "skill",
      selector_value: "Alchemy"
    },
    {
      selector_type: "skill",
      selector_value: "Athletics"
    },
    {
      selector_type: "skill",
      selector_value: "Boating"
    },
    {
      selector_type: "skill",
      selector_value: "Driving"
    },
    {
      selector_type: "skill",
      selector_value: "Faith"
    },
    {
      selector_type: "skill",
      selector_value: "Fighting"
    },
    {
      selector_type: "skill",
      selector_value: "Focus"
    },
    {
      selector_type: "skill",
      selector_value: "Notice"
    },
    {
      selector_type: "skill",
      selector_value: "Piloting"
    },
    {
      selector_type: "skill",
      selector_value: "Psionics"
    },
    {
      selector_type: "skill",
      selector_value: "Riding"
    },
    {
      selector_type: "skill",
      selector_value: "Shooting"
    },
    {
      selector_type: "skill",
      selector_value: "Spellcasting"
    },
    {
      selector_type: "skill",
      selector_value: "Unskilled Attempt"
    },
    {
      selector_type: "skill",
      selector_value: "Weird Science"
    },
  ]
};

const NIGHTDARKVISION_SELECTORS = [
  {
    selector_type: "actor_has_ability",
    selector_value: "BRSW.AbilityName.NightVision",
  },
  {
    selector_type: "actor_has_ability",
    selector_value: "BRSW.AbilityName.Darkvision",
  },
  {
    selector_type: "actor_has_ability",
    selector_value: "BRSW.AbilityName.DarkVision",
  },
];

export const COMMON_ACTIONS = [
  {
    id: "UNSTABLEPLATFORMGM",
    name: "BRSW.UnstablePlatform",
    button_name: "BRSW.UnstablePlatform",
    skillMod: "-2",
    selector_type: "gm_action",
    group: "BRSW.SituationalModifiers",
  },
  {
    id: "1LDimGm",
    name: "BRSW.IlluminationDim",
    button_name: "BRSW.IlluminationDim",
    skillMod: "-2",
    selector_type: "gm_action",
    group: "BRSW.Illumination",
    group_single: true,
  },
  {
    id: "2LDarkGm",
    name: "BRSW.IlluminationDark",
    button_name: "BRSW.IlluminationDark",
    skillMod: "-4",
    selector_type: "gm_action",
    group: "BRSW.Illumination",
    group_single: true,
  },
  {
    id: "3LPitchGm",
    name: "BRSW.IlluminationPitch",
    button_name: "BRSW.IlluminationPitch",
    skillMod: "-6",
    selector_type: "gm_action",
    group: "BRSW.Illumination",
    group_single: true,
  },
  {
    id: "1LDim",
    name: "BRSW.IlluminationDim",
    button_name: "BRSW.IlluminationDim",
    and_selector: [
      ILLUMINATION_SKILLS_SELECTORS,
      {
        not_selector: [
          {
            or_selector: [
              {
                selector_type: "actor_has_ability",
                selector_value: "BRSW.AbilityName.LowLightVision",
              },
              ...NIGHTDARKVISION_SELECTORS,
            ],
          },
        ],
      }
    ],
    skillMod: "-2",
    ignoresArcaneActivation: true,
    section: "common",
    group: "BRSW.Illumination",
    group_single: true,
    defaultChecked: {
      selector_type: "gm_action_enabled",
      selector_value: "1LDimGm",
    },
  },
  {
    id: "2LDark",
    name: "BRSW.IlluminationDark",
    button_name: "BRSW.IlluminationDark",
    and_selector: [
      ILLUMINATION_SKILLS_SELECTORS,
      {
        not_selector: [
          {
            or_selector: [
              {
                selector_type: "actor_has_ability",
                selector_value: "BRSW.AbilityName.LowLightVision",
              },
              ...NIGHTDARKVISION_SELECTORS,
            ],
          },
        ],
      }
    ],
    skillMod: "-4",
    ignoresArcaneActivation: true,
    section: "common",
    group: "BRSW.Illumination",
    group_single: true,
    defaultChecked: {
      selector_type: "gm_action_enabled",
      selector_value: "2LDarkGm",
    },
  },
  {
    id: "3LPitch",
    name: "BRSW.IlluminationPitch",
    button_name: "BRSW.IlluminationPitch",
    and_selector: [
      ILLUMINATION_SKILLS_SELECTORS,
      {
        not_selector: [
          {
            or_selector: [
              ...NIGHTDARKVISION_SELECTORS,
            ],
          },
        ],
      }
    ],
    skillMod: "-6",
    ignoresArcaneActivation: true,
    section: "common",
    group: "BRSW.Illumination",
    group_single: true,
    defaultChecked: {
      selector_type: "gm_action_enabled",
      selector_value: "3LPitchGm",
    },
  },
  {
    id: "UNSTABLEPLATFORM",
    name: "BRSW.UnstablePlatform",
    button_name: "BRSW.UnstablePlatform",
    skillMod: "-2",
    and_selector: [
      {
        or_selector: [
          { selector_type: "skill", selector_value: "Shooting" },
          {
            selector_type: "skill",
            selector_value: "Athletics",
          },
        ],
      },
      {
        not_selector: [
          {
            selector_type: "actor_has_edge",
            selector_value: "BRSW.EdgeName.SteadyHands",
          },
        ],
      },
    ],
    section: "common",
    group: "BRSW.SituationalModifiers",
    defaultChecked: {
      selector_type: "gm_action_enabled",
      selector_value: "UNSTABLEPLATFORMGM",
    },
  },
  {
    id: "RAN",
    name: "BRSW.Ran",
    button_name: "BRSW.Ran",
    skillMod: "-2",
    not_selector: [
      {
        selector_type: "actor_has_edge",
        selector_value: "BRSW.EdgeName.SteadyHands",
      },
    ],
    section: "common",
    group: "BRSW.SituationalModifiers",
  },
  {
    id: "2ACTIONS",
    name: "BRSW.Two-actions",
    button_name: "BRSW.Two-actions",
    skillMod: "-2",
    selector_type: "all",
    section: "common",
    group: "BRSW.Multi-action",
    group_single: true,
  },
  {
    id: "3ACTIONS",
    name: "BRSW.Three-actions",
    button_name: "BRSW.Three-actions",
    skillMod: "-4",
    selector_type: "all",
    section: "common",
    group: "BRSW.Multi-action",
    group_single: true,
  },
  {
    id: "GROUP_ROLL",
    name: "BRSW.GroupRoll",
    button_name: "BRSW.GroupRoll",
    add_wild_die: "true",
    selector_type: "is_wildcard",
    selector_value: "false",
    section: "common",
    group: "BRSW.SituationalModifiers",
  },
];
