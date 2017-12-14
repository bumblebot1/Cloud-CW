var express = require("express");
var bodyParser = require("body-parser");
var multer  = require('multer');
var upload = multer();
var app = express();
var port = process.env.PORT || 8080;
var path = require("path");
var GoogleAuth = require('google-auth-library');
var CLIENT_ID = "1035545407464-d0d22am0o9u9khb4dqhl9bolaskhr4c7.apps.googleusercontent.com";

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

app.post("/imageUpload", upload.single("imageFile"), function(req, res) {
    console.log(req.body);
    console.log(req.file);
})

app.get("/", function(req, res) {
    res.sendFile(path.join(__dirname + "/public/login/login.html"));
});

app.listen(port);
