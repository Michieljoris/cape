var util = require('util');
var fs = require('fs-extra');

var validator =  fs.readFileSync(__dirname +'/_design/validator.js', { encoding: 'UTF8'});
var validate_doc_update =  fs.readFileSync(__dirname + '/_design/validate_doc_update.js', { encoding: 'UTF8'});
var reception_vud =  fs.readFileSync(__dirname + '/_design/reception-vud.js', { encoding: 'UTF8'});
var public_vud =  fs.readFileSync(__dirname + '/_design/public-vud.js', { encoding: 'UTF8'});
  
var config =  {
    users: {
        dbPrefix: "u",
        couchdbPrefix: "org.couchdb.user:"
        ,initialUsers: [
            // { name: "axel", email: "axel@email.com", pwd: "pwd" }
            // { name: "rose", email: "rose@email.com", pwd: "pwd" },
            // { name: "mary", email: "mary@email.com", pwd: "pwd" }
            // { name: "john", email: "john@email.com", pwd: "pwd" },
            // { name: "pete", email: "pete@capital.com", pwd: "pwd" },
        ]
        ,"default": {
            secObj: function() {
                return {"admins": {"names": [], "roles": []},
                        "members": {"names": [], "roles": []}};
            },
            "_design": {
                name: "cape",
	        filters: {
		    // to: {
		    //     name: 'to',
		    //     fn: function(doc, req) { 
                    //         if (doc && req.query.to === doc.to) return true;
                    //         return false;  }
		    // }
	        },
	        views: {
		    // expired: {
		    //     name: 'expired',
		    //     fn: function(doc) 
                    //     {  emit(doc.timestamp, { rev: doc._rev });}
		    // }
	        }
		// ,validate_doc_update: validate_doc_update,
	        // lib: {
	        //     validator: validator
		// }


            }
        }
    },
    msg: {
	SIGNUP: 'signup',
	CONFIRM: 'confirm',
	RESETPWD: 'resetpwd',
	FORGOTPWD: 'forgotpwd',
	NOPWDLOGIN: 'nopwdlogin'
    },
    email: {
	signupSubject: "Complete signing up to cape!!!",
	//contents of email to send on signup
	signupEmail: function signupEmail(uuid) {
	    var html = "Click on the following link to complete sign up!!<br>" +
		"<a href='localhost:9001/confirm.html?signup=" + uuid + "'>Click here</a>";
	    return html;
	},
	resetPwdSubject: 'Reset cape pwd!!!',
	resetPwdEmail: function resetPwdEmail(uuid) {
	    var html = "Click on the following link to reset your password!!<br>" +
		"<a href='localhost:9001/resetpwd.html?resetpwd=" + uuid + "'>Click here</a>";
	    return html;
	},
	nopwdLoginSubject: 'Log into cape!!!',
	nopwdLoginEmail: function nopwdLoginEmail(uuid) {
	    var html = "Click on the following link to login without a password!!<tbr>" +
		"<a href='localhost:9001/resetpwd.html?nopwdlogin=" + uuid + "'>Click here</a>";
	    return html;
	}
    },
    couchdb: {
        config: {
            cors: { credentials: true, origins: 'http://localhost:9001' },
            httpd: { enable_cors: true },
            couch_httpd_auth: { timeout: 100*60*60 } //session length
        },
        databases: {
	    _users: {
	        name: '_users'
	        ,_design:  {
		    name: 'cape',
		    views: {
		        list: {
			    name: 'list',
			    fn: function(doc)
                            { if (doc._id.indexOf("_design/") === 0) return;
                              emit(doc._id, doc); }}
		        // ,uniqueEmail: {
			//     name: 'uniqueEmail',
			//     fn: function(doc)
                        //     {  emit(doc.uniqueEmail, null); }}
		    }
		    // ,validate_doc_update: validate_doc_update,
	            // lib: {
	            //     validator: validator
		    // }
	        }
	    },
            public: {
	        name: 'public',
                //publicly readable
                ttl: 300
                ,secObj: {"admins": {"names": [], "roles": []},
                          "members": {"names": [], "roles": []}},
	        _design:  {
	            name: 'cape',
	            filters: {
		        to: {
		            name: 'to',
		            fn: "function(doc, req) { \
if (doc && req.query.to === doc.to) return true;\
return false;  }"
		        }
	            },
		    views: {
		        expired: {
			    name: 'expired',
			    fn: "function(doc) \
{  emit(doc.timestamp, { rev: doc._rev });}"
		        }
		    }
	            ,validate_doc_update: public_vud
	            // lib: {
	            //     validator: validator
	            // }
	        }
            },
            temp: {
	        name: 'temp',
                ttl: 3600
                ,secObj: {"admins": {"names": [], "roles": []},
                          "members": {"names": ['_admin'], "roles": []}}
                //only admin can read and write this database
	        ,_design:  {
	            name: 'cape',
		    views: {
		        expired: {
			    name: 'expired',
			    fn: "function(doc) \
{  emit(doc.timestamp, { rev: doc._rev });}"
		        }
		    }
	        }
            },
            // postoffice: {
	    //     name: 'postoffice'
            //     ,secObj: {"admins": {"names": [], "roles": []},
            //               "members": {"names": ['_admin'], "roles": []}}
	    //     // _design:  {
	    //     //     name: 'cape'
	    //     //     ,validate_doc_update: validate_doc_update,
	    //     //     lib: {
	    //     //         validator: validator
	    //     //     }
	    //     // }
            // },
            reception: {
	        name: 'reception',
                // monitor: {
                //     interval: 10, //seconds
                //     warn: {
                //         doc_count: 2
                //     },
                //     error: {
                //         doc_count: 3
                //     }
                // },
                //publicly writable, but not readable, implemented with a proxy, rcouch
                //might fix this
                //TODO set validate_doc_update
	        _design:  {
	            name: 'cape',
	            validate_doc_update: reception_vud
	        }
            }
            ,aggregate: {
	        name: 'aggregate'
                // monitor: {
                //     interval: 10, //seconds
                //     warn: {
                //         doc_count: 2
                //     },
                //     error: {
                //         doc_count: 3
                //     }
                // },
                //publicly writable, but not readable, implemented with a proxy, rcouch
                //might fix this
                //TODO set validate_doc_update
	        ,_design:  {
	            name: 'cape',
	            validate_doc_update: reception_vud
	            ,filters: {
		        foo: {
		            name: 'foo',
		            fn: function(doc, req) {
                                if (doc.target === 'foo') return true;
                                return false;  }
		        }
		        ,bar: {
		            name: 'bar',
		            fn: function(doc, req) {
                                if (doc.target === 'bar') return true;
                                return false;  }
		        }
	            }
	        }
            }
        }
    }
};

// console.log(util.inspect(config, { depth: 10, colors: true}))  ;
    
module.exports = config;
