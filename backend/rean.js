//rean.js
//Run this file to start up the backend
//Control debug out put with logthis
//Configuration is in env.js and config.js

//Pass environment, config and list of agents to start: it then connects to a
//couchdb instance (from env.js), installing admin if needed, configuring it and
//creating and configuring databases and their design docs as spelled out in
//config.js after which it starts the agents as per the list passed into start.

var Path = require('path') ;
require('logthis').config({ _on: true,
                            "rean.js": 'debug',
                            'mailbox.js': 'debug',
                            'postoffice.js': 'debug',
                            'reception.js': 'debug',
                            'monitor.js': 'debug',
                            'purge.js': 'debug'
                          });
var log = require('logthis').logger._create(Path.basename(__filename));

var VOW = require('dougs_vow');
var vouchdb = require("vouchdb");

var __basePath = require('../__basePath');
var utils = require(__basePath + '/backend/lib/utils');
var Users = require(__basePath + '/backend/lib/users');

//Check whether it exists, create if necessary, then check for _design doc,
//create if necessary, set the doc to whats in config (db)
function initOneDatabase(db, wipeDesignDocs) {
    return vouchdb.dbEnsureExists(db.name)
        .when(
            function(info) {
                // log(info);
                var secObj = db.secObj || 
                    {"admins": {"names": [], "roles": []},
                     "members": {"names": [], "roles": []}};
                return vouchdb.dbSecurity(secObj, db.name);
            })
        .when(
            function(data) {
                var designDoc = utils.createDesignDoc(db._design);
                if (designDoc) { 
                    return vouchdb.docUpdate(designDoc, db.name);
                }
                else return VOW.kept(data);
            })
        .when(
            function(data) {
                return VOW.kept(data);
            }); 
}

function initDatabases(databases) {
    var vows = [];
    Object.keys(databases).forEach(function(db) {
        vows.push(initOneDatabase(databases[db], false));
    });
    return VOW.every(vows);
}


//Make sure there is a couchdb instance and that it is eot in party mode, if so
//set admin to credentials that have been passed in.
function initCouch(instance) {
    if (instance.url.indexOf('http://') === 0) {
        instance.url = instance.url.slice(7);
    };
    vouchdb.connect('http://' + instance.url);
    
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
            vouchdb.config('admins', instance.admin, instance.pwd).when(
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
            vouchdb.login(instance.admin, instance.pwd).when(
                vow.keep, vow.breek
            );
        }
    );
    return vow.promise;
}

function configCouch(config) {
    var vows = [];
    Object.keys(config).forEach(
        function(section) {
            Object.keys(config[section]).forEach(
                function configCouch(option) {
                    var value = config[section][option];
                    log(section, option, value);
                    vows.push(vouchdb.config(section, option, value));
                }
            );
        }
    );
    return VOW.every(vows);
}

//Main function that starts the node cape process.

//Example config:
//{    couchdb: {
//         admin: 'admin', pwd: 'pwd', url: 'localhost:5984'
//     }
//}
function start(env, config, agents) {
    var instance = {
        admin: env.couchdb.admin, pwd: env.couchdb.pwd, url: env.couchdb.url 
    };

    log('\nCape connecting to:\n', instance);
    //ensure couchdb is running and is not in party mode
    
    // vouchdb.connect('http://' + instance.admin + ':' + instance.pwd + '@' + instance.url);
    var databases = config.couchdb.databases;

    log('Initializing CouchDB');
    initCouch(instance)
        .when(
            function(data) {
                log('Configuring CouchDB');
                //connect as admin from now on, not using sessions.
                vouchdb.connect('http://' + instance.admin + ':' +
                                instance.pwd + '@' + instance.url);
                return configCouch(config.couchdb.config);
            })
        .when(
            function(data) {
                log('Creating system databases and installing design documents');
                return initDatabases(databases);
            })
        .when(
            function(data) {
                log("Creating/ensuring initial users");
                //empty arrays turn into a broken vow, we don't want that.
                if (!config.initialUsers || !config.initialUsers.length)
                    return VOW.kept();
                var vows = [];
                config.users.initialUsers.forEach(
                    function(user) {
                        vows.push(Users.ensureUserExists(user.email, user.pwd, user.name));
                    });
                return VOW.every(vows);
            })

        .when(
            function(data) {
                log("Creating user databases and configuring them");
                return Users.ensureUserDbsExist(config);
            })
        .when(
            function(data) {
                log('Finished setting up CouchDB');
                log('Starting agents');
                agents.forEach(function(agent) {
                    require('./agents/' + agent).init(env, config).work();
                    log('Agent started: ', agent);
                });
            },
            
            
            //     return monitor(databases);
            // })
            // .when(
            //     function(data) {
            //         log('Monitoring CouchDB');
            //         return mailbox.connect(info.couchdb, databases.reception.name,
            //                                reception);
            //     })
            // .when(
            //     function(data) {
            //         log('Reception is ok');
            //         return mailbox.connect(info.couchdb, databases.postoffice.name,
            //                                postoffice);
            //     })
            // .when(
            //     function(data) {
            //         log('Postoffice is ok');
            //     }
            function(error) {
                log._e('Error setting up CouchDB', error);
            });
}

start( require('./env'),require('./config'),
       ['monitor', 'reception', 'postoffice', 'purger']);

module.exports = {
    start:start
};


function test() {
    vouchdb.connect('http://' + 'localhost:5984');
    vouchdb.login('admin', 'irma')
        .when(
            function() {
                return configCouch(config.couchdb.config);
            })
        .when(
            function(data) {
                log('data', data);
                // var d = new Date();
                // data.rows.forEach(function(row) {
                //     d.setTime(row.key);
                //     console.log(row.value, row.key, d);
                // });
            }
            ,function(err) {
                log('error', err);
            }
        );

}
// test();
//         removeExpired(config.couchdb.public);
//         // log(config.couchdb.temp);
//         // vouchdb.view(config.couchdb.temp._design.name,
//         //              config.couchdb.temp._design.views.expired.name,
//         //              { },
//         //              config.couchdb.temp.name)
//         // monitor(config.couchdb)
//         // vouchdb.docSave({ a: new Date().getTime()}, 'test')
//         initDatabases(config.couchdb)
//             .when(
//                 function(data) {
//                     log(data);
//                     // var d = new Date();
//                     // data.rows.forEach(function(row) {
//                     //     d.setTime(row.key);
//                     //     console.log(row.value, row.key, d);
//                     // });
//                 }
//                 ,function(err) {
//                     log('error', err);
//                 }
//             );
//     }
// );

