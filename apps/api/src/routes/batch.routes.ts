import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BatchStatus, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, requireRoles, optionalAuthenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { getPaginationParams, formatPaginatedResponse } from '../lib/pagination';
import { NotFoundError, BadRequestError, ConflictError } from '../lib/errors';

export const batchRouter = Router();

const createBatchSchema = {
  body: z.object({
    batchNumber: z.string().min(3).max(64),
    productId: z.string().uuid('Invalid product UUID'),
    producerId: z.string().uuid('Invalid producer organization UUID').optional(),
    currentHolderId: z.string().uuid('Invalid holder organization UUID').optional(),
    manufactureDate: z.string().datetime(),
    expiryDate: z.string().datetime(),
    quantity: z.number().int().positive('Quantity must be greater than 0'),
    qrCodeUrl: z.string().url().optional().nullable(),
  }),
};

const updateStatusSchema = {
  body: z.object({
    status: z.nativeEnum(BatchStatus),
  }),
};

/**
 * GET /api/v1/batches/public/:batchNumber
 * PUBLIC TRACEABILITY ENDPOINT — No Authentication Required
 * Returns the public cold-chain journey, compliance metrics, and cryptographic anchor.
 */
batchRouter.get(
  '/public/:batchNumber',
  optionalAuthenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { batchNumber } = req.params;

      const batch = await prisma.batch.findUnique({
        where: { batchNumber },
        include: {
          product: {
            select: {
              sku: true,
              name: true,
              description: true,
              tempMinC: true,
              tempMaxC: true,
              humidityMin: true,
              humidityMax: true,
            },
          },
          producer: {
            select: { name: true, code: true, type: true },
          },
          currentHolder: {
            select: { name: true, code: true, type: true },
          },
          events: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              eventType: true,
              locationName: true,
              latitude: true,
              longitude: true,
              notes: true,
              txHash: true,
              createdAt: true,
              fromOrg: { select: { name: true, code: true } },
              toOrg: { select: { name: true, code: true } },
            },
          },
          anchors: {
            orderBy: { createdAt: 'desc' },
            select: {
              schemaVersion: true,
              hashAlgorithm: true,
              canonicalHash: true,
              merkleRoot: true,
              readingCount: true,
              txHash: true,
              blockNumber: true,
              status: true,
              confirmedAt: true,
            },
          },
          alerts: {
            select: {
              severity: true,
              ruleViolated: true,
              explanation: true,
              status: true,
              createdAt: true,
            },
          },
          _count: {
            select: { sensorReadings: true },
          },
        },
      });

      if (!batch) {
        throw new NotFoundError(`Batch '${batchNumber}' was not found in the traceability registry`);
      }

      // Latest reading snapshot
      const latestReading = await prisma.sensorReading.findFirst({
        where: { batchId: batch.id },
        orderBy: { recordedAt: 'desc' },
        select: {
          temperatureC: true,
          humidityPercent: true,
          recordedAt: true,
          latitude: true,
          longitude: true,
        },
      });

      // Public verification summary
      res.json({
        batchNumber: batch.batchNumber,
        status: batch.status,
        quantity: batch.quantity,
        manufactureDate: batch.manufactureDate,
        expiryDate: batch.expiryDate,
        product: batch.product,
        producer: batch.producer,
        currentHolder: batch.currentHolder,
        telemetry: {
          totalReadings: batch._count.sensorReadings,
          latestReading,
        },
        timeline: batch.events,
        alerts: batch.alerts,
        blockchainAnchors: batch.anchors.map((a) => ({
          ...a,
          blockNumber: a.blockNumber ? a.blockNumber.toString() : null,
        })),
        isAuthentic: batch.anchors.some((a) => a.status === 'CONFIRMED'),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/batches
 * List batches with pagination and filtering
 */
batchRouter.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pagination = getPaginationParams(req);
      const status = req.query.status as BatchStatus | undefined;
      const productId = req.query.productId as string | undefined;
      const search = req.query.search as string | undefined;

      const where: any = {};
      if (status && Object.values(BatchStatus).includes(status)) {
        where.status = status;
      }
      if (productId) {
        where.productId = productId;
      }
      if (search) {
        where.batchNumber = { contains: search, mode: 'insensitive' };
      }

      const [total, batches] = await Promise.all([
        prisma.batch.count({ where }),
        prisma.batch.findMany({
          where,
          skip: pagination.skip,
          take: pagination.take,
          orderBy: { createdAt: 'desc' },
          include: {
            product: { select: { sku: true, name: true, tempMinC: true, tempMaxC: true } },
            producer: { select: { name: true, code: true } },
            currentHolder: { select: { name: true, code: true } },
            _count: {
              select: { sensorReadings: true, alerts: true, events: true, anchors: true },
            },
          },
        }),
      ]);

      res.json(formatPaginatedResponse(batches, total, pagination));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/batches/:id
 * Retrieve single batch with complete details
 */
batchRouter.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const batch = await prisma.batch.findUnique({
        where: { id: req.params.id },
        include: {
          product: true,
          producer: true,
          currentHolder: true,
          events: {
            orderBy: { createdAt: 'asc' },
            include: {
              actor: { select: { id: true, fullName: true, role: true } },
              fromOrg: { select: { name: true, code: true } },
              toOrg: { select: { name: true, code: true } },
            },
          },
          alerts: {
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
          anchors: {
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: { sensorReadings: true },
          },
        },
      });

      if (!batch) {
        throw new NotFoundError(`Batch with ID '${req.params.id}' not found`);
      }

      // Convert BigInts in anchors to string for JSON serialization
      const serializedBatch = {
        ...batch,
        anchors: batch.anchors.map((a) => ({
          ...a,
          blockNumber: a.blockNumber ? a.blockNumber.toString() : null,
        })),
      };

      res.json({ batch: serializedBatch });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/batches
 * Create a new batch. Role: PRODUCER or ADMIN only.
 */
batchRouter.post(
  '/',
  authenticate,
  requireRoles(UserRole.PRODUCER, UserRole.ADMIN),
  validate(createBatchSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        batchNumber,
        productId,
        producerId,
        currentHolderId,
        manufactureDate,
        expiryDate,
        quantity,
        qrCodeUrl,
      } = req.body;

      const targetProducerId = producerId || req.user?.organizationId;
      if (!targetProducerId) {
        throw new BadRequestError('producerId is required or producer must belong to an organization');
      }

      const existing = await prisma.batch.findUnique({ where: { batchNumber } });
      if (existing) {
        throw new ConflictError(`Batch with number '${batchNumber}' already exists`);
      }

      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new NotFoundError(`Product with ID '${productId}' not found`);
      }

      const batch = await prisma.batch.create({
        data: {
          batchNumber,
          productId,
          producerId: targetProducerId,
          currentHolderId: currentHolderId || targetProducerId,
          status: BatchStatus.CREATED,
          manufactureDate: new Date(manufactureDate),
          expiryDate: new Date(expiryDate),
          quantity,
          qrCodeUrl: qrCodeUrl || `http://localhost:5173/trace/${batchNumber}`,
        },
        include: {
          product: { select: { sku: true, name: true } },
          producer: { select: { name: true, code: true } },
        },
      });

      res.status(201).json({
        message: 'Batch created successfully',
        batch,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/batches/:id/status
 * Update batch status. Role: ADMIN, PRODUCER, TRANSPORTER, WAREHOUSE_OPERATOR
 */
batchRouter.patch(
  '/:id/status',
  authenticate,
  requireRoles(
    UserRole.ADMIN,
    UserRole.PRODUCER,
    UserRole.TRANSPORTER,
    UserRole.WAREHOUSE_OPERATOR
  ),
  validate(updateStatusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body;

      const batch = await prisma.batch.update({
        where: { id: req.params.id },
        data: { status },
      });

      res.json({
        message: `Batch status updated to ${status}`,
        batch,
      });
    } catch (error) {
      next(error);
    }
  }
);
