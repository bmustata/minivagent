# MiniVAgent: Digital Alchemy Lab

MiniVAgent is a node-based workflow application powered by Nano Banana Pro for building AI-driven image and text pipelines. Create flexible generation flows by connecting nodes on a visual canvas, leveraging Google Gemini models and other modern AI tools.

[![Known Vulnerabilities](https://snyk.io/test/github/bmustata/minivagent/badge.svg)](https://snyk.io/test/github/bmustata/minivagent)

![MiniVAgent Screenshot](docs/screenshots/mini-v-agent-v1.png)

### Features

- **Visual Node Editor**: Drag-and-drop interface for building AI workflows
- **Multiple Node Types**:
    - Text Generation (`gemini-2.5`, `gemini-3`)
    - Image Generation (Nano Banana, Nano Banana Pro, Nano Banana 2, Imagen 4)
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

    ```bash
    git clone https://github.com/bmustata/minivagent.git
    cd minivagent
    ```

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

## Usage

1. **Build Workflows**: Drag nodes from the toolbar onto the canvas
2. **Connect Nodes**: Click and drag from output handles (right) to input handles (left)
3. **Configure**: Click nodes to edit prompts and settings
4. **Execute**: Click the play button on individual nodes or run the full flow
5. **View Results**: Generated images appear in a gallery modal
6. **AI Assistant**: Use the Flow Assistant to describe a workflow in natural language and auto-build the graph

## Documentation

- [API Endpoints Reference](docs/api-endpoints.md)
- [Node Types Reference](docs/node-types.md)
- [Supported Models](docs/supported-models.md)
- [Graph ID Conventions](docs/graph-id-conventions.md)
- [Project Structure](docs/project-structure.md)

## Important Limitations

This project is intentionally minimal and designed for local use only. Please review the following constraints before deploying:

- **Local-Only Usage**: Built to run on a local machine or within a private network. Not intended to be exposed to the public internet.
- **No Authentication or Authorization**: The application does not implement any authentication or access control mechanisms.
- **Single-User Design**: No concept of multiple users, roles, or tenants. The system assumes a single-user environment.

## License

MiniVAgent is released under the [Apache 2.0 License](LICENSE) and encourages all types of contributions. No contribution is too small, and we want to thank all our community contributors.
