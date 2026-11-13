import { CARDS, CARD_MAP, SUITS, SPREADS, TOPICS } from './cards.js';
import { shuffleDeck, composeReading, localDay, validDraft } from './reading.js';
import { KEYS, readJSON, writeJSON, getJournal, getDraft } from './storage.js';

const $ = (q,root=document)=>root.querySelector(q);
const main=$('#main'), dialog=$('#detail-dialog');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let session=getDraft(), journal=getJournal(), filter='all', search='', journalSearch='', starsOnly=false;
let toastTimer, saveWarning=false;
const serifTitle=(small,title,body='')=>`<div class="page-heading"><span class="section-index">${small}</span><h1>${title}</h1>${body?`<p>${body}</p>`:''}</div>`;
function toast(text) { $('#toast').textContent=text; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500); }
function persist() {
  if(session && !writeJSON(KEYS.draft,session) && !saveWarning) { saveWarning=true; toast('浏览器未允许存储，本次内容暂时仅保留在当前页面。'); }
  if(session?.daily) writeJSON(`luna.daily.${session.daily}`,session);
}
function saveJournal(entries) {
  if(!writeJSON(KEYS.journal,entries)) { toast('保存失败：本机存储不可用或已满，请先导出备份。'); return false; }
  journal=entries; updateCount(); return true;
}
function updateCount() { $('#journal-count').textContent=journal.length?` ${journal.length}`:''; }
function go(route) { if(location.hash===`#${route}`) render(); else location.hash=route; }
function route() { return location.hash.slice(1)||'home'; }
function newSession(daily=false) {
  if(daily) {
    const existing=readJSON(`luna.daily.${localDay()}`,null);
    if(validDraft(existing)) {session=existing;persist();go('reading');return;}
  }
  session={version:1,id:crypto.randomUUID(),createdAt:new Date().toISOString(),question:daily?'今天，我可以带着怎样的觉察度过一天？':'',topic:'self',spread:'single',allowReversed:true,stage:daily?'select':'setup',deck:shuffleDeck(true),selected:[],revealed:0,daily:daily?localDay():null};
  persist(); go('reading');
}
function front(pick,classes='') {
  const c=CARD_MAP.get(pick.id);
  return `<div class="tarot-front ${classes} ${pick.reversed?'is-reversed':''}" data-suit="${c.suit}"><div class="card-border"><span class="card-number">${c.suit==='major'?String(c.number).padStart(2,'0'):SUITS.find(s=>s.id===c.suit).name}</span><div class="card-art"><span class="orbit orbit-one"></span><span class="orbit orbit-two"></span><span class="card-glyph">${c.symbol}</span><span class="card-stars">✧ · ✦ · ✧</span></div><div class="card-title"><strong>${c.name}</strong><small>${c.en}</small></div></div></div>`;
}
function home() {
  const day=new Date().getDate();
  const prompts=['如果今天只做好一件事，你希望它是什么？','什么值得你放慢脚步，认真感受？','你现在最需要给予自己怎样的支持？','有哪一件小事，让你更靠近真实的自己？'];
  main.innerHTML=`<section class="hero wrap"><div class="hero-copy"><h1>在不确定里，<br>听见自己。</h1><p class="hero-description">塔罗是一面温柔的镜子。<br>在象征与故事中，梳理思绪，<br>找到更贴近自己的方向。</p><div class="hero-actions"><button class="button primary" data-action="start">开始抽牌 <span>↗</span></button><button class="daily-link" data-action="daily">每日一牌 <span>→</span></button></div><p class="quiet-note">无需登录 · 留一点时间，给此刻的自己</p>${session?`<button class="resume-link" data-action="resume">继续上次的探索 ↗</button>`:''}</div><div class="hero-art"><img src="assets/celestial-cards.png" alt="月亮、星星与太阳三张金色雕刻风格塔罗牌" fetchpriority="high" width="1536" height="1024"><span class="art-caption">THE MOON &nbsp; · &nbsp; THE STAR &nbsp; · &nbsp; THE SUN</span></div></section>
  <section class="how wrap" aria-label="探索的三个步骤"><div><span>01</span><div><h2>写下困惑</h2><p>不必是完美的问题，<br>从此刻的感受开始。</p></div></div><div><span>02</span><div><h2>凭直觉选牌</h2><p>给思绪一点留白，<br>看见一个新的角度。</p></div></div><div><span>03</span><div><h2>留下此刻</h2><p>记下触动你的启发，<br>也记录慢慢变化的自己。</p></div></div></section>
  <section class="reflection wrap"><div class="reflection-date"><span>今日的自我反思</span><p>${new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'long'}).format(new Date())}</p></div><div class="reflection-prompt"><h2>今日的提问</h2><p>${prompts[day%prompts.length]}</p></div><button class="round-button" data-action="use-prompt" data-prompt="${esc(prompts[day%prompts.length])}" aria-label="带着今日的问题开始探索">↗</button></section>
  <section class="learn-strip wrap"><div><span class="section-index">FOR THE CURIOUS</span><h2>不止抽牌，也读懂牌。</h2><p>从 78 张牌的象征、正逆位与反思问题，开始认识塔罗。</p></div><a href="#library" class="underlined-link">翻开牌义图鉴 ↗</a></section>`;
}
function reading() {
  if(!session) {newSession();return;}
  const s=session, spread=SPREADS[s.spread];
  const stages=['setup','select','reveal','result'];
  main.innerHTML=`<div class="reading-shell wrap"><div class="reading-top"><button class="text-button" data-action="${s.stage==='setup'?'home':'back'}">← ${s.stage==='setup'?'返回首页':'上一步'}</button><span>${s.daily?'每日一牌 · '+esc(s.daily):'留一段时间，与自己相处'}</span></div><ol class="progress" aria-label="抽牌进度">${['写下问题','凭直觉选牌','揭开牌面','看见与记录'].map((label,i)=>`<li class="${i<=stages.indexOf(s.stage)?'active':''}" ${i===stages.indexOf(s.stage)?'aria-current="step"':''}><span>0${i+1}</span>${label}</li>`).join('')}</ol><div id="reading-body"></div></div>`;
  if(s.stage==='setup') setup();
  if(s.stage==='select') selection();
  if(s.stage==='reveal') reveal();
  if(s.stage==='result') result();
}
function setup() {
  $('#reading-body').innerHTML=`${serifTitle('A MOMENT FOR YOURSELF','你想探索什么？','把模糊的感受，慢慢写成一句话。')}<form id="question-form" class="setup-form"><fieldset><legend>选择一个主题</legend><div class="topic-options">${Object.entries(TOPICS).map(([key,t])=>`<button type="button" class="choice ${session.topic===key?'selected':''}" aria-pressed="${session.topic===key}" data-action="topic" data-value="${key}">${t.label}</button>`).join('')}</div></fieldset><label class="field-label" for="question">此刻的问题 <span>选填，留空也可以开始</span></label><textarea id="question" name="question" rows="3" maxlength="300" placeholder="${esc(TOPICS[session.topic].question)}">${esc(session.question)}</textarea><div class="question-meta"><button type="button" class="text-button" data-action="example">试试这个问题 ↗</button><span id="question-length">${session.question.length} / 300</span></div><fieldset><legend>选择牌阵</legend><div class="spread-options">${Object.entries(SPREADS).map(([key,s])=>`<label class="spread-choice ${session.spread===key?'selected':''}"><input type="radio" name="spread" value="${key}" ${session.spread===key?'checked':''}><span class="mini-spread" aria-hidden="true">${'▯'.repeat(s.count)}</span><span><strong>${s.label}</strong><small>${s.description}</small></span><span class="radio-dot"></span></label>`).join('')}</div></fieldset><div class="reversed-setting"><label><input type="checkbox" id="allow-reversed" ${session.allowReversed?'checked':''}> 包含逆位牌</label><button class="text-button" type="button" data-action="reversals">什么是逆位？ ⓘ</button></div><button type="submit" class="button primary full">准备好了，开始选牌 <span>→</span></button><p class="form-footnote">这是一次自我反思练习，牌面不预示确定的未来。</p></form>`;
}
function selection() {
  const spread=SPREADS[session.spread];
  $('#reading-body').innerHTML=`${serifTitle('FOLLOW YOUR INTUITION','慢下来，选一张与你相遇的牌。',`想着你的问题，从牌堆中选择 ${spread.count} 张牌。`)}<p class="question-quote">“${esc(session.question)}”</p><div class="selected-slots">${spread.positions.map((p,i)=>`<div class="selected-slot"><span>${p}</span>${session.selected[i]?`<button class="card-back small picked" data-action="unpick" data-index="${i}" aria-label="取消第 ${i+1} 张选牌"><span>☾</span><small>点击重选</small></button>`:`<div class="empty-slot"><span>✧</span></div>`}</div>`).join('')}</div><div class="deck-header"><span role="status">已选择 ${session.selected.length} / ${spread.count} 张</span><button class="text-button" data-action="shuffle" ${session.selected.length?'disabled':''}>⟳ 重新洗牌</button></div><div class="deck" aria-label="78 张待选塔罗牌">${session.deck.map((p,i)=>`<button class="card-back deck-card ${session.selected.some(x=>x.id===p.id)?'chosen':''}" data-action="pick" data-index="${i}" ${session.selected.some(x=>x.id===p.id)||session.selected.length===spread.count?'disabled':''} aria-label="选择第 ${i+1} 张牌"><span>☾</span><small>✧</small></button>`).join('')}</div><div class="reading-bottom"><span>每张牌都有同样的机会，被你看见。</span><button class="button primary" data-action="confirm-selection" ${session.selected.length!==spread.count?'disabled':''}>揭开牌面 →</button></div>`;
}
function reveal() {
  const spread=SPREADS[session.spread];
  $('#reading-body').innerHTML=`${serifTitle('A NEW PERSPECTIVE','让新的视角，慢慢浮现。','点击牌背，揭开你的牌。')}<p class="question-quote">“${esc(session.question)}”</p><div class="reveal-cards">${session.selected.map((p,i)=>`<div class="reveal-item"><span class="position-label">${spread.positions[i]}</span>${i<session.revealed?`${front(p,'revealed')}<p class="orientation">${p.reversed?'逆位':'正位'} · ${esc(CARD_MAP.get(p.id).keywords)}</p>`:`<button class="card-back reveal-back" data-action="reveal" aria-label="揭开${spread.positions[i]}牌" ${i!==session.revealed?'disabled':''}><span>☾</span><small>轻触揭晓</small></button>`}</div>`).join('')}</div><div class="center-actions"><button class="button primary" data-action="interpret" ${session.revealed!==session.selected.length?'disabled':''}>阅读我的解读 →</button>${session.revealed!==session.selected.length?'<button class="text-button" data-action="reveal-all">直接揭开全部</button>':''}</div>`;
}
function result(record=null) {
  const s=record||session, r=composeReading(s), saved=journal.find(j=>j.id===s.id);
  const target=record?$('#journal-detail'):$('#reading-body');
  target.innerHTML=`${record?'<button class="text-button" data-action="journal-back">← 返回日记</button>':''}${serifTitle('YOUR REFLECTION','答案之外，也有新的看见。',`${TOPICS[s.topic].label} · ${SPREADS[s.spread].label}`)}<p class="question-quote">“${esc(s.question)}”</p><div class="result-layout"><div class="result-cards">${s.selected.map((p,i)=>`<button class="result-card-button" data-action="card" data-id="${p.id}" aria-label="查看${CARD_MAP.get(p.id).name}的详细牌义"><span class="position-label">${SPREADS[s.spread].positions[i]}</span>${front(p)}<span class="orientation">${p.reversed?'逆位':'正位'} ↗</span></button>`).join('')}</div><div class="interpretation"><div class="source-note">✧ 基础牌义解读 · 非 AI 生成</div><h2>整体的提示</h2><p>${r.summary}</p><p class="context-note">围绕你写下的问题「${esc(s.question)}」，试着将以下提示与你的实际经历联系；不适用的部分可以放下。</p>${r.parts.map(p=>`<article class="meaning-section"><h3><span>${p.position}</span>${p.name} <small>${p.orientation}</small></h3><p>${p.text}</p><details><summary>为什么这样解读？</summary><p>${p.symbolism}</p><p>当前牌位是「${p.position}」。${p.orientation==='逆位'?'逆位作为内在阻力、过度或尚未整合的观察角度，并不代表坏事。':'正位作为该主题较直接的表达。'}这些象征是反思工具，不是对事实的判断。</p></details></article>`).join('')}<div class="action-note"><span>把启发带回生活</span><p>${r.action}</p></div><div class="reflection-question"><span>留给自己的一个问题</span><h3>${r.prompt}</h3></div></div></div><section class="note-editor"><label for="personal-note"><h2>此刻，你想记下什么？</h2><p>哪句话触动了你？它让你想起了什么？</p></label><textarea id="personal-note" rows="4" maxlength="3000" placeholder="写给现在的自己，也留给未来回看……">${esc(saved?.note||'')}</textarea><div class="note-actions"><span>仅保存在当前浏览器，建议定期导出。</span><button class="button primary" data-action="save" data-record="${esc(s.id)}">${saved?'更新日记':'保存到我的日记'} <span>↗</span></button></div></section><div class="result-actions"><button class="text-button" data-action="export-reading" data-record="${esc(s.id)}">↓ 导出这次探索</button><button class="text-button" data-action="${record?'journal-back':'restart'}">${record?'返回日记':'开启新的探索'} →</button></div>`;
}
function library() {
  main.innerHTML=`<section class="library wrap">${serifTitle('THE LANGUAGE OF TAROT','每张牌，都是一个新的视角。','认识 78 张牌的关键词、象征与正逆位，慢慢建立属于你的理解。')}<div class="library-controls"><label class="search-box"><span aria-hidden="true">⌕</span><input id="card-search" type="search" placeholder="搜索牌名、英文或关键词" aria-label="搜索牌义" value="${esc(search)}"></label><div class="filter-tabs" role="group" aria-label="牌组筛选">${[['all','全部 78'],['major','大阿卡那'],...SUITS.map(s=>[s.id,s.name])].map(([k,label])=>`<button class="${filter===k?'active':''}" aria-pressed="${filter===k}" data-action="filter" data-value="${k}">${label}</button>`).join('')}</div></div><div class="library-meta"><span id="card-total" role="status"></span><button class="text-button" data-action="beginner">新手阅读指南 ↗</button></div><div id="library-grid" class="library-grid"></div></section>`;
  libraryGrid();
}
function libraryGrid() {
  const cards=CARDS.filter(c=>(filter==='all'||c.suit===filter)&&`${c.name} ${c.en} ${c.keywords}`.toLowerCase().includes(search.toLowerCase().trim()));
  $('#card-total').textContent=`${cards.length} 张牌 · 点击阅读牌义`;
  $('#library-grid').innerHTML=cards.length?cards.map(c=>`<button class="library-card" data-action="card" data-id="${c.id}">${front({id:c.id,reversed:false})}<p>${c.keywords}</p></button>`).join(''):'<div class="empty-state"><span>✧</span><h2>还没有找到这张牌</h2><p>试试中文牌名、英文名，或「希望」「关系」这样的关键词。</p><button class="button secondary" data-action="clear-search">清除筛选</button></div>';
}
function journalView() {
  main.innerHTML=`<section class="journal wrap" id="journal-detail">${serifTitle('NOTES TO YOURSELF','把此刻，留给未来的自己。','这里记录你的牌、你的困惑，以及只有你知道的故事。')}<div class="journal-toolbar"><label class="search-box"><span aria-hidden="true">⌕</span><input id="journal-search" type="search" aria-label="搜索日记" placeholder="搜索问题、牌名或笔记" value="${esc(journalSearch)}"></label><button class="text-button ${starsOnly?'gold':''}" data-action="star-filter" aria-pressed="${starsOnly}">${starsOnly?'★':'☆'} 只看收藏</button><button class="text-button" data-action="export-journal" ${journal.length?'':'disabled'}>↓ 导出备份</button></div><p class="storage-note">日记仅保存在此浏览器，不会上传服务器。清除浏览器数据会移除记录。</p><div id="journal-list"></div></section>`;
  journalList();
}
function journalList() {
  const entries=journal.filter(j=>(!starsOnly||j.starred)&&`${j.question} ${j.note} ${j.selected.map(p=>CARD_MAP.get(p.id).name).join(' ')}`.toLowerCase().includes(journalSearch.toLowerCase().trim()));
  $('#journal-list').innerHTML=entries.length?entries.map(j=>`<article class="journal-row"><div class="journal-date">${new Intl.DateTimeFormat('zh-CN',{month:'2-digit',day:'2-digit'}).format(new Date(j.createdAt))}<small>${new Date(j.createdAt).getFullYear()}</small></div><button class="journal-open" data-action="open-record" data-id="${esc(j.id)}"><span>${TOPICS[j.topic].label} · ${SPREADS[j.spread].label}</span><h2>${esc(j.question)}</h2><p>${j.selected.map(p=>`${CARD_MAP.get(p.id).name}${p.reversed?'（逆位）':''}`).join(' · ')}</p>${j.note?`<p class="note-preview">${esc(j.note.slice(0,100))}</p>`:''}</button><div class="journal-row-actions"><button data-action="star" data-id="${esc(j.id)}" aria-label="${j.starred?'取消收藏':'收藏日记'}" aria-pressed="${j.starred}">${j.starred?'★':'☆'}</button><button data-action="delete" data-id="${esc(j.id)}" aria-label="删除日记">×</button></div></article>`).join(''):`<div class="empty-state"><span>☾</span><h2>${journal.length?'没有找到对应的记录':'你的第一篇日记，还在等你。'}</h2><p>${journal.length?'试试其他关键词，或关闭收藏筛选。':'从一次抽牌开始，记下一个值得回望的瞬间。'}</p><button class="button primary" data-action="${journal.length?'clear-journal-search':'start'}">${journal.length?'清除筛选':'开始一次探索 ↗'}</button></div>`;
}
function openDialog(title,body) { $('#dialog-content').innerHTML=`<h2 id="dialog-title">${title}</h2>${body}`;dialog.showModal(); }
function showCard(id) {
  const c=CARD_MAP.get(id);
  openDialog(c.name,`<div class="card-detail">${front({id,reversed:false})}<div><p class="english-name">${c.en}</p><p class="gold">${c.keywords}</p><h3>正位 · 一个观察角度</h3><p>${c.upright}</p><h3>逆位 · 需要留意的部分</h3><p>${c.reversed}</p><h3>牌面中的象征</h3><p>${c.symbolism}</p><div class="detail-prompt"><span>问问自己</span><p>${c.prompt}</p></div></div></div><p class="dialog-footnote">Luna 原创中文牌义整理 · 牌面为本站符号化设计，不是传统韦特图像。</p>`);
}
function download(name,text,type='text/plain;charset=utf-8') {
  const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function recordFor(id) { return journal.find(j=>j.id===id)||(session?.id===id?session:null); }
function render() {
  const r=route();
  document.querySelectorAll('[data-nav]').forEach(a=>{const active=a.dataset.nav===(r==='reading'?'home':r);a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  updateCount();
  if(r==='library') library();else if(r==='journal') journalView();else if(r==='reading') reading();else home();
  document.title=`${({home:'听见自己',reading:'此刻的探索',library:'牌义图鉴',journal:'我的日记'}[r])||'听见自己'} · LunaTarot`;
}
document.addEventListener('input',e=>{
  if(e.target.id==='question') {session.question=e.target.value;$('#question-length').textContent=`${session.question.length} / 300`;persist();}
  if(e.target.id==='card-search') {search=e.target.value;libraryGrid();}
  if(e.target.id==='journal-search') {journalSearch=e.target.value;journalList();}
});
document.addEventListener('change',e=>{
  if(e.target.name==='spread') {session.spread=e.target.value;persist();setup();}
  if(e.target.id==='allow-reversed') {session.allowReversed=e.target.checked;persist();}
});
document.addEventListener('submit',e=>{
  if(e.target.id!=='question-form')return;e.preventDefault();
  session.question=$('#question').value.trim()||TOPICS[session.topic].question;
  session.allowReversed=$('#allow-reversed').checked;
  session.deck=shuffleDeck(session.allowReversed);session.selected=[];session.revealed=0;session.stage='select';persist();reading();window.scrollTo({top:0,behavior:'smooth'});
});
document.addEventListener('click',e=>{
  const button=e.target.closest('[data-action]');if(!button||button.disabled)return;
  const a=button.dataset.action,id=button.dataset.id;
  switch(a) {
    case 'start':newSession();break;
    case 'daily':newSession(true);break;
    case 'use-prompt':newSession();session.question=button.dataset.prompt;persist();reading();break;
    case 'resume':go('reading');break;
    case 'home':go('home');break;
    case 'topic':session.topic=button.dataset.value;persist();setup();break;
    case 'example':session.question=TOPICS[session.topic].question;persist();setup();$('#question').focus();break;
    case 'back':if(session.stage==='result')session.stage='reveal';else if(session.stage==='reveal')session.stage='select';else if(session.daily){go('home');return;}else session.stage='setup';persist();reading();break;
    case 'shuffle':if(session.selected.length)return;session.deck=shuffleDeck(session.allowReversed);persist();selection();toast('牌已重新洗好，跟随你的直觉。');break;
    case 'pick':if(session.selected.length>=SPREADS[session.spread].count)return;{const pick=session.deck[Number(button.dataset.index)];if(session.selected.some(p=>p.id===pick.id))return;session.selected.push({...pick});persist();selection();}break;
    case 'unpick':session.selected.splice(Number(button.dataset.index),1);session.revealed=0;persist();selection();break;
    case 'confirm-selection':if(session.selected.length!==SPREADS[session.spread].count)return;session.revealed=0;session.stage='reveal';persist();reading();break;
    case 'reveal':session.revealed=Math.min(session.revealed+1,session.selected.length);persist();reveal();break;
    case 'reveal-all':session.revealed=session.selected.length;persist();reveal();break;
    case 'interpret':if(session.revealed!==session.selected.length)return;session.stage='result';persist();reading();window.scrollTo({top:0,behavior:'smooth'});break;
    case 'restart':newSession();break;
    case 'save':{const record=recordFor(button.dataset.record);if(!record)return;const old=journal.find(j=>j.id===record.id);if(!old&&journal.length>=200){toast('已保存 200 条记录，请导出备份后移除不再需要的日记。');return;}const entry={version:1,id:record.id,createdAt:record.createdAt,question:record.question,topic:record.topic,spread:record.spread,selected:record.selected,note:$('#personal-note').value,starred:old?.starred||false};if(saveJournal([entry,...journal.filter(j=>j.id!==entry.id)])){button.innerHTML='已保存 ✓';toast('已保存到我的日记。');}}break;
    case 'export-reading':{const record=recordFor(button.dataset.record);if(!record)return;const r=composeReading(record);download(`LunaTarot-${record.createdAt.slice(0,10)}.txt`,`LunaTarot · 自我反思\n问题：${record.question}\n主题：${TOPICS[record.topic].label}\n\n${r.summary}\n\n${r.parts.map(p=>`${p.position}｜${p.name} ${p.orientation}\n${p.text}`).join('\n\n')}\n\n小行动：${r.action}\n\n我的笔记：\n${$('#personal-note')?.value||record.note||''}\n\n基础牌义解读，非 AI 生成，仅用于自我反思。`);}break;
    case 'filter':filter=button.dataset.value;library();break;
    case 'clear-search':filter='all';search='';library();break;
    case 'card':showCard(id);break;
    case 'star-filter':starsOnly=!starsOnly;journalView();break;
    case 'clear-journal-search':starsOnly=false;journalSearch='';journalView();break;
    case 'open-record':{const record=journal.find(j=>j.id===id);if(record){result(record);window.scrollTo({top:0,behavior:'smooth'});}}break;
    case 'journal-back':journalView();break;
    case 'star':saveJournal(journal.map(j=>j.id===id?{...j,starred:!j.starred}:j));journalList();break;
    case 'delete':openDialog('删除这篇日记？','<p>删除后无法恢复。如需保留，请先导出备份。</p><div class="dialog-actions"><button class="button secondary" data-action="close-dialog">保留日记</button><button class="button danger" data-action="confirm-delete" data-id="'+esc(id)+'">确认删除</button></div>');break;
    case 'confirm-delete':if(saveJournal(journal.filter(j=>j.id!==id))){dialog.close();journalList();toast('日记已删除。');}break;
    case 'close-dialog':dialog.close();break;
    case 'export-journal':download('LunaTarot-journal-'+localDay()+'.json',JSON.stringify({format:'LunaTarot Journal',version:1,exportedAt:new Date().toISOString(),entries:journal},null,2),'application/json');toast('已导出日记备份。');break;
    case 'reversals':openDialog('逆位，不是坏事。','<p>逆位是牌以倒置方向出现。这里把它理解为某种内在阻力、过度表达，或仍需整理的部分。</p><p>你也可以关闭逆位，只使用正位来探索。正逆位都不代表事情一定会怎样发生。</p>');break;
    case 'beginner':openDialog('从一次观察开始。','<ol class="guide-list"><li><h3>问一个开放的问题</h3><p>把「结果会怎样」换成「我能做些什么」，更容易找到可行动的方向。</p></li><li><h3>先看牌面，再看解释</h3><p>留意第一个吸引你的符号、颜色或感觉，它带来了什么联想？</p></li><li><h3>理解牌阵中的位置</h3><p>同一张牌，在「现状」和「建议」的位置，会带来不同的思考角度。</p></li><li><h3>记下自己的理解</h3><p>牌义是参考。结合事实和自己的感受，保留适合你的部分。</p></li></ol>');break;
    case 'about':openDialog('一面温柔的镜子。','<p>LunaTarot 为塔罗新手与爱好者提供单牌、三牌探索、78 张牌义图鉴和本地日记。</p><h3>关于解读</h3><p>当前版本使用本站整理的基础牌义与反思提示，不使用 AI、不预测确定的未来。塔罗用于自我反思，不能替代医疗、法律或投资等专业建议。</p><h3>关于数据</h3><p>问题、选牌和日记保存在当前浏览器，不会上传服务器；不包含账号或跨设备同步。清除浏览器数据会移除这些内容，请通过「我的日记」定期导出备份。</p><h3>关于牌面</h3><p>首页插画由 AI 生成。图鉴与抽牌使用本站设计的象征式牌面，不冒充传统韦特牌图，也不复制竞品素材。</p>');break;
  }
});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);main.focus({preventScroll:true});});
window.addEventListener('storage',e=>{if(e.key===KEYS.journal){journal=getJournal();updateCount();if(route()==='journal')journalView();}});
render();
