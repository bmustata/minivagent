import { ai } from '../utils/const.ts'
import { MODELS } from '../config.ts'
import { validateModel } from '../utils/modelUtils.ts'

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

const PLANNER_SYSTEM_INSTRUCTION = `
You are an AI Flow Planner for "minivagent", a node-based generative AI tool.
Your task is to interpret a user's natural language request and return a JSON object representing a graph of nodes and edges.

**Available Node Types:**
- TEXT_GEN (For text generation/processing)
- IMAGE_GEN (For generating images from text or image prompts. Params: aspect_ratio, image_count)
- IMAGE_SOURCE (For uploading or linking an input image)
- IMAGE_TO_TEXT (Vision model to describe images)
- NOTE (Static text notes)

**Output Format:**
Return a single JSON object with "nodes" and "edges" arrays.

Node Structure:
{
  "id": "string (1, 2, 3...)",
  "type": "NodeType",
  "position": { "x": number, "y": number },
  "data": {
    "prompt": "string (filled based on user intent)",
    "imageCount": number (1-4, only for IMAGE_GEN),
    "aspectRatio": "1:1" | "16:9" | "9:16" | "4:3" | "3:4" (only for IMAGE_GEN),
    "imageInputType": "UPLOAD" | "URL" (for SOURCE/VISION)
  }
}

Edge Structure:
{
  "id": "string (e.g., e925431)",
  "source": "source_node_id",
  "target": "target_node_id",
  "sourceHandle": "prompt" | "output" | "image-0",
  "targetHandle": "prompt" | "image"
}

**Rules:**
1. Lay out nodes logically (Left -> Right flow). spacing X ~350, Y ~200.
2. "Image variations" usually implies: IMAGE_SOURCE -> IMAGE_GEN.
3. "Story about X with image" implies: TEXT_GEN -> IMAGE_GEN.
4. "Describe image" implies: IMAGE_SOURCE -> IMAGE_TO_TEXT.
5. Do not include markdown formatting or explanations. JUST JSON.
`

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
