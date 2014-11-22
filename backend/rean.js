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
                            'rean.js': 'debug',
                            'mailbox.js': 'debug',
                            'postoffice.js': 'debug',
                            'reception.js': 'debug',
                            'monitor.js': 'debug',
                            'purge.js': 'debug'
                          });
var log = require('logthis').logger._create(Path.basename(__filename));

var VOW = require('dougs_vow');
var vouchdb = require("vouchdb");

//Given a JS object, it will return a proper design doc that can be saved to couchdb.
var createDesignDoc = function createDesignDoc(design) {
    if (!design) return false;
    var doc = {
        _id: '_design/' + design.name
    };
    if (design.validate_doc_update)
        doc.validate_doc_update = design.validate_doc_update;
    if (design.lib) {
        doc.lib = design.lib;
    }
    if (design.views) {
        doc.views = {};
        Object.keys(design.views).forEach(function(key) {
            doc.views[design.views[key].name] = { map: design.views[key].fn };
        });
    }
    if (design.filters) {
        doc.filters = {};
        Object.keys(design.filters).forEach(function(key) {
            doc.filters[design.filters[key].name] = design.filters[key].fn;
        });
    }
    return doc;
    
};
  


function initOneDatabase(db, wipeDesignDocs) {
    //check whether it exists, create if necessary, then check for _design doc,
    //create if necessary, set the doc to whats in config (db)
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
                var designDoc = createDesignDoc(db._design);
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


//Make sure there is a couchdb instance and that it is not in party mode, if so
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
    initCouch(instance)
        .when(
            function(data) {
                log('Initialized CouchDB');
                //connect as admin from now on, not using sessions.
                vouchdb.connect('http://' + instance.admin + ':' +
                                instance.pwd + '@' + instance.url);
                return configCouch(config.couchdb.config);
            })
        .when(
            function(data) {
                log('Configured CouchDB');
                return initDatabases(databases);
            })
        .when(
            function(data) {
                log('Installed design documents');
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


      
//TEST
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


var edges = this.graph.edges_from(this.curr);
for (var i = 0; i < edges.length; i++) {
    var next = edges[i];
    var edge_weight = this.graph.edge_weight(this.curr, next);
    if (edge_weight != Infinity) {
        this.neighbors.push(next);
        mark_changed(next);
        if (!this.visited[next]) {
            this.g[next] = this.g[this.curr] + edge_weight;
            this.open.push(next);
            this.parent[next] = this.curr;
            this.visited[next] = true;
        }
    }
}

