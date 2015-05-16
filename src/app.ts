import Rx = require('rx');
import UIUtil = require('UIUtil');
import Model = require('model');

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
var toggleAll = <HTMLInputElement> document.getElementsByClassName('toggle-all')[0];

var model = Model.createModel(
	UIUtil.textEntered(newTodoName)
		.map(() => newTodoName.value)
		.filter(x => /\S/.test(x))
);
	
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

var toggleAllStream = UIUtil.checkboxChange(toggleAll);

model.todos.subscribe(todo => { 	 
	newTodoName.value = '';

	var li = document.createElement('li');
	
	var div = document.createElement('div');
	div.classList.add('view');
	
	var label = document.createElement('label');
	
	var checkbox = document.createElement('input');
	checkbox.setAttribute('type', 'checkbox');
	checkbox.classList.add('toggle');
		
	div.appendChild(checkbox);
	div.appendChild(label);
	
	li.appendChild(div);
	
	var input = document.createElement('input');
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
	
	UIUtil.checkboxChange(checkbox)
		.merge(toggleAllStream)
		.subscribe(x => {
			todo.toggle(x);
		 	checkbox.checked = x;
		});	
	
	[
		{finished:(v) => v, addOrRemove: 'add'}, 
		{finished:(v) => !v, addOrRemove: 'remove'}
	].forEach(x => {
		todo.finished
		.filter(x.finished)
		.subscribe(_ => 
		{			
			li.classList[x.addOrRemove]('completed'); 
		});	
	});
	
	showEvent.combineLatest(todo.finished, (a,b) => { 
		return { showWhat: a, finished: b }; 
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

model.unfinishedCount.subscribe(x => {	
	completedCountContainer.innerHTML = x.toString() + " item" + (x === 1 ? "" : "s") + " left";
});