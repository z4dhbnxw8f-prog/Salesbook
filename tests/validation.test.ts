import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerSchema, businessSchema } from '../lib/validation';
test('registration normalizes email and rejects mismatching and bcrypt-truncated passwords',()=>{
 const valid={name:'Owner',email:' OWNER@EXAMPLE.COM ',password:'a secure password',confirmPassword:'a secure password'};
 assert.equal(registerSchema.parse(valid).email,'owner@example.com');
 assert.equal(registerSchema.safeParse({...valid,confirmPassword:'different'}).success,false);
 assert.equal(registerSchema.safeParse({...valid,password:'😀'.repeat(20),confirmPassword:'😀'.repeat(20)}).success,false);
});
test('business rejects unsafe slugs and invalid timezones',()=>{
 const valid={name:'Studio',slug:'my-studio',category:'Studio',email:'owner@example.com',description:'',phone:'',address:'',city:'',country:'DE',timezone:'Europe/Berlin',currency:'EUR'};
 assert.equal(businessSchema.safeParse(valid).success,true);
 assert.equal(businessSchema.safeParse({...valid,timezone:'Not/AZone'}).success,false);
 assert.equal(businessSchema.safeParse({...valid,slug:'../admin'}).success,false);
});
