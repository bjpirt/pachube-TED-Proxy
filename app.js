var express = require('express');
var url = require('url');
var http = require('http');
var util = require('util');
var request = require('request');
var xml2js = require('xml2js');
var qs = require('querystring');

var app = express.createServer(
  express.logger(),
  express.bodyParser(),
  express.cookieParser()
);

var client_id = process.env.CLIENT_ID;
var client_secret = process.env.CLIENT_SECRET;
var pachube_url = 'pachube.com'

if(process.env.REDISTOGO_URL){
  var rtg   = require("url").parse(process.env.REDISTOGO_URL);
  var rtg_pass = rtg.auth.split(':')[1]
  var redis = require("redis").createClient(rtg.port, rtg.hostname);
  redis.auth(rtg_pass, function(){console.log("connected to redis");});
}else{
  var redis = require("redis").createClient();
}
app.use(express.static(__dirname + '/public'))

app.get('/',
  function(req, resp) {
    resp.render('index.ejs', {client_id: client_id, pachube_url: pachube_url});
  }
);

app.post('/activate',
  function(req, resp) {
    var unique = extract_post_body(req.body).match(/<Unique>(.*)<\/Unique>/)[1];
    resp.header('Content-Type', 'application/xml' );
    resp.render('activate.ejs', {server: req.headers.host, authtoken: unique, layout:false});
  }
);

app.get('/oauth',
  function(req, resp) {
    var form_data = {
      code: req.query.code,
      client_id: client_id,
      client_secret: client_secret,
      grant_type: 'authorization_code',
      redirect_uri: 'https://' + req.headers.host + '/oauth'
    };

    request({method: 'POST', uri: 'https://' + pachube_url + '/oauth/token', form: form_data, body:qs.stringify(form_data)}, function(error, response, body) {
      if(response.statusCode == 200){
        //store the key and details
        resp_json = JSON.parse(body);
        key = resp_json.access_token.substr(0, 20);
        // Set a cookie so we know who we're dealing with
        resp.cookie('ted_userid', key, { maxAge: 9000000000 });
        // Make sure the user hasn't already authed
        redis.hgetall(key, function(err, existing){
          // Store the access_token if we haven't already
          if(existing['access_token'] != resp_json.access_token){
            redis.hset(key, 'access_token', resp_json.access_token);
          }
          
          if(!existing['feed_id']){
            // Create the feed on Pachube
            var feed = {version:"1.0.0", title: "TED5000 Energy Monitor"}
            request({method: 'POST', uri: 'https://api.' + pachube_url + '/v2/feeds.json', form: form_data, body:JSON.stringify(feed), headers: {'X-PachubeApiKey':resp_json.access_token}}, function(pb_error, pb_resp, pb_body) {
              if(pb_resp.statusCode == 201){
                var feed_id = pb_resp.headers.location.replace('https://api.' + pachube_url + '/v2/feeds/', '')
                redis.hset(key, 'feed_id', feed_id);
                resp.redirect('/setup')
              }else{
                resp.send("Error", { 'Content-Type': 'text/html' }, 200);
              }          
            });
          }else{
            resp.redirect('/setup')
          }
        });
      }else{
        resp.send("Error", { 'Content-Type': 'text/html' }, 200);
      }
    });
  }
);

app.get('/setup',
  function(req, resp) {
    var ted_userid = req.cookies.ted_userid;
    redis.hget(ted_userid, 'feed_id', function(err, feed_id){
      if(ted_userid && feed_id){
        resp.render('setup.ejs', {ted_userid: ted_userid, feed_id: feed_id, pachube_url: pachube_url});
      }else{
        resp.redirect('/');
      }
    });
  }
);

app.post('/post',
  function(req, resp) {
  
    var doc = extract_post_body(req.body);
    
    send_to_pachube(doc, function(){
      resp.send(200);
    });
    
  }
);

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});

function generate_pachube_feed_doc(raw_data){
  var output = {version: "1.0.0", datastreams: [], tags: ["TED5000", "Energy", "Power"]}
  console.log(raw_data)
  for (mtu in raw_data.MTU){
    console.log(mtu);
    output.datastreams.push({id: "MTU-" + raw_data.MTU[mtu]['@'].ID});
  }
  return JSON.stringify(output);
}

function send_to_pachube(doc, feed_id, cb){
  console.log("Sending to Pachube");
  var parser = new xml2js.Parser();
  parser.parseString(doc, function (err, result) {
    if(err == null){
      // Generate a Pachube feed document to make sure all of the datastreams exist and send it to Pachube
      var feed_doc = generate_pachube_feed_doc(result)
      console.log(result['@'].auth)
      request({
        uri: 'http://api.pachube.com/v2/feeds/' + feed_id + '.json',
        method: 'PUT',
        body: feed_doc,
        headers: {'X-PachubeApiKey': result['@'].auth}
      }, function (error, response, body) {
        if(error == null){
          cb();
        }else{
          console.log(error)
        }
      });
      console.log(util.inspect(feed_doc, false, null));
      //console.log(util.inspect(result, false, null));
      //console.log('Done');
    }else{
    
    }
  });
}

function extract_post_body(post){
  for(var key in post){
    return key
  }
}