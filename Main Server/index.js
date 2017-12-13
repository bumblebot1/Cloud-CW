var express = require("express");
var bodyParser = require("body-parser");
var app = express();

var path = require("path");

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.static(__dirname + "/public/login"));

app.post("/userLogin", function(req, res) {
   console.log(req.body.id);
});

app.get("/", function(req, res) {
    res.sendFile(path.join(__dirname + "/public/login/login.html"));
});


app.listen(8080);