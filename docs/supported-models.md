# Supported Models

minivagent supports multiple AI models across different categories from Google Gemini and OpenAI. Models can be selected via the API or UI.

## Model Categories

### TEXT

**Purpose:** Text generation and prompt enhancement  
**Endpoints:** `POST /api/generate-text`, `POST /api/enhance-prompt`

| Name                  | Provider | Model                           | Default |
| --------------------- | -------- | ------------------------------- | ------- |
| Gemini Flash 2.5      | gemini   | `gemini-2.5-flash`              | ✓       |
| Gemini Flash 3        | gemini   | `gemini-3-flash-preview`        |         |
| Gemini Flash 3.1 Lite | gemini   | `gemini-3.1-flash-lite-preview` |         |
| GPT-5.4               | openai   | `gpt-5.4`                       |         |
| GPT-5.4 Mini          | openai   | `gpt-5.4-mini`                  |         |
| GPT-5.4 Nano          | openai   | `gpt-5.4-nano`                  |         |

### IMAGE

**Purpose:** Image generation from text or reference images  
**Endpoint:** `POST /api/generate-images`

| Name                      | Provider | Model                            | Presets          | Default |
| ------------------------- | -------- | -------------------------------- | ---------------- | ------- |
| Nano Banana 1 (2.5 Flash) | gemini   | `gemini-2.5-flash-image`         | —                | ✓       |
| Nano Banana Pro (3 Pro)   | gemini   | `gemini-3-pro-image-preview`     | 1K, 2K, 4K       |         |
| Nano Banana 2 (3.1 Flash) | gemini   | `gemini-3.1-flash-image-preview` | 0.5K, 1K, 2K, 4K |         |
| Imagen 4                  | gemini   | `imagen-4.0-generate-001`        | 1K, 2K           |         |
| Imagen 4 Fast             | gemini   | `imagen-4.0-fast-generate-001`   | —                |         |
| Imagen 4 Ultra            | gemini   | `imagen-4.0-ultra-generate-001`  | 1K, 2K           |         |
| GPT Image 1               | openai   | `gpt-image-1-mini`               | —                |         |
| GPT Image 1.5             | openai   | `gpt-image-1.5`                  | —                |         |

### VISION

**Purpose:** Image analysis and OCR  
**Endpoint:** `POST /api/extract-text-from-image`

| Name             | Provider | Model                    | Default |
| ---------------- | -------- | ------------------------ | ------- |
| Gemini Flash 2.5 | gemini   | `gemini-2.5-flash`       | ✓       |
| Gemini Flash 3   | gemini   | `gemini-3-flash-preview` |         |
| GPT-5.4          | openai   | `gpt-5.4`                |         |
| GPT-5.4 Mini     | openai   | `gpt-5.4-mini`           |         |
| GPT-5.4 Nano     | openai   | `gpt-5.4-nano`           |         |

### PLANNER

**Purpose:** Workflow generation from natural language  
**Endpoint:** `POST /api/plan-graph`

| Name             | Provider | Model              | Default |
| ---------------- | -------- | ------------------ | ------- |
| Gemini Flash 2.5 | gemini   | `gemini-2.5-flash` | ✓       |

### Retrieve Available Models

`GET /api/models` returns all supported models by category.
