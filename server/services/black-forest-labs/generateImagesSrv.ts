import { replicate } from '../../utils/const.ts'

export interface BFLGenerateImagesOptions {
    promptToSend: string
    count: number
    referenceImages?: string[]
    aspectRatio?: string
    outputFormat?: string
    validatedModel: string
}

// Maps model identifier → API input field name for reference images
const REF_IMAGE_FIELD: Record<string, { field: string; isArray: boolean }> = {
    'black-forest-labs/flux-dev': { field: 'image', isArray: false },
    'black-forest-labs/flux-1.1-pro': { field: 'image_prompt', isArray: false },
    'black-forest-labs/flux-2-dev': { field: 'input_images', isArray: true },
    'black-forest-labs/flux-2-klein-4b': { field: 'images', isArray: true },
    'black-forest-labs/flux-2-max': { field: 'input_images', isArray: true }
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
    const { promptToSend, count, referenceImages = [], aspectRatio, outputFormat, validatedModel } = options

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
                    ...buildRefImageInput()
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
