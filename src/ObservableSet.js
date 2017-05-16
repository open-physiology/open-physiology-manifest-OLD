import {BehaviorSubject, Subject, Observable} from './libs/rxjs.js';
import assert                                 from 'power-assert';
import {humanMsg}                             from 'utilities';
import {constraint}                           from './util/misc.js';

type Iterator<T> = {
	next: () => ({
		done: boolean,
		value: T
	})
}
type Iterable<T> = {
	// [Symbol.iterator: Symbol]: () => Iterator<T> // Flow does not accept this
}

const $$set               = Symbol('$$set');
const $$addSubject        = Symbol('$$addSubject');
const $$deleteSubject     = Symbol('$$deleteSubject');
const $$valueObservable   = Symbol('$$valueObservable');
const $$disableNextReplay = Symbol('$$disableNextReplay');

class AddReplaySubject extends Subject {
	constructor(initialSet) {
		super();
		assert(initialSet[Symbol.iterator]);
		this._setReference = initialSet;
	}
	normalSubscribe(...args) {
		this[$$disableNextReplay] = true;
		return this.subscribe(...args);
	}
	// noinspection JSDuplicatedDeclaration
	_subscribe(subscriber) {
		const subscription = super._subscribe(subscriber);
		if (subscription && !subscription.isUnsubscribed && !this[$$disableNextReplay]) {
			this._setReference.forEach(::subscriber.next);
		}
		this[$$disableNextReplay] = false;
		return subscription;
	}
}

/**
 * A data-structure with the same interface as `Set`,
 * and emits mutation events from rxjs streams.
 */
export default class ObservableSet<T> {
	
	/**
	 * Create a new instance of `ObservableSet`.
	 * @param {Iterable<T>} [initialContent] - initial elements to put in this set object
	 */
	constructor(initialContent: Iterable<T> = []) {
		/* define private fields */
		/** @private */ this[$$set]             = new Set();
		/** @private */ this[$$addSubject]      = new AddReplaySubject(this);
		/** @private */ this[$$deleteSubject]   = new Subject();
		
		const valueSubject = new BehaviorSubject(new Set(this));
		
		/** @private */ this[$$valueObservable] = valueSubject.asObservable();
		
		/* link streams */
		this[$$addSubject]   .normalSubscribe(::this.add);
		this[$$deleteSubject].subscribe      (::this.delete);
		this[$$addSubject]   .normalSubscribe(() => { valueSubject.next(new Set(this)) });
		this[$$deleteSubject].subscribe      (() => { valueSubject.next(new Set(this)) });
		
		/* add initial content */
		initialContent.forEach(::this.add);
	}
	
	/**
	 * Get an event stream associated with this set object.
	 * @param {string} op - the name of the event stream you want: `"add"` or `"delete"`
	 * @returns {Subject} - the rxjs event stream
	 */
	e(op: string): Observable {
		switch (op) {
			case 'add':    return this[$$addSubject];
			case 'delete': return this[$$deleteSubject];
			default: constraint(false, humanMsg`
				The ${op} event does not exist.
			`);
		}
	}
	
	/**
	 * Get an event stream associated with this set object.
	 * @param {string} name  - the name of the property you want; the
	 *                         only one available at the moment is `"value"`
	 * @returns {Observable} - the rxjs event stream (based on the `BehaviorSubject` class)
	 */
	p(name: string): Observable {
		switch (name) {
			case 'value': return this[$$valueObservable];
			default: constraint(false, humanMsg`
				The ${name} property does not exist.
			`);
		}
	}
	
	/**
	 * Add a new element with the given value to this set object.
	 * @param   {T} val         - the value to add to the set
	 * @returns {ObservableSet} - this observable set object
	 */
	add(val: T): this {
		if (!this[$$set].has(val)) {
			this[$$set].add(val);
			this[$$addSubject].next(val);
		}
		return this;
	}
	
	/**
	 * Remove all elements from this set object.
	 * @returns {void}
	 */
	clear(): void {
		for (let value of this[$$set]) {
			this.delete(value);
		}
	}
	
	/**
	 * Removes the element with the value and returns the value that `has(val)` would have previously returned.
	 * @param   {T} val   - the value to remove
	 * @returns {boolean} - the element that was removed, if it existed; `false` otherwise
	 */
	delete(val: T): boolean {
		if (this[$$set].has(val)) {
			this[$$set].delete(val);
			this[$$deleteSubject].next(val);
			return true;
		}
		return false;
	}
	
	/**
	 * @returns {Iterator<T[]>} - a new Iterator object that yields an array of
	 *                              `[value, value]` for each element in this set object.
	 */
	entries(): Iterator<[T, T]> {
		return this[$$set].entries();
	}
	
	/**
	 * Run a function for each element in this set object.
	 * @param {function(:T, :T)} callbackFn - the function to invoke for each element
	 * @param {Object} [thisArg]            - the object that will be `this` inside the `callbackFn`
	 * @returns {void}
	 */
	forEach(callbackFn: (T, T)=>void, thisArg?: Object): void {
		return this[$$set].forEach(callbackFn, thisArg);
	}
	
	/**
	 * Test whether this set object contains a certain value.
	 * @param {T} val - the value to test for
	 * @returns {boolean} `true`, if `val` is an element in this set object; `false` otherwise
	 */
	has(val: T): boolean {
		return this[$$set].has(val);
	}
	
	/**
	 * @returns {Iterator<T>} - a new Iterator object that contains the values for each element in this set object
	 */
	values(): Iterator<T> {
		return this[$$set].values();
	}
	
	/**
	 * The presence of this method makes an observable set object iterable through `for...of` loops.
	 * @returns {Iterator<T>} - a new Iterator object that contains the values for each element in this set object
	 */
	[Symbol.iterator](): Iterator<T> {
		return this[$$set][Symbol.iterator]();
	}
	
	/**
	 * @returns {number} - the number of values in this set object
	 */
	get size(): number {
		return this[$$set].size;
	}
	
	/**
	 * Overwrite the content of this set object,
	 * emitting the proper `delete` and `add` signals (in that order).
	 * @param {Iterable<T>} newContent - the new elements of the set
	 * @returns {ObservableSet} - this observable set object
	 */
	overwrite(newContent: Iterable<T>) {
		newContent = new Set(newContent);
		for (let e of this.values()) {
			if (!newContent.has(e)) {
				this.delete(e);
			}
		}
		for (let e of newContent) {
			if (!this.has(e)) {
				this.add(e);
			}
		}
		return this;
	}
}
