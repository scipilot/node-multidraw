var adminSocket = io.connect();

adminSocket.on('redirect', function(data){
	window.location = data.url;
});

// Admin panel
// todo: security only allow "admin" to do this - how? (without an auth plugin) use the client 'id'? this will only work for the browser 'session'
// 			 perhaps only allow "creator" to clear it, or move the option to an authenticated admin page.
// 			Currently - the buttons are only rendered in the admin view, but this isn't secure.
$('#newSessionButton').click(function(){
	// todo: auth
	adminSocket.emit('create', {sessionName: $('#newSessionName').val()});
});
$('#nextPage').click(function(){
	// todo: auth
	adminSocket.emit('next', {sessionName: sessionName, pageNo: pageNo});
});
$('#clearButton').click(function(){
	// todo: auth
	adminSocket.emit('clear', {canvasName: canvasName})
});
$('#endSessionButton').click(function(){
	// todo: auth
	adminSocket.emit('end', {sessionName: sessionName})
});
