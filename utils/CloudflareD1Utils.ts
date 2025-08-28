import { IExecuteFunctions, IDataObject, NodeOperationError, IHttpRequestMethods } from 'n8n-workflow';
import { 
	D1ConnectionConfig, 
	D1QueryOptions, 
	D1ApiResponse, 
	D1TableInfo, 
	D1ColumnInfo,
	D1TableSchema,
	D1ChatMessage,
	D1ChatMemoryConfig
} from '../types/CloudflareD1Types';

export class CloudflareD1Utils {
	/**
	 * Execute a query against the Cloudflare D1 API
	 */
	static async executeQuery(
		context: IExecuteFunctions,
		config: D1ConnectionConfig,
		sql: string,
		params: any[] = [],
		options: D1QueryOptions = {}
	): Promise<D1ApiResponse> {
		const baseUrl = `${config.apiEndpoint}/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;
		
		const requestBody: IDataObject = {
			sql,
			params,
		};

		if (options.sessionId) {
			requestBody.session = options.sessionId;
		}

		const httpOptions = {
			method: 'POST' as IHttpRequestMethods,
			headers: {
				'Authorization': `Bearer ${config.apiToken}`,
				'Content-Type': 'application/json',
			},
			body: requestBody,
			url: baseUrl,
			json: true,
			timeout: options.timeout || 30000,
		};

		try {
			const response = await context.helpers.httpRequest(httpOptions);
			
			if (!response.success) {
				const errorMessage = response.errors && response.errors.length > 0 
					? response.errors[0].message 
					: 'Unknown error occurred';
				throw new NodeOperationError(context.getNode(), `Cloudflare D1 API error: ${errorMessage}`);
			}

			return response;
		} catch (error) {
			if (error instanceof NodeOperationError) {
				throw error;
			}
			throw new NodeOperationError(context.getNode(), `Failed to execute D1 query: ${error.message}`);
		}
	}

	/**
	 * Execute multiple queries in a batch transaction
	 */
	static async executeBatch(
		context: IExecuteFunctions,
		config: D1ConnectionConfig,
		queries: Array<{ sql: string; params?: any[] }>,
		options: D1QueryOptions = {}
	): Promise<D1ApiResponse> {
		const baseUrl = `${config.apiEndpoint}/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;
		
		const requestBody: IDataObject = {
			queries: queries.map(q => ({
				sql: q.sql,
				params: q.params || [],
			})),
		};

		if (options.sessionId) {
			requestBody.session = options.sessionId;
		}

		const httpOptions = {
			method: 'POST' as IHttpRequestMethods,
			headers: {
				'Authorization': `Bearer ${config.apiToken}`,
				'Content-Type': 'application/json',
			},
			body: requestBody,
			url: baseUrl,
			json: true,
			timeout: options.timeout || 60000,
		};

		try {
			const response = await context.helpers.httpRequest(httpOptions);
			
			if (!response.success) {
				const errorMessage = response.errors && response.errors.length > 0 
					? response.errors[0].message 
					: 'Unknown error occurred';
				throw new NodeOperationError(context.getNode(), `Cloudflare D1 API error: ${errorMessage}`);
			}

			return response;
		} catch (error) {
			if (error instanceof NodeOperationError) {
				throw error;
			}
			throw new NodeOperationError(context.getNode(), `Failed to execute D1 batch: ${error.message}`);
		}
	}

	/**
	 * Get list of tables in the database
	 */
	static async getTables(
		context: IExecuteFunctions,
		config: D1ConnectionConfig
	): Promise<D1TableInfo[]> {
		const sql = `
			SELECT name, type 
			FROM sqlite_master 
			WHERE type IN ('table', 'view') 
			AND name NOT LIKE 'sqlite_%'
			ORDER BY name;
		`;

		try {
			const response = await this.executeQuery(context, config, sql);
			const result = response.result[0];
			
			if (!result.success) {
				throw new NodeOperationError(context.getNode(), `Failed to get tables: ${result.error}`);
			}

			return result.results.map((row: any) => ({
				name: row.name,
				type: row.type as 'table' | 'view',
			}));
		} catch (error) {
			throw new NodeOperationError(context.getNode(), `Failed to retrieve table list: ${error.message}`);
		}
	}

	/**
	 * Get column information for a specific table
	 */
	static async getTableSchema(
		context: IExecuteFunctions,
		config: D1ConnectionConfig,
		tableName: string
	): Promise<D1TableSchema> {
		const sql = `PRAGMA table_info('${tableName.replace(/'/g, "''")}');`;

		try {
			const response = await this.executeQuery(context, config, sql);
			const result = response.result[0];
			
			if (!result.success) {
				throw new NodeOperationError(context.getNode(), `Failed to get table schema: ${result.error}`);
			}

			const columns: D1ColumnInfo[] = result.results.map((row: any) => ({
				name: row.name,
				type: row.type,
				nullable: row.notnull === 0,
				defaultValue: row.dflt_value,
				primaryKey: row.pk === 1,
			}));

			return {
				tableName,
				columns,
			};
		} catch (error) {
			throw new NodeOperationError(context.getNode(), `Failed to retrieve table schema: ${error.message}`);
		}
	}

	/**
	 * Build INSERT query with proper parameter binding
	 */
	static buildInsertQuery(tableName: string, data: IDataObject): { sql: string; params: any[] } {
		const columns = Object.keys(data);
		const values = Object.values(data);
		
		const columnList = columns.map(col => `"${col}"`).join(', ');
		const placeholders = columns.map(() => '?').join(', ');
		
		const sql = `INSERT INTO "${tableName}" (${columnList}) VALUES (${placeholders})`;
		
		return { sql, params: values };
	}

	/**
	 * Build SELECT query with optional WHERE clause
	 */
	static buildSelectQuery(
		tableName: string,
		columns: string[] = ['*'],
		where?: IDataObject,
		orderBy?: string,
		limit?: number,
		offset?: number
	): { sql: string; params: any[] } {
		const columnList = columns.includes('*') ? '*' : columns.map(col => `"${col}"`).join(', ');
		let sql = `SELECT ${columnList} FROM "${tableName}"`;
		const params: any[] = [];

		if (where && Object.keys(where).length > 0) {
			const conditions = Object.keys(where).map(key => `"${key}" = ?`);
			sql += ` WHERE ${conditions.join(' AND ')}`;
			params.push(...Object.values(where));
		}

		if (orderBy) {
			sql += ` ORDER BY ${orderBy}`;
		}

		if (limit) {
			sql += ` LIMIT ?`;
			params.push(limit);
		}

		if (offset) {
			sql += ` OFFSET ?`;
			params.push(offset);
		}

		return { sql, params };
	}

	/**
	 * Build UPDATE query with WHERE clause
	 */
	static buildUpdateQuery(
		tableName: string,
		updateData: IDataObject,
		where?: IDataObject
	): { sql: string; params: any[] } {
		const updateColumns = Object.keys(updateData);
		const updateValues = Object.values(updateData);
		
		const setClause = updateColumns.map(col => `"${col}" = ?`).join(', ');
		let sql = `UPDATE "${tableName}" SET ${setClause}`;
		const params = [...updateValues];

		if (where && Object.keys(where).length > 0) {
			const conditions = Object.keys(where).map(key => `"${key}" = ?`);
			sql += ` WHERE ${conditions.join(' AND ')}`;
			params.push(...Object.values(where));
		}

		return { sql, params };
	}

	/**
	 * Build DELETE query with WHERE clause
	 */
	static buildDeleteQuery(
		tableName: string,
		where?: IDataObject,
		limit?: number
	): { sql: string; params: any[] } {
		let sql = `DELETE FROM "${tableName}"`;
		const params: any[] = [];

		if (where && Object.keys(where).length > 0) {
			const conditions = Object.keys(where).map(key => `"${key}" = ?`);
			sql += ` WHERE ${conditions.join(' AND ')}`;
			params.push(...Object.values(where));
		}

		if (limit) {
			sql += ` LIMIT ?`;
			params.push(limit);
		}

		return { sql, params };
	}

	/**
	 * Validate table name to prevent SQL injection
	 */
	static validateTableName(tableName: string): void {
		const validTableNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
		if (!validTableNameRegex.test(tableName)) {
			throw new Error(`Invalid table name: ${tableName}. Table names must start with a letter or underscore and contain only letters, numbers, and underscores.`);
		}
	}

	/**
	 * Validate column names to prevent SQL injection
	 */
	static validateColumnNames(columns: string[]): void {
		const validColumnNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
		for (const column of columns) {
			if (!validColumnNameRegex.test(column)) {
				throw new Error(`Invalid column name: ${column}. Column names must start with a letter or underscore and contain only letters, numbers, and underscores.`);
			}
		}
	}

	/**
	 * Parse JSON safely
	 */
	static parseJSON(jsonString: string, context: IExecuteFunctions, paramName: string): any {
		try {
			return JSON.parse(jsonString);
		} catch (error) {
			throw new NodeOperationError(context.getNode(), `Invalid JSON in ${paramName}: ${error.message}`);
		}
	}

	/**
	 * Get connection configuration from credentials
	 */
	static async getConnectionConfig(context: IExecuteFunctions): Promise<D1ConnectionConfig> {
		const credentials = await context.getCredentials('cloudflareD1Api');
		
		return {
			accountId: credentials.accountId as string,
			apiToken: credentials.apiToken as string,
			apiEndpoint: credentials.apiEndpoint as string,
			databaseId: '', // Will be set per operation
		};
	}

	// ===== Chat Memory Utility Methods =====

	/**
	 * Ensure chat memory table exists
	 */
	static async ensureChatMemoryTable(
		context: IExecuteFunctions,
		config: D1ConnectionConfig,
		tableName: string
	): Promise<void> {
		const createTableSQL = `
			CREATE TABLE IF NOT EXISTS "${tableName}" (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				session_id TEXT NOT NULL,
				message_type TEXT NOT NULL CHECK (message_type IN ('human', 'ai', 'system')),
				content TEXT NOT NULL,
				metadata JSON,
				timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP
			);
			CREATE INDEX IF NOT EXISTS idx_${tableName}_session_timestamp ON "${tableName}" (session_id, timestamp);
		`;

		await this.executeQuery(context, config, createTableSQL);
	}

	/**
	 * Store a chat message
	 */
	static async storeChatMessage(
		context: IExecuteFunctions,
		config: D1ConnectionConfig,
		memoryConfig: D1ChatMemoryConfig,
		message: D1ChatMessage
	): Promise<void> {
		const tableName = memoryConfig.tableName || 'chat_memory';
		
		const insertSQL = `
			INSERT INTO "${tableName}" (session_id, message_type, content, metadata, timestamp)
			VALUES (?, ?, ?, ?, ?)
		`;
		
		const timestamp = message.timestamp || new Date().toISOString();
		const metadata = message.metadata ? JSON.stringify(message.metadata) : null;
		
		const params = [
			memoryConfig.sessionId,
			message.type,
			message.content,
			metadata,
			timestamp,
		];

		await this.executeQuery(context, config, insertSQL, params);
	}

	/**
	 * Get chat messages for a session
	 */
	static async getChatMessages(
		context: IExecuteFunctions,
		config: D1ConnectionConfig,
		memoryConfig: D1ChatMemoryConfig
	): Promise<D1ChatMessage[]> {
		const tableName = memoryConfig.tableName || 'chat_memory';
		const limit = memoryConfig.maxMessages || 100;

		const selectSQL = `
			SELECT id, session_id, message_type, content, metadata, timestamp
			FROM "${tableName}"
			WHERE session_id = ?
			ORDER BY timestamp ASC
			LIMIT ?
		`;

		const params = [memoryConfig.sessionId, limit];

		try {
			const response = await this.executeQuery(context, config, selectSQL, params);
			const result = response.result[0];

			if (!result.success) {
				throw new Error(`Failed to get messages: ${result.error}`);
			}

			return result.results.map((row: any) => ({
				id: row.id,
				sessionId: row.session_id,
				type: row.message_type as 'human' | 'ai' | 'system',
				content: row.content,
				metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
				timestamp: row.timestamp,
			}));
		} catch (error) {
			console.error('Error getting chat messages:', error);
			return [];
		}
	}

	/**
	 * Get chat message count for a session
	 */
	static async getChatMessageCount(
		context: IExecuteFunctions,
		config: D1ConnectionConfig,
		memoryConfig: D1ChatMemoryConfig
	): Promise<number> {
		const tableName = memoryConfig.tableName || 'chat_memory';

		const countSQL = `
			SELECT COUNT(*) as count
			FROM "${tableName}"
			WHERE session_id = ?
		`;

		const params = [memoryConfig.sessionId];

		try {
			const response = await this.executeQuery(context, config, countSQL, params);
			const result = response.result[0];

			if (!result.success || !result.results.length) {
				return 0;
			}

			return result.results[0].count as number;
		} catch (error) {
			console.error('Error getting message count:', error);
			return 0;
		}
	}

	/**
	 * Clear all messages for a session
	 */
	static async clearChatSession(
		context: IExecuteFunctions,
		config: D1ConnectionConfig,
		memoryConfig: D1ChatMemoryConfig
	): Promise<void> {
		const tableName = memoryConfig.tableName || 'chat_memory';

		const deleteSQL = `DELETE FROM "${tableName}" WHERE session_id = ?`;
		const params = [memoryConfig.sessionId];

		await this.executeQuery(context, config, deleteSQL, params);
	}

	/**
	 * Clean up old messages based on max count and expiration
	 */
	static async cleanupChatMessages(
		context: IExecuteFunctions,
		config: D1ConnectionConfig,
		memoryConfig: D1ChatMemoryConfig
	): Promise<void> {
		const tableName = memoryConfig.tableName || 'chat_memory';
		const maxMessages = memoryConfig.maxMessages || 100;
		const expirationDays = memoryConfig.expirationDays || 30;

		// Remove messages older than expiration date
		const expiredCleanupSQL = `
			DELETE FROM "${tableName}"
			WHERE session_id = ?
			AND timestamp < datetime('now', '-${expirationDays} days')
		`;

		// Remove excess messages (keep only the most recent ones)
		const excessCleanupSQL = `
			DELETE FROM "${tableName}"
			WHERE session_id = ?
			AND id NOT IN (
				SELECT id FROM "${tableName}"
				WHERE session_id = ?
				ORDER BY timestamp DESC
				LIMIT ?
			)
		`;

		try {
			// Run both cleanup operations
			await this.executeBatch(context, config, [
				{ sql: expiredCleanupSQL, params: [memoryConfig.sessionId] },
				{ sql: excessCleanupSQL, params: [memoryConfig.sessionId, memoryConfig.sessionId, maxMessages] },
			]);
		} catch (error) {
			// Don't throw error for cleanup failures, just log
			console.warn(`Chat memory cleanup warning: ${error.message}`);
		}
	}
}