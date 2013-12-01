var port = process.env.PORT || 5000;
console.log("Listening on port " + port);
var http = require('http')
var express = require('express'), app = express();
var server = http.createServer(app).listen(port);
var jade = require('jade');
var io = require('socket.io').listen(server);
app.use(express.logger());
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set('view options', {layout: false });
app.configure(function(){
    app.use(express.static(__dirname + '/public'));
});

app.get('/', function(req, res){
    res.render('main.jade');
});

io.set("log level", 1);

io.sockets.on('connection', function(socket){

    socket.on('mousemove', function(data){
	socket.broadcast.emit('moving', data);
    });
});
