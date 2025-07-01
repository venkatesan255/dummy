const RequestBuilder = require('./RequestBuilder');
const ConfigParser = require('./ConfigParser');

let config = new ConfigParser('api_config.yaml');
const requestBuilder = new RequestBuilder();

function executeApiRequest(apiList){
	
	for(const apiConfig of apiList) {
	    const request = requestBuilder.build(apiConfig);
	    const txn = new load.Transaction(apiConfig.name);
	    txn.start();
	    const response = request.sendSync();
	    txn.stop();
	}
}

load.initialize('Initialize', async function() {

	const apis = config.getApisByPhase(load.config.stage);
	executeApiRequest(apis);

});

load.action('Action', async function() {

	const apis = config.getApisByPhase(load.config.stage);
	executeApiRequest(apis);
	
});

load.finalize('Finalize', async function() {

	const apis = config.getApisByPhase(load.config.stage);
	executeApiRequest(apis);

});
