import Rx = require("rx");

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