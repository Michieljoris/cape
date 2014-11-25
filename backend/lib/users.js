//users.js
var Path = require('path') ;
var log = require('logthis').logger._create(Path.basename(__filename));

var util = require('util');
var extend = require('extend');
var crypto = require('crypto');

var vouchdb = require('vouchdb');
var VOW = require('dougs_vow');

var __basePath = require('../../__basePath');
var PBKDF2 = require(__basePath +'/backend/lib/pbkdf2');
var utils = require(__basePath + '/backend/lib/utils');

var config = require(__basePath + '/backend/config');



//salt for pbkdf2
function generateSalt(len) {
    var set = '0123456789abcdefghijklmnopqurstuvwxyz',
    setLen = set.length,
    salt = '';
    for (var i = 0; i < len; i++) {
        var p = Math.floor(Math.random() * setLen);
        salt += set[p];
    }
    return salt;
}

//  Normalize an email so it can be used as a couchdb username.

// - userids: Userid is always a user's email. His database is called:
//   private_[email]_[md5hash-of-email] where email is normalized to only contain valid
//   chars (only lowercase characters (a-z), digits (0-9), or any of the characters
//   _, $, (, ), +, -, and / are allowed for database names). This way a user can
//   deduce his private database from his email address, and it's unique, even
//   across couchdb instances.
function dbNameFromUserId(email) {
    var allowedChars = "abcdefghijklmnopqrstuvwxyz0123456789_$()+-/";
    if (!email || typeof email !== "string") {
        throw new Error("No email for user!!");
    }
    email = email.toLowerCase();
    return email.split("").map(function(c) {
        if (c === "@") return "+";
        if (c === ".") return "-";
        if (allowedChars.indexOf(c) === -1) return ".";
        else return c;
    }).join('');

}

//Returns the same email but with the domain name lowercased.
function normalizeEmail(email) {
    var parts = email.split("@");
    return parts[0] + "@" + parts[1].toLowerCase();
}

// console.log(normalizeEmail("mail@axion5.net"));
//With just the username, pwd and some optional extra properties (obj) create a
//userDoc ready for insertion into the _users database. This means hashing the
//pwd and adding the necessary salt and iteration and scheme used.
//it assumes a valid email address to be passed in
function createUserDoc(email, pwd, obj) {
    obj = obj || {};
    var salt = generateSalt(64);
    var iterations = 10;
    
    var mypbkdf2 = new PBKDF2(pwd, iterations, salt);
    var derivedKey = mypbkdf2.deriveKey();
        // name: normalizeEmail(email) +  "_" +
        //     crypto.createHash('md5').update(email).digest("hex"),
    return extend(obj, {
        name: normalizeEmail(email),
        iterations: iterations,
        salt: salt,
        password_scheme: 'pbkdf2',
        derived_key: derivedKey
    });
}

//Ensure a user's database exists and it has  proper secObj, filters, views and validatae_doc_update. 
function ensureUserDbExists(userDoc, config){
    var userId = userDoc._id.slice(config.users.couchdbPrefix.length);
    var dbName = config.users.dbPrefix + "/" + 
        dbNameFromUserId(userId) +
        "_" +
        crypto.createHash('md5').update(userId).digest("hex");

    var userType = userDoc.userType || "default";
    log(dbName);

    return vouchdb.dbEnsureExists(dbName)
        .when(
            function(data) {
                var secObj = config.users[userType].secObj();
                secObj.members.names.push(userId);
                return vouchdb.dbSecurity(secObj, dbName);
            })
        .when(
            function(data) {
                var designDoc = utils.createDesignDoc(config.users[userType]._design);
                if (designDoc) { 
                    return vouchdb.docUpdate(designDoc, dbName);
                }
                else return VOW.kept(data);
            });
}

//Make sure that every user has its own database and that is is properly setup
function ensureUserDbsExist(config){
    var vows = [];
    return vouchdb.view("cape", "list", {}, "_users")
        .when(
            function(data) {
                var users = data.rows;
                if (users.length) return VOW.kept();
                users.forEach(function(data) {
                    vows.push(ensureUserDbExists(data.value, config));
		});
                return VOW.every(vows);
            });
        // .when(
        //     function(data) {
        //         log(data);
        //     },
        //     function(err) {
        //         log('Err', err);
        //     });
}


function ensureUserExists(email, pwd, userName) {
    var vow = VOW.make();
    vouchdb.userGet(email)
        .when(
            function(userDoc) {
                // consollog(userDoc);
                vow.keep(userDoc);
            },
            function(err) {
                vouchdb.userAdd(createUserDoc(email, pwd))
                    .when(vow.keep, vow.breek);
            });
    return vow.promise;
}




module.exports = {
    createUserDoc: createUserDoc
    ,normalizeEmail: normalizeEmail
    // ,dbNameFromUserId: dbNameFromUserId
    ,ensureUserDbsExist: ensureUserDbsExist
    ,ensureUserExists: ensureUserExists
};
