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
    
    var respStr = 
'<ted5000ActivationResponse>\
  <PostServer>' + request.headers.host + '</PostServer>\
  <UseSSL>T</UseSSL>\
  <PostPort>443</PostPort>\
  <PostURL>/post/' + request.params.feed_id + '</PostURL>\
  <AuthToken>' + extract_post_body(request.body).match(/<Unique>(.*)<\/Unique>/)[1]; + '/AuthToken>\
  <PostRate>1/PostRate>\
  <HighPrec>T</HighPrec>\
</ted5000ActivationResponse>'

    response.send(respStr, { 'Content-Type': 'application/xml' }, 200);
  }
);

app.post('/post/:feed_id',
  // Success handling function
  function(request, response) {
    console.log(extract_post_body(request.body));
    response.send(200);
  }
);

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});


function extract_post_body(post){
  for(var key in post){
    return key
  }
}