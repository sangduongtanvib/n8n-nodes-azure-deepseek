module.exports = {
	nodeTypes: [
		require('./nodes/AzureDeepSeekNode').AzureDeepSeekNode,
	],
	credentialTypes: [
		require('./credentials/AzureDeepSeekApi').AzureDeepSeekApi,
	],
};