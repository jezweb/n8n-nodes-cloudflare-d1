# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned (Future)
- Advanced WHERE clause operators (IN, LIKE, NOT NULL, etc.)
- ORDER BY support for structured SELECT operations
- Batch Insert operations via UI
- Advanced table management features

## [0.2.1] - 2025-08-28

### Added
- **Structured Database Operations**: Complete PostgreSQL/Supabase-style interface
  - INSERT: Form-based column/value pairs with validation
  - SELECT: Column selection, WHERE conditions, LIMIT/pagination
  - UPDATE: Set columns with WHERE conditions
  - DELETE: WHERE conditions with optional safety limits
- **Dynamic Table Introspection**: Live database schema discovery
  - Searchable table dropdown populated from D1 database
  - Dynamic column loading based on selected table
  - Column type information (type, primary key, nullable status)
- **Resource/Operation Pattern**: Table vs Query resource selection
- **Enhanced User Experience**: Form validation and helpful error messages
- **Full AI Agent Compatibility**: Clean structured operations for AI agents

### Improved
- Node versioning system (now v2)
- Error handling and validation
- Parameter binding security
- Result formatting and metadata

### Technical
- Static utility methods for query building
- Comprehensive TypeScript interfaces
- Table name and column validation
- Backward compatibility with v0.1.0

## [0.2.0] - 2025-01-28 (Phase 2A Infrastructure Complete)

### Added
#### Enhanced Infrastructure
- **Comprehensive Type System**: Complete TypeScript type definitions in `types/CloudflareD1Types.ts`
- **Utility Layer**: Query builders and API utilities in `utils/CloudflareD1Utils.ts`
- **Chat Memory Sub-Node**: LangChain-compatible chat message storage (`CloudflareD1ChatMemory`)

#### Chat Memory Features
- Session-based conversation storage with automatic table creation
- Message type classification (human/ai/system) with metadata support  
- Configurable message limits and expiration policies
- Automatic cleanup of old messages and session management
- Integration with AI Agent workflows for persistent context

#### Developer Experience
- Enhanced documentation with v0.2.0 architecture details
- Improved deployment guide with chat memory configuration
- Updated README with comprehensive feature coverage
- Type-safe query building infrastructure (ready for Phase 2B)

### Infrastructure
- **Type Safety**: Complete interface definitions for all operations
- **Query Builders**: Parameterized query construction with security
- **Error Handling**: Enhanced error types and comprehensive validation
- **API Layer**: Centralized Cloudflare D1 API communication utilities

### Compatibility
- **Backward Compatible**: All v0.1.0 workflows continue to function unchanged
- **Enhanced Capabilities**: New chat memory functionality without breaking changes
- **AI Agent Optimized**: Both nodes support `usableAsTool: true` for AI workflows

### Technical Improvements
- **Build System**: Successfully compiles with enhanced infrastructure
- **Package Management**: Updated to include both main and chat memory nodes
- **Documentation**: Comprehensive updates across all documentation files

## [0.1.0] - 2025-01-28

### Added
- Cloudflare D1 database integration for n8n
- Execute Query operation with parameterized queries
- Batch Queries operation for transaction support
- Execute Raw SQL operation for maintenance tasks
- AI Agent tool compatibility (`usableAsTool: true`)
- Comprehensive error handling and validation
- Cloudflare API token authentication
- SQL injection prevention through parameter binding
- Support for JSON operations and SQLite functions

### Security
- Secure credential storage with n8n encryption
- Parameterized queries to prevent SQL injection
- API token-based authentication with Cloudflare
- Input validation and sanitization

### Performance
- Batch operations for multiple queries
- Connection pooling via Cloudflare infrastructure
- Optimized request/response handling
- Configurable timeout settings

### Documentation
- Complete API documentation
- Usage examples and tutorials
- Troubleshooting guide
- Development setup instructions
- AI Agent integration examples

---

## Development Notes

### Version 0.1.0 Scope
This initial release focuses on core functionality:
- Basic CRUD operations via SQL queries
- Secure authentication and credential management
- AI Agent tool integration for workflow automation
- Comprehensive error handling and debugging support

### Future Enhancements (Phase 2B and Beyond)
- **Structured Operations**: Insert, Select, Update, Delete with visual interfaces
- **Schema Discovery**: Database introspection and table/column discovery
- **Query Builder**: Visual query construction interface
- **Advanced Features**: Custom functions, performance analytics, bulk operations
- **Enhanced AI Integration**: Structured operations as AI tools

### Technical Debt
- Add comprehensive unit tests
- Implement integration test suite
- Add performance benchmarking
- Create automated CI/CD pipeline
- Add code coverage reporting
- Implement security scanning

### Community Feedback
- Monitor GitHub issues for bug reports
- Track feature requests from users
- Gather feedback on AI Agent integration
- Collect performance optimization suggestions
- Document common use cases and patterns