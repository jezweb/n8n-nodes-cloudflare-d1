import { IDataObject } from 'n8n-workflow';

// Core operation types
export type D1Operation = 
	| 'insert' 
	| 'select' 
	| 'update' 
	| 'delete' 
	| 'executeQuery' 
	| 'batchQueries' 
	| 'executeRawSql'
	// Table management operations
	| 'createTable'
	| 'listTables'
	| 'getTableSchema'
	| 'dropTable'
	| 'alterTable'
	// Query builder operations
	| 'queryBuilder'
	| 'aggregateQuery'
	| 'searchRecords'
	| 'getDistinctValues'
	| 'tableStatistics'
	// Database management operations
	| 'exportDatabase'
	| 'importDatabase'
	| 'getDatabaseInfo'
	| 'listDatabases';

export type D1Resource = 'table' | 'query' | 'builder' | 'database';

// Table introspection types
export interface D1TableInfo {
	name: string;
	type: 'table' | 'view' | 'index';
	schema?: string;
}

export interface D1ColumnInfo {
	name: string;
	type: string;
	nullable: boolean;
	defaultValue?: string | null;
	primaryKey: boolean;
}

export interface D1TableSchema {
	tableName: string;
	columns: D1ColumnInfo[];
}

// Operation parameter types
export interface D1InsertParameters {
	table: string;
	columns?: string[];
	columnValues?: IDataObject;
	additionalFields?: IDataObject;
}

export interface D1SelectParameters {
	table: string;
	columns?: string[];
	where?: IDataObject;
	orderBy?: string;
	limit?: number;
	offset?: number;
}

export interface D1UpdateParameters {
	table: string;
	updateFields: IDataObject;
	where?: IDataObject;
}

export interface D1DeleteParameters {
	table: string;
	where?: IDataObject;
	limit?: number;
}

// API response types
export interface D1ApiResponse {
	success: boolean;
	result: D1QueryResult[];
	errors?: Array<{
		message: string;
		code?: number;
	}>;
	messages?: string[];
}

export interface D1QueryResult {
	success: boolean;
	results: IDataObject[];
	meta: {
		duration?: number;
		rows_read?: number;
		rows_written?: number;
		last_row_id?: number;
		changes?: number;
	};
	error?: string;
}

// Chat memory types for sub-node
export interface D1ChatMessage {
	id?: number;
	sessionId?: string;
	session_id?: string; // Keep for backward compatibility
	type: 'human' | 'ai' | 'system';
	message_type?: 'human' | 'ai' | 'system'; // Keep for backward compatibility  
	content: string;
	message?: string; // Keep for backward compatibility
	metadata?: IDataObject;
	timestamp?: string;
}

export interface D1ChatMemoryConfig {
	databaseId: string;
	sessionId: string;
	tableName?: string;
	maxMessages?: number;
	expirationDays?: number;
}

// Utility types
export interface D1ConnectionConfig {
	accountId: string;
	apiToken: string;
	apiEndpoint: string;
	databaseId: string;
}

export interface D1QueryOptions {
	timeout?: number;
	retries?: number;
	sessionId?: string;
}

// Error types
export interface D1Error {
	message: string;
	code?: string | number;
	details?: IDataObject;
}

// Table management types
export type D1ColumnType = 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' | 'BOOLEAN' | 'DATETIME' | 'JSON';

export interface D1TableColumn {
	name: string;
	type: D1ColumnType;
	primaryKey?: boolean;
	notNull?: boolean;
	unique?: boolean;
	defaultValue?: string | number | boolean | null;
	autoIncrement?: boolean;
}

export interface D1CreateTableOptions {
	ifNotExists?: boolean;
	withoutRowId?: boolean;
	strict?: boolean;
}

// Query builder types
export type D1WhereOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'NOT LIKE' | 'IN' | 'NOT IN' | 'IS NULL' | 'IS NOT NULL' | 'BETWEEN';
export type D1JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL OUTER' | 'CROSS';
export type D1AggregateFunction = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'GROUP_CONCAT';

export interface D1WhereCondition {
	field: string;
	operator: D1WhereOperator;
	value?: any;
	value2?: any; // For BETWEEN operator
}

export interface D1JoinClause {
	type: D1JoinType;
	table: string;
	on: string; // Join condition as string, e.g., "t1.id = t2.user_id"
}

export interface D1QueryBuilder {
	table: string;
	columns?: string[];
	where?: D1WhereCondition[];
	whereLogic?: 'AND' | 'OR';
	joins?: D1JoinClause[];
	groupBy?: string[];
	having?: D1WhereCondition[];
	orderBy?: Array<{
		field: string;
		direction: 'ASC' | 'DESC';
	}>;
	limit?: number;
	offset?: number;
}

export interface D1AggregateQuery {
	table: string;
	function: D1AggregateFunction;
	column?: string; // Optional for COUNT(*)
	where?: D1WhereCondition[];
	groupBy?: string[];
	having?: D1WhereCondition[];
	orderBy?: Array<{
		field: string;
		direction: 'ASC' | 'DESC';
	}>;
}

// Database management types
export interface D1DatabaseInfo {
	uuid: string;
	name: string;
	version?: string;
	num_tables?: number;
	file_size?: number;
	created_at?: string;
}

export interface D1ExportResult {
	success: boolean;
	signed_url?: string;
	filename?: string;
	error?: string;
	messages?: string[];
}

export interface D1ImportResult {
	success: boolean;
	filename?: string;
	num_queries?: number;
	error?: string;
	messages?: string[];
}

// Alter table types
export type D1AlterOperation = 'ADD_COLUMN' | 'DROP_COLUMN' | 'RENAME_COLUMN' | 'RENAME_TABLE' | 'ADD_INDEX' | 'DROP_INDEX';

export interface D1AlterTableOperation {
	operation: D1AlterOperation;
	column?: D1TableColumn;
	oldName?: string;
	newName?: string;
	indexName?: string;
	indexColumns?: string[];
}