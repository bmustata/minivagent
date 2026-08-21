import React, { useRef } from 'react'
import { X, StickyNote, Type, Image as ImageIcon, ScanEye, Box, Columns2, Scissors, Gamepad2, Layers } from 'lucide-react'
import { Node, NodeType } from '../types'

interface NodeContainerProps {
    node: Node
    selected: boolean
    zoom?: number
    onDelete: (id: string) => void
    onSelect: (id: string) => void
    onResize?: (id: string, width: number, height: number) => void
    onDragStart: (e: React.MouseEvent | React.TouchEvent, id: string) => void
    onConnectStart: (e: React.MouseEvent | React.TouchEvent, id: string, type: 'source' | 'target', handleId?: string) => void
    onConnectEnd: (e: React.MouseEvent | React.TouchEvent, id: string, handleId: string) => void
    children: React.ReactNode
}

export const NodeContainer: React.FC<NodeContainerProps> = ({ node, selected, zoom = 1, onDelete, onSelect, onResize, onDragStart, onConnectStart, onConnectEnd, children }) => {
    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
        onDragStart(e, node.id)
    }

    const resizeDragRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null)

    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        const el = e.currentTarget.closest('[data-node-id]') as HTMLElement
        resizeDragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startW: node.data.width ?? el.offsetWidth,
            startH: node.data.height ?? el.offsetHeight,
        }
        const onMove = (ev: MouseEvent) => {
            if (!resizeDragRef.current) return
            const newW = Math.max(240, Math.round((resizeDragRef.current.startW + (ev.clientX - resizeDragRef.current.startX) / zoom) / 8) * 8)
            const newH = Math.max(120, Math.round((resizeDragRef.current.startH + (ev.clientY - resizeDragRef.current.startY) / zoom) / 8) * 8)
            onResize?.(node.id, newW, newH)
        }
        const onUp = () => {
            resizeDragRef.current = null
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
        }
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
    }

    const isNote = node.type === NodeType.NOTE
    const nodeStyle: React.CSSProperties = isNote
        ? { left: node.position.x, top: node.position.y, width: node.data.width ?? 320, height: node.data.height ?? undefined }
        : { left: node.position.x, top: node.position.y }

    // Determine styles based on type
    const borderColor = selected ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 border-transparent' : 'border border-slate-300 dark:border-zinc-700'

    let headerColor = ''
    let headerIcon = null
    let title = ''

    switch (node.type) {
        case NodeType.TEXT_GEN:
            headerColor = 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            headerIcon = <Type size={14} />
            title = 'Text Generator'
            break
        case NodeType.IMAGE_GEN:
            headerColor = 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
            headerIcon = <ImageIcon size={14} />
            title = 'Image Generation'
            break
        case NodeType.IMAGE_GEN_PIXELATE:
            headerColor = 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
            headerIcon = <Gamepad2 size={14} />
            title = 'Pixelate'
            break
        case NodeType.IMAGE_GEN_TEXTURE:
            headerColor = 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
            headerIcon = <Layers size={14} />
            title = 'Texture'
            break
        case NodeType.IMAGE_SOURCE:
            headerColor = 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
            headerIcon = <Box size={14} />
            title = 'Image Source'
            break
        case NodeType.IMAGE_TO_TEXT:
            headerColor = 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            headerIcon = <ScanEye size={14} />
            title = 'Image to Text'
            break
        case NodeType.NOTE:
            headerColor = 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
            headerIcon = <StickyNote size={14} />
            title = 'Note'
            break
        case NodeType.COMPARE:
            headerColor = 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
            headerIcon = <Columns2 size={14} />
            title = 'Compare'
            break
        case NodeType.SPLIT_TEXT:
            headerColor = 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            headerIcon = <Scissors size={14} />
            title = 'Split Text'
            break
    }

    // Configure Handles
    const outputHandles: { id: string; label: string; top: number; color: string }[] = []
    const inputHandles: { id: string; label: string; top: number; color: string }[] = []

    if (node.type === NodeType.TEXT_GEN) {
        // Text Node: 1 Input, 2 Outputs
        inputHandles.push({ id: 'prompt', label: 'Input', top: 45, color: 'bg-orange-400' })
        outputHandles.push({ id: 'prompt', label: 'PROMPT', top: 45, color: 'bg-orange-400' })
        outputHandles.push({ id: 'output', label: 'RESULT', top: 200, color: 'bg-emerald-400' })
    } else if (node.type === NodeType.IMAGE_GEN) {
        // Image Gen Node: 2 Inputs (Text, Image), Multiple Outputs
        inputHandles.push({ id: 'prompt', label: 'Prompt', top: 45, color: 'bg-orange-400' })
        inputHandles.push({ id: 'image', label: 'Image Input', top: 125, color: 'bg-pink-400' })

        const count = node.data.imageCount || 1
        const startTop = 85
        const spacing = 45

        for (let i = 0; i < count; i++) {
            outputHandles.push({
                id: `image-${i}`,
                label: `IMAGE ${i + 1}`,
                top: startTop + i * spacing,
                color: 'bg-purple-400'
            })
        }
    } else if (node.type === NodeType.IMAGE_GEN_PIXELATE) {
        inputHandles.push({ id: 'prompt', label: 'Prompt', top: 45, color: 'bg-orange-400' })
        inputHandles.push({ id: 'image', label: 'Image Input', top: 125, color: 'bg-pink-400' })
        const pxCount = node.data.imageCount || 1
        for (let i = 0; i < pxCount; i++) {
            outputHandles.push({ id: `image-${i}`, label: `PX ${i + 1}`, top: 85 + i * 45, color: 'bg-teal-400' })
        }
    } else if (node.type === NodeType.IMAGE_GEN_TEXTURE) {
        inputHandles.push({ id: 'prompt', label: 'Prompt', top: 45, color: 'bg-orange-400' })
        const txCount = node.data.imageCount || 1
        for (let i = 0; i < txCount; i++) {
            outputHandles.push({ id: `image-${i}`, label: `TEX ${i + 1}`, top: 85 + i * 45, color: 'bg-orange-400' })
        }
    } else if (node.type === NodeType.IMAGE_SOURCE) {
        // Image Source Node: 1 Output
        outputHandles.push({ id: 'image', label: 'IMAGE', top: 120, color: 'bg-cyan-400' })
    } else if (node.type === NodeType.IMAGE_TO_TEXT) {
        // Image To Text: 2 Inputs (Prompt, Image), 1 Output
        inputHandles.push({ id: 'prompt', label: 'Prompt', top: 45, color: 'bg-orange-400' })
        inputHandles.push({ id: 'image', label: 'Image Input', top: 100, color: 'bg-pink-400' })
        outputHandles.push({ id: 'output', label: 'RESULT', top: 200, color: 'bg-emerald-400' })
    } else if (node.type === NodeType.NOTE) {
        inputHandles.push({ id: 'prompt', label: 'Text', top: 45, color: 'bg-orange-400' })
        outputHandles.push({ id: 'prompt', label: 'TEXT', top: 45, color: 'bg-zinc-400' })
    } else if (node.type === NodeType.COMPARE) {
        // Compare Node: 1 multi-image input, 2 passthrough outputs
        inputHandles.push({ id: 'image', label: 'Images', top: 80, color: 'bg-pink-400' })
        outputHandles.push({ id: 'image-0', label: 'IMG 1', top: 100, color: 'bg-teal-400' })
        outputHandles.push({ id: 'image-1', label: 'IMG 2', top: 160, color: 'bg-teal-400' })
    } else if (node.type === NodeType.SPLIT_TEXT) {
        inputHandles.push({ id: 'prompt', label: 'Text', top: 45, color: 'bg-orange-400' })
        const count = node.data.splitOutputs?.length ?? 2
        for (let i = 0; i < count; i++) {
            outputHandles.push({ id: `split-${i}`, label: `PART ${i + 1}`, top: 45 + i * 30, color: 'bg-emerald-400' })
        }
    }

    return (
        <div
            data-node-id={node.id}
            className={`absolute flex flex-col bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm rounded-lg shadow-xl ${borderColor} transition-shadow duration-200 touch-none select-none group ${isNote ? '' : 'w-80'}`}
            style={nodeStyle}
        >
            {/* Header / Drag Handle */}
            <div
                className={`h-8 ${headerColor} rounded-t-lg flex items-center justify-between px-2 cursor-grab active:cursor-grabbing border-b border-slate-200 dark:border-zinc-700 touch-none`}
                onMouseDown={handlePointerDown}
                onTouchStart={handlePointerDown}
            >
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider pointer-events-none opacity-80">
                    {headerIcon}
                    {title}
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onDelete(node.id)
                    }}
                    className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"
                    onTouchEnd={(e) => e.stopPropagation()}
                >
                    <X size={12} />
                </button>
            </div>

            {/* Content */}
            <div className={`p-3 relative cursor-default ${isNote ? 'flex-1 flex flex-col overflow-hidden' : ''}`} onClick={() => onSelect(node.id)}>{children}</div>

            {/* Input Handles (Left) */}
            {inputHandles.map((handle) => (
                <div
                    key={handle.id}
                    data-handle-type="target"
                    data-node-id={node.id}
                    data-handle-id={handle.id}
                    className="absolute -left-6 w-6 h-6 flex items-center justify-center group/handle cursor-crosshair z-50"
                    style={{ top: `${handle.top}px`, transform: 'translateY(-50%)' }}
                    onMouseUp={(e) => {
                        e.stopPropagation()
                        onConnectEnd(e, node.id, handle.id)
                    }}
                    onTouchEnd={(e) => {
                        e.stopPropagation()
                        onConnectEnd(e, node.id, handle.id)
                    }}
                >
                    {/* Handle Dot */}
                    <div className={`w-3 h-3 ${handle.color} rounded-full border-2 border-white dark:border-zinc-800 shadow-sm transition-transform group-hover/handle:scale-125`} />

                    {/* Label Outside (Left) */}
                    <div
                        className={`absolute right-full mr-1 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md bg-zinc-900/90 dark:bg-zinc-100/90 text-zinc-100 dark:text-zinc-900 text-[10px] font-bold uppercase tracking-wider pointer-events-none whitespace-nowrap shadow-lg backdrop-blur-sm transition-all duration-200 ${selected ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`}
                    >
                        {handle.label}
                    </div>
                </div>
            ))}

            {/* Output Handles (Right) */}
            {outputHandles.map((handle) => (
                <div
                    key={handle.id}
                    data-handle-type="source"
                    data-node-id={node.id}
                    data-handle-id={handle.id}
                    className="absolute -right-6 w-6 h-6 flex items-center justify-center group/handle cursor-crosshair z-50"
                    style={{ top: `${handle.top}px`, transform: 'translateY(-50%)' }}
                    onMouseDown={(e) => {
                        e.stopPropagation()
                        onConnectStart(e, node.id, 'source', handle.id)
                    }}
                    onTouchStart={(e) => {
                        e.stopPropagation()
                        onConnectStart(e, node.id, 'source', handle.id)
                    }}
                >
                    {/* Handle Dot */}
                    <div className={`w-3 h-3 ${handle.color} rounded-full border-2 border-white dark:border-zinc-800 shadow-sm transition-transform group-hover/handle:scale-125`} />

                    {/* Label Outside (Right) */}
                    <div
                        className={`absolute left-full ml-1 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md bg-zinc-900/90 dark:bg-zinc-100/90 text-zinc-100 dark:text-zinc-900 text-[10px] font-bold uppercase tracking-wider pointer-events-none whitespace-nowrap shadow-lg backdrop-blur-sm transition-all duration-200 ${selected ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`}
                    >
                        {handle.label}
                    </div>
                </div>
            ))}

            {/* Resize handle — NOTE nodes only */}
            {isNote && (
                <div
                    className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-50 flex items-end justify-end pb-1 pr-1"
                    onMouseDown={handleResizeMouseDown}
                >
                    <svg width="12" height="12" viewBox="0 0 12 12" className="text-amber-400 dark:text-amber-500">
                        <path d="M2 10 L10 2 M6 10 L10 6 M10 10 L10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                </div>
            )}
        </div>
    )
}
