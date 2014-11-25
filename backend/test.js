var Path = require('path') ;
var util = require('util');
require('logthis').config({ _on: true,
                            'rean.js': 'debug',
                            'mailbox.js': 'debug',
                            'postoffice.js': 'debug',
                            'reception.js': 'debug',
                            'monitor.js': 'debug',
                            'purge.js': 'debug',
                            'test.js': 'debug'

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
            doc.views[design.views[key].name] = { map: design.views[key].fn.toString() };
        });
    }
    if (design.filters) {
        doc.filters = {};
        Object.keys(design.filters).forEach(function(key) {
            doc.filters[design.filters[key].name] = design.filters[key].fn.toString();
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
                log(info);
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


var mydb =  {
    name: 'testdb',
    ttl: 3600
    ,secObj: {"admins": {"names": [], "roles": []},
              "members": {"names": [], "roles": []}}
    // only admin can read and write this database
    ,_design:  {
	name: 'cape2',
	views: {
	    expired: {
		name: 'expired',
		fn: function(doc) {
                    emit("this is the key", { bla: doc._rev });
                }
	    }
	},
        filters: {
            myfilter: {
                name: "myfilter", 
                fn: function(doc, req) {log("------------------------------------"); if (doc.ok) return true; else return false; }
            }
        }
    }
};

function inspect(data) {
    return util.inspect(data, { colors: true, depth: 10 });
}

function test() {
    var instance = {
        admin: "admin", pwd: 'irma', url: 'localhost:5984'
    };
    vouchdb.connect('http://' + instance.admin + ':' +
                    instance.pwd + '@' + instance.url);
    vouchdb.info().when(
        function(data) {
            log(data);
        },
        function(err) {
            log("Err:", err);
        }
    );
    initOneDatabase(mydb, false)
        .when(
            function(data) {
                log('testdb', data);
                return vouchdb.view("cape2", "expired", {}, 'testdb');
            })
        .when(
            function(data) {
                log("view", inspect(data));
                return vouchdb.setReplication("myrep5",  {
                    source: "testdb4", target: "testdb5", continuous: true
                    ,filter: "cape2/myfilter" //ddoc/myfilter
                    ,query_params: {}
                });
            })
        .when(
            function(data) {
                log("view", inspect(data));
            },
            function(err) {
                log("Err:", err);
            });
    
};

// source”, “target”, “create_target”, “continuous”, “doc_ids”, “filter”, “query_params”, “user_ctx” , “since”, “onChange”, “complete”

test();
