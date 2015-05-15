import Rx = require("rx");

const ENTER_KEY = 13;

export var doubleClick = function(ele) {
	return Rx.Observable
		.fromEvent(ele, 'click')
		.bufferWithTime(500)
		.filter(x => x.length > 1);
};

export var checkboxChange = function(ele) {	
	return Rx.Observable
		.fromEvent(ele, 'change')
		.map((event : UIEvent) => (<HTMLInputElement> event.target).checked);
};

export var textEntered = function(ele) {
	return Rx.Observable
		.fromEvent(ele, 'keydown')
		.filter((onkeypress : KeyboardEvent) => onkeypress.keyCode === ENTER_KEY)
		.merge(
			Rx.Observable
			.fromEvent(ele, 'focusout'));
};