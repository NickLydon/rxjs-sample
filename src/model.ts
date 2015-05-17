import Rx = require('rx');

export interface Todo {
	name: Rx.Observable<string>;
	finished: Rx.Observable<boolean>;
	toggle: (boolean) => void;
	changeName: (string) => void;
	remove: () => void;
	removed: Rx.Observable<boolean>;
}

export interface TodoSetup {
	name: string;
	finished: boolean;
}

export var createModel = function(nameStream: Rx.Observable<TodoSetup>) {
	var todos =	new Rx.ReplaySubject<Todo>();
	
	var createTodo = function(x: TodoSetup) : Todo {
		var finished = new Rx.BehaviorSubject(x.finished);		
		var names = new Rx.BehaviorSubject(x.name);
		var removed = new Rx.BehaviorSubject(false);
		
		return {
			name: names.distinctUntilChanged(),
			finished: finished.distinctUntilChanged(),
			toggle: complete => {					
				finished.onNext(complete);
			},
			changeName: name => {
				names.onNext(name);
			},
			remove: () => {
				removed.onNext(true);			
			},
			removed: removed.distinctUntilChanged()
		};
	};
	
	nameStream
		.map(createTodo)
		.subscribe(todos);
	
	return {
		todos: todos.asObservable(),
		unfinishedCount: 
			todos.scan(Rx.Observable.just(0), (a,b) => 
			    a.combineLatest(
					b.finished.combineLatest(b.removed, (finished,removed) => finished || removed), 
					(tally,finished) => tally + (finished ? 0 : 1))
			)
			.flatMap(x => x),
		finishedCount:
			todos.scan(Rx.Observable.just(0), (a,b) => 
			    a.combineLatest(
					b.finished.combineLatest(b.removed, (finished,removed) => finished && !removed), 
					(tally,finished) => tally + (finished ? 1 : 0))
			)
			.flatMap(x => x)
	};
};