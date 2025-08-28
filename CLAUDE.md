# Claude Development Instructions - n8n Cloudflare D1 Node

## Project Context
This is an n8n community node for Cloudflare D1 database integration. The node provides both standard workflow functionality and AI Agent tool compatibility.

## Development Guidelines

### Code Standards
- Use TypeScript for all source code
- Follow n8n's coding conventions and interfaces
- Implement comprehensive error handling
- Use parameterized queries to prevent SQL injection
- Include detailed JSDoc documentation

### File Structure Conventions
```
credentials/
├── CloudflareD1Api.credentials.ts     # Cloudflare API authentication
nodes/
├── CloudflareD1/
│   ├── CloudflareD1.node.ts           # Main node implementation
│   ├── CloudflareD1.node.json         # Node metadata (if needed)
│   └── cloudflared1.svg               # Node icon
types/
├── CloudflareD1Types.ts               # TypeScript type definitions
utils/
├── CloudflareD1Utils.ts               # Utility functions
```

### Implementation Requirements

#### Credentials Class
- Implement `ICredentialType` interface
- Fields: `accountId`, `apiToken`, `apiEndpoint` (optional)
- Use password field type for API token
- Include field validation

#### Node Class
- Implement `INodeType` interface
- Set `usableAsTool: true` for AI Agent compatibility
- Operations: `executeQuery`, `batchQueries`, `executeRawSql`
- Include comprehensive parameter descriptions
- Handle all Cloudflare D1 API responses and errors

#### API Integration
- Use n8n's `this.helpers.httpRequest()` for HTTP calls
- Endpoint: `https://api.cloudflare.com/client/v4/accounts/{accountId}/d1/database/{databaseId}/query`
- Authentication: `Bearer {apiToken}` header
- Content-Type: `application/json`

### Testing Requirements
- Test with actual Cloudflare D1 databases
- Verify AI Agent tool functionality
- Test error handling scenarios
- Validate parameter binding security
- Test batch operations

### Documentation Standards
- Update SCRATCHPAD.md with progress notes
- Maintain accurate ARCHITECTURE.md
- Keep DEPLOYMENT.md current with setup instructions
- Update README.md with usage examples
- Document all changes in CHANGELOG.md

### Git Practices
- Make commits at logical intervals
- Use descriptive commit messages
- Commit after completing each major component
- Tag releases with semantic versioning

### AI Agent Optimization
- Write AI-friendly descriptions for all operations and parameters
- Use clear, unambiguous language in descriptions
- Include context about when to use each operation
- Provide examples in parameter descriptions

### Security Considerations
- Never log API tokens or sensitive data
- Use parameterized queries exclusively for user input
- Validate all input parameters
- Handle rate limiting gracefully
- Implement proper error sanitization

### Performance Guidelines
- Use batch operations for multiple queries
- Implement connection pooling where possible
- Handle large result sets efficiently
- Provide timeout configuration
- Cache static data appropriately

## Current Implementation Status
- ✅ Project structure setup
- ✅ Documentation files created
- ⏳ Credentials implementation
- ⏳ Core node functionality
- ⏳ AI Agent tool compatibility
- ⏳ Testing and validation

## Next Steps
1. Implement CloudflareD1Api.credentials.ts
2. Create CloudflareD1.node.ts with core functionality
3. Add node icon and styling
4. Test locally with n8n
5. Create GitHub repository
6. Publish to npm registry

## Notes
- Always maintain backward compatibility
- Follow n8n community node best practices
- Ensure comprehensive error messages for debugging
- Optimize for both workflow and AI Agent use cases