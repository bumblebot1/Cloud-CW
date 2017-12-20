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

function sendUploadToGCS (req, res, next) {
  if (!req.file) {
    return next();
  }

  const gcsname = req.body.id + "_" + req.file.originalname;
  const file = bucket.file(gcsname);
  const stream = file.createWriteStream({
    metadata: {
      contentType: req.file.mimetype
    }
  });

  stream.on('error', (err) => {
    req.file.cloudStorageError = err;
    next(err);
  });

  stream.on('finish', () => {
    req.file.cloudStorageObject = gcsname;
    file.makePublic().then(() => {
      req.file.cloudStoragePublicUrl = getPublicUrl(gcsname);
      next();
    });
  });

  stream.end(req.file.buffer);
  
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

app.get("/gallery", function(req, res) {
  const kind = "User";
  console.log("Id: " + req.query.userid);
  var key = datastore.key([kind, req.query.userid]);
  datastore.get(key, function(err, entity) {
    var images = [];
    if(entity) {
      images = entity.images.slice(0, entity.images.length);
    }
    res.render("gallery", {email: entity.email, images: images});
  });
});

function checkNotExists(obj, arr) {
  for(var i = 0; i < arr.length; i++) {
    if(arr[i].link === obj.link && arr[i].name === obj.name){
      return false;
    }
  }
  return true;
}

app.post("/uploadImage", upload.single("imageFile"), sendUploadToGCS, function(req, res) {
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
        var newEntry = {
          link: req.file.cloudStoragePublicUrl,
          name: req.file.originalname
        };

        if(checkNotExists(newEntry, images)){
          images.push(newEntry);
        }
        transaction.save({
          key: key,
          data: {
            email: req.body.email,
            images: images
          }
        });
        console.log("Saved " + req.body.id + "_" + req.file.originalname + " " + req.file.cloudStoragePublicUrl);
        res.status(200).send('OK');
        return transaction.commit();
    })
    .catch(() => transaction.rollback());
});

app.get("/", function(req, res) {
  res.sendFile(path.join(__dirname + "/public/login/login.html"));
});

app.listen(port);
