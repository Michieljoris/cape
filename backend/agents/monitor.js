//monitor.js
var Path = require('path') ;
var log = require('logthis').logger._create(Path.basename(__filename));

var env = require('./../env');
var config = require('./../config');
var VOW = require('dougs_vow');
var vouchdb = require("vouchdb");

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
  
module.exports = {
    work: function() {
  
    }
};
