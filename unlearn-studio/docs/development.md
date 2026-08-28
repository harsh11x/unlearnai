# Development Guide

This guide covers setting up and developing Remap Studios locally.

## Prerequisites

- Python 3.9+
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Docker (optional, for containerized development)
- NVIDIA GPU with CUDA support (for ML workloads)

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd nullmind

# Create Python virtual environment
python -m venv .venv
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Database Setup

```bash
# Start PostgreSQL (if not using Docker)
createdb nullmind

# Initialize database schema
python -m services.api.init_db
```

### 3. Start Services

```bash
# Terminal 1: API Server
cd services/api
uvicorn main:app --reload --port 8000

# Terminal 2: Celery Worker (requires GPU)
cd services/worker
celery -A celery_app worker --loglevel=info --pool=solo

# Terminal 3: Frontend
cd apps/web
npm install
npm run dev
```

### 4. Access the Application

- Frontend: http://localhost:3000
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Docker Development

For a fully containerized setup:

```bash
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- API Server (port 8000)
- Celery Worker (GPU-enabled)
- Frontend (port 3000)

## Project Structure

```
nullmind/
├── apps/web/              # Next.js frontend
├── services/
│   ├── api/               # FastAPI backend
│   └── worker/            # Celery GPU worker
├── ml/                    # Core ML library
│   ├── models/            # Model adapters
│   ├── datasets/          # Probe/evaluation datasets
│   ├── evaluation/        # Evaluation engine
│   ├── unlearning/        # Unlearning methods
│   └── metrics/           # Metric calculations
├── infrastructure/        # Docker, scripts
├── tests/                 # Test suite
└── docs/                  # Documentation
```

## Development Workflow

### 1. ML Development

Start with the ML proof-of-concept:

```bash
# Run the CLI evaluation
python cli.py evaluate --model-path ./models/gpt2 --config configs/default.json

# Run unlearning
python cli.py unlearn --model-path ./models/gpt2 --config configs/unlearn_python.json
```

### 2. API Development

The API uses FastAPI with automatic OpenAPI documentation:

```bash
# Run tests
pytest tests/ -v

# Check types
mypy services/api/

# Lint
ruff check services/api/
```

### 3. Frontend Development

```bash
cd apps/web

# Development mode
npm run dev

# Type checking
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

## Testing

### Unit Tests

```bash
# Python tests
pytest tests/ -v

# Frontend tests
cd apps/web
npm test
```

### Integration Tests

```bash
# Full pipeline test (requires GPU)
pytest tests/test_integration.py -v
```

### ML Smoke Test

```bash
# Quick validation of the ML pipeline
python -m tests.test_ml_pipeline
```

## Environment Variables

### API Server

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/nullmind
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key
STORAGE_PATH=/path/to/storage
```

### Worker

```bash
CELERY_BROKER_URL=redis://localhost:6379/0
CUDA_VISIBLE_DEVICES=0
MODEL_CACHE_DIR=/path/to/model/cache
```

## Code Style

### Python

- Type hints on all functions
- Pydantic models for data validation
- Docstrings for public APIs
- Maximum line length: 100 characters

### TypeScript/React

- Functional components only
- TypeScript strict mode
- ESLint + Prettier
- Component-based architecture

## Debugging

### API Issues

```bash
# Check API logs
docker-compose logs api

# Check database
psql -d nullmind -c "SELECT * FROM models;"
```

### Worker Issues

```bash
# Check worker logs
docker-compose logs worker

# Monitor Celery
celery -A celery_app flower  # Web UI at port 5555
```

### GPU Issues

```bash
# Check GPU status
nvidia-smi

# Monitor GPU during training
watch -n 1 nvidia-smi
```

## Performance Tips

1. **Model Loading**: Use `low_cpu_mem_usage=True` for large models
2. **Batch Processing**: Process probes in batches, not one-by-one
3. **Gradient Checkpointing**: Enable for large models to save VRAM
4. **Mixed Precision**: Use fp16 for faster training/inference

## Common Issues

### Out of Memory

- Reduce batch size
- Use gradient accumulation
- Enable gradient checkpointing
- Use a smaller model

### Slow Evaluation

- Use `do_sample=False` for deterministic evaluation
- Cache tokenizer outputs
- Parallelize evaluation across GPUs

### Database Connection Errors

- Check PostgreSQL is running
- Verify connection string in `.env`
- Check connection pool settings

## Contributing

1. Create a feature branch
2. Write tests for new functionality
3. Ensure all tests pass
4. Update documentation
5. Submit a pull request

## Research Notes

When implementing new unlearning methods:

1. Document the mathematical formulation
2. Explain what the method does and doesn't guarantee
3. Include references to relevant papers
4. Note any limitations or assumptions
