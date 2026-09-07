import React, { useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Grid3X3, Box, Frame, Palette, Sun, RefreshCw, RefreshCwOff, Maximize, Minimize, Maximize2, Minimize2, MouseLeft, Mouse, Hand, SunDim, Camera, Cloud, Contrast, Globe, EyeOff } from 'lucide-react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// Shared z-index counter so clicking any window brings it to the front
let globalZCounter = 200

interface TexturePreviewModalProps {
    isOpen: boolean
    onClose: () => void
    imageUrl: string
    pixelated?: boolean
    initialTab?: '2d' | '3d'
    textureResolution?: number
    outputFormat?: string
    textureSize?: number
}

type Shape      = 'sphere' | 'cube' | 'plane'
type ShadingMode = 'wireframe' | 'solid' | 'material' | 'lit'
type LightPreset = 'neutral' | 'studio' | 'directional' | 'soft' | 'dramatic' | 'environment' | 'unlit'

const FORMAT_BPC: Record<string, { bpc: number; lossless: boolean }> = {
    PNG:  { bpc: 8, lossless: true },
    JPEG: { bpc: 8, lossless: false },
    WEBP: { bpc: 8, lossless: false },
}

const SHADING_MODES: { id: ShadingMode; label: string; icon: React.ReactNode; description: string }[] = [
    { id: 'wireframe', label: 'Wireframe', icon: <Frame size={12} />,   description: 'Mesh edges only' },
    { id: 'solid',     label: 'Solid',     icon: <Box size={12} />,     description: 'Basic geometry shading, no texture' },
    { id: 'material',  label: 'Material',  icon: <Palette size={12} />, description: 'Texture with soft studio lighting' },
    { id: 'lit',       label: 'Lit',       icon: <Sun size={12} />,     description: 'Full lighting with custom presets' },
]

const LIGHT_PRESETS: { id: LightPreset; label: string; icon: React.ReactNode; description: string }[] = [
    { id: 'neutral',     label: 'Neutral',     icon: <SunDim size={11} />,   description: 'Soft key + weak fill, neutral white balance' },
    { id: 'studio',      label: 'Studio',      icon: <Camera size={11} />,   description: 'Classic 3-point: key, fill & rim' },
    { id: 'directional', label: 'Directional', icon: <Sun size={11} />,      description: 'Strong angled — great for normals & height detail' },
    { id: 'soft',        label: 'Soft',        icon: <Cloud size={11} />,    description: 'Large diffuse light, very weak shadows' },
    { id: 'dramatic',    label: 'Dramatic',    icon: <Contrast size={11} />, description: 'High contrast, strong shadows' },
    { id: 'environment', label: 'Environment', icon: <Globe size={11} />,    description: 'Multi-angle ambient simulating outdoor HDRI' },
    { id: 'unlit',       label: 'Unlit',       icon: <EyeOff size={11} />,   description: 'Raw albedo / base color, no lighting influence' },
]

interface LightConfig {
    ambient: { color: number; intensity: number }
    key:  { color: number; intensity: number; pos: [number, number, number] }
    fill: { color: number; intensity: number; pos: [number, number, number] }
    rim:  { color: number; intensity: number; pos: [number, number, number] }
    hemi: { sky: number; ground: number; intensity: number }
}

// Fixed configs for wireframe / solid / material shading modes
const FIXED_CONFIGS: Record<Exclude<ShadingMode, 'lit'>, LightConfig> = {
    wireframe: {
        ambient: { color: 0xffffff, intensity: 1 },
        key:  { color: 0xffffff, intensity: 0, pos: [4, 8, 5] },
        fill: { color: 0xffffff, intensity: 0, pos: [-4, 2, -3] },
        rim:  { color: 0xffffff, intensity: 0, pos: [0, -3, -5] },
        hemi: { sky: 0xffffff, ground: 0x000000, intensity: 0 },
    },
    solid: {
        ambient: { color: 0xffffff, intensity: 0.5 },
        key:  { color: 0xffffff, intensity: 1.0, pos: [4, 6, 4] },
        fill: { color: 0xffffff, intensity: 0.2, pos: [-3, 2, 2] },
        rim:  { color: 0xffffff, intensity: 0,   pos: [0, -3, -5] },
        hemi: { sky: 0xffffff, ground: 0x333333, intensity: 0.15 },
    },
    material: {
        ambient: { color: 0xffffff, intensity: 0.45 },
        key:  { color: 0xfff8f0, intensity: 1.4, pos: [3, 6, 4] },
        fill: { color: 0xd0e8ff, intensity: 0.3, pos: [-4, 2, 2] },
        rim:  { color: 0xffffff, intensity: 0.2, pos: [0, -2, -5] },
        hemi: { sky: 0xffffff, ground: 0x444444, intensity: 0.2 },
    },
}

const PRESET_CONFIGS: Record<LightPreset, LightConfig> = {
    neutral: {
        ambient: { color: 0xffffff, intensity: 0.35 },
        key:  { color: 0xfff5e0, intensity: 1.2, pos: [3, 5, 4] },
        fill: { color: 0xe0eeff, intensity: 0.25, pos: [-3, 1, 2] },
        rim:  { color: 0xffffff, intensity: 0,   pos: [0, -3, -5] },
        hemi: { sky: 0xffffff, ground: 0x444444, intensity: 0.2 },
    },
    studio: {
        ambient: { color: 0xffffff, intensity: 0.2 },
        key:  { color: 0xfff8f0, intensity: 1.6, pos: [4, 6, 3] },
        fill: { color: 0xd0e8ff, intensity: 0.5, pos: [-4, 2, 2] },
        rim:  { color: 0xffffff, intensity: 0.6, pos: [0, -2, -5] },
        hemi: { sky: 0xffffff, ground: 0x333333, intensity: 0.1 },
    },
    directional: {
        ambient: { color: 0xffffff, intensity: 0.12 },
        key:  { color: 0xffffff, intensity: 2.6, pos: [6, 3, 2] },
        fill: { color: 0xffffff, intensity: 0.08, pos: [-2, 1, 1] },
        rim:  { color: 0xffffff, intensity: 0,   pos: [0, -3, -5] },
        hemi: { sky: 0xffffff, ground: 0x111111, intensity: 0.05 },
    },
    soft: {
        ambient: { color: 0xffffff, intensity: 0.75 },
        key:  { color: 0xffffff, intensity: 0.5, pos: [2, 6, 4] },
        fill: { color: 0xffffff, intensity: 0.4, pos: [-3, 3, 2] },
        rim:  { color: 0xffffff, intensity: 0.2, pos: [0, -2, -4] },
        hemi: { sky: 0xffffff, ground: 0x666666, intensity: 0.4 },
    },
    dramatic: {
        ambient: { color: 0xffffff, intensity: 0.04 },
        key:  { color: 0xfff0d0, intensity: 3.5, pos: [3, 10, 2] },
        fill: { color: 0x2233aa, intensity: 0.08, pos: [-4, 1, -2] },
        rim:  { color: 0xffffff, intensity: 0,   pos: [0, -3, -5] },
        hemi: { sky: 0x111111, ground: 0x000000, intensity: 0 },
    },
    environment: {
        ambient: { color: 0xc8deff, intensity: 0.5 },
        key:  { color: 0xfff5cc, intensity: 1.2, pos: [5, 8, 3] },
        fill: { color: 0x88aad0, intensity: 0.4, pos: [-4, 3, 2] },
        rim:  { color: 0xffcc88, intensity: 0.3, pos: [-1, -2, -4] },
        hemi: { sky: 0x87ceeb, ground: 0x5a7a3a, intensity: 0.6 },
    },
    unlit: {
        ambient: { color: 0xffffff, intensity: 0 },
        key:  { color: 0xffffff, intensity: 0, pos: [4, 8, 5] },
        fill: { color: 0xffffff, intensity: 0, pos: [-4, 2, -3] },
        rim:  { color: 0xffffff, intensity: 0, pos: [0, -3, -5] },
        hemi: { sky: 0xffffff, ground: 0x000000, intensity: 0 },
    },
}

export const TexturePreviewModal: React.FC<TexturePreviewModalProps> = ({
    isOpen, onClose, imageUrl, pixelated = false, initialTab = '2d',
    textureResolution, outputFormat, textureSize,
}) => {
    const [tab, setTab]                   = useState<'2d' | '3d'>(initialTab)
    const [shape, setShape]               = useState<Shape>('sphere')
    const [showGround, setShowGround]     = useState(true)
    const [shadingMode, setShadingMode]   = useState<ShadingMode>('material')
    const [lightPreset, setLightPreset]   = useState<LightPreset>('neutral')
    const [autoRotate, setAutoRotate]     = useState(true)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [isMaximized, setIsMaximized]   = useState(false)

    const [bgOffset, setBgOffset]     = useState({ x: 0, y: 0 })
    const [panEnabled, setPanEnabled] = useState(true)

    const [offset, setOffset]   = useState({ x: 0, y: 0 })
    const [winSize, setWinSize] = useState({ w: 860, h: 580 })
    const [zIndex, setZIndex]   = useState(() => ++globalZCounter)
    const isDragging   = useRef(false)
    const isResizing   = useRef(false)
    const is2DPanning  = useRef(false)
    const dragStart    = useRef({ mx: 0, my: 0, ox: 0, oy: 0 })
    const resizeStart  = useRef({ mx: 0, my: 0, ow: 860, oh: 580 })
    const pan2DStart   = useRef({ mx: 0, my: 0, ox: 0, oy: 0 })
    const savedWinState = useRef<{ size: { w: number; h: number }; offset: { x: number; y: number } } | null>(null)

    const shapeRef       = useRef<Shape>('sphere')
    const showGroundRef  = useRef(true)
    const shadingRef     = useRef<ShadingMode>('material')
    const lightPresetRef = useRef<LightPreset>('neutral')
    const autoRotateRef  = useRef(true)
    const canvasContainerRef = useRef<HTMLDivElement>(null)
    const modalRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isOpen) {
            setTab(initialTab)
            setShadingMode('material')
            setLightPreset('neutral')
            setAutoRotate(true)
            setBgOffset({ x: 0, y: 0 })
            setPanEnabled(true)
            setIsMaximized(false)
            setOffset({ x: 0, y: 0 })
            setWinSize({ w: 860, h: 580 })
            setZIndex(++globalZCounter)
            savedWinState.current = null
        }
    }, [isOpen, initialTab])

    const bringToFront = () => setZIndex(++globalZCounter)

    useEffect(() => { shapeRef.current = shape }, [shape])
    useEffect(() => { showGroundRef.current = showGround }, [showGround])
    useEffect(() => { shadingRef.current = shadingMode }, [shadingMode])
    useEffect(() => { lightPresetRef.current = lightPreset }, [lightPreset])
    useEffect(() => { autoRotateRef.current = autoRotate }, [autoRotate])

    useEffect(() => {
        if (!isOpen) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !document.fullscreenElement) onClose()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [isOpen, onClose])

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement)
        document.addEventListener('fullscreenchange', handler)
        return () => document.removeEventListener('fullscreenchange', handler)
    }, [])

    const handleHeaderMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return
        e.preventDefault()
        isDragging.current = true
        dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y }
    }
    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation()
        isResizing.current = true
        resizeStart.current = { mx: e.clientX, my: e.clientY, ow: winSize.w, oh: winSize.h }
        bringToFront()
    }

    useEffect(() => {
        if (!isOpen) return
        const onMove = (e: MouseEvent) => {
            if (isDragging.current) {
                setOffset({ x: dragStart.current.ox + e.clientX - dragStart.current.mx, y: dragStart.current.oy + e.clientY - dragStart.current.my })
            } else if (isResizing.current) {
                setWinSize({
                    w: Math.max(480, resizeStart.current.ow + e.clientX - resizeStart.current.mx),
                    h: Math.max(360, resizeStart.current.oh + e.clientY - resizeStart.current.my),
                })
            }
        }
        const onUp = () => { isDragging.current = false; isResizing.current = false }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    }, [isOpen])

    const toggleFullscreen = () => {
        if (!modalRef.current) return
        if (!document.fullscreenElement) modalRef.current.requestFullscreen()
        else document.exitFullscreen()
    }

    const toggleMaximize = () => {
        if (isMaximized) {
            if (savedWinState.current) {
                setWinSize(savedWinState.current.size)
                setOffset(savedWinState.current.offset)
            }
            setIsMaximized(false)
        } else {
            savedWinState.current = { size: { ...winSize }, offset: { ...offset } }
            setWinSize({ w: Math.floor(window.innerWidth * 0.9), h: Math.floor(window.innerHeight * 0.9) })
            setOffset({ x: 0, y: 0 })
            setIsMaximized(true)
        }
    }

    useEffect(() => {
        if (!isOpen || tab !== '3d' || !canvasContainerRef.current) return
        const container = canvasContainerRef.current
        const w = container.clientWidth || 720
        const h = container.clientHeight || 500

        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setSize(w, h)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap
        container.appendChild(renderer.domElement)

        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0x1c1c24)

        const camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 100)
        camera.position.set(0, 2, 5.5)

        const ambient  = new THREE.AmbientLight(0xffffff, 0.45)
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.4)
        keyLight.position.set(3, 6, 4)
        keyLight.castShadow = true
        keyLight.shadow.mapSize.set(1024, 1024)
        keyLight.shadow.camera.near = 0.5; keyLight.shadow.camera.far = 30
        keyLight.shadow.camera.left = -6;  keyLight.shadow.camera.right = 6
        keyLight.shadow.camera.top  =  6;  keyLight.shadow.camera.bottom = -6
        const fillLight = new THREE.DirectionalLight(0xd0e8ff, 0.3)
        fillLight.position.set(-4, 2, 2)
        const rimLight  = new THREE.DirectionalLight(0xffffff, 0.2)
        rimLight.position.set(0, -2, -5)
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.2)
        scene.add(ambient, keyLight, fillLight, rimLight, hemiLight)

        let prevConfigKey = ''
        const applyConfig = (cfg: LightConfig) => {
            ambient.color.setHex(cfg.ambient.color);     ambient.intensity  = cfg.ambient.intensity
            keyLight.color.setHex(cfg.key.color);        keyLight.intensity  = cfg.key.intensity;  keyLight.position.set(...cfg.key.pos)
            fillLight.color.setHex(cfg.fill.color);      fillLight.intensity = cfg.fill.intensity; fillLight.position.set(...cfg.fill.pos)
            rimLight.color.setHex(cfg.rim.color);        rimLight.intensity  = cfg.rim.intensity;  rimLight.position.set(...cfg.rim.pos)
            hemiLight.color.setHex(cfg.hemi.sky);        hemiLight.groundColor.setHex(cfg.hemi.ground); hemiLight.intensity = cfg.hemi.intensity
        }

        const loader = new THREE.TextureLoader()
        const tex = loader.load(imageUrl)
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping
        tex.repeat.set(2, 2)
        if (pixelated) { tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter }
        else { tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true }
        tex.needsUpdate = true

        const planeTex = tex.clone()
        planeTex.repeat.set(3, 3)
        planeTex.needsUpdate = true
        if (pixelated) { planeTex.magFilter = THREE.NearestFilter; planeTex.minFilter = THREE.NearestFilter }

        const wireMat     = new THREE.MeshBasicMaterial({ color: 0xf97316, wireframe: true })
        const solidMat    = new THREE.MeshStandardMaterial({ color: 0x9898a8, roughness: 0.85, metalness: 0 })
        const solidSide   = new THREE.MeshStandardMaterial({ color: 0x9898a8, roughness: 0.85, metalness: 0, side: THREE.DoubleSide })
        const unlitMat    = new THREE.MeshBasicMaterial({ map: tex })
        const unlitPlane  = new THREE.MeshBasicMaterial({ map: planeTex, side: THREE.DoubleSide })
        const texMat      = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82, metalness: 0.04 })
        const texPlaneMat = new THREE.MeshStandardMaterial({ map: planeTex, roughness: 0.82, metalness: 0.04, side: THREE.DoubleSide })

        const getMat = (isPlane = false): THREE.Material => {
            const m = shadingRef.current
            if (m === 'wireframe') return wireMat
            if (m === 'solid') return isPlane ? solidSide : solidMat
            if (m === 'lit' && lightPresetRef.current === 'unlit') return isPlane ? unlitPlane : unlitMat
            return isPlane ? texPlaneMat : texMat
        }

        const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.4, 64, 64), texMat)
        sphere.castShadow = true; sphere.receiveShadow = true; scene.add(sphere)

        const cube = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), texMat)
        cube.castShadow = true; cube.receiveShadow = true; scene.add(cube)

        const quad = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.5), texPlaneMat)
        quad.rotation.x = -Math.PI / 5; quad.position.y = 0.4
        quad.castShadow = true; quad.receiveShadow = true; scene.add(quad)

        const groundMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(30, 30),
            new THREE.MeshStandardMaterial({ color: 0x2a2a35, roughness: 1 })
        )
        groundMesh.rotation.x = -Math.PI / 2; groundMesh.position.y = -1.6; groundMesh.receiveShadow = true
        scene.add(groundMesh)

        const grid = new THREE.GridHelper(24, 24, 0x3a3a50, 0x2a2a38)
        grid.position.y = -1.59; scene.add(grid)

        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true; controls.dampingFactor = 0.07
        controls.minDistance = 2; controls.maxDistance = 16; controls.target.set(0, 0, 0)

        const stopRightMiddle = (e: MouseEvent) => { if (e.button === 1 || e.button === 2) e.stopPropagation() }
        const stopContext     = (e: Event)      => { e.preventDefault(); e.stopPropagation() }
        const stopWheel       = (e: WheelEvent) => e.stopPropagation()
        container.addEventListener('mousedown',   stopRightMiddle)
        container.addEventListener('mouseup',     stopRightMiddle)
        container.addEventListener('contextmenu', stopContext)
        container.addEventListener('wheel',       stopWheel, { passive: false })

        let animId: number
        const animate = () => {
            animId = requestAnimationFrame(animate)

            sphere.visible = shapeRef.current === 'sphere'
            cube.visible   = shapeRef.current === 'cube'
            quad.visible   = shapeRef.current === 'plane'
            groundMesh.visible = grid.visible = showGroundRef.current

            sphere.material = getMat(false)
            cube.material   = getMat(false)
            quad.material   = getMat(true)

            // Apply lighting config only when it changes
            const mode    = shadingRef.current
            const preset  = lightPresetRef.current
            const cfgKey  = mode === 'lit' ? `lit:${preset}` : mode
            if (cfgKey !== prevConfigKey) {
                applyConfig(mode === 'lit' ? PRESET_CONFIGS[preset] : FIXED_CONFIGS[mode as Exclude<ShadingMode, 'lit'>])
                prevConfigKey = cfgKey
            }

            if (autoRotateRef.current) {
                if (cube.visible)   cube.rotation.y   += 0.004
                if (sphere.visible) sphere.rotation.y += 0.003
                if (quad.visible)   quad.rotation.z   += 0.003
            }

            controls.update()
            renderer.render(scene, camera)
        }
        animate()

        const ro = new ResizeObserver(() => {
            const nw = container.clientWidth
            const nh = container.clientHeight
            if (!nw || !nh) return
            camera.aspect = nw / nh
            camera.updateProjectionMatrix()
            renderer.setSize(nw, nh)
        })
        ro.observe(container)

        return () => {
            cancelAnimationFrame(animId)
            ro.disconnect()
            container.removeEventListener('mousedown',   stopRightMiddle)
            container.removeEventListener('mouseup',     stopRightMiddle)
            container.removeEventListener('contextmenu', stopContext)
            container.removeEventListener('wheel',       stopWheel)
            controls.dispose(); renderer.dispose()
            tex.dispose(); planeTex.dispose()
            wireMat.dispose(); solidMat.dispose(); solidSide.dispose()
            unlitMat.dispose(); unlitPlane.dispose()
            texMat.dispose(); texPlaneMat.dispose()
            if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
        }
    }, [isOpen, tab, imageUrl, pixelated])

    if (!isOpen) return null

    const fmt = outputFormat?.toUpperCase() ?? 'PNG'
    const { bpc, lossless } = FORMAT_BPC[fmt] ?? { bpc: 8, lossless: true }
    const res = textureResolution ?? '?'

    const InfoBadge = () => (
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none select-none z-10">
            {textureResolution && (
                <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white/80">
                    {res} × {res} px
                </span>
            )}
            <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white/80">
                {fmt} · {bpc} bits/channel · {lossless ? 'lossless' : 'lossy'}
            </span>
            {pixelated && textureSize && (
                <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-mono text-orange-300/90">
                    {textureSize} px grid
                </span>
            )}
        </div>
    )

    const shapeBtn = (s: Shape, label: string) => (
        <button
            key={s}
            onClick={() => setShape(s)}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
                shape === s ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/10'
            }`}
        >
            {label}
        </button>
    )

    return createPortal(
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex }}>
            <div
                ref={modalRef}
                className={`pointer-events-auto relative flex flex-col bg-zinc-900 shadow-2xl border border-zinc-700 overflow-hidden ${isFullscreen ? 'rounded-none' : 'rounded-xl'}`}
                style={{
                    width:     isFullscreen ? '100vw' : `${winSize.w}px`,
                    height:    isFullscreen ? '100vh' : `${winSize.h}px`,
                    transform: isFullscreen ? 'none' : `translate(${offset.x}px, ${offset.y}px)`,
                    minWidth: 480, minHeight: 360,
                }}
                onMouseDownCapture={bringToFront}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 shrink-0 select-none cursor-grab active:cursor-grabbing"
                    onMouseDown={handleHeaderMouseDown}
                >
                    <div className="flex gap-1 bg-zinc-800 p-0.5 rounded-lg" onMouseDown={(e) => e.stopPropagation()}>
                        <button onClick={() => setTab('2d')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${tab === '2d' ? 'bg-orange-500 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}>
                            <Grid3X3 size={12} /> 2D Tiled
                        </button>
                        <button onClick={() => setTab('3d')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${tab === '3d' ? 'bg-orange-500 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}>
                            <Box size={12} /> 3D Preview
                        </button>
                    </div>
                    <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
                        <button onClick={toggleMaximize} title={isMaximized ? 'Restore window' : 'Maximize window'} className="p-1.5 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors">
                            {isMaximized ? <Minimize size={15} /> : <Maximize size={15} />}
                        </button>
                        <button onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} className="p-1.5 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors">
                            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                        </button>
                        <button onClick={onClose} title="Close (Esc)" className="p-1.5 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Body — fills remaining height */}
                <div className="relative flex-1 min-h-0">
                    {tab === '2d' ? (
                        <div
                            className="relative w-full h-full select-none overflow-hidden"
                            style={{ cursor: panEnabled ? (is2DPanning.current ? 'grabbing' : 'grab') : 'default' }}
                            onPointerDown={(e) => {
                                if (!panEnabled || e.button !== 0) return
                                e.currentTarget.setPointerCapture(e.pointerId)
                                is2DPanning.current = true
                                pan2DStart.current = { mx: e.clientX, my: e.clientY, ox: bgOffset.x, oy: bgOffset.y }
                            }}
                            onPointerMove={(e) => {
                                if (!is2DPanning.current) return
                                setBgOffset({
                                    x: pan2DStart.current.ox + e.clientX - pan2DStart.current.mx,
                                    y: pan2DStart.current.oy + e.clientY - pan2DStart.current.my,
                                })
                            }}
                            onPointerUp={() => { is2DPanning.current = false }}
                            onPointerCancel={() => { is2DPanning.current = false }}
                        >
                            {/* Tiled background */}
                            <div
                                className="w-full h-full"
                                style={{
                                    backgroundImage: `url(${imageUrl})`,
                                    backgroundRepeat: 'repeat',
                                    backgroundSize: '20%',
                                    backgroundPosition: `${bgOffset.x}px ${bgOffset.y}px`,
                                    imageRendering: pixelated ? 'pixelated' : 'auto',
                                }}
                            />

                            {/* Centered single-tile overlay */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div
                                    className="w-44 h-44 rounded shadow-2xl ring-2 ring-white/25"
                                    style={{
                                        backgroundImage: `url(${imageUrl})`,
                                        backgroundSize: '100% 100%',
                                        backgroundRepeat: 'no-repeat',
                                        imageRendering: pixelated ? 'pixelated' : 'auto',
                                    }}
                                />
                            </div>

                            <InfoBadge />

                            {/* Bottom bar */}
                            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-black/60 backdrop-blur-sm z-10">
                                <div className="flex items-center gap-2 text-[10px] text-white/50">
                                    <Hand size={11} className="text-white/55 shrink-0" />
                                    <span>Drag to pan · check seamless tiling</span>
                                </div>
                                <button
                                    onClick={() => setPanEnabled(v => !v)}
                                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                                        panEnabled
                                            ? 'bg-white/20 text-white'
                                            : 'text-white/40 hover:bg-white/10 hover:text-white/60'
                                    }`}
                                >
                                    {panEnabled ? 'Tiling Pan: On' : 'Tiling Pan: Off'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div ref={canvasContainerRef} className="w-full h-full" />
                            <InfoBadge />

                            {/* Right panel — shading modes + lit sub-panel */}
                            <div className="absolute top-3 right-3 flex flex-col gap-1 z-10 w-52">
                                {/* 4 structural shading modes */}
                                {SHADING_MODES.map(({ id, label, icon, description }) => (
                                    <button
                                        key={id}
                                        onClick={() => setShadingMode(id)}
                                        className={`flex items-start gap-2.5 px-3 py-2 rounded-md text-left transition-all ${
                                            shadingMode === id
                                                ? 'bg-orange-500 text-white shadow'
                                                : 'bg-black/50 backdrop-blur-sm text-white/60 hover:bg-black/70 hover:text-white/90'
                                        }`}
                                    >
                                        <span className="mt-0.5 shrink-0">{icon}</span>
                                        <span className="flex flex-col min-w-0">
                                            <span className="text-[11px] font-semibold leading-tight">{label}</span>
                                            <span className={`text-[9px] leading-snug mt-0.5 ${shadingMode === id ? 'text-white/80' : 'text-white/35'}`}>
                                                {description}
                                            </span>
                                        </span>
                                    </button>
                                ))}

                                {/* Lit sub-panel — only when Lit is active */}
                                {shadingMode === 'lit' && (
                                    <div className="mt-1 ml-3 flex flex-col gap-0.5 border-l-2 border-orange-500/40 pl-2">
                                        {LIGHT_PRESETS.map(({ id, label, icon, description }) => (
                                            <button
                                                key={id}
                                                onClick={() => setLightPreset(id)}
                                                className={`flex items-start gap-2 px-2.5 py-1.5 rounded-md text-left transition-all ${
                                                    lightPreset === id
                                                        ? 'bg-orange-400/25 text-orange-200'
                                                        : 'text-white/50 hover:bg-white/10 hover:text-white/80'
                                                }`}
                                            >
                                                <span className="mt-0.5 shrink-0">{icon}</span>
                                                <span className="flex flex-col min-w-0">
                                                    <span className="text-[10px] font-semibold leading-tight">{label}</span>
                                                    <span className={`text-[9px] leading-snug mt-0.5 ${lightPreset === id ? 'text-orange-200/70' : 'text-white/25'}`}>
                                                        {description}
                                                    </span>
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Bottom toolbar */}
                            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-black/60 backdrop-blur-sm z-10">
                                <div className="flex items-center gap-1">
                                    {shapeBtn('plane', 'Plane')}
                                    {shapeBtn('cube', 'Cube')}
                                    {shapeBtn('sphere', 'Sphere')}
                                    <div className="w-px h-4 bg-white/15 mx-1" />
                                    <button
                                        onClick={() => setShowGround((v) => !v)}
                                        className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all ${showGround ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/10'}`}
                                    >
                                        Ground
                                    </button>
                                    <div className="w-px h-4 bg-white/15 mx-1" />
                                    <button
                                        onClick={() => setAutoRotate((v) => !v)}
                                        title={autoRotate ? 'Stop rotation' : 'Start rotation'}
                                        className={`flex items-center justify-center w-8 h-7 rounded-md transition-all ${autoRotate ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/10'}`}
                                    >
                                        {autoRotate ? <RefreshCw size={13} /> : <RefreshCwOff size={13} />}
                                    </button>
                                </div>

                                <div className="flex flex-col gap-0.5 text-[9px] leading-relaxed text-white/40 select-none">
                                    <div className="flex items-center gap-1.5">
                                        <MouseLeft size={11} className="text-white/55 shrink-0" />
                                        <span><span className="text-white/60 font-medium">Drag</span> — orbit</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Hand size={11} className="text-white/55 shrink-0" />
                                        <span><span className="text-white/60 font-medium">Right drag</span> — pan</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Mouse size={11} className="text-white/55 shrink-0" />
                                        <span><span className="text-white/60 font-medium">Scroll</span> — zoom</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                {/* Resize grip — bottom-right corner, hidden in fullscreen */}
                {!isFullscreen && (
                    <div
                        className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-50 flex items-end justify-end pb-1 pr-1"
                        onMouseDown={handleResizeMouseDown}
                    >
                        <svg width="10" height="10" viewBox="0 0 10 10" className="text-zinc-500">
                            <path d="M1 9L9 1M5 9L9 5M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}
