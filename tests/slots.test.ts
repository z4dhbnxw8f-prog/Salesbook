import {test} from 'node:test';
import assert from 'node:assert/strict';
import {slots,formatTime} from '../lib/slots';
const base={date:'2026-10-05',timezone:'Europe/Berlin',duration:30,buffer:15,interval:15,notice:0,days:365,windows:[{weekday:1,startMinute:540,endMinute:660}],busy:[],now:new Date('2026-10-01T00:00:00Z')};
test('duration and buffer fit within windows and half-open conflicts allow adjacency',()=>{
 const result=slots({...base,busy:[{startAt:new Date('2026-10-05T07:00:00Z'),endAt:new Date('2026-10-05T07:45:00Z')}]});
 assert.deepEqual(result.map(d=>d.toISOString()),['2026-10-05T07:45:00.000Z','2026-10-05T08:00:00.000Z','2026-10-05T08:15:00.000Z']);
});
test('spring-forward never offers nonexistent local times',()=>{
 const result=slots({...base,date:'2027-03-28',duration:30,buffer:0,interval:30,windows:[{weekday:0,startMinute:60,endMinute:240}]});
 assert.equal(result.length,4);assert.ok(result.every(d=>!formatTime(d,base.timezone).startsWith('02:')));
});
test('fall-back distinguishes repeated hours by offset',()=>{
 const result=slots({...base,date:'2026-10-25',duration:30,buffer:0,interval:30,windows:[{weekday:0,startMinute:120,endMinute:180}]});
 assert.equal(result.length,4);assert.equal(new Set(result.map(d=>formatTime(d,base.timezone))).size,4);
});
test('notice, horizon, closed days and breaks remove slots',()=>{
 assert.equal(slots({...base,notice:10000}).length,0);assert.equal(slots({...base,days:1}).length,0);assert.equal(slots({...base,windows:[]}).length,0);
 assert.equal(slots({...base,windows:[{weekday:1,startMinute:540,endMinute:570},{weekday:1,startMinute:600,endMinute:630}]}).length,0);
});
