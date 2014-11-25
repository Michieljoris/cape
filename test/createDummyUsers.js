var Path = require('path') ;
require('logthis').config({ _on: true,
                            "rean.js": 'debug',
                            'mailbox.js': 'debug',
                            'postoffice.js': 'debug',
                            'reception.js': 'debug',
                            'monitor.js': 'debug',
                            'purge.js': 'debug',
                            'createDummyUsers.js': "debug"
                          });

var log = require('logthis').logger._create(Path.basename(__filename));

var __basePath = require('../__basePath');
var crypto = require('crypto');

var VOW = require('dougs_vow');
var vouchdb = require("vouchdb");

var utils = require(__basePath + '/backend/lib/utils');
var Users = require(__basePath + '/backend/lib/users');

var config = require(__basePath + '/backend/config');
var env = require(__basePath + '/backend/env');

var instance = {
    admin: env.couchdb.admin, pwd: env.couchdb.pwd, url: env.couchdb.url 
};

vouchdb.connect('http://' + instance.admin + ':' +
                instance.pwd + '@' + instance.url);

var createUserDoc = Users.createUserDoc;
var dbNameFromUserId = Users.dbNameFromUserId;

var users = [
    // { name: "John", email: "john@Email.com", pwd: "pwd" },
    // { name: "Pete", email: "Pete@CAPITAL.com", pwd: "pwd" },
    { name: "Axel", email: "axel@email.com", pwd: "pwd" }
    // { name: "Rose", email: "Rose@email.com", pwd: "pwd" },
    // { name: "Mary", email: "MARY@email.com", pwd: "pwd" }
];


function createUsers() {
    var vows = [];
    users.forEach(
        function(user) {
            vows.push(ensureUserExists(user.email, user.pwd, user.name));
        });
    VOW.every(vows)
        .when(
            function(data) {
                log(data);
            },
            function(err) {
                log('Err:', err);
            });
}

//============================================================

// Users.ensureUserDbsExist(config);

function testvow(){
    var vows = [];
    vows.push(VOW.kept("1"));
    vows.push(VOW.broken("2"));
    vows.push(VOW.kept("3"));
    VOW.every(vows)
        .when(
            function(data) {
                console.log(data);
            },
            function(err) {
               console.log('err',err); 
            });
}

// testvow();
