import Rx = require("rx");

interface Todo {
	name: string;
	finished: Rx.Observable<boolean>;
	toggle: () => void;
}

enum show {
	incomplete,
	complete,
	all
}

var newTodoName = <HTMLInputElement> document.getElementById('new-todo-name'); 
var todoList = <HTMLUListElement> document.getElementById('todo-list');
var completedTodoList = <HTMLUListElement> document.getElementById('completed-todo-list');
var incompleteTodoList = <HTMLUListElement> document.getElementById('incomplete-todo-list');
var completedCountContainer = <HTMLSpanElement> document.getElementById('completed-count');
var showAll = <HTMLSpanElement> document.getElementById('show-all');
var showComplete = <HTMLSpanElement> document.getElementById('show-complete');
var showIncomplete = <HTMLSpanElement> document.getElementById('show-incomplete');

var createTodo = function(name: string) {
	var finished = new Rx.ReplaySubject<boolean>();	
	var cacheLatest = new Rx.BehaviorSubject(false);
	finished.subscribe(cacheLatest);			
	
	return {
		name: name,
		finished: finished.startWith(false).distinctUntilChanged(),
		toggle: function() {
			cacheLatest.take(1).subscribe(x => {				
				finished.onNext(!x);
			});
		}
	};
};

var createTodoStream = function() {
	var todos =	new Rx.ReplaySubject<Todo>();

	Rx.Observable
	.fromEvent(newTodoName, 'keydown')
	.filter((onkeypress : KeyboardEvent) => onkeypress.keyCode === 13)
	.merge(
		Rx.Observable
		.fromEvent(newTodoName, 'focusout'))
	.map(() => newTodoName.value)
	.filter(x => /\S/.test(x))
	.map(createTodo)
	.subscribe(todos);
	
	return todos;
};

var todos = createTodoStream();

var showCompleteEvent = Rx.Observable.fromEvent(showComplete, 'click');
var showIncompleteEvent = Rx.Observable.fromEvent(showIncomplete, 'click');
var showAllEvent = Rx.Observable.fromEvent(showAll, 'click');

var showEvent = 
	showCompleteEvent.map(() => show.complete).merge(
		showIncompleteEvent.map(() => show.incomplete).merge(
			showAllEvent.map(() => show.all)
		)
	);

var completedCount =
	todos	
	.scan(Rx.Observable.just(0), (a,b) =>
	    a.combineLatest(b.finished, (a2,b2) => {
	        var bit = x => x ? 1 : 0;          
	        return a2 + bit(b2);
	    })
	)
	.flatMap(x => x);

todos.subscribe(todo => { 	 
	newTodoName.value = '';
	
	var li = document.createElement('li');
	
	var label = document.createElement('label');	
	
	var span = document.createElement('span');
	span.innerHTML = todo.name;
	
	var checkbox = document.createElement('input');
	checkbox.setAttribute('type', 'checkbox');
	
	label.appendChild(span);
	label.appendChild(checkbox);
	
	li.appendChild(label);
	
	Rx.Observable
	.fromEvent(checkbox, 'change')
	.subscribe(todo.toggle);	
	
	[
		{f:(v) => v, d: 'line-through'}, 
		{f:(v) => !v, d: 'none'}
	].forEach(x => {
		todo.finished
		.filter(x.f)
		.subscribe(_ => 
		{
			span.style.textDecoration = x.d; 
		});	
	});
	
	showEvent.combineLatest(todo.finished, (a,b) => { 
		return { s: a, f: b }; 
	}).subscribe(x => {
		switch(x.s) {
			case show.all:
			 	li.hidden = false;
			break;
			case show.complete:
				li.hidden = !x.f;
			break;
			case show.incomplete:
				li.hidden = x.f;
			break;
		}
	});
	
	todoList.appendChild(li);
});

completedCount.subscribe(x => {	
	completedCountContainer.innerHTML = x.toString();
});