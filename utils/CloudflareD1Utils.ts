import { IExecuteFunctions, IDataObject, NodeOperationError, IHttpRequestMethods } from 'n8n-workflow';
import { 
	D1ConnectionConfig, 
	D1QueryOptions, 
	D1ApiResponse, 
	D1TableInfo, 
	D1ColumnInfo,
	D1TableSchema,
	D1ChatMessage,
	D1ChatMemoryConfig,
	D1TableColumn,
	D1CreateTableOptions,
	D1QueryBuilder,
	D1WhereCondition,
	D1AggregateQuery,
	D1DatabaseInfo,
	D1ExportResult,
	D1ImportResult
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

	// ===== Table Management Utility Methods =====

	/**
	 * Build CREATE TABLE SQL statement
	 */
	static buildCreateTableSQL(
		tableName: string,
		columns: D1TableColumn[],
		options: D1CreateTableOptions = {}
	): string {
		this.validateTableName(tableName);
		
		const columnDefinitions: string[] = [];
		const primaryKeys: string[] = [];
		
		for (const column of columns) {
			let def = `"${column.name}" ${column.type}`;
			
			if (column.primaryKey) {
				primaryKeys.push(`"${column.name}"`);
				if (column.autoIncrement && column.type === 'INTEGER') {
					def = `"${column.name}" INTEGER PRIMARY KEY AUTOINCREMENT`;
				}
			}
			
			if (column.notNull && !column.primaryKey) {
				def += ' NOT NULL';
			}
			
			if (column.unique && !column.primaryKey) {
				def += ' UNIQUE';
			}
			
			if (column.defaultValue !== undefined) {
				if (typeof column.defaultValue === 'string') {
					def += ` DEFAULT '${column.defaultValue.replace(/'/g, "''")}'`;
				} else if (column.defaultValue === null) {
					def += ' DEFAULT NULL';
				} else {
					def += ` DEFAULT ${column.defaultValue}`;
				}
			}
			
			columnDefinitions.push(def);
		}
		
		// Add composite primary key if multiple columns are marked as primary
		if (primaryKeys.length > 1) {
			columnDefinitions.push(`PRIMARY KEY (${primaryKeys.join(', ')})`);
		}
		
		let sql = 'CREATE TABLE ';
		if (options.ifNotExists) {
			sql += 'IF NOT EXISTS ';
		}
		
		sql += `"${tableName}" (${columnDefinitions.join(', ')})`;
		
		if (options.withoutRowId) {
			sql += ' WITHOUT ROWID';
		}
		
		if (options.strict) {
			sql += ' STRICT';
		}
		
		return sql;
	}

	/**
	 * Build SQL from query builder object
	 */
	static buildQueryFromBuilder(builder: D1QueryBuilder): { sql: string; params: any[] } {
		const params: any[] = [];
		
		// SELECT clause
		const columns = builder.columns && builder.columns.length > 0 
			? builder.columns.map(col => `"${col}"`).join(', ')
			: '*';
		
		let sql = `SELECT ${columns} FROM "${builder.table}"`;
		
		// JOIN clauses
		if (builder.joins && builder.joins.length > 0) {
			for (const join of builder.joins) {
				sql += ` ${join.type} JOIN "${join.table}" ON ${join.on}`;
			}
		}
		
		// WHERE clause
		if (builder.where && builder.where.length > 0) {
			const conditions = this.buildWhereClause(builder.where, params, builder.whereLogic || 'AND');
			if (conditions) {
				sql += ` WHERE ${conditions}`;
			}
		}
		
		// GROUP BY clause
		if (builder.groupBy && builder.groupBy.length > 0) {
			sql += ` GROUP BY ${builder.groupBy.map(col => `"${col}"`).join(', ')}`;
		}
		
		// HAVING clause
		if (builder.having && builder.having.length > 0) {
			const conditions = this.buildWhereClause(builder.having, params, 'AND');
			if (conditions) {
				sql += ` HAVING ${conditions}`;
			}
		}
		
		// ORDER BY clause
		if (builder.orderBy && builder.orderBy.length > 0) {
			const orderClauses = builder.orderBy.map(o => `"${o.field}" ${o.direction}`);
			sql += ` ORDER BY ${orderClauses.join(', ')}`;
		}
		
		// LIMIT and OFFSET
		if (builder.limit !== undefined) {
			sql += ` LIMIT ?`;
			params.push(builder.limit);
		}
		
		if (builder.offset !== undefined) {
			sql += ` OFFSET ?`;
			params.push(builder.offset);
		}
		
		return { sql, params };
	}

	/**
	 * Build WHERE clause from conditions
	 */
	static buildWhereClause(conditions: D1WhereCondition[], params: any[], logic: 'AND' | 'OR' = 'AND'): string {
		const clauses: string[] = [];
		
		for (const condition of conditions) {
			let clause = `"${condition.field}"`;
			
			switch (condition.operator) {
				case 'IS NULL':
					clause += ' IS NULL';
					break;
				case 'IS NOT NULL':
					clause += ' IS NOT NULL';
					break;
				case 'IN':
				case 'NOT IN':
					if (Array.isArray(condition.value)) {
						const placeholders = condition.value.map(() => '?').join(', ');
						clause += ` ${condition.operator} (${placeholders})`;
						params.push(...condition.value);
					}
					break;
				case 'BETWEEN':
					clause += ' BETWEEN ? AND ?';
					params.push(condition.value, condition.value2);
					break;
				default:
					clause += ` ${condition.operator} ?`;
					params.push(condition.value);
			}
			
			clauses.push(clause);
		}
		
		return clauses.join(` ${logic} `);
	}

	/**
	 * Build aggregate query SQL
	 */
	static buildAggregateQuery(query: D1AggregateQuery): { sql: string; params: any[] } {
		const params: any[] = [];
		
		let sql = 'SELECT ';
		
		// Build aggregate function
		if (query.function === 'COUNT' && !query.column) {
			sql += 'COUNT(*)';
		} else {
			sql += `${query.function}("${query.column}")`;
		}
		
		// Add GROUP BY columns to SELECT
		if (query.groupBy && query.groupBy.length > 0) {
			sql = `SELECT ${query.groupBy.map(col => `"${col}"`).join(', ')}, ${query.function}(`;
			sql += query.column ? `"${query.column}")` : '*)';
		}
		
		sql += ` FROM "${query.table}"`;
		
		// WHERE clause
		if (query.where && query.where.length > 0) {
			const conditions = this.buildWhereClause(query.where, params);
			if (conditions) {
				sql += ` WHERE ${conditions}`;
			}
		}
		
		// GROUP BY clause
		if (query.groupBy && query.groupBy.length > 0) {
			sql += ` GROUP BY ${query.groupBy.map(col => `"${col}"`).join(', ')}`;
		}
		
		// HAVING clause
		if (query.having && query.having.length > 0) {
			const conditions = this.buildWhereClause(query.having, params);
			if (conditions) {
				sql += ` HAVING ${conditions}`;
			}
		}
		
		// ORDER BY clause
		if (query.orderBy && query.orderBy.length > 0) {
			const orderClauses = query.orderBy.map(o => `"${o.field}" ${o.direction}`);
			sql += ` ORDER BY ${orderClauses.join(', ')}`;
		}
		
		return { sql, params };
	}

	/**
	 * Get table statistics
	 */
	static async getTableStatistics(
		context: IExecuteFunctions,
		config: D1ConnectionConfig,
		tableName: string
	): Promise<IDataObject> {
		const queries = [
			{ sql: `SELECT COUNT(*) as row_count FROM "${tableName}"`, params: [] },
			{ sql: `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`, params: [tableName] },
			{ sql: `SELECT name FROM sqlite_master WHERE type='index' AND tbl_name=?`, params: [tableName] },
		];
		
		const response = await this.executeBatch(context, config, queries);
		
		const stats: IDataObject = {
			tableName,
			rowCount: 0,
			indexes: [],
			createStatement: '',
		};
		
		if (response.result[0]?.success && response.result[0]?.results?.length > 0) {
			stats.rowCount = response.result[0].results[0].row_count;
		}
		
		if (response.result[1]?.success && response.result[1]?.results?.length > 0) {
			stats.createStatement = response.result[1].results[0].sql;
		}
		
		if (response.result[2]?.success && response.result[2]?.results?.length > 0) {
			stats.indexes = response.result[2].results.map((row: any) => row.name);
		}
		
		return stats;
	}

	/**
	 * Export database to SQL file
	 */
	static async exportDatabase(
		context: IExecuteFunctions,
		config: D1ConnectionConfig
	): Promise<D1ExportResult> {
		const url = `${config.apiEndpoint}/accounts/${config.accountId}/d1/database/${config.databaseId}/export`;
		
		const httpOptions = {
			method: 'POST' as IHttpRequestMethods,
			headers: {
				'Authorization': `Bearer ${config.apiToken}`,
				'Content-Type': 'application/json',
			},
			body: {},
			url,
			json: true,
		};
		
		try {
			const response = await context.helpers.httpRequest(httpOptions);
			
			if (response.success && response.result) {
				return {
					success: true,
					signed_url: response.result.signed_url,
					filename: response.result.filename,
				};
			} else {
				return {
					success: false,
					error: response.errors?.[0]?.message || 'Export failed',
					messages: response.messages,
				};
			}
		} catch (error) {
			throw new NodeOperationError(context.getNode(), `Failed to export database: ${error.message}`);
		}
	}

	/**
	 * Import SQL file to database
	 */
	static async importDatabase(
		context: IExecuteFunctions,
		config: D1ConnectionConfig,
		sqlContent: string
	): Promise<D1ImportResult> {
		const url = `${config.apiEndpoint}/accounts/${config.accountId}/d1/database/${config.databaseId}/import`;
		
		const httpOptions = {
			method: 'POST' as IHttpRequestMethods,
			headers: {
				'Authorization': `Bearer ${config.apiToken}`,
				'Content-Type': 'application/sql',
			},
			body: sqlContent,
			url,
			json: false, // SQL content as plain text
		};
		
		try {
			const response = await context.helpers.httpRequest(httpOptions);
			const jsonResponse = typeof response === 'string' ? JSON.parse(response) : response;
			
			if (jsonResponse.success && jsonResponse.result) {
				return {
					success: true,
					filename: jsonResponse.result.filename,
					num_queries: jsonResponse.result.num_queries,
				};
			} else {
				return {
					success: false,
					error: jsonResponse.errors?.[0]?.message || 'Import failed',
					messages: jsonResponse.messages,
				};
			}
		} catch (error) {
			throw new NodeOperationError(context.getNode(), `Failed to import database: ${error.message}`);
		}
	}

	/**
	 * Get database information
	 */
	static async getDatabaseInfo(
		context: IExecuteFunctions,
		config: D1ConnectionConfig
	): Promise<D1DatabaseInfo> {
		const url = `${config.apiEndpoint}/accounts/${config.accountId}/d1/database/${config.databaseId}`;
		
		const httpOptions = {
			method: 'GET' as IHttpRequestMethods,
			headers: {
				'Authorization': `Bearer ${config.apiToken}`,
			},
			url,
			json: true,
		};
		
		try {
			const response = await context.helpers.httpRequest(httpOptions);
			
			if (response.success && response.result) {
				return {
					uuid: response.result.uuid,
					name: response.result.name,
					version: response.result.version,
					num_tables: response.result.num_tables,
					file_size: response.result.file_size,
					created_at: response.result.created_at,
				};
			} else {
				throw new Error(response.errors?.[0]?.message || 'Failed to get database info');
			}
		} catch (error) {
			throw new NodeOperationError(context.getNode(), `Failed to get database info: ${error.message}`);
		}
	}

	/**
	 * List all D1 databases in account
	 */
	static async listDatabases(
		context: IExecuteFunctions,
		config: D1ConnectionConfig
	): Promise<D1DatabaseInfo[]> {
		const url = `${config.apiEndpoint}/accounts/${config.accountId}/d1/database`;
		
		const httpOptions = {
			method: 'GET' as IHttpRequestMethods,
			headers: {
				'Authorization': `Bearer ${config.apiToken}`,
			},
			url,
			json: true,
		};
		
		try {
			const response = await context.helpers.httpRequest(httpOptions);
			
			if (response.success && response.result) {
				return response.result.map((db: any) => ({
					uuid: db.uuid,
					name: db.name,
					version: db.version,
					created_at: db.created_at,
				}));
			} else {
				throw new Error(response.errors?.[0]?.message || 'Failed to list databases');
			}
		} catch (error) {
			throw new NodeOperationError(context.getNode(), `Failed to list databases: ${error.message}`);
		}
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