var util = require('util');
var fs = require('fs-extra');
  
var validator =  fs.readFileSync('./validator.js', { encoding: 'UTF8'});
var validate_doc_update =  fs.readFileSync('./validate_doc_update.js', { encoding: 'UTF8'});
var reception_vud =  fs.readFileSync('./reception-vud.js', { encoding: 'UTF8'});
  
var config =  {
    msg: {
	SIGNUP: 'signup',
	CONFIRM: 'confirm',
	RESETPWD: 'resetpwd',
	FORGOTPWD: 'forgotpwd'
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
	}
    },
    couchdb: {
	_users: {
	    name: '_users', 
	    _design:  {
		name: 'cape',
		view: {
		    list: {
			name: 'list',
			fn: "function(doc) \
{  emit(doc.name, { name: doc.name, email: doc.email });}"
		    }
		}
		// ,validate_doc_update: validate_doc_update,
	        // lib: {
	        //     validator: validator
		// }
	    }
	}
    },
    public: {
	name: 'public',
        //publicly readable
        names: [], roles: [],
	_design:  {
	    name: 'cape',
	    filters: {
		from: {
		    name: 'from',
		    fn: "function(doc, req) { \
if (doc && req.query.from === doc.from) return true;\
return false;  }"
		}
	    }
	    // ,validate_doc_update: validate_doc_update,
	    // lib: {
	    //     validator: validator
	    // }
	}
    },
    temp: {
	name: 'temp',
        //only admin can read and write this database
        names: ['admin'], roles: [],
	// _design:  {
	//     name: 'cape'
	//     ,validate_doc_update: validate_doc_update,
	//     lib: {
	//         validator: validator
	//     }
	// }
    },
    postoffice: {
	name: 'postoffice',
        names: ['admin'], roles: [],
	// _design:  {
	//     name: 'cape'
	//     ,validate_doc_update: validate_doc_update,
	//     lib: {
	//         validator: validator
	//     }
	// }
    },
    reception: {
	name: 'reception',
        //publicly writable, but not readable, implemented with a proxy, rcouch
        //might fix this
        //TODO set validate_doc_update
        names: [], roles: [],
	_design:  {
	    name: 'cape',
	    validate_doc_update: reception_vud
	}
    }
};
  
// console.log(util.inspect(config, { depth: 10, colors: true}))  ;
    
module.exports = config;
