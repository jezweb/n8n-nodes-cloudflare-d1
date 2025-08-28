# Deployment Guide - n8n Cloudflare D1 Node v0.2.0

## Overview
This guide covers the deployment and installation of the n8n Cloudflare D1 community node v0.2.0, including enhanced infrastructure with chat memory capabilities, local development, testing, and production deployment.

## Prerequisites

### System Requirements
- Node.js 20.15 or higher
- npm 8.0 or higher
- n8n installed (locally or cloud instance)
- Cloudflare account with D1 database access

### Cloudflare Setup
1. **Create Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Create D1 Database**: Use Wrangler CLI or Cloudflare Dashboard
3. **Generate API Token**: 
   - Go to Cloudflare Dashboard → My Profile → API Tokens
   - Create Custom Token with D1:Read and D1:Write permissions
   - Note your Account ID from the dashboard

## Installation Methods

### Method 1: n8n Community Nodes (Recommended)
1. **Access n8n Settings**: Go to Settings → Community Nodes
2. **Install Package**: Enter `n8n-nodes-cloudflare-d1@0.2.0`
3. **Restart n8n**: Both main and chat memory nodes will appear in your nodes panel
4. **Configure Credentials**: Add your Cloudflare API credentials
5. **Verify Installation**: Check for "Cloudflare D1" and "Cloudflare D1 Chat Memory" nodes

### Method 2: Manual Installation
```bash
# Install the specific version globally
npm install -g n8n-nodes-cloudflare-d1@0.2.0

# Or install in your n8n custom directory
cd ~/.n8n/custom
npm install n8n-nodes-cloudflare-d1@0.2.0
```

### Method 3: Local Development
```bash
# Clone the repository
git clone https://github.com/jezweb/n8n-nodes-cloudflare-d1.git
cd n8n-nodes-cloudflare-d1

# Install dependencies
npm install

# Build the project
npm run build

# Link for local development
npm link
cd ~/.n8n/custom
npm link n8n-nodes-cloudflare-d1
```

## Configuration

### Credential Setup
1. **Create New Credential**: In n8n, add a new "Cloudflare D1 API" credential
2. **Configure Fields**:
   - **Account ID**: Your Cloudflare Account ID
   - **API Token**: Your generated API token
   - **API Endpoint**: (Optional) Custom endpoint override

### Testing Credentials
```javascript
// Test basic connection (Execute Query operation)
SELECT 1 as test_connection;

// Test chat memory functionality (if using chat memory node)
SELECT name FROM sqlite_master WHERE type='table' AND name='chat_memory';
```

### Node Configuration

#### Main Node (Cloudflare D1)
- **Available Operations**: Execute Query, Batch Queries, Execute Raw SQL
- **Use Cases**: Database operations, data queries, bulk processing
- **AI Agent Compatible**: Yes (usableAsTool: true)

#### Chat Memory Sub-Node (Cloudflare D1 Chat Memory)
- **Purpose**: LangChain-compatible chat message storage
- **Use Cases**: AI Agent conversations, chat history, context management
- **Configuration**: Session ID, table name, message limits, expiration
- **Auto-Features**: Table creation, message cleanup, session management

## Environment-Specific Deployments

### Development Environment
```bash
# Start n8n in development mode
npm run dev

# Create test databases
wrangler d1 create test-database
wrangler d1 create chat-test-database

# Set up basic test tables
wrangler d1 execute test-database --command="CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT);"

# Chat memory table is auto-created by the node, but you can verify:
wrangler d1 execute chat-test-database --command="SELECT name FROM sqlite_master WHERE type='table';"
```

### Production Environment

#### Self-Hosted n8n
1. **Install Package**: Use community nodes installation
2. **Configure Credentials**: Use production Cloudflare credentials
3. **Database Setup**: Ensure D1 databases are properly configured
4. **Monitoring**: Set up logging and error tracking

#### n8n Cloud
1. **Community Nodes**: Install via n8n Cloud interface
2. **Credential Security**: Use encrypted credential storage
3. **Rate Limits**: Consider Cloudflare API rate limits
4. **Backup Strategy**: Implement database backup procedures

## Docker Deployment

### Dockerfile Example
```dockerfile
FROM n8nio/n8n:latest

USER root
RUN npm install -g n8n-nodes-cloudflare-d1@0.2.0
USER node

# Custom environment variables
ENV N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom
ENV N8N_VERSION_NOTIFICATIONS_ENABLED=false
```

### Docker Compose
```yaml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom
    volumes:
      - n8n_data:/home/node/.n8n
      - ./custom:/home/node/.n8n/custom
    command: npm install -g n8n-nodes-cloudflare-d1@0.2.0 && n8n start

volumes:
  n8n_data:
```

## Kubernetes Deployment

### Helm Chart Values
```yaml
# values.yaml
n8n:
  customExtensions:
    - n8n-nodes-cloudflare-d1
  
  config:
    credentials:
      cloudflare:
        accountId: "your-account-id"
        apiToken: "your-api-token"
```

## Monitoring and Logging

### Performance Monitoring
- Query execution times
- API response times
- Error rates and types
- Resource usage metrics

### Logging Configuration
```javascript
// Enable debug logging for development
process.env.N8N_LOG_LEVEL = 'debug';
process.env.N8N_LOG_OUTPUT = 'console';
```

### Health Checks
```bash
# Test node availability (both nodes should appear)
curl -X POST http://localhost:5678/api/v1/nodes/available | grep cloudflare

# Test database connectivity
# Create a simple workflow with SELECT 1 query

# Test chat memory functionality
# Create an AI Agent workflow with chat memory node connected
```

### v0.2.0 Specific Monitoring
- **Chat Memory Performance**: Monitor session cleanup operations
- **Table Auto-Creation**: Check for successful table initialization
- **Message Storage**: Track message insertion and retrieval rates
- **Session Management**: Monitor session expiration and cleanup
- **Memory Usage**: Track chat history storage growth

## Security Considerations

### API Token Security
- Use tokens with minimal required permissions
- Regularly rotate API tokens
- Store tokens in secure credential management
- Monitor token usage and access logs

### Network Security
- Use HTTPS for all API communications
- Implement proper firewall rules
- Consider VPN access for sensitive environments
- Enable audit logging

### Database Security
- Use least privilege access
- Implement proper data access controls
- Regular security audits
- Backup and recovery procedures

## Troubleshooting

### Common Issues

#### Authentication Errors
```bash
# Verify token permissions
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/d1/database"
```

#### Node Not Appearing
1. Check package installation
2. Verify n8n restart
3. Check console for errors
4. Validate package.json configuration

#### Query Execution Failures
1. Verify database ID
2. Check SQL syntax
3. Validate permissions
4. Review API rate limits

### Debug Mode
```bash
# Start n8n with debug logging
N8N_LOG_LEVEL=debug n8n start
```

### Support Resources
- GitHub Issues: [Report bugs and feature requests](https://github.com/jezweb/n8n-nodes-cloudflare-d1/issues)
- n8n Community: [Get help from the community](https://community.n8n.io)
- Cloudflare Docs: [D1 documentation](https://developers.cloudflare.com/d1/)

## Performance Optimization

### Query Optimization
- Use indexes for frequently queried columns
- Implement query caching where appropriate
- Batch operations for bulk data processing
- Monitor query execution plans

### Resource Management
- Configure appropriate timeout values
- Implement connection pooling
- Monitor memory usage
- Set up proper error handling

## Backup and Recovery

### Database Backups
```bash
# Export D1 database
wrangler d1 export DATABASE_NAME --output backup.sql

# Import to new database
wrangler d1 execute NEW_DATABASE --file backup.sql
```

### Configuration Backups
- Export n8n workflows
- Backup credential configurations
- Document deployment procedures
- Test recovery procedures

This deployment guide ensures reliable installation and operation of the n8n Cloudflare D1 node across various environments.