import { ai } from '../utils/const.ts'
import { MODELS } from '../config.ts'
import { validateModel } from '../utils/modelUtils.ts'
import { readFileSync } from 'fs'
import { resolve } from 'path'

export interface PlanGraphResult {
    nodes: Array<{
        id: string
        type: string
        position: { x: number; y: number }
        data: Record<string, unknown>
    }>
    edges: Array<{
        id: string
        source: string
        target: string
        sourceHandle?: string
        targetHandle?: string
    }>
}

const PLANNER_SYSTEM_INSTRUCTION = readFileSync(resolve(process.cwd(), 'server/prompts/planner-system.md'), 'utf-8')

/**
 * Plan a graph from natural language description
 */
export const planGraph = async (prompt: string, model?: string): Promise<PlanGraphResult> => {
    const validatedModel = validateModel(model, 'PLANNER')

    const response = await ai.models.generateContent({
        model: validatedModel,
        contents: prompt,
        config: {
            systemInstruction: PLANNER_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json'
        }
    })

    const text = response.text?.trim()
    if (!text) {
        throw new Error('Empty response from planner.')
    }

    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '')
    return JSON.parse(jsonStr) as PlanGraphResult
}
