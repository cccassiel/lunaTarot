import { CARDS, CARD_MAP, SPREADS, TOPICS } from './cards.js';
export function secureIndex(max, cryptoSource = globalThis.crypto) {
  if (!Number.isSafeInteger(max) || max < 1 || max > 4294967296) throw new Error('Invalid random range');
  const limit = Math.floor(4294967296 / max) * max;
  let value;
  do { value = cryptoSource.getRandomValues(new Uint32Array(1))[0]; } while (value >= limit);
  return value % max;
}
export function shuffleDeck(includeReversed = true) {
  const ids = CARDS.map(c=>c.id);
  for(let i=ids.length-1;i>0;i--) { const j=secureIndex(i+1); [ids[i],ids[j]]=[ids[j],ids[i]]; }
  return ids.map(id=>({id,reversed:includeReversed && secureIndex(2)===1}));
}
export function composeReading(session) {
  const spread=SPREADS[session.spread], topic=TOPICS[session.topic];
  const parts=session.selected.map((pick,i)=>{
    const c=CARD_MAP.get(pick.id);
    return {position:spread.positions[i],name:c.name,orientation:pick.reversed?'逆位':'正位',keywords:c.keywords,text:pick.reversed?c.reversed:c.upright,prompt:c.prompt,symbolism:c.symbolism};
  });
  return {parts,summary:parts.length===1?`以「${parts[0].name}」为一面镜子，留意${parts[0].keywords.split(' · ').slice(0,2).join('与')}。不急着寻找确定的答案，先看看哪一句让你有所共鸣。`:`从「${parts[0].name}」看见现状，借「${parts[1].name}」检视阻碍，再以「${parts[2].name}」寻找下一步。它们提供不同的观察角度，可以结合你的实际处境来取舍。`,action:topic.action,prompt:parts.at(-1).prompt};
}
export function localDay(date=new Date()) { return new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
export function validSession(s) {
  return !!s && s.version===1 && typeof s.id==='string' && typeof s.question==='string' && s.question.length<=300 && !!TOPICS[s.topic] && !!SPREADS[s.spread] && typeof s.createdAt==='string' && Number.isFinite(Date.parse(s.createdAt)) && Array.isArray(s.selected) && s.selected.length<=SPREADS[s.spread].count && s.selected.every(p=>p && CARD_MAP.has(p.id) && typeof p.reversed==='boolean') && new Set(s.selected.map(p=>p.id)).size===s.selected.length;
}
export function validDraft(s) {
  return validSession(s) && ['setup','select','reveal','result'].includes(s.stage) && typeof s.allowReversed==='boolean' && typeof s.revealed==='number' && Number.isInteger(s.revealed) && s.revealed>=0 && s.revealed<=s.selected.length && Array.isArray(s.deck) && s.deck.length===78 && new Set(s.deck.map(p=>p.id)).size===78 && s.deck.every(p=>p && CARD_MAP.has(p.id) && typeof p.reversed==='boolean') && s.selected.every(p=>s.deck.some(d=>d.id===p.id&&d.reversed===p.reversed)) && (['reveal','result'].includes(s.stage)?s.selected.length===SPREADS[s.spread].count:true) && (s.stage==='result'?s.revealed===s.selected.length:true);
}
