The **Better Rolls 2 for Savage Worlds** module has some additional functionality:

## Drag and Drop

You can also use the weapon or power icon to drag it over the actor you want to target. It will execute the "Show card and trait roll" action.

![Drag and Drop](https://github.com/ddbrown30/betteroll-swade/blob/version_2/docs/img/drag_and_drop_v-1-2-10.gif?raw=true)

For easier accessibility, instead of dragging the icon on an actor, you can also drag it to the macro bar, creating an automatic macro instead.

## Custom Bennies

The module comes with some custom bennies that can be found in the assets/bennies folder.

Currently, it ships with some classical roman and greek coins.

## Global actions

The module let's you define your own actions, see this [GLOBAL ACTIONS](https://github.com/ddbrown30/betteroll-swade/wiki/Global-Actions):

## Macros and API

The following information assumes a passing knowledge of both javascript and Foundry API. It's geared towards macro or module developers.

The module exposes an API in game.brsw.

```js
game.brsw.addActions(actions)
/**
 * Adds an array of actions to the available ones. The array should be in the same format as builtin-actions.js.
 * The array is cleared when reloading and should be set again
 * @param {Array} actions
 */
```

You can learn more about this at: [GLOBAL ACTIONS API](https://github.com/ddbrown30/betteroll-swade/wiki/Global-Actions#api).

```js
game.brsw.createAttributeCard()
/**
 * Creates a chat card for an attribute
 *
 * @param {Token, SwadeActor} origin  The actor or token owning the attribute
 * @param {string} name The name of the attribute like 'vigor'
 * @return {Promise} A promise for the BrCommonCard object
 */
```

```js
game.brsw.createAttributeCardFromId(token_id, actor_id, name)
/**
 * Creates an attribute card from a token or actor id
 *
 * @param {string} token_id A token id, if it can be solved it will be used
 *  before actor
 * @param {string} actor_id An actor id, it could be set as fallback or
 *  if you keep token empty as the only way to find the actor
 * @param {string} name Name of the attribute to roll, like 'vigor'
 * @return {Promise} a promise for the ChatMessage object
 */
 ```

```js
game.brsw.rollAttribute(brCard, expendBenny)
/**
 * Roll an attribute showing from an existing card
 *
 * @param {BrCommonCard} brCard The card being rolled
 * @param {boolean} expendBenny True if we want to spend a bennie
 */
```

```js
game.brsw.dialog
/*This exposes the full dialog class that is used to render and manage the
/* action dialog on cards. Please see the source code (card-dialog.js) for more
/* details.
*/
```

```js
game.brsw.getActionFromClick(event)
/**
/* Given a js event it checks the setting for the kind of action that should be done
/* i.e. show the card, show and roll, do a system roll, etc..
*/
```

```js
game.brsw.BrCommonCard
/**
/* This exposes the full BrCommonCard class. Please check the source code for details.
*/
```

```js
game.brsw.GLOBAL_ACTIONS
/**
/* This exposes an array with all the enabled global actions (world and builtin)
*/
```

```js
game.brsw.getRollOptions(old_options)
/**
 * Gets the roll options from the card html. Don't use, it is here just
 * for compatibility (to keep old macros from breaking). Use the brCommonCard
 * class, as it is much more powerful and clean.
 *
 * @param old_options - Options used as default
 */
```

```js
game.brsw.createIncapacitationCard(token_id)
/**
 * Shows an incapacitation card
 * @param {string} token_id As it comes from damage its target is always a token
 */
```

```js
game.brsw.createItemCard(origin, item_id)
/**
 * Creates a chat card for an item
 *
 * @param {Token, SwadeActor} origin  The actor or token owning the attribute
 * @param {string} item_id The id of the item that we want to show
 * @return {Promise} A promise for the BrCommonCard object
 */
```

```js
game.brsw.createItemCardFromId(token_id, actor_id, itemid)
/**
 * Creates an item card from a token or actor id, mainly for use in macros
 *
 * @param {string} token_id A token id, if it can be solved it will be used
 *  before actor
 * @param {string} actor_id An actor id, it could be set as fallback or
 *  if you keep token empty as the only way to find the actor
 * @param {string} item_id Id of the item
 * @return {Promise} a promise for the BrCommonCard object
 */
```

```js
game.brsw.rollItem(brCard, html, expendBenny, roll_damage)
/**
 * Roll an existing item card
 *
 * @param {BrCommonCard } brCard Message that originates this roll
 * @param {string} html Html code to parse for extra options
 * @param {boolean} expendBenny Whenever to expend a bennie
 * @param {boolean} roll_damage true if we want to auto-roll damage
 *
 * @return {Promise<void>}
 */
 ```

```js
game.brsw.createSkillCard(origin, skillId)
/**
 * Creates a chat card for a skill
 *
 * @param {Token, SwadeActor} origin  The actor or token owning the attribute
 * @param {string} skillId The id of the skill that we want to show
 * @return {Promise} A promise for the ChatMessage object
 */
 ```

```js
game.brsw.createSkillCardFromId(token_id, actor_id, skillId)
/**
 * Creates a skill card from a token or actor id, mainly for use in macros
 *
 * @param {string} token_id A token id, if it can be solved it will be used
 *  before actor
 * @param {string} actor_id An actor id, it could be set as fallback or
 *  if you keep token empty as the only way to find the actor
 * @param {string} skillId Id of the skill item
 * @return {Promise} a promise for the BrCommonCard object
 */
 ```

```js
 game.brsw.rollSkill(brCard, expendBenny)
 /**
 * Roll an existing skill card
 *
 * @param {BrCommonCard} brCard
 * @param {boolean} expendBenny True if we want to spend a bennie
 */
```

If this document gets outdated you can always inspect `game.brsw` in your browser to get the most current API.

