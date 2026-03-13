import { NodeType } from '../types'

/**
 * Generate a random 6-digit number (000000-999999)
 */
const generateRandomDigits = (): string => {
    return Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, '0')
}

/**
 * Get node type prefix according to graph ID conventions
 */
const getNodeTypePrefix = (type: NodeType): string => {
    switch (type) {
        case NodeType.TEXT_GEN:
            return 'textgen'
        case NodeType.IMAGE_GEN:
            return 'imagegen'
        case NodeType.IMAGE_SOURCE:
            return 'imgsrc'
        case NodeType.IMAGE_TO_TEXT:
            return 'vision'
        case NodeType.NOTE:
            return 'note'
        case NodeType.COMPARE:
            return 'compare'
        default:
            return 'node'
    }
}

/**
 * Generate a unique node ID based on type and existing IDs
 * Format: {nodeType}{6digits}
 * @param type - Node type
 * @param existingIds - Array of existing node IDs to avoid collisions
 * @returns Unique node ID following convention
 */
export const generateNodeId = (type: NodeType, existingIds: string[] = []): string => {
    const prefix = getNodeTypePrefix(type)
    let id: string
    let attempts = 0
    const maxAttempts = 100

    do {
        id = `${prefix}${generateRandomDigits()}`
        attempts++
    } while (existingIds.includes(id) && attempts < maxAttempts)

    return id
}

/**
 * Generate a unique edge ID
 * Format: e{6digits}
 * @param existingIds - Array of existing edge IDs to avoid collisions
 * @returns Unique edge ID following convention
 */
export const generateEdgeId = (existingIds: string[] = []): string => {
    let id: string
    let attempts = 0
    const maxAttempts = 100

    do {
        id = `e${generateRandomDigits()}`
        attempts++
    } while (existingIds.includes(id) && attempts < maxAttempts)

    return id
}
