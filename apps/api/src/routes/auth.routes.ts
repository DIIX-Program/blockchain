import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { hashPassword, comparePassword } from '../lib/password';
import { signToken } from '../lib/jwt';
import { authenticate, requireRoles } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { UnauthorizedError, ConflictError } from '../lib/errors';

export const authRouter = Router();

// Validation Schemas
const registerSchema = {
  body: z.object({
    email: z.string().email('Invalid email address format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    fullName: z.string().min(2, 'Full name must have at least 2 characters'),
    role: z.nativeEnum(UserRole).default(UserRole.VIEWER),
    organizationId: z.string().uuid('Invalid organization UUID').optional().nullable(),
  }),
};

const loginSchema = {
  body: z.object({
    email: z.string().email('Invalid email address format'),
    password: z.string().min(1, 'Password is required'),
  }),
};

/**
 * POST /api/v1/auth/register
 * Register a new user. Protected: ADMIN only, or self-registration for VIEWER role.
 */
authRouter.post(
  '/register',
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, fullName, role, organizationId } = req.body;

      // Check if user email already exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new ConflictError(`User with email '${email}' already exists`);
      }

      // If organizationId is provided, verify it exists
      if (organizationId) {
        const org = await prisma.organization.findUnique({ where: { id: organizationId } });
        if (!org) {
          return res.status(404).json({
            error: 'NotFoundError',
            message: `Organization with ID '${organizationId}' not found`,
          });
        }
      }

      const passwordHash = await hashPassword(password);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          role,
          organizationId: organizationId || null,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          organizationId: true,
          isActive: true,
          createdAt: true,
        },
      });

      const token = signToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      });

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/auth/login
 * Authenticate with email and password, return JWT token and user profile
 */
authRouter.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          organization: {
            select: { id: true, name: true, code: true, type: true },
          },
        },
      });

      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      if (!user.isActive) {
        throw new UnauthorizedError('User account is deactivated. Contact an administrator.');
      }

      const isPasswordValid = await comparePassword(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const token = signToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      });

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          organizationId: user.organizationId,
          organization: user.organization,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/auth/me
 * Retrieve the current authenticated user's profile
 */
authRouter.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: {
          organization: {
            select: { id: true, name: true, code: true, type: true, address: true, contactEmail: true },
          },
        },
      });

      if (!user) {
        throw new UnauthorizedError('User account not found');
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          organizationId: user.organizationId,
          organization: user.organization,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/auth/logout
 * Acknowledge session termination
 */
authRouter.post('/logout', authenticate, (req: Request, res: Response) => {
  res.json({
    message: 'Logout successful',
    userId: req.user?.id,
  });
});
