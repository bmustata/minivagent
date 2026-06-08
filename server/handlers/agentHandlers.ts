import type { Request, Response } from 'express'
import { startTimer } from '../utils/observabilityUtils.ts'
import { logger } from '../utils/logger.ts'
import { randomUUID } from 'crypto'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createAgent, tool } from 'langchain'
import { MemorySaver } from '@langchain/langgraph'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { z } from 'zod'
import { planGraph } from '../services/plannerSrv.ts'
import { MODELS } from '../config.ts'

interface Message {
    role: 'user' | 'assistant'
    content: string
    currentGraph?: unknown
    timestamp: number
}

interface Session {
    id: string
    messages: Message[]
    createdAt: number
}

// In-memory session store
const sessions = new Map<string, Session>()

// --- ReAct Agent setup ---

const AGENT_SYSTEM_PROMPT = readFileSync(resolve(process.cwd(), 'server/prompts/planner-system.md'), 'utf-8')

const model = new ChatGoogleGenerativeAI({
    model: MODELS.PLANNER[0].model,
    apiKey: process.env.GEMINI_API_KEY
})

const planGraphTool = tool(
    async ({ description, currentGraph }: { description: string; currentGraph?: string }) => {
        const fullDescription = currentGraph ? `${description}\n\n<currentGraph>${currentGraph}</currentGraph>` : description
        const result = await planGraph(fullDescription)
        return JSON.stringify(result)
    },
    {
        name: 'plan_graph',
        description:
            'Plan, add to, or modify a workflow graph. Call this ONLY when the user explicitly wants to create, build, add, update or redesign a workflow or nodes. Do NOT call this for explain/describe/show/list requests.',
        schema: z.object({
            description: z.string().describe('Natural language description of what to build or change'),
            currentGraph: z.string().optional().describe('JSON string of the current graph from <currentGraph> block, if the user wants to modify or extend it')
        })
    }
)

const checkpointer = new MemorySaver()

const reactAgent = createAgent({
    model,
    tools: [planGraphTool],
    checkpointer,
    systemPrompt: AGENT_SYSTEM_PROMPT
})

// --------------------------

/**
 * Get an existing session (to restore it after page reload)
 * GET /api/agent/session/:id
 */
export const getSession = (req: Request, res: Response): void => {
    const id = req.params.id as string
    const session = sessions.get(id)
    if (!session) {
        res.status(404).json({ error: `Session not found: ${id}` })
        return
    }
    res.json({ id, createdAt: session.createdAt, messages: session.messages })
}

/**
 * Create a new agent session
 * POST /api/agent/session
 */
export const createSession = (_req: Request, res: Response): void => {
    const timer = startTimer()
    const id = randomUUID()
    const session: Session = { id, messages: [], createdAt: Date.now() }
    sessions.set(id, session)
    logger.info(`POST /api/agent/session - created session: ${id} - ✓ time: ${timer.stop()}`)
    res.status(201).json({ id, createdAt: session.createdAt })
}

/**
 * Add a message to an existing session and run the ReAct agent
 * POST /api/agent/session/:id
 */
export const addMessage = async (req: Request, res: Response): Promise<void> => {
    const timer = startTimer()
    const id = req.params.id as string
    const { content, currentGraph } = req.body
    logger.info(`POST /api/agent/session/${id} - content: ${content?.slice(0, 120)}${content?.length > 120 ? '…' : ''}`)

    const session = sessions.get(id)
    if (!session) {
        res.status(404).json({ error: `Session not found: ${id}` })
        return
    }

    if (!content || typeof content !== 'string') {
        res.status(400).json({ error: 'content is required and must be a string' })
        return
    }

    // Store user message
    const userMessage: Message = { role: 'user', content, currentGraph, timestamp: Date.now() }
    session.messages.push(userMessage)

    // Build agent input — inject currentGraph as context in the latest message
    let agentContent = content
    if (currentGraph) {
        agentContent = `${content}\n\n<currentGraph>${JSON.stringify(currentGraph, null, 2)}</currentGraph>`
    }

    // Build full message history so the agent has conversation context even after server restarts
    const historyMessages = session.messages.slice(0, -1).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
    }))
    const agentMessages = [...historyMessages, { role: 'user' as const, content: agentContent }]

    const humanSize = (s: string) => (s.length < 1024 ? `${s.length} chars` : `${(s.length / 1024).toFixed(1)} KB`)
    logger.info(`POST /api/agent/session/${id} - sending ${agentMessages.length} msgs, input: ${humanSize(agentContent)}`)

    // Run ReAct agent (thread_id scopes the checkpointer state)
    const result = await reactAgent.invoke({ messages: agentMessages }, { configurable: { thread_id: id } })

    const lastMessage = result.messages.at(-1)
    const replyContent = typeof lastMessage?.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage?.content ?? '')

    // Extract graphPlan from tool result messages (plan_graph tool calls)
    let graphPlan: unknown | undefined
    for (const msg of result.messages) {
        if ((msg as any).name === 'plan_graph' && typeof (msg as any).content === 'string') {
            try {
                graphPlan = JSON.parse((msg as any).content)
            } catch {
                // ignore parse errors
            }
        }
    }

    // Store assistant message
    const assistantMessage: Message = { role: 'assistant', content: replyContent, timestamp: Date.now() }
    session.messages.push(assistantMessage)

    logger.info(`POST /api/agent/session/${id} - ✓ reply: ${humanSize(replyContent)} graphPlan: ${graphPlan ? 'yes' : 'no'} time: ${timer.stop()}\n${replyContent}`)
    res.json({ id, reply: replyContent, graphPlan, messages: session.messages })
}

/**
 * Delete a session
 * DELETE /api/agent/session/:id
 */
export const deleteSession = (req: Request, res: Response): void => {
    const timer = startTimer()
    const id = req.params.id as string
    logger.info(`DELETE /api/agent/session/${id}`)

    if (!sessions.has(id)) {
        res.status(404).json({ error: `Session not found: ${id}` })
        return
    }

    sessions.delete(id)
    logger.info(`DELETE /api/agent/session/${id} - ✓ time: ${timer.stop()}`)
    res.status(204).send()
}
