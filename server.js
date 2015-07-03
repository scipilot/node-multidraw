var port = process.env.PORT || 5000;
console.log("Listening on port " + port);
var http = require('http')
var express = require('express'), app = express();
var morgan = require('morgan'); //http logger module
var compression = require('compression')
var server = http.createServer(app).listen(port);
var jade = require('jade');
var io = require('socket.io').listen(server);
var os = require('os');
var redis = require("redis");
var redisClient = redis.createClient();
var lzwCompress = require('lzwcompress');
var compressor = require('node-minify');

var localConnectedClients = 0;
var clients = {};
var netUsage = 0;

//compress all JS into one file on startup
new compressor.minify({
	type: 'uglifyjs',
	//type: 'no-compress', // for dev
	fileIn: [
		'src/js/alertify.min.js',
		'src/js/jquery.hammer.min.js',
		'src/js/lzwCompress.js',
		'src/js/draw.js'
	],
	fileOut: 'public/js/draw.min.js',
	callback: function (err, min) {
		if (err) {
			console.log(err);
		}
	},
	outSourceMap:true// couldn't get it to work via node-minify... doesn't it pass all the uglify options through?
});

//compress css
new compressor.minify({
	type: 'clean-css',
	fileIn: ['src/css/alertify.core.css',
		'src/css/alertify.default.css',
		'src/css/style.css'
	],
	fileOut: 'public/css/style.min.css',
	callback: function (err, min) {
		if (err) {
			console.log(err);
		}
	}
});

app.use(compression());
app.use(express.static(__dirname + '/public', {maxAge: 60 * 60 * 24 * 1000}));
app.use(morgan('combined'));

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set('view options', {layout: false });
app.enable('trust proxy');

// ROUTES --------------------------------------------------------------------

/* Main 'lobby' canvas */
app.get('/', function (req, res) {
	res.render('main.jade', {
		sessionName: '',
		pageNo: 0
	});
});

/* User canvas */
app.get("/c/:canvasname", function (req, res, next) {
	res.render('main.jade', {
		canvasName: req.params.canvasname,
		sessionName: '',
		pageNo: 0
	});
});
/* User guided session */
app.get("/s/:sessionName/:pageNo", function (req, res, next) {
	res.render('session.jade', {
		sessionName: req.params.sessionName,
		pageNo: req.params.pageNo,
		canvasName: req.params.sessionName+'.'+req.params.pageNo
	});
});

/* Admin */
app.get("/a/", function (req, res, next) {
	getSessionList(function(sessions){
		renderWithOptions(res, 'admin.jade', {
			sessionName: '',
			pageNo: 0,
			sessionList:sessions
		});
	});
});
/* Admin view-canvas */
app.get("/a/:sessionName/:pageNo", function (req, res, next) {
	res.render('admin.jade', {
		canvasName: req.params.sessionName+'.'+req.params.pageNo,
		sessionName: req.params.sessionName,
		pageNo: req.params.pageNo
		//presentationStyle:
	});
});

/** Renders a view with any previously persisted app options injected into the viewModel */
function renderWithOptions(res, viewName, viewModel){
	getOptionsList(function(options){
		viewModel.options = options;
		console.log('renderWithOptions', viewName, viewModel);
		res.render(viewName, viewModel);
	});
}

redisClient.on("error", function (err) {
	console.log("Redis Error: " + err);
});

//set client connection key if not exists
redisClient.setnx("clientcount", 0);

// CONTROLLER --------------------------------------------------------------------
io.sockets.on('connection', function (socket) {
	localConnectedClients += 1;
	redisClient.incr("clientcount");

	socket.on('drawActionHistory', function (data) {
		//client has asked for all the draw action history.
		var drawActions = [];
		var key = "drawactions:" + data.canvasName;
		redisClient.lrange(key, 0, -1, function (err, replies) {
			if (err) {
				console.log("Error fetching draw history key: " + key);
				return;
			}
			replies.forEach(function (reply, i) {
				drawActions.push(JSON.parse(reply));
			});

			//compress drawaction history data
			var compressedActions = lzwCompress.pack(drawActions)
			//send it
			socket.emit('drawActionHistory', compressedActions);
			//increment netusage tracker.
			netUsage += sizeof(compressedActions);
		});
	});

	socket.on('mousemove', function (data) {
		if (data.id in clients) {
			var client = clients[data.id];

			if (data.drawing) {
				var drawAction = {
					fromX: client.x,
					fromY: client.y,
					toX: data.x,
					toY: data.y,
					color: data.color
				};
				var key = "drawactions:" + data.canvasName;
				redisClient.rpush(key, JSON.stringify(drawAction));
			}

		} else {
			//initilise a new client
			var newClient = {
				id: data.id
			};
			clients[data.id] = newClient;
		}

		clients[data.id].x = data.x;
		clients[data.id].y = data.y;

		netUsage += sizeof(data) * localConnectedClients;
		socket.broadcast.emit('moving', data);
	});

	socket.on('chatmessage', function (data) {
		netUsage += sizeof(data) * localConnectedClients;
		//take out possible tags.
		data.message = data.message.replace(/(<([^>]+)>)/ig, "");
		//limit chat message length.
		if (data.message.length <= 135) {
			socket.broadcast.emit('chatmessage', {
				user: data.user,
				message: data.message
			});
		}
	});

	socket.on('stats', function (id) {
		var multi = redisClient.multi();
		var data = {
			load1: (os.loadavg()[0]).toFixed(2),
			netUsageKB: (netUsage / 1000).toFixed(1),
			nodeConnections: localConnectedClients
		};

		/*
		 multi.llen("drawactions", function(err, reply){
		 data['drawStackSize'] = reply;
		 });
		 */

		multi.get('clientcount', function (err, reply) {
			data['globalConnectedClients'] = reply;
		});

		multi.lastsave(function (err, reply) {
			var now = (new Date().getTime()) / 1000;
			data['lastStateSave'] = ((now - reply) / 60).toFixed(1);
		});

		multi.exec(function (err, replies) {
			socket.emit('stats', data);
			netUsage += sizeof(data);
		});
	});

	socket.on('ping', function (data) {
		socket.emit('pong');
	});

	socket.on('disconnect', function () {
		localConnectedClients -= 1;
		redisClient.decr("clientcount");
	});

	// SCI-WRITER TEST SESSION CONTROLLERS ----------------------------------------------------------

	// Admin: create a new Test Session, and take the user to it
	// TODO: AUTH!
	socket.on('create', function (data) {

		// todo: wrap session storage in a model
		// index a new canvas (for admin listing)
		redisClient.rpush("sessions", data.sessionName);
		// can you index 'object' instances automatically? (redis noob!)
		redisClient.hmset("session:"+data.sessionName, {"presentation": data.presentation});

		// start at page 0
		guidedRedirect(data.sessionName, 0);
	});

	// Request for any previous test session data (this is similar to 'drawActionHistory')
	socket.on('getSession', function (data) {
		//console.log('getSession');
		//console.log(data);

		// get the overall session
		redisClient.hmget("session:"+data.sessionName, "presentation", function(err, replies){
			//console.log("fetched session:"+data.sessionName);
			//console.log(replies);
			var presentation = replies[0];

			// get the page
			redisClient.hmget("session:"+data.sessionName+":"+data.pageNo, "stimulus", function(err, replies){
				//console.log("fetched page session:"+data.sessionName+":"+data.pageNo);
				//console.log(replies);
				if(replies && replies.length){
					//console.log('sending stimulus to clients... '+presentation);
					// send the stimulus presentation index / content / filename to all clients
					io.sockets.emit('stimulus', {
						"style": presentation,
						"text": replies[0],
						"filename": replies[0] //dedupe? switch on presentation type?
					})
				}
			});
		});
	});

	// Admin has sent the next test presentation
	socket.on('stimulus', function (data) {
		console.log("stimulus set:");
		console.log(data);
		redisClient.hmget("session:"+data.sessionName, "presentation", function(err, replies){
			console.log("fetched session:"+data.sessionName);
			console.log(replies);

			// TODO: GET THE STIMULUS WORD/IMAGE FROM CMS/DATABASE/presets... (later)
			// Save the stimulus into the session, for later review.
			redisClient.hmset("session:"+data.sessionName+":"+data.pageNo, {"stimulus":data.text});

			// send the stimulus presentation index / content / filename to all clients
			io.sockets.emit('stimulus', {
				"style": replies[0],
				"text": data.text,
				"filename": data.text
			})
		});
	});

	// Admin: delete a previous Test Session
	// TODO: AUTH!
	socket.on('deleteSession', function (data) {
		// todo: wrap session storage in a model

		// 1. Remove the session from the 'sessions' index
		redisClient.lrem("sessions", 1, data.sessionName);

		// 2. Delete the "session:"+data.sessionName key
		redisClient.del("session:"+data.sessionName);

		// 3. Delete all "session:"+sessionName+":"+pageNo keys
		redisClient.keys("session:"+data.sessionName+":*", function(err, replies){
			// console.log("fetched page keys:");
			// console.log(replies);
			for(var i in replies){
				//console.log("deleting key : "+replies[i]);
				redisClient.del(replies[i]);
			}
		});

		// 4. Delete the canvas drawing history for "drawactions:"+canvasName (canvasName = sessionName+"."+pageNo)
		redisClient.keys("drawactions:"+data.sessionName+".*", function(err, replies){
			for(var i in replies){
				//console.log("deleting "+replies[i]);
				redisClient.del(replies[i], function(err, replies){
					//console.log("deleted "+replies+" drawactions:");
				});
			}
		});
	});

	// Admin: next canvas page, and take the user to it
	socket.on('next', function (data) {
		var nextPageNo = Number(data.pageNo)+1;

		if(data.stimulus){
			// If a stimulus is set, pre-save that into the next page now
			redisClient.hmset("session:"+data.sessionName+":"+nextPageNo, {"stimulus":data.stimulus});
		}

		guidedRedirect(data.sessionName, nextPageNo);
	});

	// Admin: finish a Test Session
	socket.on('end', function (data) {

		// todo: USER "WELL DONE!" PAGE. socket.broadcast.emit('redirect', {url:'/s/'+sessionName+'/'+pageNo});
		// ADMIN: back to home
		socket.emit('redirect', {url:'/a/'});
	});

	function guidedRedirect(sessionName, pageNo){
		// admin-guided mode
		socket.broadcast.emit('redirect', {url:'/s/'+sessionName+'/'+pageNo});
		socket.emit('redirect', {url:'/a/'+sessionName+'/'+pageNo});
	}

	// delete the canvas history
	socket.on('clear', function (data) {
		// remove data
		var key = "drawactions:" + data.canvasName;
		redisClient.del(key);

		// tell canvases to visually clear
		// The socket.broadcast sends to ALL BUT the 'current' client which sent the 'clear'. I find this obscure, not in the socket.io docs.
		// socket.broadcast.emit('cleared', data);
		// The socket.emit goes back to the 'current' client
		// socket.emit('cleared', data);
		// This sends to ALL sockets
		io.sockets.emit('cleared', data);
		// todo: how to broadcast only to this canvas? (But... currently the whole app doesn't respect the canvas ID, even mouse moves go to all clients regardless of canvas/URL. Maybe a redis hash of sockets-canvases.)
		// 			 Quick Workaround: I'm relying on the client to validate the data.canvasName
	});

	// save an app option (admin only)
	socket.on('setOption', function(data){
		setAppOption(data.key, data.val);
	});

});

/**
 * Get the estimated size of an object in bytes
 */
function sizeof(object) {
	var objectList = [];
	var stack = [object];
	var bytes = 0;

	while (stack.length) {
		var value = stack.pop();

		if (typeof value === 'boolean') {
			bytes += 4;
		} else if (typeof value === 'string') {
			bytes += value.length * 2;
		} else if (typeof value === 'number') {
			bytes += 8;
		} else if (typeof value === 'object' && objectList.indexOf(value) === -1) {
			objectList.push(value);
			for (var i in value) {
				stack.push(value[i]);
			}
		}
	}
	return bytes;
}

// Modelling

function getSessionList(cb){
	return redisClient.lrange("sessions", 0 , -1, function(err, replies){
		//console.log(replies);
		cb(replies);
	});
}

function getOptionsList(cb){
	return redisClient.hgetall("options", function(err, replies){
		console.log("getOptionsList:");
		console.log(replies);
		cb(replies);
	});
}

// Application option persistence
function setAppOption(key, val){
		console.log("setAppOption:", key, val);
	redisClient.hset("options", key, val);
}
function getAppOption(key, cb){
	return redisClient.hget("options", key, function(err, replies){
		console.log("getAppOption:"+key);
		console.log(err);
		console.log(replies);
		cb(replies);
	});
}
