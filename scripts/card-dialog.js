// A dialog to select card actions

import { SettingsUtils } from "./utils.js";

export function setupDialog() {
  const dialogElement = document.createElement("dialog");
  dialogElement.setAttribute("id", "br-card-dialog");
  dialogElement.classList.add("brsw-dialog-bg");

  if (SettingsUtils.allowDarkMode()) {
    dialogElement.classList.add("brsw-allow-dark-mode");
  }

  document.body.insertAdjacentElement("beforeend", dialogElement);
  game.brsw.dialog = new BrCardDialog();
}

class BrCardDialog {
  constructor() {
    this.BrCard = null;
  }

  get dialogElement() {
    return document.getElementById("br-card-dialog");
  }

  show_card(brCard) {
    this.BrCard = brCard;
    this.render().catch((err) => {
      console.error("Error rendering dialog", err);
    });
    this.dialogElement.showModal();
  }

  async render() {
    const KNOWN_KEYS = ["character", "power", "common", "attack", "none"];
    const sections = { other: {} };
    for (const [key, section] of Object.entries(this.BrCard.action_sections)) {
      let targetSections = sections;
      if (!KNOWN_KEYS.includes(key)) {
        targetSections = sections.other;
      }
      targetSections[key] = [];
      for (let group of Object.values(section.action_groups)) {
        targetSections[key].push(group);
      }
      targetSections[key].sort((a, b) => {
        return a.name > b.name ? 1 : -1;
      });
    }
    this.dialogElement.innerHTML = await foundry.applications.handlebars.renderTemplate(
      "modules/betterrolls-swade2/templates/card_dialog.hbs",
      { BrCard: this.BrCard, sections },
    );
    this.bind_events();
  }

  bind_events() {
    for (const button of document.querySelectorAll(
      "#br-card-dialog .brsw-cancel",
    )) {
      button.addEventListener("click", this.close_card.bind(this));
    }
    for (const button of document.querySelectorAll(".brsw-action-button")) {
      button.addEventListener("click", this.action_button);
    }
    document
      .getElementById("brsw-save-button")
      .addEventListener("click", this.save_actions.bind(this));
    const roll_button = document.getElementById("brsw-dialog-roll");
    if (roll_button) {
      // Roll button is only present when the card has not been rolled
      roll_button.addEventListener("click", this.roll_button.bind(this));
    }
  }

  action_button(event) {
    if (event.currentTarget.parentElement.dataset.singleChoice) {
      for (const element of event.currentTarget.parentElement.getElementsByTagName(
        "span",
      )) {
        if (element !== event.currentTarget) {
          element.classList.remove("brsw-action-button-selected");
        }
      }
    }
    event.currentTarget.classList.toggle("brsw-action-button-selected");
  }

  close_card() {
    this.BrCard = null;
    this.dialogElement.innerHTML = "";
    this.dialogElement.close();
  }

  async save_actions() {
    const enabledActions = [];
    for (const button of document.querySelectorAll(
      ".brsw-action-button.brsw-action-button-selected",
    )) {
      enabledActions.push(button.dataset.actionId);
    }
    this.BrCard.setActiveActions(enabledActions);


    this.BrCard.refreshPPModsFromActions();

    await this.BrCard.render();
    await this.BrCard.save();
    this.close_card();
  }

  roll_button() {
    const card_id = `brc-${this.BrCard.id}`;
    this.save_actions()
      .then(() => {
        setTimeout(() => {
          // Hideous hack to avoid a race condition
          const card = document.getElementById(card_id).parentElement;
          const roll_button = card.querySelector(".brsw-roll-button");
          roll_button.click();
        }, 10);
      })
      .catch((err) => {
        console.error("Error saving actions", err);
      });
  }
}
