import type { Request, Response } from 'express'
import { MODELS } from '../config.ts'
import { logger } from '../utils/logger.ts'

/**
 * Get all supported models
 * GET /api/models
 * No input parameters required
 */
export const getModels = async (req: Request, res: Response) => {
    try {
        const totalModels = MODELS.TEXT.length + MODELS.IMAGE.length + MODELS.VISION.length + MODELS.PLANNER.length

        const providers = Object.fromEntries(Object.entries(MODELS).map(([category, models]) => [category, [...new Set(models.map((m) => m.provider))]]))

        res.json({
            success: true,
            models: MODELS,
            providers
        })
        logger.info(`GET /api/models - ✓ returned ${totalModels} models`)
    } catch (error) {
        logger.error({ error }, 'Error getting models')
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get models'
        })
    }
}
