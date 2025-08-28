import { IExecuteFunctions, ILoadOptionsFunctions, INodeListSearchItems, INodeListSearchResult } from 'n8n-workflow';
import {
	INodeType,
	INodeTypeDescription,
	IDataObject,
	INodeExecutionData,
	NodeOperationError,
	NodeConnectionType,
	INodePropertyOptions,
} from 'n8n-workflow';

import { CloudflareD1Utils } from '../../utils/CloudflareD1Utils';
import { 
	D1Operation, 
	D1Resource,
	D1TableInfo,
	D1ColumnInfo 
} from '../../types/CloudflareD1Types';

export class CloudflareD1 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cloudflare D1',
		name: 'cloudflareD1',
		icon: 'file:cloudflared1.svg',
		group: ['database'],
		version: 2,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Execute operations against Cloudflare D1 serverless databases. Supports structured operations (Insert, Select, Update, Delete), raw SQL queries, and can be used as a tool by AI Agents.',
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
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Table',
						value: 'table',
						description: 'Work with database tables using structured operations (Insert, Select, Update, Delete)',
					},
					{
						name: 'Query',
						value: 'query',
						description: 'Execute raw SQL queries with full flexibility',
					},
				],
				default: 'table',
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
			
			// TABLE OPERATIONS
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['table'],
					},
				},
				options: [
					{
						name: 'Insert',
						value: 'insert',
						description: 'Insert new rows into a table',
						action: 'Insert rows into table',
					},
					{
						name: 'Select',
						value: 'select',
						description: 'Select rows from a table with optional filtering',
						action: 'Select rows from table',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update existing rows in a table',
						action: 'Update rows in table',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete rows from a table',
						action: 'Delete rows from table',
					},
				],
				default: 'insert',
				noDataExpression: true,
			},
			{
				displayName: 'Table',
				name: 'table',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				displayOptions: {
					show: {
						resource: ['table'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'tableSearch',
							searchable: true,
							searchFilterRequired: false,
						},
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						placeholder: 'table_name',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '^[a-zA-Z_][a-zA-Z0-9_]*$',
									errorMessage: 'Table name must start with a letter or underscore and contain only letters, numbers, and underscores',
								},
							},
						],
					},
				],
				required: true,
				description: 'The table to operate on',
			},

			// INSERT FIELDS
			{
				displayName: 'Columns',
				name: 'columnValues',
				placeholder: 'Add Column',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource: ['table'],
						operation: ['insert'],
					},
				},
				default: {},
				options: [
					{
						name: 'property',
						displayName: 'Column',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'options',
								typeOptions: {
									loadOptionsDependsOn: ['table'],
									loadOptionsMethod: 'getTableColumns',
								},
								default: '',
								required: true,
								description: 'Name of the column',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to insert',
							},
						],
					},
				],
				description: 'The columns and their values to insert',
			},

			// SELECT FIELDS
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['table'],
						operation: ['select'],
					},
				},
				default: false,
				description: 'Whether to return all results or limit the number of results',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['table'],
						operation: ['select'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Maximum number of results to return',
			},
			{
				displayName: 'Select Columns',
				name: 'columns',
				type: 'multiOptions',
				displayOptions: {
					show: {
						resource: ['table'],
						operation: ['select'],
					},
				},
				typeOptions: {
					loadOptionsDependsOn: ['table'],
					loadOptionsMethod: 'getTableColumns',
				},
				default: [],
				description: 'Columns to select. Leave empty to select all columns (*).',
			},
			{
				displayName: 'WHERE Conditions',
				name: 'where',
				placeholder: 'Add Condition',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource: ['table'],
						operation: ['select'],
					},
				},
				default: {},
				options: [
					{
						name: 'condition',
						displayName: 'Condition',
						values: [
							{
								displayName: 'Column',
								name: 'column',
								type: 'options',
								typeOptions: {
									loadOptionsDependsOn: ['table'],
									loadOptionsMethod: 'getTableColumns',
								},
								default: '',
								required: true,
							},
							{
								displayName: 'Operator',
								name: 'operator',
								type: 'options',
								options: [
									{ name: 'Equals', value: '=' },
									{ name: 'Not Equals', value: '!=' },
									{ name: 'Greater Than', value: '>' },
									{ name: 'Greater Than or Equal', value: '>=' },
									{ name: 'Less Than', value: '<' },
									{ name: 'Less Than or Equal', value: '<=' },
									{ name: 'Like', value: 'LIKE' },
									{ name: 'Not Like', value: 'NOT LIKE' },
									{ name: 'In', value: 'IN' },
									{ name: 'Not In', value: 'NOT IN' },
									{ name: 'Is Null', value: 'IS NULL' },
									{ name: 'Is Not Null', value: 'IS NOT NULL' },
								],
								default: '=',
								required: true,
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								displayOptions: {
									hide: {
										operator: ['IS NULL', 'IS NOT NULL'],
									},
								},
								default: '',
								description: 'Value to compare against',
							},
						],
					},
				],
			},

			// QUERY OPERATIONS  
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['query'],
					},
				},
				options: [
					{
						name: 'Execute Query',
						value: 'executeQuery',
						description: 'Execute a single SQL query with optional parameter binding for security',
						action: 'Execute a parameterized SQL query',
					},
					{
						name: 'Batch Queries',
						value: 'batchQueries',
						description: 'Execute multiple SQL queries in a single transaction',
						action: 'Execute multiple queries in batch',
					},
					{
						name: 'Execute Raw SQL',
						value: 'executeRawSql',
						description: 'Execute raw SQL commands without parameter binding',
						action: 'Execute raw SQL commands',
					},
				],
				default: 'executeQuery',
				noDataExpression: true,
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
						resource: ['query'],
						operation: ['executeQuery'],
					},
				},
				description: 'The SQL query to execute. Use ? placeholders for parameters to prevent SQL injection.',
				placeholder: 'SELECT * FROM users WHERE id = ?',
			},
			{
				displayName: 'Query Parameters',
				name: 'queryParameters',
				type: 'json',
				default: '[]',
				displayOptions: {
					show: {
						resource: ['query'],
						operation: ['executeQuery'],
					},
				},
				description: 'Array of parameters to bind to the query placeholders',
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
						resource: ['query'],
						operation: ['batchQueries'],
					},
				},
				description: 'Array of SQL query objects with "sql" and optional "params" properties',
				placeholder: '[{"sql": "INSERT INTO users (name) VALUES (?)", "params": ["John"]}, {"sql": "SELECT * FROM users"}]',
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
						resource: ['query'],
						operation: ['executeRawSql'],
					},
				},
				description: 'Raw SQL commands to execute. Use with caution - no parameter binding is performed.',
				placeholder: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);',
			},
		],
	};

	methods = {
		listSearch: {
			async tableSearch(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string
			): Promise<INodeListSearchResult> {
				const databaseId = this.getNodeParameter('databaseId') as string;
				
				try {
					const config = await CloudflareD1Utils.getConnectionConfig(this as any);
					config.databaseId = databaseId;
					
					const tables = await CloudflareD1Utils.getTables(this as any, config);
					
					const results: INodeListSearchItems[] = tables
						.filter((table: D1TableInfo) => {
							if (!filter) return true;
							return table.name.toLowerCase().includes(filter.toLowerCase());
						})
						.map((table: D1TableInfo) => ({
							name: `${table.name} (${table.type})`,
							value: table.name,
						}));

					return { results };
				} catch (error) {
					throw new NodeOperationError(this.getNode(), `Failed to load tables: ${error.message}`);
				}
			},
		},
		loadOptions: {
			async getTableColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const databaseId = this.getNodeParameter('databaseId') as string;
				const table = this.getNodeParameter('table') as { mode: string; value: string } | string;
				
				const tableName = typeof table === 'string' ? table : table.value;
				if (!tableName) {
					return [];
				}

				try {
					const config = await CloudflareD1Utils.getConnectionConfig(this as any);
					config.databaseId = databaseId;
					
					const schema = await CloudflareD1Utils.getTableSchema(this as any, config, tableName);
					
					return schema.columns.map((column: D1ColumnInfo) => ({
						name: `${column.name} (${column.type})${column.primaryKey ? ' - PK' : ''}${!column.nullable ? ' - NOT NULL' : ''}`,
						value: column.name,
					}));
				} catch (error) {
					return [];
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as D1Resource;
				const databaseId = this.getNodeParameter('databaseId', i) as string;

				const config = await CloudflareD1Utils.getConnectionConfig(this);
				config.databaseId = databaseId;

				let result;
				if (resource === 'table') {
					// Handle table operations inline
					const operation = this.getNodeParameter('operation', i) as D1Operation;
					const table = this.getNodeParameter('table', i) as { mode: string; value: string } | string;
					const tableName = typeof table === 'string' ? table : table.value;

					CloudflareD1Utils.validateTableName(tableName);

					switch (operation) {
						case 'insert':
							const columnValues = this.getNodeParameter('columnValues.property', i, []) as Array<{name: string, value: any}>;
							
							if (columnValues.length === 0) {
								throw new NodeOperationError(this.getNode(), 'At least one column must be specified for insert');
							}

							const insertData: IDataObject = {};
							for (const col of columnValues) {
								if (!col.name) {
									throw new NodeOperationError(this.getNode(), 'Column name cannot be empty');
								}
								insertData[col.name] = col.value;
							}

							const { sql: insertSql, params: insertParams } = CloudflareD1Utils.buildInsertQuery(tableName, insertData);
							const insertResponse = await CloudflareD1Utils.executeQuery(this, config, insertSql, insertParams);
							
							result = {
								success: insertResponse.result[0].success,
								results: insertResponse.result[0].results,
								meta: insertResponse.result[0].meta,
								rowsWritten: insertResponse.result[0].meta?.rows_written || 0,
								lastRowId: insertResponse.result[0].meta?.last_row_id,
							};
							break;

						case 'select':
							const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
							const limit = returnAll ? undefined : (this.getNodeParameter('limit', i, 50) as number);
							const columns = this.getNodeParameter('columns', i, []) as string[];
							const whereConditions = this.getNodeParameter('where.condition', i, []) as Array<{column: string, operator: string, value: any}>;

							// Build WHERE clause (simplified - only equals for now)
							const where: IDataObject = {};
							for (const condition of whereConditions) {
								if (condition.operator === '=' && condition.value !== undefined) {
									where[condition.column] = condition.value;
								}
							}

							const selectColumns = columns.length > 0 ? columns : ['*'];
							const { sql: selectSql, params: selectParams } = CloudflareD1Utils.buildSelectQuery(tableName, selectColumns, where, undefined, limit);
							const selectResponse = await CloudflareD1Utils.executeQuery(this, config, selectSql, selectParams);
							
							result = {
								success: selectResponse.result[0].success,
								results: selectResponse.result[0].results,
								meta: selectResponse.result[0].meta,
								rowsRead: selectResponse.result[0].meta?.rows_read || 0,
								count: selectResponse.result[0].results?.length || 0,
							};
							break;

						default:
							throw new NodeOperationError(this.getNode(), `Table operation "${operation}" not yet implemented in this version. Use Query resource for now.`);
					}
				} else {
					// Handle query operations
					const operation = this.getNodeParameter('operation', i) as string;

					switch (operation) {
						case 'executeQuery':
							const sqlQuery = this.getNodeParameter('sqlQuery', i) as string;
							const queryParametersString = this.getNodeParameter('queryParameters', i) as string;
							
							let queryParameters: any[] = [];
							if (queryParametersString && queryParametersString.trim() !== '' && queryParametersString.trim() !== '[]') {
								queryParameters = CloudflareD1Utils.parseJSON(queryParametersString, this, 'queryParameters');
							}

							const queryResponse = await CloudflareD1Utils.executeQuery(this, config, sqlQuery, queryParameters);
							result = {
								success: queryResponse.result[0].success,
								results: queryResponse.result[0].results,
								meta: queryResponse.result[0].meta,
							};
							break;

						case 'batchQueries':
							const sqlQueriesString = this.getNodeParameter('sqlQueries', i) as string;
							const sqlQueries = CloudflareD1Utils.parseJSON(sqlQueriesString, this, 'sqlQueries');
							
							const batchResponse = await CloudflareD1Utils.executeBatch(this, config, sqlQueries);
							result = batchResponse.result.map((batchResult: any, index: number) => ({
								queryIndex: index,
								success: batchResult.success,
								results: batchResult.results || [],
								meta: batchResult.meta || {},
								error: batchResult.error || null,
							}));
							break;

						case 'executeRawSql':
							const rawSqlCommands = this.getNodeParameter('rawSqlCommands', i) as string;
							const rawResponse = await CloudflareD1Utils.executeQuery(this, config, rawSqlCommands);
							result = {
								success: rawResponse.result[0].success,
								results: rawResponse.result[0].results,
								meta: rawResponse.result[0].meta,
							};
							break;

						default:
							throw new NodeOperationError(this.getNode(), `Unknown query operation: ${operation}`);
					}
				}

				returnData.push({
					resource,
					operation: this.getNodeParameter('operation', i),
					databaseId,
					data: result,
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