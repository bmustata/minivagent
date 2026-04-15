import { replicate } from '../../utils/const.ts'

export interface BFLGenerateImagesOptions {
    promptToSend: string
    count: number
    aspectRatio?: string
    outputFormat?: string
    validatedModel: string
}

const normalizeOutputFormat = (format?: string): 'png' | 'jpg' | 'webp' => {
    if (!format) return 'webp'
    const lower = format.toLowerCase()
    if (lower === 'jpeg' || lower === 'jpg') return 'jpg'
    if (lower === 'png') return 'png'
    return 'webp'
}

export const bflGenerateImages = async (options: BFLGenerateImagesOptions): Promise<string[]> => {
    const { promptToSend, count, aspectRatio, outputFormat, validatedModel } = options

    if (!promptToSend.trim()) throw new Error('Prompt is required for Black Forest Labs models.')

    const format = normalizeOutputFormat(outputFormat)

    const promises = Array(count)
        .fill(null)
        .map(() =>
            replicate!.run(validatedModel as `${string}/${string}`, {
                input: {
                    prompt: promptToSend,
                    num_outputs: 1,
                    output_format: format,
                    ...(aspectRatio ? { aspect_ratio: aspectRatio } : {})
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
