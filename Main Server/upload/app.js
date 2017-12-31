"use strict";
require('@google-cloud/debug-agent').start();
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

app.get("/deleteImage", function(req, res) {
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
          const gcsname = userid + "_" + imageName;
          var key = datastore.key(["Image", gcsname]);

          datastore.delete(key)
            .then((data) => {
              console.log(data);
              console.log("Delete Successful " + gcsname);
              bucket.file(gcsname).delete();
              res.status(200).send("Ok");
            })
            .catch((err) => {
              console.log("Delete failed " + err)
            })
    });
});

app.post("/uploadImage", upload.single("imageFile"), function(req, res) {
  const transaction = datastore.transaction();
  var gcsname = req.body.id + "_" + req.file.originalname;
  var publicURL = getPublicUrl(gcsname);
  var userid = req.body.id;
  var key = datastore.key(["Image", gcsname]);
  var keys = [transaction.get(key)];

  return transaction.run()
    .then(() => Promise.all(keys))
    .then((results) => {
      var entities = results.map((result) => result[0]);
      console.log(typeof entities[0]);
      console.log(entities[0]);
      console.log(entities[0]+ " next");
      console.log("Printing result of query " + entities);
      console.log("Printing second " + entities[0]);
      if(!results[0][0]) {
        var newImageKey = datastore.key(["UserInfo", userid, "Image", gcsname]);

        transaction.save({
          key: newImageKey,
          data: {
            link: publicURL,
            name: req.file.originalname
          }
        })

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
