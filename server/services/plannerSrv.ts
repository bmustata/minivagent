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
- TEXT_GEN — Generate or process text. Inputs: prompt. Outputs: prompt, output.
- IMAGE_GEN — Generate images from text or reference images. Inputs: prompt, image. Outputs: image-0 to image-3.
- IMAGE_SOURCE — Provide an input image (upload or URL). Inputs: none. Outputs: image.
- IMAGE_TO_TEXT — Analyze/describe images with a vision model. Inputs: prompt, image. Outputs: output.
- NOTE — Static text / documentation. Inputs: none. Outputs: prompt.
- COMPARE — Side-by-side image comparison (passthrough, no AI). Inputs: image (×2). Outputs: image-0, image-1.
- SPLIT_TEXT — Split text into parts by a separator. Inputs: prompt. Outputs: split-0, split-1, … split-N.

**Output Format:**
Return a single JSON object with "nodes" and "edges" arrays.

Node Structure:
{
  "id": "string (1, 2, 3...)",
  "type": "NodeType",
  "position": { "x": number, "y": number },
  "data": {
    "prompt": "string (filled based on user intent)",
    "imageCount": number (1-4, IMAGE_GEN only),
    "aspectRatio": "1:1" | "16:9" | "9:16" | "4:3" | "3:4" (IMAGE_GEN only),
    "imageInputType": "UPLOAD" | "URL" (IMAGE_SOURCE and IMAGE_TO_TEXT),
    "compareMode": "slider" | "toggle" (COMPARE only),
    "splitSeparator": "====" (SPLIT_TEXT only, default "===="),
    "includeSplitSeparator": boolean (TEXT_GEN only — adds ==== separator instruction to prompt)
  }
}

Edge Structure:
{
  "id": "string (e.g., e925431)",
  "source": "source_node_id",
  "target": "target_node_id",
  "sourceHandle": "prompt" | "output" | "image-0" | "image-1" | "split-0" | "split-1",
  "targetHandle": "prompt" | "image"
}

**Layout Rules:**
1. Lay out nodes logically (Left -> Right flow). Spacing: X ~350, Y ~200.
2. Multiple branches should be spread vertically (Y offset ~200 per branch).

**Common Patterns:**
- "Image variations" → IMAGE_SOURCE → IMAGE_GEN
- "Story with images" → TEXT_GEN (includeSplitSeparator) → SPLIT_TEXT → IMAGE_GEN (×N)
- "Describe image" → IMAGE_SOURCE → IMAGE_TO_TEXT
- "Generate text then image" → TEXT_GEN → IMAGE_GEN
- "Compare two generations" → IMAGE_GEN + IMAGE_GEN → COMPARE
- "Multi-scene story" → TEXT_GEN (includeSplitSeparator) → SPLIT_TEXT → multiple IMAGE_GEN nodes

**Rules:**
1. Use NOTE only for static/instructional text, not for AI generation.
2. COMPARE is passthrough — never connect it to TEXT_GEN or IMAGE_TO_TEXT outputs.
3. SPLIT_TEXT split-N handles are 0-indexed and match the expected number of parts.
4. Do not include markdown formatting or explanations. JUST JSON.
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
