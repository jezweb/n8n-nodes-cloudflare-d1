import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class CloudflareD1Api implements ICredentialType {
	name = 'cloudflareD1Api';
	displayName = 'Cloudflare D1 API';
	documentationUrl = 'https://developers.cloudflare.com/d1/';
	properties: INodeProperties[] = [
		{
			displayName: 'Account ID',
			name: 'accountId',
			type: 'string',
			default: '',
			required: true,
			description: 'Your Cloudflare Account ID. You can find this in your Cloudflare Dashboard.',
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Your Cloudflare API Token with D1:Read and D1:Write permissions. Create this in your Cloudflare Profile > API Tokens.',
		},
		{
			displayName: 'API Endpoint',
			name: 'apiEndpoint',
			type: 'string',
			default: 'https://api.cloudflare.com/client/v4',
			description: 'The Cloudflare API endpoint. Leave default unless using a custom endpoint.',
		},
	];
}