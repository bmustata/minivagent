# Node Types Reference

This document describes all supported node types in minivagent and their properties.

## Overview

minivagent supports 5 node types for building AI workflows:

| Node Type     | Purpose                          | Input Handles | Output Handles     |
| ------------- | -------------------------------- | ------------- | ------------------ |
| TEXT_GEN      | Generate or process text         | prompt        | prompt, output     |
| IMAGE_GEN     | Generate images from prompts     | prompt, image | image-0 to image-3 |
| IMAGE_SOURCE  | Provide input images             | -             | image              |
| IMAGE_TO_TEXT | Describe/analyze images (Vision) | prompt, image | output             |
| NOTE          | Documentation/notes              | -             | prompt             |

Each node type supports model selection from available AI providers. Models can be selected via the node's dropdown menu in the UI or specified in the graph JSON configuration.

See [Supported Models](supported-models.md) for available models and their options.

---

## TEXT_GEN (Text Generator)

**Purpose:** Generate text using AI or process input text from connected nodes.

**Input Handles:**

- `prompt` - Accepts text input from other nodes (e.g., NOTE, TEXT_GEN output)

**Output Handles:**

- `prompt` - Outputs the node's prompt text
- `output` - Outputs the generated AI response

**Properties:**

```typescript
{
  prompt: string;          // The text prompt or instructions
  output?: string;         // Generated text response
  enhancedOutput?: string; // AI-enhanced version of prompt (if enabled)
  enhancePrompt?: boolean; // Enable AI prompt optimization
  model?: string;          // Selected model name (optional)
  isLoading: boolean;      // Execution state
  error?: string;          // Error message if generation fails
}
```

**Use Cases:**

- Generate creative writing, stories, or articles
- Process and transform text from upstream nodes
- Create prompts for image generation nodes
- Chain multiple text transformations together

**Example Configuration:**

```json
{
    "id": "textgen847293",
    "type": "TEXT_GEN",
    "position": { "x": 100, "y": 100 },
    "data": {
        "prompt": "Write a short story about a robot learning to paint",
        "model": "gemini-2.5-flash",
        "enhancePrompt": true,
        "isLoading": false
    }
}
```

---

## IMAGE_GEN (Image Generator)

**Purpose:** Generate images from text prompts or reference images using AI.

**Input Handles:**

- `prompt` - Accepts text prompts from other nodes
- `image` - Accepts reference images for style transfer or variations

**Output Handles:**

- `image-0` to `image-3` - Individual image outputs (based on `imageCount`)

**Properties:**

```typescript
{
  prompt: string;              // Text description of desired image
  images?: string[];           // Generated images as base64 data URIs (runtime)
  imageResources?: string[];   // Resource UUIDs for generated images (one per image)
  imageCount?: number;         // Number of images to generate (1-4)
  aspectRatio?: string;        // Image dimensions ratio
  outputFormat?: string;       // Image file format
  enhancePrompt?: boolean;     // Enable AI prompt optimization
  enhancedOutput?: string;     // AI-enhanced version of prompt
  model?: string;              // Selected model name (optional)
  preset?: string;             // Model-specific preset (e.g., '1K', '2K', '4K')
  isLoading: boolean;          // Execution state
  error?: string;              // Error message if generation fails
}
```

**Supported Values:**

- `imageCount`: 1, 2, 3, or 4
- `aspectRatio`: '1:1', '16:9', '9:16', '4:3', '3:4'
- `outputFormat`: 'PNG', 'JPEG'
- `preset`: Model-dependent (e.g., '1K', '2K', '4K' for gemini-3-pro-image-preview)

**Note:** The preset selector appears automatically in the UI when a model with preset support is selected.

**Use Cases:**

- Generate images from text descriptions
- Create variations of reference images
- Generate multiple images with different parameters
- Combine text prompts with reference images

**Example Configuration:**

```json
{
    "id": "imagegen562018",
    "type": "IMAGE_GEN",
    "position": { "x": 500, "y": 100 },
    "data": {
        "prompt": "A serene mountain landscape at sunset",
        "model": "gemini-3-pro-image-preview",
        "preset": "2K",
        "imageCount": 2,
        "aspectRatio": "16:9",
        "outputFormat": "JPEG",
        "enhancePrompt": true,
        "isLoading": false
    }
}
```

---

## IMAGE_SOURCE (Image Input)

**Purpose:** Provide images from external sources (upload or URL) as input to other nodes.

**Input Handles:** None

**Output Handles:**

- `image` - Outputs the source image

**Properties:**

```typescript
{
  imageInput?: string;      // Base64 data URI or URL of the image
  imageInputType?: 'UPLOAD' | 'URL';  // Source type
  prompt: string;           // Unused (kept for consistency)
  isLoading: boolean;       // State indicator
}
```

**Supported Input Types:**

- `UPLOAD` - Upload image from local file system (converted to base64)
- `URL` - Reference image from external URL

**Use Cases:**

- Upload photos for analysis with IMAGE_TO_TEXT
- Provide reference images for IMAGE_GEN variations
- Input product photos for description generation
- Supply images for multi-modal workflows

**Example Configuration:**

```json
{
    "id": "imgsrc182947",
    "type": "IMAGE_SOURCE",
    "position": { "x": 0, "y": 300 },
    "data": {
        "imageInputType": "URL",
        "imageInput": "https://example.com/photo.jpg",
        "prompt": "",
        "isLoading": false
    }
}
```

---

## IMAGE_TO_TEXT (Vision / Image Analysis)

**Purpose:** Analyze and describe images using AI vision models.

**Input Handles:**

- `prompt` - Optional text prompt for specific analysis instructions
- `image` - Accepts images from IMAGE_SOURCE or IMAGE_GEN nodes

**Output Handles:**

- `output` - Text description or analysis of the image

**Properties:**

```typescript
{
  prompt: string;           // Instructions for image analysis
  output?: string;          // Generated text description
  imageInput?: string;      // Direct image input (base64 or URL)
  imageInputType?: 'UPLOAD' | 'URL';  // Input method
  model?: string;           // Selected model name (optional)
  isLoading: boolean;       // Execution state
  error?: string;           // Error message if analysis fails
}
```

**Use Cases:**

- Generate image descriptions or alt text
- Extract text from images (OCR)
- Analyze image content for specific details
- Create captions for generated images
- Answer questions about images

**Example Configuration:**

```json
{
    "id": "vision526139",
    "type": "IMAGE_TO_TEXT",
    "position": { "x": 400, "y": 300 },
    "data": {
        "prompt": "Describe this image in detail, focusing on colors and composition",
        "model": "gemini-2.5-flash",
        "imageInputType": "UPLOAD",
        "isLoading": false
    }
}
```

---

## NOTE (Documentation)

**Purpose:** Add documentation, comments, or static text to workflows.

**Input Handles:** None

**Output Handles:**

- `prompt` - Outputs the note text (can be used as input to other nodes)

**Properties:**

```typescript
{
    prompt: string // The note content
    isLoading: boolean // Always false for notes
}
```

**Use Cases:**

- Document workflow logic and purpose
- Provide static text prompts to downstream nodes
- Add instructions or reminders
- Label sections of complex workflows

**Example Configuration:**

```json
{
    "id": "note394765",
    "type": "NOTE",
    "position": { "x": 200, "y": 600 },
    "data": {
        "prompt": "This workflow generates product descriptions with images",
        "isLoading": false
    }
}
```

---

## Node Connections

### Handle Naming Convention

**Source Handles (Output):**

- `prompt` - Text prompt output
- `output` - Generated text result
- `image` - Single image output
- `image-0`, `image-1`, `image-2`, `image-3` - Multiple image outputs

**Target Handles (Input):**

- `prompt` - Text input
- `image` - Image input

### Connection Rules

1. **Text Connections:**
    - Connect `prompt` or `output` handles to `prompt` targets
    - Multiple text inputs are concatenated with spacing

2. **Image Connections:**
    - Connect `image` or `image-N` handles to `image` targets
    - Multiple image inputs are processed sequentially

3. **Mixed Workflows:**
    - TEXT_GEN → IMAGE_GEN (text prompt to image generation)
    - IMAGE_SOURCE → IMAGE_TO_TEXT (image description)
    - IMAGE_GEN → IMAGE_TO_TEXT (describe generated images)
    - NOTE → TEXT_GEN → IMAGE_GEN (static prompt chain)

### Example Connection Patterns

**Story with Illustration:**

```
NOTE (story prompt) → TEXT_GEN (generate story) → IMAGE_GEN (create illustration)
```

**Image Variations:**

```
IMAGE_SOURCE (reference) → IMAGE_GEN (create variations)
```

**Image Analysis:**

```
IMAGE_SOURCE (photo) → IMAGE_TO_TEXT (describe) → TEXT_GEN (expand description)
```
