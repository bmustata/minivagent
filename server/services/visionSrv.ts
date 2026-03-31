import { ai } from '../utils/const.ts'
import { MODELS } from '../config.ts'
import { validateModel } from '../utils/modelUtils.ts'

export interface ExtractTextFromImageOptions {
    prompt?: string
    images: string[]
    model?: string
}

export interface ExtractTextFromImageResult {
    text: string
}

/**
 * Parse base64 image data URL
 */
const parseImageDataUrl = (img: string): { mimeType: string; data: string } | null => {
    const match = img.match(/^data:(.*?);base64,(.*)$/)
    if (match) {
        return { mimeType: match[1], data: match[2] }
    }
    return null
}

/**
 * Extract text from images using vision model
 */
export const extractTextFromImage = async (options: ExtractTextFromImageOptions): Promise<ExtractTextFromImageResult> => {
    const { prompt, images, model } = options

    if (!images || images.length === 0) {
        throw new Error('At least one image is required.')
    }

    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = []

    // Add images first
    for (const img of images) {
        if (img) {
            const parsed = parseImageDataUrl(img)
            if (parsed) {
                parts.push({ inlineData: parsed })
            }
        }
    }

    // Add prompt/question about the image
    const finalPrompt = prompt || 'Describe this image in detail'
    parts.push({ text: finalPrompt })

    const validatedModel = validateModel(model, 'VISION')

    const response = await ai.models.generateContent({
        model: validatedModel,
        contents: { parts }
    })

    return { text: response.text || 'No response generated.' }
}
