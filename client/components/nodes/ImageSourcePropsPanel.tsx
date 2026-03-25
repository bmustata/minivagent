import React from 'react'
import { X, Box } from 'lucide-react'
import { Node, NodeData } from '../../types'

interface ImageSourcePropsPanelProps {
    node: Node
    updateNodeData: (id: string, data: Partial<NodeData>) => void
    onClose: () => void
}

export const ImageSourcePropsPanel: React.FC<ImageSourcePropsPanelProps> = ({ node, updateNodeData, onClose }) => {
    const { imageInput, imageInputType = 'UPLOAD' } = node.data

    if (imageInputType !== 'URL') return null

    return (
        <div
            className="w-72 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-lg shadow-xl border border-slate-200 dark:border-zinc-700 overflow-hidden animate-in slide-in-from-right-5 duration-200"
            onMouseDown={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                    <Box size={14} />
                    Image Source
                </div>
                <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-slate-500 dark:text-zinc-400">
                    <X size={14} />
                </button>
            </div>

            {/* Body */}
            <div className="p-3 flex flex-col gap-3">
                <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1 block">Image URL</label>
                    <input
                        type="text"
                        value={imageInput?.startsWith('data:') ? '' : (imageInput || '')}
                        onChange={(e) => updateNodeData(node.id, { imageInput: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                        className="w-full text-xs p-2 rounded-md bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                </div>
            </div>
        </div>
    )
}
