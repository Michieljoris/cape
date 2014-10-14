//rean.js
var Path = require('path') ;
require('logthis').config({ _on: true,
                            'rean.js': 'debug',
                            'mailbox.js': 'debug',
                            'postoffice.js': 'debug',
                            'reception.js': 'debug'
                          });
var log = require('logthis').logger._create(Path.basename(__filename));

var config = require('./config');
var VOW = require('dougs_vow');
var vouchdb = require("vouchdb");
var reception = require('./reception');
var postoffice = require('./postoffice');

var mailbox = require('./mailbox');

function initOneDatabase(db) {
    var vow = VOW.make();
    
    
    return vow.promise;
}

function initDatabases(couchdb) {
    var vows = [];
    Object.keys(couchdb).forEach(function(db) {
        vows.push(initOneDatabase(db));
    });
}


//Make sure there is a couchdb instance and that it is not in party mode, if so
//set admin to credentials that have been passed in.
function initCouch(couchdb) {
    if (couchdb.url.indexOf('http://') === 0) {
        couchdb.url = couchdb.url.slice(7);
    };
    vouchdb.connect('http://' + couchdb.url);
    
    var vow = VOW.make();
    vouchdb.info().when(
        function(data) {
            log('\nCouchDB info:\n', data);
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
                //we tried to access config, but the error is other than unauthorized
                //something else is going on
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

//Main function that starts the node cape process.

//Example config:
//{    couchdb: {
//         admin: 'admin', pwd: 'pwd', url: 'localhost:5984'
//     }
//}
function start(connect) {
    log('\nCape config:\n', config);
    //ensure couchdb is running and is not in party mode
    initCouch(connect.couchdb)
        .when(
            function(data) {
                log('CouchDB is ok');
                return initDatabases(config.couchdb);
            })
        .when(
            function(data) {
                log('Installed design docs');
                return mailbox.connect(connect.couchdb, config.couchdb.reception.name,
                                       reception);
            })
        .when(
            function(data) {
                log('Reception is ok');
                return mailbox.connect(connect.couchdb, config.couchdb.postoffice.name,
                                       postoffice);
            })
        .when(
            function(data) {
                log('Postoffice is ok');
            }
            ,function(error) {
                log._e('Error initing cape', error);
            }
        );
    
    // config.agents.forEach(function(agent) {
    //     postoffice.register(agent);
    // });
    
    
}

module.exports = {
    start:start
};


start({
    couchdb: {
        //TODO this should come from environment or other external source
        admin: 'admin', pwd: 'irma', url: 'localhost:5984'
    }
    ,agents: []
});
