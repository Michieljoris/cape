var Path = require('path') ;
var log = require('logthis').logger._create(Path.basename(__filename));
  
  
function change(error, change) {
    if(!error) {
        log(change);
        log('Postoffice' + ": Change " + change.seq + " has " + Object.keys(change.doc).length + " fields");
    }
    else log._e(error);
}
  
module.exports = change; 
