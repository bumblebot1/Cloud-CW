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

app.use(express.static(__dirname + "/error"));
app.set('views', './error')
app.set("view engine", "pug");

function getPublicUrl (filename) {
  return `https://storage.googleapis.com/${CLOUD_BUCKET}/${filename}`;
}

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

const NUM_SHARDS = 30;

function checkNotExists(obj, arr) {
  for(var i = 0; i < arr.length; i++) {
    if(arr[i].name === obj.name){
      return false;
    }
  }
  return true;
}

app.get("/deleteImage", function(req, res) {
  console.log(imageName + "  DELETING");
  var token = req.query.authToken;
  var imageName = req.query.imageName;
  var auth = new GoogleAuth;
  var client = new auth.OAuth2(CLIENT_ID, '', '');
  client.verifyIdToken(
      token,
      CLIENT_ID,
      function(e, login) {
          var payload = login.getPayload();
          var userid = payload['sub'];
          const kind = "User";
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
              for(var i = 0; i < NUM_SHARDS; i++){
                if(entities[i]){
                  console.log(checkNotExists({name: imageName}, entities[i].images));
                  if(!checkNotExists({name: imageName}, entities[i].images)) {
                    console.log("GOT IN THE REPLACE");
                    var newList = entities[i].images.filter(x => x.name !== imageName);
                    var key = datastore.key([kind, userid + "_" + i])
                    transaction.save({
                      key: key,
                      data: {
                        email: entities[i].email,
                        images: newList
                      }
                    })
                    var filename = userid + "_" + imageName;
                    console.log(filename);
                    bucket.file(filename).delete();
                    res.status(200).send("Ok");
                    return transaction.commit();
                  }
                }
              }
              res.status(400).send("File does not exist");
              return transaction.commit();
            })
            .catch(() => transaction.rollback());
      });
})

app.post("/uploadImage", upload.single("imageFile"), function(req, res) {
  const kind = "User";
  var keys = [];
  const transaction = datastore.transaction();
  var userid = req.body.id;
  for(var j = 0; j < NUM_SHARDS; j++) {
    var key = datastore.key([kind, userid + "_" + j]);
    keys.push(transaction.get(key));
  } 

  return transaction.run()
    .then(() => Promise.all(keys))
    .then((results) => {
        var entities = results.map((result) => result[0]);
        var images = [];
        for(var i = 0; i < NUM_SHARDS; i++) {
          if(entities[i]){
            console.log("Images " + i + " " + entities[i].images);
          }
          if(entities[i] && entities[i].images && entities[i].images.length > 0) {
            images = images.concat(entities[i].images);
          }
        }
        console.log(images);
        const gcsname = req.body.id + "_" + req.file.originalname;
        var publicURL = getPublicUrl(gcsname);
        var newEntry = {
          link: publicURL,
          name: req.file.originalname
        };
        console.log(newEntry);
        if(checkNotExists(newEntry, images))
          console.log("TRUE");
        else 
          console.log("FALSE");

        if(checkNotExists(newEntry, images)){
          var rand = Math.floor(Math.random() * NUM_SHARDS);
          var newImages = [newEntry];
          if(entities[rand]) {
            newImages = entities[rand].images.slice();
            newImages.push(newEntry);
          }
          var key = datastore.key([kind, userid + "_" + rand]);
          console.log("NEW ONES"+newImages);

          transaction.save({
            key: key,
            data: {
              email: req.body.email,
              images: newImages
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

app.listen(port);

app.use(function(req, res, next) {
  console.log("error");
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
