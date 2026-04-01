import { Modality } from '@google/genai'
import sharp from 'sharp'
import { ai } from '../../utils/const.ts'
import { getModelConfig } from '../../utils/modelUtils.ts'
import { isImagenModel } from '../../utils/imageUtils.ts'
import { logger } from '../../utils/logger.ts'

export interface GeminiGenerateImagesOptions {
    promptToSend: string
    count: number
    referenceImages: string[]
    aspectRatio?: string
    outputFormat?: string
    preset?: string
    validatedModel: string
}

const normalizeMimeType = (mimeType?: string): 'image/png' | 'image/jpeg' => {
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'image/jpeg'
    return 'image/png'
}

const normalizeOutputFormat = (format?: string): 'png' | 'jpeg' | undefined => {
    if (!format) return undefined
    const lower = format.toLowerCase()
    if (lower === 'jpeg' || lower === 'jpg') return 'jpeg'
    if (lower === 'png') return 'png'
    return undefined
}

const convertImageFormat = async (base64Data: string, targetFormat: 'png' | 'jpeg'): Promise<string> => {
    const buffer = Buffer.from(base64Data, 'base64')
    const converted = await sharp(buffer).toFormat(targetFormat).toBuffer()
    return converted.toString('base64')
}

const parseImageDataUrl = (img: string): { mimeType: string; data: string } | null => {
    const match = img.match(/^data:(.*?);base64,(.*)$/)
    if (match) return { mimeType: match[1], data: match[2] }
    return null
}

const buildContentParts = (referenceImages: string[], promptToSend: string): Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> => {
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = []
    for (const img of referenceImages) {
        if (img) {
            const parsed = parseImageDataUrl(img)
            if (parsed) parts.push({ inlineData: parsed })
        }
    }
    if (promptToSend && promptToSend.trim()) parts.push({ text: promptToSend })
    return parts
}

const extractImagesFromResponse = async (
    responses: Array<{
        candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }>
    }>,
    outputFormat?: string
): Promise<string[]> => {
    const images: string[] = []
    const targetFormat = normalizeOutputFormat(outputFormat)

    for (const response of responses) {
        for (const candidate of response.candidates ?? []) {
            for (const part of candidate.content?.parts ?? []) {
                if (part.inlineData?.data) {
                    const sourceMimeType = normalizeMimeType(part.inlineData.mimeType)
                    const sourceFormat = sourceMimeType === 'image/jpeg' ? 'jpeg' : 'png'
                    let finalData = part.inlineData.data
                    let finalMimeType: string = sourceMimeType
                    if (targetFormat && targetFormat !== sourceFormat) {
                        finalData = await convertImageFormat(part.inlineData.data, targetFormat)
                        finalMimeType = `image/${targetFormat}`
                    }
                    images.push(`data:${finalMimeType};base64,${finalData}`)
                }
            }
        }
    }
    return images
}

export const geminiGenerateImages = async (options: GeminiGenerateImagesOptions): Promise<string[]> => {
    const { promptToSend, count, referenceImages, aspectRatio, outputFormat, preset, validatedModel } = options

    if (isImagenModel(validatedModel)) {
        if (!promptToSend.trim()) throw new Error('Prompt is required for Imagen models.')
        if (referenceImages.length > 0) {
            logger.warn('Imagen models do not support image inputs — reference images will be ignored.')
        }

        const response = await ai.models.generateImages({
            model: validatedModel,
            prompt: promptToSend,
            config: {
                numberOfImages: count,
                ...(aspectRatio ? { aspectRatio } : {}),
                ...(preset ? { imageSize: preset } : {})
            }
        })

        const targetFormat = normalizeOutputFormat(outputFormat)
        const images: string[] = []
        for (const generated of response.generatedImages ?? []) {
            const bytes = generated.image?.imageBytes
            if (!bytes) continue
            let base64 = typeof bytes === 'string' ? bytes : Buffer.from(bytes).toString('base64')
            let mimeType = 'image/png'
            if (targetFormat) {
                base64 = await convertImageFormat(base64, targetFormat)
                mimeType = `image/${targetFormat}`
            }
            images.push(`data:${mimeType};base64,${base64}`)
        }
        return images
    }

    // Gemini generateContent with IMAGE modality
    const parts = buildContentParts(referenceImages, promptToSend)
    if (parts.length === 0) throw new Error('Prompt or Reference Image is required.')

    const promises = Array(count)
        .fill(null)
        .map(() => {
            const config: { aspectRatio?: string; imageSize?: string } = {}
            if (aspectRatio) config.aspectRatio = aspectRatio
            const modelConfig = getModelConfig(validatedModel, 'IMAGE')
            if (preset && modelConfig?.options && 'presets' in modelConfig.options) {
                config.imageSize = preset
            }
            const imageConfig = Object.keys(config).length > 0 ? config : undefined
            return ai.models.generateContent({
                model: validatedModel,
                contents: { parts },
                config: { responseModalities: [Modality.IMAGE], imageConfig }
            })
        })

    const responses = await Promise.all(promises)
    return extractImagesFromResponse(responses, outputFormat)
}
