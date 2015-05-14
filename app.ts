import Rx = require("rx");

interface Todo {
	name: string;
	finished: Rx.Observable<boolean>;
	toggle: () => void;
}

var newTodoName = <HTMLInputElement> document.getElementById('new-todo-name'); 
var todoList = <HTMLUListElement> document.getElementById('todo-list');
var completedCountContainer = <HTMLSpanElement> document.getElementById('completed-count');

var createTodo = function(name: string) {
	var finished = new Rx.ReplaySubject<boolean>();	
	var cache = new Rx.BehaviorSubject(false);
	finished.subscribe(cache);			
	
	return {
		name: name,
		finished: finished.startWith(false).distinctUntilChanged(),
		toggle: function() {
			cache.take(1).subscribe(x => {				
				finished.onNext(!x);
			});
		}
	};
};

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

var completedCount =
	todos
	.map(x => x.finished)
	.scan(Rx.Observable.just(0), (a,b) =>
	    a.combineLatest(b, (a2,b2) => {
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
	
	todoList.appendChild(li);
});

completedCount.subscribe(x => {	
	completedCountContainer.innerHTML = x.toString();
});

