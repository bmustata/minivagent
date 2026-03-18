# Project Structure

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
