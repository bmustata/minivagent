import React, { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { Node, Edge, NodeType, NodeData } from '../types'
import { NodeContainer } from './NodeContainer'
import { TextGenNode, ImageGenNode, ImageSourceNode, NoteNode, ImageToTextNode, CompareNode } from './nodes'
import { ConfigModal } from './ConfigModal'
import { GalleryModal, GalleryImage } from './GalleryModal'
import { GraphManager } from './GraphManager'
import { GraphTitle } from './GraphTitle'
import { listGraphs, GraphResource } from '../services/graphService'
import { Sun, Moon, Image as ImageIcon, Type, StickyNote, X, ZoomIn, ZoomOut, Maximize2, Minimize2, Info, Code, ChevronDown, Play, Loader2, ScanEye, Box, Sparkles, MessageSquare, RotateCcw, Columns2, Github } from 'lucide-react'
import { APP_CONFIG } from '../config'
import { generateText, extractTextFromImage, generateImages, planGraphFromPrompt } from '../services/generateService'
import { ImageGenPropsPanel } from './nodes/ImageGenPropsPanel'
import { TextGenPropsPanel } from './nodes/TextGenPropsPanel'
import { ComparePropsPanel } from './nodes/ComparePropsPanel'
import { ImageSourcePropsPanel } from './nodes/ImageSourcePropsPanel'
import { ImageToTextPropsPanel } from './nodes/ImageToTextPropsPanel'
import { getBase64ImageSize, getImageTypeFromUrl, resourceToUrl } from '../utils/imageUtils'
import { generateNodeId, generateEdgeId } from '../utils/idGenerator'

interface CanvasProps {
    isDark: boolean
    toggleTheme: () => void
}

// Helper to convert URL to Base64
const urlToBase64 = async (url: string): Promise<string> => {
    try {
        const response = await fetch(url)
        const blob = await response.blob()
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(blob)
        })
    } catch (e) {
        throw new Error('Failed to fetch image from URL. It might be blocked by CORS.')
    }
}

export const Canvas: React.FC<CanvasProps> = ({ isDark, toggleTheme }) => {
    // --- State ---
    const [nodes, setNodes] = useState<Node[]>([])
    const [edges, setEdges] = useState<Edge[]>([])

    // Graph management state
    const [currentGraphId, setCurrentGraphId] = useState<string | undefined>(undefined)
    const [currentGraphName, setCurrentGraphName] = useState<string | undefined>(undefined)
    const [availableGraphs, setAvailableGraphs] = useState<GraphResource[]>([])

    const [viewport, setViewport] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(0.8) // Start slightly zoomed out

    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
    const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
    const [selectionRect, setSelectionRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
    const [connectionDraft, setConnectionDraft] = useState<{ sourceId: string; sourceHandle: string; currentPos: { x: number; y: number } } | null>(null)
    const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [showConfigModal, setShowConfigModal] = useState(false)
    const [showNewGraphConfirm, setShowNewGraphConfirm] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    // Gallery State
    const [showGallery, setShowGallery] = useState(false)
    const [galleryStartIndex, setGalleryStartIndex] = useState(0)
    const [activeGalleryImages, setActiveGalleryImages] = useState<GalleryImage[]>([])

    // Flow execution state
    const [isRunningFlow, setIsRunningFlow] = useState(false)

    // Instruction state
    const [showInstructions, setShowInstructions] = useState(false)
    const [enlargeInstructions, setEnlargeInstructions] = useState(false)

    // Graph dropdown
    const [showGraphDropdown, setShowGraphDropdown] = useState(false)
    const graphDropdownHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const openGraphDropdown = () => {
        if (graphDropdownHideTimer.current) clearTimeout(graphDropdownHideTimer.current)
        setShowGraphDropdown(true)
    }
    const closeGraphDropdown = () => {
        graphDropdownHideTimer.current = setTimeout(() => setShowGraphDropdown(false), 300)
    }

    // Assistant / Chat State
    const [showAssistant, setShowAssistant] = useState(false)
    const [assistantPrompt, setAssistantPrompt] = useState('')
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    // Refs for gesture handling to avoid closure staleness during rapid events
    const viewportRef = useRef(viewport)
    const zoomRef = useRef(zoom)
    const lastTouchRef = useRef<{ x: number; y: number; dist: number } | null>(null)
    const isPanningRef = useRef(false)
    const lastMouseRef = useRef<{ x: number; y: number } | null>(null)
    const isSelectingRef = useRef(false)
    const selectionStartRef = useRef<{ x: number; y: number } | null>(null)
    const selectionRectRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
    const selectedNodeIdsRef = useRef<string[]>([])
    const multiDragInitialPositionsRef = useRef<Record<string, { x: number; y: number }>>({})
    const dragStartWorldRef = useRef<{ x: number; y: number } | null>(null)

    // Ref for nodes to allow access to latest state in async execution loops
    const nodesRef = useRef(nodes)

    // Update refs when state changes
    useEffect(() => {
        viewportRef.current = viewport
    }, [viewport])
    useEffect(() => {
        zoomRef.current = zoom
    }, [zoom])
    useEffect(() => {
        nodesRef.current = nodes
    }, [nodes])
    useEffect(() => {
        selectedNodeIdsRef.current = selectedNodeIds
    }, [selectedNodeIds])

    // --- Helpers ---

    const getClientCoordinates = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
        // Check for changedTouches first to support touchend events where e.touches is empty
        if ('changedTouches' in e && e.changedTouches.length > 0) {
            // Prioritize touches[0] if available (for move events), otherwise changedTouches[0] (for end events)
            const touch = e.touches && e.touches.length > 0 ? e.touches[0] : e.changedTouches[0]
            return { x: touch.clientX, y: touch.clientY }
        }
        if ('touches' in e && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY }
        }
        if ('clientX' in e) {
            return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY }
        }
        return { x: 0, y: 0 }
    }

    const screenToWorld = (screenX: number, screenY: number) => {
        return {
            x: (screenX - viewportRef.current.x) / zoomRef.current,
            y: (screenY - viewportRef.current.y) / zoomRef.current
        }
    }

    // Updated to accept optional nodes source for async execution context
    const getConnectedText = (nodeId: string, currentNodes: Node[] = nodes) => {
        // Find all connections to the 'prompt' input handle
        const inputEdges = edges.filter((e) => e.target === nodeId && (e.targetHandle === 'prompt' || !e.targetHandle))

        if (inputEdges.length === 0) return undefined

        // Sort edges by source node Y position to maintain consistent order of inputs
        const sortedEdges = [...inputEdges].sort((a, b) => {
            const nodeA = currentNodes.find((n) => n.id === a.source)
            const nodeB = currentNodes.find((n) => n.id === b.source)
            if (!nodeA || !nodeB) return 0
            return nodeA.position.y - nodeB.position.y
        })

        const texts: string[] = []

        sortedEdges.forEach((edge) => {
            const sourceNode = currentNodes.find((n) => n.id === edge.source)
            if (!sourceNode) return

            if (sourceNode.type === NodeType.TEXT_GEN || sourceNode.type === NodeType.IMAGE_TO_TEXT) {
                if (edge.sourceHandle === 'output') {
                    if (sourceNode.data.output) texts.push(sourceNode.data.output)
                } else {
                    if (sourceNode.data.prompt) texts.push(sourceNode.data.prompt)
                }
            } else if (sourceNode.type === NodeType.NOTE) {
                // Compute NOTE's combined output on the fly: own text + connected inputs
                if (sourceNode.data.output) {
                    texts.push(sourceNode.data.output)
                } else {
                    const noteConnected = getConnectedText(sourceNode.id, currentNodes)
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

    const getConnectedImages = (nodeId: string, currentNodes: Node[] = nodes) => {
        // Find connections to the 'image' input handle
        const inputEdges = edges.filter((e) => e.target === nodeId && e.targetHandle === 'image')

        if (inputEdges.length === 0) return []

        // Sort by source position for consistency
        const sortedEdges = [...inputEdges].sort((a, b) => {
            const nodeA = currentNodes.find((n) => n.id === a.source)
            const nodeB = currentNodes.find((n) => n.id === b.source)
            if (!nodeA || !nodeB) return 0
            return nodeA.position.y - nodeB.position.y
        })

        const images: string[] = []

        sortedEdges.forEach((edge) => {
            const sourceNode = currentNodes.find((n) => n.id === edge.source)
            if (!sourceNode) return

            if (sourceNode.type === NodeType.IMAGE_GEN) {
                // Handles are named "image-0", "image-1", etc.
                if (edge.sourceHandle && edge.sourceHandle.startsWith('image-')) {
                    const indexStr = edge.sourceHandle.split('-')[1]
                    const index = parseInt(indexStr, 10)
                    if (!isNaN(index) && sourceNode.data.imageResources && sourceNode.data.imageResources[index]) {
                        const ref = sourceNode.data.imageResources[index]
                        images.push(ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('data:') ? ref : `resource:${ref}`)
                    }
                }
            } else if (sourceNode.type === NodeType.IMAGE_SOURCE) {
                if (sourceNode.data.imageInput) {
                    images.push(sourceNode.data.imageInput)
                }
            } else if (sourceNode.type === NodeType.COMPARE) {
                // Compare node passthrough: reads from imageResources[index] via image-0/image-1 handles
                if (edge.sourceHandle && edge.sourceHandle.startsWith('image-')) {
                    const indexStr = edge.sourceHandle.split('-')[1]
                    const index = parseInt(indexStr, 10)
                    if (!isNaN(index) && sourceNode.data.imageResources && sourceNode.data.imageResources[index]) {
                        const ref = sourceNode.data.imageResources[index]
                        images.push(ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('data:') ? ref : `resource:${ref}`)
                    }
                }
            }
        })

        return images
    }

    // Convert resource: URIs to /api/resources/:id for display in <img src>
    const toDisplayUrls = (imgs: string[]) => imgs.map((img) => (img.startsWith('resource:') ? `/api/resources/${img.slice('resource:'.length).trim()}` : img))

    // Collect all images for gallery
    const galleryImages = React.useMemo(() => {
        const genImages = nodes
            .filter((n) => n.type === NodeType.IMAGE_GEN && n.data.imageResources && n.data.imageResources.length > 0)
            .flatMap((n) =>
                (n.data.imageResources || []).map((item) => ({
                    url: resourceToUrl(item),
                    nodeId: n.id
                }))
            )

        const sourceImages = nodes
            .filter((n) => n.type === NodeType.IMAGE_SOURCE && n.data.imageInput)
            .map((n) => ({
                url: n.data.imageInput!,
                nodeId: n.id,
                metadata: {
                    size: 0,
                    sizeStr: 'N/A',
                    type: getImageTypeFromUrl(n.data.imageInput!)
                }
            }))

        const visionImages = nodes.filter((n) => n.type === NodeType.IMAGE_TO_TEXT && n.data.imageInput).map((n) => ({ url: n.data.imageInput!, nodeId: n.id, metadata: getBase64ImageSize(n.data.imageInput!) }))

        return [...genImages, ...sourceImages, ...visionImages]
    }, [nodes])

    // --- Assistant Logic ---

    const handleAssistantSubmit = async () => {
        if (!assistantPrompt.trim() || isAnalyzing) return
        setIsAnalyzing(true)

        try {
            const graphPlan = await planGraphFromPrompt(assistantPrompt)

            if (graphPlan.nodes && graphPlan.nodes.length > 0) {
                // Calculate center of viewport
                const worldCenterX = (-viewport.x + window.innerWidth / 2) / zoom
                const worldCenterY = (-viewport.y + window.innerHeight / 2) / zoom

                // Create ID mapping to avoid collisions
                const idMap: Record<string, string> = {}
                const existingNodeIds = nodes.map((n) => n.id)
                const existingEdgeIds = edges.map((e) => e.id)

                const newNodes: Node[] = graphPlan.nodes.map((planNode: any) => {
                    const newId = generateNodeId(planNode.type, existingNodeIds)
                    existingNodeIds.push(newId)
                    idMap[planNode.id] = newId

                    return {
                        ...planNode,
                        id: newId,
                        position: {
                            x: planNode.position.x + worldCenterX - 200, // Offset to center
                            y: planNode.position.y + worldCenterY - 100
                        },
                        data: {
                            ...planNode.data,
                            isLoading: false
                        }
                    }
                })

                const newEdges: Edge[] = graphPlan.edges.map((planEdge: any) => {
                    const edgeId = generateEdgeId(existingEdgeIds)
                    existingEdgeIds.push(edgeId)
                    return {
                        ...planEdge,
                        id: edgeId,
                        source: idMap[planEdge.source],
                        target: idMap[planEdge.target]
                    }
                })

                setNodes((prev) => [...prev, ...newNodes])
                setEdges((prev) => [...prev, ...newEdges])

                // Clear prompt after success
                setAssistantPrompt('')
                setShowAssistant(false)
            }
        } catch (error) {
            console.error('Assistant error:', error)
            // Optionally show toast/alert
        } finally {
            setIsAnalyzing(false)
        }
    }

    // --- Node Execution Logic ---

    const executeNode = async (nodeId: string) => {
        const node = nodesRef.current.find((n) => n.id === nodeId)
        if (!node) return

        // Set loading state
        setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, isLoading: true, error: undefined } } : n)))

        try {
            if (node.type === NodeType.TEXT_GEN) {
                const connectedText = getConnectedText(nodeId, nodesRef.current)
                let finalPrompt = node.data.prompt || ''

                // Combine connected context with local prompt if both exist
                if (connectedText) {
                    if (finalPrompt.trim()) {
                        finalPrompt = `${finalPrompt}\n\n--- Context ---\n${connectedText}`
                    } else {
                        finalPrompt = connectedText
                    }
                }

                if (!finalPrompt.trim()) throw new Error('No input prompt provided.')

                const result = await generateText(finalPrompt, node.data.enhancePrompt, node.data.model)

                // Update state and Ref for consistency
                const update = { output: result, isLoading: false }
                setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...update } } : n)))
                nodesRef.current = nodesRef.current.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...update } } : n))
            } else if (node.type === NodeType.IMAGE_GEN) {
                const connectedText = getConnectedText(nodeId, nodesRef.current)
                const connectedImages = getConnectedImages(nodeId, nodesRef.current)

                let finalPrompt = node.data.prompt || ''

                // Combine connected context with local prompt if both exist
                if (connectedText) {
                    if (finalPrompt.trim()) {
                        finalPrompt = `${finalPrompt} ${connectedText}`
                    } else {
                        finalPrompt = connectedText
                    }
                }

                if (!finalPrompt.trim() && connectedImages.length === 0) throw new Error('No prompt or input image provided.')

                // Server resolves resource:, http(s)://, and data: formats
                const processedImages = connectedImages

                const result = await generateImages(finalPrompt, node.data.imageCount, processedImages, node.data.aspectRatio, node.data.outputFormat, node.data.enhancePrompt, node.data.model, node.data.preset)

                console.log(`Generated ${result.imageResources.length} image resource(s)`)

                const update = {
                    imageResources: result.imageResources,
                    enhancedOutput: result.enhancedPrompt,
                    isLoading: false
                }
                setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...update } } : n)))
                nodesRef.current = nodesRef.current.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...update } } : n))
            } else if (node.type === NodeType.IMAGE_TO_TEXT) {
                const connectedText = getConnectedText(nodeId, nodesRef.current)
                const connectedImages = getConnectedImages(nodeId, nodesRef.current)

                const prompt = connectedText || node.data.prompt || 'Describe this image'

                const allImages = [...connectedImages]
                if (node.data.imageInput) allImages.push(node.data.imageInput)

                if (allImages.length === 0) throw new Error('No image provided.')

                const processedImages = await Promise.all(
                    allImages.map(async (img) => {
                        if (img && img.startsWith('resource:')) {
                            return await urlToBase64(`/api/resources/${img.slice('resource:'.length).trim()}`)
                        }
                        if (img && (img.startsWith('http://') || img.startsWith('https://'))) {
                            return await urlToBase64(img)
                        }
                        return img // data: URL pass-through
                    })
                )

                const result = await extractTextFromImage(prompt, processedImages, node.data.model)

                const update = { output: result, isLoading: false }
                setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...update } } : n)))
                nodesRef.current = nodesRef.current.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...update } } : n))
            } else if (node.type === NodeType.NOTE) {
                const connectedText = getConnectedText(nodeId, nodesRef.current)
                const ownText = node.data.prompt || ''
                const combined = connectedText ? (ownText ? `${ownText}\n\n${connectedText}` : connectedText) : ownText
                const update = { output: combined, isLoading: false }
                setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...update } } : n)))
                nodesRef.current = nodesRef.current.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...update } } : n))
            }
        } catch (error: any) {
            const update = { error: error.message || 'Generation failed', isLoading: false }
            setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...update } } : n)))
            nodesRef.current = nodesRef.current.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...update } } : n))
        }
    }

    const runFullFlow = async () => {
        if (isRunningFlow) return
        setIsRunningFlow(true)

        try {
            // Topological sort
            const visited = new Set<string>()
            const sorted: string[] = []
            const temp = new Set<string>()

            const visit = (id: string) => {
                if (temp.has(id)) return // Cycle detected, skip or handle?
                if (visited.has(id)) return

                temp.add(id)

                const incoming = edges.filter((e) => e.target === id)
                incoming.forEach((e) => visit(e.source))

                temp.delete(id)
                visited.add(id)
                sorted.push(id)
            }

            nodes.forEach((n) => visit(n.id))

            // Execute in order
            for (const nodeId of sorted) {
                // Only execute generative nodes
                const node = nodesRef.current.find((n) => n.id === nodeId)
                if (node && (node.type === NodeType.TEXT_GEN || node.type === NodeType.IMAGE_GEN || node.type === NodeType.IMAGE_TO_TEXT || node.type === NodeType.NOTE)) {
                    await executeNode(nodeId)
                }
            }
        } finally {
            setIsRunningFlow(false)
        }
    }

    const resetAllOutputs = () => {
        const reset = (prev: Node[]) =>
            prev.map((node) => ({
                ...node,
                data: {
                    ...node.data,
                    output: undefined,
                    imageResources: undefined,
                    enhancedOutput: undefined,
                    error: undefined,
                    isLoading: false
                }
            }))
        setNodes(reset)
        nodesRef.current = reset(nodesRef.current)
        toast.success('All outputs cleared', {
            description: 'Node outputs have been reset'
        })
    }

    // --- Graph Management Handlers ---

    const fitNodesToView = (nodesToFit: Node[]) => {
        if (nodesToFit.length === 0) {
            setZoom(0.8)
            setViewport({ x: 0, y: 0 })
            return
        }
        const NODE_W = 320
        const NODE_H = 220
        const PADDING = 80

        const minX = Math.min(...nodesToFit.map((n) => n.position.x))
        const minY = Math.min(...nodesToFit.map((n) => n.position.y))
        const maxX = Math.max(...nodesToFit.map((n) => n.position.x + NODE_W))
        const maxY = Math.max(...nodesToFit.map((n) => n.position.y + NODE_H))

        const graphW = maxX - minX
        const graphH = maxY - minY

        const screenW = window.innerWidth
        const screenH = window.innerHeight

        const scaleX = (screenW - PADDING * 2) / graphW
        const scaleY = (screenH - PADDING * 2) / graphH
        const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.2), 1.2)

        const centerX = (minX + maxX) / 2
        const centerY = (minY + maxY) / 2

        setZoom(newZoom)
        setViewport({
            x: screenW / 2 - centerX * newZoom,
            y: screenH / 2 - centerY * newZoom,
        })
    }

    const handleLoadGraph = (loadedNodes: Node[], loadedEdges: Edge[], graphId: string, graphName: string) => {
        setNodes(JSON.parse(JSON.stringify(loadedNodes)))
        setEdges(JSON.parse(JSON.stringify(loadedEdges)))
        setCurrentGraphId(graphId)
        setCurrentGraphName(graphName)
        setSelectedNodeId(null)
        setSelectedNodeIds([])
        fitNodesToView(loadedNodes)
        window.history.pushState({}, '', `/graph/${graphId}`)
        document.title = `MiniVAgent — ${graphName || graphId}`
    }

    const handleSaveSuccess = (graphId: string, graphName: string) => {
        setCurrentGraphId(graphId)
        setCurrentGraphName(graphName)
        document.title = `MiniVAgent — ${graphName || graphId}`
    }

    const handleNewGraph = () => {
        if (nodes.length > 0 || edges.length > 0) {
            setShowNewGraphConfirm(true)
        } else {
            createNewGraph()
        }
    }

    const createNewGraph = () => {
        setNodes([])
        setEdges([])
        setCurrentGraphId(undefined)
        setCurrentGraphName(undefined)
        setViewport({ x: 0, y: 0 })
        setZoom(0.8)
        setShowNewGraphConfirm(false)

        // Clear graph ID from URL and reset title
        window.history.pushState({}, '', '/')
        document.title = 'MiniVAgent'
    }

    // Save graph function (used by GraphManager and keyboard shortcut)
    const handleSaveGraph = async () => {
        if (!currentGraphName || !currentGraphName.trim()) {
            toast.error('Please provide a graph name', {
                description: 'Use the title dropdown to rename your graph first.'
            })
            return
        }

        try {
            const { createGraph, updateGraph } = await import('../services/graphService')
            const content = { name: currentGraphName, nodes, edges }

            if (currentGraphId) {
                await updateGraph(currentGraphId, content)
                toast.success('Graph saved successfully!', {
                    description: `"${currentGraphName}" has been updated.`
                })
            } else {
                const filename = `${currentGraphName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.json`
                const result = await createGraph(filename, content)
                setCurrentGraphId(result.id)
                toast.success('Graph created successfully!', {
                    description: `"${currentGraphName}" has been saved.`
                })
            }

            // Refresh graph list
            const graphs = await listGraphs()
            setAvailableGraphs(graphs)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to save graph'
            toast.error('Failed to save graph', { description: errorMessage })
        }
    }

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMod = e.metaKey || e.ctrlKey

            // Ctrl/Cmd + Alt + N: New graph
            if (isMod && e.altKey && e.key === 'n') {
                e.preventDefault()
                handleNewGraph()
            }

            // Ctrl/Cmd + G: Save graph
            if (isMod && e.key === 'g') {
                e.preventDefault()
                handleSaveGraph()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [currentGraphId, currentGraphName, nodes, edges])

    // Load available graphs from API and load graph from URL or hello-graph by default
    useEffect(() => {
        const loadAvailableGraphs = async () => {
            try {
                const graphs = await listGraphs()
                setAvailableGraphs(graphs)

                // Check if there's a graph ID in the URL path
                const pathParts = window.location.pathname.split('/')
                const graphIdFromUrl = pathParts[pathParts.length - 1]

                if (graphIdFromUrl && graphIdFromUrl !== '') {
                    // Try to load the graph from URL
                    const graphFromUrl = graphs.find((g) => g.id === graphIdFromUrl)
                    if (graphFromUrl) {
                        loadGraphFromDropdown(graphFromUrl.id, graphFromUrl.source.replace('.json', ''))
                        return
                    }
                }

                // Load hello-graph by default if no valid graph in URL
                const helloGraph = graphs.find((g) => g.source === 'hello-graph.json')
                if (helloGraph) {
                    loadGraphFromDropdown(helloGraph.id, 'hello-graph')
                }
            } catch (error) {
                console.error('Failed to load graphs:', error)
            }
        }
        loadAvailableGraphs()
    }, [])

    // Helper to load graph from dropdown
    const loadGraphFromDropdown = async (graphId: string, graphName: string) => {
        try {
            const { getGraph } = await import('../services/graphService')
            const graphData = await getGraph(graphId)
            handleLoadGraph(graphData.nodes || [], graphData.edges || [], graphId, graphData.name || graphName)
        } catch (error) {
            console.error('Failed to load graph:', error)
        }
    }

    // Graph title handlers
    const handleRenameGraph = async (newName: string) => {
        try {
            if (currentGraphId) {
                // Update existing graph
                const { updateGraph } = await import('../services/graphService')
                const graphData = { name: newName, nodes, edges }
                await updateGraph(currentGraphId, graphData)
                setCurrentGraphName(newName)

                // Refresh graph list
                const graphs = await listGraphs()
                setAvailableGraphs(graphs)

                toast.success('Graph renamed successfully!', {
                    description: `Renamed to "${newName}"`
                })
            } else {
                // Create new graph if it doesn't exist yet
                const { createGraph } = await import('../services/graphService')
                const filename = `${newName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.json`
                const graphData = { name: newName, nodes, edges }
                const result = await createGraph(filename, graphData)

                setCurrentGraphId(result.id)
                setCurrentGraphName(newName)

                // Refresh graph list
                const graphs = await listGraphs()
                setAvailableGraphs(graphs)

                toast.success('Graph created successfully!', {
                    description: `Created "${newName}"`
                })
            }
        } catch (error) {
            console.error('Failed to rename graph:', error)
            toast.error('Failed to rename graph', {
                description: error instanceof Error ? error.message : 'An error occurred'
            })
        }
    }

    const handleDuplicateGraph = async () => {
        if (!currentGraphName) return

        try {
            const { createGraph } = await import('../services/graphService')
            const newName = `${currentGraphName}-copy`
            const graphData = { name: newName, nodes, edges }
            const result = await createGraph(newName, graphData)

            // Refresh graph list
            const graphs = await listGraphs()
            setAvailableGraphs(graphs)

            // Load the duplicated graph
            await loadGraphFromDropdown(result.id, result.source.replace('.json', ''))

            toast.success('Graph duplicated successfully!', {
                description: `Created "${newName}"`
            })
        } catch (error) {
            console.error('Failed to duplicate graph:', error)
            toast.error('Failed to duplicate graph', {
                description: error instanceof Error ? error.message : 'An error occurred'
            })
        }
    }

    const handleDeleteGraph = async () => {
        if (!currentGraphId || !currentGraphName) return

        setShowDeleteConfirm(true)
    }

    const confirmDeleteGraph = async () => {
        if (!currentGraphId || !currentGraphName) return

        try {
            const { deleteGraph } = await import('../services/graphService')
            await deleteGraph(currentGraphId)

            // Clear current graph and create new empty one
            createNewGraph()

            // Refresh graph list
            const graphs = await listGraphs()
            setAvailableGraphs(graphs)

            toast.success('Graph deleted successfully!', {
                description: `"${currentGraphName}" has been removed`
            })

            setShowDeleteConfirm(false)
        } catch (error) {
            console.error('Failed to delete graph:', error)
            toast.error('Failed to delete graph', {
                description: error instanceof Error ? error.message : 'An error occurred'
            })
            setShowDeleteConfirm(false)
        }
    }

    // --- Node Operations ---

    const addNode = (type: NodeType) => {
        const existingIds = nodes.map((n) => n.id)
        const id = generateNodeId(type, existingIds)
        const worldCenterX = (-viewport.x + window.innerWidth / 2) / zoom
        const worldCenterY = (-viewport.y + window.innerHeight / 2) / zoom

        // Snap initial position
        const snap = 24
        const snappedX = Math.round((worldCenterX - 160) / snap) * snap
        const snappedY = Math.round((worldCenterY - 100) / snap) * snap

        const newNode: Node = {
            id,
            type,
            position: { x: snappedX, y: snappedY },
            data: {
                prompt: type === NodeType.COMPARE ? undefined! : '',
                isLoading: type === NodeType.COMPARE ? undefined! : false,
                imageCount: type === NodeType.IMAGE_GEN ? 1 : undefined,
                aspectRatio: type === NodeType.IMAGE_GEN ? '1:1' : undefined,
                outputFormat: type === NodeType.IMAGE_GEN ? 'JPEG' : undefined,
                imageInputType: type === NodeType.IMAGE_TO_TEXT || type === NodeType.IMAGE_SOURCE ? 'UPLOAD' : undefined
            }
        }
        setNodes((prev) => [...prev, newNode])
        if (type === NodeType.IMAGE_TO_TEXT) {
            setSelectedNodeId(id)
            setSelectedNodeIds([id])
        }
    }

    const updateNodeData = (id: string, newData: Partial<NodeData>) => {
        setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...newData } } : n)))
    }

    const deleteNode = (id: string) => {
        setNodes((prev) => prev.filter((n) => n.id !== id))
        setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id))
    }

    const duplicateSelectedNode = () => {
        if (!selectedNodeId) return
        const original = nodes.find((n) => n.id === selectedNodeId)
        if (!original) return

        const existingIds = nodes.map((n) => n.id)
        const newId = generateNodeId(original.type, existingIds)
        const newNode: Node = {
            ...original,
            id: newId,
            position: { x: original.position.x + 30, y: original.position.y + 30 },
            // Reset transient state
            data: {
                ...original.data,
                isLoading: false,
                output: undefined,
                images: undefined,
                error: undefined
            }
        }

        setNodes((prev) => [...prev, newNode])
        setSelectedNodeId(newId)
    }

    const deleteEdge = (id: string) => {
        setEdges((prev) => prev.filter((e) => e.id !== id))
        if (selectedEdgeId === id) setSelectedEdgeId(null)
    }

    const handleCanvasDown = (e: React.MouseEvent | React.TouchEvent) => {
        // Check if right click (button 2)
        if ('button' in e && e.button === 2) {
            isPanningRef.current = true
            lastMouseRef.current = { x: e.clientX, y: e.clientY }
            // e.preventDefault();
            return
        }

        // If not panning, handle deselection and rubber-band start
        if (!isPanningRef.current && (e.target as HTMLElement).classList.contains('touch-none')) {
            setSelectedNodeId(null)
            setSelectedEdgeId(null)
            setSelectedNodeIds([])

            // Start rubber-band selection on left-click
            if ('button' in e && e.button === 0) {
                const client = getClientCoordinates(e)
                const world = screenToWorld(client.x, client.y)
                isSelectingRef.current = true
                selectionStartRef.current = world
                const rect = { x1: world.x, y1: world.y, x2: world.x, y2: world.y }
                selectionRectRef.current = rect
                setSelectionRect(rect)
            }
        }
    }

    // --- Zoom Logic ---

    const handleZoom = (delta: number, clientX: number, clientY: number) => {
        const currentZoom = zoomRef.current
        const currentViewport = viewportRef.current

        const newZoom = Math.min(Math.max(currentZoom + delta, 0.2), 3)

        // Calculate world point under mouse before zoom
        const worldX = (clientX - currentViewport.x) / currentZoom
        const worldY = (clientY - currentViewport.y) / currentZoom

        // Calculate new viewport to keep that world point under mouse
        const newViewportX = clientX - worldX * newZoom
        const newViewportY = clientY - worldY * newZoom

        setZoom(newZoom)
        setViewport({ x: newViewportX, y: newViewportY })
    }

    const handleWheel = useCallback((e: React.WheelEvent) => {
        const zoomDelta = -e.deltaY * 0.001
        handleZoom(zoomDelta, e.clientX, e.clientY)
    }, [])

    // --- Drag & Interaction Logic ---

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent, id: string) => {
        e.stopPropagation()
        if ('button' in e && e.button !== 0) return

        setSelectedEdgeId(null)

        const node = nodes.find((n) => n.id === id)
        if (!node) return

        const client = getClientCoordinates(e)
        const world = screenToWorld(client.x, client.y)

        // Shift+click: toggle this node in/out of multi-selection, no drag
        if ('shiftKey' in e && e.shiftKey) {
            const newIds = selectedNodeIdsRef.current.includes(id)
                ? selectedNodeIdsRef.current.filter((nid) => nid !== id)
                : [...selectedNodeIdsRef.current, id]
            setSelectedNodeIds(newIds)
            setSelectedNodeId(newIds.length === 1 ? newIds[0] : null)
            return
        }

        // If clicking a node already in a multi-selection, drag all selected nodes
        const alreadyInMulti = selectedNodeIdsRef.current.length > 1 && selectedNodeIdsRef.current.includes(id)
        if (alreadyInMulti) {
            const initPos: Record<string, { x: number; y: number }> = {}
            nodes.forEach((n) => {
                if (selectedNodeIdsRef.current.includes(n.id)) initPos[n.id] = { ...n.position }
            })
            multiDragInitialPositionsRef.current = initPos
            dragStartWorldRef.current = world
        } else {
            setSelectedNodeIds([id])
            setSelectedNodeId(id)
            multiDragInitialPositionsRef.current = {}
            dragStartWorldRef.current = null
        }

        setDraggingNodeId(id)
        setDragOffset({
            x: world.x - node.position.x,
            y: world.y - node.position.y
        })
        if (!alreadyInMulti) setSelectedNodeId(id)
    }

    const handleConnectStart = (e: React.MouseEvent | React.TouchEvent, id: string, type: 'source' | 'target', handleId?: string) => {
        e.stopPropagation()
        const client = getClientCoordinates(e)
        const world = screenToWorld(client.x, client.y)
        if (type === 'source') {
            setConnectionDraft({
                sourceId: id,
                sourceHandle: handleId || 'prompt',
                currentPos: world
            })
        }
    }

    const handleConnectEnd = (e: React.MouseEvent | React.TouchEvent, targetId: string, handleId: string) => {
        e.stopPropagation()

        if (connectionDraft && connectionDraft.sourceId !== targetId) {
            setEdges((prev) => {
                const exists = prev.some((edge) => edge.target === targetId && edge.source === connectionDraft.sourceId && edge.targetHandle === handleId)
                if (exists) return prev

                // Check if target node allows multiple connections on this handle
                const targetNode = nodes.find((n) => n.id === targetId)
                const isMultiInputHandle = handleId === 'prompt' || (handleId === 'image' && (targetNode?.type === NodeType.IMAGE_GEN || targetNode?.type === NodeType.IMAGE_TO_TEXT || targetNode?.type === NodeType.COMPARE))

                let filtered = prev
                if (!isMultiInputHandle) {
                    // Enforce singleton connection
                    filtered = prev.filter((edge) => !(edge.target === targetId && edge.targetHandle === handleId))
                }

                const existingEdgeIds = prev.map((e) => e.id)
                return [
                    ...filtered,
                    {
                        id: generateEdgeId(existingEdgeIds),
                        source: connectionDraft.sourceId,
                        sourceHandle: connectionDraft.sourceHandle,
                        target: targetId,
                        targetHandle: handleId
                    }
                ]
            })
            setConnectionDraft(null)
        }
    }

    // --- Effects ---

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Duplicate: Ctrl+D or Cmd+D
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
                e.preventDefault()
                duplicateSelectedNode()
            }
            // Escape: close props panel and clear multi-selection
            if (e.key === 'Escape') {
                setSelectedNodeId(null)
                setSelectedNodeIds([])
            }
            // Delete: Backspace or Delete
            if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedNodeId || selectedNodeIdsRef.current.length > 0)) {
                // Check if we are not in an input field
                const activeTag = document.activeElement?.tagName.toLowerCase()
                if (activeTag !== 'input' && activeTag !== 'textarea') {
                    const toDelete = selectedNodeIdsRef.current.length > 0 ? selectedNodeIdsRef.current : (selectedNodeId ? [selectedNodeId] : [])
                    toDelete.forEach((id) => deleteNode(id))
                    setSelectedNodeIds([])
                    setSelectedNodeId(null)
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selectedNodeId, nodes]) // Dependencies for accessing current state

    // Mouse Move/Up Global Handlers
    useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if ('touches' in e) {
                // Touch Handling (Pinch Zoom / Pan)
                if (e.touches.length === 2) {
                    const t1 = e.touches[0]
                    const t2 = e.touches[1]

                    const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
                    const centerX = (t1.clientX + t2.clientX) / 2
                    const centerY = (t1.clientY + t2.clientY) / 2

                    if (lastTouchRef.current) {
                        const dx = centerX - lastTouchRef.current.x
                        const dy = centerY - lastTouchRef.current.y
                        setViewport((prev) => ({ x: prev.x + dx, y: prev.y + dy }))

                        const zoomFactor = dist / lastTouchRef.current.dist
                        const currentZoom = zoomRef.current
                        const newZoom = Math.min(Math.max(currentZoom * zoomFactor, 0.2), 3)

                        if (Math.abs(newZoom - currentZoom) > 0.001) {
                            setZoom(newZoom)
                        }
                    }

                    lastTouchRef.current = { x: centerX, y: centerY, dist }
                    setDraggingNodeId(null)
                    return
                } else if (e.touches.length === 1 && !draggingNodeId && !connectionDraft) {
                    const t1 = e.touches[0]
                    if (lastTouchRef.current) {
                        const dx = t1.clientX - lastTouchRef.current.x
                        const dy = t1.clientY - lastTouchRef.current.y
                        setViewport((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
                    }
                    lastTouchRef.current = { x: t1.clientX, y: t1.clientY, dist: 0 }
                }
            }

            if (!('touches' in e) && isPanningRef.current) {
                const mEvent = e as MouseEvent
                if (lastMouseRef.current) {
                    const dx = mEvent.clientX - lastMouseRef.current.x
                    const dy = mEvent.clientY - lastMouseRef.current.y
                    setViewport((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
                }
                lastMouseRef.current = { x: mEvent.clientX, y: mEvent.clientY }
            }

            if (draggingNodeId) {
                const client = getClientCoordinates(e)
                const world = screenToWorld(client.x, client.y)

                const snap = 24
                const isMultiDrag = selectedNodeIdsRef.current.length > 1 && selectedNodeIdsRef.current.includes(draggingNodeId)

                if (isMultiDrag && dragStartWorldRef.current) {
                    const dx = world.x - dragStartWorldRef.current.x
                    const dy = world.y - dragStartWorldRef.current.y
                    setNodes((prev) =>
                        prev.map((n) => {
                            if (!selectedNodeIdsRef.current.includes(n.id)) return n
                            const init = multiDragInitialPositionsRef.current[n.id]
                            if (!init) return n
                            return {
                                ...n,
                                position: {
                                    x: Math.round((init.x + dx) / snap) * snap,
                                    y: Math.round((init.y + dy) / snap) * snap,
                                }
                            }
                        })
                    )
                } else {
                    const rawX = world.x - dragOffset.x
                    const rawY = world.y - dragOffset.y
                    const snappedX = Math.round(rawX / snap) * snap
                    const snappedY = Math.round(rawY / snap) * snap

                    setNodes((prev) =>
                        prev.map((n) =>
                            n.id === draggingNodeId
                                ? {
                                      ...n,
                                      position: {
                                          x: snappedX,
                                          y: snappedY
                                      }
                                  }
                                : n
                        )
                    )
                }
            }

            // Update rubber-band selection rect
            if (isSelectingRef.current && selectionStartRef.current && !('touches' in e)) {
                const mEvent = e as MouseEvent
                const world = screenToWorld(mEvent.clientX, mEvent.clientY)
                const rect = {
                    x1: selectionStartRef.current.x,
                    y1: selectionStartRef.current.y,
                    x2: world.x,
                    y2: world.y,
                }
                selectionRectRef.current = rect
                setSelectionRect(rect)
            }

            if (connectionDraft) {
                const client = getClientCoordinates(e)
                const world = screenToWorld(client.x, client.y)
                setConnectionDraft((prev) =>
                    prev
                        ? {
                              ...prev,
                              currentPos: world
                          }
                        : null
                )
            }
        }

        const handleEnd = (e: MouseEvent | TouchEvent) => {
            if (connectionDraft) {
                const client = getClientCoordinates(e)
                const element = document.elementFromPoint(client.x, client.y)
                const handle = element?.closest('[data-handle-type="target"]')

                if (handle) {
                    const targetId = handle.getAttribute('data-node-id')
                    const targetHandleId = handle.getAttribute('data-handle-id') || 'prompt'

                    if (targetId && targetId !== connectionDraft.sourceId) {
                        setEdges((prev) => {
                            const exists = prev.some((edge) => edge.target === targetId && edge.source === connectionDraft.sourceId && edge.targetHandle === targetHandleId)
                            if (exists) return prev

                            // Check if target node allows multiple connections on this handle
                            const targetNode = nodes.find((n) => n.id === targetId)
                            const isMultiInputHandle = targetHandleId === 'prompt' || (targetHandleId === 'image' && (targetNode?.type === NodeType.IMAGE_GEN || targetNode?.type === NodeType.IMAGE_TO_TEXT || targetNode?.type === NodeType.COMPARE))

                            let filtered = prev
                            if (!isMultiInputHandle) {
                                filtered = prev.filter((edge) => !(edge.target === targetId && edge.targetHandle === targetHandleId))
                            }

                            const existingEdgeIds = prev.map((e) => e.id)
                            return [
                                ...filtered,
                                {
                                    id: generateEdgeId(existingEdgeIds),
                                    source: connectionDraft.sourceId,
                                    sourceHandle: connectionDraft.sourceHandle,
                                    target: targetId,
                                    targetHandle: targetHandleId
                                }
                            ]
                        })
                    }
                }
            }

            setDraggingNodeId(null)
            setConnectionDraft(null)
            lastTouchRef.current = null
            isPanningRef.current = false
            lastMouseRef.current = null
            dragStartWorldRef.current = null
            multiDragInitialPositionsRef.current = {}

            // Finalize rubber-band selection
            if (isSelectingRef.current) {
                const rect = selectionRectRef.current
                if (rect) {
                    const minX = Math.min(rect.x1, rect.x2)
                    const maxX = Math.max(rect.x1, rect.x2)
                    const minY = Math.min(rect.y1, rect.y2)
                    const maxY = Math.max(rect.y1, rect.y2)
                    const threshold = 5
                    if (maxX - minX > threshold || maxY - minY > threshold) {
                        const NODE_W = 320
                        const NODE_H = 220
                        const hit = nodesRef.current
                            .filter((n) =>
                                n.position.x < maxX &&
                                n.position.x + NODE_W > minX &&
                                n.position.y < maxY &&
                                n.position.y + NODE_H > minY
                            )
                            .map((n) => n.id)
                        setSelectedNodeIds(hit)
                    }
                }
                isSelectingRef.current = false
                selectionStartRef.current = null
                selectionRectRef.current = null
                setSelectionRect(null)
            }
        }

        window.addEventListener('mousemove', handleMove)
        window.addEventListener('mouseup', handleEnd)
        window.addEventListener('touchmove', handleMove, { passive: false })
        window.addEventListener('touchend', handleEnd)

        return () => {
            window.removeEventListener('mousemove', handleMove)
            window.removeEventListener('mouseup', handleEnd)
            window.removeEventListener('touchmove', handleMove)
            window.removeEventListener('touchend', handleEnd)
        }
    }, [draggingNodeId, connectionDraft, dragOffset, zoom, selectedNodeId, nodes]) // Include necessary deps

    // --- Rendering ---

    const getHandlePosition = (nodeId: string, type: 'source' | 'target', handleId?: string) => {
        const node = nodes.find((n) => n.id === nodeId)
        if (!node) return null

        if (type === 'target') {
            let offsetY = 45
            if (handleId === 'image') {
                if (node.type === NodeType.IMAGE_GEN) offsetY = 125
                else if (node.type === NodeType.COMPARE) offsetY = 80
                else offsetY = 100 // IMAGE_TO_TEXT
            }
            return { x: node.position.x - 12, y: node.position.y + offsetY }
        }

        const baseX = node.position.x + 332
        let offsetY = 0

        if (node.type === NodeType.TEXT_GEN || node.type === NodeType.IMAGE_TO_TEXT) {
            offsetY = handleId === 'output' ? 200 : 45
        } else if (node.type === NodeType.IMAGE_GEN) {
            const startTop = 85
            const spacing = 45

            if (handleId?.startsWith('image-')) {
                const idx = parseInt(handleId.split('-')[1])
                offsetY = startTop + idx * spacing
            } else {
                offsetY = 85
            }
        } else if (node.type === NodeType.IMAGE_SOURCE) {
            offsetY = 120
        } else if (node.type === NodeType.COMPARE) {
            if (handleId === 'image-0') offsetY = 100
            else if (handleId === 'image-1') offsetY = 160
            else offsetY = 100
        } else {
            offsetY = 45
        }

        return { x: baseX, y: node.position.y + offsetY }
    }

    return (
        <div className="w-full h-full overflow-hidden relative bg-slate-50 dark:bg-zinc-900 touch-none" onMouseDown={handleCanvasDown} onWheel={handleWheel} onContextMenu={(e) => e.preventDefault()}>
            {/* Graph Title in Center */}
            <GraphTitle
                graphName={currentGraphName}
                graphSource={currentGraphId ? availableGraphs.find((g) => g.id === currentGraphId)?.source?.replace('.json', '') ?? currentGraphId : undefined}
                onRename={handleRenameGraph}
                onDuplicate={handleDuplicateGraph}
                onDelete={handleDeleteGraph}
            />

            {/* Rubber-band Selection Rectangle */}
            {selectionRect && (
                <div
                    className="absolute z-10 pointer-events-none border border-indigo-500 bg-indigo-500/10 rounded-sm"
                    style={{
                        left: Math.min(selectionRect.x1, selectionRect.x2) * zoom + viewport.x,
                        top: Math.min(selectionRect.y1, selectionRect.y2) * zoom + viewport.y,
                        width: Math.abs(selectionRect.x2 - selectionRect.x1) * zoom,
                        height: Math.abs(selectionRect.y2 - selectionRect.y1) * zoom,
                    }}
                />
            )}

            {/* Background Grid */}
            <div
                className="absolute inset-0 pointer-events-none pattern-grid text-slate-300 dark:text-zinc-700 opacity-60"
                style={{
                    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${zoom})`,
                    transformOrigin: '0 0'
                }}
            />

            {/* SVG Layer for Edges */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{
                    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${zoom})`,
                    transformOrigin: '0 0',
                    overflow: 'visible'
                }}
            >
                {edges.map((edge) => {
                    const start = getHandlePosition(edge.source, 'source', edge.sourceHandle)
                    const end = getHandlePosition(edge.target, 'target', edge.targetHandle || 'prompt')

                    if (!start || !end) return null

                    const isSelected = selectedEdgeId === edge.id
                    const deltaX = Math.abs(end.x - start.x)
                    const controlX = deltaX * 0.5

                    const path = `M ${start.x} ${start.y} C ${start.x + controlX} ${start.y}, ${end.x - controlX} ${end.y}, ${end.x} ${end.y}`
                    const midX = (start.x + end.x) / 2
                    const midY = (start.y + end.y) / 2

                    return (
                        <g
                            key={edge.id}
                            onClick={(e) => {
                                e.stopPropagation()
                                setSelectedEdgeId(edge.id)
                            }}
                            className="pointer-events-auto cursor-pointer group"
                        >
                            <path d={path} strokeWidth="20" stroke="transparent" fill="none" />
                            <path d={path} strokeWidth="3" className={`${isSelected ? 'stroke-indigo-500' : 'stroke-slate-400 dark:stroke-zinc-600 group-hover:stroke-indigo-400'} transition-colors`} fill="none" />
                            {isSelected && (
                                <g
                                    transform={`translate(${midX}, ${midY})`}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        deleteEdge(edge.id)
                                    }}
                                    className="cursor-pointer"
                                >
                                    <circle r="10" className="fill-red-500 stroke-white dark:stroke-zinc-900 stroke-2 hover:fill-red-600 transition-colors" />
                                    <path d="M -3 -3 L 3 3 M 3 -3 L -3 3" stroke="white" strokeWidth="2" />
                                </g>
                            )}
                        </g>
                    )
                })}

                {connectionDraft && (
                    <path
                        d={`M ${getHandlePosition(connectionDraft.sourceId, 'source', connectionDraft.sourceHandle)?.x} ${getHandlePosition(connectionDraft.sourceId, 'source', connectionDraft.sourceHandle)?.y} L ${connectionDraft.currentPos.x} ${connectionDraft.currentPos.y}`}
                        strokeWidth="3"
                        className="stroke-indigo-400 dark:stroke-indigo-500 stroke-dashed opacity-60"
                        strokeDasharray="5,5"
                        fill="none"
                    />
                )}
            </svg>

            {/* Nodes Layer */}
            <div
                className="absolute inset-0 w-full h-full origin-top-left pointer-events-none"
                style={{
                    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${zoom})`
                }}
            >
                <div className="pointer-events-auto">
                    {nodes.map((node) => (
                        <NodeContainer key={node.id} node={node} selected={selectedNodeIds.includes(node.id)} onDelete={deleteNode} onSelect={setSelectedNodeId} onDragStart={handleDragStart} onConnectStart={handleConnectStart} onConnectEnd={handleConnectEnd}>
                            {node.type === NodeType.TEXT_GEN && <TextGenNode node={node} updateNodeData={updateNodeData} connectedInputText={getConnectedText(node.id)} onRun={() => executeNode(node.id)} />}
                            {node.type === NodeType.IMAGE_GEN && (
                                <ImageGenNode
                                    node={node}
                                    updateNodeData={updateNodeData}
                                    connectedInputText={getConnectedText(node.id)}
                                    connectedInputImages={toDisplayUrls(getConnectedImages(node.id))}
                                    onExpand={(url) => {
                                        const nodeImages = (node.data.imageResources || []).map((item) => ({
                                            url: resourceToUrl(item),
                                            nodeId: node.id
                                        }))
                                        setActiveGalleryImages(nodeImages)
                                        const index = nodeImages.findIndex((img) => img.url === url)
                                        setGalleryStartIndex(index >= 0 ? index : 0)
                                        setShowGallery(true)
                                    }}
                                    onRun={() => executeNode(node.id)}
                                />
                            )}
                            {node.type === NodeType.IMAGE_SOURCE && (
                                <ImageSourceNode
                                    node={node}
                                    updateNodeData={updateNodeData}
                                    onExpand={(url) => {
                                        setActiveGalleryImages([{ url, nodeId: node.id }])
                                        setGalleryStartIndex(0)
                                        setShowGallery(true)
                                    }}
                                />
                            )}
                            {node.type === NodeType.IMAGE_TO_TEXT && (
                                <ImageToTextNode
                                    node={node}
                                    updateNodeData={updateNodeData}
                                    connectedInputText={getConnectedText(node.id)}
                                    connectedInputImages={toDisplayUrls(getConnectedImages(node.id))}
                                    onRun={() => executeNode(node.id)}
                                    onExpand={(url) => {
                                        setActiveGalleryImages([{ url, nodeId: node.id }])
                                        setGalleryStartIndex(0)
                                        setShowGallery(true)
                                    }}
                                />
                            )}
                            {node.type === NodeType.NOTE && <NoteNode node={node} updateNodeData={updateNodeData} connectedInputText={getConnectedText(node.id)} />}
                            {node.type === NodeType.COMPARE && (
                                <CompareNode
                                    node={node}
                                    connectedImages={toDisplayUrls(getConnectedImages(node.id))}
                                    updateNodeData={updateNodeData}
                                    onExpand={(url) => {
                                        setActiveGalleryImages([{ url, nodeId: node.id }])
                                        setGalleryStartIndex(0)
                                        setShowGallery(true)
                                    }}
                                />
                            )}
                        </NodeContainer>
                    ))}
                </div>
            </div>

            {/* UI Overlay */}
            <div className="absolute top-4 left-4 z-50 flex items-center gap-2 pointer-events-none" onMouseDown={(e) => e.stopPropagation()}>
                <div className="pointer-events-auto flex items-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-lg shadow-lg border border-slate-200 dark:border-zinc-700 p-1 gap-1">
                    {/* Graph Selector */}
                    <div className="relative" onMouseEnter={openGraphDropdown} onMouseLeave={closeGraphDropdown}>
                        <div className="flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
                            <div className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500 whitespace-nowrap">MiniVAgent</div>
                            <ChevronDown size={14} className="text-slate-400" />
                        </div>

                        {/* Dropdown */}
                        {showGraphDropdown && <div className="absolute top-full left-0 mt-1 w-56 max-h-96 overflow-y-auto thin-scrollbar bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-slate-200 dark:border-zinc-700 animate-in fade-in zoom-in-95 duration-150" onWheel={(e) => e.stopPropagation()}>
                            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Recent files</div>
                            {availableGraphs.length === 0 ? (
                                <div className="px-3 py-4 text-sm text-slate-500 dark:text-zinc-500 text-center">No graphs available</div>
                            ) : (
                                availableGraphs.map((graph) => (
                                    <button
                                        key={graph.id}
                                        onClick={() => loadGraphFromDropdown(graph.id, graph.source.replace('.json', ''))}
                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors ${currentGraphId === graph.id ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-slate-50 dark:bg-zinc-800' : 'text-slate-600 dark:text-zinc-300'}`}
                                    >
                                        {graph.source.replace('.json', '')}
                                    </button>
                                ))
                            )}
                        </div>}
                    </div>

                    <div className="h-6 w-[1px] bg-slate-200 dark:bg-zinc-700 mx-1" />

                    {/* Graph Manager */}
                    <GraphManager currentNodes={nodes} currentEdges={edges} currentGraphId={currentGraphId} currentGraphName={currentGraphName} onNew={handleNewGraph} onSaveSuccess={handleSaveSuccess} />

                    <div className="h-6 w-[1px] bg-slate-200 dark:bg-zinc-700 mx-1" />

                    <button
                        onClick={runFullFlow}
                        className={`p-2 rounded-md transition-all ${isRunningFlow ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-emerald-600 dark:text-emerald-500'}`}
                        title="Run Full Flow"
                        disabled={isRunningFlow}
                    >
                        {isRunningFlow ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                    </button>

                    <button onClick={resetAllOutputs} className="p-2 rounded-md transition-all hover:bg-slate-100 dark:hover:bg-zinc-800 text-orange-600 dark:text-orange-500" title="Reset All Outputs" disabled={isRunningFlow}>
                        <RotateCcw size={18} />
                    </button>

                    <div className="h-6 w-[1px] bg-slate-200 dark:bg-zinc-700 mx-1" />

                    <button onClick={() => setShowConfigModal(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-slate-700 dark:text-zinc-300" title="View Configuration">
                        <Code size={18} />
                    </button>
                    <a href="https://github.com/bmustata/minivagent" target="_blank" rel="noreferrer" className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-slate-700 dark:text-zinc-300" title="GitHub">
                        <Github size={18} />
                    </a>
                    <button onClick={toggleTheme} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-slate-700 dark:text-zinc-300">
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>
            </div>

            {/* Top Right Gallery Button */}
            <div className="absolute top-4 right-4 z-50 pointer-events-auto flex items-center gap-2">
                {selectedNodeIds.length > 1 && (
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/90 backdrop-blur-md rounded-lg shadow-lg text-white text-sm font-semibold select-none">
                        <span>{selectedNodeIds.length} selected</span>
                        <button
                            onClick={() => { setSelectedNodeIds([]); setSelectedNodeId(null) }}
                            className="ml-1 opacity-70 hover:opacity-100 transition-opacity"
                            title="Clear selection"
                        >
                            <X size={13} />
                        </button>
                    </div>
                )}
                <button
                    onClick={() => {
                        // Show all images in the workspace for the global gallery
                        setActiveGalleryImages(galleryImages)
                        setGalleryStartIndex(0)
                        setShowGallery(true)
                    }}
                    disabled={galleryImages.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-lg shadow-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                    <ImageIcon size={18} className="text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-zinc-200">Gallery</span>
                    <span className="ml-1 text-xs font-bold bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full text-slate-500 dark:text-zinc-400 group-hover:bg-white dark:group-hover:bg-zinc-700 transition-colors">
                        {galleryImages.length}
                    </span>
                </button>
            </div>

            {/* Toolbar */}
            <div className="absolute left-1/2 bottom-6 -translate-x-1/2 z-50 pointer-events-auto" onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-full shadow-xl border border-slate-200 dark:border-zinc-700 p-1.5 px-3 transition-transform">
                    <button onClick={() => addNode(NodeType.TEXT_GEN)} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-slate-600 dark:text-zinc-400">
                        <Type size={20} />
                        <span className="text-[10px] font-semibold uppercase">Text Gen</span>
                    </button>
                    <div className="w-[1px] h-8 bg-slate-200 dark:bg-zinc-800 mx-1" />
                    <button onClick={() => addNode(NodeType.IMAGE_GEN)} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-slate-600 dark:text-zinc-400">
                        <ImageIcon size={20} />
                        <span className="text-[10px] font-semibold uppercase">Image Gen</span>
                    </button>
                    <div className="w-[1px] h-8 bg-slate-200 dark:bg-zinc-800 mx-1" />
                    <button onClick={() => addNode(NodeType.IMAGE_TO_TEXT)} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-slate-600 dark:text-zinc-400">
                        <ScanEye size={20} />
                        <span className="text-[10px] font-semibold uppercase">Vision</span>
                    </button>
                    <div className="w-[1px] h-8 bg-slate-200 dark:bg-zinc-800 mx-1" />
                    <button onClick={() => addNode(NodeType.IMAGE_SOURCE)} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-slate-600 dark:text-zinc-400">
                        <Box size={20} />
                        <span className="text-[10px] font-semibold uppercase">Source</span>
                    </button>
                    <div className="w-[1px] h-8 bg-slate-200 dark:bg-zinc-800 mx-1" />
                    <button onClick={() => addNode(NodeType.COMPARE)} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-slate-600 dark:text-zinc-400">
                        <Columns2 size={20} />
                        <span className="text-[10px] font-semibold uppercase">Compare</span>
                    </button>
                    <div className="w-[1px] h-8 bg-slate-200 dark:bg-zinc-800 mx-1" />
                    <button onClick={() => addNode(NodeType.NOTE)} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-slate-600 dark:text-zinc-400">
                        <StickyNote size={20} />
                        <span className="text-[10px] font-semibold uppercase">Note</span>
                    </button>
                </div>
            </div>

            {/* Node Properties Panel — right side, shown when IMAGE_GEN or TEXT_GEN selected */}
            {(() => {
                const selectedNode = nodes.find((n) => n.id === selectedNodeId)
                if (!selectedNode || selectedNode.type === NodeType.IMAGE_TO_TEXT) return null
                return (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 z-50 pointer-events-auto" onMouseDown={(e) => e.stopPropagation()}>
                        {selectedNode.type === NodeType.IMAGE_GEN && (
                            <ImageGenPropsPanel
                                node={selectedNode}
                                updateNodeData={updateNodeData}
                                connectedInputText={getConnectedText(selectedNode.id)}
                                onClose={() => { setSelectedNodeId(null); setSelectedNodeIds([]) }}
                                onRun={() => executeNode(selectedNode.id)}
                            />
                        )}
                        {selectedNode.type === NodeType.TEXT_GEN && (
                            <TextGenPropsPanel
                                node={selectedNode}
                                updateNodeData={updateNodeData}
                                connectedInputText={getConnectedText(selectedNode.id)}
                                onClose={() => { setSelectedNodeId(null); setSelectedNodeIds([]) }}
                                onRun={() => executeNode(selectedNode.id)}
                            />
                        )}
                        {selectedNode.type === NodeType.COMPARE && (
                            <ComparePropsPanel
                                node={selectedNode}
                                updateNodeData={updateNodeData}
                                onClose={() => { setSelectedNodeId(null); setSelectedNodeIds([]) }}
                            />
                        )}
                        {selectedNode.type === NodeType.IMAGE_SOURCE && (
                            <ImageSourcePropsPanel
                                node={selectedNode}
                                updateNodeData={updateNodeData}
                                onClose={() => { setSelectedNodeId(null); setSelectedNodeIds([]) }}
                            />
                        )}
                    </div>
                )
            })()}

            {/* Image-to-Text Properties Panel — left side, enabled by default */}
            {(() => {
                const selectedNode = nodes.find((n) => n.id === selectedNodeId)
                if (!selectedNode || selectedNode.type !== NodeType.IMAGE_TO_TEXT) return null
                return (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 z-50 pointer-events-auto" onMouseDown={(e) => e.stopPropagation()}>
                        <ImageToTextPropsPanel
                            node={selectedNode}
                            updateNodeData={updateNodeData}
                            connectedInputText={getConnectedText(selectedNode.id)}
                            onClose={() => { setSelectedNodeId(null); setSelectedNodeIds([]) }}
                            onRun={() => executeNode(selectedNode.id)}
                        />
                    </div>
                )
            })()}

            {/* Zoom Controls */}
            <div className="absolute bottom-6 left-6 z-50 pointer-events-auto flex flex-col gap-2" onMouseDown={(e) => e.stopPropagation()}>
                <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-lg shadow-lg border border-slate-200 dark:border-zinc-700 p-1">
                    <button onClick={() => setZoom((z) => Math.min(z + 0.1, 3))} className="p-2 block hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-md text-slate-600 dark:text-zinc-400">
                        <ZoomIn size={18} />
                    </button>
                    <button onClick={() => setZoom((z) => Math.max(z - 0.1, 0.2))} className="p-2 block hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-md text-slate-600 dark:text-zinc-400">
                        <ZoomOut size={18} />
                    </button>
                </div>
            </div>

            {/* Assistant & Instructions Panel Container */}
            <div className="absolute bottom-6 right-6 z-50 pointer-events-auto flex items-end gap-2" onMouseDown={(e) => e.stopPropagation()}>
                {/* Assistant Column */}
                <div className="flex flex-col items-end">
                    {showAssistant && (
                        <div className="w-72 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-lg shadow-xl border border-slate-200 dark:border-zinc-700 overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
                            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">
                                <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                    <Sparkles size={14} />
                                    Flow Assistant
                                </div>
                                <button onClick={() => setShowAssistant(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-slate-500 dark:text-zinc-400">
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="p-3">
                                <p className="text-xs text-slate-500 dark:text-zinc-400 mb-2">Describe what you want to build (e.g., "Create 3 variations of a futuristic chair").</p>
                                <textarea
                                    value={assistantPrompt}
                                    onChange={(e) => setAssistantPrompt(e.target.value)}
                                    placeholder="Enter your request..."
                                    className="w-full text-sm p-2 rounded-md bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none mb-2"
                                    rows={3}
                                />
                                <button
                                    onClick={handleAssistantSubmit}
                                    disabled={isAnalyzing || !assistantPrompt.trim()}
                                    className="w-full flex items-center justify-center gap-2 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-zinc-700 text-white text-xs font-bold rounded-md transition-colors uppercase tracking-wide"
                                >
                                    {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    Analysis & Build
                                </button>
                            </div>
                        </div>
                    )}

                    {!showAssistant && (
                        <button
                            onClick={() => setShowAssistant(true)}
                            className="flex items-center justify-center w-10 h-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-full shadow-lg border border-slate-200 dark:border-zinc-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-zinc-800 transition-colors"
                            title="Open Assistant"
                        >
                            <MessageSquare size={20} />
                        </button>
                    )}
                </div>

                {/* Guide Column */}
                <div className="flex flex-col items-end">
                    {showInstructions && (
                        <div className={`transition-all duration-300 ease-in-out ${enlargeInstructions ? 'w-80' : 'w-64'}`}>
                            <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-lg shadow-xl border border-slate-200 dark:border-zinc-700 overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-zinc-300 uppercase tracking-wider">
                                        <Info size={14} />
                                        {APP_CONFIG.instructions.title}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setEnlargeInstructions(!enlargeInstructions)}
                                            className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-slate-500 dark:text-zinc-400"
                                            title={enlargeInstructions ? 'Minimize' : 'Enlarge'}
                                        >
                                            {enlargeInstructions ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                                        </button>
                                        <button onClick={() => setShowInstructions(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-slate-500 dark:text-zinc-400">
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className={`p-3 ${enlargeInstructions ? 'text-base' : 'text-xs'} text-slate-600 dark:text-zinc-400 space-y-3 transition-all max-h-[60vh] overflow-y-auto custom-scrollbar`}>
                                    {APP_CONFIG.instructions.sections.map((section, idx) => (
                                        <div key={idx}>
                                            <h4 className="font-bold text-slate-800 dark:text-zinc-200 mb-1 opacity-80">{section.title}</h4>
                                            <ul className="space-y-0.5">
                                                {section.items.map((item, i) => (
                                                    <li key={i} className="flex gap-2 items-start">
                                                        <span className="mt-1 w-1 h-1 rounded-full bg-slate-400 dark:bg-zinc-500 shrink-0"></span>
                                                        <span className="opacity-90 leading-tight">{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {!showInstructions && (
                        <button
                            onClick={() => setShowInstructions(true)}
                            className="flex items-center justify-center w-10 h-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-full shadow-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Show Guide"
                        >
                            <Info size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Config Modal */}
            <ConfigModal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} nodes={nodes} edges={edges} />

            {/* Gallery Modal */}
            <GalleryModal isOpen={showGallery} onClose={() => setShowGallery(false)} images={activeGalleryImages} initialIndex={galleryStartIndex} nodes={nodes} />

            {/* New Graph Confirmation Modal */}
            {showNewGraphConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg shadow-2xl border border-slate-200 dark:border-zinc-700">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-200 dark:border-zinc-700">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300">Create New Graph</h2>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            <p className="text-sm text-slate-700 dark:text-zinc-300">Current unsaved changes will be lost. Are you sure you want to create a new graph?</p>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200 dark:border-zinc-700">
                            <button onClick={() => setShowNewGraphConfirm(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
                                Cancel
                            </button>
                            <button onClick={createNewGraph} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-md transition-colors">
                                Create New
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Graph Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg shadow-2xl border border-slate-200 dark:border-zinc-700">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-200 dark:border-zinc-700">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Delete Graph</h2>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            <p className="text-sm text-slate-700 dark:text-zinc-300">
                                Delete <span className="font-semibold">"{currentGraphName}"</span>? This action cannot be undone.
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200 dark:border-zinc-700">
                            <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
                                Cancel
                            </button>
                            <button onClick={confirmDeleteGraph} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-md transition-colors">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
