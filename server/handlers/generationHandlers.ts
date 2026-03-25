import * as path from 'path'
import type { Request, Response } from 'express'
import * as generationService from '../services/index.ts'
import { imageGetMetadata, isValidAspectRatio, getValidAspectRatios, getRefImageSourceDescription } from '../utils/imageUtils.ts'
import { resolveReferenceImages } from '../helpers/index.ts'
import { logger, truncatePromptForLog } from '../utils/logger.ts'
import { startTimer } from '../utils/observabilityUtils.ts'

const RESOURCES_DIR = path.join(process.cwd(), 'data', 'resources')

/**
 * Enhance prompt handler (HTTP layer only)
 * POST /api/enhance-prompt
 * @param {string} prompt - The prompt to enhance
 * @param {string} type - The type of enhancement (TEXT, IMAGE, etc.)
 */
export const enhancePrompt = async (req: Request, res: Response): Promise<void> => {
    try {
        const timer = startTimer()
        const { prompt, type } = req.body
        logger.info(`POST /api/enhance-prompt - type: ${type}, prompt length: ${prompt?.length}`)
        logger.info(`--- PROMPT START\n${truncatePromptForLog(prompt)}\n--- PROMPT END`)

        const enhancedPrompt = await generationService.enhancePrompt(prompt, type || 'TEXT')

        logger.info(`POST /api/enhance-prompt - ✓ enhanced length: ${enhancedPrompt?.length}, time: ${timer.stop()}`)
        res.json({ enhancedPrompt })
    } catch (error) {
        const fallback = { enhancedPrompt: req.body.prompt }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`POST /api/enhance-prompt - ✗ error: ${errorMessage}`)
        res.json(fallback)
    }
}

/**
 * Generate text handler (HTTP layer only)
 * POST /api/generate-text
 * @param {string} prompt - The prompt for text generation
 * @param {boolean} shouldEnhance - Whether to enhance the prompt before generation
 * @param {string} model - The model to use for generation
 */
export const generateText = async (req: Request, res: Response): Promise<void> => {
    try {
        const timer = startTimer()
        const { prompt, shouldEnhance, model } = req.body
        logger.info(`POST /api/generate-text - shouldEnhance: ${shouldEnhance}, model: ${model || 'default'}, prompt length: ${prompt?.length}`)
        logger.info(`--- PROMPT START\n${truncatePromptForLog(prompt)}\n--- PROMPT END`)

        const result = await generationService.generateText({ prompt, shouldEnhance, model })

        logger.info(`POST /api/generate-text - \u2713 text length: ${result.text.length}, time: ${timer.stop()}s`)
        const lines = result.text.split('\n')
        const displayText = lines.length > 10 ? lines.slice(0, 10).join('\n') + '\n...' : result.text
        logger.info(`text:\n---\n${displayText}\n---`)
        res.json(result)
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`POST /api/generate-text - ✗ error: ${errorMessage}`)

        if (errorMessage === 'Please provide a prompt.') {
            res.status(400).json({ error: errorMessage })
        } else {
            res.status(500).json({ error: 'Failed to generate text.' })
        }
    }
}

/**
 * Extract text from image handler (HTTP layer only)
 * POST /api/extract-text-from-image
 * @param {string} prompt - The prompt/question about the image
 * @param {string[]} images - Array of base64 encoded images
 * @param {string} model - The vision model to use
 */
export const extractTextFromImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const timer = startTimer()
        const { prompt, images, model } = req.body
        logger.info(`POST /api/extract-text-from-image - images: ${images?.length || 0}, model: ${model || 'default'}, prompt length: ${prompt?.length}`)
        logger.info(`--- PROMPT START\n${truncatePromptForLog(prompt)}\n--- PROMPT END`)

        const result = await generationService.extractTextFromImage({ prompt, images, model })

        logger.info(`POST /api/extract-text-from-image - ✓ text length: ${result.text.length}, time: ${timer.stop()}`)
        res.json(result)
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`POST /api/extract-text-from-image - ✗ error: ${errorMessage}`)

        if (errorMessage === 'At least one image is required.') {
            res.status(400).json({ error: errorMessage })
        } else {
            res.status(500).json({ error: 'Failed to extract text from image.' })
        }
    }
}

/**
 * Generate images handler (HTTP layer only)
 * POST /api/generate-images
 * @param {string} prompt - The prompt for image generation
 * @param {number} count - Number of images to generate
 * @param {string[]} referenceImages - Array of base64 reference images
 * @param {string} aspectRatio - Aspect ratio for generated images
 * @param {string} outputFormat - Output format (jpeg, png, etc.)
 * @param {boolean} shouldEnhance - Whether to enhance the prompt
 * @param {string} model - The image generation model to use
 * @param {string} preset - Image preset ('1K', '2K', '4K')
 */
export const generateImages = async (req: Request, res: Response): Promise<void> => {
    try {
        const timer = startTimer()
        const { prompt, count, referenceImages, aspectRatio, outputFormat, shouldEnhance, model, preset } = req.body
        logger.info(
            `POST /api/generate-images - count: ${count}, ratio: ${aspectRatio}, format: ${outputFormat || 'default'}, preset: ${preset || 'none'}, enhance: ${shouldEnhance}, model: ${model || 'none'}, refs: ${referenceImages?.length || 0}, prompt length: ${prompt?.length}`
        )
        logger.info(`--- PROMPT START\n${truncatePromptForLog(prompt)}\n--- PROMPT END`)

        // Validate aspectRatio if provided
        if (aspectRatio && !isValidAspectRatio(aspectRatio)) {
            const validRatios = getValidAspectRatios().join(', ')
            logger.error(`POST /api/generate-images - ✗ invalid aspectRatio: ${aspectRatio}`)
            res.status(400).json({ error: `Invalid aspect ratio. Must be one of: ${validRatios}` })
            return
        }

        // Resolve reference images (resource: IDs or URLs to base64)
        const resolvedRefs = referenceImages?.length > 0 ? await resolveReferenceImages(referenceImages) : []

        if (resolvedRefs.length > 0) {
            const { totalSizeStr, imageDetails } = imageGetMetadata(resolvedRefs)
            logger.info(`reference images: ${resolvedRefs.length}, total size: ${totalSizeStr}`)
            imageDetails.forEach((img, idx) => {
                logger.info(`\t  ref ${idx + 1}: ${img.sizeStr} (${img.type}) — ${getRefImageSourceDescription(referenceImages[idx])}`)
            })
        }

        const result = await generationService.generateImages(
            {
                prompt,
                count,
                referenceImages: resolvedRefs,
                aspectRatio,
                outputFormat,
                shouldEnhance,
                model,
                preset
            },
            RESOURCES_DIR
        )

        logger.info(`POST /api/generate-images - ✓ generated: ${result.imageResources.length}, enhanced: ${!!result.enhancedPrompt}, time: ${timer.stop()}`)
        result.imageResources.forEach((id, idx) => {
            logger.info(`\timage ${idx + 1}: ${id}`)
        })

        res.json(result)
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`POST /api/generate-images - ✗ error: ${errorMessage}`)

        if (errorMessage === 'Prompt or Reference Image is required.') {
            res.status(400).json({ error: errorMessage })
        } else {
            res.status(500).json({ error: 'Failed to generate images.' })
        }
    }
}

/**
 * Plan graph handler (HTTP layer only)
 * POST /api/plan-graph
 * @param {string} prompt - The prompt describing the desired graph/workflow
 */
export const planGraph = async (req: Request, res: Response): Promise<void> => {
    try {
        const timer = startTimer()
        const { prompt } = req.body
        logger.info(`POST /api/plan-graph - prompt length: ${prompt?.length}`)
        logger.info(`--- PROMPT START\n${truncatePromptForLog(prompt)}\n--- PROMPT END`)

        const graph = await generationService.planGraph(prompt)

        logger.info(`POST /api/plan-graph - ✓ nodes: ${graph.nodes?.length}, edges: ${graph.edges?.length}, time: ${timer.stop()}`)
        res.json(graph)
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`POST /api/plan-graph - ✗ error: ${errorMessage}`)
        res.status(500).json({ error: 'Failed to plan flow.' })
    }
}
