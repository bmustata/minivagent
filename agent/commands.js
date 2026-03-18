import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { runCommand, runConcurrent } from './utils.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Get package version
 */
function getVersion() {
    try {
        const packagePath = path.resolve(__dirname, '../package.json')
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
        return packageJson.version || '0.0.0'
    } catch (error) {
        return '0.0.0'
    }
}

/**
 * Start server only
 */
export function runServer(projectRoot) {
    runCommand('node --experimental-strip-types server/index.ts', 'SERVER', projectRoot)
}

/**
 * Start both UI and server
 */
export function runUI(projectRoot) {
    runConcurrent([
        { cmd: 'node --experimental-strip-types server/index.ts', label: 'SERVER', cwd: projectRoot },
        { cmd: 'npx vite', label: 'CLIENT', cwd: projectRoot }
    ])
}

/**
 * Show help message
 */
export function showHelp() {
    const version = getVersion()
    console.log(`minivagent - Mini Agent v${version}`)
    console.log('\nUsage:')
    console.log('  minivagent srv   Start server only')
    console.log('  minivagent ui    Start both UI and server')
    console.log('\nExamples:')
    console.log('  npx minivagent srv')
    console.log('  npx minivagent ui')
}
