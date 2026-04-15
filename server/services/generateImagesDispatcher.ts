import { enhancePrompt } from './promptDispatcher.ts'
import { validateModel, getModelProvider } from '../utils/modelUtils.ts'
import { isValidAspectRatio, getValidAspectRatios } from '../utils/imageUtils.ts'
import { saveResource } from './resourcesSrv.ts'
import { geminiGenerateImages } from './gemini/generateImagesSrv.ts'
import { openaiGenerateImages } from './openai/generateImagesSrv.ts'
import { bflGenerateImages } from './black-forest-labs/generateImagesSrv.ts'

export interface GenerateImagesOptions {
    prompt?: string
    count?: number
    referenceImages?: string[]
    aspectRatio?: string
    outputFormat?: string
    shouldEnhance?: boolean
    model?: string
    preset?: string
}

export interface GenerateImagesResult {
    images: string[]
    enhancedPrompt?: string
}

export interface GenerateImagesWithResourcesResult {
    imageResources: string[]
    enhancedPrompt?: string
}

/**
 * Generate images and save them as resources.
 * Returns ResourceItem metadata for each saved image.
 */
export const generateImages = async (options: GenerateImagesOptions, resourcesDir: string): Promise<GenerateImagesWithResourcesResult> => {
    const base64Result = await generateImagesBase64(options)

    const imageResources: string[] = []
    for (const dataUrl of base64Result.images) {
        const match = dataUrl.match(/^data:.*;base64,(.+)$/)
        if (match) {
            const buffer = Buffer.from(match[1], 'base64')
            const resource = await saveResource(resourcesDir, buffer)
            imageResources.push(resource.id)
        }
    }

    return { imageResources, enhancedPrompt: base64Result.enhancedPrompt }
}

/**
 * Generate images using AI model
 * Returns base64 encoded images
 * @param options.prompt - Text prompt describing the desired image
 * @param options.count - Number of images to generate (default: 1)
 * @param options.referenceImages - Array of base64 encoded reference images
 * @param options.aspectRatio - Aspect ratio for generated images (e.g., '1:1', '16:9')
 * @param options.outputFormat - Output format for the images ('png' or 'jpeg')
 * @param options.shouldEnhance - Whether to enhance the prompt using AI (default: false)
 * @param options.model - AI model to use for generation
 * @param options.preset - Image preset (e.g., '1K', '2K', '4K')
 */
export const generateImagesBase64 = async (options: GenerateImagesOptions): Promise<GenerateImagesResult> => {
    const { prompt = '', count = 1, referenceImages = [], aspectRatio, outputFormat, shouldEnhance, model, preset } = options

    if (aspectRatio && !isValidAspectRatio(aspectRatio)) {
        const validRatios = getValidAspectRatios().join(', ')
        throw new Error(`Invalid aspect ratio: ${aspectRatio}. Valid values are: ${validRatios}`)
    }

    let finalPrompt = prompt
    let enhancedPromptText: string | undefined

    if (shouldEnhance && finalPrompt.trim()) {
        enhancedPromptText = await enhancePrompt(finalPrompt, 'IMAGE')
        finalPrompt = enhancedPromptText
    }

    let promptToSend = finalPrompt
    if (outputFormat) {
        promptToSend = `${finalPrompt} (format ${outputFormat.toLowerCase()})`.trim()
    }

    const validatedModel = validateModel(model, 'IMAGE')
    const provider = getModelProvider(validatedModel, 'IMAGE')

    let images: string[]

    if (provider === 'openai') {
        images = await openaiGenerateImages({ promptToSend, count, aspectRatio, outputFormat, validatedModel })
    } else if (provider === 'gemini') {
        images = await geminiGenerateImages({ promptToSend, count, referenceImages, aspectRatio, outputFormat, preset, validatedModel })
    } else if (provider === 'black-forest-labs') {
        images = await bflGenerateImages({ promptToSend, count, referenceImages, aspectRatio, outputFormat, validatedModel })
    } else {
        throw new Error(`Unknown provider: "${provider}"`)
    }

    if (images.length === 0) {
        throw new Error('No image data found in response.')
    }

    return { images, enhancedPrompt: enhancedPromptText }
}
