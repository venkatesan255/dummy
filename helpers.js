// helpers.js
module.exports = {
    shouldRefreshToken,
    shouldSkipApi,
    refreshTokenIfNeeded,
    buildRequest,
    handleResponse,
    replaceTokensInText,
    replaceTokensInHeaders,
    replaceTokensInPayload
};

function shouldRefreshToken() {
    return !load.global.authToken || !load.global.tokenExpiry || Date.now() > load.global.tokenExpiry;
}

function shouldSkipApi(api, completedApiNames) {
    return api.depends_on && !completedApiNames.has(api.depends_on);
}

function refreshTokenIfNeeded(apiName, tokens, processApi) {
    if (apiName !== 'login' && shouldRefreshToken()) {
        load.log("Token expired or missing. Re-authenticating...");
        processApi('login');
        tokens["authToken"] = load.global.authToken;
    }
}

function buildRequest(api, requestId, tokens) {
    const headers = replaceTokensInHeaders(api.headers || {}, tokens);
    let body = null;

    if (api.payload) {
        body = replaceTokensInPayload(api.payload, tokens);
        if (typeof body === 'object') body = JSON.stringify(body);
    }

    const extractors = [];
    const mappings = api.response_mapping?.extractors || {};
    for (const [key, path] of Object.entries(mappings)) {
        extractors.push(new load.JsonPathExtractor(key, path));
    }

    return new load.WebRequest({
        id: requestId,
        url: api.url,
        method: api.method || 'GET',
        headers,
        body,
        extractors
    });
}

function handleResponse(api, response, tokens, apiResults, completedApiNames) {
    load.log(`${api.name} Response: ${response.status}`);
    load.log(`${api.name} Body: ${response.body}`);
    apiResults[api.name] = { status: response.status };

    if (response.extractors) {
        for (const [key, value] of Object.entries(response.extractors)) {
            tokens[key] = value;
            load.log(`Extracted ${key}: ${value?.substring(0, 10)}...`);
        }

        if (api.name === 'login' && tokens["authToken"]) {
            load.global.authToken = tokens["authToken"];
            load.global.tokenExpiry = Date.now() + 600000; // 10 minutes
            load.log("Token stored in load.global.");
        }
    }

    if (response.status >= 200 && response.status < 300) {
        completedApiNames.add(api.name);
        load.log(`${api.name} succeeded`);
    } else {
        load.log(`${api.name} failed`, load.LogLevel.error);
    }
}

function replaceTokensInText(text, tokenMap) {
    for (const key in tokenMap) {
        text = text.replace(new RegExp(`{{${key}}}`, 'g'), tokenMap[key]);
    }
    return text;
}

function replaceTokensInHeaders(headers, tokenMap) {
    const newHeaders = {};
    for (const key in headers) {
        newHeaders[key] = replaceTokensInText(headers[key], tokenMap);
    }
    return newHeaders;
}

function replaceTokensInPayload(payload, tokenMap) {
    let str = typeof payload === 'object' ? JSON.stringify(payload) : payload;
    str = replaceTokensInText(str, tokenMap);
    try {
        return JSON.parse(str);
    } catch {
        return str;
    }
}
