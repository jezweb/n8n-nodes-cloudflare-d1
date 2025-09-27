# Changelog

All notable changes to this project will be documented in this file.

## [0.5.8] - 2025-01-27

### Documentation
- Updated README to v0.5.7 with complete feature documentation
- Added Find Record operation documentation (v0.5.6)
- Added Memory Resource operations section with all 5 operations
- Added fuzzy search feature documentation (v0.5.2)
- Reorganized features section for better clarity
- Removed outdated version badges from older features

## [0.5.7] - 2025-01-27

### Fixed
- Reverted node version from 3 to 2 to fix compatibility issues with existing workflows
- Resolved "node is not currently installed" error that appeared after v0.5.6 update
- Fixed conflict where Search Messages operation was causing node registration issues

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned (Future)
- Real-time database schema caching
- Advanced migration tools
- Performance analytics and query optimization
- Custom SQL function support

## [0.5.5] - 2025-01-15

### Fixed
- Removed redundant hint text from Insert and Update column fields
- Cleaner UI without unnecessary tooltips

## [0.5.4] - 2025-01-15

### Improved
#### Better User Experience for Column Management
- **Enhanced Insert Operation**:
  - Added helpful hints for using "Add Column" button to add multiple columns
  - Improved value field description with expression examples
  - Better guidance for AI Agents on column specification
- **Enhanced Update Operation**:
  - Added helpful hints for using "Add Column" button to update multiple columns
  - Improved value field description with expression examples
  - Clear instructions for both users and AI Agents
- **Clearer Documentation**: All column-related operations now have better inline help text

### Technical
- Improved user experience without adding complex auto-loading features
- Maintained stability by avoiding problematic dynamic column population
- Enhanced descriptions for better AI Agent understanding

## [0.5.3] - 2025-01-15

### Added
#### Find Record Operation (AI-Friendly)
- **New Operation**: Simplified record location for AI agents and users
  - Simple search interface with column dropdown, operator, and value
  - "Find Latest Record" toggle to get most recently added rows (ORDER BY rowid DESC)
  - Configurable limit (default 1, but adjustable for multiple records)
  - Full operator support (equals, not equals, contains, greater than, less than, IN, NOT IN, IS NULL, etc.)
  - Automatic wildcard addition for LIKE operator when not present
  - Perfect for "create then update" AI workflows

#### ORDER BY Support for SELECT Operation
- **New Order By Field**: Add multiple sort columns
- **Direction Control**: ASC/DESC for each column
- **Column Dropdown**: Select columns from table schema
- **Multiple Sort Levels**: Support for complex sorting requirements

### Fixed
#### WHERE Condition Operators
- **All Operators Now Functional**: Fixed implementation for all SQL operators
  - Equals (=), Not Equals (!=)
  - Greater Than (>), Less Than (<), Greater/Less Than or Equal (>=, <=)
  - LIKE, NOT LIKE with automatic wildcard support
  - IN, NOT IN with comma-separated value support
  - IS NULL, IS NOT NULL
- **Applies to All Operations**: SELECT, UPDATE, and DELETE now support all operators
- **Proper Parameter Binding**: All operators use secure parameterized queries

### Technical
- Enhanced WHERE clause building with proper operator handling
- Improved query construction for SELECT, UPDATE, and DELETE operations
- Better parameter binding for complex conditions
- Maintained backward compatibility with existing workflows
- Column dropdowns continue to work when manually adding fields

### Note
- Removed auto column loading feature that was causing connection issues
- Manual column selection with dropdown continues to work as before

## [0.5.2] - 2025-01-28

### Added
#### Fuzzy Search for Memory Operations
- **Enable Fuzzy Search**: New optional parameter in Search Messages operation
  - Handles plural/singular variations (e.g., "designer" matches "designers")
  - Removes/adds common suffixes (s, es, ing, ed, er, ly, ion)
  - Splits multi-word searches to match individual words
  - Maintains backward compatibility with exact search (default: disabled)
- **Smart Pattern Generation**: Automatically generates multiple search patterns for flexible matching
- **AI Agent Optimized**: Clear parameter descriptions and examples for AI Agent understanding

### Improved
- **Search Flexibility**: Addresses common search frustrations where exact terms don't match variations
- **Better User Experience**: Optional feature allows users to choose between exact and flexible search
- **Performance Aware**: Efficient SQL query generation with parameterized patterns

### Technical
- New fuzzy search pattern generation algorithm in `CloudflareD1Utils.generateFuzzySearchPatterns()`
- Enhanced `searchMessages()` method with fuzzy search capability
- Multiple LIKE patterns with OR conditions for comprehensive matching
- Maintains SQL injection protection through parameterized queries

## [0.5.1] - 2025-01-28

### Fixed
- **Memory Resource UI**: Removed confusing placeholder session ID from "Search in Session" field
  - Field now appears empty by default, making it clearer that session ID is optional
  - Improves AI Agent understanding that global searches across all sessions are supported
  - Better user experience for optional parameter fields

## [0.5.0] - 2025-01-28

### Added
#### Memory Resource for AI Agents
- **Get Chat History**: Retrieve conversation history for specific sessions
  - Filter by message types (human/ai)
  - Configurable limits and sort order (oldest/newest first)
  - Full session conversation retrieval with metadata
- **Search Messages**: Search messages by content across all sessions
  - Global search across all conversations
  - Session-specific search filtering
  - Message type filtering with flexible limits
- **Get Recent Messages**: Fetch the most recent messages from a session
  - Quick access to latest conversation context
  - Configurable message limits for AI context management
- **Get Session List**: List all available session IDs with statistics
  - Message counts per session
  - First and last message timestamps
  - Session activity overview for AI agents
- **Clear Session**: Remove all messages for a specific session
  - Safe session cleanup with confirmation warnings
  - Complete conversation history removal

#### AI Agent Optimization
- **Memory Resource**: Dedicated resource type for chat memory operations
- **AI-Friendly Descriptions**: Clear, detailed parameter descriptions for AI Agent tools
- **Structured Operations**: Pre-built SQL queries optimized for common memory access patterns
- **Rich Metadata**: Comprehensive operation results with counts, timestamps, and session info
- **Parameter Validation**: Built-in input validation and error handling
- **Security**: All operations use parameterized queries to prevent SQL injection

### Improved
- Enhanced AI Agent tool compatibility with memory-specific operations
- Better parameter organization for memory operations
- Comprehensive TypeScript type definitions for memory operations
- Optimized SQL queries for chat memory access patterns

### Technical
- New memory operation types: `getChatHistory`, `searchMessages`, `getRecentMessages`, `getSessionList`, `clearSession`
- Memory utility methods in `CloudflareD1Utils.ts`
- Memory-specific TypeScript interfaces: `D1MemoryMessage`, `D1SessionInfo`, `D1MemoryOperationResult`
- Integration with existing `chat_memory` table schema

## [0.4.0] - 2025-01-28

### Added
#### Table Management Operations
- **Create Table**: Visual table builder without SQL knowledge
  - Column type selection (TEXT, INTEGER, REAL, BLOB, BOOLEAN, DATETIME, JSON)
  - Constraint configuration (PRIMARY KEY, NOT NULL, UNIQUE, DEFAULT, AUTO INCREMENT)
  - IF NOT EXISTS option for safe table creation
- **List Tables**: Database schema discovery with table enumeration
- **Get Table Schema**: View table structure, columns, and constraints
- **Drop Table**: Safe table deletion with IF EXISTS support
- **Alter Table**: Add/drop columns, rename tables, manage indexes

#### Query Builder Tools
- **Visual Query Builder**: Build complex SELECT queries without SQL
  - WHERE conditions with multiple operators (=, !=, >, <, >=, <=, LIKE, IN, BETWEEN)
  - JOIN support (INNER, LEFT, RIGHT, FULL, CROSS)
  - GROUP BY and HAVING clauses
  - ORDER BY with multiple columns
  - LIMIT and OFFSET pagination
- **Aggregate Query**: Statistical operations (COUNT, SUM, AVG, MIN, MAX, GROUP_CONCAT)
- **Search Records**: Full-text search across multiple columns
- **Get Distinct Values**: Extract unique values from columns
- **Table Statistics**: Row counts and database analytics

#### Database Management
- **Export Database**: Backup to SQL dump with signed URL
- **Import Database**: Restore from SQL files
- **Get Database Info**: View UUID, table count, size, creation date
- **List Databases**: Enumerate all D1 databases in account

### Improved
- Resource organization with new categories: tableManagement, builder, database
- Enhanced parameter validation and type safety
- Better error messages for all operations
- Comprehensive TypeScript type definitions

### Technical
- New utility methods: buildCreateTableSQL, buildQueryFromBuilder, buildAggregateQuery
- Support for all SQLite column types and constraints
- Full parameter binding across all query builders
- Cloudflare D1 API integration for database management

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