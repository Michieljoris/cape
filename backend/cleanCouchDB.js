//cleanCouch.js
// var Path = require('path') ;
// var log = require('logthis').logger._create(Path.basename(__filename));

var env = require('./env');
var config = require('./config');
var VOW = require('dougs_vow');
var vouchdb = require("vouchdb");
  
//remove databases and remove users  
function clean() {
    
    var instance = {
        admin: env.couchdb.admin, pwd: env.couchdb.pwd, url: env.couchdb.url 
    };
    vouchdb.connect('http://' + instance.admin + ':' +
                    instance.pwd + '@' + instance.url);
    Object.keys(config.couchdb.databases).forEach(
        function(db) {
            // if (db[0] !== '_') {
                console.log(db);
                vouchdb.dbRemove(db).when(
                    function(data) {
                        console.log(data);
                        
                    },
                    function(err) {
                        console.log('Error: ', err);
                    }
                );
            // }
        }
    );
    
} 
  
clean();  
