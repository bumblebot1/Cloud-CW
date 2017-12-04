var express = require("express");
var app = express();
var path = require('path');

app.use(express.static(__dirname + '/public/login'));

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/login/login.html'));
})

app.listen(8080);