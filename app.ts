import Rx = require("rx");

interface Todo {
	name: string;
	finished: Rx.Observable<boolean>;
	toggle: () => void;
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

var filterTodos = function(finished) {
	return todos.scan(Rx.Observable.just<Todo[]>([]), (a,b) =>
		    a.combineLatest(b.finished, (a2,b2) => {			                  
		        return finished(b2) ? a2.concat([b]) : a2;
		    })
		)
		.flatMap(x => x);
};
	
var finishedTodos = filterTodos(x => x);
var unfinishedTodos = filterTodos(x => !x);

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
	
	todoList.appendChild(li);
});

completedCount.subscribe(x => {	
	completedCountContainer.innerHTML = x.toString();
});

function setupListView(todoList, todoListView) {
	todoList
	.subscribe(x => {
		
		todoListView.innerHTML = "";
		
		x.map(x => {
			var li = document.createElement('li');
			li.innerText = x.name;
			return li;
		})
		.forEach(function(li) {
			todoListView.appendChild(li);
		});				
		
	});
}

setupListView(finishedTodos, completedTodoList);
setupListView(unfinishedTodos, incompleteTodoList);