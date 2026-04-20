import type { Request, Response } from 'express'
import { MODELS } from '../config.ts'
import { openai, replicate } from '../utils/const.ts'
import { logger } from '../utils/logger.ts'

/**
 * Get all supported models
 * GET /api/models
 * No input parameters required
 */
export const getModels = async (req: Request, res: Response) => {
    try {
        const unavailableProviders = new Set<string>()
        if (!openai) unavailableProviders.add('openai')
        if (!replicate) unavailableProviders.add('black-forest-labs')

        // Remove models whose provider has no API client configured (missing env token)
        const filteredModels = Object.fromEntries(
            Object.entries(MODELS).map(([category, models]) => [category, (models as readonly { name: string; provider: string; model: string; options: object }[]).filter((m) => !unavailableProviders.has(m.provider))])
        )

        const totalModels = Object.values(filteredModels).reduce((sum, arr) => sum + arr.length, 0)
        const providers = Object.fromEntries(Object.entries(filteredModels).map(([category, models]) => [category, [...new Set(models.map((m) => m.provider))]]))

        res.json({
            success: true,
            models: filteredModels,
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
