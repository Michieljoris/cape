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


var reps = [
    {
        source: "aggregate",
        target: "foo",
        continuous: true,
        filter: "cape/foo",
        role: '_admin',
        create_target: true,
        _id: "foo"
        
    }

    ,{
        source: "aggregate",
        target: "bar",
        continuous: true,
        filter: "cape/bar",
        role: '_admin',
        create_target: true,
        _id: "bar"
        
    }
];


vouchdb.info()
    .when(
        function(data) {
            console.log(data);
            return vouchdb.docSave({test: 1 }, 'test');
            // var vows = [];
            // reps.forEach(function(rep) {
            //     vows.push(vouchdb.replicationRemove(rep._id)); });
            // return VOW.every(vows);
        })
    .when(
        function(data) {
            console.log(data);
        },
        function(err) {
            console.log('Err', err);
        });

// vouchdb.info()

    // .when(
    //     function(data) {
    //         console.log(data);
    //         var vows = [];
    //         reps.forEach(function(rep) {
    //             vows.push(vouchdb.replicationRemove(rep._id)); });
    //         return VOW.every(vows);
    //     })
    // .when(
    //     function(data) {
    //         console.log(data);
    //         var vows = [];
    //         reps.forEach(function(rep) {
    //             vows.push(vouchdb.replicationAdd(rep)); });
    //         return vows.length ? VOW.every(vows) : VOW.kept("No reps passed in");
    //     })
    // .when(
    //     function(data) {
    //         console.log(data);
    //         var vows = [];
    //         vows.push(vouchdb.dbConflicts(true, 'foo'));   vows.push(vouchdb.dbConflicts(true, 'bar'));
    //         return VOW.every(vows);
    //     })
    // .when(
    //     function(err) {
    //         console.log('Conflicts: ', err);
    //     }
    //     ,function(err) {
    //         console.log('Error: ', err);
    //     }
    // );

var createUserDoc = Users.createUserDoc;
var dbNameFromUserId = Users.dbNameFromUserId;

var users = [
    // { name: "john", email: "john@email.com", pwd: "pwd" },
    // { name: "pete", email: "pete@capital.com", pwd: "pwd" },
    { name: "axel", email: "axel@email.com", pwd: "pwd" }
    // { name: "rose", email: "rose@email.com", pwd: "pwd" },
    // { name: "mary", email: "mary@email.com", pwd: "pwd" }
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
