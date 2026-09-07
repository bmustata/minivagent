import React from 'react'
import { Link as LinkIcon } from 'lucide-react'
import { Node, NodeData } from '../../types'

interface NoteNodeProps {
    node: Node
    updateNodeData: (id: string, data: Partial<NodeData>) => void
    connectedInputText?: string
}

export const NoteNode: React.FC<NoteNodeProps> = ({ node, updateNodeData, connectedInputText }) => {
    const isLinked = !!connectedInputText
    const isResized = !!node.data.height

    const handleWheel = (e: React.WheelEvent) => {
        const target = e.currentTarget as HTMLElement
        if (target.scrollHeight > target.clientHeight) e.stopPropagation()
    }

    return (
        <div className="flex flex-col gap-2 h-full">
            {isLinked && (
                <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    <LinkIcon size={10} />
                    <span>Linked text will be appended</span>
                </div>
            )}
            {isLinked && (
                <div
                    className="w-full text-xs p-2 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 italic whitespace-pre-wrap max-h-24 overflow-y-auto custom-scrollbar"
                    onWheel={handleWheel}
                >
                    {connectedInputText}
                </div>
            )}
            <textarea
                className={`w-full bg-amber-50/50 dark:bg-amber-900/10 border-none rounded-md p-3 text-slate-700 dark:text-zinc-200 text-sm placeholder-slate-400 dark:placeholder-zinc-500 leading-relaxed resize-none focus:ring-1 focus:ring-amber-400 focus:outline-none ${isResized ? 'flex-1 overflow-y-auto' : 'min-h-[8rem] overflow-hidden'}`}
                placeholder="Write a note..."
                value={node.data.prompt}
                onChange={(e) => updateNodeData(node.id, { prompt: e.target.value })}
                onMouseDown={(e) => e.stopPropagation()}
                onWheel={handleWheel}
            />
        </div>
    )
}
