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

export const createModel = function(nameStream: Rx.Observable<TodoSetup>) {
	const todos =	new Rx.ReplaySubject<Todo>();
	
	const createTodo = function(x: TodoSetup) : Todo {
		const finished = new Rx.BehaviorSubject(x.finished);		
		const names = new Rx.BehaviorSubject(x.name);
		const removed = new Rx.BehaviorSubject(false);
		
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
	
	const countEm = 
		(shouldCountRemoved: (finished:boolean,removed:boolean) => boolean, 
		addToFinished: (finished:boolean) => boolean) =>
			todos.scan(Rx.Observable.just(0), (a,b) => 
			    a.combineLatest(
					b.finished.combineLatest(b.removed, shouldCountRemoved), 
					(tally,finished) => tally + (addToFinished(finished) ? 1 : 0))
			)
			.flatMap(x => x);
 	
	nameStream
		.map(createTodo)
		.subscribe(todos);
	
	return {
		todos: todos.asObservable(),
		unfinishedCount: countEm((finished,removed) => finished || removed, finished => !finished),
		finishedCount: countEm((finished,removed) => finished && !removed, finished => finished),
		allChanges: 
			todos.scan(Rx.Observable.just(<TodoSetup[]>[]), (acc,value) => {
				const excludedRemovedTodos = 
					value.name.combineLatest(value.finished, (name, finished) => ({
						name: name,
						finished: finished
					}))
					.combineLatest(value.removed, (todo,removed) => removed ? [] : [todo]);
				return acc.combineLatest(excludedRemovedTodos,(acc,value) => acc.concat(value));
			})
			.flatMap(x => x)			
	};
};