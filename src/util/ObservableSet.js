import {BehaviorSubject, Subject} from '../libs/rxjs.js';
import assert from "power-assert";
import {humanMsg, constraint} from "./misc";

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


export default class ObservableSet {
	
	constructor(initialContent = []) {
		this[$$set] = new Set;
		
		this[$$addSubject] = new AddReplaySubject(this);
		this[$$addSubject].normalSubscribe(::this.add);
		
		this[$$deleteSubject] = new Subject();
		this[$$deleteSubject].subscribe(::this.delete);
		
		initialContent.forEach(::this.add);
		
		let valueSubject = new BehaviorSubject(new Set(this));
		this[$$addSubject]   .normalSubscribe(() => { valueSubject.next(new Set(this)) });
		this[$$deleteSubject].subscribe      (() => { valueSubject.next(new Set(this)) });
		this[$$valueObservable] = valueSubject.asObservable();
	}
	
	e(op) {
		switch (op) {
			case 'add':    { return this[$$addSubject]    }
			case 'delete': { return this[$$deleteSubject] }
			default: constraint(false, humanMsg`
				The ${op} event does not exist.
			`);
		}
	}
	
	p(name) {
		switch (name) {
			case 'value': { return this[$$valueObservable] }
			default: constraint(false, humanMsg`
				The ${name} property does not exist.
			`);
		}
	}
	
	/* Set operations */
	add(obj) {
		if (!this[$$set].has(obj)) {
			this[$$set].add(obj);
			this.e('add').next(obj);
		}
		return this;
	}
	clear() {
		for (let value of this[$$set]) {
			this.delete(value);
		}
		return this;
	}
	delete(obj) {
		if (this[$$set].has(obj)) {
			this[$$set].delete(obj);
			this.e('delete').next(obj);
			return true;
		}
		return false;
	}
	entries() {
		return this[$$set].entries();
	}
	forEach(...args) {
		return this[$$set].forEach(...args);
	}
	has(obj) {
		return this[$$set].has(obj);
	}
	values() {
		return this[$$set].values();
	}
	[Symbol.iterator]() {
		return this[$$set][Symbol.iterator]();
	}
	get size() {
		return this[$$set].size;
	}
}

export function setEquals(setA, setB) {
	setA = new Set(setA);
	setB = new Set(setB);
	if (setA.size !== setB.size) return false;
	for (let a of setA) if (!setB.has(a)) return false;
	return true;
}

export function copySetContent(reference, newContent) {
	newContent = new Set(newContent);
	for (let e of reference) {
		if (!newContent.has(e)) {
			reference.delete(e);
		}
	}
	for (let e of newContent) {
		if (!reference.has(e)) {
			reference.add(e);
		}
	}
}
