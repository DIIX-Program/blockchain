import { Router, Request, Response } from 'express';

export const docsRouter = Router();

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Smart Cold-Chain Traceability REST API',
    version: '1.0.0',
    description:
      'Enterprise cold-chain traceability platform integrating IoT telemetry, AI anomaly detection, and Hardhat EVM blockchain anchors.',
    contact: {
      name: 'Cold-Chain Engineering Team',
      email: 'engineering@coldchain.internal',
    },
  },
  servers: [
    {
      url: 'http://localhost:4000/api/v1',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token obtained from /auth/login',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          fullName: { type: 'string' },
          role: {
            type: 'string',
            enum: ['ADMIN', 'PRODUCER', 'TRANSPORTER', 'WAREHOUSE_OPERATOR', 'VIEWER'],
          },
          organizationId: { type: 'string', format: 'uuid', nullable: true },
          isActive: { type: 'boolean' },
        },
      },
      Organization: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          code: { type: 'string' },
          type: {
            type: 'string',
            enum: ['PRODUCER', 'LOGISTICS_PROVIDER', 'WAREHOUSE', 'RETAILER', 'REGULATOR'],
          },
          address: { type: 'string', nullable: true },
          contactEmail: { type: 'string', format: 'email' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          sku: { type: 'string' },
          name: { type: 'string' },
          tempMinC: { type: 'number' },
          tempMaxC: { type: 'number' },
          humidityMin: { type: 'number', nullable: true },
          humidityMax: { type: 'number', nullable: true },
          maxTransitHours: { type: 'integer', nullable: true },
        },
      },
      Batch: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          batchNumber: { type: 'string' },
          status: {
            type: 'string',
            enum: ['CREATED', 'IN_TRANSIT', 'STORED', 'DELIVERED', 'REJECTED'],
          },
          manufactureDate: { type: 'string', format: 'date-time' },
          expiryDate: { type: 'string', format: 'date-time' },
          quantity: { type: 'integer' },
          qrCodeUrl: { type: 'string', nullable: true },
        },
      },
      SensorReading: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          batchId: { type: 'string', format: 'uuid' },
          deviceId: { type: 'string', format: 'uuid' },
          sequenceNumber: { type: 'string' },
          recordedAt: { type: 'string', format: 'date-time' },
          temperatureC: { type: 'number' },
          humidityPercent: { type: 'number', nullable: true },
          latitude: { type: 'number', nullable: true },
          longitude: { type: 'number', nullable: true },
          isSimulated: { type: 'boolean' },
          canonicalHash: { type: 'string', nullable: true },
          anchored: { type: 'boolean' },
        },
      },
      AnomalyAlert: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          batchId: { type: 'string', format: 'uuid' },
          detectionMethod: { type: 'string', enum: ['RULE_BASED', 'ML_MODEL', 'HYBRID'] },
          severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
          anomalyScore: { type: 'number', nullable: true },
          ruleViolated: { type: 'string', nullable: true },
          explanation: { type: 'string' },
          status: { type: 'string', enum: ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'] },
        },
      },
      DataAnchor: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          batchId: { type: 'string', format: 'uuid' },
          schemaVersion: { type: 'string' },
          hashAlgorithm: { type: 'string' },
          canonicalHash: { type: 'string' },
          readingCount: { type: 'integer' },
          txHash: { type: 'string', nullable: true },
          blockNumber: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'FAILED'] },
          confirmedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          details: { type: 'array', items: { type: 'object' } },
        },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register a new user',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'fullName'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  fullName: { type: 'string' },
                  role: { type: 'string', enum: ['ADMIN', 'PRODUCER', 'TRANSPORTER', 'WAREHOUSE_OPERATOR', 'VIEWER'] },
                  organizationId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User registered successfully' },
          400: { description: 'Validation error' },
          409: { description: 'Email already exists' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Login with credentials and receive JWT access token',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authenticated successfully with token' },
          401: { description: 'Invalid email or password' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get current user profile',
        tags: ['Authentication'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Current user profile' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/batches/public/{batchNumber}': {
      get: {
        summary: 'Public QR Code Traceability Verification Portal',
        tags: ['Batches (Public)'],
        description: 'Zero-login public traceability route showing product journey, thermal compliance, alerts, and blockchain commitments.',
        parameters: [
          { name: 'batchNumber', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Public batch journey and verification status' },
          404: { description: 'Batch not found' },
        },
      },
    },
    '/batches': {
      get: {
        summary: 'List batches with filtering and pagination',
        tags: ['Batches'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Paginated list of batches' },
          401: { description: 'Unauthorized' },
        },
      },
      post: {
        summary: 'Create a new traceability batch',
        tags: ['Batches'],
        security: [{ BearerAuth: [] }],
        description: 'Role required: PRODUCER or ADMIN',
        responses: {
          201: { description: 'Batch created' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/sensors/telemetry': {
      post: {
        summary: 'Ingest IoT Sensor Telemetry Packet',
        tags: ['Sensors & IoT'],
        description: 'Receives periodic telemetry with built-in idempotency protection.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['batchId', 'deviceId', 'sequenceNumber', 'recordedAt', 'temperatureC'],
                properties: {
                  batchId: { type: 'string', format: 'uuid' },
                  deviceId: { type: 'string', format: 'uuid' },
                  sequenceNumber: { type: 'integer' },
                  recordedAt: { type: 'string', format: 'date-time' },
                  temperatureC: { type: 'number' },
                  humidityPercent: { type: 'number' },
                  latitude: { type: 'number' },
                  longitude: { type: 'number' },
                  isSimulated: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Telemetry packet ingested' },
          200: { description: 'Duplicate packet ignored idempotently' },
        },
      },
    },
    '/events': {
      post: {
        summary: 'Record a Supply Chain Handover / Checkpoint Milestone',
        tags: ['Supply Chain Events'],
        security: [{ BearerAuth: [] }],
        description: 'Role: PRODUCER, TRANSPORTER, WAREHOUSE_OPERATOR, ADMIN. Atomically updates custody in a database transaction.',
        responses: {
          201: { description: 'Event logged and custody updated' },
        },
      },
    },
    '/alerts': {
      get: {
        summary: 'List anomaly alerts',
        tags: ['AI Anomaly Alerts'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'List of alerts' },
        },
      },
    },
    '/anchors/verify/{batchId}': {
      get: {
        summary: 'Verify cryptographic integrity of batch against on-chain anchor',
        tags: ['Blockchain Anchors'],
        parameters: [
          { name: 'batchId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Verification proof and integrity result' },
        },
      },
    },
  },
};

docsRouter.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(openApiSpec);
});

docsRouter.get('/', (_req: Request, res: Response) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Smart Cold-Chain API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; background-color: #fafafa; }
    .topbar { display: none !important; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/api/v1/docs/openapi.json',
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout",
        deepLinking: true
      });
    };
  </script>
</body>
</html>
  `);
});
