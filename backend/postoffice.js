//postoffice.jsv

var VOW = require('dougs_vow');
var follow = require("follow");
var vouchdb = require("vouchdb");

function connect(couchdb) {
    
    var config = {
        db: 'http://' + couchdb.username + ':' + couchdb.pwd + '@'  +
            couchdb.url + '/postoffice',
        include_docs: true,
        since: "now"
    };
    console.log(config);

    var changes = follow(config, function(error, change) {
        if(!error) {
            console.log(change);
            console.log("Postoffice: Change " + change.seq + " has " + Object.keys(change.doc).length + " fields");
        }
    });
  
}
  
module.exports = {
    connect: connect
};

