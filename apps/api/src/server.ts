import { createApp } from './app';
import { config } from './config';

const app = createApp();

const server = app.listen(config.PORT, () => {
  console.log(`🚀 [API] Cold-Chain API Server running on http://localhost:${config.PORT}`);
  console.log(`📡 [API] Health endpoint: http://localhost:${config.PORT}/health`);
  console.log(`🌍 [API] Environment: ${config.NODE_ENV}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
