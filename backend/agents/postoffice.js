var Path = require('path') ;
var log = require('logthis').logger._create(Path.basename(__filename));


var vouchdb = require('vouchdb');
var VOW = require('dougs_vow');
var nodemailer = require("nodemailer");
var extend = require('extend');
var PBKDF2 = require('./../lib/pbkdf2');

var mailbox = require('./lib/mailbox');

//module globals
var env = require('./../env');
var config = require('./../config');

var databases = config.couchdb.databases;
  
  
function change(error, change) {
    if(!error) {
        log(change);
        log('Postoffice' + ": Change " + change.seq + " has " + Object.keys(change.doc).length + " fields");
    }
    else log._e(error);
}

module.exports = {
    init: function(someEnv, someConfig) {
        env = someEnv, config = someConfig;
        return this;
    },
    work: function() {
        mailbox.connect(env.couchdb, databases.aggregate.name, change)
            .when(
                function() {
                    log('Postoffice agent is on the job');
                },
                function(err) {
                    log('Reception error', err);
                }
            );
    }
};

