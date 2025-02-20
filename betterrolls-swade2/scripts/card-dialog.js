// A dialog to manage br cards
/* global game, console, renderTemplate */

export function setup_dialog() {
  const dialog_element = document.createElement("dialog");
  dialog_element.setAttribute("id", "br-card-dialog");
  dialog_element.classList.add("twbr:bg-gray-700");
  document.body.insertAdjacentElement("beforeend", dialog_element);
  game.brsw.dialog = new BrCardDialog();
}

class BrCardDialog {
  constructor() {
    this.BrCard = null;
  }

  get dialog_element() {
    return document.getElementById("br-card-dialog");
  }

  show_card(br_card) {
    this.BrCard = br_card;
    this.render().catch((err) => {
      console.error("Error rendering dialog", err);
    });
    this.dialog_element.showModal();
  }

  async render() {
    this.dialog_element.innerHTML = await renderTemplate(
      "modules/betterrolls-swade2/templates/card_dialog.html",
      { BrCard: this.BrCard },
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
          element.classList.remove("twbr:bg-red-700");
        }
      }
    }
    event.currentTarget.classList.toggle("twbr:bg-red-700");
  }

  close_card() {
    this.BrCard = null;
    this.dialog_element.inner_html = "";
    this.dialog_element.close();
  }

  async save_actions() {
    const enabled_actions = [];
    for (const button of document.querySelectorAll(
      ".brsw-action-button.twbr\\:bg-red-700",
    )) {
      enabled_actions.push(button.dataset.actionId);
    }
    this.BrCard.set_active_actions(enabled_actions);
    this.BrCard.set_trait_using_skill_override();

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
