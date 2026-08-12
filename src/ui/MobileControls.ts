export interface MobileControlHandlers {
  readonly onMove: (x: number, y: number) => void;
  readonly onLook: (deltaX: number, deltaY: number) => void;
  readonly onFire: (active: boolean) => void;
  readonly onAim: (active: boolean) => void;
  readonly onInteract: (active: boolean) => void;
  readonly onReload: () => void;
  readonly onWeapon: (index: number) => void;
}

export class MobileControls {
  public readonly element = document.createElement('div');
  public readonly isTouchDevice = window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window;

  private readonly handlers: MobileControlHandlers;
  private movePointerId: number | null = null;
  private lookPointerId: number | null = null;
  private lookX = 0;
  private lookY = 0;

  public constructor(handlers: MobileControlHandlers) {
    this.handlers = handlers;
    this.element.className = 'mobile-controls';
    this.element.hidden = !this.isTouchDevice;
    this.element.innerHTML = `
      <div class="mobile-look-zone" data-mobile-look aria-hidden="true"></div>
      <div class="mobile-stick" data-mobile-move>
        <span class="mobile-stick-ring"></span>
        <span class="mobile-stick-knob"></span>
      </div>
      <div class="mobile-actions">
        <button class="mobile-action mobile-action-fire" type="button" data-mobile-fire aria-label="Fire">FIRE</button>
        <button class="mobile-action mobile-action-aim" type="button" data-mobile-aim aria-label="Aim">AIM</button>
        <button class="mobile-action" type="button" data-mobile-interact aria-label="Interact">USE</button>
        <button class="mobile-action" type="button" data-mobile-reload aria-label="Reload">R</button>
      </div>
      <div class="mobile-weapon-bar" aria-label="Weapon selection">
        <button type="button" data-mobile-weapon="0" aria-label="Pistol">P</button>
        <button type="button" data-mobile-weapon="1" aria-label="Rifle">RIFLE</button>
        <button type="button" data-mobile-weapon="2" aria-label="Knife">K</button>
      </div>
    `;

    const moveZone = this.element.querySelector<HTMLElement>('[data-mobile-move]');
    const lookZone = this.element.querySelector<HTMLElement>('[data-mobile-look]');
    if (!moveZone || !lookZone) {
      throw new Error('Mobile control zones are missing.');
    }
    this.bindMove(moveZone);
    this.bindLook(lookZone);
    this.bindHold('[data-mobile-fire]', this.handlers.onFire);
    this.bindHold('[data-mobile-aim]', this.handlers.onAim);
    this.bindHold('[data-mobile-interact]', this.handlers.onInteract);
    this.element.querySelector<HTMLButtonElement>('[data-mobile-reload]')?.addEventListener('click', this.handlers.onReload);
    this.element.querySelectorAll<HTMLButtonElement>('[data-mobile-weapon]').forEach((button) => {
      button.addEventListener('click', () => this.handlers.onWeapon(Number(button.dataset.mobileWeapon)));
    });
  }

  public show(): void {
    if (this.isTouchDevice) {
      this.element.hidden = false;
    }
  }

  public hide(): void {
    this.element.hidden = true;
    this.resetInputs();
  }

  public dispose(): void {
    this.handlers.onMove(0, 0);
    this.handlers.onFire(false);
    this.handlers.onAim(false);
    this.handlers.onInteract(false);
    this.element.remove();
  }

  private bindMove(zone: HTMLElement): void {
    const knob = zone.querySelector<HTMLElement>('.mobile-stick-knob');
    zone.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.movePointerId = event.pointerId;
      zone.setPointerCapture(event.pointerId);
      this.updateMove(zone, knob, event.clientX, event.clientY);
    });
    zone.addEventListener('pointermove', (event) => {
      if (event.pointerId === this.movePointerId) {
        event.preventDefault();
        this.updateMove(zone, knob, event.clientX, event.clientY);
      }
    });
    const release = (event: PointerEvent): void => {
      if (event.pointerId !== this.movePointerId) {
        return;
      }
      this.movePointerId = null;
      this.handlers.onMove(0, 0);
      if (knob) {
        knob.style.transform = 'translate(-50%, -50%)';
      }
    };
    zone.addEventListener('pointerup', release);
    zone.addEventListener('pointercancel', release);
  }

  private bindLook(zone: HTMLElement): void {
    zone.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.lookPointerId = event.pointerId;
      this.lookX = event.clientX;
      this.lookY = event.clientY;
      zone.setPointerCapture(event.pointerId);
    });
    zone.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this.lookPointerId) {
        return;
      }
      event.preventDefault();
      this.handlers.onLook(event.clientX - this.lookX, event.clientY - this.lookY);
      this.lookX = event.clientX;
      this.lookY = event.clientY;
    });
    const release = (event: PointerEvent): void => {
      if (event.pointerId === this.lookPointerId) {
        this.lookPointerId = null;
      }
    };
    zone.addEventListener('pointerup', release);
    zone.addEventListener('pointercancel', release);
  }

  private bindHold(selector: string, handler: (active: boolean) => void): void {
    const button = this.element.querySelector<HTMLButtonElement>(selector);
    if (!button) {
      throw new Error(`Mobile control ${selector} is missing.`);
    }
    const release = (event: PointerEvent): void => {
      event.preventDefault();
      handler(false);
    };
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      handler(true);
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
  }

  private updateMove(zone: HTMLElement, knob: HTMLElement | null, clientX: number, clientY: number): void {
    const bounds = zone.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const radius = Math.min(bounds.width, bounds.height) * 0.36;
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const distance = Math.hypot(deltaX, deltaY);
    const scale = distance > radius ? radius / distance : 1;
    const x = (deltaX * scale) / radius;
    const y = (-deltaY * scale) / radius;
    this.handlers.onMove(x, y);
    if (knob) {
      knob.style.transform = `translate(calc(-50% + ${deltaX * scale}px), calc(-50% + ${deltaY * scale}px))`;
    }
  }

  private resetInputs(): void {
    this.movePointerId = null;
    this.lookPointerId = null;
    this.handlers.onMove(0, 0);
    this.handlers.onFire(false);
    this.handlers.onAim(false);
    this.handlers.onInteract(false);
  }
}
