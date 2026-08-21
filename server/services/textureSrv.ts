import sharp from 'sharp'
import { pixelateImage } from './pixelateSrv.ts'

/**
 * Applies a pixel-art downscale to a texture image.
 * Uses palette-off mode to preserve natural texture colors.
 */
export async function pixelateTexture(buffer: Buffer, size: number, outputFormat: string = 'PNG'): Promise<Buffer> {
    return pixelateImage(buffer, size, false, 32, false, outputFormat)
}

/**
 * Resizes a texture image to an exact square resolution.
 * Uses nearest-neighbor when pixelated (preserves crisp pixels), lanczos3 otherwise.
 */
export async function resizeTexture(buffer: Buffer, resolution: number, outputFormat: string = 'PNG', pixelated: boolean = false): Promise<Buffer> {
    const fmt = outputFormat.toUpperCase()
    const kernel = pixelated ? ('nearest' as const) : ('lanczos3' as const)
    let pipeline = sharp(buffer).resize(resolution, resolution, { fit: 'fill', kernel })
    if (fmt === 'PNG') pipeline = pipeline.png()
    else if (fmt === 'JPEG') pipeline = pipeline.jpeg({ quality: 90 })
    else if (fmt === 'WEBP') pipeline = pipeline.webp({ quality: 90 })
    return pipeline.toBuffer()
}

/**
 * Builds the seamless texture prompt from a user description.
 * Always prepends the tileable requirements so the model generates a seamless result.
 */
export function buildTexturePrompt(userPrompt: string): string {
    const requirements = [
        'perfectly seamless on all four edges',
        'left edge continues naturally into right edge',
        'top edge continues naturally into bottom edge',
        'no visible seams when tiled repeatedly',
        'flat front-facing texture',
        'orthographic',
        'no perspective',
        'flat diffuse lighting',
        'no directional shadows',
        'no borders',
        'no single large feature',
        'small details distributed evenly across the image',
        'designed specifically as a repeating game texture',
    ].join(', ')

    const base = userPrompt.trim()
    return base
        ? `Create a seamless tileable texture: ${base}. ${requirements}`
        : `Create a seamless tileable texture. ${requirements}`
}
