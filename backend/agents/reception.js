//reception.js
var Path = require('path') ;
var log = require('logthis').logger._create(Path.basename(__filename));
var util = require('util');

var vouchdb = require('vouchdb');
var VOW = require('dougs_vow');
var nodemailer = require("nodemailer");
var extend = require('extend');
var PBKDF2 = require('./../lib/pbkdf2');

var mailbox = require('./lib/mailbox');


//module globals
var env, config, databases, smtpTransport;

//This module deals with all the messages arriving in the receptiion database.

//Send mail with defined transport object
function sendMail(mailOptions) {
    var vow = VOW.make();
    smtpTransport.sendMail(mailOptions, function(error, response){
        if(error){
            console.log(error);
            vow.breek(error);
        }
        else {
            console.log("Message sent: " + util.inspect(response, { depth:10, colors:true}));
            vow.keep(mailOptions);
        }

        // if you don't want to use this transport object anymore, uncomment following line
        //smtpTransport.close(); // shut down the connection pool, no more messages
    });
    return vow.promise;
}

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

//This should validate most possible email addresses while still not validating
//all nonsense email addresses.
function validateEmail(email) { 
    var re = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/i;
    return re.test(email);
} 

//Ensures creds contain email, username and proper password, returns promise.
function validate(creds) {
    var vow = VOW.make();
    var error;
    if (!validateEmail(creds.email)) vow.breek("Invalid email address");
    else if (!creds.pwd || creds.pwd.length < 8)
        vow.breek("Passwords should be 8 or more characters");
    else if (!creds.username) vow.breek("Username is empty");
    else {
        vouchdb.userGet(creds.username)
            .when(
                function() {
                    vow.breek('Username ' + creds.username + ' is already in use');
                },
                function() {
                    vouchdb.view(databases._users._design.name,
                                 databases._users._design.views.list.name,
                                 { key: creds.email },
                                 databases._users.name)
                        .when(
                            function(data) {
                                if (data.rows.length)
                                    vow.breek('Email ' + creds.email + ' is already in use');
                                else vow.keep();
                            },
                            function(err) {
                                vow.breek('Unable to check username list', err);
                                log(err);
                            }
                        );
                }
                
            );
                
    }
    return vow.promise;
}

//Save a doc to the public db for clients to read
function postPublicMsg(to, msg) {
    if (to) {
        log('Posting msg in public db with to ' + to);
        vouchdb.dbEnsureExists(databases.public.name)
            .when(
                function() {
                    var doc = {
                        timestamp: new Date().getTime(),
                        to: to || "",
                        msg: msg};
                    return vouchdb.docSave(doc,databases.public.name);
                }
            )
            .when(
                function(data) {
                    log('Public msg posted');
                },
                function(err) {
                    log(err);
                }
            );
    }
}

//With just the username, pwd and some optional extra properties (obj) create a
//userDoc ready for insertion into the _users database. This means hashing the
//pwd and adding the necessary salt and iteration and scheme used.
function createUserDoc(username, pwd, obj) {
    obj = obj || {};
    var salt = generateSalt(64);
    var iterations = 10;
    
    var mypbkdf2 = new PBKDF2(pwd, iterations, salt);
    var derivedKey = mypbkdf2.deriveKey();
    
    return extend(obj, {
        name: username,
        iterations: iterations,
        salt: salt,
        password_scheme: 'pbkdf2',
        derived_key: derivedKey
    });
}

//Check whether id exists as email or user name in the _users database, if so
//return it. Returns a userDoc with at least a name and an email
function checkUserId(id) {
    var vow = VOW.make();
    if (!id || id.length === 0) {
        vow.breek('Empty username/email');
    }
    else vouchdb.userGet(id)
        .when(
            function(data) {
                vow.keep(data);
            },
            function() {
                vouchdb.view(databases._users._design.name,
                             databases._users._design.views.list.name,
                             { key: id },
                             databases._users.name)
                    .when(
                        function(data) {
                            if (data.rows.length)
                                vow.keep(data.rows[0].value);
                        },
                        function(err) {
                            vow.breek(id + ' not found' + err);
                            log(err);
                        }
                    );
            }
                
        );
    return vow.promise;
}

//======================Message handlers===========================================

//Validate creds passed in, timestamps it, stores it in temp db and sends a
//confirmation email, with the uuid of the doc in temp. If error occurs and the creds contained a key id, leave msg in public for the client to retrieve.
//creds = { msg: 'signup', username: 'mickie', pwd: 'somepwd', email:'a@b.com', from: 'sdfasdf78979' }
function signup(creds) {
    log('creds:', creds);
    validate(creds)
        .when(
            function() {
                return vouchdb.dbEnsureExists(databases.temp.name);
            })
        .when(
            function() {
                var tempDoc = {
                    userDoc: createUserDoc(creds.username, creds.pwd,
                                           { email: creds.email }),
                    timestamp: new Date().getTime()
                };
                return vouchdb.docSave(tempDoc, databases.temp.name);
            })
        .when(
            function(tempDoc) {
                var mailOptions = {
                    from: "noreply@axion5.net", // sender address
                    to: creds.email, // list of receivers
                    subject: config.email.signupSubject, // Subject line
                    // text: data.message // plaintext body
                    html: config.email.signupEmail(tempDoc.id)// html body
                };
                return sendMail(mailOptions);
                
            })
        .when(
            function(mailOptions) {
                postPublicMsg(creds.from, 'OK');
            }
            ,function(err) {
                log('Error: ', err);
                postPublicMsg(creds.from, 'ERROR:' + err);
            }
        );
}

var invalidUuids = [];
//Deal with msg from client with a uuid from a signup. Look for the doc with the
//uuid in the temp db, retrieve it, and use the userDoc attached to this doc to
//add a user
//msg= { msg: 'confirm', uuid: '8d7d989d7f89adsf', from: '87f89ads7f9adsf' }
function confirm(msg) {
    log('confirm!!!', msg.uuid);
    var tempDoc;
    vouchdb.docGet(msg.uuid, databases.temp.name)
        .when(
            function(someTempDoc) {
                tempDoc = someTempDoc;
                log('found uuid in temp database', tempDoc);
                if (!invalidUuids[msg.uuid]) {
                    log('not racing ', invalidUuids, tempDoc.timestamp, databases.temp.ttl);
                    //to avoid race conditions:
                    var d = new Date();
                    var doctime = d.setTime(tempDoc.timestamp);
                    log('timestamp', d, tempDoc.timestamp, typeof tempDoc.timestamp);
                    doctime = d.setTime(new Date().getTime() - databases.temp.ttl * 1000);
                    log(d, new Date().getTime() - databases.temp.ttl * 1000);
                    if (tempDoc.timestamp >
                        new Date().getTime() - databases.temp.ttl * 1000) {
                        invalidUuids[msg.uuid] = true;
                        return vouchdb.docRemove(tempDoc, databases.temp.name);
                    }
                }
                //maintenance will clean up the token from temp.
                return VOW.broken('Signup token expired or already used');
            })
        .when(
            function(data) {
                delete invalidUuids[msg.uuid]; //since it is gone from the temp db now
                return vouchdb.userAdd(tempDoc.userDoc, null);
            })
        .when(
            function(data) {
                log('Added user ' , data);
                postPublicMsg(msg.from, 'OK');
            }
            ,function(err) {
                log._e('failed to add user: ', err);
                postPublicMsg(msg.from, 'ERROR:' + err);
            }
        );
}

//Check whether passed in id exists in user database as name or email. If so,
//stick the found id in the temp db and send user an email with a link with a
//query of resetpwd=msg._id so we can find it again when the user clicks on the
//link in the email
//msg= { msg: 'forgotpwd', usernameOrPassword: 'mickie', from: '893453hjhjkh' }
function forgotpwd(msg, subject, email) {
    log('forgotpwd', msg);
    var id = msg.usernameOrEmail;
    var userDoc;
    checkUserId(id)
        .when(
            function(someUserDoc) {
                userDoc = someUserDoc;
                return vouchdb.dbEnsureExists(databases.temp.name);
            })
        .when(
            function() {
                return vouchdb.docSave({
                    name: userDoc.name,
                    timestamp: new Date().getTime()
                }, databases.temp.name);
            })
        .when(
            function(doc) {
                log(doc, msg);
                //send an email with a link referring to the stored doc in temp
                var mailOptions = {
                    from: "noreply@axion5.net", // sender address
                    to: userDoc.email, // list of receivers
                    subject: subject, // Subject line
                    // text: data.message // plaintext body
                    html: email(doc.id)// html body
                };
                return sendMail(mailOptions);
            })
        .when(
            function(mailOptions) {
                postPublicMsg(msg.from, 'OK');
            }
            ,function(err) {
                log('Error: ', err);
                postPublicMsg(msg.from, 'ERRR:' + err);
            }
        );
}

//This is the follow up from forgotpwd. This is sent from the page that gets
//loaded after the user clicks on the link in the confirmation email received
//after submitting the forgotpwd form. Now we actually receive a new password.
//msg = { uuid: 'asdfa8989afdasf', pwd:'somepwd', from:'887897daf7dagd9f9' }
function resetpwd(msg) {
    log(msg);
    var tempDoc;
    //find the proper doc in temp using the received uuid. This doc has the
    //username to find the proper doc in _users
    vouchdb.docGet(msg.uuid, databases.temp.name)
        .when(
            function(someTempDoc) {
                tempDoc = someTempDoc;
                log('found uuid in temp database', tempDoc);
                if (!invalidUuids[msg.uuid]) {
                    //to avoid race conditions:
                    invalidUuids[msg.uuid] = true;
                    if (tempDoc.timestamp >
                        new Date().getTime() - databases.temp.ttl * 1000)
                        return vouchdb.docRemove(tempDoc, databases.temp.name);
                }
                
                //maintenance will clean up the token from temp.
                return VOW.broken('Resetpwd token expired or already used');
            })
        .when(
            function(data) {
                delete invalidUuids[msg.uuid]; //since it is gone from the temp db now
                return vouchdb.userUpdate(tempDoc.name, { password: msg.pwd });
            })
        .when(
            function(data) {
                log('Updated password' , data);
                postPublicMsg(msg.from, 'OK');
            }
            ,function(err) {
                log._e('failed to update password for  user: ' + tempDoc.name, err);
                postPublicMsg(msg.from, 'ERROR:' + err);
            }
        );
}

//forward message to proper handler and then delete it from reception
function handleMsg(msg) {
    switch (msg.msg) {
      case config.msg.SIGNUP: signup(msg); break;
      case config.msg.FORGOTPWD: forgotpwd(msg,
                                           config.email.resetPwdSubject,
                                          config.email.resetPwdEmail); break;
      case config.msg.CONFIRM: confirm(msg); break;
      case config.msg.RESETPWD: resetpwd(msg); break;
      case config.msg.NOPWDLOGIN: forgotpwd(msg,
                                            config.email.nopwdLoginSubject,
                                            config.email.nopwdLoginEmail
                                           ); break;
    default:
    }
    
    //ignore changes to design documents
    if (msg._id.indexOf('_design') !== 0) {
        log('Msg is being handled, deleting msg from reception', msg);
        vouchdb.docRemove(msg, databases.reception.name).when(
        function(data) {
            log('Msg removed from reception', data);
        }
        ,function(err) {
            log._e(err);
        }
    );
    }
}
  
function change(change) {
    log('Msg arrived at reception:', change);
    if (change && change.doc)
        handleMsg(change.doc);
}

module.exports = {
    init: function(someEnv, someConfig) {
        env = someEnv, config = someConfig;
        databases = config.couchdb.databases;
        smtpTransport = nodemailer.createTransport(
            {
                service: "Mandrill",
                auth: {
                    user: env.mandrill.user,
                    pass: env.mandrill.pwd
                }
            });


        return this;
    },
    work: function() {
               log(env, config);
 
        mailbox.connect(env.couchdb, databases.reception.name, change)
            .when(
                function() {
                    log('Reception agent is on the job');
                },
                function(err) {
                    log('Reception error', err);
                }
            );
    }
};

