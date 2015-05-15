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

var newTodoName = <HTMLInputElement> document.getElementsByClassName('new-todo')[0]; 
var todoList = <HTMLUListElement> document.getElementsByClassName('todo-list')[0];
var completedTodoList = <HTMLUListElement> document.getElementById('completed-todo-list');
var incompleteTodoList = <HTMLUListElement> document.getElementById('incomplete-todo-list');
var completedCountContainer = <HTMLSpanElement> document.getElementsByClassName('todo-count')[0];
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

var showEvent = (function() {
	var showCompleteEvent = Rx.Observable.fromEvent(showComplete, 'click');
	var showIncompleteEvent = Rx.Observable.fromEvent(showIncomplete, 'click');
	var showAllEvent = Rx.Observable.fromEvent(showAll, 'click');
 
	return showCompleteEvent.map(() => show.complete).merge(
		showIncompleteEvent.map(() => show.incomplete).merge(
			showAllEvent.map(() => show.all)
		)
	);
}());

var unfinishedCount =
	todos	
	.scan(Rx.Observable.just(0), (a,b) =>
	    a.combineLatest(b.finished, (a2,b2) => {
	        var bit = x => x ? 0 : 1;          
	        return a2 + bit(b2);
	    })
	)
	.flatMap(x => x);

todos.subscribe(todo => { 	 
	newTodoName.value = '';
	
	var li = document.createElement('li');
	
	var div = document.createElement('div');
	div.classList.add('view');
	
	var label = document.createElement('label');	
	label.innerText = todo.name;
	
	var checkbox = document.createElement('input');
	checkbox.setAttribute('type', 'checkbox');
	checkbox.classList.add('toggle');
		
	div.appendChild(checkbox);
	div.appendChild(label);
	
	li.appendChild(div);
	
	Rx.Observable
	.fromEvent(checkbox, 'change')
	.subscribe(todo.toggle);	
	
	[
		{f:(v) => v, d: 'add'}, 
		{f:(v) => !v, d: 'remove'}
	].forEach(x => {
		todo.finished
		.filter(x.f)
		.subscribe(_ => 
		{			
			li.classList[x.d]('completed'); 
		});	
	});
	
	showEvent.combineLatest(todo.finished, (a,b) => { 
		return { s: a, f: b }; 
	}).subscribe(x => {
		var toggleActive = function(e) {
			[ showAll, showComplete, showIncomplete ]
			.forEach(x => {
				var activeClass = "selected";
				
				if(x === e) {
					x.classList.add(activeClass);
				} else {
					x.classList.remove(activeClass);
				}
			});				
		};
		
		switch(x.s) {
			case show.all:	
				toggleActive(showAll);
			 	li.hidden = false;
			break;
			case show.complete:
				toggleActive(showComplete);
				li.hidden = !x.f;
			break;
			case show.incomplete:
				toggleActive(showIncomplete);
				li.hidden = x.f;
			break;
		}
	});
	
	todoList.appendChild(li);
});

unfinishedCount.subscribe(x => {	
	completedCountContainer.innerHTML = x.toString() + " item" + (x === 1 ? "" : "s") + " left";
});