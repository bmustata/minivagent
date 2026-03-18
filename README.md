# MiniVAgent: Digital Alchemy Lab

MiniVAgent is a node-based workflow application powered by Nano Banana Pro for building AI-driven image and text pipelines. Create flexible generation flows by connecting nodes on a visual canvas, leveraging Google Gemini models and other modern AI tools.

[![Known Vulnerabilities](https://snyk.io/test/github/bmustata/minivagent/badge.svg)](https://snyk.io/test/github/bmustata/minivagent)

![MiniVAgent Screenshot](docs/screenshots/mini-v-agent-v1.png)

The platform acts as an experimentation environment for:

- **Modular** "micro-agent" design
- **Tool-augmented** reasoning chains
- **Multi-modal** AI pipelines
- **Controlled autonomous** workflow execution

Main features:

- **Workflow Automation**: Chain multiple AI operations together in a single flow
- **Flexible Model Support**: Extensible architecture for different AI providers
- **Real-time Preview**: See results as you build your workflow
- **Export & Share**: Save workflows as JSON files for reuse and sharing
- **Batch Processing**: Execute workflows via CLI for automated pipelines
- **Local-Only Usage**: Built to run on a local machine or within a private network. Not intended to be exposed to the public internet.

MiniVAgent is released under the [Apache 2.0 License](LICENSE) and encourages all types of contributions. No contribution is too small, and we want to thank all our community contributors.

## Overview

MiniVAgent is a visual workflow tool that lets you build AI pipelines by connecting nodes. Create complex generative AI workflows by chaining text generation, image generation, and vision analysis nodes together.

### Features

- **Visual Node Editor**: Drag-and-drop interface for building AI workflows
- **Multiple Node Types**:
    - Text Generation
    - Image Generation
    - Vision/Image-to-Text Analysis
    - Image Source (URL or Upload)
    - Note/Documentation Nodes
- **Prompt Enhancement**: Optional AI-powered prompt optimization
- **Flow Execution**: Run individual nodes or entire workflows
- **AI Flow Assistant**: Natural language graph builder
- **Sample Workflows**: Pre-built examples to get started
- **CLI Support**: Execute graphs from command line for automation

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- An AI model API key (currently supports Gemini)

### Installation

1. Clone or download this repository
2. Install dependencies:

    ```bash
    npm install
    ```

3. Create a `.env.local` file in the root directory:

    ```
    GEMINI_API_KEY=your_api_key_here
    ```

    Get your API key from [https://aistudio.google.com/api-keys](https://aistudio.google.com/api-keys).

    > **⚠️ Security Warning:** Never commit `.env.local` or any file containing your API key to version control. It is already included in `.gitignore`.
    > Keep your key private — anyone with access to it can make requests billed to your account.

### Run Locally

**Development Mode (Hot Reload):**

```bash
npm run dev
```

Then open http://localhost:3202 in your browser.

- UI (Vite Dev Server): http://localhost:3202
- API Server: http://localhost:3201/api/

**Compiled Mode (Production Build + Watch):**

```bash
npm run dev:compiled
```

Then open http://localhost:3201 in your browser.

- UI (Static Build): http://localhost:3201
- API Server: http://localhost:3201/api/

> **Note:** In development mode, Vite runs the client on port 3202 with hot-module replacement. In compiled mode, the client is built to `/dist` and served by Express on port 3201.

**Or use the CLI:**

```bash
# Start both UI and server
npx minivagent ui

# Start server only
npx minivagent srv
```

## Usage

1. **Build Workflows**: Drag nodes from the toolbar onto the canvas
2. **Connect Nodes**: Click and drag from output handles (right) to input handles (left)
3. **Configure**: Click nodes to edit prompts and settings
4. **Execute**: Click the play button on individual nodes or run the full flow
5. **View Results**: Generated images appear in a gallery modal
6. **AI Assistant**: Use the Flow Assistant to describe a workflow in natural language and auto-build the graph

## Project Structure

```
minivagent/
├── agent/               # CLI tool
├── client/              # React frontend
│   ├── components/      # UI components and nodes
│   ├── services/        # API client
│   └── utils/           # Client utilities
├── data/                # Data files
│   ├── graphs/          # Graph JSON files
│   └── resources/       # Stored image resources
├── docs/                # Documentation
├── server/              # Express backend
│   ├── handlers/        # HTTP request handlers
│   ├── helpers/         # Graph traversal and execution
│   ├── services/        # AI service integrations
│   └── utils/           # Utilities and types
└── tests/               # Test files
    ├── handlers/        # Handler tests
    └── services/        # Service tests
```

## API Endpoints

All API endpoints are available under the `/api/` prefix:

**Health & Meta:**

- `GET /api/health` - Health check
- `GET /api/models` - Get all supported AI models
- `GET /api/meta` - All endpoints as JSON
- `GET /api/meta-llms` - All endpoints as Markdown (LLM-friendly)

**Generation:**

- `POST /api/enhance-prompt` - Enhance/optimize a prompt
- `POST /api/generate-text` - Generate text from prompt (optional `model` parameter)
- `POST /api/extract-text-from-image` - Extract text from images using vision (optional `model` parameter)
- `POST /api/generate-images` - Generate images from prompt (optional `model` parameter)
- `POST /api/plan-graph` - AI-powered graph planning

**Execution:**

- `POST /api/render/run` — Execute an inline graph (pass `nodes`, `edges?`, `name?` directly in the body — no saved graph required).
- `POST /api/render/:graphId/run` — Execute a saved graph, returns node states as JSON. Optional body: `nodes`, `edges`, `name` to override graph data.
- `POST /api/render/:graphId/run/stream` — Same execution streamed as Server-Sent Events.

**SSE events for `/run/stream`:**

| Event        | Payload                                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| `job_start`  | `jobId`, `graphId`, `graphName`, `nodeCount`, `edgeCount`, `executionOrder`                              |
| `node_start` | `nodeId`, `type`                                                                                         |
| `node_end`   | Node result                                                                                              |
| `job_done`   | `status`, `graphId`, `graphName`, `nodeCount`, `edgeCount`, `executedNodes`, `elapsed`, `nodes`, `edges` |
| `job_error`  | `{ error: string }`                                                                                      |

**Graph Management:**

- `GET /api/graphs` - List all graphs
- `GET /api/graphs/:graphId` - Get specific graph
- `POST /api/graphs` - Create new graph
- `PUT /api/graphs/:graphId` - Update graph
- `DELETE /api/graphs/:graphId` - Delete graph

**Resources:**

- `GET /api/resources` - List all stored image resources
- `POST /api/resources` - Upload an image (`multipart/form-data`, field: `file`; accepted: PNG, JPEG, WebP)
- `GET /api/resources/:id/info` - Get image metadata (id, mimeType, size, createdAt)
- `GET /api/resources/:id` - Fetch raw image binary
- `DELETE /api/resources/:id` - Delete an image

## Documentation

- [Node Types Reference](docs/node-types.md)
- [Supported Models](docs/supported-models.md)
- [Graph ID Conventions](docs/graph-id-conventions.md)

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build
```

## Important Limitations

This project is intentionally minimal and designed for local use only. Please review the following constraints before deploying:

- **Local-Only Usage**: Built to run on a local machine or within a private network. Not intended to be exposed to the public internet.
- **No Authentication or Authorization**: The application does not implement any authentication or access control mechanisms.
- **Single-User Design**: No concept of multiple users, roles, or tenants. The system assumes a single-user environment.

## License

MiniVAgent is released under the [Apache 2.0 License](LICENSE) and encourages all types of contributions. No contribution is too small, and we want to thank all our community contributors.
