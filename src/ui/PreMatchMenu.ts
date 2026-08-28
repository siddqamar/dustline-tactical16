import operativeSableUrl from '../assets/operative-sable.png';
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
      <div class="prematch-recon" aria-label="Relay Station 14 reconnaissance scan">
        <span>FIELD RECON // 14</span>
        <i></i>
      </div>
      <div class="prematch-operative" aria-hidden="true">
        <img src="${operativeSableUrl}" alt="" />
        <div class="operative-caption"><span>SABLE-1 // FIELD LEAD</span><small>RELAY STATION 14 // INSERTION READY</small></div>
      </div>
      <div class="prematch-panel">
        <p class="menu-eyebrow">FIELD COMMAND // OPERATION SABLE</p>
        <h1 id="operation-title">Relay Station 14</h1>
        <p class="menu-brief">Infiltrate the desert relay station, cache the intelligence package, and hold the relay through transmission. Move quietly or force a path through the compound.</p>
        <div class="menu-grid">
          <label class="menu-field">
            <span>Squad strength</span>
            <select data-team-size>
              ${TEAM_SIZES.map((size) => `<option value="${size}">${size} vs ${size}</option>`).join('')}
            </select>
            <small>You command one operative. AI fills every remaining slot.</small>
          </label>
          <label class="menu-field">
            <span>Guard doctrine</span>
            <select data-difficulty>
              ${Object.entries(BOT_DIFFICULTIES).map(([id, profile]) => `<option value="${id}">${profile.label}</option>`).join('')}
            </select>
            <small>Difficulty changes awareness, reaction, accuracy, and coordination.</small>
          </label>
        </div>
        <fieldset class="role-picker">
          <legend>Insertion assignment</legend>
          <button class="role-card is-selected" type="button" data-role="attackers">
            <span class="role-index">01</span>
            <strong>INFILTRATE</strong>
            <small>Enter the station, recover the package, and reach extraction.</small>
          </button>
          <button class="role-card" type="button" data-role="defenders">
            <span class="role-index">02</span>
            <strong>OVERWATCH</strong>
            <small>Secure the relay, sweep the compound, and stop the breach.</small>
          </button>
        </fieldset>
        <div class="menu-footer">
          <div><span>MISSION</span><strong>RELAY STATION 14 // CLASSIFIED</strong></div>
          <button class="menu-primary" type="button" data-start-operation>BEGIN INSERTION</button>
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
    this.teamSizeSelect.value = '3';
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
