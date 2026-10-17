import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuthenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { getPaginationParams, formatPaginatedResponse } from '../lib/pagination';
import { NotFoundError } from '../lib/errors';
import { canonicalHash as computeCanonicalHash } from '../lib/canonical';
import { aiClient, toAlertPayload } from '../lib/ai';
import { DetectionMethod, AlertSeverity } from '@prisma/client';

export const sensorRouter = Router();

const ingestTelemetrySchema = {
  body: z.object({
    batchId: z.string().uuid('Invalid batch UUID'),
    deviceId: z.string().uuid('Invalid device UUID'),
    sequenceNumber: z.number().int().nonnegative('Sequence number must be non-negative'),
    recordedAt: z.string().datetime(),
    temperatureC: z.number(),
    humidityPercent: z.number().min(0).max(100).optional().nullable(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    isSimulated: z.boolean().default(true),
  }),
};

/**
 * GET /api/v1/sensors/batch/:batchId
 * Query time-series telemetry for a batch with pagination and date filters
 */
sensorRouter.get(
  '/batch/:batchId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { batchId } = req.params;
      const pagination = getPaginationParams(req, 50, 500);
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      const order = req.query.order === 'asc' ? 'asc' : 'desc';

      const where: any = { batchId };
      if (from || to) {
        where.recordedAt = {};
        if (from) where.recordedAt.gte = new Date(from);
        if (to) where.recordedAt.lte = new Date(to);
      }

      const [total, readings] = await Promise.all([
        prisma.sensorReading.count({ where }),
        prisma.sensorReading.findMany({
          where,
          skip: pagination.skip,
          take: pagination.take,
          orderBy: { recordedAt: order },
          include: {
            device: { select: { deviceCode: true, model: true } },
          },
        }),
      ]);

      // Convert BigInt sequence numbers to string for JSON output
      const serialized = readings.map((r) => ({
        ...r,
        sequenceNumber: r.sequenceNumber.toString(),
      }));

      res.json(formatPaginatedResponse(serialized, total, pagination));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/sensors/telemetry
 * Ingest telemetry packet with idempotency check
 */
sensorRouter.post(
  '/telemetry',
  optionalAuthenticate,
  validate(ingestTelemetrySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        batchId,
        deviceId,
        sequenceNumber,
        recordedAt,
        temperatureC,
        humidityPercent,
        latitude,
        longitude,
        isSimulated,
      } = req.body;

      const recordedDate = new Date(recordedAt);

      // Verify batch and device exist
      const [batch, device] = await Promise.all([
        prisma.batch.findUnique({ where: { id: batchId } }),
        prisma.device.findUnique({ where: { id: deviceId } }),
      ]);

      if (!batch) {
        throw new NotFoundError(`Batch with ID '${batchId}' not found`);
      }
      if (!device) {
        throw new NotFoundError(`Device with ID '${deviceId}' not found`);
      }

      // Check idempotency constraint
      const existing = await prisma.sensorReading.findUnique({
        where: {
          idx_reading_idempotency: {
            deviceId,
            sequenceNumber: BigInt(sequenceNumber),
            recordedAt: recordedDate,
          },
        },
      });

      if (existing) {
        return res.status(200).json({
          status: 'DUPLICATE_IGNORED',
          message: 'Telemetry packet already ingested (idempotent)',
          readingId: existing.id,
        });
      }

      // Compute canonical (RFC 8785 JCS) single-reading hash
      const canonicalHash = computeCanonicalHash({
        batchId,
        deviceId,
        humidityPercent: humidityPercent ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        recordedAt: recordedDate.toISOString(),
        sequenceNumber,
        temperatureC,
      });

      const reading = await prisma.sensorReading.create({
        data: {
          batchId,
          deviceId,
          sequenceNumber: BigInt(sequenceNumber),
          recordedAt: recordedDate,
          temperatureC,
          humidityPercent: humidityPercent !== undefined ? humidityPercent : null,
          latitude: latitude !== undefined ? latitude : null,
          longitude: longitude !== undefined ? longitude : null,
          isSimulated: isSimulated !== undefined ? isSimulated : true,
          canonicalHash,
          anchored: false,
        },
      });

      // Update device heartbeat
      await prisma.device.update({
        where: { id: deviceId },
        data: { lastSeenAt: new Date() },
      });

      // Non-blocking AI anomaly analysis: score the reading and, if anomalous,
      // persist an AnomalyAlert. Failures are swallowed so telemetry
      // ingestion always returns 201 even when the AI service is unavailable.
      void (async () => {
        try {
          const aiReading = {
            batchId,
            deviceId,
            sequenceNumber,
            recordedAt,
            temperatureC,
            humidityPercent: humidityPercent ?? null,
            latitude: latitude ?? null,
            longitude: longitude ?? null,
            isSimulated,
          };
          const aiResult = await aiClient.predict(aiReading);
          if (aiResult.isAnomaly) {
            const payload = toAlertPayload(aiReading, aiResult);
            const severity =
              payload.severity === 'critical'
                ? AlertSeverity.CRITICAL
                : payload.severity === 'warning'
                  ? AlertSeverity.HIGH
                  : AlertSeverity.LOW;

            // Distinguish detection origin: rule-only, ML-only, or hybrid.
            const hasRules = aiResult.ruleViolations.length > 0;
            const hasMl = aiResult.flags.some((f) => f.source === 'isolation_forest');
            const detectionMethod =
              hasRules && hasMl
                ? DetectionMethod.HYBRID
                : hasRules
                  ? DetectionMethod.RULE_BASED
                  : DetectionMethod.ML_MODEL;

            await prisma.anomalyAlert.create({
              data: {
                batchId,
                deviceId,
                detectionMethod,
                severity,
                anomalyScore: payload.anomalyScore ?? undefined,
                ruleViolated: payload.ruleViolated,
                explanation: payload.explanation,
                readingWindowStart: recordedDate,
                readingWindowEnd: recordedDate,
              },
            });
          }
        } catch (aiErr) {
          // Telemetry must succeed regardless of AI-service availability.
          console.error(
            `[ai] async anomaly analysis failed for reading (batch=${batchId}, device=${deviceId}, seq=${sequenceNumber}):`,
            aiErr,
          );
        }
      })();

      res.status(201).json({
        status: 'INGESTED',
        message: 'Telemetry packet successfully recorded',
        reading: {
          ...reading,
          sequenceNumber: reading.sequenceNumber.toString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);
