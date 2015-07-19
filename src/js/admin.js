AdminPlugin = function($, adminSocket){

	// Cut-down version of the client end socket functions, needed for the admin screens.
	// todo: there is some overlap - could be a common one?

	//var adminSocket = io.connect();

	adminSocket.on("connect", function(){
		adminSocket.emit("options");
	});

	adminSocket.on('redirect', function(data){
		window.location = data.url;
	});

	adminSocket.on('options', function (options) {
		$("#subjectPenSize").val(options.subjectPenSize);
		$("#adminPenColour").val(options.adminPenColour).change(); // manually fire onChange event.
		$("#subjectPenColour").val(options.subjectPenColour).change();
	});

	adminSocket.on('stimulus', function (stimulus) {
		console.log('ADMIN received stimulus: ', stimulus);
		if(stimulus.style == 1){
			console.log("Setting text stimulus...");
			// Text
			$('div#presentation-controls-text')
				//.text(stimulus.text)
				.css("display", "inherit");//show
		}
		else if (stimulus.style == 2){
			console.log("Setting PRESET TEXT stimulus...");
			// Text
			$('div#presentation-controls-text-prefab')
				//.text(stimulus.text)
				.css("display", "inherit");//show
		}
		else if (stimulus.style == 3){
			console.log("Setting IMAGE stimulus...");
			// Image
			$('div#presentation-controls-image')
				//.css('background-image: url(\"/uploads/test'+pageNo+'.png')
				.css("display", "inherit");//show
		}
		else if (stimulus.style == 4){
			console.log("Setting TILES stimulus...");
			$('div#presentation-controls-grapheme-tiles')
				.css("display", "inherit");//show
		}
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

	// Options
	$('#subjectPenColour').change(function(){
		adminSocket.emit('setOption', {key:'subjectPenColour', val:$('#subjectPenColour option:selected').val()})
	});
	$('#subjectPenSize').change(function(){
		adminSocket.emit('setOption', {key:'subjectPenSize', val:$('#subjectPenSize option:selected').val()})
	});
	$('#adminPenColour').change(function(){
		adminSocket.emit('setOption', {key:'adminPenColour', val:$('#adminPenColour option:selected').val()})
		adminSocket.emit('options');// refresh from options.
	});

	// In-Test admin panel
	$('#nextPage').click(function(){
		// todo: auth
		adminSocket.emit('next', {sessionName: SciWriter.sessionName, pageNo: SciWriter.pageNo});
	});
	// Combines send-stimulus and next-page actions in one go
	$('#stimulusNextPageButton').click(function(){
		// todo: auth
		adminSocket.emit('next', {sessionName: SciWriter.sessionName, pageNo: SciWriter.pageNo, stimulus:$('#stimulusText').val()});
	});
	$('#clearButton').click(function(){
		// todo: auth
		adminSocket.emit('clear', {canvasName: canvasName})
	});
	$('#endSessionButton').click(function(){
		// todo: auth
		adminSocket.emit('end', {sessionName: SciWriter.sessionName})
	});
	$('#stimulusButton').click(function(){
		sendStimulus($('#stimulusText').val());
	});
	$('#stimulusText').keyup(function(){
		if($('#stimulusLive').prop('checked')){
			sendStimulus($('#stimulusText').val());
		}
	});
	$('.text-prefab-button').click(function(){
		sendStimulus($(this).text());
		return false;
	});
	// GraphemeTile Presentation specific (move to mixin?)
	$('#graphemeGeneratorButton').click(function(){
		sendStimulus($('#graphemeList').val());
		return false;
	});

	function sendStimulus(txt){
		console.log('sendStimulus('+txt);
		// todo: auth
		adminSocket.emit('stimulus', {
			sessionName: SciWriter.sessionName,
			pageNo: SciWriter.pageNo,
			text: txt
		})
	}

	return this;
};
