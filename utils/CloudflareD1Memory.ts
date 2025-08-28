import { IExecuteFunctions } from 'n8n-workflow';
import { CloudflareD1Utils } from './CloudflareD1Utils';
import { D1ChatMessage, D1ChatMemoryConfig, D1ConnectionConfig } from '../types/CloudflareD1Types';

// LangChain types (will be available at runtime as peer dependency)
export interface InputValues {
	[key: string]: any;
}

export interface MemoryVariables {
	[key: string]: any;
}

export interface OutputValues {
	[key: string]: any;
}

// BaseMemory interface that matches LangChain's BaseMemory
export interface BaseMemory {
	memoryKeys: string[];
	loadMemoryVariables(values: InputValues): Promise<MemoryVariables>;
	saveContext(inputValues: InputValues, outputValues: OutputValues): Promise<void>;
	clear(): Promise<void>;
}

export interface CloudflareD1MemoryInput {
	databaseId: string;
	sessionId: string;
	tableName?: string;
	maxMessages?: number;
	expirationDays?: number;
	memoryKey?: string;
	returnMessages?: boolean;
	inputKey?: string;
	outputKey?: string;
}

export class CloudflareD1Memory implements BaseMemory {
	private config?: D1ConnectionConfig;
	private memoryConfig: D1ChatMemoryConfig;
	private context: IExecuteFunctions;
	private memoryKey: string;
	private returnMessages: boolean;
	private inputKey?: string;
	private outputKey?: string;

	constructor(context: IExecuteFunctions, fields: CloudflareD1MemoryInput) {
		this.context = context;
		this.memoryKey = fields.memoryKey ?? 'history';
		this.returnMessages = fields.returnMessages ?? false;
		this.inputKey = fields.inputKey;
		this.outputKey = fields.outputKey;

		this.memoryConfig = {
			databaseId: fields.databaseId,
			sessionId: fields.sessionId,
			tableName: fields.tableName || 'chat_memory',
			maxMessages: fields.maxMessages || 100,
			expirationDays: fields.expirationDays || 30,
		};
	}

	async initialize(): Promise<void> {
		try {
			this.config = await CloudflareD1Utils.getConnectionConfig(this.context);
			this.config.databaseId = this.memoryConfig.databaseId;

			// Ensure chat memory table exists
			await CloudflareD1Utils.ensureChatMemoryTable(
				this.context,
				this.config!,
				this.memoryConfig.tableName || 'chat_memory'
			);
		} catch (error) {
			throw new Error(`Failed to initialize Cloudflare D1 memory: ${error.message}`);
		}
	}

	get memoryKeys(): string[] {
		return [this.memoryKey];
	}

	async loadMemoryVariables(values: InputValues): Promise<MemoryVariables> {
		if (!this.config) {
			await this.initialize();
		}

		try {
			const messages = await CloudflareD1Utils.getChatMessages(
				this.context,
				this.config!,
				this.memoryConfig
			);

			if (this.returnMessages) {
				// Return as LangChain message objects
				const langchainMessages = messages.map((msg: D1ChatMessage) => {
					const messageType = msg.type === 'human' ? 'HumanMessage' : 
									   msg.type === 'ai' ? 'AIMessage' : 'SystemMessage';
					return {
						_getType: () => messageType.toLowerCase(),
						content: msg.content,
						additional_kwargs: msg.metadata || {},
					};
				});

				return { [this.memoryKey]: langchainMessages };
			} else {
				// Return as formatted string
				const formattedHistory = messages
					.map((msg: D1ChatMessage) => {
						const role = msg.type === 'human' ? 'Human' : 
									 msg.type === 'ai' ? 'AI' : 'System';
						return `${role}: ${msg.content}`;
					})
					.join('\n');

				return { [this.memoryKey]: formattedHistory };
			}
		} catch (error) {
			console.error('Error loading memory variables:', error);
			return { [this.memoryKey]: this.returnMessages ? [] : '' };
		}
	}

	async saveContext(inputValues: InputValues, outputValues: OutputValues): Promise<void> {
		if (!this.config) {
			await this.initialize();
		}

		try {
			const input = this.getInputValue(inputValues, this.inputKey);
			const output = this.getOutputValue(outputValues, this.outputKey);

			if (input) {
				const humanMessage: D1ChatMessage = {
					type: 'human',
					content: input,
					timestamp: new Date().toISOString(),
					metadata: { source: 'user_input' },
				};

				await CloudflareD1Utils.storeChatMessage(
					this.context,
					this.config!,
					this.memoryConfig,
					humanMessage
				);
			}

			if (output) {
				const aiMessage: D1ChatMessage = {
					type: 'ai',
					content: output,
					timestamp: new Date().toISOString(),
					metadata: { source: 'ai_response' },
				};

				await CloudflareD1Utils.storeChatMessage(
					this.context,
					this.config!,
					this.memoryConfig,
					aiMessage
				);
			}

			// Clean up old messages if over limit
			await CloudflareD1Utils.cleanupChatMessages(
				this.context,
				this.config!,
				this.memoryConfig
			);
		} catch (error) {
			console.error('Error saving context:', error);
			throw new Error(`Failed to save chat context: ${error.message}`);
		}
	}

	async clear(): Promise<void> {
		if (!this.config) {
			await this.initialize();
		}

		try {
			await CloudflareD1Utils.clearChatSession(
				this.context,
				this.config!,
				this.memoryConfig
			);
		} catch (error) {
			console.error('Error clearing memory:', error);
			throw new Error(`Failed to clear chat memory: ${error.message}`);
		}
	}

	// Additional utility methods for advanced memory management
	async getMessageCount(): Promise<number> {
		if (!this.config) {
			await this.initialize();
		}

		try {
			return await CloudflareD1Utils.getChatMessageCount(
				this.context,
				this.config!,
				this.memoryConfig
			);
		} catch (error) {
			console.error('Error getting message count:', error);
			return 0;
		}
	}

	async getSessionInfo(): Promise<{ messageCount: number; lastMessage?: Date }> {
		if (!this.config) {
			await this.initialize();
		}

		try {
			const messages = await CloudflareD1Utils.getChatMessages(
				this.context,
				this.config!,
				this.memoryConfig
			);

			return {
				messageCount: messages.length,
				lastMessage: messages.length > 0 ? new Date(messages[messages.length - 1].timestamp!) : undefined,
			};
		} catch (error) {
			console.error('Error getting session info:', error);
			return { messageCount: 0 };
		}
	}

	private getInputValue(inputValues: InputValues, inputKey?: string): string | null {
		if (inputKey && inputValues[inputKey]) {
			return String(inputValues[inputKey]);
		}

		// Auto-detect common input keys
		const commonKeys = ['input', 'question', 'query', 'prompt', 'message'];
		for (const key of commonKeys) {
			if (inputValues[key]) {
				return String(inputValues[key]);
			}
		}

		// Fallback to first string value
		for (const [, value] of Object.entries(inputValues)) {
			if (typeof value === 'string' && value.trim()) {
				return value;
			}
		}

		return null;
	}

	private getOutputValue(outputValues: OutputValues, outputKey?: string): string | null {
		if (outputKey && outputValues[outputKey]) {
			return String(outputValues[outputKey]);
		}

		// Auto-detect common output keys
		const commonKeys = ['output', 'response', 'text', 'answer', 'result'];
		for (const key of commonKeys) {
			if (outputValues[key]) {
				return String(outputValues[key]);
			}
		}

		// Fallback to first string value
		for (const [, value] of Object.entries(outputValues)) {
			if (typeof value === 'string' && value.trim()) {
				return value;
			}
		}

		return null;
	}
}