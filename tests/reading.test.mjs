import test from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, SUITS } from '../cards.js';
import { shuffleDeck, composeReading, secureIndex, validSession, validDraft } from '../reading.js';
import { readJSON, writeJSON } from '../storage.js';

test('牌库包含 22 张大阿卡那与四组各 14 张牌，ID 唯一',()=>{
  assert.equal(CARDS.length,78);
  assert.equal(new Set(CARDS.map(c=>c.id)).size,78);
  assert.equal(CARDS.filter(c=>c.suit==='major').length,22);
  for(const suit of SUITS)assert.equal(CARDS.filter(c=>c.suit===suit.id).length,14);
  for(const c of CARDS)for(const key of ['name','en','upright','reversed','symbolism','prompt'])assert.ok(c[key]);
});
test('洗牌不丢牌、不重复，关闭逆位后全部正位',()=>{
  for(let i=0;i<30;i++){
    const deck=shuffleDeck(false);
    assert.equal(deck.length,78);
    assert.equal(new Set(deck.map(p=>p.id)).size,78);
    assert.ok(deck.every(p=>p.reversed===false));
  }
});
test('随机索引拒绝取模偏差区间并重新取值',()=>{
  const numbers=[4294967295,77];
  const source={getRandomValues(array){array[0]=numbers.shift();return array;}};
  assert.equal(secureIndex(78,source),77);
  assert.equal(numbers.length,0);
  assert.throws(()=>secureIndex(0));
});
function fixture(){const deck=shuffleDeck(false);return {version:1,id:'test-reading',createdAt:new Date().toISOString(),question:'我可以怎样开始？',topic:'self',spread:'three',stage:'result',allowReversed:false,deck,selected:deck.slice(0,3),revealed:3};}
test('三牌解读遵循牌位与正逆位，并给出行动提示',()=>{
  const session=fixture();session.selected[1]={...session.selected[1],reversed:true};
  const result=composeReading(session);
  assert.deepEqual(result.parts.map(p=>p.position),['现状','阻碍','建议']);
  assert.equal(result.parts[1].orientation,'逆位');
  assert.equal(result.parts[1].text,CARDS.find(c=>c.id===session.selected[1].id).reversed);
  assert.ok(result.action);
});
test('恢复草稿拒绝重复牌、未知牌与不完整结果',()=>{
  const s=fixture();assert.equal(validDraft(s),true);
  assert.equal(validSession({...s,selected:[s.selected[0],s.selected[0]]}),false);
  assert.equal(validSession({...s,selected:[{id:'unknown',reversed:false}]}),false);
  assert.equal(validDraft({...s,revealed:0}),false);
  assert.equal(validDraft({...s,deck:[]}),false);
  assert.equal(validDraft({...s,question:'x'.repeat(301)}),false);
});
test('存储损坏与存储不可用时安全降级',()=>{
  assert.deepEqual(readJSON('x',[],{getItem(){return '{bad json';}}),[]);
  assert.equal(writeJSON('x',{}, {setItem(){throw new Error('quota');}}),false);
  assert.equal(readJSON('x',null,{getItem(){throw new Error('blocked');}}),null);
});
