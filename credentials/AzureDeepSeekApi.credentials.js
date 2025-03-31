// @ts-check

class AzureDeepSeekApi {
	constructor() {
		this.name = 'azureDeepSeekApi';
		this.displayName = 'Azure DeepSeek API';
		this.documentationUrl = 'https://aka.ms/azure-ai-foundry-docs';
		this.properties = [
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
}

module.exports = { AzureDeepSeekApi };