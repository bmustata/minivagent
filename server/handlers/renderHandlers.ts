import * as path from 'path'
import type { Request, Response } from 'express'
import { executeNode, findGraphFile } from '../helpers/index.ts'
import { fileExists, readJsonFile } from '../utils/fileUtils.ts'
import { imageFormatBytes } from '../utils/imageUtils.ts'
import type { GraphData, GraphNode, GraphEdge } from '../utils/types.ts'
import { logger } from '../utils/logger.ts'
import { generateJobId, startTimer } from '../utils/index.ts'

const GRAPHS_DIR = path.join(process.cwd(), 'data', 'graphs')

const SSE = {
    JOB_START: 'job_start',
    JOB_DONE: 'job_done',
    JOB_ERROR: 'job_error',
    NODE_START: 'node_start',
    NODE_END: 'node_end'
} as const

interface RenderRunRequest {
    nodes?: GraphNode[]
    edges?: GraphEdge[]
    name?: string
}

/**
 * Dynamic render handler
 * POST /api/render/run
 * Executes a self-contained graph supplied entirely in the request body.
 * No graph file is needed — nodes, edges and name are all provided inline.
 * @param {GraphNode[]} nodes - Required: graph nodes to execute
 * @param {GraphEdge[]} [edges] - Optional: edges defining connections between nodes
 * @param {string} [name] - Optional: graph name for logging and response
 */
export const renderDynamic = async (req: Request, res: Response): Promise<void> => {
    try {
        const { nodes: rawNodes, edges: rawEdges, name } = req.body as RenderRunRequest
        const jobId = generateJobId()
        const timer = startTimer()

        logger.info(`POST /api/render/run`)
        logger.info(`[${jobId}] NEW JOB`)

        if (!Array.isArray(rawNodes) || rawNodes.length === 0) {
            logger.warn(`[${jobId}] POST /api/render/run - ✗ nodes array is required`)
            res.status(400).json({ error: 'nodes array is required' })
            return
        }

        const graphName = name || 'Unnamed Graph'
        const nodes: GraphNode[] = JSON.parse(JSON.stringify(rawNodes))
        const edges: GraphEdge[] = JSON.parse(JSON.stringify(rawEdges ?? []))

        const sorted = topologicalSort(nodes, edges)
        logger.info(`POST /api/render/run - execution order: ${sorted.join(' → ')}`)

        for (const nodeId of sorted) {
            const node = nodes.find((n) => n.id === nodeId)
            if (node && (node.type === 'TEXT_GEN' || node.type === 'IMAGE_GEN' || node.type === 'IMAGE_TO_TEXT' || node.type === 'NOTE')) {
                await executeNode(nodeId, nodes, edges, jobId)
            }
        }

        const elapsed = timer.stop()
        const result = {
            status: 'success',
            graphName,
            nodeCount: nodes.length,
            edgeCount: edges.length,
            executedNodes: sorted.length,
            elapsed,
            nodes: nodes.map(buildNodeResult),
            edges
        }

        logger.info(`[${jobId}] POST /api/render/run - ✓ "${graphName}" executed: ${sorted.length} nodes in ${elapsed}`)
        res.json(result)
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`POST /api/render/run - ✗ error: ${errorMessage}`)
        res.status(500).json({ error: `Render execution failed: ${errorMessage}` })
    }
}

/**
 * Render run handler
 * POST /api/render/:graphId/run
 * Executes a graph and returns the resulting node states as JSON.
 * Optionally accepts a partial graph override (nodes, edges, name) in the request body.
 * @param {string} graphId - URL param: ID of the graph (generated with generateId)
 * @param {GraphNode[]} [nodes] - Optional override for graph nodes
 * @param {GraphEdge[]} [edges] - Optional override for graph edges
 * @param {string} [name] - Optional override for graph name
 */
export const renderRun = async (req: Request, res: Response): Promise<void> => {
    try {
        const graphId = String(req.params.graphId)
        const override = req.body as RenderRunRequest
        const jobId = generateJobId()
        const timer = startTimer()

        logger.info(`POST /api/render/${graphId}/run`)
        logger.info(`[${jobId}] NEW JOB`)

        let nodes: GraphNode[], edges: GraphEdge[], graphData: GraphData
        try {
            ;({ nodes, edges, graphData } = loadGraph(graphId, override))
        } catch (loadError) {
            if (loadError instanceof GraphLoadError) {
                logger.warn(`[${jobId}] POST /api/render/${graphId}/run - ✗ ${loadError.message}`)
                res.status(loadError.status).json({ error: loadError.message })
                return
            }
            throw loadError
        }

        const sorted = topologicalSort(nodes, edges)
        logger.info(`POST /api/render/${graphId}/run - execution order: ${sorted.join(' → ')}`)

        // Execute nodes in topological order
        for (const nodeId of sorted) {
            const node = nodes.find((n) => n.id === nodeId)
            if (node && (node.type === 'TEXT_GEN' || node.type === 'IMAGE_GEN' || node.type === 'IMAGE_TO_TEXT' || node.type === 'NOTE')) {
                await executeNode(nodeId, nodes, edges, jobId)
            }
        }

        const elapsed = timer.stop()
        const result = {
            status: 'success',
            graphId,
            graphName: graphData.name || 'Unnamed Graph',
            nodeCount: nodes.length,
            edgeCount: edges.length,
            executedNodes: sorted.length,
            elapsed,
            nodes: nodes.map(buildNodeResult),
            edges
        }

        logger.info(`[${jobId}] POST /api/render/${graphId}/run - ✓ "${graphData.name || 'Unnamed Graph'}" executed: ${sorted.length} nodes in ${elapsed}`)
        res.json(result)
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`POST /api/render/run - ✗ error: ${errorMessage}`)
        res.status(500).json({ error: `Render execution failed: ${errorMessage}` })
    }
}

/**
 * Render run stream handler
 * POST /api/render/:graphId/run/stream
 * Executes a graph and streams node results as Server-Sent Events.
 * Optionally accepts a partial graph override (nodes, edges, name) in the request body.
 * @param {string} graphId - URL param: ID of the graph (generated with generateId)
 * @param {GraphNode[]} [nodes] - Optional override for graph nodes
 * @param {GraphEdge[]} [edges] - Optional override for graph edges
 * @param {string} [name] - Optional override for graph name
 */
export const renderRunStream = async (req: Request, res: Response): Promise<void> => {
    const graphId = String(req.params.graphId)
    const jobId = generateJobId()
    const timer = startTimer()

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const send = (event: string, data: unknown): void => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    }

    try {
        const override = req.body as RenderRunRequest

        logger.info(`POST /api/render/${graphId}/run/stream`)
        logger.info(`[${jobId}] NEW JOB`)

        let nodes: GraphNode[], edges: GraphEdge[], graphData: GraphData
        try {
            ;({ nodes, edges, graphData } = loadGraph(graphId, override))
        } catch (loadError) {
            if (loadError instanceof GraphLoadError) {
                send(SSE.JOB_ERROR, { error: loadError.message })
                res.end()
                return
            }
            throw loadError
        }

        const sorted = topologicalSort(nodes, edges)

        send(SSE.JOB_START, {
            jobId,
            graphId,
            graphName: graphData.name || 'Unnamed Graph',
            nodeCount: nodes.length,
            edgeCount: edges.length,
            executionOrder: sorted
        })

        logger.info(`POST /api/render/${graphId}/run/stream - execution order: ${sorted.join(' → ')}`)

        // Execute nodes one by one, streaming results
        for (const nodeId of sorted) {
            const node = nodes.find((n) => n.id === nodeId)
            if (!node) continue

            send(SSE.NODE_START, { nodeId, type: node.type })

            if (node.type === 'TEXT_GEN' || node.type === 'IMAGE_GEN' || node.type === 'IMAGE_TO_TEXT' || node.type === 'NOTE') {
                await executeNode(nodeId, nodes, edges, jobId)
            }

            send(SSE.NODE_END, buildNodeResult(node))
        }

        const elapsed = timer.stop()
        send(SSE.JOB_DONE, {
            status: 'success',
            graphId,
            graphName: graphData.name || 'Unnamed Graph',
            nodeCount: nodes.length,
            edgeCount: edges.length,
            executedNodes: sorted.length,
            elapsed,
            nodes: nodes.map(buildNodeResult),
            edges
        })
        logger.info(`[${jobId}] POST /api/render/${graphId}/run/stream - ✓ "${graphData.name || 'Unnamed Graph'}" executed: ${sorted.length} nodes in ${elapsed}`)
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`[${jobId}] POST /api/render/${graphId}/run/stream - ✗ error: ${errorMessage}`)
        send(SSE.JOB_ERROR, { error: `Render execution failed: ${errorMessage}` })
    } finally {
        res.end()
    }
}

// --- Utilities ---

class GraphLoadError extends Error {
    status: number
    constructor(message: string, status: number) {
        super(message)
        this.status = status
    }
}

function loadGraph(graphId: string, override: RenderRunRequest): { nodes: GraphNode[]; edges: GraphEdge[]; graphData: GraphData } {
    const matchingFile = findGraphFile(graphId, GRAPHS_DIR)
    if (!matchingFile) throw new GraphLoadError(`Graph not found: ${graphId}`, 404)

    const graphPath = path.join(GRAPHS_DIR, matchingFile)
    if (!fileExists(graphPath)) throw new GraphLoadError(`Graph file not found: ${graphPath}`, 404)

    let graphData: GraphData
    try {
        graphData = readJsonFile<GraphData>(graphPath)
    } catch (parseError) {
        const msg = parseError instanceof Error ? parseError.message : 'Unknown error'
        throw new GraphLoadError(`Invalid JSON in graph file: ${msg}`, 400)
    }

    if (override?.nodes) graphData.nodes = override.nodes
    if (override?.edges) graphData.edges = override.edges
    if (override?.name) graphData.name = override.name

    if (!Array.isArray(graphData.nodes) || !Array.isArray(graphData.edges)) {
        throw new GraphLoadError('Invalid graph structure: nodes and edges arrays are required', 400)
    }

    return {
        nodes: JSON.parse(JSON.stringify(graphData.nodes)),
        edges: JSON.parse(JSON.stringify(graphData.edges)),
        graphData
    }
}

function topologicalSort(nodes: GraphNode[], edges: GraphEdge[]): string[] {
    const visited = new Set<string>()
    const sorted: string[] = []
    const temp = new Set<string>()

    const visit = (id: string): void => {
        if (temp.has(id) || visited.has(id)) return
        temp.add(id)
        edges.filter((e) => e.target === id).forEach((e) => visit(e.source))
        temp.delete(id)
        visited.add(id)
        sorted.push(id)
    }

    nodes.forEach((n) => visit(n.id))
    return sorted
}

type NodeOutputAsset = { type: 'text'; value: string } | { type: 'image'; mimeType: string; size: number; sizeStr: string; resourceId?: string; url?: string }

function buildNodeResult(n: GraphNode): { id: string; type: string; data: Record<string, unknown>; outputAssets: NodeOutputAsset[]; error?: string } {
    const outputAssets: NodeOutputAsset[] = []

    if ((n.type === 'TEXT_GEN' || n.type === 'IMAGE_TO_TEXT') && n.data.output) {
        outputAssets.push({ type: 'text', value: n.data.output })
    }

    if (n.type === 'NOTE' && (n.data.output || n.data.prompt)) {
        outputAssets.push({ type: 'text', value: n.data.output || n.data.prompt })
    }

    if (n.type === 'IMAGE_GEN' && n.data.images) {
        for (let i = 0; i < n.data.images.length; i++) {
            const imageData = n.data.images[i]
            const match = imageData.match(/^data:(.*?);base64,(.*)$/)
            if (match) {
                const mimeType = match[1]
                const base64Data = match[2]
                const size = Math.ceil((base64Data.length * 3) / 4)
                const resourceId = n.data.imageResources?.[i]
                const url = resourceId ? `/api/resources/${resourceId}` : undefined
                outputAssets.push({ type: 'image', mimeType, size, sizeStr: imageFormatBytes(size), resourceId, url })
            }
        }
    }

    const data =
        n.type === 'TEXT_GEN'
            ? { prompt: n.data.prompt, model: n.data.model, enhancePrompt: n.data.enhancePrompt }
            : n.type === 'IMAGE_GEN'
              ? { prompt: n.data.prompt, model: n.data.model, preset: n.data.preset, enhancePrompt: n.data.enhancePrompt, aspectRatio: n.data.aspectRatio, outputFormat: n.data.outputFormat, imageCount: n.data.imageCount }
              : n.type === 'IMAGE_TO_TEXT'
                ? { prompt: n.data.prompt, model: n.data.model }
                : n.type === 'NOTE'
                  ? { prompt: n.data.prompt, output: n.data.output }
                  : {}

    return { id: n.id, type: n.type, data, outputAssets, error: n.data.error }
}
