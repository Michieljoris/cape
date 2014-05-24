// This file is the source for constructing a `package.json` file.
// JSON is a wonderful interchange format, but due to the fact that the
// [JSON Specification](http://json.org) does not allow for comments, I find
// it horrid for self documenting examples.
//
// JavaScript allows for comments and inherently allows JSON. This file will
// act as the source for building a `package.json` file that also manages this
// package.
//
// It is the closest I can get to a self-documenting `package.json` file.


//Before executing this file for the first time do:
//npm install fs-extra
//in the sites directory

// The `package.json` file always consists of one top level object, which is
// what we export here in a [Node.js](http://nodejs.org) friendly way that
// will allow us to build our `package.json` file. A real `package.json` file
// will not contain the `exports = ` definition, nor any of these comments.
module.exports = {
    // Many of the following `package.json` parameters are optional depending
    // on whether or not this package will ever be published, and depending
    // on how much management we want to delegate to npm. I did not mark
    // optional vs. not-optional for the parameters, as a `package.json` file
    // is by its nature always optional.
    
    // Our npm package name needs to be unique only if we are going to publish
    // our package into an npm registry. If we aren't going to publish the 
    // package the name can be anything we want.
    //
    // Leave off redundant affixes like `node-package` or `package-js`. 
    // We know it is JavaScript for Node.
    "name": "projectname",
    // A single line, or sometimes slightly longer, description of our package.
    "description": "Scaffold for a website using bb-server and html-builder",
    // [npm](http://npmjs.org) enforces the X.Y.Z semantic version 
    // scheme that is described at [http://semver.org/](http://semver.org/)
    // and we should follow this versioning for our package.

    //If this option is falsy, the version in the package.json is bumped
    // "version": "0.1.0",
    // URL to the homepage for this package.
    "homepage": "https://github.com/michieljoris/projectname",
    
    // Where is the source of truth for this code, and what type of repo is it?
    "repository": {
        "type": "git",
        "url": "https://github.com/michieljoris/projectname.git"
    },
    // Every package should have at least one author. There are a couple of
    // formats for the author. I prefer the explicit object format as follows:
    "authors": [
        "Michiel van Oosten <mail@axion5.net>"
    ],
    // What licenses govern this code, and where is the license associated
    // with this code?
    // The complex form, "licenses", is an array of objects.
    // The simplest form is "license", and may point to just a string that
    // represents the standard name of the license, like "MIT".
    
    "license": "MIT",
    
    // "moduleType": [
    //     "amd"
    // ],
    
    "ignore": [
        "**/.*",
        "node_modules",
        "bower_components",
        "test",
        "tests"
    ],
    // If there is a file that should be loaded when require()ing this 
    // folder-as-a-package, declare this file here, relative to our package 
    // structure.
    // "main": "lib/projectname.js",
    
    // What other modules/libraries do we require for our own module?
    // The beauty of this dependencies block is that these modules will
    // be downloaded magically when we run npm install from within our
    // directory. npm itself will sort out any dependency conflicts within
    // our own dependencies and we can be pretty much assured that the
    // modules we need will be ready to run.
    //
    // **NOTE:** We don't have any dependencies for this module. See the
    // `devDependencies` block for the way to include dependencies.
    "dependencies": {
        //node
        // "angular": "~1.2.14",
        // "angular-ui": "~0.4.0",
        // "modernizr": "~2.7.2",
        //amd
        // "bootstrap": "~3.1.1",
        // "foundation": "~5.2.0",
        // "jquery-ui": "~1.10.4",
        // "normalize.css": "~3.0.0"
        
    },
    // What dependencies are useful only for developers?
    // Installed when we `npm install` in our working directory, but not 
    // when people require our package in their own package.json. This is the 
    // usual and accepted place to put test frameworks and documentation
    // tools.
    //
    // The packages we depend on for development:
    // * **doccoh**: Documentation utility for this code.
    "devDependencies": {
        // "doccoh": "0.4.1"
    },
    // Should this package be prevented from accidental publishing by npm?
    // The default is false (not hidden), but I include this here for doc
    // purposes.
    "private": false
};


// Small script used to write the package.json file out from the package.js
// file.

var fs = require("fs-extra");
var bowerjs = require("./bower.js");
var v = '0.0.0'; 

if (!bowerjs.version) {
    try {
        v = require('./bower.json').version;
    } catch(e) {
        console.log('Created new bower.json. You\'re at version 0.0.0.');
    } 
    var s = v.split('.');
    v = [s[0],s[1],parseInt(s[2]) + 1].join('.');
    bowerjs.version = v;
}

console.log("Writing the bower.json file out from bower.js...");
fs.writeJSONFile("bower.json", bowerjs, function(err){
    if (err) {
        console.log("Error writing bower.json");
        console.log(err);
        console.log("");
    }
    else {
        console.log(bowerjs);
        console.log("\nbower.json written successfully.");
        console.log("");
    }
});
