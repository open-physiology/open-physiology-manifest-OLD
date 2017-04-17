import {describe, it, expect, beforeEach} from '../test.helper';

import ObservableSet, {setEquals} from '../../src/util/ObservableSet';

describe("ObservableSet", () => {
	
	let s;
	
	beforeEach(() => {
		s = new ObservableSet();
	});
	
	it("can replay the current set on a new 'add' subscription", () => {
		
		let added   = new Set();
		let deleted = new Set();
		
		s.e('add')   .subscribe((v) => { added  .add(v) });
		s.e('delete').subscribe((v) => { deleted.add(v) });
		
		s.add(1);
		s.add(2);
		s.delete(1);
		
		expect([...added])    .to.include(1);
		expect([...added])    .to.include(2);
		expect([...added]).not.to.include(3);
		expect([...deleted])  .to.include(1);
		
	});
	
	it("can replay the current set on a new 'add' subscription", () => {
		
		let added = new Set();
		
		s.add(1);
		s.add(2);
		s.add(3);
		s.delete(1);
		
		s.e('add').subscribe((v) => { added.add(v) });
		
		s.add(4);
		s.add(5);
		s.delete(2);
		
		
		expect([...added]).to.include(2);
		expect([...added]).to.include(3);
		expect([...added]).to.include(4);
		expect([...added]).to.include(5);
		expect([...added]).to.not.include(1);
		
	});
	
	it("can use replay to synchronize the entire set through the 'add' and 'delete' subjects", () => {
		
		let syncedSet = new Set();
		
		s.add(1);
		s.add(2);
		s.add(3);
		s.delete(1);
		
		s.e('add'   ).subscribe(::syncedSet.add);
		s.e('delete').subscribe(::syncedSet.delete);
		
		s.add(4);
		s.add(5);
		s.delete(2);
		
		expect([...syncedSet]).to.include(3);
		expect([...syncedSet]).to.include(4);
		expect([...syncedSet]).to.include(5);
		expect([...syncedSet]).to.not.include(1);
		expect([...syncedSet]).to.not.include(2);

		expect([...s]).to.eql([...syncedSet]);
		
		
	});
	
	it("can emit a copy of the current set every time something is added or deleted", () => {
		
		let values = [];
		
		s.p('value').subscribe((v) => { values.push(v) });
		
		s.add(1);
		s.add(2);
		s.delete(1);
		
		expect([...values[0]]).to.eql([    ]);
		expect([...values[1]]).to.eql([1   ]);
		expect([...values[2]]).to.eql([1, 2]);
		expect([...values[3]]).to.eql([   2]);
		
	});
	
});
