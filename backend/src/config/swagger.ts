import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AdminSys SaaS API',
      version: '1.0.0',
      description: 'Standard SaaS Onboarding API for external integrations.',
      contact: {
        name: 'API Support',
        email: 'support@adminsys.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Local Development Server',
      },
      {
        url: 'https://api.adminsys.com/api/v1',
        description: 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-app-key',
          description: 'App Key provided in Admin Console',
        },
        Timestamp: {
          type: 'apiKey',
          in: 'header',
          name: 'x-timestamp',
          description: 'Current timestamp (ms)',
        },
        Nonce: {
          type: 'apiKey',
          in: 'header',
          name: 'x-nonce',
          description: 'Random string to prevent replay attacks',
        },
        Signature: {
          type: 'apiKey',
          in: 'header',
          name: 'x-signature',
          description: 'HMAC-SHA256 signature',
        },
      },
      responses: {
        Unauthorized: {
          description: 'Unauthorized access',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: { type: 'string', example: 'AUTH_FAILED' },
                  message: { type: 'string', example: 'Invalid signature' },
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        ApiKeyAuth: [],
        Timestamp: [],
        Nonce: [],
        Signature: [],
      },
    ],
  },
  // Path to the API docs
  apis: ['./src/api/v1/*.ts', './src/api/admin/*.ts', './src/api/**/*.ts'], 
};

export const swaggerSpec = swaggerJsdoc(options);
