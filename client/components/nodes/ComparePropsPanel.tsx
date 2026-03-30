import React from 'react'
import { X, Layers } from 'lucide-react'
import { Node, NodeData } from '../../types'

interface CompareNodePropsPanelProps {
    node: Node
    updateNodeData: (id: string, data: Partial<NodeData>) => void
    onClose: () => void
}

type CompareMode = 'slider' | 'toggle'

export const ComparePropsPanel: React.FC<CompareNodePropsPanelProps> = ({ node, updateNodeData, onClose }) => {
    const mode: CompareMode = (node.data.compareMode as CompareMode) ?? 'slider'

    return (
        <div
            className="w-64 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-lg shadow-xl border border-slate-200 dark:border-zinc-700 overflow-hidden animate-in slide-in-from-right-5 duration-200"
            onMouseDown={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                    <Layers size={14} />
                    Compare
                </div>
                <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-slate-500 dark:text-zinc-400">
                    <X size={14} />
                </button>
            </div>

            {/* Body */}
            <div className="p-3 flex flex-col gap-3">
                {/* Mode */}
                <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1 block">Mode</label>
                    <div className="flex gap-1 bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-md">
                        {(['slider', 'toggle'] as CompareMode[]).map((m) => (
                            <button
                                key={m}
                                onClick={() => updateNodeData(node.id, { compareMode: m })}
                                className={`flex-1 py-1 text-xs font-semibold rounded transition-all capitalize ${
                                    mode === m
                                        ? 'bg-white dark:bg-zinc-600 text-teal-600 dark:text-teal-300 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300'
                                }`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
