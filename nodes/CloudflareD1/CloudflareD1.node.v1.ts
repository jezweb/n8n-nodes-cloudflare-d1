import { IExecuteFunctions } from 'n8n-workflow';
import {
	INodeType,
	INodeTypeDescription,
	IDataObject,
	INodeExecutionData,
	NodeOperationError,
	NodeConnectionType,
	IHttpRequestMethods,
} from 'n8n-workflow';

export class CloudflareD1 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cloudflare D1',
		name: 'cloudflareD1',
		icon: 'file:cloudflared1.svg',
		group: ['database'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Execute SQL queries against Cloudflare D1 serverless databases. Supports parameterized queries, batch operations, and can be used as a tool by AI Agents for database operations.',
		defaults: {
			name: 'Cloudflare D1',
		},
		inputs: [
			{
				displayName: 'Input',
				type: NodeConnectionType.Main,
			},
		],
		outputs: [
			{
				displayName: 'Output',
				type: NodeConnectionType.Main,
			},
		],
		credentials: [
			{
				name: 'cloudflareD1Api',
				required: true,
			},
		],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Execute Query',
						value: 'executeQuery',
						description: 'Execute a single SQL query with optional parameter binding for security. Use this for SELECT, INSERT, UPDATE, DELETE operations with user-provided data.',
						action: 'Execute a parameterized SQL query',
					},
					{
						name: 'Batch Queries',
						value: 'batchQueries',
						description: 'Execute multiple SQL queries in a single transaction for better performance and atomicity. All queries succeed together or fail together.',
						action: 'Execute multiple queries in batch',
					},
					{
						name: 'Execute Raw SQL',
						value: 'executeRawSql',
						description: 'Execute raw SQL commands without parameter binding. Use with caution - intended for schema operations and maintenance tasks only.',
						action: 'Execute raw SQL commands',
					},
				],
				default: 'executeQuery',
				noDataExpression: true,
			},
			{
				displayName: 'Database ID',
				name: 'databaseId',
				type: 'string',
				default: '',
				required: true,
				description: 'The unique identifier of your Cloudflare D1 database. You can find this in your Cloudflare Dashboard under D1 databases.',
			},
			{
				displayName: 'SQL Query',
				name: 'sqlQuery',
				type: 'string',
				typeOptions: {
					editor: 'sqlEditor',
					rows: 5,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['executeQuery'],
					},
				},
				description: 'The SQL query to execute. Use ? placeholders for parameters to prevent SQL injection. Example: SELECT * FROM users WHERE ID = ? AND status = ?',
				placeholder: 'SELECT * FROM users WHERE id = ?',
			},
			{
				displayName: 'Query Parameters',
				name: 'queryParameters',
				type: 'json',
				default: '[]',
				displayOptions: {
					show: {
						operation: ['executeQuery'],
					},
				},
				description: 'Array of parameters to bind to the query placeholders. Parameters are bound in order. Example: ["123", "active"]',
				placeholder: '["param1", "param2"]',
			},
			{
				displayName: 'SQL Queries',
				name: 'sqlQueries',
				type: 'json',
				typeOptions: {
					rows: 10,
				},
				default: '[]',
				required: true,
				displayOptions: {
					show: {
						operation: ['batchQueries'],
					},
				},
				description: 'Array of SQL query objects. Each object should have "sql" and optional "params" properties. Example: [{"sql": "INSERT INTO users (name) VALUES (?)", "params": ["John"]}, {"sql": "SELECT * FROM users"}]',
				placeholder: '[{"sql": "INSERT INTO users (name) VALUES (?)", "params": ["John Doe"]}, {"sql": "SELECT * FROM users"}]',
			},
			{
				displayName: 'Raw SQL Commands',
				name: 'rawSqlCommands',
				type: 'string',
				typeOptions: {
					editor: 'sqlEditor',
					rows: 8,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['executeRawSql'],
					},
				},
				description: 'Raw SQL commands to execute. Separate multiple commands with semicolons. Use with caution - no parameter binding is performed.',
				placeholder: 'CREATE TABLE users (ID INTEGER PRIMARY KEY, name TEXT, email TEXT);',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const databaseId = this.getNodeParameter('databaseId', i) as string;

				const credentials = await this.getCredentials('cloudflareD1Api');
				const { accountId, apiToken, apiEndpoint } = credentials;

				const baseUrl = `${apiEndpoint}/accounts/${accountId}/d1/database/${databaseId}/query`;

				let requestBody: IDataObject;

				switch (operation) {
					case 'executeQuery':
						const sqlQuery = this.getNodeParameter('sqlQuery', i) as string;
						const queryParametersString = this.getNodeParameter('queryParameters', i) as string;
						
						let queryParameters: any[] = [];
						if (queryParametersString && queryParametersString.trim() !== '' && queryParametersString.trim() !== '[]') {
							try {
								queryParameters = JSON.parse(queryParametersString);
								if (!Array.isArray(queryParameters)) {
									throw new NodeOperationError(this.getNode(), 'Query parameters must be an array');
								}
							} catch (error) {
								throw new NodeOperationError(this.getNode(), 'Invalid JSON in query parameters: ' + error.message);
							}
						}

						requestBody = {
							sql: sqlQuery,
							params: queryParameters,
						};
						break;

					case 'batchQueries':
						const sqlQueriesString = this.getNodeParameter('sqlQueries', i) as string;
						let sqlQueries: any[];
						
						try {
							sqlQueries = JSON.parse(sqlQueriesString);
							if (!Array.isArray(sqlQueries)) {
								throw new NodeOperationError(this.getNode(), 'SQL queries must be an array');
							}
						} catch (error) {
							throw new NodeOperationError(this.getNode(), 'Invalid JSON in SQL queries: ' + error.message);
						}

						requestBody = { queries: sqlQueries };
						break;

					case 'executeRawSql':
						const rawSqlCommands = this.getNodeParameter('rawSqlCommands', i) as string;
						requestBody = {
							sql: rawSqlCommands,
						};
						break;

					default:
						throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
				}

				const options = {
					method: 'POST' as IHttpRequestMethods,
					headers: {
						'Authorization': `Bearer ${apiToken}`,
						'Content-Type': 'application/json',
					},
					body: requestBody,
					url: baseUrl,
					json: true,
				};

				const responseData = await this.helpers.httpRequest(options);

				if (!responseData.success) {
					const errorMessage = responseData.errors && responseData.errors.length > 0 
						? responseData.errors[0].message 
						: 'Unknown error occurred';
					throw new NodeOperationError(this.getNode(), `Cloudflare D1 API error: ${errorMessage}`);
				}

				let processedResults;
				if (operation === 'batchQueries') {
					processedResults = responseData.result.map((result: any, index: number) => ({
						queryIndex: index,
						success: result.success,
						results: result.results || [],
						meta: result.meta || {},
						error: result.error || null,
					}));
				} else {
					const result = responseData.result[0];
					processedResults = {
						success: result.success,
						results: result.results || [],
						meta: result.meta || {},
						duration: result.meta?.duration || 0,
						rowsRead: result.meta?.rows_read || 0,
						rowsWritten: result.meta?.rows_written || 0,
					};
				}

				returnData.push({
					operation,
					databaseId,
					data: processedResults,
					timestamp: new Date().toISOString(),
				});

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						error: error.message,
						item: items[i],
						timestamp: new Date().toISOString(),
					});
				} else {
					throw error;
				}
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}