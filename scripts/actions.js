// Common actions stuff (item and global actions)

import { broofa } from "./utils.js";

export class brAction {
  constructor(name, code, type = "", idOverride = 0) {
    this.name = name;
    if (type === "item") {
      this.code = JSON.parse(JSON.stringify(code));
      this.code.id = broofa();
      this.convertCodeProperties();
    } else {
      this.code = code;
    }
    if (idOverride !== 0) {
      this.code.id = idOverride;
    }
    this.selected = false;
    // noinspection JSUnusedGlobalSymbols
    this.has_skill_mod = !!(this.code.skillMod || this.code.skillOverride);
    // noinspection JSUnusedGlobalSymbols
    this.has_damage_mod = !!(
      this.code.dmgMod ||
      this.code.dmgOverride ||
      this.code.overrideAp
    );
  }

  convertCodeProperties() {
    //SWADE stores its properties generically between trait and damage but BR2 needs them separate
    if (this.code.hasOwnProperty("modifier")) {
      if (this.code.type === "trait") {
        this.code.skillMod = this.code.modifier;
      } else if (this.code.type === "damage") {
        this.code.dmgMod = this.code.modifier;
      }
    }

    if (this.code.hasOwnProperty("override")) {
      if (this.code.type === "trait") {
        this.code.skillOverride = this.code.override;
      } else if (this.code.type === "damage") {
        this.code.dmgOverride = this.code.override;
      }
    }

    if (this.code.hasOwnProperty("ap")) {
      this.code.overrideAp = this.code.ap;
    }
  }
}
