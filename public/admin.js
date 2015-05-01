// Cut-down version of the client end socket functions, needed for the admin screens.
// todo: there is some overlap - could be a common one?

var adminSocket = io.connect();

adminSocket.on('redirect', function(data){
	window.location = data.url;
});

// Admin panel
// todo: security only allow "admin" to do this - how? (without an auth plugin) use the client 'id'? this will only work for the browser 'session'
// 			 perhaps only allow "creator" to clear it, or move the option to an authenticated admin page.
// 			Currently - the buttons are only rendered in the admin view, but this isn't secure.
$('a.deleteSession').click(function(){
	// todo: auth
	adminSocket.emit('deleteSession', {
		sessionName: $(this).data('session-name')
	});
	// todo reload the list...
	window.location = window.location;
});
$('#newSessionButton').click(function(){
	//console.log('p='+$('#sessionPresentation option:selected').val());
	// todo: auth
	adminSocket.emit('create', {
		sessionName: $('#newSessionName').val(),
		presentation: $('#sessionPresentation option:selected').val()
	});
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
$('#stimulusButton').click(function(){
	sendStimulus();
});
$('#stimulusText').keyup(function(){
	if($('#stimulusLive').prop('checked')){
		sendStimulus();
	}
});

function sendStimulus(){
	// todo: auth
	adminSocket.emit('stimulus', {
		sessionName: sessionName,
		pageNo: pageNo,
		text: $('#stimulusText').val()
	})
}