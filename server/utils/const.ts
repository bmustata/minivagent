import dotenv from 'dotenv'
import { resolve } from 'path'
import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import Replicate from 'replicate'
import { logger } from './logger.ts'

// Load env files in priority order: process.env > .env.local > .env
// dotenv does not override existing process.env values, so we load
// higher-priority files first and lower-priority ones after.
const root = resolve(process.cwd())
dotenv.config({ path: resolve(root, '.env.local'), quiet: true })
dotenv.config({ path: resolve(root, '.env'), quiet: true })

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

// Initialize OpenAI (optional — only required when OpenAI models are used)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
if (OPENAI_API_KEY) {
    logger.info(`✓ OPENAI_API_KEY found (length: ${OPENAI_API_KEY.length})`)
} else {
    logger.info('ℹ OPENAI_API_KEY not set — OpenAI models will be unavailable')
}
export const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null

// Initialize Replicate (optional — only required when Black Forest Labs models are used)
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN
if (REPLICATE_API_TOKEN) {
    logger.info(`✓ REPLICATE_API_TOKEN found (length: ${REPLICATE_API_TOKEN.length})`)
} else {
    logger.info('ℹ REPLICATE_API_TOKEN not set — Black Forest Labs models will be unavailable')
}
export const replicate = REPLICATE_API_TOKEN ? new Replicate({ auth: REPLICATE_API_TOKEN }) : null

// Valid aspect ratios for image generation
export const IMAGE_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const
