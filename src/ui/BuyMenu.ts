import type { TeamRole } from '../match/MatchTypes';

export type BuyItemId = 'armor' | 'defuse-kit' | 'rifle';

export interface BuyItem {
  readonly id: BuyItemId;
  readonly label: string;
  readonly description: string;
  readonly cost: number;
  readonly category: 'equipment' | 'primary';
}

export interface BuyMenuState {
  readonly credits: number;
  readonly owned: ReadonlySet<BuyItemId>;
  readonly role: TeamRole;
  readonly secondsRemaining: number;
}

export const BUY_ITEMS: readonly BuyItem[] = [
  { id: 'armor', label: 'Composite armor', description: 'Reduces incoming ballistic damage.', cost: 650, category: 'equipment' },
  { id: 'defuse-kit', label: 'Defuse kit', description: 'Cuts device neutralization time in half.', cost: 400, category: 'equipment' },
  { id: 'rifle', label: 'AR-17 Field rifle', description: 'Reliable automatic rifle for compound lanes and open ground.', cost: 2700, category: 'primary' },
];

export class BuyMenu {
  public readonly element = document.createElement('section');

  private readonly creditsValue: HTMLElement;
  private readonly timerValue: HTMLElement;
  private readonly roleValue: HTMLElement;
  private readonly itemButtons: NodeListOf<HTMLButtonElement>;
  private state: BuyMenuState = { credits: 0, owned: new Set(), role: 'attackers', secondsRemaining: 0 };

  public constructor(onPurchase: (item: BuyItem) => void, onDeploy: () => void) {
    this.element.className = 'buy-menu';
    this.element.hidden = true;
    this.element.setAttribute('aria-labelledby', 'buy-title');
    this.element.innerHTML = `
      <div class="buy-panel">
        <header class="buy-header">
          <div><p>FIELD REQUISITIONS</p><h2 id="buy-title">Prepare kit</h2></div>
          <div class="buy-wallet"><span>AVAILABLE</span><strong data-buy-credits>$00000</strong></div>
        </header>
        <div class="buy-context"><span data-buy-role>BREACH LOADOUT</span><strong data-buy-timer>12</strong></div>
        <div class="buy-grid">
          ${BUY_ITEMS.map((item) => `
            <button class="buy-item" type="button" data-buy-item="${item.id}">
              <span class="buy-category">${item.category}</span>
              <strong>${item.label}</strong>
              <small>${item.description}</small>
              <b>$${item.cost.toLocaleString('en-US')}</b>
            </button>
          `).join('')}
        </div>
        <footer class="buy-footer">
          <span>Pistol and knife are issued at no cost.</span>
          <button class="menu-primary" type="button" data-deploy>CONFIRM KIT</button>
        </footer>
      </div>
    `;

    const creditsValue = this.element.querySelector<HTMLElement>('[data-buy-credits]');
    const timerValue = this.element.querySelector<HTMLElement>('[data-buy-timer]');
    const roleValue = this.element.querySelector<HTMLElement>('[data-buy-role]');
    const deployButton = this.element.querySelector<HTMLButtonElement>('[data-deploy]');
    if (!creditsValue || !timerValue || !roleValue || !deployButton) {
      throw new Error('Buy menu template is incomplete.');
    }

    this.creditsValue = creditsValue;
    this.timerValue = timerValue;
    this.roleValue = roleValue;
    this.itemButtons = this.element.querySelectorAll<HTMLButtonElement>('[data-buy-item]');
    this.itemButtons.forEach((button) => button.addEventListener('click', () => {
      const item = BUY_ITEMS.find((candidate) => candidate.id === button.dataset.buyItem);
      if (item) {
        onPurchase(item);
      }
    }));
    deployButton.addEventListener('click', onDeploy);
  }

  public show(state: BuyMenuState): void {
    this.element.hidden = false;
    this.render(state);
  }

  public hide(): void {
    this.element.hidden = true;
  }

  public render(state: BuyMenuState): void {
    this.state = state;
    this.creditsValue.textContent = `$${state.credits.toString().padStart(5, '0')}`;
    this.timerValue.textContent = Math.ceil(state.secondsRemaining).toString().padStart(2, '0');
    this.roleValue.textContent = state.role === 'attackers' ? 'INFILTRATION KIT' : 'OVERWATCH KIT';
    this.itemButtons.forEach((button) => {
      const item = BUY_ITEMS.find((candidate) => candidate.id === button.dataset.buyItem);
      if (!item) {
        return;
      }
      const owned = this.state.owned.has(item.id);
      const roleBlocked = item.id === 'defuse-kit' && this.state.role !== 'defenders';
      button.disabled = owned || roleBlocked || item.cost > this.state.credits;
      button.classList.toggle('is-owned', owned);
    });
  }
}
