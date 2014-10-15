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
    
    reportError('unauthorized', 'You are not allowed to write to this database');
    
} 
