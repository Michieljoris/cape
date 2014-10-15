//connect.js
var Path = require('path') ;
var log = require('logthis').logger._create(Path.basename(__filename));
  
var VOW = require('dougs_vow');
var follow = require("follow");
var vouchdb = require("vouchdb");


//Wait for changes in 'db' and call 'cb' when they happen. If the database 'db'
//gets deleted automatically recreat it.
function wait(instance, db, cb) {
    
    //default callback for testing purposes
    cb = cb || function (change) {
        log(change);
        log(db + ": Change " + change.seq + " has " +
            Object.keys(change.doc).length + " fields");
    };

    var config = {
        db: 'http://' + instance.admin + ':' + instance.pwd + '@'  +
            instance.url + '/' + db,
        include_docs: true,
        since: "now"
    };
    log('Listening to changes in ' + db + ':\n', config);
    var changes = follow(config, function(err, change) {
        if (!err) {
            //ignore changes because of deletion of doc
            if (!change.doc._deleted) cb(change);   
        }
        else if (err.deleted) vouchdb.dbCreate(db).when(
            function(data) {
                log('Database ' + db + ' recreated');
                wait(instance, db, cb);
            },
            function (err) {
                log._e('Error: ', err);
            });
        else log._e(err);
    });
}

//Make sure db database exists and wait for changes
function connect(instance, db, cb) {
    var vow = VOW.make();
    //create db if it doesn't exist
    vouchdb.dbInfo(db).when(
        function(data) {
            log('Database '+ db + ' info:\n', data);
            wait(instance, db, cb);
            vow.keep();
        }
        ,function(err) {
            vouchdb.dbCreate(db).when(
                function(data) {
                    log('Database ' + db + ' created');
                    wait(instance, db, cb);
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


