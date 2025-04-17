import { IDataObject, INodeType, INodeTypeDescription, INodeTypes } from 'n8n-workflow';

import { AzureDeepSeekNode } from './nodes/AzureDeepSeekNode';
import { AzureDeepSeekApi } from './credentials/AzureDeepSeekApi.credentials';

export class NodeTypes implements INodeTypes {
	nodeTypes = {
		azureDeepSeekLlm: {
			sourcePath: __dirname + '/nodes/AzureDeepSeekNode.ts',
			type: new AzureDeepSeekNode(),
		},
	};

	credentialTypes = {
		azureDeepSeekApi: {
			sourcePath: __dirname + '/credentials/AzureDeepSeekApi.credentials.ts',
			type: new AzureDeepSeekApi(),
		},
	};

	getByName(nodeType: string): INodeType | undefined {
		return this.nodeTypes[nodeType]?.type;
	}

	getByNameAndVersion(nodeType: string, version?: number): INodeType {
		const node = this.getByName(nodeType);
		if (node === undefined) {
			throw new Error(`The node type "${nodeType}" is not known!`);
		}
		return node;
	}

	getKnownTypes(): IDataObject {
		const knownTypes: IDataObject = {};
		
		for (const nodeType in this.nodeTypes) {
			knownTypes[nodeType] = true;
		}

		return knownTypes;
	}
}