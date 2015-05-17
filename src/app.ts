import Rx = require('rx');
import UIUtil = require('UIUtil');
import Model = require('model');

enum show {
	incomplete,
	complete,
	all
}

const newTodoName = <HTMLInputElement> document.getElementsByClassName('new-todo')[0]; 
const todoList = <HTMLUListElement> document.getElementsByClassName('todo-list')[0];
const completedCountContainer = <HTMLSpanElement> document.getElementsByClassName('todo-count')[0];
const showAll = <HTMLSpanElement> document.getElementById('show-all');
const showComplete = <HTMLSpanElement> document.getElementById('show-complete');
const showIncomplete = <HTMLSpanElement> document.getElementById('show-incomplete');
const toggleAll = <HTMLInputElement> document.getElementsByClassName('toggle-all')[0];
const clearCompleted = <HTMLInputElement> document.getElementsByClassName('clear-completed')[0];
const footer = <HTMLElement> document.getElementsByClassName('footer')[0];

const localStorageKey = 'todoapp.todolist';

const existingTodos = 
	Rx.Observable.from(
		(<Model.TodoSetup[]>JSON.parse(localStorage.getItem(localStorageKey)) || []));
		
const newTodos = 
	UIUtil.textEntered(newTodoName)
		.map(() => newTodoName.value)
		.filter(x => /\S/.test(x))
		.map(name => ({ name: name, finished: false }));

const model = Model.createModel(
	existingTodos.concat(newTodos)
);
	
const showEvent = (function() {
	const showCompleteEvent = Rx.Observable.fromEvent(showComplete, 'click');
	const showIncompleteEvent = Rx.Observable.fromEvent(showIncomplete, 'click');
	const showAllEvent = Rx.Observable.fromEvent(showAll, 'click');
 	
	return showCompleteEvent.map(() => show.complete).merge(
		showIncompleteEvent.map(() => show.incomplete).merge(
			showAllEvent.map(() => show.all)
		)
	);
}());

const toggleAllStream = UIUtil.checkboxChange(toggleAll);

model.todos.subscribe(todo => { 	 
	newTodoName.value = '';

	const li = document.createElement('li');
	
	const div = document.createElement('div');
	div.classList.add('view');
	
	const label = document.createElement('label');
	
	const checkbox = document.createElement('input');
	checkbox.setAttribute('type', 'checkbox');
	checkbox.classList.add('toggle');
	
	const destroy = document.createElement('button');
	destroy.classList.add('destroy');
	Rx.Observable.fromEvent(destroy, 'click')
	.first()
	.subscribe(todo.remove);
	
	todo.removed.filter(x => x).subscribe(() => li.remove());
		
	div.appendChild(checkbox);
	div.appendChild(label);
	div.appendChild(destroy);
	
	li.appendChild(div);
	
	const input = document.createElement('input');
	input.setAttribute('type', 'text');			
	input.classList.add('edit');
	
	li.appendChild(input);
	
	todo.name.subscribe(name => {	
		input.value = label.innerText = name;
	});	
	
	UIUtil.doubleClick(label)
	.combineLatest(todo.name, (_,name) => name)
	.subscribe(name => {
		label.hidden = true;
		li.classList.add('editing');
		
		input.value = name;
		input.focus();
		
		UIUtil.textEntered(input)
			.first()
			.subscribe(() => {
				todo.changeName(input.value);
				label.hidden = false;
				li.classList.remove('editing');			
			});
	});
	
	Rx.Observable.fromEvent(clearCompleted, 'click')
	.withLatestFrom(todo.finished, (_,x) => x)
	.filter(x => x)
	.subscribe(todo.remove);
	
	UIUtil.checkboxChange(checkbox)
		.merge(toggleAllStream)
		.subscribe(todo.toggle);				
	
	[
		{finished:(v) => v, addOrRemove: 'add', checked: true}, 
		{finished:(v) => !v, addOrRemove: 'remove', checked: false}
	].forEach(x => {
		todo.finished
		.filter(x.finished)
		.subscribe(_ => 
		{			
			li.classList[x.addOrRemove]('completed'); 
			checkbox.checked = x.checked;
		});	
	});
	
	showEvent.combineLatest(todo.finished, (a,b) => { 
		return { showWhat: a, finished: b }; 
	}).subscribe(x => {
		const toggleActive = function(e) {
			[ showAll, showComplete, showIncomplete ]
			.forEach(x => {
				const activeClass = "selected";
				if(x === e) {
					x.classList.add(activeClass);
				} else {
					x.classList.remove(activeClass);
				}
			});				
		};
		
		switch(x.showWhat) {
			case show.all:	
				toggleActive(showAll);
			 	li.hidden = false;
			break;
			case show.complete:
				toggleActive(showComplete);
				li.hidden = !x.finished;
			break;
			case show.incomplete:
				toggleActive(showIncomplete);
				li.hidden = x.finished;
			break;
		}
	});
	
	todoList.appendChild(li);
});

model.finishedCount.combineLatest(model.unfinishedCount, (a,b) => a + b).map(x => x === 0).subscribe(x => footer.hidden = x);

model.finishedCount.map(x => x === 0).subscribe(x => clearCompleted.hidden = x);

model.unfinishedCount.subscribe(x => {	
	completedCountContainer.innerHTML = x.toString() + " item" + (x === 1 ? "" : "s") + " left";		
});

model.allChanges.map(JSON.stringify).subscribe(x => { 
	localStorage.setItem(localStorageKey, x);
});