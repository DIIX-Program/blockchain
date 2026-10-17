import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AnchorStatus, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, requireRoles, optionalAuthenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { NotFoundError, BadRequestError } from '../lib/errors';
import { computeBatchCanonicalHash } from '../lib/canonical';
import {
  isEvmConfigured,
  anchorBatchToEvm,
  verifyBatchOnChain,
  type OnChainVerification,
} from '../lib/evm';

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
 * Calculate the RFC 8785 canonical hash for unanchored sensor readings and
 * create a DataAnchor. If the caller did not supply an on-chain tx, the anchor
 * is submitted to the EVM (ColdChainTracker) automatically when EVM config is
 * present; otherwise the anchor stays PENDING for an asynchronous worker.
 * Role: ADMIN, PRODUCER
 */
anchorRouter.post(
  '/',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.PRODUCER),
  validate(createAnchorSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { batchId } = req.body;
      const clientTxHash: string | null | undefined = req.body.txHash;
      const clientBlockNumber: number | null | undefined = req.body.blockNumber;

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

      // RFC 8785 canonical hash of the readings list (deterministic, cross-system)
      const canonicalHash = computeBatchCanonicalHash(readings);

      let txHash: string | null = clientTxHash || null;
      let blockNumber: number | null = clientBlockNumber || null;
      let status: AnchorStatus = txHash ? AnchorStatus.CONFIRMED : AnchorStatus.PENDING;
      let confirmedAt: Date | null = txHash ? new Date() : null;

      // Anchor to the EVM ourselves when the caller didn't supply a tx hash
      // and EVM configuration is available. Failures keep the anchor PENDING
      // so an asynchronous worker can retry later.
      if (!txHash && isEvmConfigured()) {
        try {
          const onChain = await anchorBatchToEvm(
            batchId,
            canonicalHash,
            readings.length,
            '1.0.0',
          );
          txHash = onChain.txHash;
          blockNumber = onChain.blockNumber;
          status = AnchorStatus.CONFIRMED;
          confirmedAt = new Date();
        } catch (evmErr) {
          // Keep PENDING; the on-chain verification endpoint will report UNAVAILABLE.
          console.error(`[anchor] EVM anchoring failed for batch ${batchId}:`, evmErr);
        }
      }

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
            status,
            confirmedAt,
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
 * Cryptographic integrity verification endpoint.
 *
 * Recomputes the local RFC 8785 canonical hash from the batch's stored readings
 * and compares it against the on-chain anchor (when EVM is configured).
 */
anchorRouter.get(
  '/verify/:batchId',
  optionalAuthenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { batchId } = req.params;

      const [batch, anchors, readings] = await Promise.all([
        prisma.batch.findUnique({
          where: { id: batchId },
          select: { id: true, batchNumber: true, status: true },
        }),
        prisma.dataAnchor.findMany({
          where: { batchId, status: AnchorStatus.CONFIRMED },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.sensorReading.findMany({
          where: { batchId },
          select: {
            batchId: true,
            deviceId: true,
            humidityPercent: true,
            latitude: true,
            longitude: true,
            recordedAt: true,
            sequenceNumber: true,
            temperatureC: true,
          },
          orderBy: [{ sequenceNumber: 'asc' }, { recordedAt: 'asc' }],
        }),
      ]);

      if (!batch) {
        throw new NotFoundError(`Batch with ID '${batchId}' not found`);
      }

      // On-chain verification (queries the EVM when configured)
      let onChain: OnChainVerification | null = null;
      if (readings.length > 0) {
        const localHash = computeBatchCanonicalHash(readings);
        onChain = await verifyBatchOnChain(batchId, localHash);
      } else {
        onChain = {
          status: 'PENDING',
          onChainHash: null,
          localHash: null,
          readingCount: 0,
          exists: false,
          error: 'No sensor readings to compute a local hash',
        };
      }

      const isVerified =
        anchors.length > 0 &&
        onChain.status === 'MATCH';

      res.json({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        isVerified,
        confirmedAnchorCount: anchors.length,
        localCanonicalHash: readings.length > 0 ? computeBatchCanonicalHash(readings) : null,
        onChain: onChain,
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
