class TokenManager {
    constructor() {
        this.tokens = {};
        this.tokenDependencies = {};
        load.log('TokenManager initialized', load.LogLevel.debug);
    }

    setToken(tokenName, tokenValue, expiresIn) {
        const expirationTime = new Date();
        expirationTime.setSeconds(expirationTime.getSeconds() + expiresIn - 60); // 60-second buffer

        this.tokens[tokenName] = {
            value: tokenValue,
            expiresAt: expirationTime
        };

        load.log(`Token ${tokenName} set to expire at ${expirationTime}`, load.LogLevel.debug);
    }

    getToken(tokenName) {
        const token = this.tokens[tokenName];
        if (!token) {
            load.log(`Token ${tokenName} not found`, load.LogLevel.debug);
            return null;
        }

        if (new Date() > token.expiresAt) {
            load.log(`Token ${tokenName} expired at ${token.expiresAt}`, load.LogLevel.debug);
            delete this.tokens[tokenName];
            return null;
        }

        return token.value;
    }

    isTokenValid(tokenName) {
        const isValid = this.getToken(tokenName) !== null;
        load.log(`Token ${tokenName} validity check: ${isValid}`, load.LogLevel.trace);
        return isValid;
    }

    registerDependency(apiName, dependsOn) {
        this.tokenDependencies[apiName] = dependsOn;
        load.log(`Registered dependency: ${apiName} depends on ${dependsOn}`, load.LogLevel.trace);
    }

    getDependency(apiName) {
        const dependency = this.tokenDependencies[apiName];
        load.log(`Retrieved dependency for ${apiName}: ${dependency}`, load.LogLevel.trace);
        return dependency;
    }
}

module.exports = new TokenManager();
