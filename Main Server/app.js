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
var projectId = 'imshare-189020';

var storage = new Storage({
    projectId: projectId
});
var bucket = storage.bucket('imshare-storage');

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
        // Or, if multiple clients access the backend:
        //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3],
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

app.post("/userLogin", function(req, res) {
   authenticateID(req.body.authToken, res)
});

app.get("/gallery", function(req, res) {
    console.log(req.query.userid+"this is it");
    res.sendFile(__dirname+ "/public/gallery/gallery.html");
});

app.post("/imageUpload", upload.single("imageFile"), sendUploadToGCS, function(req, res) {

})

app.get("/", function(req, res) {
    res.sendFile(path.join(__dirname + "/public/login/login.html"));
});

app.listen(port);
