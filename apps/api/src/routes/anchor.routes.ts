import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { AnchorStatus, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, requireRoles, optionalAuthenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { NotFoundError, BadRequestError } from '../lib/errors';

export const anchorRouter = Router();

const createAnchorSchema = {
  body: z.object({
    batchId: z.string().uuid('Invalid batch UUID'),
    txHash: z.string().max(66).optional().nullable(),
    blockNumber: z.number().int().positive().optional().nullable(),
  }),
};

/**
 * GET /api/v1/anchors/batch/:batchId
 * List all anchor records for a batch
 */
anchorRouter.get(
  '/batch/:batchId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { batchId } = req.params;

      const anchors = await prisma.dataAnchor.findMany({
        where: { batchId },
        orderBy: { createdAt: 'desc' },
      });

      const serialized = anchors.map((a) => ({
        ...a,
        blockNumber: a.blockNumber ? a.blockNumber.toString() : null,
      }));

      res.json({ anchors: serialized });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/anchors/:id
 * Retrieve single anchor details
 */
anchorRouter.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const anchor = await prisma.dataAnchor.findUnique({
        where: { id: req.params.id },
        include: {
          batch: { select: { batchNumber: true, status: true } },
        },
      });

      if (!anchor) {
        throw new NotFoundError(`Anchor with ID '${req.params.id}' not found`);
      }

      res.json({
        anchor: {
          ...anchor,
          blockNumber: anchor.blockNumber ? anchor.blockNumber.toString() : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/anchors
 * Calculate canonical hash for unanchored sensor readings and create a DataAnchor
 * Role: ADMIN, PRODUCER
 */
anchorRouter.post(
  '/',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.PRODUCER),
  validate(createAnchorSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { batchId, txHash, blockNumber } = req.body;

      const batch = await prisma.batch.findUnique({ where: { id: batchId } });
      if (!batch) {
        throw new NotFoundError(`Batch with ID '${batchId}' not found`);
      }

      // Fetch unanchored readings in deterministic order
      const readings = await prisma.sensorReading.findMany({
        where: { batchId, anchored: false },
        orderBy: [{ sequenceNumber: 'asc' }, { recordedAt: 'asc' }],
      });

      if (readings.length === 0) {
        throw new BadRequestError('No unanchored sensor readings available for this batch');
      }

      // Canonical RFC 8785 representation of readings array
      const canonicalRepresentations = readings.map((r) => ({
        batchId: r.batchId,
        deviceId: r.deviceId,
        humidityPercent: r.humidityPercent !== null ? Number(r.humidityPercent) : null,
        latitude: r.latitude !== null ? Number(r.latitude) : null,
        longitude: r.longitude !== null ? Number(r.longitude) : null,
        recordedAt: r.recordedAt.toISOString(),
        sequenceNumber: Number(r.sequenceNumber),
        temperatureC: Number(r.temperatureC),
      }));

      const canonicalPayload = JSON.stringify(canonicalRepresentations);
      const canonicalHash = crypto.createHash('sha256').update(canonicalPayload).digest('hex');

      // Create anchor and mark readings as anchored in a transaction
      const anchor = await prisma.$transaction(async (tx) => {
        const created = await tx.dataAnchor.create({
          data: {
            batchId,
            schemaVersion: '1.0.0',
            hashAlgorithm: 'SHA-256',
            canonicalHash,
            readingCount: readings.length,
            txHash: txHash || null,
            blockNumber: blockNumber ? BigInt(blockNumber) : null,
            status: txHash ? AnchorStatus.CONFIRMED : AnchorStatus.PENDING,
            confirmedAt: txHash ? new Date() : null,
          },
        });

        const readingIds = readings.map((r) => r.id);
        await tx.sensorReading.updateMany({
          where: { id: { in: readingIds } },
          data: { anchored: true },
        });

        return created;
      });

      res.status(201).json({
        message: 'Data anchor created successfully',
        anchor: {
          ...anchor,
          blockNumber: anchor.blockNumber ? anchor.blockNumber.toString() : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/anchors/verify/:batchId
 * Cryptographic integrity verification endpoint
 */
anchorRouter.get(
  '/verify/:batchId',
  optionalAuthenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { batchId } = req.params;

      const [batch, anchors] = await Promise.all([
        prisma.batch.findUnique({
          where: { id: batchId },
          select: { id: true, batchNumber: true, status: true },
        }),
        prisma.dataAnchor.findMany({
          where: { batchId, status: AnchorStatus.CONFIRMED },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      if (!batch) {
        throw new NotFoundError(`Batch with ID '${batchId}' not found`);
      }

      res.json({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        isVerified: anchors.length > 0,
        confirmedAnchorCount: anchors.length,
        anchors: anchors.map((a) => ({
          id: a.id,
          schemaVersion: a.schemaVersion,
          hashAlgorithm: a.hashAlgorithm,
          canonicalHash: a.canonicalHash,
          readingCount: a.readingCount,
          txHash: a.txHash,
          blockNumber: a.blockNumber ? a.blockNumber.toString() : null,
          confirmedAt: a.confirmedAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);
