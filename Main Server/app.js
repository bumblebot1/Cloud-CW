"use strict";

var express = require("express");
var bodyParser = require("body-parser");
var multer  = require('multer');
var upload = multer();
var app = express();
var port = process.env.PORT || 8080;
var path = require("path");
var GoogleAuth = require('google-auth-library');
var CLIENT_ID = "376810441789-fjcmqrde4a99a4fc843f53tn4ucibijp.apps.googleusercontent.com";

var Storage = require('@google-cloud/storage');
var Datastore = require("@google-cloud/datastore");

var projectId = 'imshare-189020';

var CLOUD_BUCKET = "imshare-storage";

var storage = new Storage({
    projectId: projectId
});
var bucket = storage.bucket(CLOUD_BUCKET);

var datastore = Datastore({
  projectId: projectId
});

function getPublicUrl (filename) {
  return `https://storage.googleapis.com/${CLOUD_BUCKET}/${filename}`;
}

function authenticateID (token, res){
  var auth = new GoogleAuth;
  var client = new auth.OAuth2(CLIENT_ID, '', '');
  console.log(token);
  client.verifyIdToken(
      token,
      CLIENT_ID,
      function(e, login) {
          var payload = login.getPayload();
          var userid = payload['sub'];
          var email = payload['email'];
          var name = payload['name'];
          res.send({
              id: userid,
              email: email
          });
          saveEmail(userid, name, email);
      });
}

function saveEmail (userid, name, email){
  const kind = "UserInfo";
  var key = datastore.key([kind, userid]);
  datastore.save({
    key: key,
    data: {
      name: name,
      email: email,
      userid: userid,
      galleryLink: `https://imshare-189020.appspot.com/gallery?userid=${userid}`
    }
  }).catch((err) => {
    console.log("Error: " + err);
  });
}

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.static(__dirname + "/public/login"));
app.use(express.static(__dirname + "/public/gallery"));
app.set('views', './public/gallery')
app.set("view engine", "pug");

app.post("/userLogin", function(req, res) {
  authenticateID(req.body.authToken, res)
});

app.get("/search", function(req, res) {
  var string = req.query.value;
  string = string.toLowerCase();
  if(string.length < 4) {
    string = string;
  } else {
    string = string.substr(0,4);
  }

  var start = string;
  var end = string + "\ufffd";

  const emailQuery = datastore.createQuery('UserInfo')
    .filter('email', '>=', start)
    .filter('email', '<=', end);

  datastore.runQuery(emailQuery)
    .then((results) => {
      const entities = results[0];
      var galleries = results[0].map((user) => ({link: user.galleryLink, email: user.email}));
      res.render("results", {galleries: galleries, query: req.query.value});
    })
    .catch((err) => {
      console.log("ERROR searching for " + req.query.value + " " + err);
    })
});


const NUM_SHARDS = 30;
const counterKind = "Counter";

function newView(userid) {
  var rand = Math.floor(Math.random() * NUM_SHARDS);
  console.log("Random number: " + rand);
  var key = datastore.key([counterKind, userid + "_" + rand]);
  const transaction = datastore.transaction();

  return transaction.run()
    .then(() => transaction.get(key))
    .then((results) => {
      var entity = results[0];
      var count = 0;
      if(entity) {
        count = entity.count;
      }
      count++;
      transaction.save({
        key: key,
        data: {
          count: count
        }
      });
      return transaction.commit();
    })
    .catch(() => transaction.rollback());
}


app.get("/gallery", function(req, res) {
  var kind = "User";
  var userid = req.query.userid;
  console.log("Id: " + req.query.userid);
  newView(userid);
  const transaction = datastore.transaction();
  var keys = [];
  for(var j = 0; j < NUM_SHARDS; j++) {
    var key = datastore.key([kind, userid + "_" + j]);
    keys.push(transaction.get(key));
  }
  
  return transaction.run()
    .then(() => Promise.all(keys))
    .then((results) => {
      const entities = results.map((result) => result[0]);
      var images = [];
      var email = undefined;
      for(var i = 0; i < NUM_SHARDS; i++){
        if(entities[i] && entities[i].images) {
          console.log(JSON.stringify(entities[i].images))
          images = images.concat(entities[i].images);
          email = entities[i].email;
        }
      }
      res.render("gallery", {email: email, images: images});
      
      return transaction.commit();
    })
    .catch(() => transaction.rollback());
});

function checkNotExists(obj, arr) {
  for(var i = 0; i < arr.length; i++) {
    if(arr[i].name === obj.name){
      return false;
    }
  }
  return true;
}

app.get("/viewCount", function(req, res) {
  var userid = req.query.userid;
  const transaction = datastore.transaction();
  var keys = [];
  for(var j = 0; j < NUM_SHARDS; j++) {
    var key = datastore.key([counterKind, userid + "_" + j]);
    keys.push(transaction.get(key));
  }

  return transaction.run()
    .then(() => Promise.all(keys))
    .then((results) => {
      const counters = results.map((result) => result[0]);
      var total = 0;
      for(var i = 0; i < NUM_SHARDS; i++){
        if(counters[i]) {
          total += counters[i].count;
        }
      }
      console.log("Total is: " + total);
      res.send({
        count: total
      });
      return transaction.commit();
    })
    .catch(() => transaction.rollback());
})

app.get("/", function(req, res) {
  res.sendFile(path.join(__dirname + "/public/login/login.html"));
});

app.listen(port);

app.use(function(req, res, next) {
  res.status(404);
  
  if (req.accepts('html')) {
    res.render('error', { url: req.url });
    return;
  }

  if (req.accepts('json')) {
    res.send({ error: 'Not found' });
    return;
  }

  res.type('txt').send('Not found');
})