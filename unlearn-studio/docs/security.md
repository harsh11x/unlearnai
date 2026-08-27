# Security Model

## Threat Model

All uploaded model files are treated as **untrusted**. An uploaded model could contain:

- Malicious pickle payloads
- Excessive resource consumption
- Path traversal attacks
- Code injection through custom architectures

## Security Controls

### 1. Model Loading Isolation

- Models are loaded in isolated worker processes, not the API server
- The API server never directly deserializes model code
- Workers can be containerized for filesystem isolation

### 2. Safe Serialization

- Prefer `.safetensors` format over PyTorch `.bin` files
- Safetensors only stores tensors, not arbitrary Python objects
- The system warns when non-safetensors models are uploaded

### 3. Resource Limits

- Maximum upload size: 10 GB
- Maximum model size: 10 GB
- Task time limits: 1 hour per job
- Memory limits per worker

### 4. Authentication & Authorization

- API key authentication (planned)
- Project-level access control (planned)
- Role-based permissions (planned)

### 5. Audit Logging

All significant operations are logged:
- Model uploads
- Unlearning job creation
- Evaluation runs
- Model version creation
- Configuration changes

### 6. Artifact Integrity

- Model files are hashed (SHA-256) on upload
- Hashes are verified before loading
- Dataset hashes ensure reproducibility

## Known Limitations

- Worker isolation is not fully implemented in V1
- No network-level isolation between workers
- No cryptographic signing of artifacts
- Authentication is not yet implemented
- Audit logs are not tamper-proof

## Recommendations

- Run workers in isolated containers
- Use GPU-dedicated machines for unlearning
- Monitor resource usage during operations
- Review evaluation results before deploying edited models
