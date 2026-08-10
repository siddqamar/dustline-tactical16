import { BOT_DIFFICULTIES, type BotDifficulty } from '../ai/BotDifficulty';
import { TEAM_SIZES, type MatchConfig, type TeamRole, type TeamSize } from '../match/MatchTypes';

export type MatchStartHandler = (config: MatchConfig) => void;

export class PreMatchMenu {
  public readonly element = document.createElement('section');

  private readonly difficultySelect: HTMLSelectElement;
  private readonly roleButtons: NodeListOf<HTMLButtonElement>;
  private readonly teamSizeSelect: HTMLSelectElement;
  private selectedRole: TeamRole = 'attackers';

  public constructor(onStart: MatchStartHandler, initialDifficulty: BotDifficulty) {
    this.element.className = 'prematch-menu';
    this.element.setAttribute('aria-labelledby', 'operation-title');
    this.element.innerHTML = `
      <div class="prematch-backdrop" aria-hidden="true"></div>
      <div class="prematch-panel">
        <p class="menu-eyebrow">DUSTLINE COMMAND // OPERATION SETUP</p>
        <h1 id="operation-title">Operation Glass Meridian</h1>
        <p class="menu-brief">Secure the industrial relay. Attackers arm the breach device at either marked site. Defenders hold the line or neutralize the device.</p>
        <div class="menu-grid">
          <label class="menu-field">
            <span>Squad strength</span>
            <select data-team-size>
              ${TEAM_SIZES.map((size) => `<option value="${size}">${size} vs ${size}</option>`).join('')}
            </select>
            <small>You command one operative. AI fills every remaining slot.</small>
          </label>
          <label class="menu-field">
            <span>Enemy doctrine</span>
            <select data-difficulty>
              ${Object.entries(BOT_DIFFICULTIES).map(([id, profile]) => `<option value="${id}">${profile.label}</option>`).join('')}
            </select>
            <small>Difficulty changes awareness, reaction, accuracy, and coordination.</small>
          </label>
        </div>
        <fieldset class="role-picker">
          <legend>Starting assignment</legend>
          <button class="role-card is-selected" type="button" data-role="attackers">
            <span class="role-index">01</span>
            <strong>BREACH</strong>
            <small>Carry the device, clear a site, plant, and hold.</small>
          </button>
          <button class="role-card" type="button" data-role="defenders">
            <span class="role-index">02</span>
            <strong>WARDEN</strong>
            <small>Read the attack, protect both sites, and defuse.</small>
          </button>
        </fieldset>
        <div class="menu-footer">
          <div><span>FORMAT</span><strong>FIRST TO 4 // SIDE SWITCH</strong></div>
          <button class="menu-primary" type="button" data-start-operation>START OPERATION</button>
        </div>
      </div>
    `;

    const teamSizeSelect = this.element.querySelector<HTMLSelectElement>('[data-team-size]');
    const difficultySelect = this.element.querySelector<HTMLSelectElement>('[data-difficulty]');
    const startButton = this.element.querySelector<HTMLButtonElement>('[data-start-operation]');
    if (!teamSizeSelect || !difficultySelect || !startButton) {
      throw new Error('Pre-match menu template is incomplete.');
    }

    this.teamSizeSelect = teamSizeSelect;
    this.difficultySelect = difficultySelect;
    this.difficultySelect.value = initialDifficulty;
    this.roleButtons = this.element.querySelectorAll<HTMLButtonElement>('[data-role]');
    this.roleButtons.forEach((button) => button.addEventListener('click', () => this.selectRole(button.dataset.role as TeamRole)));
    startButton.addEventListener('click', () => {
      onStart({
        teamSize: Number(this.teamSizeSelect.value) as TeamSize,
        difficulty: this.difficultySelect.value as BotDifficulty,
        startingRole: this.selectedRole,
        roundsToWin: 4,
      });
    });
  }

  public show(): void {
    this.element.hidden = false;
  }

  public hide(): void {
    this.element.hidden = true;
  }

  private selectRole(role: TeamRole): void {
    this.selectedRole = role;
    this.roleButtons.forEach((button) => button.classList.toggle('is-selected', button.dataset.role === role));
  }
}
