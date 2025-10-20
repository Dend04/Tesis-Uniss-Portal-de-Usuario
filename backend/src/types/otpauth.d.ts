// src/types/otpauth.d.ts
declare module 'otpauth' {
  export interface TOTPOptions {
    issuer: string;
    label: string;
    algorithm?: string;
    digits?: number;
    period?: number;
    secret: string;
  }

  export interface ValidateOptions {
    token: string;
    window?: number;
  }

  export class TOTP {
    constructor(options: TOTPOptions);
    validate(options: ValidateOptions): number | null;
    generate(): string;
  }
}