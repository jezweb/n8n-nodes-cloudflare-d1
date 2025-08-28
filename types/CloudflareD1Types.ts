import { IDataObject } from 'n8n-workflow';

// Core operation types
export type D1Operation = 
	| 'insert' 
	| 'select' 
	| 'update' 
	| 'delete' 
	| 'executeQuery' 
	| 'batchQueries' 
	| 'executeRawSql';

export type D1Resource = 'table' | 'query';

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
	session_id: string;
	message_type: 'human' | 'ai' | 'system';
	message: string;
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