//rean.js
var Path = require('path') ;
require('logthis').config({ _on: true,
                            'rean.js': 'debug',
                            'mailbox.js': 'debug',
                            'postoffice.js': 'debug',
                            'reception.js': 'debug'
                          });
var log = require('logthis').logger._create(Path.basename(__filename));

var env = require('./env');
var config = require('./config');
var VOW = require('dougs_vow');
var vouchdb = require("vouchdb");
var reception = require('./reception');
var postoffice = require('./postoffice');

var mailbox = require('./mailbox');

//Periodically remove all docs with a timestamp less than new Date().getTime()
//minus db.ttl. Docs should be at most for db.ttl * 2 seconds in the database
//before being automatically removed.
function removeExpired(db) {
    if (!db.ttl) return;
    setInterval(function() {
        // var d = new Date();
        // log('now', d.getTime(), d);
        var endkey = (new Date().getTime() - db.ttl*1000);
        // d.setTime(endkey);
        // log('endkey', endkey, d);
        vouchdb.view(db._design.name,
                     db._design.views.expired.name,
                     { endkey: endkey },
                     // { },
                     db.name)
            .when(
                function(data) {
                    // log(data);
                    var docs = data.rows.map(function(r) {
                        return { _id: r.id, _rev: r.value.rev, timestamp: r.key };
                    });
                    // docs.forEach(function(row) {
                    //     d.setTime(row.timestamp);
                    //     console.log(row.id, row.timestamp, d);
                    // });
                    if (docs.length) {
                        log('Removing ' + docs.length + ' expired docs from ' + db.name);
                        return vouchdb.docBulkRemove(docs, db.name);   
                    }
                    else return VOW.kept();
                })
            .when(
                function(data) {
                    log('Finished purging ' + db.name);
                } 
            
                ,function(err) {
                    log._e('Error: couldn\'t remove docs from ' + db.name, err);
                }
            );
        
    }, db.ttl * 1000);
    
}

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
                var designDoc = config.createDesignDoc(db._design);
                if (designDoc) { 
                    return vouchdb.docUpdate(designDoc, db.name);
                }
                else return VOW.kept(data);
            })
        .when(
            function(data) {
                removeExpired(db);
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
    // vouchdb.connect('http://' + instance.admin + ':' + instance.pwd + '@' + instance.url);
    
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

//This function monitors the various databases for exceeding values as passed in.
// The passed in value should be an object of props such as this one:
// somedb: {
//     name: 'somedb-name',
//     monitor: {
//         interval: 10, //seconds
//         warn: {
//             doc_count: 2
//         },
//         error: {
//             doc_count: 4
//         }
//     },

// Values will be checked every 'interval' seconds. and a warning/error logged
// when the value in the database's info exceeds the value as set. Errors go
// before warnings. So for instance if the doc_count in somedb is 5 an error
// will be logged, but not a warning. Only values listed here will be checked.
function monitor(databases) {
    function check(m, i, t) {
        var result = [];
        if (!m) return result;
        Object.keys(m).forEach(
            function(a) {
                if (i[a] && m[a] < i[a]) {
                    result.push({ type: t, prop: a, value: i[a], max: m[a]});
                    delete i[a];
                }
            }
        );
        return result;
    };
    
    function report(dbName, lines) {
        var fn = { 'Warning': '_w', 'Error': '_e' };
        lines.forEach(function(line) {
            log[fn[line.type]](line.type + ' [' + dbName + ']:' + line.prop + ' = ' + line.value +
                           ' max = ' + line.max);
        });
    }
    
    Object.keys(databases).forEach(
        function(key) {
            var db = databases[key];
            if (db.monitor && db.monitor.interval &&
               (db.monitor.warn || db.monitor.error)) {
                setInterval(function() {
                    vouchdb.dbInfo(db.name)
                        .when(
                            function(info) {
                                var errors = check(db.monitor.error, info, 'Error');
                                var warnings = check(db.monitor.warn, info, 'Warning');
                                report(db.name, errors.concat(warnings));
                            }
                            ,function(err) {
                                log.e('Database ' + db.name + ' is not accesible!!', err);;
                            });
                }, db.monitor.interval * 1000);
                 
            }
            
        }
    );
    return VOW.kept();
}

//Main function that starts the node cape process.

//Example config:
//{    couchdb: {
//         admin: 'admin', pwd: 'pwd', url: 'localhost:5984'
//     }
//}
function start(env) {
    log('\nCape config:\n', config);
    //ensure couchdb is running and is not in party mode
    
    // vouchdb.connect('http://' + instance.admin + ':' + instance.pwd + '@' + instance.url);
    var databases = config.couchdb.databases;
    initCouch(env.couchdb)
        .when(
            function(data) {
                log('CouchDB is ok');
                return configCouch(config.couchdb.config);
            })
        .when(
            function(data) {
                log('Configured CouchDB');
                return initDatabases(databases);
            })
        .when(function(data) {
            log('Installed design documents');
            return monitor(databases);
        })
        .when(
            function(data) {
                log('Monitoring CouchDB');
                return mailbox.connect(env.couchdb, databases.reception.name,
                                       reception);
            })
        .when(
            function(data) {
                log('Reception is ok');
                return mailbox.connect(env.couchdb, databases.postoffice.name,
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
        admin: env.couchdb.admin, pwd: env.couchdb.pwd, url: 'localhost:5984'
    }
    ,agents: []
});


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

