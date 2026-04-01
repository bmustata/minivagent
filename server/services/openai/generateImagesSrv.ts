import sharp from 'sharp'
import { openai } from '../../utils/const.ts'

export interface OpenAIGenerateImagesOptions {
    promptToSend: string
    count: number
    aspectRatio?: string
    outputFormat?: string
    validatedModel: string
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

// Models that do NOT support response_format (always return b64_json)
const MODELS_WITHOUT_RESPONSE_FORMAT = ['gpt-image-1-mini', 'gpt-image-1.5', 'gpt-image-1']

// Map aspect ratio (e.g. '1:1') to OpenAI size string (e.g. '1024x1024')
const ASPECT_RATIO_TO_SIZE: Record<string, string> = {
    '1:1': '1024x1024',
    '16:9': '1536x1024',
    '9:16': '1024x1536',
    '4:3': '1536x1024',
    '3:4': '1024x1536'
}

export const openaiGenerateImages = async (options: OpenAIGenerateImagesOptions): Promise<string[]> => {
    if (!openai) throw new Error('OPENAI_API_KEY is not configured.')

    const { promptToSend, count, aspectRatio, outputFormat, validatedModel } = options

    if (!promptToSend.trim()) throw new Error('Prompt is required for OpenAI image models.')

    const targetFormat = normalizeOutputFormat(outputFormat)
    const openaiFormat = targetFormat === 'jpeg' ? 'jpeg' : 'png'
    const supportsResponseFormat = !MODELS_WITHOUT_RESPONSE_FORMAT.includes(validatedModel)
    const size = aspectRatio ? (ASPECT_RATIO_TO_SIZE[aspectRatio] ?? '1024x1024') : undefined

    const promises = Array(count)
        .fill(null)
        .map(() =>
            openai!.images.generate({
                model: validatedModel,
                prompt: promptToSend,
                n: 1,
                ...(supportsResponseFormat ? { response_format: 'b64_json' } : {}),
                ...(size ? { size: size as never } : {})
            })
        )

    const responses = await Promise.all(promises)
    const images: string[] = []
    for (const response of responses) {
        for (const item of response.data) {
            if (!item.b64_json) continue
            let base64 = item.b64_json
            let mimeType: string = `image/${openaiFormat}`
            if (targetFormat && targetFormat !== 'png') {
                base64 = await convertImageFormat(base64, targetFormat)
                mimeType = `image/${targetFormat}`
            }
            images.push(`data:${mimeType};base64,${base64}`)
        }
    }
    return images
}
