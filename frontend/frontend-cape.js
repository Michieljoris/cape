//frontend-cape.js
var VOW = require('dougs_vow');
var vouchdb = require("vouchdb");
 

function test() {
    
    vouchdb.connect("http://localhost:5984");
    console.log(vouchdb.test('info'));
    
}

module.exports = {
    test: test
};

test();
