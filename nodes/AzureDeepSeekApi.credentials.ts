import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AzureDeepSeekApi implements ICredentialType {
	name = 'azureDeepSeekApi';
	displayName = 'Azure DeepSeek API';
	documentationUrl = 'https://aka.ms/azure-ai-foundry-docs';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'The API key for your Azure DeepSeek model deployment',
		},
		{
			displayName: 'Inference Endpoint',
			name: 'inferenceEndpoint',
			type: 'string',
			default: '',
			placeholder: 'https://YOUR_RESOURCE_NAME.services.ai.azure.com/models',
			required: true,
			description: 'The Azure AI Foundry model inference endpoint',
		},
		{
			displayName: 'Model Deployment Name',
			name: 'modelDeploymentName',
			type: 'string',
			default: 'DeepSeek-V3',
			required: true,
			description: 'The deployment name of your Azure DeepSeek model',
		},
	];
}