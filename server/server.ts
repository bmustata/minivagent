import express from 'express'
import path from 'path'
import { healthCheck } from './handlers/healthCheckHandlers.ts'
import { enhancePrompt, generateText, extractTextFromImage, generateImages, planGraph } from './handlers/generationHandlers.ts'
import { renderRun, renderRunStream, renderDynamic } from './handlers/renderHandlers.ts'
import { listGraphs, getGraph, createGraph, updateGraph, deleteGraph } from './handlers/graphFileHandlers.ts'
import { getModels } from './handlers/modelHandlers.ts'
import { getApiMeta, getApiMetaLlms } from './handlers/metaHandlers.ts'
import { listResourcesHandler, addResourceHandler, getResourceInfoHandler, getResourceHandler, removeResourceHandler, uploadMiddleware } from './handlers/resourceHandlers.ts'

// Create Express app
export const app = express()

// Middleware
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (req.method === 'OPTIONS') {
        res.sendStatus(200)
        return
    }
    next()
})

// Health Check
app.get('/api/health', healthCheck)

// Meta
app.get('/api/meta', getApiMeta)
app.get('/api/meta-llms', getApiMetaLlms)

// API Routes - All under /api prefix
app.get('/api/models', getModels)
app.post('/api/enhance-prompt', enhancePrompt)
app.post('/api/generate-text', generateText)
app.post('/api/extract-text-from-image', extractTextFromImage)
app.post('/api/generate-images', generateImages)
app.post('/api/plan-graph', planGraph)

// Render Routes - Under /api/render
app.post('/api/render/run', renderDynamic) // inline graph (no graphId required)
app.post('/api/render/:graphId/run/stream', renderRunStream)
app.post('/api/render/:graphId/run', renderRun)

// Graph Routes - Under /api/graphs
app.get('/api/graphs', listGraphs)
app.get('/api/graphs/:graphId', getGraph)
app.post('/api/graphs', createGraph)
app.put('/api/graphs/:graphId', updateGraph)
app.delete('/api/graphs/:graphId', deleteGraph)

// Resource Routes
app.get('/api/resources', listResourcesHandler)
app.post('/api/resources', ...uploadMiddleware, addResourceHandler)
app.get('/api/resources/:resourceId/info', getResourceInfoHandler)
app.get('/api/resources/:resourceId', getResourceHandler)
app.delete('/api/resources/:resourceId', removeResourceHandler)

// Serve static files from dist directory at root path (for production)
const distPath = path.join(process.cwd(), 'dist')
app.use('/', express.static(distPath))
