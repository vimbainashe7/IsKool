import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../../../test/create-test-app';

describe('foundation API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('boots and serves liveness', async () => {
    await request(app.getHttpServer()).get('/api/v1/health/live').expect(200).expect(({ body }) => {
      expect(body.status).toBe('ok');
    });
  });

  it('serves machine-readable readiness', async () => {
    await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200).expect(({ body }) => {
      expect(['ok', 'degraded']).toContain(body.status);
      expect(body.dependencies).toBeDefined();
    });
  });

  it('returns the standard error envelope', async () => {
    await request(app.getHttpServer()).get('/api/v1/foundation/missing').expect(404).expect(({ body }) => {
      expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
      expect(body.error.status).toBe(404);
      expect(body.error.requestId).toBeDefined();
    });
  });

  it('rejects unknown fields', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/foundation/echo')
      .send({ message: 'hello', extra: 'nope' })
      .expect(400)
      .expect(({ body }) => {
        expect(body.error.code).toBe('BAD_REQUEST');
      });
  });

  it('propagates request IDs', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/foundation/echo')
      .set('x-request-id', 'test-request-id')
      .send({ message: 'hello' })
      .expect(201)
      .expect('x-request-id', 'test-request-id')
      .expect(({ body }) => {
        expect(body.requestId).toBe('test-request-id');
      });
  });
});
