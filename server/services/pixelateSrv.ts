import sharp from 'sharp'
import { logger } from '../utils/logger.ts'

/**
 * Applies a pixel-art effect to an image buffer:
 * 1. Optionally flatten transparency to white
 * 2. Downscale to size×size (inside fit, nearest-neighbor) — output IS this resolution
 * 3. Optionally reduce to N-color palette with Floyd-Steinberg dithering
 */
export async function pixelateImage(
    buffer: Buffer,
    size: number,
    paletteEnabled: boolean,
    paletteSize: number,
    preserveAlpha: boolean
): Promise<Buffer> {
    const meta = await sharp(buffer).metadata()
    const origWidth = meta.width ?? 512
    const origHeight = meta.height ?? 512

    let pipeline = sharp(buffer)

    if (!preserveAlpha) {
        pipeline = pipeline.flatten({ background: '#ffffff' })
    }

    // Downscale to pixel grid — output resolution equals size×size (aspect-ratio preserved)
    pipeline = pipeline.resize(size, size, { fit: 'inside', kernel: 'nearest' })

    let result: Buffer
    if (paletteEnabled) {
        result = await pipeline
            .png({ palette: true, colours: Math.max(2, Math.min(256, paletteSize)), dither: 1.0 })
            .toBuffer()
    } else {
        result = await pipeline.png().toBuffer()
    }

    const paletteNote = paletteEnabled ? `, ${paletteSize} colors` : ', no palette'
    logger.info(`pixelateImage: ${origWidth}×${origHeight} → ${size}px${paletteNote}`)
    return result
}
