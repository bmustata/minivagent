import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Eye, Maximize2, Minimize2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Node, NodeData } from '../../types'

interface CompareNodeProps {
    node: Node
    connectedImages: string[]
    updateNodeData: (id: string, data: Partial<NodeData>) => void
    onExpand: (imageUrl: string) => void
}

type CompareMode = 'slider' | 'toggle'

export const CompareNode: React.FC<CompareNodeProps> = ({ node, connectedImages, updateNodeData, onExpand }) => {
    // Slider always uses first 2; toggle can cycle through all
    const sliderImages = connectedImages.slice(0, 2)

    const [mode, setMode] = useState<CompareMode>((node.data.compareMode as CompareMode) ?? 'slider')
    const [sliderPos, setSliderPos] = useState(50) // 0–100 percent
    const [toggleVisible, setToggleVisible] = useState<number>(0)
    const [isFullscreen, setIsFullscreen] = useState(false)

    const containerRef = useRef<HTMLDivElement>(null)
    const fsContainerRef = useRef<HTMLDivElement>(null)
    const isDragging = useRef(false)
    const isFsDragging = useRef(false)

    // Keyboard navigation: arrows cycle images in toggle mode / nudge slider in slider mode; Escape closes fullscreen
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false)
                return
            }
            if (mode === 'toggle') {
                if (connectedImages.length < 2) return
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault()
                    setToggleVisible((v) => (v + 1) % connectedImages.length)
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault()
                    setToggleVisible((v) => (v - 1 + connectedImages.length) % connectedImages.length)
                }
            } else if (mode === 'slider') {
                const step = e.shiftKey ? 1 : 5
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault()
                    setSliderPos((p) => Math.min(100, p + step))
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault()
                    setSliderPos((p) => Math.max(0, p - step))
                }
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [isFullscreen, mode, connectedImages.length])

    // Sync passthrough outputs into nodeData.imageResources.
    // connectedImages arrive as display URLs (/api/resources/<uuid> or data:).
    // Strip the /api/resources/ prefix so only the bare UUID is stored in the graph file.
    useEffect(() => {
        const resourceIds = connectedImages.map((url) =>
            url.startsWith('/api/resources/') ? url.slice('/api/resources/'.length) : url
        )
        updateNodeData(node.id, { imageResources: resourceIds.length > 0 ? resourceIds : undefined })
        // Reset toggle index if it's now out of bounds
        setToggleVisible((v) => (v >= connectedImages.length ? 0 : v))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connectedImages.join(',')])

    // --- Slider drag (shared logic) ---
    const getPosFromEvent = (clientX: number, ref: React.RefObject<HTMLDivElement | null>): number => {
        if (!ref.current) return sliderPos
        const rect = ref.current.getBoundingClientRect()
        const x = clientX - rect.left
        return Math.max(0, Math.min(100, (x / rect.width) * 100))
    }

    const getSliderPosFromEvent = (clientX: number): number => getPosFromEvent(clientX, containerRef)
    const getFsSliderPosFromEvent = useCallback((clientX: number): number => getPosFromEvent(clientX, fsContainerRef), [])

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

    // Fullscreen pointer handlers
    const handleFsPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (mode !== 'slider') return
        isFsDragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        setSliderPos(getFsSliderPosFromEvent(e.clientX))
    }

    const handleFsPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isFsDragging.current || mode !== 'slider') return
        setSliderPos(getFsSliderPosFromEvent(e.clientX))
    }

    const handleFsPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        isFsDragging.current = false
        e.currentTarget.releasePointerCapture(e.pointerId)
    }

    // --- Render ---
    const CONTAINER_HEIGHT = 220

    const img0 = sliderImages[0]
    const img1 = sliderImages[1]

    const isEmpty = connectedImages.length === 0
    const isSingle = sliderImages.length === 1 // slider-specific

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
                                    {sliderPos >= 20 && <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/40 text-white text-[10px] font-bold pointer-events-none z-10 backdrop-blur-sm">Image 1</div>}
                                    {sliderPos <= 80 && <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/40 text-white text-[10px] font-bold pointer-events-none z-10 backdrop-blur-sm">Image 2</div>}

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
                                src={connectedImages[toggleVisible]}
                                alt={`Image ${toggleVisible + 1}`}
                                className="w-full h-full object-cover"
                                draggable={false}
                            />

                            {/* Expand */}
                            <button
                                className="absolute bottom-2 right-2 p-1 rounded bg-black/40 text-white opacity-0 hover:opacity-100 transition-opacity z-10 backdrop-blur-sm"
                                onClick={(e) => { e.stopPropagation(); onExpand(connectedImages[toggleVisible]) }}
                                title="Expand image"
                            >
                                <Maximize2 size={12} />
                            </button>
                        </>
                    )}
                    </div>

                    {/* Eye / cycle button — outside overflow-hidden so it's never clipped */}
                    {mode === 'toggle' && connectedImages.length > 1 && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 z-20">
                            <button
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-zinc-900 text-white text-[11px] font-bold shadow-lg border border-white/20 hover:bg-zinc-700 active:scale-95 transition-all"
                                onClick={(e) => { e.stopPropagation(); setToggleVisible((v) => (v + 1) % connectedImages.length) }}
                                title="Next image (→)"
                            >
                                <Eye size={14} />
                                <span>{toggleVisible + 1}/{connectedImages.length}</span>
                            </button>
                        </div>
                    )}

                    {/* Fullscreen button — top-right, always visible on hover */}
                    <button
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-900/80 text-white z-20 shadow-lg border border-white/20 hover:bg-zinc-700 active:scale-95 transition-all"
                        onClick={(e) => { e.stopPropagation(); setIsFullscreen(true) }}
                        title="Compare fullscreen"
                    >
                        <Maximize2 size={13} />
                    </button>
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

            {/* Fullscreen overlay — rendered via portal so it escapes node stacking contexts */}
            {isFullscreen && createPortal(
                <div
                    className="fixed inset-0 z-[200] bg-black flex flex-col animate-in fade-in duration-150"
                    onClick={() => setIsFullscreen(false)}
                >
                    {/* Top bar */}
                    <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-30 pointer-events-none">
                        {/* Mode selector */}
                        <select
                            value={mode}
                            onChange={(e) => {
                                const next = e.target.value as CompareMode
                                setMode(next)
                                updateNodeData(node.id, { compareMode: next })
                            }}
                            className="text-sm font-medium rounded-lg border border-white/20 bg-black/60 text-white px-3 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-400 backdrop-blur-md pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <option value="slider">Slider</option>
                            <option value="toggle">Toggle</option>
                        </select>

                        <button
                            onClick={(e) => { e.stopPropagation(); setIsFullscreen(false) }}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white pointer-events-auto"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Image area */}
                    <div className="relative flex-1" onClick={(e) => e.stopPropagation()}>
                        <div
                            ref={fsContainerRef}
                            className="absolute inset-0 select-none"
                            style={{ cursor: mode === 'slider' ? 'col-resize' : 'default' }}
                            onPointerDown={handleFsPointerDown}
                            onPointerMove={handleFsPointerMove}
                            onPointerUp={handleFsPointerUp}
                            onPointerCancel={handleFsPointerUp}
                        >
                            {mode === 'slider' && (
                                isSingle ? (
                                    <img src={img0} alt="Image 1" className="absolute inset-0 w-full h-full object-contain" draggable={false} />
                                ) : (
                                    <>
                                        {/* Right image */}
                                        <img src={img1} alt="Image 2" className="absolute inset-0 w-full h-full object-contain" draggable={false} />

                                        {/* Left image — clipped */}
                                        <img
                                            src={img0}
                                            alt="Image 1"
                                            className="absolute inset-0 w-full h-full object-contain"
                                            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                                            draggable={false}
                                        />

                                        {/* Divider */}
                                        <div
                                            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none z-10"
                                            style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
                                        >
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center pointer-events-none">
                                                <div className="flex gap-0.5">
                                                    <div className="w-px h-4 bg-slate-400 rounded-full" />
                                                    <div className="w-px h-4 bg-slate-400 rounded-full" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Labels */}
                                        {sliderPos >= 20 && <div className="absolute bottom-4 left-4 px-2 py-1 rounded bg-black/50 text-white text-xs font-bold pointer-events-none z-10 backdrop-blur-sm">Image 1</div>}
                                        {sliderPos <= 80 && <div className="absolute bottom-4 right-4 px-2 py-1 rounded bg-black/50 text-white text-xs font-bold pointer-events-none z-10 backdrop-blur-sm">Image 2</div>}
                                    </>
                                )
                            )}

                            {mode === 'toggle' && (
                                <img
                                    src={connectedImages[toggleVisible]}
                                    alt={`Image ${toggleVisible + 1}`}
                                    className="absolute inset-0 w-full h-full object-contain"
                                    draggable={false}
                                />
                            )}
                        </div>

                        {/* Eye / cycle button for fullscreen toggle mode */}
                        {mode === 'toggle' && connectedImages.length > 1 && (
                            <div className="absolute top-16 left-4 flex items-center gap-2 z-20">
                                <button
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-zinc-900 text-white text-sm font-bold shadow-lg border border-white/20 hover:bg-zinc-700 active:scale-95 transition-all"
                                    onClick={(e) => { e.stopPropagation(); setToggleVisible((v) => (v + 1) % connectedImages.length) }}
                                    title="Next image (→)"
                                >
                                    <Eye size={16} />
                                    <span>{toggleVisible + 1}/{connectedImages.length}</span>
                                </button>
                            </div>
                        )}

                        {/* Minimize button */}
                        <button
                            className="absolute bottom-4 right-4 p-2 rounded-lg bg-zinc-900/80 text-white z-20 shadow-lg border border-white/20 hover:bg-zinc-700 active:scale-95 transition-all"
                            onClick={(e) => { e.stopPropagation(); setIsFullscreen(false) }}
                            title="Exit fullscreen"
                        >
                            <Minimize2 size={18} />
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
