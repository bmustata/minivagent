import fs from 'fs'
import path from 'path'
import { generateId, getJsonFiles } from '../utils/fileUtils.ts'
import type { GraphNode, GraphEdge } from '../utils/types.ts'
import { logger } from '../utils/logger.ts'

/**
 * Get connected text for a node
 */
export function graphGetConnectedText(nodeId: string, nodes: GraphNode[], edges: GraphEdge[]): string | undefined {
    const inputEdges = edges.filter((e) => e.target === nodeId && (e.targetHandle === 'prompt' || !e.targetHandle))

    if (inputEdges.length === 0) return undefined

    const sortedEdges = [...inputEdges].sort((a, b) => {
        const nodeA = nodes.find((n) => n.id === a.source)
        const nodeB = nodes.find((n) => n.id === b.source)
        if (!nodeA || !nodeB) return 0
        return nodeA.position.y - nodeB.position.y
    })

    const texts: string[] = []

    sortedEdges.forEach((edge) => {
        const sourceNode = nodes.find((n) => n.id === edge.source)
        if (!sourceNode) return

        if (sourceNode.type === 'TEXT_GEN' || sourceNode.type === 'IMAGE_TO_TEXT') {
            if (edge.sourceHandle === 'output') {
                if (sourceNode.data.output) texts.push(sourceNode.data.output)
            } else {
                if (sourceNode.data.prompt) texts.push(sourceNode.data.prompt)
            }
        } else if (sourceNode.type === 'NOTE') {
            // Compute NOTE's combined output on the fly: own text + connected inputs
            if (sourceNode.data.output) {
                texts.push(sourceNode.data.output)
            } else {
                const noteConnected = graphGetConnectedText(sourceNode.id, nodes, edges)
                const noteOwn = sourceNode.data.prompt || ''
                const combined = noteConnected ? (noteOwn ? `${noteOwn}\n\n${noteConnected}` : noteConnected) : noteOwn
                if (combined) texts.push(combined)
            }
        } else {
            const val = sourceNode.data.output || sourceNode.data.prompt
            if (val) texts.push(val)
        }
    })

    if (texts.length === 0) return undefined
    return texts.join('\n\n')
}

/**
 * Get connected images for a node
 */
export function graphGetConnectedImages(nodeId: string, nodes: GraphNode[], edges: GraphEdge[]): string[] {
    const inputEdges = edges.filter((e) => e.target === nodeId && e.targetHandle === 'image')

    if (inputEdges.length === 0) return []

    const sortedEdges = [...inputEdges].sort((a, b) => {
        const nodeA = nodes.find((n) => n.id === a.source)
        const nodeB = nodes.find((n) => n.id === b.source)
        if (!nodeA || !nodeB) return 0
        return nodeA.position.y - nodeB.position.y
    })

    const images: string[] = []

    sortedEdges.forEach((edge) => {
        const sourceNode = nodes.find((n) => n.id === edge.source)
        if (!sourceNode) return

        if (sourceNode.type === 'IMAGE_GEN') {
            if (edge.sourceHandle && edge.sourceHandle.startsWith('image-')) {
                const indexStr = edge.sourceHandle.split('-')[1]
                const index = parseInt(indexStr, 10)
                if (!isNaN(index) && sourceNode.data.images && sourceNode.data.images[index]) {
                    images.push(sourceNode.data.images[index])
                }
            }
        } else if (sourceNode.type === 'IMAGE_SOURCE') {
            if (sourceNode.data.imageInput) {
                images.push(sourceNode.data.imageInput)
            }
        }
    })

    return images
}

/**
 * Save images from nodes to output directory
 */
export function graphSaveImages(nodes: GraphNode[], outputPath: string): number {
    let savedCount = 0

    nodes.forEach((node) => {
        if (node.data.images && node.data.images.length > 0) {
            node.data.images.forEach((imageData, idx) => {
                const match = imageData.match(/^data:(.*?);base64,(.*)$/)
                if (match) {
                    const mimeType = match[1]
                    const base64Data = match[2]
                    const ext = mimeType.includes('png') ? 'png' : 'jpg'
                    const filename = `${node.id}_image_${idx}.${ext}`
                    const filepath = path.join(outputPath, filename)

                    fs.writeFileSync(filepath, base64Data, 'base64')
                    savedCount++
                    logger.info(`  Saved: ${filename}`)
                }
            })
        }
    })

    return savedCount
}

/**
 * Find graph file by hash ID
 */
export function findGraphFile(graphId: string, graphsDir: string): string | null {
    const jsonFiles = getJsonFiles(graphsDir)
    return jsonFiles.find((file) => generateId(file) === graphId) || null
}
