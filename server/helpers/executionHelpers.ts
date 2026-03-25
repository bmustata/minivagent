import path from 'path'
import type { GraphNode, GraphEdge } from '../utils/types.ts'
import { generateText } from '../services/generateTextSrv.ts'
import { generateImagesBase64 } from '../services/generateImagesSrv.ts'
import { extractTextFromImage } from '../services/visionSrv.ts'
import { imageUrlToBase64 } from '../utils/imageUtils.ts'
import { readResource, saveResource } from '../services/resourcesSrv.ts'
import { graphGetConnectedText, graphGetConnectedImages } from './graphHelpers.ts'
import { logger, truncatePromptForLog } from '../utils/logger.ts'

const RESOURCES_DIR = path.join(process.cwd(), 'data', 'resources')

/**
 * Resolve a list of image references to base64 data URIs.
 *
 * Each image string is handled by prefix:
 * - `resource:<id>`        → read file from `data/resources/` by UUID, convert to `data:` URI
 * - `http://` / `https://` → fetch at runtime, convert to `data:` URI
 * - `data:…;base64,…`      → passed through unchanged
 *
 * Images that fail to resolve (e.g. missing resource) are silently dropped.
 * Returns only successfully resolved entries.
 */
export async function resolveReferenceImages(images: string[]): Promise<string[]> {
    const results = await Promise.all(
        images.map(async (img): Promise<string | null> => {
            if (img.startsWith('resource:')) {
                const id = img.slice('resource:'.length).trim()
                try {
                    const { buffer, mimeType } = readResource(RESOURCES_DIR, id)
                    return `data:${mimeType};base64,${buffer.toString('base64')}`
                } catch {
                    logger.warn(`resolveReferenceImages - resource not found, skipping: ${id}`)
                    return null
                }
            }
            if (img.startsWith('http://') || img.startsWith('https://')) {
                return await imageUrlToBase64(img)
            }
            return img // data: URI pass-through
        })
    )
    return results.filter((r): r is string => r !== null)
}

/**
 * Execute a single node
 */
export async function executeNode(nodeId: string, nodes: GraphNode[], edges: GraphEdge[], jobId: string): Promise<void> {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return

    logger.info(`[${jobId}] Executing node: ${nodeId} (${node.type})`)

    try {
        if (node.type === 'TEXT_GEN') {
            const connectedText = graphGetConnectedText(nodeId, nodes, edges)
            let finalPrompt = node.data.prompt || ''

            if (connectedText) {
                if (finalPrompt.trim()) {
                    finalPrompt = `${finalPrompt}\n\n--- Context ---\n${connectedText}`
                } else {
                    finalPrompt = connectedText
                }
            }

            if (!finalPrompt.trim()) throw new Error('No input prompt provided.')

            logger.info(`[${jobId}]   → generateText model=${node.data.model ?? 'default'} enhance=${!!node.data.enhancePrompt}`)
            logger.info(`[${jobId}] --- PROMPT START\n${truncatePromptForLog(finalPrompt)}\n--- PROMPT END`)

            const textResult = await generateText({
                prompt: finalPrompt,
                shouldEnhance: node.data.enhancePrompt,
                model: node.data.model
            })

            node.data.output = textResult.text
            logger.info(`[${jobId}]   ✓ Generated text (${node.data.output.length} chars) preview="${node.data.output.slice(0, 80)}${node.data.output.length > 80 ? '…' : ''}"`)
        } else if (node.type === 'IMAGE_GEN') {
            const connectedText = graphGetConnectedText(nodeId, nodes, edges)
            const connectedImages = graphGetConnectedImages(nodeId, nodes, edges)

            let finalPrompt = node.data.prompt || ''

            if (connectedText) {
                if (finalPrompt.trim()) {
                    finalPrompt = `${finalPrompt} ${connectedText}`
                } else {
                    finalPrompt = connectedText
                }
            }

            if (!finalPrompt.trim() && connectedImages.length === 0) {
                throw new Error('No prompt or input image provided.')
            }

            const processedImages = await resolveReferenceImages(connectedImages)

            const count = node.data.imageCount || 1

            logger.info(`[${jobId}]   → generateImagesBase64 model=${node.data.model ?? 'default'} preset=${node.data.preset ?? 'default'} count=${count} refImages=${processedImages.length}`)
            logger.info(`[${jobId}] --- PROMPT START\n${truncatePromptForLog(finalPrompt)}\n--- PROMPT END`)

            const result = await generateImagesBase64({
                prompt: finalPrompt,
                count,
                referenceImages: processedImages,
                aspectRatio: node.data.aspectRatio,
                outputFormat: node.data.outputFormat,
                shouldEnhance: node.data.enhancePrompt && !!finalPrompt.trim(),
                model: node.data.model,
                preset: node.data.preset
            })

            node.data.images = result.images
            node.data.enhancedOutput = result.enhancedPrompt

            const savedResources: Array<{ id: string; mimeType: string; size: number; sizeStr: string }> = []
            for (const dataUrl of result.images) {
                const match = dataUrl.match(/^data:.*;base64,(.+)$/)
                if (match) {
                    const buffer = Buffer.from(match[1], 'base64')
                    const resource = await saveResource(RESOURCES_DIR, buffer)
                    savedResources.push(resource)
                }
            }
            node.data.imageResources = savedResources.map((r) => r.id)

            logger.info(`[${jobId}]   ✓ Saved ${savedResources.length} image resource(s)`)
            savedResources.forEach((r, i) => {
                const idx = String(i + 1).padStart(2, '0')
                logger.info(`[${jobId}]     - image-${idx} resourceId=${r.id} mimeType=${r.mimeType} size=${r.sizeStr}`)
            })
        } else if (node.type === 'IMAGE_TO_TEXT') {
            const connectedText = graphGetConnectedText(nodeId, nodes, edges)
            const connectedImages = graphGetConnectedImages(nodeId, nodes, edges)

            const prompt = connectedText || node.data.prompt || 'Describe this image'

            const allImages = [...connectedImages]
            if (node.data.imageInput) allImages.push(node.data.imageInput)

            if (allImages.length === 0) throw new Error('No image provided.')

            const processedImages = await resolveReferenceImages(allImages)

            logger.info(`[${jobId}]   → extractTextFromImage model=${node.data.model ?? 'default'} images=${processedImages.length}`)
            logger.info(`[${jobId}] --- PROMPT START\n${truncatePromptForLog(prompt)}\n--- PROMPT END`)

            const visionResult = await extractTextFromImage({
                prompt,
                images: processedImages,
                model: node.data.model
            })

            node.data.output = visionResult.text
            logger.info(`[${jobId}]   ✓ Generated description (${node.data.output.length} chars) preview="${node.data.output.slice(0, 80)}${node.data.output.length > 80 ? '…' : ''}"`)
        } else if (node.type === 'IMAGE_SOURCE') {
            if (node.data.imageInput && (node.data.imageInput.startsWith('http://') || node.data.imageInput.startsWith('https://'))) {
                logger.info(`[${jobId}]   → imageUrlToBase64 url="${node.data.imageInput}"`)
                node.data.imageInput = await imageUrlToBase64(node.data.imageInput)
                logger.info(`[${jobId}]   ✓ Resolved URL to base64 (${Math.ceil((node.data.imageInput.length * 3) / 4 / 1024)}KB)`)
            } else {
                logger.info(`[${jobId}]   ✓ IMAGE_SOURCE has inline image, no resolution needed`)
            }
        } else if (node.type === 'NOTE') {
            logger.info(`[${jobId}]   ✓ NOTE pass-through (${(node.data.prompt || '').length} chars)`)
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Generation failed'
        node.data.error = errorMessage
        logger.error(`[${jobId}]   ✗ Error: ${node.data.error}`)
        throw error
    }
}
