class RequestBuilder {
    constructor() {
        this._requestCounter = 1;
        load.log('RequestBuilder initialized', load.LogLevel.debug);
    }

    /**
     * Builds a LoadRunner WebRequest with proper extractors and token handling
     * @param {Object} apiConfig - API configuration from YAML
     * @returns {load.WebRequest} Configured request
     */
    build(apiConfig) {
        const requestId = this._requestCounter++;

        // Create extractors first so they're available for token replacement
        const extractors = this._createExtractors(apiConfig);

        // Process the request with token replacement
        const request = new load.WebRequest({
            id: requestId,
            name: apiConfig.name || `request_${requestId}`,
            url: apiConfig.url,
            method: (apiConfig.method || 'GET').toUpperCase(),
            headers: this._processHeaders(apiConfig.headers || {}),
            body: this._processPayload(apiConfig.payload),
            extractors
        });

        load.log(`Built request #${requestId}: ${apiConfig.name}`, load.LogLevel.debug);
        return request;
    }

    _createExtractors(apiConfig) {
        const extractors = [];
        const mapping = apiConfig.response_mapping?.extractors || {};

        for (const [paramName, jsonPath] of Object.entries(mapping)) {
            try {
                extractors.push(new load.JsonPathExtractor(paramName, jsonPath));
                load.log(`Added extractor: ${extractorName} = ${jsonPath}`, load.LogLevel.trace);
            } catch (error) {
                load.log(`Failed to create extractor ${paramName}: ${error.message}`, load.LogLevel.warning);
            }
        }

        return extractors;
    }

    _replaceTokens(text) {
        if (typeof text !== 'string') return text;

        return text.replace(/\$\{([^}]+)\}/g, (match, tokenName) => {
            // First try LoadRunner's extracted values
            if (load.extractors && load.extractors[tokenName]) {
                return load.extractors[tokenName];
            }
            // Fallback to environment or other tokens if needed
            return match;
        });
    }

    _processHeaders(headers) {
        const processed = {};
        for (const [key, value] of Object.entries(headers)) {
            processed[key] = this._replaceTokens(value);
        }
        return processed;
    }

    _processPayload(payload) {
        if (!payload) return null;

        try {
            const payloadStr = typeof payload === 'object'
                ? JSON.stringify(payload)
                : String(payload);

            const processed = this._replaceTokens(payloadStr);

            return typeof payload === 'object'
                ? JSON.parse(processed)
                : processed;
        } catch (error) {
            load.log(`Payload processing failed: ${error.message}`, load.LogLevel.error);
            return payload;
        }
    }
}

module.exports = RequestBuilder;