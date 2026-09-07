import sharp from 'sharp'
import { logger } from '../utils/logger.ts'

/**
 * Pixel-art pipeline (grid-aware block reduction):
 *
 * Source image
 *   ↓ optional flatten (alpha → white)
 *   ↓ slight pre-blur (reduces noise so blocks read cleaner)
 *   ↓ divide into NxN blocks matching the target pixel grid
 *   ↓ pick dominant color per block (mode, color-quantized to reduce noise)
 *   ↓ optional palette quantization + Floyd-Steinberg dithering
 *   ↓ optional alpha cleanup (near-transparent → fully transparent)
 */

export async function pixelateImage(buffer: Buffer, size: number, paletteEnabled: boolean, paletteSize: number, preserveAlpha: boolean, outputFormat: string = 'PNG'): Promise<Buffer> {
    const meta = await sharp(buffer).metadata()
    const origWidth = meta.width ?? 512
    const origHeight = meta.height ?? 512

    // Step 1: flatten alpha if not preserving, apply light pre-blur
    let prep = sharp(buffer)
    if (!preserveAlpha) prep = prep.flatten({ background: '#ffffff' })
    prep = prep.blur(0.8) // mild prefilter — smooths AI noise before block sampling

    // Step 2: get raw pixel data
    const { data, info } = await prep.raw().toBuffer({ resolveWithObject: true })
    const pixels = new Uint8Array(data.buffer)
    const { width: imgW, height: imgH, channels } = info

    // Step 3: compute target dimensions (preserve aspect ratio within size×size)
    const aspect = imgW / imgH
    const targetW = aspect >= 1 ? size : Math.max(1, Math.round(size * aspect))
    const targetH = aspect >= 1 ? Math.max(1, Math.round(size / aspect)) : size

    // Step 4: block reduction — dominant color per output pixel
    const outCh = preserveAlpha ? 4 : 3
    const outBuf = Buffer.alloc(targetW * targetH * outCh)

    for (let py = 0; py < targetH; py++) {
        for (let px = 0; px < targetW; px++) {
            const x0 = Math.floor((px / targetW) * imgW)
            const y0 = Math.floor((py / targetH) * imgH)
            const x1 = Math.min(Math.floor(((px + 1) / targetW) * imgW), imgW - 1)
            const y1 = Math.min(Math.floor(((py + 1) / targetH) * imgH), imgH - 1)

            const [r, g, b, a] = dominantColor(pixels, x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0), imgW, channels)

            const outIdx = (py * targetW + px) * outCh
            outBuf[outIdx] = r
            outBuf[outIdx + 1] = g
            outBuf[outIdx + 2] = b
            if (outCh === 4) {
                // Step 5: alpha cleanup — snap near-transparent pixels to fully transparent
                outBuf[outIdx + 3] = a < 30 ? 0 : a > 225 ? 255 : a
            }
        }
    }

    // Step 6: palette quantization (Sharp palette requires PNG as intermediate)
    const outPipeline = sharp(outBuf, { raw: { width: targetW, height: targetH, channels: outCh } })
    let intermediate: Buffer
    if (paletteEnabled) {
        intermediate = await outPipeline.png({ palette: true, colours: Math.max(2, Math.min(256, paletteSize)), dither: 1.0 }).toBuffer()
    } else {
        intermediate = await outPipeline.png().toBuffer()
    }

    // Step 7: encode to final output format (always applied after palette so format is always respected)
    const result = outputFormat === 'JPEG'
        ? await sharp(intermediate).jpeg({ quality: 95 }).toBuffer()
        : intermediate

    const paletteNote = paletteEnabled ? `, ${paletteSize} colors` : ', no palette'
    logger.info(`pixelateImage: ${origWidth}×${origHeight} → ${targetW}×${targetH}${paletteNote}, ${outputFormat}`)
    return result
}

/** Find the dominant color in a block using mode with light color quantization to absorb noise. */
function dominantColor(pixels: Uint8Array, startX: number, startY: number, blockW: number, blockH: number, imgW: number, channels: number): number[] {
    const QUANT = 12 // quantization step — smaller = more precise, larger = more noise-tolerant
    const freq = new Map<string, { count: number; r: number; g: number; b: number; a: number }>()

    for (let dy = 0; dy < blockH; dy++) {
        for (let dx = 0; dx < blockW; dx++) {
            const idx = ((startY + dy) * imgW + (startX + dx)) * channels
            const r = Math.round(pixels[idx] / QUANT) * QUANT
            const g = Math.round(pixels[idx + 1] / QUANT) * QUANT
            const b = Math.round(pixels[idx + 2] / QUANT) * QUANT
            const a = channels >= 4 ? pixels[idx + 3] : 255
            const key = `${r},${g},${b}`
            const entry = freq.get(key)
            if (entry) {
                entry.count++
            } else {
                freq.set(key, { count: 1, r, g, b, a })
            }
        }
    }

    let best = { count: 0, r: 0, g: 0, b: 0, a: 255 }
    for (const entry of freq.values()) {
        if (entry.count > best.count) best = entry
    }
    return [best.r, best.g, best.b, best.a]
}
