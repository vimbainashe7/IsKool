import argon2 from 'argon2';

export interface PasswordHashOptions {
  readonly memoryCost: number;
  readonly timeCost: number;
  readonly parallelism: number;
}

export const productionPasswordHashOptions: PasswordHashOptions = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1
};

export const testPasswordHashOptions: PasswordHashOptions = {
  memoryCost: 4096,
  timeCost: 2,
  parallelism: 1
};

export class PasswordService {
  constructor(private readonly options: PasswordHashOptions = productionPasswordHashOptions) {}

  hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: this.options.memoryCost,
      timeCost: this.options.timeCost,
      parallelism: this.options.parallelism
    });
  }

  verify(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }
}
