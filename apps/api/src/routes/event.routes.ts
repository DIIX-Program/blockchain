import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { EventType, UserRole, BatchStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, requireRoles } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { NotFoundError } from '../lib/errors';

export const eventRouter = Router();

const createEventSchema = {
  body: z.object({
    batchId: z.string().uuid('Invalid batch UUID'),
    eventType: z.nativeEnum(EventType),
    fromOrgId: z.string().uuid().optional().nullable(),
    toOrgId: z.string().uuid().optional().nullable(),
    locationName: z.string().min(2).max(150),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    notes: z.string().optional().nullable(),
    txHash: z.string().max(66).optional().nullable(),
  }),
};

/**
 * POST /api/v1/events
 * Record a supply chain event or custody handover.
 * Uses a Prisma transaction when custody changes to atomically update Batch holder/status.
 */
eventRouter.post(
  '/',
  authenticate,
  requireRoles(
    UserRole.ADMIN,
    UserRole.PRODUCER,
    UserRole.TRANSPORTER,
    UserRole.WAREHOUSE_OPERATOR
  ),
  validate(createEventSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        batchId,
        eventType,
        fromOrgId,
        toOrgId,
        locationName,
        latitude,
        longitude,
        notes,
        txHash,
      } = req.body;

      const batch = await prisma.batch.findUnique({ where: { id: batchId } });
      if (!batch) {
        throw new NotFoundError(`Batch with ID '${batchId}' not found`);
      }

      // Execute in a transaction if this changes custody or batch status
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create event
        const event = await tx.supplyChainEvent.create({
          data: {
            batchId,
            eventType,
            actorId: req.user!.id,
            fromOrgId: fromOrgId || batch.currentHolderId,
            toOrgId: toOrgId || null,
            locationName,
            latitude: latitude !== undefined ? latitude : null,
            longitude: longitude !== undefined ? longitude : null,
            notes,
            txHash,
          },
          include: {
            actor: { select: { id: true, fullName: true, role: true } },
            fromOrg: { select: { id: true, name: true, code: true } },
            toOrg: { select: { id: true, name: true, code: true } },
          },
        });

        // 2. If custody handover or delivery, update batch state
        if (eventType === EventType.CUSTODY_HANDOVER && toOrgId) {
          await tx.batch.update({
            where: { id: batchId },
            data: {
              currentHolderId: toOrgId,
              status: BatchStatus.IN_TRANSIT,
            },
          });
        } else if (eventType === EventType.WAREHOUSE_RECEIVE && toOrgId) {
          await tx.batch.update({
            where: { id: batchId },
            data: {
              currentHolderId: toOrgId,
              status: BatchStatus.STORED,
            },
          });
        } else if (eventType === EventType.FINAL_DELIVERY) {
          await tx.batch.update({
            where: { id: batchId },
            data: {
              status: BatchStatus.DELIVERED,
              currentHolderId: toOrgId || batch.currentHolderId,
            },
          });
        }

        return event;
      });

      res.status(201).json({
        message: `Supply chain event '${eventType}' recorded successfully`,
        event: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/events/batch/:batchId
 * Retrieve chronological timeline events for a given batch
 */
eventRouter.get(
  '/batch/:batchId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { batchId } = req.params;

      const events = await prisma.supplyChainEvent.findMany({
        where: { batchId },
        orderBy: { createdAt: 'asc' },
        include: {
          actor: { select: { id: true, fullName: true, role: true } },
          fromOrg: { select: { name: true, code: true } },
          toOrg: { select: { name: true, code: true } },
        },
      });

      res.json({ events });
    } catch (error) {
      next(error);
    }
  }
);
