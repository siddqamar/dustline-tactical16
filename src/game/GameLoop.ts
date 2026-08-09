export type FrameCallback = (deltaSeconds: number, elapsedSeconds: number) => void;

export class GameLoop {
  private animationFrame = 0;
  private elapsedSeconds = 0;
  private lastTime = 0;
  private running = false;

  public constructor(private readonly onFrame: FrameCallback) {}

  public start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.lastTime = performance.now();
    this.animationFrame = requestAnimationFrame(this.tick);
  }

  public stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;
    cancelAnimationFrame(this.animationFrame);
  }

  private readonly tick = (time: number): void => {
    if (!this.running) {
      return;
    }

    const deltaSeconds = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    this.elapsedSeconds += deltaSeconds;
    this.onFrame(deltaSeconds, this.elapsedSeconds);
    this.animationFrame = requestAnimationFrame(this.tick);
  };
}

