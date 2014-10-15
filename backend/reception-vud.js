function (newDoc, oldDoc, userCtx, secObj){
    var maxLenValue = 128;
  
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
    
    var allowedFields =
        { 'signup': ['username', 'pwd', 'email'],
          'confirm': ['uuid'],
          'forgotpwd': ['usernameOrEmail'],
          'resetpwd': ['uuid', 'pwd']};
    var standardFields = ['from', 'msg'];
    
    if (oldDoc) reportError('forbidden', 'You are not allowed to update docs');
    
    if (newDoc._deleted)
        reportError('unauthorized', 'You cannot delete documents from this database');
    
    if (!newDoc.msg || Object.keys(allowedFields).indexOf(newDoc.msg) === -1)
        reportError('forbidden', 'Illegal value for field msg: ' + newDoc.msg);
    
    Object.keys(newDoc).forEach(function(key) {
        if (key[0] === '_') return;
        if (standardFields.indexOf(key) === -1 &&
            allowedFields[newDoc.msg].indexOf(key) === -1)
            reportError('forbidden', 'Key "' + key +
                        '" is not allowed in a ' + newDoc.msg + ' message');
        if (typeof newDoc[key] !== 'string' || !newDoc[key].length ||
            newDoc[key].length > maxLenValue) 
            reportError('forbidden', 'The value of key "' + key +
                        '" is either not a string, empty or longer than ' + maxLenValue +
                        ' chars');
    });
    
} 
