import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, requireRoles } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { getPaginationParams, formatPaginatedResponse } from '../lib/pagination';
import { NotFoundError, BadRequestError, ConflictError } from '../lib/errors';

export const productRouter = Router();

const createProductSchema = {
  body: z
    .object({
      sku: z.string().min(3).max(60),
      name: z.string().min(2).max(150),
      description: z.string().optional(),
      tempMinC: z.number({ required_error: 'tempMinC is required' }),
      tempMaxC: z.number({ required_error: 'tempMaxC is required' }),
      humidityMin: z.number().optional().nullable(),
      humidityMax: z.number().optional().nullable(),
      maxTransitHours: z.number().int().positive().optional().nullable(),
      organizationId: z.string().uuid().optional(),
    })
    .refine((data) => data.tempMinC < data.tempMaxC, {
      message: 'tempMinC must be strictly less than tempMaxC',
      path: ['tempMinC'],
    }),
};

/**
 * GET /api/v1/products
 * List products with pagination and search
 */
productRouter.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pagination = getPaginationParams(req);
      const search = req.query.search as string | undefined;

      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [total, data] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          skip: pagination.skip,
          take: pagination.take,
          orderBy: { createdAt: 'desc' },
          include: {
            organization: {
              select: { id: true, name: true, code: true },
            },
            _count: {
              select: { batches: true },
            },
          },
        }),
      ]);

      res.json(formatPaginatedResponse(data, total, pagination));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/products/:id
 * Retrieve single product with details
 */
productRouter.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await prisma.product.findUnique({
        where: { id: req.params.id },
        include: {
          organization: {
            select: { id: true, name: true, code: true, contactEmail: true },
          },
          batches: {
            select: {
              id: true,
              batchNumber: true,
              status: true,
              manufactureDate: true,
              expiryDate: true,
              quantity: true,
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!product) {
        throw new NotFoundError(`Product with ID '${req.params.id}' not found`);
      }

      res.json({ product });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/products
 * Create a new product. Role: ADMIN, PRODUCER only.
 */
productRouter.post(
  '/',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.PRODUCER),
  validate(createProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        sku,
        name,
        description,
        tempMinC,
        tempMaxC,
        humidityMin,
        humidityMax,
        maxTransitHours,
        organizationId,
      } = req.body;

      const targetOrgId = organizationId || req.user?.organizationId;
      if (!targetOrgId) {
        throw new BadRequestError('organizationId is required or user must belong to an organization');
      }

      const existing = await prisma.product.findUnique({ where: { sku } });
      if (existing) {
        throw new ConflictError(`Product with SKU '${sku}' already exists`);
      }

      const product = await prisma.product.create({
        data: {
          sku,
          name,
          description,
          tempMinC,
          tempMaxC,
          humidityMin,
          humidityMax,
          maxTransitHours,
          organizationId: targetOrgId,
        },
        include: {
          organization: { select: { id: true, name: true, code: true } },
        },
      });

      res.status(201).json({
        message: 'Product created successfully',
        product,
      });
    } catch (error) {
      next(error);
    }
  }
);
