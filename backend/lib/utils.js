//utils.js
var Path = require('path') ;
var log = require('logthis').logger._create(Path.basename(__filename));
  
// var VOW = require('dougs_vow');
// var vouchdb = require("vouchdb");

//Given a JS object, it will return a proper design doc that can be saved to couchdb.
function createDesignDoc(design) {
    if (!design) return false;
    var doc = {
        _id: '_design/' + design.name
    };
    if (design.validate_doc_update)
        doc.validate_doc_update = design.validate_doc_update.toString();
    if (design.lib) {
        doc.lib = design.lib.toString();
    }
    if (design.views) {
        doc.views = {};
        Object.keys(design.views).forEach(function(key) {
            doc.views[design.views[key].name] = { map: design.views[key].fn.toString() };
        });
    }
    if (design.filters) {
        doc.filters = {};
        Object.keys(design.filters).forEach(function(key) {
            doc.filters[design.filters[key].name] = design.filters[key].fn.toString();
        });
    }
    return doc;
    
};

module.exports = {
  createDesignDoc: createDesignDoc
  };
