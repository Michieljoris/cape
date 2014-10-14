function (newDoc, oldDoc, userCtx, secObj){
  
    function reportError(type, error_msg) {
        log('Error writing document `' + newDoc._id +
            '\' to the database: ' + error_msg);
        var errorObj = {};
        errorObj[type] = error_msg;
        throw(errorObj);
    }
    
    if (newDoc._deleted === true && !oldDoc) {
        reportError('forbidden', 'Do not create deleted docs');
    }
  
    function is_admin(){
        return userCtx.roles.indexOf('_admin') !== -1;
    }
  
    if (is_admin()) return;
    
    var allowedMsgs =
        { 'signup': ['username', 'pwd', 'email', 'from' ],
          'confirm': ['uuid', 'from'],
          'forgotpwd': ['usernameOrEmail', 'from'],
          'resetpwd': ['uuid', 'pwd', 'from']};
    
    if (oldDoc) reportError('forbidden', 'You are not allowed to update docs');
    
    if (newDoc._deleted)
        reportError('unauthorized', 'You cannot delete documents from this database');
    
    if (!newDoc.msg || Object.keys(allowedMsgs).indexOf(newDoc.msg) === -1)
        reportError('forbidden', 'Illegal message field (msg)');
    
    Object.keys(newDoc).forEach(function(key) {
       if (allowedMsgs[newDoc.msg].indexOf(key) === -1)
           reportError('forbidden', 'Key ' + key +
                       ' is not allowed in a ' + newDoc.msg + ' message');
    });
} 
