import React, { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, Maximize2 } from 'lucide-react'
import { Node, NodeData } from '../../types'

interface CompareNodeProps {
    node: Node
    connectedImages: string[]
    updateNodeData: (id: string, data: Partial<NodeData>) => void
    onExpand: (imageUrl: string) => void
}

type CompareMode = 'slider' | 'toggle'

export const CompareNode: React.FC<CompareNodeProps> = ({ node, connectedImages, updateNodeData, onExpand }) => {
    const images = connectedImages.slice(0, 2)

    const [mode, setMode] = useState<CompareMode>((node.data.compareMode as CompareMode) ?? 'slider')
    const [sliderPos, setSliderPos] = useState(50) // 0–100 percent
    const [toggleVisible, setToggleVisible] = useState<0 | 1>(0)

    const containerRef = useRef<HTMLDivElement>(null)
    const isDragging = useRef(false)

    // Sync passthrough outputs into nodeData.imageResources.
    // connectedImages arrive as display URLs (/api/resources/<uuid> or data:).
    // Strip the /api/resources/ prefix so only the bare UUID is stored in the graph file.
    useEffect(() => {
        const resourceIds = images.map((url) =>
            url.startsWith('/api/resources/') ? url.slice('/api/resources/'.length) : url
        )
        updateNodeData(node.id, { imageResources: resourceIds.length > 0 ? resourceIds : undefined })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connectedImages.join(',')])

    // --- Slider drag ---
    const getSliderPosFromEvent = (clientX: number): number => {
        if (!containerRef.current) return sliderPos
        const rect = containerRef.current.getBoundingClientRect()
        const x = clientX - rect.left
        return Math.max(0, Math.min(100, (x / rect.width) * 100))
    }

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (mode !== 'slider') return
        isDragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        setSliderPos(getSliderPosFromEvent(e.clientX))
    }

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging.current || mode !== 'slider') return
        setSliderPos(getSliderPosFromEvent(e.clientX))
    }

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        isDragging.current = false
        e.currentTarget.releasePointerCapture(e.pointerId)
    }

    // --- Render ---
    const CONTAINER_HEIGHT = 220

    const img0 = images[0]
    const img1 = images[1]

    const isEmpty = images.length === 0
    const isSingle = images.length === 1

    return (
        <div className="flex flex-col gap-2">
            {/* Image viewport */}
            {isEmpty ? (
                <div
                    className="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500 text-xs text-center px-4"
                    style={{ height: CONTAINER_HEIGHT }}
                >
                    Connect up to 2 image nodes to compare
                </div>
            ) : (
                /* Wrapper is relative so the eye button can sit outside overflow-hidden */
                <div className="relative">
                    <div
                        ref={containerRef}
                        className="relative rounded-lg overflow-hidden select-none"
                        style={{ height: CONTAINER_HEIGHT, cursor: mode === 'slider' ? 'col-resize' : 'default' }}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                    >
                    {mode === 'slider' && (
                        <>
                            {isSingle ? (
                                /* Single image — show plainly without slider UI */
                                <img
                                    src={img0}
                                    alt="Image 1"
                                    className="absolute inset-0 w-full h-full object-cover"
                                    draggable={false}
                                />
                            ) : (
                                <>
                                    {/* Right image — full width, unclipped */}
                                    <img
                                        src={img1}
                                        alt="Image 2"
                                        className="absolute inset-0 w-full h-full object-cover"
                                        draggable={false}
                                    />

                                    {/* Left image — same size, clipped by percentage via clipPath so pixels never stretch */}
                                    <img
                                        src={img0}
                                        alt="Image 1"
                                        className="absolute inset-0 w-full h-full object-cover"
                                        style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                                        draggable={false}
                                    />

                                    {/* Divider line */}
                                    <div
                                        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none z-10"
                                        style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
                                    >
                                        {/* Handle circle */}
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center pointer-events-none">
                                            <div className="flex gap-px">
                                                <div className="w-px h-3 bg-slate-400 rounded-full" />
                                                <div className="w-px h-3 bg-slate-400 rounded-full" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Labels */}
                                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/40 text-white text-[10px] font-bold pointer-events-none z-10 backdrop-blur-sm">1</div>
                                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/40 text-white text-[10px] font-bold pointer-events-none z-10 backdrop-blur-sm">2</div>

                                    {/* Expand buttons */}
                                    <button
                                        className="absolute bottom-2 left-2 p-1 rounded bg-black/40 text-white opacity-0 hover:opacity-100 transition-opacity z-10 backdrop-blur-sm"
                                        onClick={(e) => { e.stopPropagation(); onExpand(img0) }}
                                        title="Expand image 1"
                                    >
                                        <Maximize2 size={12} />
                                    </button>
                                    <button
                                        className="absolute bottom-2 right-2 p-1 rounded bg-black/40 text-white opacity-0 hover:opacity-100 transition-opacity z-10 backdrop-blur-sm"
                                        onClick={(e) => { e.stopPropagation(); onExpand(img1!) }}
                                        title="Expand image 2"
                                    >
                                        <Maximize2 size={12} />
                                    </button>
                                </>
                            )}
                        </>
                    )}

                    {mode === 'toggle' && (
                        <>
                            <img
                                src={images[toggleVisible]}
                                alt={`Image ${toggleVisible + 1}`}
                                className="w-full h-full object-cover"
                                draggable={false}
                            />

                            {/* Expand */}
                            <button
                                className="absolute bottom-2 right-2 p-1 rounded bg-black/40 text-white opacity-0 hover:opacity-100 transition-opacity z-10 backdrop-blur-sm"
                                onClick={(e) => { e.stopPropagation(); onExpand(images[toggleVisible]) }}
                                title="Expand image"
                            >
                                <Maximize2 size={12} />
                            </button>
                        </>
                    )}
                    </div>

                    {/* Eye toggle button — outside overflow-hidden so it's never clipped */}
                    {mode === 'toggle' && !isSingle && (
                        <button
                            className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-zinc-900 text-white text-[11px] font-bold z-20 shadow-lg border border-white/20 hover:bg-zinc-700 active:scale-95 transition-all"
                            onClick={(e) => {
                                e.stopPropagation()
                                setToggleVisible((v) => (v === 0 ? 1 : 0))
                            }}
                            title="Toggle between images"
                        >
                            {toggleVisible === 0 ? <Eye size={14} /> : <EyeOff size={14} />}
                            <span>{toggleVisible + 1}</span>
                        </button>
                    )}
                </div>
            )}

            {/* Mode selector */}
            <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-semibold uppercase text-slate-400 dark:text-zinc-500 tracking-wider">Mode</span>
                <select
                    value={mode}
                    onChange={(e) => {
                        const next = e.target.value as CompareMode
                        setMode(next)
                        updateNodeData(node.id, { compareMode: next })
                    }}
                    className="text-[11px] font-medium rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-400"
                    onClick={(e) => e.stopPropagation()}
                >
                    <option value="slider">Slider</option>
                    <option value="toggle">Toggle</option>
                </select>
            </div>
        </div>
    )
}
