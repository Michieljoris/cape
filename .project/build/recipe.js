/*global */
var mainMenuTree = [
    // { label: 'Home', icon: '', route: 'home'
    //    // sub: [
    //    //     { label: 'Contact us', route: 'contactus', scroll: true}
    //    //     ]
    // }
];

var slides =  [
    // { url: "images/slides/home_page_Early_Childhood_Education_and_Care_training.jpg"
    //   // ,title: 'Early Childhood Education and Care training'
    //   // ,subtitle: 'Aged care slogan'
    // }
];

var develop_mode = process.env.DEVELOP; 
var exports = {
    verbose: true
    ,printMap: false
    ,prettyPrintHtml: false
    // ,tagIdPostfix: '__' //can be overridden per template
    ,paths: {
        root: process.cwd()
        //relative to this root:
        ,partials: 'build/'  //can be overridden per template
        ,www: 'www'
        ,out:'built' 
        ,js: 'js'
    }
    /*
      If cachify if falsy resources will be requested as is, without a
      stamp. Which means bb-server will send them with max-age=0 and
      expires=[data-in-the-past], which means any caching mechanism will call
      back to the server to ask for an update.
      
      If cachify is truthy all requests for files with the following extensions
      will be stamped by prepending a sha1 hash checksum to the path to the
      file, in other words, uniquifying the request for a particular version
      of a file:
      
      css js jpg jpeg gif ico png bmp pict csv doc pdf pls ppt tif tiff eps swf midi
      mid ttf eot woff svg svgz webp docx xlsx xls pptx ps
      
      (https://support.cloudflare.com/hc/en-us/articles/200172516-What-file-extensions-does-CloudFlare-cache-for-static-content-)

      This will only work if the server serving the files is able to strip these
      stamps before processing the request

      If this option (stamp) is truthy,  by default bb-server sets
      max-age=[one-year] and expires=[one-year-in-the-future] (see the cache and
      stamp settings of bb-server) of responses to requests for stamped
      files. If not turned on it will respond with lots of 404's :-).
      
      To opt out for a particular extension, list it under exclude. Requests for
      these files will be for the real filename, maybe set cache-control:
      max-age=[1day].
      
      To use mtime instead of a hash to uniqify a request for a file with a
      particular extension, list the extension under mtime. This will speed up
      html-builder if you are cachefying lots of resources, however it will not
      work if you replace a newer file with an older one, like a pdf file with a
      another pdf file of the same name, but created before the first one. You'd
      have to use the linux command touch on it first.
      
      
      Possibly implement a manifest, so a file that maps filename to its hash
      and version number, you could get away with a much smaller stamp. Possibly
      two char if you have variable length and let bb-server recognize the stamp
      by a prefix. Only risk is to loose the manifest.
    */ 
    // ,cachify: !develop_mode 
    // ,cachify: true
    //hash or mtime, query or modified filename
    
    ,cachify : develop_mode ? false : {
    // ,cachify : {
        exclude: ['doc', 'docx'] //for instance ['pdf', 'doc']
        ,method: 'sha1' //mtime or any of the hashes returned from crypto.getHashes()
        // (var crypto = require('crypto');
        // var hashes = crypto.getHashes(); )
        ,length: 10 //ignored and set to 13 when method === mtime
        ,prefix: '__' //for instance 'stamp-'
        //make sure to add a 'cachify' id in the head, or before any javascript
        //that might want to use the cachify function:
        ,list: [
            'images/slides/tab_about_us.jpg',
            'documents/Diploma_Early_Childhood_Course_Guide.pdf'
        ]
    } 
    //group the script and link blocks and concatenate all files listed in a block
    ,concatenate: !develop_mode 
    //make sure to load the resources for custom components, the files get added
    //to the first script and link blocks.
    // ,extras: ['flex-slider', 'cssmenu', 'showhide']
    //angular routes:
    // ,routes : [
    //     ['guide', '/built/guideView.html'],
    //     ['template', '/built/guideTemplate.html', 'templateCntl']
    // ]
    
    //Every partial generates a string. How the partial is generated
    //depends on its type. Each type can define more than one partial
    //of that type by assigning an array of definitions instead of
    //just one (object) definition to that type. These partials are
    //identified by their id. This enables them to uses as the source in
    //later defined templates. They don't need an id if you just want
    //to generate a string to save to the file defined in 'out'.
    ,partials: {
        ids: {
            title: '<title>Scaffold</title>'
            ,skewer: develop_mode ? '<script src="http://localhost:9090/skewer"></script>' : ' '
            // ,recaptcha: '<script type="text/javascript" src="http://www.google.com/recaptcha/api/js/recaptcha_ajax.js"></script>'
            // ,fragment: '<meta name="fragment" content="!">'
            
            ,hello_world: '<h2>Hello world. Build on this scaffold!!!</h2>'
        }
        ,metaBlock : {
            id: 'meta',
            tags: [ { charset:'utf-8' }
                    ,{ content:"IE=edge,chrome=1",
                       "http-equiv":"X-UA-Compatible"
                     }
                    ,{ content:"",
                       name:"description"
                     }
                    ,{ name: "viewport"
                       ,content: "width=device-width, initial-scale=1, maximum-scale=1"}
                  ]
        }
        ,linkBlock:  {
            id: 'linkBlock',
            files:  [
                // 'bower/normalize.css/normalize.css'
                // ,'bower/bootstrap/dist/css/bootstrap.css'
                // ,'bower/foundation/css/foundation.css'
                // ,'bower/jquery-ui/jquery-ui.custom.css'
                // ,'bower/angular-ui/build/angular-ui.css'
                
                // ,'vendor/h5bp.css'
                // ,'vendor/checkboxes.css'
                
                ,'main.css'
            ]
            ,path: 'css/'
        }
        ,scriptBlock: [
            {
                id: 'headJsBlock',
                files: [
                ],
                path: 'scripts/'
            },
            {
                id: 'jsBlock',
                files: [
                    // 'bower/jquery/dist/jquery.js' //v2.1.0
                    //,'bower/bootstrap/dist/js/bootstrap.js'
                    // ,'bower/foundation/js/foundation.js'
                    // ,'bower/angular/angular.js'
                    // ,'bower/angular-ui/build/angular-ui.js'
                    // ,'bower/ui-bootstrap-tpls-0.2.0.js'
                    // ,'bower/modernizer/modernizr.js'
                    // ,'bower/jquery-ui/jquery-ui.js'
                    
                    // ,'vendor/noconsole.js'
                    //,'vendor/jquery-1.6.2.min.js'
                    //,'vendor/jquery-1.8.3.min.js'
                    //,'vendor/jquery-1.9.1.min.js'
                    //,'vendor/jquery-1.9.1.min.js'
                    
                    // ,'router'
                    // ,'angular.js'
                    // ,'test.coffee'
                    
                ],
                path: 'scripts/'
            }
        ]
        // ,slideShow: [{ type: 'flex',
        //                id: 'flex',
        //                slides: slides
        //              }
        // ]
        ,menu: [
            // { type: 'superfish',
            //       tree: mainMenuTree,
            //       id: 'superfish'
            //     },
        ]
        ,template: [
            // { src: 'views/guide.html' 
            //   ,tagIdPostfix: '--' //can be overridden per template
            //   ,out: 'guideView.html'
            //   ,mapping: {
            //       menu: 'html/docmenu',
            //       doc: 'markdown/doc.md'
            //   }
            // }
            // ,{ src: 'views/template.html' 
            //   ,tagIdPostfix: '--' //can be overridden per template
            //   ,out: 'guideTemplate.html'
            //   ,mapping: {
            //       // menu: 'html/docmenu',
            //       // doc: 'markdown/doc.md'
            //   }
            // },
            //Main layout
            ,{ id: 'body'
               ,src: 'html/body.html' 
               ,tagIdPostfix: '--' //can be overridden per template
               ,mapping: {
                   hello_world: "hello_world"
               }
             }
            ,{  
               src: 'html/basicAngularPage.html'
               ,tagIdPostfix: '' //can be overridden per template
               ,pathOut: ''
               ,out: 'www/index.html' //optional, relative to root
               
               //Maps tag ids to partial ids. Tag ids have to be
               //postfixed with two dashes in the template. Partials
               //with an extension will be loaded from the partials
               //folder for this template. Markdown files will be
               //converted to html. Partials in an array will be
               //concatenated before inserted at the tag id element
               
               //Make sure to have the cachify partial included in the head if
               //you want to dynamically load resources from javascript, but
               //want to retrieve cachified versions. Include the resources
               //under cachify.list
               ,mapping: {
                   head: ['title', 'meta',  'html/ieshim','skewer',
                          // 'firebug',
                          'headJsBlock',
                          'linkBlock'
                          ,'cachify'
                         ],
                  
                   "ng:app": ['body', 'jsBlock'
                              // ,'html/google_analytics.html'
                             ]
               }
             }
            
        ] 
    }
};


//TODO update bootstrap
//TODO use bower or something for vendor libs
