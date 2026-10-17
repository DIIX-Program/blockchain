import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AlertStatus, AlertSeverity, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, requireRoles } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { getPaginationParams, formatPaginatedResponse } from '../lib/pagination';
import { NotFoundError } from '../lib/errors';

export const alertRouter = Router();

const resolveAlertSchema = {
  body: z.object({
    resolutionNotes: z.string().min(5, 'Resolution notes must be at least 5 characters'),
  }),
};

/**
 * GET /api/v1/alerts
 * List anomaly alerts with filtering by batch, status, or severity
 */
alertRouter.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pagination = getPaginationParams(req);
      const batchId = req.query.batchId as string | undefined;
      const status = req.query.status as AlertStatus | undefined;
      const severity = req.query.severity as AlertSeverity | undefined;

      const where: any = {};
      if (batchId) where.batchId = batchId;
      if (status && Object.values(AlertStatus).includes(status)) where.status = status;
      if (severity && Object.values(AlertSeverity).includes(severity)) where.severity = severity;

      const [total, alerts] = await Promise.all([
        prisma.anomalyAlert.count({ where }),
        prisma.anomalyAlert.findMany({
          where,
          skip: pagination.skip,
          take: pagination.take,
          orderBy: { createdAt: 'desc' },
          include: {
            batch: { select: { batchNumber: true, status: true } },
            device: { select: { deviceCode: true } },
            acknowledgedByUser: { select: { fullName: true, role: true } },
            resolvedByUser: { select: { fullName: true, role: true } },
          },
        }),
      ]);

      res.json(formatPaginatedResponse(alerts, total, pagination));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/alerts/:id
 * Retrieve single alert details
 */
alertRouter.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alert = await prisma.anomalyAlert.findUnique({
        where: { id: req.params.id },
        include: {
          batch: {
            include: { product: true, currentHolder: true },
          },
          device: true,
          acknowledgedByUser: { select: { id: true, fullName: true, role: true, email: true } },
          resolvedByUser: { select: { id: true, fullName: true, role: true, email: true } },
        },
      });

      if (!alert) {
        throw new NotFoundError(`Alert with ID '${req.params.id}' not found`);
      }

      res.json({ alert });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/alerts/:id/acknowledge
 * Acknowledge an alert. Role: PRODUCER, TRANSPORTER, WAREHOUSE_OPERATOR, ADMIN.
 */
alertRouter.patch(
  '/:id/acknowledge',
  authenticate,
  requireRoles(
    UserRole.ADMIN,
    UserRole.PRODUCER,
    UserRole.TRANSPORTER,
    UserRole.WAREHOUSE_OPERATOR
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alert = await prisma.anomalyAlert.update({
        where: { id: req.params.id },
        data: {
          status: AlertStatus.ACKNOWLEDGED,
          acknowledgedBy: req.user!.id,
          acknowledgedAt: new Date(),
        },
      });

      res.json({
        message: 'Alert marked as acknowledged',
        alert,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/alerts/:id/resolve
 * Resolve an alert with resolution notes. Role: PRODUCER, WAREHOUSE_OPERATOR, ADMIN.
 */
alertRouter.patch(
  '/:id/resolve',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.PRODUCER, UserRole.WAREHOUSE_OPERATOR),
  validate(resolveAlertSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { resolutionNotes } = req.body;

      const alert = await prisma.anomalyAlert.update({
        where: { id: req.params.id },
        data: {
          status: AlertStatus.RESOLVED,
          resolvedBy: req.user!.id,
          resolvedAt: new Date(),
          resolutionNotes,
        },
      });

      res.json({
        message: 'Alert resolved successfully',
        alert,
      });
    } catch (error) {
      next(error);
    }
  }
);
