const yaml = require('js-yaml');
const {
    shouldRefreshToken,
    shouldSkipApi,
    refreshTokenIfNeeded,
    buildRequest,
    handleResponse,
    replaceTokensInText,
    replaceTokensInHeaders,
    replaceTokensInPayload
} = require('./helpers');

let apiConfig = {};
let requestId = 1;
const apiResults = {};
const tokens = {};
const completedApiNames = new Set();

function processApi(apiName) {
    const api = apiConfig[apiName];
    if (shouldSkipApi(api, completedApiNames)) {
        load.log(`Skipping ${api.name}, unmet dependency: ${api.depends_on}`, load.LogLevel.warn);
        return;
    }

    refreshTokenIfNeeded(apiName, tokens, processApi);
    const request = buildRequest(api, requestId++, tokens);

    const txn = new load.Transaction(api.name);
    txn.start();
    const response = request.sendSync();
    txn.stop();

    handleResponse(api, response, tokens, apiResults, completedApiNames);
}

// Initialization
load.initialize(async function () {
    try {
        const configFile = new load.File('api_config.yml');
        const content = configFile.read({ returnContent: true }).content;
        const data = yaml.load(content);
        apiConfig = data.api_config;

        for (const apiName of Object.keys(apiConfig)) {
            if (apiConfig[apiName].phase === 'init') {
                processApi(apiName);
            }
        }
    } catch (e) {
        load.log('Init error: ' + e.message, load.LogLevel.error);
    }
});

// Action
load.action('Action', async function () {
    try {
        for (const apiName of Object.keys(apiConfig)) {
            if (apiConfig[apiName].phase !== 'init') {
                processApi(apiName);
            }
        }

        load.log('Summary:');
        for (const apiName in apiResults) {
            load.log(`${apiName}: Status ${apiResults[apiName].status}`);
        }
    } catch (e) {
        load.log('Action error: ' + e.message, load.LogLevel.error);
    }
});
