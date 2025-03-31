import { IExecuteFunctions } from 'n8n-workflow';
import { INodeExecutionData, INodeType, INodeTypeDescription, NodeConnectionType, IDataObject } from 'n8n-workflow';
import { AzureKeyCredential } from '@azure/core-auth';
import axios, { AxiosError, AxiosResponse } from 'axios';

// Định nghĩa kiểu dữ liệu cho đối tượng error
interface AzureErrorResponse {
	error?: {
		message?: string;
		code?: string;
	};
}

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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;

			if (operation === 'chatCompletion') {
				// Get credentials from n8n's credential store
				const credentials = await this.getCredentials('azureDeepSeekApi');
				
				// Get parameters
				const systemPrompt = this.getNodeParameter('systemPrompt', i) as string;
				const userPrompt = this.getNodeParameter('userPrompt', i) as string;
				const additionalOptions = this.getNodeParameter('additionalOptions', i) as {
					temperature?: number;
					maxTokens?: number;
					topP?: number;
					frequencyPenalty?: number;
					presencePenalty?: number;
					stream?: boolean;
				};
				
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

				// Prepare request body - note model name is now explicitly "DeepSeek-V3" if not specified
				const requestBody = {
					messages: messages,
					max_tokens: additionalOptions.maxTokens ?? 1000,
					temperature: additionalOptions.temperature ?? 0.7,
					top_p: additionalOptions.topP ?? 0.95,
					frequency_penalty: additionalOptions.frequencyPenalty ?? 0,
					presence_penalty: additionalOptions.presencePenalty ?? 0,
					model: (credentials.modelDeploymentName as string) || 'DeepSeek-V3',
					stream: additionalOptions.stream ?? false,
				};

				try {
					// Updated URL format with api-version parameter
					const apiVersion = '2024-05-01-preview';
					const url = `${credentials.inferenceEndpoint as string}/models/chat/completions?api-version=${apiVersion}`;
					
					// Sử dụng axios thay vì fetch để có timeout rõ ràng
					const response = await axios.post(url, requestBody, {
						headers: {
							'Content-Type': 'application/json',
							'api-key': credentials.apiKey as string,
						},
						timeout: 60000, // Timeout 60 giây, có thể điều chỉnh tùy nhu cầu
						validateStatus: (status) => status < 500, // Chỉ từ chối khi có lỗi server
					});
					
					if (response.status !== 200) {
						throw new Error(`Azure DeepSeek LLM error: ${response.data?.error?.message || response.statusText || 'Unknown error'}`);
					}
					
					// Get the response data
					const responseData = response.data;
					
					// Create output item with data
					const newItem: INodeExecutionData = {
						json: responseData as IDataObject,
						pairedItem: { item: i },
					};
					
					returnData.push(newItem);
				} catch (error) {
					// Xử lý các lỗi timeout riêng biệt
					const axiosError = error as AxiosError;
					if (axiosError.code === 'ECONNABORTED') {
						throw new Error('Azure DeepSeek LLM timeout: The request took too long to complete. Please try again later.');
					}
					
					// Xử lý các lỗi khác
					if (axiosError.response) {
						const errorData = axiosError.response.data as AzureErrorResponse;
						throw new Error(`Azure DeepSeek LLM error: ${errorData?.error?.message || axiosError.message}`);
					} else if (axiosError.request) {
						throw new Error(`Azure DeepSeek LLM network error: No response received from server. Please check your network connection and Azure endpoint.`);
					}
					throw error;
				}
			}
		}

		return [returnData];
	}
}