var express = require('express');
var url = require('url');
var http = require('http');
var request = require('request');

var app = express.createServer(
  express.logger(),
  express.bodyParser()
);

app.get('/',
  // Success handling function
  function(request, response) {
    response.send('Home Page');
  }
);

app.post('/activate/:feed_id',
  // Success handling function
  function(request, response) {
    
    var secret;
    for(var key in request.body){
      secret = key.match(/<Unique>(.*)<\/Unique>/)[1];
      break;
    }
    
    var respStr = 
'<ted5000ActivationResponse>\
  <PostServer>pachube-ted.heroku.com/</PostServer>\
  <UseSSL>T</UseSSL>\
  <PostPort>443</PostPort>\
  <PostURL>/post/' + request.params.feed_id + '</PostURL>\
  <AuthToken>' + secret + '/AuthToken>\
  <PostRate>1/PostRate>\
  <HighPrec>T</HighPrec>\
</ted5000ActivationResponse>'

    response.send(respStr, { 'Content-Type': 'application/xml' }, 200);
  }
);

app.post('/post/:feed_id',
  // Success handling function
  function(request, response) {}
);

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
