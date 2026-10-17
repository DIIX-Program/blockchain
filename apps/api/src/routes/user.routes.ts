import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, requireRoles } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { getPaginationParams, formatPaginatedResponse } from '../lib/pagination';
import { NotFoundError, ForbiddenError } from '../lib/errors';

export const userRouter = Router();

const updateUserSchema = {
  body: z.object({
    role: z.nativeEnum(UserRole).optional(),
    isActive: z.boolean().optional(),
    fullName: z.string().min(2).optional(),
  }),
};

/**
 * GET /api/v1/users
 * List all users. Role: ADMIN only.
 */
userRouter.get(
  '/',
  authenticate,
  requireRoles(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pagination = getPaginationParams(req);
      const role = req.query.role as UserRole | undefined;
      const organizationId = req.query.organizationId as string | undefined;

      const where: any = {};
      if (role && Object.values(UserRole).includes(role)) {
        where.role = role;
      }
      if (organizationId) {
        where.organizationId = organizationId;
      }

      const [total, data] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          skip: pagination.skip,
          take: pagination.take,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            organizationId: true,
            organization: {
              select: { id: true, name: true, code: true, type: true },
            },
            isActive: true,
            createdAt: true,
            updatedAt: true,
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
 * GET /api/v1/users/:id
 * Retrieve single user by ID. Role: ADMIN or Self.
 */
userRouter.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user!.role !== UserRole.ADMIN && req.user!.id !== req.params.id) {
        throw new ForbiddenError('You can only access your own profile');
      }

      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          organizationId: true,
          organization: true,
          isActive: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new NotFoundError(`User with ID '${req.params.id}' not found`);
      }

      res.json({ user });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/users/:id
 * Update user role or status. Role: ADMIN only.
 */
userRouter.patch(
  '/:id',
  authenticate,
  requireRoles(UserRole.ADMIN),
  validate(updateUserSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: req.body,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          updatedAt: true,
        },
      });

      res.json({
        message: 'User updated successfully',
        user,
      });
    } catch (error) {
      next(error);
    }
  }
);
