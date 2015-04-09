var express = require('express');
var path = require('path');
var port = 3000;
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var redis = require("redis");

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

module.exports = app;

var client = redis.createClient();

function checklongerUrl(longerUrl, callback) {
    client.hget("sort1", "longerUrl", function(err, response) {
        callback(err, response);
    });
}

function randomShorterUrl() {
    var temp = Date.now();
    return (temp.toString(36));

}
app.post("/", function(req, res) {
    var url = req.body.ogurl;
    var index = url.indexOf("localhost:3000");
    if (index > -1 && index < 9) {
        client.hget(url, "longerUrl", function(err, response) {
            res.json({
                "url": response
            });

        });
    } else {
        client.hget(url, "shorterUrl", function(err, response) {
            if (response === null) {
                var shorterUrl = randomShorterUrl();
                shorterUrl = "localhost:3000/" + shorterUrl;
                client.hset(url, "shorterUrl", shorterUrl);
                client.hset(shorterUrl, "longerUrl", url);
                client.zincrby("views", 1, shorterUrl);
                res.json({
                    "url": shorterUrl
                });
            } else {

                res.json({
                    "url": response
                });
            }
        });

    }


});
app.get("/gettop", function(req, res) {

    client.zrevrangebyscore("views", "+inf", 0, "limit", 0, 10, function(err, response) {
        res.json({
            "top10": response
        });
    });

});
app.route("/:url").all(function(req, res) {
    var url = req.params.url;
    url = "localhost:3000/" + url;
    client.hget(url, "longerUrl", function(err, response) {
        if (response === null) {
            res.status(404).send("Url not exist");
        } else {
            client.zincrby("views", 1, url);
            res.status(301);
            res.set("Location", response);
            res.send();
        }
    });

});

app.listen(port);
