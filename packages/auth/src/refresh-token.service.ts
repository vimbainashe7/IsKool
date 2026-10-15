import { createHash, randomBytes } from 'node:crypto';

export interface RefreshTokenMaterial {
  readonly token: string;
  readonly digest: string;
}

export class RefreshTokenService {
  generate(): RefreshTokenMaterial {
    const token = randomBytes(32).toString('base64url');
    return {
      token,
      digest: this.digest(token)
    };
  }

  digest(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }
}
