import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OrganizationType, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, requireRoles } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { getPaginationParams, formatPaginatedResponse } from '../lib/pagination';
import { NotFoundError, ConflictError } from '../lib/errors';

export const organizationRouter = Router();

// Validation Schemas
const createOrgSchema = {
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(120),
    code: z.string().min(3, 'Code must be at least 3 characters').max(50),
    type: z.nativeEnum(OrganizationType),
    address: z.string().optional(),
    contactEmail: z.string().email('Invalid email address format'),
  }),
};

const updateOrgSchema = {
  body: z.object({
    name: z.string().min(2).max(120).optional(),
    address: z.string().optional(),
    contactEmail: z.string().email().optional(),
  }),
};

/**
 * GET /api/v1/organizations
 * List all organizations with pagination & filtering by type
 */
organizationRouter.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pagination = getPaginationParams(req);
      const type = req.query.type as OrganizationType | undefined;
      const search = req.query.search as string | undefined;

      const where: any = {};
      if (type && Object.values(OrganizationType).includes(type)) {
        where.type = type;
      }
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [total, data] = await Promise.all([
        prisma.organization.count({ where }),
        prisma.organization.findMany({
          where,
          skip: pagination.skip,
          take: pagination.take,
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: { users: true, products: true, producedBatches: true },
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
 * GET /api/v1/organizations/:id
 * Get single organization details
 */
organizationRouter.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: req.params.id },
        include: {
          users: {
            select: { id: true, fullName: true, email: true, role: true, isActive: true },
          },
          products: {
            select: { id: true, sku: true, name: true, tempMinC: true, tempMaxC: true },
          },
          _count: {
            select: { producedBatches: true, heldBatches: true, devices: true },
          },
        },
      });

      if (!org) {
        throw new NotFoundError(`Organization with ID '${req.params.id}' not found`);
      }

      res.json({ organization: org });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/organizations
 * Create an organization. Role: ADMIN only.
 */
organizationRouter.post(
  '/',
  authenticate,
  requireRoles(UserRole.ADMIN),
  validate(createOrgSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, code, type, address, contactEmail } = req.body;

      const existing = await prisma.organization.findUnique({ where: { code } });
      if (existing) {
        throw new ConflictError(`Organization with code '${code}' already exists`);
      }

      const org = await prisma.organization.create({
        data: { name, code, type, address, contactEmail },
      });

      res.status(201).json({
        message: 'Organization created successfully',
        organization: org,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/organizations/:id
 * Update an organization. Role: ADMIN only.
 */
organizationRouter.put(
  '/:id',
  authenticate,
  requireRoles(UserRole.ADMIN),
  validate(updateOrgSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const org = await prisma.organization.update({
        where: { id: req.params.id },
        data: req.body,
      });

      res.json({
        message: 'Organization updated successfully',
        organization: org,
      });
    } catch (error) {
      next(error);
    }
  }
);
