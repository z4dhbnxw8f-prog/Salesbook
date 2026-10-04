import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseMoney,saleTotal,money,dateRange,parsePercentage,commissionAmount} from '../lib/money';
test('dalasi values keep exact butut arithmetic',()=>{assert.equal(parseMoney('0.10')+parseMoney('0.20'),30);assert.equal(saleTotal(parseMoney('125.50'),3),37650);assert.equal(money(37650),'D 376.50');});
test('money formatting follows the selected currency',()=>{assert.equal(money(37650,'USD'),'US$376.50');assert.equal(money(37650,'EUR'),'€376.50');});
test('invalid amounts and overflowing sales are rejected',()=>{for(const value of ['-1','1.001','1e3','NaN','', '10000000'])assert.throws(()=>parseMoney(value));assert.throws(()=>saleTotal(999999999,100));});
test('date filters include all of the final Gambia day',()=>{const range=dateRange('2026-10-01','2026-10-03');assert.equal(range.gte?.toISOString(),'2026-10-01T00:00:00.000Z');assert.equal(range.lt?.toISOString(),'2026-10-04T00:00:00.000Z');});

test('invalid calendar dates do not silently shift the sales period',()=>{assert.equal(dateRange('2026-02-30','invalid').gte,undefined);assert.equal(dateRange(undefined,'2026-13-01').lt,undefined);});

test('employee percentage allows blank, zero, fractional and full percentages',()=>{assert.equal(parsePercentage(''),0);assert.equal(parsePercentage('0'),0);assert.equal(parsePercentage('12.25'),1225);assert.equal(parsePercentage('100'),10000);for(const value of ['-1','100.01','1.001','NaN','1e2'])assert.throws(()=>parsePercentage(value));});
test('commission uses the full sale total and rounds once to currency hundredths',()=>{assert.equal(commissionAmount(30000,1250),3750);assert.equal(commissionAmount(101,5000),51);assert.equal(commissionAmount(30000,0),0);assert.equal(commissionAmount(30000,10000),30000);assert.equal(commissionAmount(2000000000,10000),2000000000);assert.throws(()=>commissionAmount(100,10001));});
