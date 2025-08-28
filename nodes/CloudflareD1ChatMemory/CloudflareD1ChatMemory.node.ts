import { IExecuteFunctions } from 'n8n-workflow';
import {
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	NodeOperationError,
} from 'n8n-workflow';
import { CloudflareD1Utils } from '../../utils/CloudflareD1Utils';
import { D1ChatMessage, D1ChatMemoryConfig } from '../../types/CloudflareD1Types';

export class CloudflareD1ChatMemory implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cloudflare D1 Chat Memory',
		name: 'cloudflareD1ChatMemory',
		icon: 'file:cloudflared1-chat.svg',
		group: ['memory'],
		version: 1,
		description: 'Store and retrieve chat conversation history in Cloudflare D1 databases. Compatible with n8n AI Agent workflows and LangChain memory patterns.',
		defaults: {
			name: 'Cloudflare D1 Chat Memory',
		},
		// This is a memory sub-node - it doesn't process workflow items directly
		inputs: [],
		outputs: [],
		credentials: [
			{
				name: 'cloudflareD1Api',
				required: true,
			},
		],
		// This node is designed to be used as a memory connector for AI agents
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Memory'],
			},
		},
		properties: [
			{
				displayName: 'Database ID',
				name: 'databaseId',
				type: 'string',
				default: '',
				required: true,
				description: 'The unique identifier of your Cloudflare D1 database where chat messages will be stored.',
			},
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				default: '={{ $json.sessionId }}',
				required: true,
				description: 'Unique identifier for the chat session. Messages with the same session ID will be grouped together. Supports expressions to use dynamic session IDs.',
				placeholder: 'chat-session-123',
			},
			{
				displayName: 'Table Name',
				name: 'tableName',
				type: 'string',
				default: 'chat_memory',
				description: 'Name of the table where chat messages will be stored. The table will be created automatically if it doesn\'t exist.',
			},
			{
				displayName: 'Max Messages',
				name: 'maxMessages',
				type: 'number',
				default: 100,
				typeOptions: {
					minValue: 1,
					maxValue: 1000,
				},
				description: 'Maximum number of messages to keep in memory for each session. Older messages will be automatically removed.',
			},
			{
				displayName: 'Message Expiration (Days)',
				name: 'expirationDays',
				type: 'number',
				default: 30,
				typeOptions: {
					minValue: 1,
					maxValue: 365,
				},
				description: 'Number of days after which messages will be automatically deleted to manage storage.',
			},
			{
				displayName: 'Auto Initialize Table',
				name: 'autoInitialize',
				type: 'boolean',
				default: true,
				description: 'Whether to automatically create the chat memory table if it doesn\'t exist.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// This node doesn't process workflow items directly
		// It's designed to be used as a memory connector
		throw new NodeOperationError(
			this.getNode(),
			'CloudflareD1ChatMemory is a memory sub-node and should not be executed directly. Connect it to an AI Agent node as a memory source.'
		);
	}

	/**
	 * Initialize the chat memory table
	 */
	async initializeTable(context: IExecuteFunctions, config: D1ChatMemoryConfig): Promise<void> {
		const tableName = config.tableName || 'chat_memory';
		
		const createTableSQL = `
			CREATE TABLE IF NOT EXISTS "${tableName}" (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				session_id TEXT NOT NULL,
				message_type TEXT NOT NULL CHECK (message_type IN ('human', 'ai', 'system')),
				message TEXT NOT NULL,
				metadata JSON,
				timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				INDEX idx_session_timestamp (session_id, timestamp)
			);
		`;

		const d1Config = await CloudflareD1Utils.getConnectionConfig(context);
		d1Config.databaseId = config.databaseId;

		try {
			await CloudflareD1Utils.executeQuery(context, d1Config, createTableSQL);
		} catch (error) {
			throw new NodeOperationError(
				context.getNode(),
				`Failed to initialize chat memory table: ${error.message}`
			);
		}
	}

	/**
	 * Add a message to the chat memory
	 */
	async addMessage(
		context: IExecuteFunctions,
		config: D1ChatMemoryConfig,
		message: D1ChatMessage
	): Promise<void> {
		const tableName = config.tableName || 'chat_memory';
		
		// First, ensure table exists if auto-initialize is enabled
		const autoInitialize = context.getNodeParameter('autoInitialize', 0, true) as boolean;
		if (autoInitialize) {
			await this.initializeTable(context, config);
		}

		// Insert the new message
		const insertSQL = `
			INSERT INTO "${tableName}" (session_id, message_type, message, metadata, timestamp)
			VALUES (?, ?, ?, ?, ?)
		`;
		
		const timestamp = message.timestamp || new Date().toISOString();
		const metadata = message.metadata ? JSON.stringify(message.metadata) : null;
		
		const params = [
			message.session_id,
			message.message_type,
			message.message,
			metadata,
			timestamp,
		];

		const d1Config = await CloudflareD1Utils.getConnectionConfig(context);
		d1Config.databaseId = config.databaseId;

		try {
			await CloudflareD1Utils.executeQuery(context, d1Config, insertSQL, params);
		} catch (error) {
			throw new NodeOperationError(
				context.getNode(),
				`Failed to add message to chat memory: ${error.message}`
			);
		}

		// Cleanup old messages if necessary
		await this.cleanupMessages(context, config);
	}

	/**
	 * Get messages from chat memory
	 */
	async getMessages(
		context: IExecuteFunctions,
		config: D1ChatMemoryConfig,
		limit?: number
	): Promise<D1ChatMessage[]> {
		const tableName = config.tableName || 'chat_memory';
		const messageLimit = limit || config.maxMessages || 100;

		const selectSQL = `
			SELECT id, session_id, message_type, message, metadata, timestamp
			FROM "${tableName}"
			WHERE session_id = ?
			ORDER BY timestamp ASC
			LIMIT ?
		`;

		const params = [config.sessionId, messageLimit];

		const d1Config = await CloudflareD1Utils.getConnectionConfig(context);
		d1Config.databaseId = config.databaseId;

		try {
			const response = await CloudflareD1Utils.executeQuery(context, d1Config, selectSQL, params);
			const result = response.result[0];

			if (!result.success) {
				throw new NodeOperationError(
					context.getNode(),
					`Failed to get messages: ${result.error}`
				);
			}

			return result.results.map((row: any) => ({
				id: row.id,
				session_id: row.session_id,
				message_type: row.message_type as 'human' | 'ai' | 'system',
				message: row.message,
				metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
				timestamp: row.timestamp,
			}));
		} catch (error) {
			throw new NodeOperationError(
				context.getNode(),
				`Failed to retrieve messages from chat memory: ${error.message}`
			);
		}
	}

	/**
	 * Clear all messages for a session
	 */
	async clearSession(context: IExecuteFunctions, config: D1ChatMemoryConfig): Promise<void> {
		const tableName = config.tableName || 'chat_memory';

		const deleteSQL = `DELETE FROM "${tableName}" WHERE session_id = ?`;
		const params = [config.sessionId];

		const d1Config = await CloudflareD1Utils.getConnectionConfig(context);
		d1Config.databaseId = config.databaseId;

		try {
			await CloudflareD1Utils.executeQuery(context, d1Config, deleteSQL, params);
		} catch (error) {
			throw new NodeOperationError(
				context.getNode(),
				`Failed to clear chat memory session: ${error.message}`
			);
		}
	}

	/**
	 * Get recent messages (useful for context window)
	 */
	async getRecentMessages(
		context: IExecuteFunctions,
		config: D1ChatMemoryConfig,
		limit: number = 10
	): Promise<D1ChatMessage[]> {
		const tableName = config.tableName || 'chat_memory';

		const selectSQL = `
			SELECT id, session_id, message_type, message, metadata, timestamp
			FROM "${tableName}"
			WHERE session_id = ?
			ORDER BY timestamp DESC
			LIMIT ?
		`;

		const params = [config.sessionId, limit];

		const d1Config = await CloudflareD1Utils.getConnectionConfig(context);
		d1Config.databaseId = config.databaseId;

		try {
			const response = await CloudflareD1Utils.executeQuery(context, d1Config, selectSQL, params);
			const result = response.result[0];

			if (!result.success) {
				throw new NodeOperationError(
					context.getNode(),
					`Failed to get recent messages: ${result.error}`
				);
			}

			// Reverse to get chronological order
			return result.results.reverse().map((row: any) => ({
				id: row.id,
				session_id: row.session_id,
				message_type: row.message_type as 'human' | 'ai' | 'system',
				message: row.message,
				metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
				timestamp: row.timestamp,
			}));
		} catch (error) {
			throw new NodeOperationError(
				context.getNode(),
				`Failed to retrieve recent messages: ${error.message}`
			);
		}
	}

	/**
	 * Cleanup old messages based on max count and expiration
	 */
	private async cleanupMessages(
		context: IExecuteFunctions,
		config: D1ChatMemoryConfig
	): Promise<void> {
		const tableName = config.tableName || 'chat_memory';
		const maxMessages = config.maxMessages || 100;
		const expirationDays = config.expirationDays || 30;

		const d1Config = await CloudflareD1Utils.getConnectionConfig(context);
		d1Config.databaseId = config.databaseId;

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
			await CloudflareD1Utils.executeBatch(context, d1Config, [
				{ sql: expiredCleanupSQL, params: [config.sessionId] },
				{ sql: excessCleanupSQL, params: [config.sessionId, config.sessionId, maxMessages] },
			]);
		} catch (error) {
			// Don't throw error for cleanup failures, just log
			console.warn(`Chat memory cleanup warning: ${error.message}`);
		}
	}

	/**
	 * Get memory configuration from node parameters
	 */
	static getMemoryConfig(context: IExecuteFunctions, itemIndex: number = 0): D1ChatMemoryConfig {
		return {
			databaseId: context.getNodeParameter('databaseId', itemIndex) as string,
			sessionId: context.getNodeParameter('sessionId', itemIndex) as string,
			tableName: context.getNodeParameter('tableName', itemIndex, 'chat_memory') as string,
			maxMessages: context.getNodeParameter('maxMessages', itemIndex, 100) as number,
			expirationDays: context.getNodeParameter('expirationDays', itemIndex, 30) as number,
		};
	}
}