import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config';
import { healthRouter } from './routes/health.routes';
import { authRouter } from './routes/auth.routes';
import { organizationRouter } from './routes/organization.routes';
import { userRouter } from './routes/user.routes';
import { productRouter } from './routes/product.routes';
import { batchRouter } from './routes/batch.routes';
import { eventRouter } from './routes/event.routes';
import { deviceRouter } from './routes/device.routes';
import { sensorRouter } from './routes/sensor.routes';
import { alertRouter } from './routes/alert.routes';
import { anchorRouter } from './routes/anchor.routes';
import { docsRouter } from './routes/docs.routes';
import { errorHandler } from './middlewares/errorHandler';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: [config.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'Smart Cold-Chain Traceability API',
      version: '1.0.0',
      docs: `${config.API_PREFIX}/docs`,
      health: `${config.API_PREFIX}/health`,
    });
  });

  // Health check routes
  app.use('/health', healthRouter);
  app.use(`${config.API_PREFIX}/health`, healthRouter);

  // API v1 Modules
  app.use(`${config.API_PREFIX}/auth`, authRouter);
  app.use(`${config.API_PREFIX}/organizations`, organizationRouter);
  app.use(`${config.API_PREFIX}/users`, userRouter);
  app.use(`${config.API_PREFIX}/products`, productRouter);
  app.use(`${config.API_PREFIX}/batches`, batchRouter);
  app.use(`${config.API_PREFIX}/events`, eventRouter);
  app.use(`${config.API_PREFIX}/devices`, deviceRouter);
  app.use(`${config.API_PREFIX}/sensors`, sensorRouter);
  app.use(`${config.API_PREFIX}/alerts`, alertRouter);
  app.use(`${config.API_PREFIX}/anchors`, anchorRouter);
  app.use(`${config.API_PREFIX}/docs`, docsRouter);

  // Global 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'NotFoundError',
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    });
  });

  // Global centralized error handler
  app.use(errorHandler);

  return app;
}
