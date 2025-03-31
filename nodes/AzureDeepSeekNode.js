// @ts-check
const axios = require('axios');

class AzureDeepSeekNode {
	constructor() {
		this.description = {
			displayName: 'Azure DeepSeek LLM',
			name: 'azureDeepSeekLlm',
			// Fix icon reference - use the node's own SVG file
			icon: 'n8n-nodes-azure-deepseek.svg',
			group: ['transform'],
			version: 1,
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Interact with DeepSeek LLM on Azure AI Foundry',
			defaults: {
				name: 'Azure DeepSeek LLM',
			},
			inputs: ['main'],
			outputs: ['main'],
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
							action: 'Generate a chat completion using DeepSeek model',
						},
						{
							name: 'LLM Chain',
							value: 'llmChain',
							description: 'Use DeepSeek as part of an AI agent chain',
							action: 'Use DeepSeek as part of an AI agent chain',
						},
					],
					default: 'chatCompletion',
				},
				// Configuration for LLM Chain - This is required for Agent compatibility
				{
					displayName: 'Text',
					name: 'text',
					type: 'string',
					displayOptions: {
						show: {
							operation: ['llmChain'],
						},
					},
					default: '={{$json["input"]}}',
					description: 'Text to process with the language model',
					required: true,
				},
				{
					displayName: 'Options',
					name: 'options',
					type: 'collection',
					placeholder: 'Add Option',
					displayOptions: {
						show: {
							operation: ['llmChain'],
						},
					},
					default: {},
					options: [
						{
							displayName: 'Model',
							name: 'model',
							type: 'string',
							default: 'DeepSeek-V3',
							description: 'The deployed model name to use',
						},
						{
							displayName: 'Sampling Temperature',
							name: 'temperature',
							type: 'number',
							default: 0.7,
							description: 'Controls randomness: 0 is deterministic, higher values are more random',
							typeOptions: {
								minValue: 0,
								maxValue: 2,
							},
						},
						{
							displayName: 'Maximum Length in Tokens',
							name: 'maxTokens',
							type: 'number',
							default: 1000,
							description: 'The maximum number of tokens to generate',
						},
					],
				},
				// Original properties for chat completion
				{
					displayName: 'System Prompt',
					name: 'systemPrompt',
					type: 'string',
					typeOptions: {
						rows: 3,
					},
					displayOptions: {
						show: {
							operation: ['chatCompletion'],
						},
					},
					default: 'You are a helpful assistant.',
					description: 'The system message that sets behavior of the assistant',
					placeholder: 'You are a helpful assistant specialized in...',
				},
				{
					displayName: 'User Prompt',
					name: 'userPrompt',
					type: 'string',
					typeOptions: {
						rows: 4,
					},
					displayOptions: {
						show: {
							operation: ['chatCompletion'],
						},
					},
					default: '',
					description: 'The prompt from the user to send to the model',
					placeholder: 'Write your prompt here...',
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
	}

	async execute() {
		const items = this.getInputData();
		const returnData = [];

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i);
			
			// Get credentials from n8n's credential store
			const credentials = await this.getCredentials('azureDeepSeekApi');

			if (operation === 'llmChain') {
				// Handle LLM Chain operations - required for Agent compatibility
				const text = this.getNodeParameter('text', i);
				const options = this.getNodeParameter('options', i);

				try {
					// Format messages for Azure DeepSeek LLM API
					const messages = [
						{
							role: 'user',
							content: text,
						},
					];

					// Prepare request body for LLM chain operation
					const requestBody = {
						messages: messages,
						max_tokens: options.maxTokens ?? 1000,
						temperature: options.temperature ?? 0.7,
						model: options.model || credentials.modelDeploymentName || 'DeepSeek-V3',
						stream: false,
					};

					// Use the same URL handling and API calls as in chatCompletion
					const apiVersion = '2023-12-01-preview';
					
					// Clean and format the endpoint URL
					let baseUrl = credentials.inferenceEndpoint.trim();
					if (baseUrl.endsWith('/')) {
						baseUrl = baseUrl.slice(0, -1);
					}

					// Determine the correct URL format based on the endpoint structure
					let url;
					if (baseUrl.includes('/openai')) {
						url = `${baseUrl}/deployments/${credentials.modelDeploymentName.trim()}/chat/completions?api-version=${apiVersion}`;
					} else if (baseUrl.includes('/models')) {
						url = `${baseUrl}/chat/completions?api-version=${apiVersion}`;
					} else {
						url = `${baseUrl}/deployments/${credentials.modelDeploymentName.trim()}/chat/completions?api-version=${apiVersion}`;
					}

					console.log(`Making LLM Chain request to: ${url}`); // Helpful for debugging

					const response = await axios.post(url, requestBody, {
						headers: {
							'Content-Type': 'application/json',
							'api-key': credentials.apiKey,
						},
						timeout: 90000, // Extended timeout to 90 seconds
						validateStatus: null, // Handle all status codes in the catch block
					});
					
					if (response.status !== 200) {
						throw new Error(`Azure DeepSeek LLM error: ${
							response.data?.error?.message || 
							response.data?.message || 
							response.statusText || 
							`Status code ${response.status}`
						}`);
					}

					// Format the response for LLM chain compatibility
					const assistantMessage = response.data?.choices?.[0]?.message?.content || '';
					
					// Structure output in the format expected by n8n Agent
					const newItem = {
						json: {
							text: assistantMessage,
							response: response.data,
						},
						pairedItem: { item: i },
					};
					
					returnData.push(newItem);
				} catch (error) {
					// Error handling with more detailed information
					if (error.code === 'ECONNABORTED') {
						throw new Error('Azure DeepSeek LLM timeout: The request took too long to complete. Please try again later.');
					}
					
					if (error.response) {
						const statusCode = error.response.status || 'unknown';
						const errorMessage = error.response.data?.error?.message || 
											error.response.data?.message ||
											error.message || 
											'Unknown error';
						throw new Error(`Azure DeepSeek LLM error (${statusCode}): ${errorMessage}`);
					} else if (error.request) {
						throw new Error(`Azure DeepSeek LLM network error: No response received from server. Please check your network connection and Azure endpoint.`);
					}
					throw error;
				}
			} else if (operation === 'chatCompletion') {
				// Get parameters
				const systemPrompt = this.getNodeParameter('systemPrompt', i);
				const userPrompt = this.getNodeParameter('userPrompt', i);
				const additionalOptions = this.getNodeParameter('additionalOptions', i);
				
				// Create messages array
				const messages = [
					{
						role: 'system',
						content: systemPrompt,
					},
					{
						role: 'user',
						content: userPrompt,
					},
				];

				// Prepare request body
				const requestBody = {
					messages: messages,
					max_tokens: additionalOptions.maxTokens ?? 1000,
					temperature: additionalOptions.temperature ?? 0.7,
					top_p: additionalOptions.topP ?? 0.95,
					frequency_penalty: additionalOptions.frequencyPenalty ?? 0,
					presence_penalty: additionalOptions.presencePenalty ?? 0,
					stream: additionalOptions.stream ?? false,
				};

				try {
					// Using best practices for Azure OpenAI-compatible endpoints
					// Need to be flexible with endpoint formats to ensure it works with all Azure configurations
					const inferenceEndpoint = credentials.inferenceEndpoint.trim();
					const modelName = credentials.modelDeploymentName.trim();
					const apiVersion = '2023-12-01-preview'; // Using a more widely supported API version

					// Clean and format the endpoint URL
					let baseUrl = inferenceEndpoint;
					if (baseUrl.endsWith('/')) {
						baseUrl = baseUrl.slice(0, -1);
					}

					// Determine the correct URL format based on the endpoint structure
					let url;
					if (baseUrl.includes('/openai')) {
						// Format for Azure OpenAI Service endpoint
						url = `${baseUrl}/deployments/${modelName}/chat/completions?api-version=${apiVersion}`;
					} else if (baseUrl.includes('/models')) {
						// Format for Azure AI Foundry endpoint with /models path
						url = `${baseUrl}/chat/completions?api-version=${apiVersion}`;
					} else {
						// General format that might work with other Azure AI services
						url = `${baseUrl}/deployments/${modelName}/chat/completions?api-version=${apiVersion}`;
					}

					console.log(`Making request to: ${url}`); // Helpful for debugging

					const response = await axios.post(url, requestBody, {
						headers: {
							'Content-Type': 'application/json',
							'api-key': credentials.apiKey,
						},
						timeout: 90000, // Extended timeout to 90 seconds
						validateStatus: null, // Handle all status codes in the catch block
					});
					
					if (response.status !== 200) {
						throw new Error(`Azure DeepSeek LLM error: ${
							response.data?.error?.message || 
							response.data?.message || 
							response.statusText || 
							`Status code ${response.status}`
						}`);
					}
					
					// Get the response data
					const responseData = response.data;
					
					// Create output item with data
					const newItem = {
						json: responseData,
						pairedItem: { item: i },
					};
					
					returnData.push(newItem);
				} catch (error) {
					// Error handling with more detailed information
					if (error.code === 'ECONNABORTED') {
						throw new Error('Azure DeepSeek LLM timeout: The request took too long to complete. Please try again later.');
					}
					
					if (error.response) {
						const statusCode = error.response.status || 'unknown';
						const errorMessage = error.response.data?.error?.message || 
											error.response.data?.message ||
											error.message || 
											'Unknown error';
						throw new Error(`Azure DeepSeek LLM error (${statusCode}): ${errorMessage}`);
					} else if (error.request) {
						throw new Error(`Azure DeepSeek LLM network error: No response received from server. Please check your network connection and Azure endpoint.`);
					}
					throw error;
				}
			}
		}

		return [returnData];
	}
}

module.exports = { AzureDeepSeekNode };