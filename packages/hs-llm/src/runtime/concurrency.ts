export class Semaphore {
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly limit: number) {
    if (limit < 1 || !Number.isFinite(limit)) {
      throw new Error(`Semaphore limit must be a positive finite number; got ${limit}`);
    }
  }

  async acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active++;
      return;
    }
    await new Promise<void>((resolve) => {
      this.waiters.push(() => {
        this.active++;
        resolve();
      });
    });
  }

  release(): void {
    this.active--;
    const next = this.waiters.shift();
    if (next) next();
  }

  get inFlight(): number {
    return this.active;
  }
}
