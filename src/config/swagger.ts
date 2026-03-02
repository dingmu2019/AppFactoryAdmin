import swaggerJsdoc from 'swagger-jsdoc';

// In Vercel/Production, source files may not exist or be accessible for scanning.
// We should avoid scanning in those environments to prevent startup crashes.
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AdminSys API Documentation',
      version: '1.0.0',
      description: 'API documentation for AdminSys Application',
    },
    servers: [
      {
        url: process.env.APP_URL || 'http://localhost:3000',
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/app/api/**/*.ts'], // Only include current App Router API paths
};

let spec;
try {
  spec = swaggerJsdoc(options);
} catch (error) {
  console.error('Failed to generate Swagger spec:', error);
  // Fallback to basic definition without paths if scanning fails
  spec = options.definition;
}

export const swaggerSpec = spec;
