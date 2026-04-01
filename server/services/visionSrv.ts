import { validateModel, getModelProvider } from '../utils/modelUtils.ts'
import { geminiExtractTextFromImage } from './gemini/visionSrv.ts'
import { openaiExtractTextFromImage } from './openai/visionSrv.ts'

export interface ExtractTextFromImageOptions {
    prompt?: string
    images: string[]
    model?: string
}

export interface ExtractTextFromImageResult {
    text: string
}

export const extractTextFromImage = async (options: ExtractTextFromImageOptions): Promise<ExtractTextFromImageResult> => {
    const { prompt, images, model } = options

    if (!images || images.length === 0) {
        throw new Error('At least one image is required.')
    }

    const finalPrompt = prompt || 'Describe this image in detail'
    const validatedModel = validateModel(model, 'VISION')
    const provider = getModelProvider(validatedModel, 'VISION')

    let text: string

    if (provider === 'openai') {
        text = await openaiExtractTextFromImage(images, finalPrompt, validatedModel)
    } else if (provider === 'gemini') {
        text = await geminiExtractTextFromImage(images, finalPrompt, validatedModel)
    } else {
        throw new Error(`Unknown provider: "${provider}"`)
    }

    return { text }
}
