import dotenv from 'dotenv'
import { resolve } from 'path'
import { GoogleGenAI } from '@google/genai'
import { logger } from './logger.ts'

// Load env files in priority order: process.env > .env.local > .env
// dotenv does not override existing process.env values, so we load
// higher-priority files first and lower-priority ones after.
const root = resolve(process.cwd())
dotenv.config({ path: resolve(root, '.env.local'), quiet: true })
dotenv.config({ path: resolve(root, '.env'), quiet: true })

const imagegen = true

// Model constants — the first entry in each category is the default model
export const MODELS = {
    TEXT: [
        { name: 'Gemini Flash 2.5', model: 'gemini-2.5-flash', options: {} },
        { name: 'Gemini Flash 3', model: 'gemini-3-flash-preview', options: {} },
        { name: 'Gemini Flash 3.1 Lite', model: 'gemini-3.1-flash-lite-preview', options: {} }
    ],
    IMAGE: [
        { name: 'Nano Banana 1 (2.5 Flash)', model: 'gemini-2.5-flash-image', options: {} },
        {
            name: 'Nano Banana Pro (3 Pro)',
            model: 'gemini-3-pro-image-preview',
            options: {
                presets: ['1K', '2K', '4K']
            }
        },
        {
            name: 'Nano Banana 2 (3.1 Flash)',
            model: 'gemini-3.1-flash-image-preview',
            options: {
                presets: ['0.5K', '1K', '2K', '4K']
            }
        },
        { name: 'Imagen 4', model: 'imagen-4.0-generate-001', options: { imagegen, presets: ['1K', '2K'] } },
        { name: 'Imagen 4 Fast', model: 'imagen-4.0-fast-generate-001', options: { imagegen } },
        { name: 'Imagen 4 Ultra', model: 'imagen-4.0-ultra-generate-001', options: { imagegen, presets: ['1K', '2K'] } }
    ],
    VISION: [
        { name: 'Gemini Flash 2.5', model: 'gemini-2.5-flash', options: {} },
        { name: 'Gemini Flash 3', model: 'gemini-3-flash-preview', options: {} }
    ],
    PLANNER: [{ name: 'Gemini Flash 2.5', model: 'gemini-2.5-flash', options: {} }]
} as const

// Check and validate API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
if (!GEMINI_API_KEY) {
    logger.error('❌ GEMINI_API_KEY is not set in environment variables')
    throw new Error('GEMINI_API_KEY is required')
}
if (GEMINI_API_KEY.length < 20) {
    logger.error(`❌ GEMINI_API_KEY is too short (length: ${GEMINI_API_KEY.length})`)
    throw new Error('GEMINI_API_KEY appears invalid')
}
logger.info(`✓ GEMINI_API_KEY found (length: ${GEMINI_API_KEY.length})`)

// Initialize Gemini AI
export const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

// Valid aspect ratios for image generation
export const IMAGE_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const
