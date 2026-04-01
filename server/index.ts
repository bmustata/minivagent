import dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { app } from './server.ts'
import { runResourceCleanup } from './services/resourceCleanupSchedulerSrv.ts'
import { scheduleCron } from './utils/cronUtils.ts'
import { MODELS } from './config.ts'
import { logger } from './utils/logger.ts'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local', quiet: true })

// Port configuration (3201 by default)
const PORT = process.env.PORT || 3201
const WEB_PORT = 3202

// Start server
const server = app.listen(PORT, () => {
    logger.info('+----------------------------------------+')
    logger.info('| MiniVAgent  (•‿•)  Agent Ready         |')
    logger.info('|                                        |')
    logger.info('| MiniVAgent server running on:          |')
    logger.info(`| http://localhost:${WEB_PORT}                  |`)
    logger.info('|                                        |')
    logger.info(`| API:  http://localhost:${PORT}/api/           |`)
    logger.info(`| INFO: http://localhost:${PORT}/api/meta       |`)
    logger.info('+----------------------------------------+')
    logger.info(`MiniVAgent server running on http://localhost:${PORT}`)
    const logModels = (category: string, models: readonly { name: string; provider: string }[]) => {
        const providers = [...new Set(models.map((m) => m.provider))]
        logger.info(`  ${category}:`)
        logger.info(`    [default] ${models[0].name}`)
        for (const p of providers) {
            const names = models
                .filter((m) => m.provider === p)
                .map((m) => m.name)
                .join(', ')
            logger.info(`    ${p}: ${names}`)
        }
    }
    logger.info('Supported models:')
    logModels('TEXT', MODELS.TEXT)
    logModels('IMAGE', MODELS.IMAGE)
    logModels('VISION', MODELS.VISION)
    logModels('PLANNER', MODELS.PLANNER)

    const graphsDir = path.join(process.cwd(), 'data', 'graphs')
    const graphFiles = fs.existsSync(graphsDir) ? fs.readdirSync(graphsDir).filter((f) => f.endsWith('.json')) : []
    logger.info(`Graphs directory: ${graphsDir}`)
    logger.info(`Graph files found: ${graphFiles.length}`)

    const resourcesDir = path.join(process.cwd(), 'data', 'resources')
    const resourceFiles = fs.existsSync(resourcesDir) ? fs.readdirSync(resourcesDir).filter((f) => /\.(png|jpeg|webp)$/i.test(f)) : []
    logger.info(`Resources directory: ${resourcesDir}`)
    logger.info(`Resource files found: ${resourceFiles.length}`)

    // Run cleanup immediately on startup, then every hour at minute 0 (cron: '0 * * * *')
    void runResourceCleanup(graphsDir, resourcesDir)
    scheduleCron('0 * * * *', () => void runResourceCleanup(graphsDir, resourcesDir))
})

// Set request timeout to 10 minutes (600000ms)
server.requestTimeout = 600000
