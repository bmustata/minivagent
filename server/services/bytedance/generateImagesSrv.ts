import sharp from 'sharp'
import { replicate } from '../../utils/const.ts'

// Models that always return JPEG and do not accept an output_format param
const JPEG_ONLY_MODELS = new Set(['bytedance/seedream-4.5'])

export interface BytedanceGenerateImagesOptions {
    promptToSend: string // Final prompt after enhancement/merging. e.g. "A cinematic sunset over Tokyo"
    count: number // Number of images to generate (N parallel requests). e.g. 2
    referenceImages?: string[] // Base64 data URIs for image-to-image / multi-reference editing. e.g. ["data:image/jpeg;base64,..."]
    aspectRatio?: string // Passed directly to the Replicate API. e.g. "16:9"
    outputFormat?: string // Desired format, normalised to 'png' | 'jpeg' | 'webp'. e.g. "PNG"
    preset?: string // App-level label mapped to the model's `size` param. e.g. "2K" → "2K"
    validatedModel: string // Fully-qualified Replicate model identifier. e.g. "bytedance/seedream-4.5"
}

const normalizeOutputFormat = (format?: string): 'png' | 'jpeg' | 'webp' => {
    if (!format) return 'png'
    const lower = format.toLowerCase()
    if (lower === 'jpeg' || lower === 'jpg') return 'jpeg'
    if (lower === 'webp') return 'webp'
    return 'png'
}

const dataUriToBuffer = (dataUri: string): Buffer => {
    const match = dataUri.match(/^data:.*?;base64,(.+)$/)
    if (!match) throw new Error('Invalid data URI for reference image')
    return Buffer.from(match[1], 'base64')
}

export const bytedanceGenerateImages = async (options: BytedanceGenerateImagesOptions): Promise<string[]> => {
    const { promptToSend, count, referenceImages = [], aspectRatio, outputFormat, preset, validatedModel } = options

    if (!promptToSend.trim()) throw new Error('Prompt is required for Bytedance models.')

    const format = normalizeOutputFormat(outputFormat)
    const jpegOnly = JPEG_ONLY_MODELS.has(validatedModel)
    // API only accepts 'png' or 'jpeg' — webp is produced via sharp post-processing (applies to all models incl. seedream-5-lite)
    const apiFormat: 'png' | 'jpeg' = format === 'webp' ? 'png' : format

    const buildRefImageInput = (): Record<string, unknown> => {
        if (referenceImages.length === 0) return {}
        return { image_input: referenceImages.map(dataUriToBuffer) }
    }

    const promises = Array(count)
        .fill(null)
        .map(() =>
            replicate!.run(validatedModel as `${string}/${string}`, {
                input: {
                    prompt: promptToSend,
                    ...(!jpegOnly ? { output_format: apiFormat } : {}),
                    ...(aspectRatio ? { aspect_ratio: aspectRatio } : {}),
                    ...(preset ? { size: preset } : {}),
                    ...buildRefImageInput()
                }
            })
        )

    const outputs = await Promise.all(promises)

    const images: string[] = []

    for (const output of outputs) {
        const items = Array.isArray(output) ? output : [output]
        for (const item of items) {
            const response = await fetch(item.toString())
            const arrayBuffer = await response.arrayBuffer()
            const needsConversion = (jpegOnly && format !== 'jpeg') || format === 'webp' // jpeg-only model returning non-jpeg, or webp requested (not a native API format)
            let base64: string
            let mimeType: string

            if (needsConversion) {
                const converted = await sharp(Buffer.from(arrayBuffer)).toFormat(format).toBuffer()
                base64 = converted.toString('base64')
                mimeType = `image/${format}`
            } else {
                base64 = Buffer.from(arrayBuffer).toString('base64')
                mimeType = `image/${apiFormat}`
            }

            images.push(`data:${mimeType};base64,${base64}`)
        }
    }

    return images
}
