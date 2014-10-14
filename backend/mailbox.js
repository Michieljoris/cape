//connect.js
var Path = require('path') ;
var log = require('logthis').logger._create(Path.basename(__filename));
  
var VOW = require('dougs_vow');
var follow = require("follow");
var vouchdb = require("vouchdb");


//Wait for changes in 'db' and call 'cb' when they happen. If the database 'db'
//gets deleted automatically recreat it.
function wait(couchdb, db, cb) {
    
    //default callback for testing purposes
    cb = cb || function (change) {
        log(change);
        log(db + ": Change " + change.seq + " has " +
            Object.keys(change.doc).length + " fields");
    };

    var config = {
        db: 'http://' + couchdb.admin + ':' + couchdb.pwd + '@'  +
            couchdb.url + '/' + db,
        include_docs: true,
        since: "now"
    };
    log('Listening to changes:\n', config);
    var changes = follow(config, function(err, change) {
        if (!err) {
            //ignore changes because of deletion of doc
            if (!change.doc._deleted) cb(change);   
        }
        else if (err.deleted) vouchdb.dbCreate(db).when(
            function(data) {
                log('Database ' + db + ' recreated');
                wait(couchdb, db, cb);
            },
            function (err) {
                log._e('Error: ', err);
            });
        else log._e(err);
    });
}

//Make sure db database exists and wait for changes
function connect(couchdb, db, cb) {
    var vow = VOW.make();
    //create db if it doesn't exist
    vouchdb.dbInfo(db).when(
        function(data) {
            log('Database ' + cb + ' info:\n', data);
            wait(couchdb, db, cb);
            vow.keep();
        }
        ,function(err) {
            vouchdb.dbCreate(db).when(
                function(data) {
                    log('Database ' + db + ' created');
                    wait(couchdb, db, cb);
                    vow.keep();
                },
                vow.breek
            );
        }
    );
    return vow.promise;
    
}
  
module.exports = {
    connect: connect
};


