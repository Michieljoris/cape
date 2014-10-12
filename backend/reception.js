var Path = require('path') ;
var log = require('logthis').logger._create(Path.basename(__filename));
var util = require('util');

var vouchdb = require('vouchdb');
var VOW = require('dougs_vow');
var nodemailer = require("nodemailer");

var smtpOptions = {
    service: "Mandrill",
    auth: {
        // user: "postmaster@axion5.net",
        user: "mail@axion5.net",
        // pass: process.env.MAILGUN_FIRSTDOOR_PWD 
        pass: "U2eJfnNEtFRYCX2zFK1ZHw"
        // pass: process.env.MAILGUN_PWD 
    }
};

var smtpTransport = nodemailer.createTransport(smtpOptions);


// send mail with defined transport object
function sendMail(mailOptions) {
    smtpTransport.sendMail(mailOptions, function(error, response){
        if(error){
            console.log(error);
        }else{
            console.log("Message sent: " + util.inspect(response, { depth:10, colors:true}));
        }

        // if you don't want to use this transport object anymore, uncomment following line
        //smtpTransport.close(); // shut down the connection pool, no more messages
    });
    
}

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

function signupMsg(uuid) {
    var signupMsg = "Click on the following link to complete sign up!!<br>" +
        "<a href='localhost:9001/confirm.html?signup=" + uuid + "'>Click here</a>";
    return signupMsg;
}

function signup(creds) {
    log('creds:', creds);
    //TODO validate creds
    ensureExistsDb('temp').when(
        function() {
            creds.timestamp = "" + new Date().getTime();
            return vouchdb.docSave(creds, 'temp');
        })
        .when(
            function(data) {
                var mailOptions = {
                    from: "mail@axion5.net", // sender address
                    to: "mail@axion5.net", // list of receivers
                    // to: "michieljoris@gmail.com", // list of receivers
                    subject: "Complete signing up to cape!!!", // Subject line
                    // text: data.message // plaintext body
                    html: signupMsg(creds._id)// html body
                };
                sendMail(mailOptions);
            }
            ,function(err) {
                log('Error: ', err);
            }
        );
}

function confirm(uuid) {
    log('confirm!!!', uuid);
    vouchdb.docGet(uuid, 'temp').when(
        function(creds) {
            log('found uuid in temp database', creds);
            
        } 
        ,function(err) {
            log._e('uuid ' + uuid + ' does not exist in temp', err);
        }
    );
    
}


function handleMsg(msg) {
    switch (msg.msg) {
      case 'signup': signup(msg); break;
      case 'forgotpwd': log('forgotpwd'); break;
      case 'confirm': confirm(msg.uuid); break;
    default:
    }
    
    log('deleting msg', msg);
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


