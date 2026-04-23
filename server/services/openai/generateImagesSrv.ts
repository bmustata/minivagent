import { toFile } from 'openai'
import sharp from 'sharp'
import { openai } from '../../utils/const.ts'

export interface OpenAIGenerateImagesOptions {
    promptToSend: string // Final prompt after enhancement/merging. e.g. "A photorealistic sunset over the ocean"
    count: number // Number of images to generate (N parallel requests). e.g. 2
    referenceImages?: string[] // Base64 data URIs for reference-image editing. e.g. ["data:image/jpeg;base64,..."]
    aspectRatio?: string // Mapped to OpenAI size string via ASPECT_RATIO_TO_SIZE. e.g. "16:9" → "1536x1024"
    outputFormat?: string // Desired format, normalised to 'png' | 'jpeg'. e.g. "JPEG"
    preset?: string // App-level size label for gpt-image-2 generations. e.g. "2K" → "2048x2048"
    validatedModel: string // OpenAI model identifier. e.g. "gpt-image-1.5"
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
const MODELS_WITHOUT_RESPONSE_FORMAT = ['gpt-image-1-mini', 'gpt-image-1.5', 'gpt-image-1', 'gpt-image-2']

// Map aspect ratio (e.g. '1:1') to OpenAI size string (e.g. '1024x1024')
const ASPECT_RATIO_TO_SIZE: Record<string, string> = {
    '1:1': '1024x1024',
    '16:9': '1536x1024',
    '9:16': '1024x1536',
    '4:3': '1536x1024',
    '3:4': '1024x1536'
}

// Map app preset label → size for gpt-image-2 generations endpoint
const PRESET_TO_SIZE: Record<string, string> = {
    '1K': '1024x1024',
    '2K': '2048x2048',
    '4K': '3840x2160'
}

const dataUriToFile = async (dataUri: string, index: number): Promise<File> => {
    const match = dataUri.match(/^data:(.*?);base64,(.+)$/)
    if (!match) throw new Error(`Invalid data URI for reference image at index ${index}`)
    const mimeType = match[1]
    const buffer = Buffer.from(match[2], 'base64')
    const ext = mimeType.includes('jpeg') ? 'jpg' : 'png'
    return toFile(buffer, `image-${index}.${ext}`, { type: mimeType })
}

const extractImages = async (response: { data?: Array<{ b64_json?: string }> }, targetFormat: 'png' | 'jpeg' | undefined, openaiFormat: string): Promise<string[]> => {
    const images: string[] = []
    for (const item of response.data ?? []) {
        if (!item.b64_json) continue
        let base64 = item.b64_json
        let mimeType: string = `image/${openaiFormat}`
        if (targetFormat && targetFormat !== 'png') {
            base64 = await convertImageFormat(base64, targetFormat)
            mimeType = `image/${targetFormat}`
        }
        images.push(`data:${mimeType};base64,${base64}`)
    }
    return images
}

export const openaiGenerateImages = async (options: OpenAIGenerateImagesOptions): Promise<string[]> => {
    if (!openai) throw new Error('OPENAI_API_KEY is not configured.')

    const { promptToSend, count, referenceImages = [], aspectRatio, outputFormat, preset, validatedModel } = options

    if (!promptToSend.trim()) throw new Error('Prompt is required for OpenAI image models.')

    const targetFormat = normalizeOutputFormat(outputFormat)
    const openaiFormat = targetFormat === 'jpeg' ? 'jpeg' : 'png'
    const aspectSize = aspectRatio ? (ASPECT_RATIO_TO_SIZE[aspectRatio] ?? '1024x1024') : undefined

    if (referenceImages.length > 0) {
        // Use the edits endpoint when reference images are provided.
        // Preset-based sizes are only valid for gpt-image-2 generations, so use aspect ratio here.
        const imageFiles = await Promise.all(referenceImages.map((img, i) => dataUriToFile(img, i)))
        const promises = Array(count)
            .fill(null)
            .map(() =>
                openai!.images.edit({
                    model: validatedModel,
                    prompt: promptToSend,
                    image: imageFiles as never,
                    n: 1,
                    ...(aspectSize ? { size: aspectSize as never } : {})
                })
            )
        const responses = await Promise.all(promises)
        const images: string[] = []
        for (const response of responses) {
            images.push(...(await extractImages(response, targetFormat, openaiFormat)))
        }
        return images
    }

    // No reference images — use the generations endpoint.
    // Preset takes priority over aspect ratio for gpt-image-2.
    const size = (preset ? PRESET_TO_SIZE[preset] : undefined) ?? aspectSize
    const supportsResponseFormat = !MODELS_WITHOUT_RESPONSE_FORMAT.includes(validatedModel)

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
        images.push(...(await extractImages(response, targetFormat, openaiFormat)))
    }
    return images
}
