import { replicate } from '../../utils/const.ts'

export interface BFLGenerateImagesOptions {
    promptToSend: string // Final prompt after enhancement/merging. e.g. "A photorealistic sunset over the ocean"
    count: number // Number of images to generate (N parallel requests). e.g. 2
    referenceImages?: string[] // Base64 data URIs for image-to-image / multi-reference editing. e.g. ["data:image/jpeg;base64,..."]
    aspectRatio?: string // Passed directly to the Replicate API. e.g. "16:9"
    outputFormat?: string // Desired format, normalised to 'png' | 'jpg' | 'webp'. e.g. "PNG"
    preset?: string // App-level label mapped to a Replicate resolution string. e.g. "2K" → "2 MP"
    validatedModel: string // Fully-qualified Replicate model identifier. e.g. "black-forest-labs/flux-2-pro"
}

// Models that accept a `resolution` string param (e.g. "1 MP", "2 MP", "4 MP")
const RESOLUTION_MODELS = new Set(['black-forest-labs/flux-2-pro', 'black-forest-labs/flux-2-max'])

// Maps app preset label → Replicate resolution string
const PRESET_TO_RESOLUTION: Record<string, string> = {
    '0.5K': '0.5 MP',
    '1K': '1 MP',
    '2K': '2 MP',
    '4K': '4 MP'
}

// Maps model identifier → API input field name for reference images
const REF_IMAGE_FIELD: Record<string, { field: string; isArray: boolean }> = {
    'black-forest-labs/flux-dev': { field: 'image', isArray: false },
    'black-forest-labs/flux-1.1-pro': { field: 'image_prompt', isArray: false },
    'black-forest-labs/flux-2-dev': { field: 'input_images', isArray: true },
    'black-forest-labs/flux-2-pro': { field: 'input_images', isArray: true },
    'black-forest-labs/flux-2-klein-4b': { field: 'images', isArray: true },
    'black-forest-labs/flux-2-max': { field: 'input_images', isArray: true }
}

// Safety config per model — safety_tolerance (max permissive) or disable_safety_checker: true
const SAFETY_INPUT: Record<string, Record<string, unknown>> = {
    'black-forest-labs/flux-schnell': { disable_safety_checker: true },
    'black-forest-labs/flux-dev': { disable_safety_checker: true },
    'black-forest-labs/flux-1.1-pro': { safety_tolerance: 6 },
    'black-forest-labs/flux-2-dev': { disable_safety_checker: true },
    'black-forest-labs/flux-2-pro': { safety_tolerance: 5 },
    'black-forest-labs/flux-2-klein-4b': { disable_safety_checker: true },
    'black-forest-labs/flux-2-max': { safety_tolerance: 5 }
}

const dataUriToBuffer = (dataUri: string): Buffer => {
    const match = dataUri.match(/^data:.*?;base64,(.+)$/)
    if (!match) throw new Error('Invalid data URI for reference image')
    return Buffer.from(match[1], 'base64')
}

const normalizeOutputFormat = (format?: string): 'png' | 'jpg' | 'webp' => {
    if (!format) return 'webp'
    const lower = format.toLowerCase()
    if (lower === 'jpeg' || lower === 'jpg') return 'jpg'
    if (lower === 'png') return 'png'
    return 'webp'
}

export const bflGenerateImages = async (options: BFLGenerateImagesOptions): Promise<string[]> => {
    const { promptToSend, count, referenceImages = [], aspectRatio, outputFormat, preset, validatedModel } = options

    if (!promptToSend.trim()) throw new Error('Prompt is required for Black Forest Labs models.')

    const format = normalizeOutputFormat(outputFormat)
    const refFieldConfig = REF_IMAGE_FIELD[validatedModel]

    const buildRefImageInput = (): Record<string, unknown> => {
        if (!refFieldConfig || referenceImages.length === 0) return {}
        const buffers = referenceImages.map(dataUriToBuffer)
        if (refFieldConfig.isArray) return { [refFieldConfig.field]: buffers }
        return { [refFieldConfig.field]: buffers[0] }
    }

    const promises = Array(count)
        .fill(null)
        .map(() =>
            replicate!.run(validatedModel as `${string}/${string}`, {
                input: {
                    prompt: promptToSend,
                    num_outputs: 1,
                    output_format: format,
                    ...(aspectRatio ? { aspect_ratio: aspectRatio } : {}),
                    ...(preset && RESOLUTION_MODELS.has(validatedModel) && PRESET_TO_RESOLUTION[preset] ? { resolution: PRESET_TO_RESOLUTION[preset] } : {}),
                    ...buildRefImageInput(),
                    ...(SAFETY_INPUT[validatedModel] ?? {})
                }
            })
        )

    const outputs = await Promise.all(promises)

    const images: string[] = []
    const mimeType = format === 'jpg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp'

    for (const output of outputs) {
        const items = Array.isArray(output) ? output : [output]
        for (const item of items) {
            const response = await fetch(item.toString())
            const arrayBuffer = await response.arrayBuffer()
            const base64 = Buffer.from(arrayBuffer).toString('base64')
            images.push(`data:${mimeType};base64,${base64}`)
        }
    }

    return images
}
