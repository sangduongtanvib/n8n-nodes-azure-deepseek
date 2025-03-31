import { IExecuteFunctions } from 'n8n-workflow';
import { INodeExecutionData, INodeType, INodeTypeDescription, NodeConnectionType, IDataObject } from 'n8n-workflow';
import ModelClient from '@azure-rest/ai-inference';
import { AzureKeyCredential } from '@azure/core-auth';

export class AzureDeepSeekNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Azure DeepSeek LLM',
		name: 'azureDeepSeekLlm',
		icon: 'file:deepseek.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with DeepSeek LLM on Azure AI Foundry',
		defaults: {
			name: 'Azure DeepSeek LLM',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'azureDeepSeekApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Chat Completion',
						value: 'chatCompletion',
						description: 'Generate a chat completion using DeepSeek model',
					},
				],
				default: 'chatCompletion',
			},
			{
				displayName: 'Messages',
				name: 'messages',
				type: 'json',
				typeOptions: {
					rows: 4,
				},
				displayOptions: {
					show: {
						operation: ['chatCompletion'],
					},
				},
				default: '[\n  {\n    "role": "system",\n    "content": "You are a helpful assistant."\n  },\n  {\n    "role": "user",\n    "content": "Hello!"\n  }\n]',
				description: 'The messages to send to the model in JSON format',
				required: true,
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['chatCompletion'],
					},
				},
				options: [
					{
						displayName: 'Temperature',
						name: 'temperature',
						type: 'number',
						default: 0.7,
						typeOptions: {
							minValue: 0,
							maxValue: 2,
						},
						description: 'Controls randomness: 0 is deterministic, higher values are more random',
					},
					{
						displayName: 'Max Tokens',
						name: 'maxTokens',
						type: 'number',
						default: 1000,
						description: 'The maximum number of tokens to generate',
					},
					{
						displayName: 'Top P',
						name: 'topP',
						type: 'number',
						default: 0.95,
						typeOptions: {
							minValue: 0,
							maxValue: 1,
						},
						description: 'Controls diversity: 0.1 is conservative, 1.0 is diverse',
					},
					{
						displayName: 'Frequency Penalty',
						name: 'frequencyPenalty',
						type: 'number',
						default: 0,
						typeOptions: {
							minValue: -2,
							maxValue: 2,
						},
						description: 'Penalizes new tokens based on their frequency in the text so far',
					},
					{
						displayName: 'Presence Penalty',
						name: 'presencePenalty',
						type: 'number',
						default: 0,
						typeOptions: {
							minValue: -2,
							maxValue: 2,
						},
						description: 'Penalizes new tokens based on whether they appear in the text so far',
					},
					{
						displayName: 'Stream',
						name: 'stream',
						type: 'boolean',
						default: false,
						description: 'Whether to stream the response',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;

			if (operation === 'chatCompletion') {
				// Get credentials from n8n's credential store
				const credentials = await this.getCredentials('azureDeepSeekApi');
				
				// Create Azure AI Inference client
				const client = ModelClient(
					credentials.inferenceEndpoint as string, 
					new AzureKeyCredential(credentials.apiKey as string)
				);
				
				// Get parameters
				const messages = JSON.parse(this.getNodeParameter('messages', i) as string);
				const additionalOptions = this.getNodeParameter('additionalOptions', i) as {
					temperature?: number;
					maxTokens?: number;
					topP?: number;
					frequencyPenalty?: number;
					presencePenalty?: number;
					stream?: boolean;
				};

				// Prepare request
				const requestBody = {
					messages: messages,
					max_tokens: additionalOptions.maxTokens ?? 1000,
					temperature: additionalOptions.temperature ?? 0.7,
					top_p: additionalOptions.topP ?? 0.95,
					frequency_penalty: additionalOptions.frequencyPenalty ?? 0,
					presence_penalty: additionalOptions.presencePenalty ?? 0,
					model: credentials.modelDeploymentName as string,
					stream: additionalOptions.stream ?? false,
				};

				try {
					// Use the client directly instead of the path method
					// The SDK might have a specific way to call chat completions
					// For now, we'll use a direct fetch to the endpoint
					const url = `${credentials.inferenceEndpoint as string}/chat/completions`;
					
					const response = await fetch(url, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'api-key': credentials.apiKey as string,
						},
						body: JSON.stringify(requestBody),
					});
					
					if (!response.ok) {
						const errorData = await response.json() as { error?: { message?: string } };
						throw new Error(`Azure DeepSeek LLM error: ${errorData.error?.message || response.statusText}`);
					}
					
					// Get the response as JSON and convert to IDataObject
					const responseData = await response.json();
					
					// Create output item with data
					const newItem: INodeExecutionData = {
						json: responseData as IDataObject,
						pairedItem: { item: i },
					};
					
					returnData.push(newItem);
				} catch (error) {
					// Handle the error appropriately
					if (error.response) {
						throw new Error(`Azure DeepSeek LLM error: ${error.response.data?.error?.message || error.message}`);
					}
					throw error;
				}
			}
		}

		return [returnData];
	}
}