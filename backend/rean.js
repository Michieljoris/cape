//rean.js
var Path = require('path') ;
require('logthis').config({ _on: true,
                            'rean.js': 'debug',
                            'mailbox.js': 'debug',
                            'postoffice.js': 'debug',
                            'reception.js': 'debug'
                          });
var log = require('logthis').logger._create(Path.basename(__filename));


var VOW = require('dougs_vow');
var vouchdb = require("vouchdb");
var reception = require('./reception');
var postoffice = require('./postoffice');

var mailbox = require('./mailbox');





//Make sure there is a couchdb instance and that it is not in party mode, if so
//set admin to credentials that have been passed in.
function initCouch(couchdb) {
    vouchdb.connect('http://' + couchdb.url);
    
    var vow = VOW.make();
    vouchdb.info().when(
        function(data) {
            log('\nCouchDB:\n', data);
            //test for party mode:
            return vouchdb.config();
        }
    ).when(
        function(data) {
            //in partymode, so set admin:
            log('In party mode, fixing..');
            vouchdb.config('admins', couchdb.admin, couchdb.pwd).when(
                vow.keep, vow.breek
            );
        }
        ,function(err) {
            if (err && err.status === 401 && err.reason !== 'unauthorized' ) {
                log(err);
                vow.breek(err);
                return;
            }
            //not in party mode, couchdb config is not accessible,
            //test given couchdb credentials
            log('Not in party mode, testing login..');
            vouchdb.login(couchdb.admin, couchdb.pwd).when(
                vow.keep, vow.breek
            );
        }
    );
    return vow.promise;
}

// function test() {
//     vouchdb.docSave({ a: 'bla' }, 'public' ).when(
//         function(data) { log(data); }
//         ,function(err) { log(err); }
//     );
// }


//Main file that starts the node cape process.
function start(config) {
    log('\nConfig:\n', config);
    initCouch(config.couchdb)
        .when(
            function(data) {
                log('CouchDB is ok');
                return mailbox.connect(config.couchdb, 'reception', reception);
            })
        .when(
            function(data) {
                log('Reception is ok');
                return mailbox.connect(config.couchdb, 'postoffice', postoffice);
            })
        .when(
            function(data) {
                log('Postoffice is ok');
            }
            ,function(error) {
                log('Error', error);
            }
        );
    
    config.agents.forEach(function(agent) {
        postoffice.register(agent);
    });
    
    
}

module.exports = {
    start:start
};




start({
    couchdb: {
        admin: 'admin', pwd: 'irma', url: 'localhost:5984'
    }
    ,agents: []
});
