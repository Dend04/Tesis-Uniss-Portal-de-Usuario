declare module 'rate-limiter-flexible' {
    export class RateLimiterMemory {
      constructor(opts: { points: number; duration: number });
      consume(key: string): Promise<void>;
    }
  }