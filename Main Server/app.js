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
          res.send({
              id: userid,
              email: email
          });
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

app.get("/viewCount", function(req, res) {
  var userid = req.query.userid;
  const transaction = datastore.transaction();
  var keys = [];
  for(var j = 0; j < NUM_SHARDS; j++) {
    var key = datastore.key([counterKind, userid + "_" + j]);
    keys.push(transaction.get(key));
  }

  var promise = Promise.all(keys);
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

app.get("/gallery", function(req, res) {
  const kind = "User";
  console.log("Id: " + req.query.userid);
  newView(req.query.userid);
  var key = datastore.key([kind, req.query.userid]);
  datastore.get(key, function(err, entity) {
    var images = [];
    var email = undefined;
    if(entity) {
      images = entity.images.slice(0, entity.images.length);
      email = entity.email;
    }
    res.render("gallery", {email: email, images: images});
  });
});

function checkNotExists(obj, arr) {
  for(var i = 0; i < arr.length; i++) {
    if(arr[i].name === obj.name){
      return false;
    }
  }
  return true;
}

app.post("/uploadImage", upload.single("imageFile"), function(req, res) {
  const kind = "User";
  var key = datastore.key([kind, req.body.id]);
  const transaction = datastore.transaction();

  return transaction.run()
    .then(() => transaction.get(key))
    .then((results) => {
        var entity = results[0];
        var images = [];
        if(entity) {
          images = entity.images.slice(0, entity.images.length);
        }
        const gcsname = req.body.id + "_" + req.file.originalname;
        var publicURL = getPublicUrl(gcsname);
        var newEntry = {
          link: publicURL,
          name: req.file.originalname
        };

        if(checkNotExists(newEntry, images)){
          images.push(newEntry);
          transaction.save({
            key: key,
            data: {
              email: req.body.email,
              images: images
            }
          });
          const file = bucket.file(gcsname);
          const stream = file.createWriteStream({
            metadata: {
              contentType: req.file.mimetype
            }
          });
          stream.on('error', (err) => {
            console.log("Error writing file: " + gcsname + " " + err);
          });
          stream.on('finish', () => {
            req.file.cloudStorageObject = gcsname;
            file.makePublic().then(() => {
              req.file.cloudStoragePublicUrl = publicURL;
              console.log("Saved " + req.body.id + "_" + req.file.originalname + " " + req.file.cloudStoragePublicUrl);
              res.status(200).send('OK');
            });
          });
          stream.end(req.file.buffer);
        } else {
          res.status(409).send(req.file.originalname + " already exists on the server");
        }
        return transaction.commit();
    })
    .catch(() => transaction.rollback());
});

app.get("/", function(req, res) {
  res.sendFile(path.join(__dirname + "/public/login/login.html"));
});

app.listen(port);
