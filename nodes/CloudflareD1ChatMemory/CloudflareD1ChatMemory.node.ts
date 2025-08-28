import { IExecuteFunctions, NodeConnectionType } from 'n8n-workflow';
import {
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import { CloudflareD1Memory, CloudflareD1MemoryInput } from '../../utils/CloudflareD1Memory';

export class CloudflareD1ChatMemory implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cloudflare D1 Chat Memory',
		name: 'cloudflareD1ChatMemory',
		icon: 'file:cloudflared1-chat.svg',
		group: ['transform'],
		version: 1,
		description: 'LangChain-compatible memory using Cloudflare D1 for persistent chat history storage.',
		defaults: {
			name: 'Cloudflare D1 Chat Memory',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Memory'],
				Memory: ['Other memories'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorypostgreschat/',
					},
				],
			},
		},
		inputs: [],
		outputs: [NodeConnectionType.AiMemory],
		outputNames: ['Memory'],
		credentials: [
			{
				name: 'cloudflareD1Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Database ID',
				name: 'databaseId',
				type: 'string',
				default: '',
				required: true,
				description: 'The unique identifier of your Cloudflare D1 database where chat messages will be stored',
			},
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				default: '={{ $json.sessionId }}',
				required: true,
				description: 'Unique identifier for the chat session. Messages with the same session ID will be grouped together.',
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
				description: 'Number of days after which messages will be automatically deleted to manage storage',
			},
			{
				displayName: 'Memory Key',
				name: 'memoryKey',
				type: 'string',
				default: 'chat_history',
				description: 'The key to use when storing the memory in the prompt. This is the variable name that will be used in your prompts.',
			},
			{
				displayName: 'Return Messages',
				name: 'returnMessages',
				type: 'boolean',
				default: false,
				description: 'Whether to return the messages as a list of LangChain message objects instead of a formatted string',
			},
			{
				displayName: 'Input Key',
				name: 'inputKey',
				type: 'string',
				default: 'input',
				description: 'The key to use to get the input from the prompt values. Leave blank to automatically detect.',
			},
			{
				displayName: 'Output Key',
				name: 'outputKey',
				type: 'string',
				default: 'output',
				description: 'The key to use to get the output from the model. Leave blank to automatically detect.',
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const databaseId = this.getNodeParameter('databaseId', itemIndex) as string;
		const sessionId = this.getNodeParameter('sessionId', itemIndex) as string;
		const tableName = this.getNodeParameter('tableName', itemIndex, 'chat_memory') as string;
		const maxMessages = this.getNodeParameter('maxMessages', itemIndex, 100) as number;
		const expirationDays = this.getNodeParameter('expirationDays', itemIndex, 30) as number;
		const memoryKey = this.getNodeParameter('memoryKey', itemIndex, 'chat_history') as string;
		const returnMessages = this.getNodeParameter('returnMessages', itemIndex, false) as boolean;
		const inputKey = this.getNodeParameter('inputKey', itemIndex, 'input') as string | undefined;
		const outputKey = this.getNodeParameter('outputKey', itemIndex, 'output') as string | undefined;

		const memoryInput: CloudflareD1MemoryInput = {
			databaseId,
			sessionId,
			tableName,
			maxMessages,
			expirationDays,
			memoryKey,
			returnMessages,
			inputKey: inputKey || undefined,
			outputKey: outputKey || undefined,
		};

		const memory = new CloudflareD1Memory(this as unknown as IExecuteFunctions, memoryInput);

		return {
			response: memory,
		};
	}
}