import Rx = require("rx");

const ENTER_KEY = 13;

export const checkboxChange = function(ele) {	
	return Rx.Observable
		.fromEvent(ele, 'change')
		.map((event : UIEvent) => (<HTMLInputElement> event.target).checked);
};

export const textEntered = function(ele) {
	return Rx.Observable
		.fromEvent(ele, 'keydown')
		.filter((onkeypress : KeyboardEvent) => onkeypress.keyCode === ENTER_KEY)
		.merge(
			Rx.Observable
			.fromEvent(ele, 'focusout'));
};

export const hashChange = (function() {
	const getRightOfHash = (hash:string) => hash.split('#')[1];
	const sub = new Rx.BehaviorSubject(getRightOfHash(window.location.hash));
			
	window.onhashchange = hash => sub.onNext(getRightOfHash(hash.newURL));
	
	return sub.asObservable();
}());