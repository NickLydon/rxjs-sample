import Rx = require('rx');

export interface Todo {
	name: Rx.Observable<string>;
	finished: Rx.Observable<boolean>;
	toggle: (boolean) => void;
	changeName: (string) => void;
}

export var createModel = function(nameStream: Rx.Observable<string>) {
	var todos =	new Rx.ReplaySubject<Todo>();
	
	var createTodo = function(name: string) {
		var finished = new Rx.BehaviorSubject(false);		
		var names = new Rx.BehaviorSubject(name);
		
		return {
			name: names.distinctUntilChanged(),
			finished: finished.distinctUntilChanged(),
			toggle: function(complete) {					
				finished.onNext(complete);
			},
			changeName: function(name) {
				names.onNext(name);
			}
		};
	};
	
	nameStream
		.map(createTodo)
		.subscribe(todos);
	
	return {
		todos: todos.asObservable(),
		unfinishedCount: 
			todos.scan(Rx.Observable.just(0), (a,b) =>
			    a.combineLatest(b.finished, (a2,b2) => {
			        var bit = x => x ? 0 : 1;          
			        return a2 + bit(b2);
			    })
			)
			.flatMap(x => x)
	};
};