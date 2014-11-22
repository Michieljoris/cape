//purger.js
var Path = require('path') ;
var log = require('logthis').logger._create(Path.basename(__filename));

var VOW = require('dougs_vow');
var vouchdb = require("vouchdb");


//module globals
var env = require('./../env');
var config = require('./../config');

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
  
module.exports = {
    init: function(someEnv, someConfig) {
        env = someEnv, config = someConfig;
        return this;
    },
    work: function() {
    
    }
};
