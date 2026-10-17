import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, requireRoles } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { getPaginationParams, formatPaginatedResponse } from '../lib/pagination';
import { NotFoundError, ConflictError } from '../lib/errors';

export const deviceRouter = Router();

const createDeviceSchema = {
  body: z.object({
    deviceCode: z.string().min(3).max(60),
    model: z.string().min(2).max(80),
    isSimulated: z.boolean().default(true),
    organizationId: z.string().uuid().optional().nullable(),
    batteryPercent: z.number().min(0).max(100).optional().nullable(),
  }),
};

/**
 * GET /api/v1/devices
 * List registered devices
 */
deviceRouter.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pagination = getPaginationParams(req);
      const isSimulated = req.query.isSimulated !== undefined ? req.query.isSimulated === 'true' : undefined;

      const where: any = {};
      if (isSimulated !== undefined) {
        where.isSimulated = isSimulated;
      }

      const [total, devices] = await Promise.all([
        prisma.device.count({ where }),
        prisma.device.findMany({
          where,
          skip: pagination.skip,
          take: pagination.take,
          orderBy: { createdAt: 'desc' },
          include: {
            organization: { select: { id: true, name: true, code: true } },
            _count: { select: { sensorReadings: true, alerts: true } },
          },
        }),
      ]);

      res.json(formatPaginatedResponse(devices, total, pagination));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/devices/:id
 * Retrieve single device details
 */
deviceRouter.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const device = await prisma.device.findUnique({
        where: { id: req.params.id },
        include: {
          organization: true,
          _count: { select: { sensorReadings: true, alerts: true } },
        },
      });

      if (!device) {
        throw new NotFoundError(`Device with ID '${req.params.id}' not found`);
      }

      res.json({ device });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/devices
 * Register a telemetry device. Role: ADMIN, PRODUCER, TRANSPORTER, WAREHOUSE_OPERATOR.
 */
deviceRouter.post(
  '/',
  authenticate,
  requireRoles(
    UserRole.ADMIN,
    UserRole.PRODUCER,
    UserRole.TRANSPORTER,
    UserRole.WAREHOUSE_OPERATOR
  ),
  validate(createDeviceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { deviceCode, model, isSimulated, organizationId, batteryPercent } = req.body;

      const existing = await prisma.device.findUnique({ where: { deviceCode } });
      if (existing) {
        throw new ConflictError(`Device with code '${deviceCode}' is already registered`);
      }

      const device = await prisma.device.create({
        data: {
          deviceCode,
          model,
          isSimulated: isSimulated !== undefined ? isSimulated : true,
          organizationId: organizationId || req.user?.organizationId,
          batteryPercent: batteryPercent !== undefined ? batteryPercent : null,
          lastSeenAt: new Date(),
        },
        include: {
          organization: { select: { id: true, name: true, code: true } },
        },
      });

      res.status(201).json({
        message: 'Device registered successfully',
        device,
      });
    } catch (error) {
      next(error);
    }
  }
);
