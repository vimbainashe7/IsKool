export interface PutObjectInput {
  body: Buffer | Uint8Array | string;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface PutObjectResult {
  key: string;
  bucket: string;
}

export interface ObjectStorage {
  putObject(input: PutObjectInput): Promise<PutObjectResult>;
  getObject(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
  createDownloadUrl(key: string, expiresInSeconds: number): Promise<string>;
}

export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');
