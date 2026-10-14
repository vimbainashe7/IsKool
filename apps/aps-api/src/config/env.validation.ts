import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').required(),
  ISKOOL_ENVIRONMENT: Joi.string().valid('development', 'staging', 'testing', 'production').optional(),
  SERVICE_NAME: Joi.string().min(2).required(),
  PORT: Joi.number().port().required(),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  REDIS_HOST: Joi.string().hostname().required(),
  REDIS_PORT: Joi.number().port().required(),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  JWT_ISSUER: Joi.string().required(),
  JWT_AUDIENCE: Joi.string().required(),
  JWT_SCOPE: Joi.string().valid('aps', 'sams').required(),
  JWT_PRIVATE_KEY_PEM: Joi.string().required(),
  JWT_PUBLIC_KEY_PEM: Joi.string().required(),
  JWT_KEY_ID: Joi.string().min(1).required(),
  JWT_ACCESS_TTL_SECONDS: Joi.number().integer().min(60).max(3600).required(),
  JWT_REFRESH_TTL_SECONDS: Joi.number().integer().min(3600).required(),
  AUTH_DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).optional(),
  SAMS_INTERNAL_BASE_URL: Joi.string().uri().required(),
  STORAGE_ENDPOINT: Joi.string().uri().required(),
  STORAGE_BUCKET: Joi.string().min(3).required(),
  STORAGE_REGION: Joi.string().required(),
  STORAGE_ACCESS_KEY: Joi.string().required(),
  STORAGE_SECRET_KEY: Joi.string().required(),
  STORAGE_FORCE_PATH_STYLE: Joi.boolean().truthy('true').falsy('false').required(),
  ALLOWED_ORIGINS: Joi.string().required(),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').required()
}).custom((value: Record<string, unknown>, helpers) => {
  if (value.NODE_ENV === 'production') {
    const weakStorageSecret = value.STORAGE_SECRET_KEY === 'minioadmin123';
    const emptyRedisPassword = value.REDIS_PASSWORD === '';
    if (weakStorageSecret || emptyRedisPassword) {
      return helpers.error('any.invalid', {
        message: 'Production configuration must not use local development secrets.'
      });
    }
  }
  return value;
});
