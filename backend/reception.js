var Path = require('path') ;
var log = require('logthis').logger._create(Path.basename(__filename));
var util = require('util');

var vouchdb = require('vouchdb');
var VOW = require('dougs_vow');
var nodemailer = require("nodemailer");
var extend = require('extend');
var PBKDF2 = require('./pbkdf2');

var smtpTransport = nodemailer.createTransport(
    {
        service: "Mandrill",
        auth: {
            user: "mail@axion5.net",
            //TODO get password from environment!!
            pass: "U2eJfnNEtFRYCX2zFK1ZHw"
        }
    });

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

//Ensure passed in db exists and if not creates it.
function ensureExistsDb(db) {
    var vow = VOW.make();
    vouchdb.dbInfo(db)
        .when(
            function(data) {
                vow.keep();
            }
            ,function(err) {
                if (err.reason === 'no_db_file') {
                    vouchdb.dbCreate(db).when(
                        function(data) {
                            vow.keep();
                        },
                        function(err) {
                            vow.breek(err);
                        }
                    );
                }
                else vow.breek(err);
            }
        );
    return vow.promise;
}

//contents of email to send on signup
function html(uuid) {
    var html = "Click on the following link to complete sign up!!<br>" +
        "<a href='localhost:9001/confirm.html?signup=" + uuid + "'>Click here</a>";
    return html;
}

function resetPwdMsg(uuid) {
    var html = "Click on the following link to reset your password!!<br>" +
        "<a href='localhost:9001/resetpwd.html?resetpwd=" + uuid + "'>Click here</a>";
    return html;
}


function validateEmail(email) { 
    var re = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/i;
    return re.test(email);
} 

//Ensures creds contain email, username and proper password, returns promise.
function validate(creds) {
    var vow = VOW.make();
    var error;
    if (!validateEmail(creds.email)) vow.breek("Invalid email address");
    else if (!creds.pwd || creds.pwd.length < 8) vow.breek("Passwords should be 8 or more characters");
    else if (!creds.username) vow.breek("Username is empty");
    else {
        vouchdb.view('cape', 'list', {}, '_users').when(
            function(data) {
                if (data.rows.some(function(row) {
                    return row.key === creds.username;
                })) vow.breek('Username ' + creds.username + ' is already in use');
                else vow.keep();
            },
            function(err) {
                vow.breek('Unable to check username list', err);
                log(err);
            }
        );
                
    }
    return vow.promise;
}

//Save a doc to the public db for clients to read
function postPublicMsg(callback, msg) {
    if (callback) {
        log('Posting msg in public db with callback ' + callback);
        ensureExistsDb('public')
            .when(
                function() {
                    var doc = {
                        timestamp: "" + new Date().getTime(),
                        callback: callback || "",
                        msg: msg};
                    return vouchdb.docSave(doc,'public');
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

//Validate creds passed in, timestamps it, stores it in temp db and sends a
//confirmation email, with the uuid of the doc in temp. If error occurs and the creds contained a key id, leave msg in public for the client to retrieve.
function signup(creds) {
    log('creds:', creds);
    validate(creds)
        .when(
            function() {
                return ensureExistsDb('temp');
            })
        .when(
            function() {
                creds.timestamp = "" + new Date().getTime();
                creds.userDoc = createUserDoc(creds.username, creds.pwd,
                                              { email: creds.email });
                delete creds.pwd;
                delete creds.username;
                log(creds);
                return vouchdb.docSave(creds, 'temp');
            })
        .when(
            function(data) {
                var mailOptions = {
                    from: "noreply@axion5.net", // sender address
                    to: creds.email, // list of receivers
                    subject: "Complete signing up to cape!!!", // Subject line
                    // text: data.message // plaintext body
                    html: signupMsg(creds._id)// html body
                };
                return sendMail(mailOptions);
                
            })
        .when(
            function(mailOptions) {
                postPublicMsg(creds.callback, 'OK: email sent to ' + mailOptions.to);
            }
            ,function(err) {
                log('Error: ', err);
                postPublicMsg(creds.callback, 'Error: ' + err);
            }
        );
}

//Deal with msg from client with a uuid from a signup. Look for the doc with the
//uuid in the temp db, retrieve it, and use the userDoc attached to this doc to
//add a user
function confirm(msg) {
    log('confirm!!!', msg.uuid);
    vouchdb.docGet(msg.uuid, 'temp')
        .when(
        function(creds) {
            log('found uuid in temp database', creds);
            log(creds.userDoc);
            return vouchdb.userAdd(creds.userDoc, null);
        })
        .when(
            function(data) {
                log('Added user ' , data);
                postPublicMsg(msg.callback, 'Added user ');
            }
            ,function(err) {
                log._e('failed to add user: ', err);
                postPublicMsg(msg.callback, err);
            }
        );
}

function checkUserId(id) {
    var vow = VOW.make();
    var foundId;
    if (!id || id.length === 0) {
            vow.breek('Empty username/email');
        }
    else vouchdb.view('cape', 'list', {}, '_users').when(
        function(data) {
            if (data.rows.some(function(row) {
                foundId = row.value;
                return row.value.email &&
                    (row.value.name === id || row.value.email === id);
            })) vow.keep(foundId);
            else vow.breek('Couldn\'t find username/email or user has no email');
        },
        function(err) {
            vow.breek('Unable to check user list', err);
            log(err);
        }
    );
    return vow.promise;
}

//Check whether passed in id exists in user database as name or email. If so,
//stick the found id in the temp db and send user an email with a link with a
//query of resetpwd=msg._id so we can find it again when the user clicks on the
//link in the email
function forgotpwd(msg) {
    log('forgotpwd', msg);
    var id = msg.usernameOrPassword;
    checkUserId(id)
        .when(
            function(id) {
                msg.name = id.name;
                msg.email = id.email;
                return ensureExistsDb('temp');
            })
        .when(
            function() {
                return vouchdb.docSave({
                    _id: msg._id,
                    name: msg.name,
                    timestamp: "" + new Date().getTime()
                }, 'temp');
            })
        .when(
            function(data) {
                log(data, msg);
                var mailOptions = {
                    from: "noreply@axion5.net", // sender address
                    to: msg.email, // list of receivers
                    subject: "Reset cape pwd!!!", // Subject line
                    // text: data.message // plaintext body
                    html: resetPwdMsg(msg._id)// html body
                };
                return sendMail(mailOptions);
            })
        .when(
            function(mailOptions) {
                postPublicMsg(msg.callback, 'OK: email sent to ' + mailOptions.to);
            }
            ,function(err) {
                log('Error: ', err);
                postPublicMsg(msg.callback, 'Error: ' + err);
            }
        );
}

function resetpwd(msg) {
    log(msg);
    var id;
    vouchdb.docGet(msg.uuid, 'temp')
        .when(
            function(someId) {
                id = someId;
                log('found uuid in temp database', id);
                return vouchdb.userUpdate(id.name, { password: msg.pwd });
            })
        .when(
            function(data) {
                log('Updated password' , data);
                postPublicMsg(msg.callback, 'Updated password for ' + id.name);
            }
            ,function(err) {
                log._e('failed to update password for  user: ' + id.name, err);
                postPublicMsg(msg.callback, err);
            }
        );
}


function handleMsg(msg) {
    switch (msg.msg) {
      case 'signup': signup(msg); break;
      case 'forgotpwd': forgotpwd(msg); break;
      case 'confirm': confirm(msg); break;
      case 'resetpwd': resetpwd(msg); break;
    default:
    }
    
    log('deleting msg from reception', msg);
    if (msg._id.indexOf('_design/cape') !== 0)
        vouchdb.docRemove(msg, 'reception').when(
            function(data) {
                log('msg removed ', data);
            }
            ,function(err) {
                log._e(err);
            }
        );
    
}
  
//TODO
//password protect writes? 
function change(change) {
    log(change);
    if (change && change.doc)
        handleMsg(change.doc);
}
  
module.exports = change; 

// var zxcvbn = require('zxcvbn');
// var score = zxcvbn('pwd');
// console.log(score);

