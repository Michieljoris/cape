//postoffice.js
  
var follow = require("follow");

function connect(couchdb) {
    
    var config = {
        db: 'http://' + couchdb.username + ':' + couchdb.pwd + '@'  +
            couchdb.url + '/reception',
        include_docs: true,
        since: "now"
    };
    console.log(config);

    var changes = follow(config, function(error, change) {
        if(!error) {
            console.log(change);
            console.log("Reception: Change " + change.seq + " has " + Object.keys(change.doc).length + " fields");
        }
    });
  
}
  
module.exports = {
    connect: connect
};

