# n8n Cloudflare D1 Node

[![npm version](https://badge.fury.io/js/n8n-nodes-cloudflare-d1.svg)](https://badge.fury.io/js/n8n-nodes-cloudflare-d1)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An n8n community node for integrating with Cloudflare D1, a serverless SQLite-compatible database. This node supports both standard workflow usage and AI Agent tool integration.

![Cloudflare D1 Node](https://raw.githubusercontent.com/jezweb/n8n-nodes-cloudflare-d1/main/docs/images/node-preview.png)

## Features

- 🗄️ **Full D1 Integration**: Execute SQL queries, batch operations, and raw SQL commands
- 🤖 **AI Agent Compatible**: Optimized for use with n8n AI Agents and MCP Trigger nodes  
- 🔐 **Secure Authentication**: Cloudflare API token-based authentication with credential encryption
- ⚡ **High Performance**: Batch operations and parameterized queries for optimal performance
- 🛡️ **SQL Injection Protection**: Parameterized queries prevent SQL injection attacks
- 📊 **Rich Data Types**: Full support for JSON operations and SQLite data types
- 🔍 **Error Handling**: Comprehensive error reporting and debugging support

## Quick Start

### Installation

#### Via n8n Community Nodes (Recommended)
1. Go to **Settings > Community Nodes** in your n8n instance
2. Enter `n8n-nodes-cloudflare-d1` and click Install
3. Restart n8n - the Cloudflare D1 node will appear in your nodes panel

#### Via npm
```bash
npm install n8n-nodes-cloudflare-d1
```

### Prerequisites
- n8n instance (local or cloud)
- Cloudflare account with D1 database access
- Cloudflare API token with D1 permissions

### Setup Cloudflare Credentials

1. **Get your Cloudflare Account ID**:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Copy your Account ID from the right sidebar

2. **Create an API Token**:
   - Go to **My Profile > API Tokens**
   - Click **Create Token** → **Custom Token**
   - Add permissions: `D1:Read` and `D1:Write`
   - Include your account in the Account Resources
   - Click **Continue to Summary** → **Create Token**

3. **Configure in n8n**:
   - Create a new **Cloudflare D1 API** credential
   - Enter your Account ID and API Token

### Create a D1 Database

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create a new D1 database
wrangler d1 create my-database

# Create a table (optional)
wrangler d1 execute my-database --command="CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);"
```

## Usage Examples

### Basic Query Execution

```sql
-- Select all users
SELECT * FROM users;

-- Insert a new user with parameters
INSERT INTO users (name, email) VALUES (?, ?);
-- Parameters: ["John Doe", "john@example.com"]
```

### Batch Operations

Execute multiple queries in a single transaction:

```sql
-- Query 1: Insert user
INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');

-- Query 2: Create user profile
INSERT INTO profiles (user_id, bio) VALUES (last_insert_rowid(), 'Software Developer');
```

### JSON Operations

```sql
-- Query JSON data stored in D1
SELECT json_extract(metadata, '$.preferences.theme') as theme
FROM users 
WHERE json_extract(metadata, '$.active') = 1;

-- Update JSON field
UPDATE users 
SET metadata = json_set(metadata, '$.last_login', datetime('now'))
WHERE id = ?;
```

## Node Operations

### Execute Query
Execute a single parameterized SQL query with optional parameter binding.

**Parameters:**
- **Database ID**: Your D1 database identifier
- **SQL Query**: The SQL statement to execute  
- **Parameters**: Optional array of parameters for binding (prevents SQL injection)

### Batch Queries  
Execute multiple SQL queries in a single transaction for better performance and atomicity.

**Parameters:**
- **Database ID**: Your D1 database identifier
- **Queries**: Array of SQL statements with optional parameters

### Execute Raw SQL
Execute raw SQL commands without parameter binding (use with caution).

**Parameters:**
- **Database ID**: Your D1 database identifier  
- **SQL Commands**: Raw SQL to execute

## AI Agent Integration

This node is optimized for AI Agent workflows and can be used as a tool by AI Agents:

### Example AI Agent Workflow

1. **MCP Trigger Node**: Receives AI Agent requests
2. **Cloudflare D1 Node**: Executes database operations  
3. **Return results**: Formatted for AI consumption

### AI-Friendly Descriptions

All operations and parameters include detailed descriptions that help AI Agents understand when and how to use the node effectively.

## Error Handling

The node provides comprehensive error handling with detailed error messages:

- **Authentication Errors**: Invalid API tokens or account IDs
- **Database Errors**: Database not found or access denied
- **SQL Errors**: Syntax errors with line numbers and context
- **Rate Limiting**: Automatic retry logic for rate-limited requests
- **Network Errors**: Connection timeouts and network issues

## Advanced Features

### Session Management
```sql
-- Use sessions for consistency across queries
-- Automatically handled by the node for batch operations
```

### Performance Optimization
- Parameterized queries for repeated operations
- Batch operations for bulk data processing
- Connection pooling handled by Cloudflare
- Automatic query optimization

### Security Features
- API token-based authentication
- Encrypted credential storage
- SQL injection prevention via parameterized queries
- Audit logging support

## Configuration

### Environment Variables
```env
# Optional: Custom Cloudflare API endpoint
CLOUDFLARE_API_ENDPOINT=https://api.cloudflare.com/client/v4

# Optional: Request timeout (milliseconds)
D1_REQUEST_TIMEOUT=30000
```

### Workflow Settings
- **Timeout**: Customize query timeout periods
- **Retry Logic**: Configure retry attempts for failed requests
- **Error Handling**: Choose between stopping workflow or continuing on errors

## Development

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/jezweb/n8n-nodes-cloudflare-d1.git
cd n8n-nodes-cloudflare-d1

# Install dependencies
npm install

# Build the project
npm run build

# Link for local n8n development
npm link
cd ~/.n8n/custom
npm link n8n-nodes-cloudflare-d1

# Start n8n
n8n start
```

### Testing

```bash
# Run linting
npm run lint

# Run tests
npm test

# Format code
npm run format
```

## API Reference

### Cloudflare D1 REST API
This node uses the [Cloudflare D1 REST API](https://developers.cloudflare.com/d1/api/):

- **Base URL**: `https://api.cloudflare.com/client/v4`
- **Endpoint**: `/accounts/{account_id}/d1/database/{database_id}/query`
- **Authentication**: Bearer token

### Response Format
```json
{
  "success": true,
  "result": [
    {
      "results": [...],
      "success": true,
      "meta": {
        "duration": 0.123,
        "rows_read": 1,
        "rows_written": 0
      }
    }
  ]
}
```

## Troubleshooting

### Common Issues

**Node not appearing in n8n:**
- Restart n8n after installation
- Check n8n logs for errors
- Verify package installation: `npm list n8n-nodes-cloudflare-d1`

**Authentication errors:**
- Verify Account ID and API Token
- Check token permissions include D1:Read and D1:Write  
- Ensure token hasn't expired

**Query execution failures:**
- Verify database ID is correct
- Check SQL syntax
- Review D1 database permissions

### Debug Mode

Enable debug logging:
```bash
N8N_LOG_LEVEL=debug n8n start
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE.md) for details.

## Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/jezweb/n8n-nodes-cloudflare-d1/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/jezweb/n8n-nodes-cloudflare-d1/discussions)  
- 📖 **Documentation**: [Wiki](https://github.com/jezweb/n8n-nodes-cloudflare-d1/wiki)
- 🌐 **Community**: [n8n Community Forum](https://community.n8n.io)

## Related Links

- [n8n Documentation](https://docs.n8n.io/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)
- [Cloudflare API Documentation](https://developers.cloudflare.com/api/)

---

Made with ❤️ by [Jez (Jeremy Dawes)](https://www.jezweb.com.au) - [Jezweb](https://www.jezweb.com.au)