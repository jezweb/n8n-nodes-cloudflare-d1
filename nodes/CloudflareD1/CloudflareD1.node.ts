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
	D1ColumnInfo,
	D1AggregateQuery,
	D1WhereOperator,
	D1AggregateFunction
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
						name: 'Database',
						value: 'database',
						description: 'Database-level operations (export, import, info)',
					},
					{
						name: 'Memory',
						value: 'memory',
						description: 'Access and manage chat memory for AI agents (conversation history, message search)',
					},
					{
						name: 'Query',
						value: 'query',
						description: 'Execute raw SQL queries with full flexibility',
					},
					{
						name: 'Query Builder',
						value: 'builder',
						description: 'Build queries visually without writing SQL',
					},
					{
						name: 'Table',
						value: 'table',
						description: 'Work with database tables using structured operations (Insert, Select, Update, Delete)',
					},
					{
						name: 'Table Management',
						value: 'tableManagement',
						description: 'Create, alter, and manage table schemas',
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
						name: 'Delete',
						value: 'delete',
						description: 'Delete rows from a table',
						action: 'Delete rows from table',
					},
					{
						name: 'Find Record',
						value: 'findRecord',
						description: 'Find one or more records using simple search (AI-friendly)',
						action: 'Find records in table',
					},
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

			// FIND RECORD FIELDS
			{
				displayName: 'Search Column Name or ID',
				name: 'findColumn',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['table'],
						operation: ['findRecord'],
					},
				},
				typeOptions: {
					loadOptionsDependsOn: ['table'],
					loadOptionsMethod: 'getTableColumns',
				},
				default: '',
				required: true,
				description: 'Column to search in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Search Operator',
				name: 'findOperator',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['table'],
						operation: ['findRecord'],
					},
				},
				options: [
					{ name: 'Contains', value: 'LIKE', description: 'Use % for wildcards' },
					{ name: 'Equals', value: '=' },
					{ name: 'Greater Than', value: '>' },
					{ name: 'Greater Than or Equal', value: '>=' },
					{ name: 'In List', value: 'IN', description: 'Comma-separated values' },
					{ name: 'Is Not Null', value: 'IS NOT NULL' },
					{ name: 'Is Null', value: 'IS NULL' },
					{ name: 'Less Than', value: '<' },
					{ name: 'Less Than or Equal', value: '<=' },
					{ name: 'Not Contains', value: 'NOT LIKE' },
					{ name: 'Not Equals', value: '!=' },
					{ name: 'Not In List', value: 'NOT IN', description: 'Comma-separated values' },
				],
				default: '=',
				description: 'How to compare the search value',
			},
			{
				displayName: 'Search Value',
				name: 'findValue',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['table'],
						operation: ['findRecord'],
					},
					hide: {
						findOperator: ['IS NULL', 'IS NOT NULL'],
					},
				},
				default: '',
				description: 'Value to search for. For LIKE operator, use % as wildcard. For IN/NOT IN, use comma-separated values.',
			},
			{
				displayName: 'Options',
				name: 'findOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['table'],
						operation: ['findRecord'],
					},
				},
				options: [
					{
						displayName: 'Find Latest Record',
						name: 'findLatest',
						type: 'boolean',
						default: false,
						description: 'Whether to return the most recently added record(s) by sorting by rowid DESC',
					},
					{
						displayName: 'Limit',
						name: 'findLimit',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 1,
						description: 'Maximum number of records to return',
					},
				],
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
								displayName: 'Name or ID',
								name: 'name',
								type: 'options',
								typeOptions: {
									loadOptionsDependsOn: ['table'],
									loadOptionsMethod: 'getTableColumns',
								},
								default: '',
								required: true,
								description: 'Name of the column. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
								hint: 'TIP: Click "Add Column" button multiple times to insert values into several columns',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to insert. Use expressions like {{ $JSON.fieldName }} for dynamic values.',
							},
						],
					},
				],
				description: 'The columns and values to insert. Click "Add Column" to add multiple columns at once. For AI Agents: specify each column as a name-value pair.',
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
				description: 'Whether to return all results or only up to a given limit',
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
				description: 'Max number of results to return',
			},
			{
				displayName: 'Select Column Names or IDs',
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
				description: 'Columns to select. Leave empty to select all columns (*). Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
								displayName: 'Column Name or ID',
								name: 'column',
								type: 'options',
								description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
									{ name: 'Greater Than', value: '>' },
									{ name: 'Greater Than or Equal', value: '>=' },
									{ name: 'In', value: 'IN' },
									{ name: 'Is Not Null', value: 'IS NOT NULL' },
									{ name: 'Is Null', value: 'IS NULL' },
									{ name: 'Less Than', value: '<' },
									{ name: 'Less Than or Equal', value: '<=' },
									{ name: 'Like', value: 'LIKE' },
									{ name: 'Not Equals', value: '!=' },
									{ name: 'Not In', value: 'NOT IN' },
									{ name: 'Not Like', value: 'NOT LIKE' },
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
			{
				displayName: 'Order By',
				name: 'orderBy',
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
				placeholder: 'Add Sort',
				options: [
					{
						name: 'sort',
						displayName: 'Sort',
						values: [
							{
								displayName: 'Column Name or ID',
								name: 'column',
								type: 'options',
								typeOptions: {
									loadOptionsDependsOn: ['table'],
									loadOptionsMethod: 'getTableColumns',
								},
								default: '',
								required: true,
								description: 'Column to sort by. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
								displayName: 'Direction',
								name: 'direction',
								type: 'options',
								options: [
									{ name: 'Ascending', value: 'ASC' },
									{ name: 'Descending', value: 'DESC' },
								],
								default: 'ASC',
								description: 'Sort direction',
							},
						],
					},
				],
			},


			// UPDATE FIELDS
			{
				displayName: 'Update Columns',
				name: 'updateFields',
				placeholder: 'Add Column',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource: ['table'],
						operation: ['update'],
					},
				},
				default: {},
				options: [
					{
						name: 'property',
						displayName: 'Column',
						values: [
							{
								displayName: 'Name or ID',
								name: 'name',
								type: 'options',
								typeOptions: {
									loadOptionsDependsOn: ['table'],
									loadOptionsMethod: 'getTableColumns',
								},
								default: '',
								required: true,
								description: 'Name of the column to update. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
								hint: 'TIP: Click "Add Column" button multiple times to update several columns at once',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'New value for the column. Use expressions like {{ $JSON.fieldName }} for dynamic values.',
							},
						],
					},
				],
				description: 'The columns to update and their new values. Click "Add Column" to update multiple columns at once. For AI Agents: specify each column as a name-value pair.',
			},
			{
				displayName: 'WHERE Conditions',
				name: 'whereUpdate',
				placeholder: 'Add Condition',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource: ['table'],
						operation: ['update'],
					},
				},
				default: {},
				options: [
					{
						name: 'condition',
						displayName: 'Condition',
						values: [
							{
								displayName: 'Column Name or ID',
								name: 'column',
								type: 'options',
								description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
									{ name: 'Greater Than', value: '>' },
									{ name: 'In', value: 'IN' },
									{ name: 'Is Not Null', value: 'IS NOT NULL' },
									{ name: 'Is Null', value: 'IS NULL' },
									{ name: 'Less Than', value: '<' },
									{ name: 'Like', value: 'LIKE' },
									{ name: 'Not Equals', value: '!=' },
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

			// DELETE FIELDS
			{
				displayName: 'WHERE Conditions',
				name: 'whereDelete',
				placeholder: 'Add Condition',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource: ['table'],
						operation: ['delete'],
					},
				},
				default: {},
				options: [
					{
						name: 'condition',
						displayName: 'Condition',
						values: [
							{
								displayName: 'Column Name or ID',
								name: 'column',
								type: 'options',
								description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
									{ name: 'Greater Than', value: '>' },
									{ name: 'In', value: 'IN' },
									{ name: 'Is Not Null', value: 'IS NOT NULL' },
									{ name: 'Is Null', value: 'IS NULL' },
									{ name: 'Less Than', value: '<' },
									{ name: 'Like', value: 'LIKE' },
									{ name: 'Not Equals', value: '!=' },
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
			{
				displayName: 'Limit',
				name: 'deleteLimit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['table'],
						operation: ['delete'],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: '',
				description: 'Maximum number of rows to delete (optional safety limit)',
			},

			// TABLE MANAGEMENT OPERATIONS
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['tableManagement'],
					},
				},
				options: [
					{
						name: 'Create Table',
						value: 'createTable',
						description: 'Create a new table with columns and constraints',
						action: 'Create a new table',
					},
					{
						name: 'List Tables',
						value: 'listTables',
						description: 'Get a list of all tables in the database',
						action: 'List all tables',
					},
					{
						name: 'Get Table Schema',
						value: 'getTableSchema',
						description: 'Get detailed schema information for a table',
						action: 'Get table schema',
					},
					{
						name: 'Drop Table',
						value: 'dropTable',
						description: 'Delete a table and all its data',
						action: 'Drop a table',
					},
				],
				default: 'createTable',
				noDataExpression: true,
			},

			// CREATE TABLE FIELDS
			{
				displayName: 'Table Name',
				name: 'createTableName',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['tableManagement'],
						operation: ['createTable'],
					},
				},
				default: '',
				required: true,
				placeholder: 'users',
				description: 'Name for the new table',
			},
			{
				displayName: 'Columns',
				name: 'columns',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					minValue: 1,
				},
				displayOptions: {
					show: {
						resource: ['tableManagement'],
						operation: ['createTable'],
					},
				},
				default: {},
				placeholder: 'Add Column',
				options: [
					{
						name: 'column',
						displayName: 'Column',
						values: [
							{
						displayName: 'Auto Increment',
						name: 'autoIncrement',
						type: 'boolean',
						default: false,
						description: 'Whether to auto-increment this integer primary key',
							},
							{
						displayName: 'Default Value',
						name: 'defaultValue',
						type: 'string',
						default: '',
						description: 'Default value for the column (leave empty for no default)',
							},
							{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
							required:	true,
						placeholder: 'column_name',
						description: 'Name of the column',
							},
							{
						displayName: 'Not Null',
						name: 'notNull',
						type: 'boolean',
						default: false,
						description: 'Whether this column must have a value',
							},
							{
						displayName: 'Primary Key',
						name: 'primaryKey',
						type: 'boolean',
						default: false,
						description: 'Whether this column is a primary key',
							},
							{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
									{
										name: 'Blob (Binary)',
										value: 'BLOB',
									},
									{
										name: 'Boolean',
										value: 'BOOLEAN',
									},
									{
										name: 'Date/Time',
										value: 'DATETIME',
									},
									{
										name: 'Integer',
										value: 'INTEGER',
									},
									{
										name: 'JSON',
										value: 'JSON',
									},
									{
										name: 'Real (Float)',
										value: 'REAL',
									},
									{
										name: 'Text',
										value: 'TEXT',
									},
								],
						default: 'TEXT',
						description: 'Data type for the column',
							},
							{
						displayName: 'Unique',
						name: 'unique',
						type: 'boolean',
						default: false,
						description: 'Whether values in this column must be unique',
							},
					],
					},
				],
			},
			{
				displayName: 'Options',
				name: 'createTableOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['tableManagement'],
						operation: ['createTable'],
					},
				},
				options: [
					{
						displayName: 'If Not Exists',
						name: 'ifNotExists',
						type: 'boolean',
						default: true,
						description: 'Whether to create the table only if it doesn\'t already exist',
					},
					{
						displayName: 'Without Row ID',
						name: 'withoutRowId',
						type: 'boolean',
						default: false,
						description: 'Whether to create the table without ROWID (optimization for certain use cases)',
					},
					{
						displayName: 'Strict Mode',
						name: 'strict',
						type: 'boolean',
						default: false,
						description: 'Whether to enforce strict typing (SQLite 3.37.0+)',
					},
				],
			},

			// GET TABLE SCHEMA FIELDS
			{
				displayName: 'Table',
				name: 'schemaTable',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				displayOptions: {
					show: {
						resource: ['tableManagement'],
						operation: ['getTableSchema'],
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
						},
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						placeholder: 'table_name',
					},
				],
				required: true,
				description: 'The table to get schema information for',
			},

			// DROP TABLE FIELDS
			{
				displayName: 'Table',
				name: 'dropTable',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				displayOptions: {
					show: {
						resource: ['tableManagement'],
						operation: ['dropTable'],
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
						},
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						placeholder: 'table_name',
					},
				],
				required: true,
				description: 'The table to drop',
			},
			{
				displayName: 'If Exists',
				name: 'dropIfExists',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						resource: ['tableManagement'],
						operation: ['dropTable'],
					},
				},
				description: 'Whether to drop the table only if it exists (prevents errors)',
			},
			{
				displayName: 'WARNING: This will permanently delete the table and all its data. This action cannot be undone.',
				name: 'dropTableWarning',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						resource: ['tableManagement'],
						operation: ['dropTable'],
					},
				},
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
				placeholder: 'CREATE TABLE users (ID INTEGER PRIMARY KEY, name TEXT);',
			},

			// QUERY BUILDER OPERATIONS
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['builder'],
					},
				},
				options: [
					{
						name: 'Query Builder',
						value: 'queryBuilder',
						description: 'Build a SELECT query visually',
						action: 'Build SELECT query',
					},
					{
						name: 'Aggregate Query',
						value: 'aggregateQuery',
						description: 'Build aggregation queries (COUNT, SUM, AVG, etc.)',
						action: 'Build aggregate query',
					},
					{
						name: 'Get Distinct Values',
						value: 'getDistinctValues',
						description: 'Get unique values from a column',
						action: 'Get distinct values',
					},
					{
						name: 'Table Statistics',
						value: 'tableStatistics',
						description: 'Get statistics about a table',
						action: 'Get table statistics',
					},
				],
				default: 'queryBuilder',
				noDataExpression: true,
			},

			// QUERY BUILDER FIELDS
			{
				displayName: 'Table',
				name: 'builderTable',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				displayOptions: {
					show: {
						resource: ['builder'],
						operation: ['queryBuilder', 'aggregateQuery', 'getDistinctValues', 'tableStatistics'],
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
						},
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						placeholder: 'table_name',
					},
				],
				required: true,
				description: 'The table to query',
			},

			// Query Builder specific fields
			{
				displayName: 'Column Names or IDs',
				name: 'queryColumns',
				type: 'multiOptions',
				displayOptions: {
					show: {
						resource: ['builder'],
						operation: ['queryBuilder'],
					},
				},
				typeOptions: {
					loadOptionsDependsOn: ['builderTable'],
					loadOptionsMethod: 'getTableColumns',
				},
				default: [],
				description: 'Columns to select (leave empty for all). Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Where Conditions',
				name: 'whereConditions',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource: ['builder'],
						operation: ['queryBuilder', 'aggregateQuery'],
					},
				},
				default: {},
				placeholder: 'Add Condition',
				options: [
					{
						name: 'condition',
						displayName: 'Condition',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'field',
								type: 'options',
								typeOptions: {
									loadOptionsDependsOn: ['builderTable'],
									loadOptionsMethod: 'getTableColumns',
								},
								default: '',
								required: true,
								description: 'Field to filter on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
								displayName: 'Operator',
								name: 'operator',
								type: 'options',
								options: [
									{ name: 'Between', value: 'BETWEEN' },
									{ name: 'Equals', value: '=' },
									{ name: 'Greater or Equal', value: '>=' },
									{ name: 'Greater Than', value: '>' },
									{ name: 'In', value: 'IN' },
									{ name: 'Is Not Null', value: 'IS NOT NULL' },
									{ name: 'Is Null', value: 'IS NULL' },
									{ name: 'Less or Equal', value: '<=' },
									{ name: 'Less Than', value: '<' },
									{ name: 'Like', value: 'LIKE' },
									{ name: 'Not Equals', value: '!=' },
									{ name: 'Not In', value: 'NOT IN' },
									{ name: 'Not Like', value: 'NOT LIKE' },
								],
								default: '=',
								description: 'Comparison operator',
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
								description: 'Value to compare (for IN operator, use comma-separated values)',
							},
							{
								displayName: 'Value 2',
								name: 'value2',
								type: 'string',
								displayOptions: {
									show: {
										operator: ['BETWEEN'],
									},
								},
								default: '',
								description: 'Second value for BETWEEN operator',
							},
						],
					},
				],
			},
			{
				displayName: 'Order By',
				name: 'orderBy',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource: ['builder'],
						operation: ['queryBuilder'],
					},
				},
				default: {},
				placeholder: 'Add Sort',
				options: [
					{
						name: 'sort',
						displayName: 'Sort',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'field',
								type: 'options',
								typeOptions: {
									loadOptionsDependsOn: ['builderTable'],
									loadOptionsMethod: 'getTableColumns',
								},
								default: '',
								required: true,
								description: 'Field to sort by. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
								displayName: 'Direction',
								name: 'direction',
								type: 'options',
								options: [
									{ name: 'Ascending', value: 'ASC' },
									{ name: 'Descending', value: 'DESC' },
								],
								default: 'ASC',
								description: 'Sort direction',
							},
						],
					},
				],
			},
			{
				displayName: 'Limit',
				name: 'builderLimit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['builder'],
						operation: ['queryBuilder'],
					},
				},
				default: '',
				description: 'Maximum number of rows to return',
			},
			{
				displayName: 'Offset',
				name: 'builderOffset',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['builder'],
						operation: ['queryBuilder'],
					},
				},
				default: '',
				description: 'Number of rows to skip',
			},

			// Aggregate Query fields
			{
				displayName: 'Function',
				name: 'aggregateFunction',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['builder'],
						operation: ['aggregateQuery'],
					},
				},
				options: [
					{ name: 'Average', value: 'AVG' },
					{ name: 'Count', value: 'COUNT' },
					{ name: 'Group Concat', value: 'GROUP_CONCAT' },
					{ name: 'Maximum', value: 'MAX' },
					{ name: 'Minimum', value: 'MIN' },
					{ name: 'Sum', value: 'SUM' },
				],
				default: 'COUNT',
				description: 'Aggregate function to apply',
			},
			{
				displayName: 'Column Name or ID',
				name: 'aggregateColumn',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['builder'],
						operation: ['aggregateQuery'],
					},
					hide: {
						aggregateFunction: ['COUNT'],
					},
				},
				typeOptions: {
					loadOptionsDependsOn: ['builderTable'],
					loadOptionsMethod: 'getTableColumns',
				},
				default: '',
				description: 'Column to aggregate (leave empty for COUNT(*)). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Group By Names or IDs',
				name: 'groupBy',
				type: 'multiOptions',
				displayOptions: {
					show: {
						resource: ['builder'],
						operation: ['aggregateQuery'],
					},
				},
				typeOptions: {
					loadOptionsDependsOn: ['builderTable'],
					loadOptionsMethod: 'getTableColumns',
				},
				default: [],
				description: 'Columns to group by. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},

			// Get Distinct Values fields
			{
				displayName: 'Column Name or ID',
				name: 'distinctColumn',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['builder'],
						operation: ['getDistinctValues'],
					},
				},
				typeOptions: {
					loadOptionsDependsOn: ['builderTable'],
					loadOptionsMethod: 'getTableColumns',
				},
				default: '',
				required: true,
				description: 'Column to get distinct values from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},

			// MEMORY OPERATIONS
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['memory'],
					},
				},
				options: [
					{
						name: 'Clear Session',
						value: 'clearSession',
						description: 'Remove all messages for a specific session',
						action: 'Clear session memory',
					},
					{
						name: 'Get Chat History',
						value: 'getChatHistory',
						description: 'Retrieve conversation history for a specific session',
						action: 'Get chat history for session',
					},
					{
						name: 'Get Recent Messages',
						value: 'getRecentMessages',
						description: 'Get the most recent messages from a session',
						action: 'Get recent messages',
					},
					{
						name: 'Get Session List',
						value: 'getSessionList',
						description: 'List all available session IDs with message counts',
						action: 'Get list of all sessions',
					},
					{
						name: 'Search Messages',
						value: 'searchMessages',
						description: 'Search messages by content or metadata across all sessions',
						action: 'Search messages by content',
					},
				],
				default: 'getChatHistory',
				noDataExpression: true,
			},

			// Memory: Get Chat History fields
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['memory'],
						operation: ['getChatHistory', 'getRecentMessages', 'clearSession'],
					},
				},
				default: '',
				required: true,
				placeholder: 'fe4621679-4f44f-ca991e52d2ea46508',
				description: 'The session ID to retrieve messages for',
			},
			{
				displayName: 'Message Types',
				name: 'messageTypes',
				type: 'multiOptions',
				displayOptions: {
					show: {
						resource: ['memory'],
						operation: ['getChatHistory'],
					},
				},
				options: [
					{ name: 'Human Messages', value: 'human' },
					{ name: 'AI Messages', value: 'ai' },
				],
				default: ['human', 'ai'],
				description: 'Types of messages to include in the history',
			},
			{
				displayName: 'Limit',
				name: 'memoryLimit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['memory'],
						operation: ['getChatHistory', 'getRecentMessages'],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 1000,
				},
				default: 50,
				description: 'Maximum number of messages to return',
			},
			{
				displayName: 'Sort Order',
				name: 'sortOrder',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['memory'],
						operation: ['getChatHistory'],
					},
				},
				options: [
					{ name: 'Oldest First', value: 'ASC' },
					{ name: 'Newest First', value: 'DESC' },
				],
				default: 'ASC',
				description: 'Order to return messages in',
			},

			// Memory: Search Messages fields
			{
				displayName: 'Search Query',
				name: 'searchQuery',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['memory'],
						operation: ['searchMessages'],
					},
				},
				default: '',
				required: true,
				placeholder: 'chef classification hotel',
				description: 'Text to search for in message content',
			},
			{
				displayName: 'Search in Session',
				name: 'searchSessionId',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['memory'],
						operation: ['searchMessages'],
					},
				},
				default: '',
				description: 'Optional: Limit search to specific session (leave empty to search all sessions)',
			},
			{
				displayName: 'Search Message Types',
				name: 'searchMessageTypes',
				type: 'multiOptions',
				displayOptions: {
					show: {
						resource: ['memory'],
						operation: ['searchMessages'],
					},
				},
				options: [
					{ name: 'Human Messages', value: 'human' },
					{ name: 'AI Messages', value: 'ai' },
				],
				default: ['human', 'ai'],
				description: 'Types of messages to search within',
			},
			{
				displayName: 'Search Limit',
				name: 'searchLimit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['memory'],
						operation: ['searchMessages'],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 500,
				},
				default: 20,
				description: 'Maximum number of matching messages to return',
			},
			{
				displayName: 'Enable Fuzzy Search',
				name: 'enableFuzzySearch',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['memory'],
						operation: ['searchMessages'],
					},
				},
				default: false,
				description: 'Whether to enable flexible matching for plurals, suffixes, and word variations (e.g., "designer" matches "designers")',
			},

			// Memory: Clear Session warning
			{
				displayName: 'WARNING: This will permanently delete all messages for the session. This action cannot be undone.',
				name: 'clearSessionWarning',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						resource: ['memory'],
						operation: ['clearSession'],
					},
				},
			},

			// DATABASE OPERATIONS
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['database'],
					},
				},
				options: [
					{
						name: 'Export Database',
						value: 'exportDatabase',
						description: 'Export database to SQL file',
						action: 'Export database',
					},
					{
						name: 'Import Database',
						value: 'importDatabase',
						description: 'Import SQL file to database',
						action: 'Import database',
					},
					{
						name: 'Get Database Info',
						value: 'getDatabaseInfo',
						description: 'Get information about the database',
						action: 'Get database info',
					},
					{
						name: 'List Databases',
						value: 'listDatabases',
						description: 'List all D1 databases in account',
						action: 'List all databases',
					},
				],
				default: 'getDatabaseInfo',
				noDataExpression: true,
			},

			// Import Database fields
			{
				displayName: 'SQL Content',
				name: 'importSql',
				type: 'string',
				typeOptions: {
					rows: 10,
				},
				displayOptions: {
					show: {
						resource: ['database'],
						operation: ['importDatabase'],
					},
				},
				default: '',
				required: true,
				description: 'SQL content to import',
				placeholder: 'CREATE TABLE ...\nINSERT INTO ...',
			},
			{
				displayName: 'WARNING: Import will replace existing data. The database will be unavailable during import.',
				name: 'importWarning',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						resource: ['database'],
						operation: ['importDatabase'],
					},
				},
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
						case 'findRecord':
							const findColumn = this.getNodeParameter('findColumn', i) as string;
							const findOperator = this.getNodeParameter('findOperator', i) as string;
							const findValue = this.getNodeParameter('findValue', i, '') as string;
							const findOptions = this.getNodeParameter('findOptions', i, {}) as IDataObject;

							const findLatest = findOptions.findLatest as boolean || false;
							const findLimit = findOptions.findLimit as number || 1;

							// Build the WHERE clause
							let whereClause = '';
							const params: any[] = [];

							if (findOperator === 'IS NULL' || findOperator === 'IS NOT NULL') {
								whereClause = `"${findColumn}" ${findOperator}`;
							} else if (findOperator === 'IN' || findOperator === 'NOT IN') {
								const values = findValue.split(',').map(v => v.trim());
								const placeholders = values.map(() => '?').join(', ');
								whereClause = `"${findColumn}" ${findOperator} (${placeholders})`;
								params.push(...values);
							} else if (findOperator === 'LIKE' || findOperator === 'NOT LIKE') {
								whereClause = `"${findColumn}" ${findOperator} ?`;
								// If no wildcards, add them for "contains" behavior
								let searchValue = findValue;
								if (!searchValue.includes('%')) {
									searchValue = `%${searchValue}%`;
								}
								params.push(searchValue);
							} else {
								whereClause = `"${findColumn}" ${findOperator} ?`;
								params.push(findValue);
							}

							// Build the query
							let findSql = `SELECT * FROM "${tableName}" WHERE ${whereClause}`;

							// Add ORDER BY if finding latest
							if (findLatest) {
								findSql += ' ORDER BY rowid DESC';
							}

							// Add LIMIT
							findSql += ` LIMIT ${findLimit}`;

							const findResponse = await CloudflareD1Utils.executeQuery(this, config, findSql, params);

							result = {
								success: findResponse.result[0].success,
								results: findResponse.result[0].results,
								meta: findResponse.result[0].meta,
								rowsRead: findResponse.result[0].meta?.rows_read || 0,
								count: findResponse.result[0].results?.length || 0,
							};
							break;

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

							// Build WHERE clause with proper operator support
							let whereSql = '';
							const whereParams: any[] = [];

							if (whereConditions.length > 0) {
								const conditions: string[] = [];

								for (const condition of whereConditions) {
									if (condition.operator === 'IS NULL' || condition.operator === 'IS NOT NULL') {
										conditions.push(`"${condition.column}" ${condition.operator}`);
									} else if (condition.operator === 'IN' || condition.operator === 'NOT IN') {
										const values = condition.value?.split(',').map((v: string) => v.trim()) || [];
										if (values.length > 0) {
											const placeholders = values.map(() => '?').join(', ');
											conditions.push(`"${condition.column}" ${condition.operator} (${placeholders})`);
											whereParams.push(...values);
										}
									} else if (condition.operator === 'LIKE' || condition.operator === 'NOT LIKE') {
										conditions.push(`"${condition.column}" ${condition.operator} ?`);
										let searchValue = condition.value;
										// Auto-add wildcards for LIKE if not present
										if (condition.operator === 'LIKE' && !searchValue?.includes('%')) {
											searchValue = `%${searchValue}%`;
										}
										whereParams.push(searchValue);
									} else if (condition.value !== undefined && condition.value !== '') {
										conditions.push(`"${condition.column}" ${condition.operator} ?`);
										whereParams.push(condition.value);
									}
								}

								if (conditions.length > 0) {
									whereSql = ' WHERE ' + conditions.join(' AND ');
								}
							}

							const selectColumns = columns.length > 0 ? columns : ['*'];
							const columnList = selectColumns.includes('*') ? '*' : selectColumns.map(col => `"${col}"`).join(', ');

							let selectSql = `SELECT ${columnList} FROM "${tableName}"${whereSql}`;

							// Add ORDER BY
							const orderByConditions = this.getNodeParameter('orderBy.sort', i, []) as Array<{column: string, direction: string}>;
							if (orderByConditions.length > 0) {
								const orderClauses = orderByConditions.map(order => `"${order.column}" ${order.direction}`);
								selectSql += ' ORDER BY ' + orderClauses.join(', ');
							}

							if (limit) {
								selectSql += ` LIMIT ${limit}`;
							}

							const selectResponse = await CloudflareD1Utils.executeQuery(this, config, selectSql, whereParams);

							result = {
								success: selectResponse.result[0].success,
								results: selectResponse.result[0].results,
								meta: selectResponse.result[0].meta,
								rowsRead: selectResponse.result[0].meta?.rows_read || 0,
								count: selectResponse.result[0].results?.length || 0,
							};
							break;

						case 'update':
							const updateFields = this.getNodeParameter('updateFields.property', i, []) as Array<{name: string, value: any}>;
							const whereUpdateConditions = this.getNodeParameter('whereUpdate.condition', i, []) as Array<{column: string, operator: string, value: any}>;
							
							if (updateFields.length === 0) {
								throw new NodeOperationError(this.getNode(), 'At least one column must be specified for update');
							}

							const updateData: IDataObject = {};
							for (const field of updateFields) {
								if (!field.name) {
									throw new NodeOperationError(this.getNode(), 'Column name cannot be empty');
								}
								updateData[field.name] = field.value;
							}

							// Build WHERE clause with proper operator support
							let whereUpdateSql = '';
							const whereUpdateParams: any[] = [];

							if (whereUpdateConditions.length > 0) {
								const conditions: string[] = [];

								for (const condition of whereUpdateConditions) {
									if (condition.operator === 'IS NULL' || condition.operator === 'IS NOT NULL') {
										conditions.push(`"${condition.column}" ${condition.operator}`);
									} else if (condition.operator === 'IN') {
										const values = condition.value?.split(',').map((v: string) => v.trim()) || [];
										if (values.length > 0) {
											const placeholders = values.map(() => '?').join(', ');
											conditions.push(`"${condition.column}" ${condition.operator} (${placeholders})`);
											whereUpdateParams.push(...values);
										}
									} else if (condition.operator === 'LIKE') {
										conditions.push(`"${condition.column}" ${condition.operator} ?`);
										whereUpdateParams.push(condition.value);
									} else if (condition.value !== undefined && condition.value !== '') {
										conditions.push(`"${condition.column}" ${condition.operator} ?`);
										whereUpdateParams.push(condition.value);
									}
								}

								if (conditions.length > 0) {
									whereUpdateSql = conditions.join(' AND ');
								}
							}

							// Build UPDATE query manually with proper WHERE clause
							const updateColumns = Object.keys(updateData);
							const updateValues = Object.values(updateData);
							const setClause = updateColumns.map(col => `"${col}" = ?`).join(', ');

							let updateSql = `UPDATE "${tableName}" SET ${setClause}`;
							const updateParams = [...updateValues];

							if (whereUpdateSql) {
								updateSql += ` WHERE ${whereUpdateSql}`;
								updateParams.push(...whereUpdateParams);
							}

							const updateResponse = await CloudflareD1Utils.executeQuery(this, config, updateSql, updateParams);
							
							result = {
								success: updateResponse.result[0].success,
								results: updateResponse.result[0].results,
								meta: updateResponse.result[0].meta,
								rowsWritten: updateResponse.result[0].meta?.rows_written || 0,
								changes: updateResponse.result[0].meta?.changes || 0,
							};
							break;

						case 'delete':
							const whereDeleteConditions = this.getNodeParameter('whereDelete.condition', i, []) as Array<{column: string, operator: string, value: any}>;
							const deleteLimit = this.getNodeParameter('deleteLimit', i) as number | undefined;

							// Build WHERE clause with proper operator support
							let whereDeleteSql = '';
							const whereDeleteParams: any[] = [];

							if (whereDeleteConditions.length > 0) {
								const conditions: string[] = [];

								for (const condition of whereDeleteConditions) {
									if (condition.operator === 'IS NULL' || condition.operator === 'IS NOT NULL') {
										conditions.push(`"${condition.column}" ${condition.operator}`);
									} else if (condition.operator === 'IN') {
										const values = condition.value?.split(',').map((v: string) => v.trim()) || [];
										if (values.length > 0) {
											const placeholders = values.map(() => '?').join(', ');
											conditions.push(`"${condition.column}" ${condition.operator} (${placeholders})`);
											whereDeleteParams.push(...values);
										}
									} else if (condition.operator === 'LIKE') {
										conditions.push(`"${condition.column}" ${condition.operator} ?`);
										whereDeleteParams.push(condition.value);
									} else if (condition.value !== undefined && condition.value !== '') {
										conditions.push(`"${condition.column}" ${condition.operator} ?`);
										whereDeleteParams.push(condition.value);
									}
								}

								if (conditions.length > 0) {
									whereDeleteSql = conditions.join(' AND ');
								}
							}

							// Build DELETE query manually
							let deleteSql = `DELETE FROM "${tableName}"`;
							const deleteParams = [...whereDeleteParams];

							if (whereDeleteSql) {
								deleteSql += ` WHERE ${whereDeleteSql}`;
							}

							if (deleteLimit) {
								deleteSql += ` LIMIT ${deleteLimit}`;
							}

							const deleteResponse = await CloudflareD1Utils.executeQuery(this, config, deleteSql, deleteParams);
							
							result = {
								success: deleteResponse.result[0].success,
								results: deleteResponse.result[0].results,
								meta: deleteResponse.result[0].meta,
								rowsWritten: deleteResponse.result[0].meta?.rows_written || 0,
								changes: deleteResponse.result[0].meta?.changes || 0,
							};
							break;

						default:
							throw new NodeOperationError(this.getNode(), `Unknown table operation: ${operation}`);
					}
				} else if (resource === 'query') {
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
				} else if (resource === 'tableManagement') {
					// Handle table management operations
					const operation = this.getNodeParameter('operation', i) as string;
					
					switch (operation) {
						case 'createTable':
							const createTableName = this.getNodeParameter('createTableName', i) as string;
							const columns = this.getNodeParameter('columns.column', i, []) as any[];
							const options = this.getNodeParameter('createTableOptions', i, {}) as any;
							
							if (!columns || columns.length === 0) {
								throw new NodeOperationError(this.getNode(), 'At least one column must be defined');
							}
							
							const tableColumns = columns.map(col => ({
								name: col.name,
								type: col.type,
								primaryKey: col.primaryKey || false,
								autoIncrement: col.autoIncrement || false,
								notNull: col.notNull || false,
								unique: col.unique || false,
								defaultValue: col.defaultValue || undefined,
							}));
							
							const createOptions = {
								ifNotExists: options.ifNotExists !== false,
								withoutRowId: options.withoutRowId || false,
								strict: options.strict || false,
							};
							
							const createSql = CloudflareD1Utils.buildCreateTableSQL(createTableName, tableColumns, createOptions);
							const createResponse = await CloudflareD1Utils.executeQuery(this, config, createSql);
							
							result = {
								success: createResponse.result[0].success,
								tableName: createTableName,
								sql: createSql,
								meta: createResponse.result[0].meta,
							};
							break;
							
						case 'listTables':
							const tables = await CloudflareD1Utils.getTables(this, config);
							result = {
								success: true,
								tables,
								count: tables.length,
							};
							break;
							
						case 'getTableSchema':
							const schemaTable = this.getNodeParameter('schemaTable', i) as { mode: string; value: string } | string;
							const schemaTableName = typeof schemaTable === 'string' ? schemaTable : schemaTable.value;
							
							const schema = await CloudflareD1Utils.getTableSchema(this, config, schemaTableName);
							result = {
								success: true,
								...schema,
							};
							break;
							
						case 'dropTable':
							const dropTable = this.getNodeParameter('dropTable', i) as { mode: string; value: string } | string;
							const dropTableName = typeof dropTable === 'string' ? dropTable : dropTable.value;
							const dropIfExists = this.getNodeParameter('dropIfExists', i, true) as boolean;
							
							const dropSql = dropIfExists 
								? `DROP TABLE IF EXISTS "${dropTableName}"`
								: `DROP TABLE "${dropTableName}"`;
							
							const dropResponse = await CloudflareD1Utils.executeQuery(this, config, dropSql);
							
							result = {
								success: dropResponse.result[0].success,
								tableName: dropTableName,
								sql: dropSql,
								meta: dropResponse.result[0].meta,
							};
							break;
							
						default:
							throw new NodeOperationError(this.getNode(), `Unknown table management operation: ${operation}`);
					}
				} else if (resource === 'builder') {
					// Handle query builder operations
					const operation = this.getNodeParameter('operation', i) as string;
					const builderTable = this.getNodeParameter('builderTable', i) as { mode: string; value: string } | string;
					const tableName = typeof builderTable === 'string' ? builderTable : builderTable.value;
					
					switch (operation) {
						case 'queryBuilder':
							const queryColumns = this.getNodeParameter('queryColumns', i, []) as string[];
							const whereConditions = this.getNodeParameter('whereConditions.condition', i, []) as any[];
							const orderBy = this.getNodeParameter('orderBy.sort', i, []) as any[];
							const builderLimit = this.getNodeParameter('builderLimit', i, 0) as number;
							const builderOffset = this.getNodeParameter('builderOffset', i, 0) as number;
							
							const queryBuilder = {
								table: tableName,
								columns: queryColumns.length > 0 ? queryColumns : undefined,
								where: whereConditions.map(cond => ({
									field: cond.field,
									operator: cond.operator,
									value: cond.operator === 'IN' || cond.operator === 'NOT IN' 
										? cond.value?.split(',').map((v: string) => v.trim())
										: cond.value,
									value2: cond.value2,
								})),
								orderBy: orderBy.map(sort => ({
									field: sort.field,
									direction: sort.direction,
								})),
								limit: builderLimit || undefined,
								offset: builderOffset || undefined,
							};
							
							const { sql: querySql, params: queryParams } = CloudflareD1Utils.buildQueryFromBuilder(queryBuilder);
							const queryResponse = await CloudflareD1Utils.executeQuery(this, config, querySql, queryParams);
							
							result = {
								success: queryResponse.result[0].success,
								results: queryResponse.result[0].results,
								meta: queryResponse.result[0].meta,
								sql: querySql,
							};
							break;
							
						case 'aggregateQuery':
							const aggregateFunction = this.getNodeParameter('aggregateFunction', i) as string;
							const aggregateColumn = this.getNodeParameter('aggregateColumn', i, '') as string;
							const aggregateWhere = this.getNodeParameter('whereConditions.condition', i, []) as any[];
							const groupBy = this.getNodeParameter('groupBy', i, []) as string[];
							
							const aggregateQuery: D1AggregateQuery = {
								table: tableName,
								function: aggregateFunction as D1AggregateFunction,
								column: aggregateColumn || undefined,
								where: aggregateWhere.map(cond => ({
									field: cond.field,
									operator: cond.operator as D1WhereOperator,
									value: cond.operator === 'IN' || cond.operator === 'NOT IN'
										? cond.value?.split(',').map((v: string) => v.trim())
										: cond.value,
									value2: cond.value2,
								})),
								groupBy: groupBy.length > 0 ? groupBy : undefined,
							};
							
							const { sql: aggSql, params: aggParams } = CloudflareD1Utils.buildAggregateQuery(aggregateQuery);
							const aggResponse = await CloudflareD1Utils.executeQuery(this, config, aggSql, aggParams);
							
							result = {
								success: aggResponse.result[0].success,
								results: aggResponse.result[0].results,
								meta: aggResponse.result[0].meta,
								sql: aggSql,
							};
							break;
							
						case 'getDistinctValues':
							const distinctColumn = this.getNodeParameter('distinctColumn', i) as string;
							
							const distinctSql = `SELECT DISTINCT "${distinctColumn}" FROM "${tableName}" WHERE "${distinctColumn}" IS NOT NULL ORDER BY "${distinctColumn}"`;
							const distinctResponse = await CloudflareD1Utils.executeQuery(this, config, distinctSql);
							
							result = {
								success: distinctResponse.result[0].success,
								results: distinctResponse.result[0].results,
								meta: distinctResponse.result[0].meta,
								column: distinctColumn,
								values: distinctResponse.result[0].results.map((row: any) => row[distinctColumn]),
							};
							break;
							
						case 'tableStatistics':
							const stats = await CloudflareD1Utils.getTableStatistics(this, config, tableName);
							result = {
								success: true,
								...stats,
							};
							break;
							
						default:
							throw new NodeOperationError(this.getNode(), `Unknown builder operation: ${operation}`);
					}
				} else if (resource === 'memory') {
					// Handle memory operations
					const operation = this.getNodeParameter('operation', i) as string;
					
					switch (operation) {
						case 'getChatHistory':
							const sessionId = this.getNodeParameter('sessionId', i) as string;
							const messageTypes = this.getNodeParameter('messageTypes', i, ['human', 'ai']) as string[];
							const memoryLimit = this.getNodeParameter('memoryLimit', i, 50) as number;
							const sortOrder = this.getNodeParameter('sortOrder', i, 'ASC') as 'ASC' | 'DESC';
							
							result = await CloudflareD1Utils.getChatHistory(
								this,
								config,
								sessionId,
								messageTypes,
								memoryLimit,
								sortOrder
							);
							break;
							
						case 'searchMessages':
							const searchQuery = this.getNodeParameter('searchQuery', i) as string;
							const searchSessionId = this.getNodeParameter('searchSessionId', i, '') as string;
							const searchMessageTypes = this.getNodeParameter('searchMessageTypes', i, ['human', 'ai']) as string[];
							const searchLimit = this.getNodeParameter('searchLimit', i, 20) as number;
							const enableFuzzySearch = this.getNodeParameter('enableFuzzySearch', i, false) as boolean;
							
							result = await CloudflareD1Utils.searchMessages(
								this,
								config,
								searchQuery,
								searchSessionId || undefined,
								searchMessageTypes,
								searchLimit,
								enableFuzzySearch
							);
							break;
							
						case 'getRecentMessages':
							const recentSessionId = this.getNodeParameter('sessionId', i) as string;
							const recentLimit = this.getNodeParameter('memoryLimit', i, 10) as number;
							
							result = await CloudflareD1Utils.getRecentMessages(
								this,
								config,
								recentSessionId,
								recentLimit
							);
							break;
							
						case 'getSessionList':
							result = await CloudflareD1Utils.getSessionList(this, config);
							break;
							
						case 'clearSession':
							const clearSessionId = this.getNodeParameter('sessionId', i) as string;
							result = await CloudflareD1Utils.clearSession(this, config, clearSessionId);
							break;
							
						default:
							throw new NodeOperationError(this.getNode(), `Unknown memory operation: ${operation}`);
					}
				} else if (resource === 'database') {
					// Handle database operations
					const operation = this.getNodeParameter('operation', i) as string;
					
					switch (operation) {
						case 'exportDatabase':
							const exportResult = await CloudflareD1Utils.exportDatabase(this, config);
							result = exportResult;
							break;
							
						case 'importDatabase':
							const importSql = this.getNodeParameter('importSql', i) as string;
							const importResult = await CloudflareD1Utils.importDatabase(this, config, importSql);
							result = importResult;
							break;
							
						case 'getDatabaseInfo':
							const dbInfo = await CloudflareD1Utils.getDatabaseInfo(this, config);
							result = {
								success: true,
								...dbInfo,
							};
							break;
							
						case 'listDatabases':
							const databases = await CloudflareD1Utils.listDatabases(this, config);
							result = {
								success: true,
								databases,
								count: databases.length,
							};
							break;
							
						default:
							throw new NodeOperationError(this.getNode(), `Unknown database operation: ${operation}`);
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