The **Better Rolls 2 for Savage Worlds** module has both pre-defined and custom Global Actions:

## Pre-defined Global Actions

<img src="https://github.com/ddbrown30/betteroll-swade/blob/version_2/docs/img/global-actions-menu.webp" width="500">

Global actions are pre-defined global actions that are ready to use. You can choose to disable them, if they should not
be available in your setting.

## Custom Global Actions


With the World global actions functionality, you can define your own global actions for this world. You need to provide
a JSON file to add them:

<img src="https://github.com/ddbrown30/betteroll-swade/blob/version_2/docs/img/world-global-actions.webp" width="500">

Global actions are a json encoded set of instructions that allow the user to customize how **Better Rolls** works.

### Example Action

```json
{
    "id": "LEG",
    "name": "Called Shot: Leg",
    "button_name": "Leg Remover",
    "skillMod": -4,
    "dmgMod": 4,
    "dmgOverride": "",
    "selector_type": "item_type",
    "selector_value": "weapon"
}
```

This piece of json will add an action called "Leg Remover" to every weapon card.
If this action is checked it will add a penalty of 4 to the skill roll and a bonus of 4 to the damage roll.

## Action Definition

### Required fields

* `id`: Any string, needs to be different for each action.
    * **NOTE**: The actions are displayed in order of id, so name appropriately. For example, the Cover actions are named 1-LightCover, 2-MediumCover, etc. to ensure they appear in a logical order.
* `name`: The name of the action.
* `button_name`: The name that will be displayed on the button in the actions menu of the chat card.

### Optional fields

* `skillMod`: A number to be used as a modifier to the related skill roll.
* `dmgMod`: A number that will be used as a modifier for damage roll.
* `dmgOverride`: A foundry die expression that will be rolled for damage instead of the weapon default.
* `defaultChecked`: If this key exists the action will start enabled.
    * It is also possible to use a selector as the value (see [selector_type](#selector_type) below). The defaultChecked value will match the result of that selector at the time the card is created.
* `runSkillMacro`: This key will run a macro named like its value after skill roll.
* `runDamageMacro`: This key will run a macro named like its value after damage roll.
* `raiseDamageFormula`: A string, specify here the formula used to add damage in the event of a raise. The default
  formula is "+1d6x", so any substitution should be done in a similar way, i.e. "+1d10x" to add a normal exploding d10.
* `wildDieFormula`: Another string dice formula, this time used for the Wild Die. Remember to specify the exploding. You
  can use an empty string for no wild die.
* `rerollSkillMod`: A number used as a modifier for skill reroll
* `rerollDamageMod`: A number used as a modifier for damage reroll
* `resourcesUsed`: A number that makes the action use that number of shots. If the item is a power and the values is a
  simple number it will make it use that number of PPs instead. If the value is a number preceded by a plus or minus
  symbol it will add or subtract that number from the usual PP cost of the power.
* `rof`: Number of trait dice rolled.
* `tnOverride`: A number that is set as the tn of the roll. Note that this takes precedence from other ways of setting
  the target number like targeting. This option accepts the special value "Parry", when it is present and there is a
  targeted token, it will set the TN of the roll to the Parry value of that token.
* `extra_text`: Extra text to be shown in the card, it accepts HTML.
* `overrideAp`: Override the Armor Penetration value of the item.
* `multiplyDmgMod`: Multiply the final damage by this number.
* `self_add_status`: Add that status to the token making the roll.
* `add_wild_die`: If true a wild die will be added to the roll even if it normally doesn't have one.
* `avoid_exploding_damage`: If this is set to "true" damage will not explode (like when attacking objects)

### Selector fields

This group of fields are used to select when the action is available, you will need to specify a `selector_type` and a `selector_value` for a simple selection. You can also use a [complex selector](#Complex Selectors). All selectors are evaluated when the card is created. This means that for target based selectors to work, you must already have selected the target.

#### selector_type

* `actor_additional_stat_xxx`: True if the actor has an additional stat named xxx and its value matches the comparison. Supports equality operators (e.g. `<`, `>`, `!=`, etc.).
* `actor_equips_item`: True is the actor has an item with the same name as the value equipped.
* `actor_has_ability`: True if the actor has an ability with the same name as the value.
* `actor_has_edge`: True if the actor has an edge with the same name as the value.
* `actor_has_effect`: True if the actor has an enabled Active Effect with the same name as the value.
* `actor_has_hindrance`: True if the actor has a hindrance with the same name as the value.
* `actor_has_item`: True if the actor has an item (Weapon, Armor, Shield, Gear, Consumable) with the same name as the value.
* `actor_has_joker`: True when the actor is in combat and has drawn a joker.
* `actor_has_major_hindrance`: True if the actor has a major hindrance with the same name as the value.
* `actor_has_skill`: True if the actor has a skill with the same name as the value.
* `actor_name`: True if the actor includes the value in its name.
* `actor_value`: True if the value on the actor matches the value in `selector_value`. `selector_value` must be composed of `"path=value"`, where path is a dot path of actor data (e.g. `system.advances.value`). Supports equality operators (e.g. `<`, `>`, `!=`, etc.).
* `all`: It will always show this action.
* `attribute`: True if rolling the matching attribute (e.g., strength, agility, spirit, smarts, vigor).
* `faction`: If `selector_value` is `same`, this will be true when a token from the same disposition as the actor is targeted. For any value other than `same`, it will be true if the dispositions are different.
* `gm_action`: A selector with this value will make the action appear in the GM modifiers above the char window.
* `is_weapon_or_bolt`: True if the item is either a weapon or the bolt power.
* `is_wildcard`: True if the actor is a Wildcard.
* `item_additional_stat_xxx`: True if the item has an additional stat named xxx and its value matches the comparison. Supports equality operators (e.g. `<`, `>`, `!=`, etc.).
* `item_description_includes`: True if the item's description, trappings, category, and/or notes includes the value.
* `item_has_damage`: True if the item or one of its actions has a damage value.
* `item_name`: True if the item includes the value in its name.
* `item_type`: True if the item type (weapon, power, edge, gear, etc.) includes the value in its name.
* `item_value`: True if the value on the item matches the value in `selector_value`. `selector_value` must be composed of `"path=value"`, where path is a dot path of actor data (e.g. `system.ap`). Supports equality operators (e.g. `<`, `>`, `!=`, etc.).
* `module_is_not_active`: True when the module with that identifier is not active. It is mainly to avoid automation duplication with other modules like the Core Rules.
* `range_less_than`: True when the range between the actor's token and the targeted token is less or equal than value.
* `skill`: True when the card uses a skill with that name.
* `target_has_edge`: True if the target has an edge with the same name as the value.
* `target_has_effect`: True if the target has an enabled Active Effect with the same name as the value.
* `target_has_hindrance`: True if the target has a hindrance with the same name as the value.
* `target_has_major_hindrance`: True if the target has a major hindrance with the same name as the value.
* `target_value`: True if the value on the target matches the value in `selector_value`. `selector_value` must be composed of `"path=value"`, where path is a dot path of actor data (e.g. `system.advances.value`). Supports equality operators (e.g. `<`, `>`, `!=`, etc.).

#### Complex Selectors

* `and_selector`: Takes a list of the above selectors and returns true if all are true.
* `or_selector`: Takes a list of selectors and returns true if at least one is true.
* `not_selector`: Takes a list of selectors and returns true if .

#### Example: Basic `and_selector` Selector

```json
"and_selector": [
    { "selector_type": "skill", "selector_value": "fighting" },
    { "selector_type": "actor", "selector_value": "John" }
]
```

#### Example: Nested Selectors

```json
"and_selector": [
    { "selector_type": "actor_has_edge", "selector_value": "BRSW.EdgeName.Assassin" },
    { "selector_type": "item_has_damage", "selector_value": "true" },
    {
        "not_selector": [
            {
                "or_selector": [
                    { "selector_type": "actor_has_edge", "selector_value": "BRSW.EdgeName.SneakAttack" },
                    { "selector_type": "actor_has_ability", "selector_value": "BRSW.EdgeName.SneakAttack" }
                ]
            }
        ]
    }
]
```

#### Grouping

This tag lets you group the actions.

* `group`: A string containing a group name, actions with the same name will be shown grouped in the card (in some
  future version)
* `group_single`: If all entries of a group have this option set to true the group will let you select only one of the
  options.
* `section`: Determines which section this action will appear. You can make your own or use the ones from BR2 (attack, character, common, power).

## Macros

The following variables are pre-populated in a macro run from global actions for macro writer convenience.
Note that all info is already stored in the message, all the others are just conveniences.

`actor`, `token`, `speaker`, `item`, `targets`

## API

You can define global actions within a module. To add actions, listen to the hook `brswReady` and call `game.brsw.add_actions`. If the id of an action matches one of the default actions in BR2, your action will replace it. See the example below.


```js
Hooks.once('brswReady', () => {
    const groupName = "Savage Pathfinder";

    const CUSTOM_BRSW_GLOBAL_ACTIONS = [{
        id: "DESPERATE_ATTACK-2",
        name: "Desperate Attack +2",
        button_name: "Desperate Attack +2",
        skillMod: 2,
        dmgMod: -2,
        dmgOverride: "",
        and_selector: [{
            selector_type: "skill",
            selector_value: "Fighting"
        },
            {
                selector_type: "item_type",
                selector_value: "weapon"
            }
        ],
        group: groupName
    },
        {
            id: "SNEAKATTACK",
            name: "Sneak Attack",
            button_name: "Sneak Attack",
            dmgMod: "+1d6x",
            and_selector: [
                {
                    selector_type: "actor_has_edge",
                    selector_value: "Rogue"
                },
                {
                    selector_type: "item_type",
                    selector_value: "weapon"
                }
            ],
            group: groupName
        }
    ];

    game.brsw.add_actions(CUSTOM_BRSW_GLOBAL_ACTIONS);
})
```

It's also recommended to add an option to your module settings to let the user turn on this feature, e.g., maybe the
user wants to use their own global actions.

```js
if (game.settings.get("yourModuleID", "TurnOnOrOffMyModuleGlobalActions")) {
    game.brsw.add_actions(CUSTOM_BRSW_GLOBAL_ACTIONS);
}
```

Module for Example: <https://github.com/brunocalado/savage-pathfinder-enhanced>

## Example Global Actions from Different Settings

### Table of contents

1. SWADE
    1. Basic modifiers and actions
    2. Edges
    3. Special Abilities
2. Fantasy Companion
    1. Edges
3. Pathfinder for Savage Worlds
    1. Attack Options
    2. Edges
4. Sprawlrunners
    1. Edges

### SWADE

Below are examples for the core rules of SWADE and may be applicable to most settings.

#### Basic modifiers and actions

These cover the most basic modifiers and combat actions in SWADE.


##### Off-Hand Attacks

```json
{
    "id": "OFFHAND ATTACKS",
    "name": "Off-Hand Attacks",
    "button_name": "Off-Hand Attacks",
    "skillMod": "-2",
    "selector_type": "item_type",
    "selector_value": "weapon",
    "group": "BRSW.SituationalModifiers"
}
```

##### Two Weapons

```json
{
    "id": "Two Weapons",
    "name": "Two Weapons",
    "button_name": "Two Weapons",
    "skillMod": "+1",
    "selector_type": "skill",
    "selector_value": "Fighting",
    "group": "BRSW.SituationalModifiers"
}
```

Here are examples for Special Abilities characters might have in SWADE.

##### Rollover (Alligator/Crocodile ability)

```json
{
    "id": "ROLLOVER-BONUS_DAMAGE",
    "name": "Raise!",
    "button_name": "Raise Damage (Rollover)",
    "dmgMod": "+d10",
    "and_selector": [
        {
            "selector_type": "actor_has_ability",
            "selector_value": "Rollover"
        },
        {
            "selector_type": "skill",
            "selector_value": "Fighting"
        }
    ],
    "group": "Special Abilities"
}
```

##### Pounce (Lion ability)

```json
{
    "id": "Pounce",
    "name": "Pounce",
    "button_name": "Pounce",
    "dmgMod": "+2",
    "and_selector": [
        { "selector_type": "actor_has_ability", "selector_value": "Pounce" },
        { "selector_type": "skill", "selector_value": "Fighting" }
    ],
    "section": "attack",
    "group": "BRSW.AttackOption"
}
```

### Fantasy Companion

Below is a list of actions for the Fantasy Companion for SWADE.

##### Savagery

```json
{
    "id": "Savagery",
    "name": "Savagery",
    "button_name": "Savagery",
    "dmgMod": "+2",
    "and_selector": [
        { "selector_type": "actor_has_edge", "selector_value": "Savagery" },
        { "selector_type": "skill", "selector_value": "Fighting" }
    ],
    "section": "attack",
    "group": "BRSW.Edges"
}
```

### Pathfinder for Savage Worlds

Below is a list of actions for the Savage Pathfinder setting. Some of the basic actions from SWADE (see above) are
applicable as well.

#### Edges in Pathfinder for Savage Worlds

These are examples enabled by learned Edges from Savage Pathfinder.

##### Monk Attack

```json
{
    "id": "MONKRAISE",
    "name": "Monk Attack",
    "button_name": "Monk",
    "defaultChecked": "on",
    "raiseDamageFormula": "+1d10x",
    "and_selector": [
        {
            "selector_type": "actor_has_edge",
            "selector_value": "Monk"
        },
        {
            "selector_type": "skill",
            "selector_value": "Fighting"
        }
    ],
    "group": "Savage Pathfinder"
}
```

##### Powerful Blow

```json
{
    "id": "POWERFULBLOW",
    "name": "Powerful Blow",
    "button_name": "Powerful Blow",
    "dmgMod": "+2",
    "and_selector": [
        {
            "selector_type": "actor_has_edge",
            "selector_value": "Powerful Blow"
        },
        {
            "selector_type": "skill",
            "selector_value": "Fighting"
        }
    ],
    "section": "character",
    "group": "BRSW.Edges"
}
```

##### Environmental Resistance

```json
{
    "id": "ENVIRONMENTALRESISTANCE",
    "name": "Environmental Resistance",
    "button_name": "Environmental Resistance",
    "dmgMod": "-4",
    "or_selector": [
        {
            "selector_type": "item_type",
            "selector_value": "weapon"
        },
        {
            "selector_type": "item_type",
            "selector_value": "power"
        }
    ],
    "group": "Savage Pathfinder"
}
```

##### Environmental Weakness

```json
{
    "id": "ENVIRONMENTALWEAKNESS",
    "name": "Environmental Weakness",
    "button_name": "Environmental Weakness",
    "dmgMod": "+4",
    "or_selector": [
        {
            "selector_type": "item_type",
            "selector_value": "weapon"
        },
        {
            "selector_type": "item_type",
            "selector_value": "power"
        }
    ],
    "group": "Savage Pathfinder"
}
```

### Sprawlrunners

These are examples common to the Sprawlrunners rules for Savage Worlds.

##### Passive Alarm

```json
{
    "id": "PASSIVEALARM",
    "name": "Passive Alarm",
    "button_name": "Passive Alarm",
    "skillMod": 1,
    "dmgMod": 1,
    "selector_type": "actor_has_edge",
    "selector_value": "Alarm",
    "group": "Sprawlrunners"
}
```

##### Active Alarm

```json
{
    "id": "ACTIVEALARM",
    "name": "Active Alarm",
    "button_name": "Active Alarm",
    "skillMod": 2,
    "dmgMod": 2,
    "selector_type": "actor_has_edge",
    "selector_value": "Alarm",
    "group": "Sprawlrunners"
}
```
