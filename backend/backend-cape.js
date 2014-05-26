//backend-cape.js
var receptionist = require('./receptionist');
var postoffice = require('./postoffice');

//Main file that starts the node cap process.
function start(config) {
    console.log(config);
    
    receptionist.connect(config.couchdb);
    postoffice.connect(config.couchdb);
    
    config.agents.forEach(function(agent) {
        postoffice.register(agent);
    });
    
    
}

module.exports = {
    start:start
};
