import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config';
import { healthRouter } from './routes/health.routes';

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

  // Global 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    });
  });

  // Global error handler
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled API Error:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: config.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    });
  });

  return app;
}
