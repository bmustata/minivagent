import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Save, FilePlus, X, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createGraph, updateGraph, GraphData } from '../services/graphService'
import { Node, Edge, NodeType } from '../types'

interface GraphManagerProps {
    currentNodes: Node[]
    currentEdges: Edge[]
    currentGraphId?: string
    currentGraphName?: string
    onNew: () => void
    onSaveSuccess: (graphId: string, graphName: string) => void
}

export const GraphManager: React.FC<GraphManagerProps> = ({ currentNodes, currentEdges, currentGraphId, currentGraphName, onNew, onSaveSuccess }) => {
    const [isLoading, setIsLoading] = useState(false)

    const handleSave = async () => {
        if (!currentGraphName || !currentGraphName.trim()) {
            toast.error('Please provide a graph name', {
                description: 'Use the title dropdown to rename your graph first.'
            })
            return
        }

        setIsLoading(true)

        try {
            // Sanitize COMPARE node imageResources: strip /api/resources/ prefix down to bare UUIDs
            const sanitizedNodes = currentNodes.map((node) => {
                if (node.type === NodeType.COMPARE) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { prompt, isLoading, imageResources, compareMode, ...rest } = node.data
                    return {
                        ...node,
                        data: {
                            ...rest,
                            ...(compareMode ? { compareMode } : {}),
                            imageResources: (imageResources ?? []).map((r) =>
                                r.startsWith('/api/resources/') ? r.slice('/api/resources/'.length) : r
                            )
                        }
                    }
                }
                return node
            })

            const content: GraphData = {
                name: currentGraphName,
                nodes: sanitizedNodes,
                edges: currentEdges
            }

            if (currentGraphId) {
                // Update existing graph
                await updateGraph(currentGraphId, content)
                toast.success('Graph saved successfully!', {
                    description: `"${currentGraphName}" has been updated.`
                })
                onSaveSuccess(currentGraphId, currentGraphName)
            } else {
                // Create new graph
                const filename = `${currentGraphName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.json`
                const result = await createGraph(filename, content)
                toast.success('Graph created successfully!', {
                    description: `"${currentGraphName}" has been saved.`
                })
                onSaveSuccess(result.id, currentGraphName)
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to save graph'
            toast.error('Failed to save graph', {
                description: errorMessage
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            {/* Action Buttons */}
            <div className="flex gap-2">
                <button
                    onClick={onNew}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 hover:bg-slate-500 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white text-sm font-medium rounded-md transition-colors"
                    title="New Graph"
                >
                    <FilePlus size={14} />
                    <span className="hidden sm:inline">New</span>
                </button>

                <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white text-sm font-medium rounded-md transition-colors"
                    title="Save Graph"
                >
                    {isLoading ? (
                        <>
                            <Loader2 size={14} className="animate-spin" />
                            <span className="hidden sm:inline">Saving...</span>
                        </>
                    ) : (
                        <>
                            <Save size={14} />
                            <span className="hidden sm:inline">Save</span>
                        </>
                    )}
                </button>
            </div>
        </>
    )
}
