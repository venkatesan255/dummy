const RequestBuilder = require('./requestBuilder');
const ConfigParser = require('./configParser');

let config = {};
const requestBuilder = new RequestBuilder();

load.initialize('Initialize', async function() {

	config = new ConfigParser('api_config.yaml');
	const initApis = config.getApisByPhase('init');

	for(const apiConfig of initApis) {
	    const request = requestBuilder.build(apiConfig);
        load.log(request);
	    const response = request.sendSync();

	}
});

load.action('Action', async function() {
	const actionApis = config.getApisByPhase('action');

	for(const apiConfig of actionApis) {
	    const request = requestBuilder.build(apiConfig);
	    const response = request.sendSync();
	}

	load.log(actionApis);
});

load.finalize('Finalize', async function() {

	const finalApis = config.getApisByPhase('end');
    	load.log(finalApis);
});
