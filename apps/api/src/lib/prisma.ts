import { PrismaClient } from '@prisma/client';

/**
 * Prisma client singleton.
 *
 * Reused across the Express app and tests to avoid opening multiple
 * database connections during a single process lifetime. In development
 * (with hot reload) we attach the client to the global object so that
 * file changes do not create a new PrismaClient on every reload.
 */
declare global {
  // allow global reuse in development (TS node / tsx watch)
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export { prisma };
