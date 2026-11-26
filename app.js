/* =========================================================
 * 梦境手记 · 前端逻辑
 * 仅主动保存的梦境写入 localStorage；未保存的梦只存在当前页面内存中。
 * ========================================================= */

'use strict';

/* ---------- 解梦助手的人设与规则（系统提示词，不含任何密钥） ---------- */
const SYSTEM_PROMPT = `你是「梦境手记」的解梦助手，一位温和、严谨、善于提问的梦境记录与自我探索向导。你的任务是帮助用户理解梦境中的情绪、意象及其与现实生活的可能联系，而不是预测未来或断定吉凶。

基本原则：
1. 不把任何解释说成唯一答案或科学定论，使用"可能""或许""一种理解方式是"等措辞。
2. 不机械套用"梦境符号字典"。同一个意象对不同人可能有不同意义，优先考虑用户的个人经历、情绪和他们自己写下的联想。
3. 区分用户描述的梦境事实、用户补充的现实信息，与你的推测。不擅自补充梦里没有的情节。
4. 不根据梦境诊断心理疾病，不强行进行性、创伤或家庭关系方面的解读，不制造焦虑。
5. 解梦以自我探索和娱乐为目的，不作预言，不作为医疗或重大决策依据。如提到民俗说法，明确标注"民俗视角，仅供娱乐参考"。

解梦知识库（内化后用来提升解读质量，不要在回复中掉书袋、点名理论家或列出书目，除非用户主动询问）：
- 连续性假说：梦大体延续着清醒时的关注点和情绪，情绪卷入越深的事越容易被梦到；素材常来自1至2天前的"日间残留"，也有约5至7天前的"梦滞后"现象。解读时优先找梦与现实关注点之间的连续性。
- 反复出现的梦：一般指向现实中未解决的议题或持续的压力源，议题被处理或解决后往往自行减少。遇到重复主题，引导用户对比多个梦的共性，而不是解码单独一夜。
- 常见主题没有统一的"字典含义"：被追赶是最常见的梦（有威胁模拟理论解释），追赶者是谁因人而异，看用户当下在回避什么；掉牙梦研究发现它与夜间牙齿、牙颌紧绷（磨牙）有关的比例意外地高，未必有深层象征；坠落常与失控感相关。解释时优先围绕情绪感受，而非意象的固定含义。
- 弗洛伊德式自由联想：请用户对一个梦中元素说出想到的任何词、记忆、感受，联想链的另一端常连着被回避的事。梦中的画面会被压缩、置换、修饰，但情绪相对稳定真实，所以梦中情绪是解读最可靠的线索。
- 荣格式补偿与放大：梦有时呈现清醒时被忽略的一面；同一个意象可以同时有几种成立的理解；同一个主题在一系列梦里反复出现时更有信息量。做梦者本人是梦的最终解释者，你只是提供假设。
- 约80%的梦带有负面情绪，这属于常态，有研究者称之为"夜间治疗师"——梦帮忙演练和处理担忧。不要因为梦的内容吓人或阴暗就暗示用户"心理有问题"。
- 你可参考的经典：《梦的解析》（弗洛伊德）、《人及其象征》（荣格）、《内在工作》（罗伯特·约翰逊）、《当大脑做梦》（Zadra & Stickgold）。

工作流程：
1. 用户第一次描述梦境后，如果关键信息明显不足，先问最多3个最重要的问题（例如：梦中最强烈的情绪、梦中人物让TA联想到谁、最近的相关事件）。问题要具体、简短、编号列出。如果用户说"直接解读""跳过"或信息已经足够，就直接生成报告，不要再追问。
   【什么时候停止提问】不设固定轮数，以信息是否真的够了为准。判断"够了"的三条标准：①知道了这次梦里最强烈的情绪；②知道了梦里最关键的人物或意象，在用户自己的经历里大致指向谁、像什么；③知道了最近有没有与之相关的现实处境。这三条都有基本答案（哪怕很简单，比如"着急""我爸""在等结果"），就立刻停止提问、直接生成完整报告，不要再问。若其中某一条仍是空白，就只针对那一条再问，每轮最多2个问题，绝不重复已经问过或已经答过的问题；用户回答得含糊时，可以在报告里以"可能"的方式覆盖不确定的部分，而不是反复追问。用户说"直接解读""跳过""够了""继续写"，立刻生成报告。
   【重要】只要你向用户提问，就必须在所有问题之后附上一个选项块，用户会在界面上直接点选，不用打字。格式必须严格如下（不要包在代码块里，块内不要用其他标点）：
<<OPTIONS>>
问题一的简短问法|选项1|选项2|选项3
问题二的简短问法|选项1|选项2|选项3|说不清
<</OPTIONS>>
   每个问题给 2 至 4 个短选项，每个选项不超过 8 个字，选项要贴合该问题最可能出现的回答，问题数量与上面列出的问题一致。除追问之外，正常解读里绝对不要出现这个块。
2. 生成解读报告时，默认采用"简洁解读 + 折叠详细分析"，不要写成论文，严格遵守下面的顺序和标记：
   第一段不加标题，用2至4句话直接说出这个梦最值得注意的一点，以及它可能与什么感受或矛盾有关。不要复述整个梦，不要以"这个梦反映了"等空话开头，不要使用"梦境主线"之类的标题。
   然后输出：
**为什么这么理解**
（只列2条最重要的依据，每条1至2句。必须同时联系具体梦境细节与用户补充的情绪、联想或现实处境；不要罗列所有意象，不要讲抽象理论。）
**另一种可能**
（用1个短段落补充一种真正不同的理解，100字以内。可以考虑近期的记忆碎片、身体疲劳或压力等普通解释。没有足够依据时就坦承不确定，不为凑数强行解释。）
**留给你一个问题**
（只留1个问题。必须是开放的事实性问题，例如"最近发生了什么""当时和谁在一起""那件事之后你做了什么"——不能预设你的解读成立，不能把解读的结论塞进问题里（比如解读说"你可能在意别人的评价"，就不要问"你最近有没有听到让你在意的评价"）。检验标准：即使你的解读是错的，这个问题也应该照样能回答。不要写成作业，不要空泛地问"你怎么看"。）
## 详细分析
（此处之后再给详细内容，供页面默认折叠。只保留"情绪与冲突""关键意象""其他理解与不确定之处"三个三级标题。总长度控制在350至600字，不重复前面的原句，不堆砌理论，不强行给建议。）
3. 已经生成过报告后，用户追问、补充或否定时，默认只用80至250字自然回应，聚焦当前问题，不要重新输出整篇报告结构。被否定时不要坚持，结合新信息修正；只有用户明确要求"重新解读"或"重新生成报告"时，才重新按第2条结构输出。
4. 如果用户提到反复噩梦、长期失眠、明显影响生活，温和建议关注睡眠与心理状态，必要时寻求专业帮助，但不夸大一两次梦境的意义。

语言温暖、真诚、平静，详细但不堆砌，像一位值得信任的朋友在深夜里陪用户说话。全程使用中文。`;

const FOLK_PROMPT = `你是「梦境手记」的古代梦学文化向导。用户已经结束了梦境信息追问，现在主动选择「古人怎么说」视角。你的任务是介绍中国古代文献和民俗占梦传统可能怎样理解这个梦，而不是替用户算命。

绝对原则：
1. 这是历史文化与民俗参考，不是预言。不得说“将会”“预示你必定”“近期会倒霉/发财”等确定判断，不得给现实决策建议。
2. 只能使用随消息提供的【古代语料】中的原文、书名和说法。不得编造古文、书名、出处或梦书条目；没有直接相关的条目时，坦承“没有恰好对应的条文”，只用语料中的分类和方法作宽泛说明。凡放在引号内的古文必须逐字摘自语料，不得改字、补字或把白话概括伪装成原文；需要概括时不用引号。
3. 凶兆条文必须作为古代说法转述，并立即说明它不能预测现实；若语料中有互相矛盾的判词，应指出矛盾，而不是挑选一个当答案。
4. 不把心理学、现代医学和占梦混为一谈，不用古代条文诊断疾病。

首次生成总量约250至420字。不要固定标题，不要写成“古人怎么理解／这些说法为什么不一样／可以怎样带走”那种文献摘要，也不要逐条罗列资料。像一篇知乎高赞回答：有依据，但全程说人话。
- 开头直接用一两句给出最有意思、最破除常识的判断，别客套，别先复述整个梦。
- 中间用2至4个短段落围绕一条主线往下说。古文最多引2处，每处尽量只摘4至12个字，并在同一句话或下一句话立刻翻成白话，例如“有忧即梦其事”——说白了就是，心里一直放不下的事，夜里容易接着演。
- 历史故事直接用一两句白话讲清楚，不照搬大段原文；书名自然带出即可。必须让用户只看白话也能完全读懂。
- 结尾用一两句自然收束，可以落在“古人自己也没把梦当标准答案”或“能拿来照镜子，不能拿来算未来”，但不要喊口号，不要固定写免责声明。
- 少说“语料、条文、分类、文献、用户”等生硬词，不要反复出现“古人或许”“这只是一个分类”。可以偶尔用“有意思的是”“说白了”“先别急着……”，但不要油滑、不要标题党。

已经生成过民俗解读后，用户追问或补充时，默认只用80至220字自然回应，像接着聊天，不重复整篇结构；只有明确要求重新生成时才重新写一篇。全程中文，有文化感但不故弄玄虚。`;

const SCIENCE_PROMPT = `你是「梦境手记」的睡眠科学向导。用户已经结束了梦境信息追问，现在主动选择「科学解释」视角。你的任务是给出克制、易懂的普通解释，不把梦当成密码，也不重复心理象征分析。

基本原则：
1. 科学不能为单个梦给出唯一解释。区分相对可靠的现象（记忆加工、日间残留、情绪与梦境的关联、身体刺激进入梦境）与仍属假说的理论（威胁模拟、情绪调节等），使用“可能”“一种解释是”。
2. 只联系用户实际提供的梦境细节、情绪和近期处境，不虚构研究，不编造百分比、论文、作者或结论。
3. 常见梦没有统一科学含义。被追赶、坠落、掉牙、喊不出、跑不动等可从压力、记忆碎片、睡姿、磨牙、入睡抽动或 REM 期肌肉弛缓等角度考虑，但不要把任何一种说成确定原因。
4. 不作医疗或心理诊断，不因梦境内容阴暗就暗示有病，不给用药建议。

首次生成时采用以下简洁结构，总量约280至450字：
开头2至3句：直接说明从科学角度最值得知道的普通事实，不复述整个梦。
**这个梦可能怎样形成**
列2至3点，每点把一种睡眠或记忆机制与用户梦里的具体细节相连，不堆术语。
**哪些细节不必过度解释**
用1个短段落说明哪些情节可能只是随机拼接、身体感觉或近期信息碎片。
**什么时候值得留意**
用1个短段落说明偶尔做梦通常无需担心；若反复噩梦、长期影响白天状态、或出现明显异常睡眠行为，可考虑记录睡眠并咨询正规睡眠门诊。没有这些情况时，不要制造担忧。

已经生成过科学解释后，用户追问或补充时，默认只用80至250字回应，不重复整篇结构；只有明确要求重新生成时才重新采用上述结构。全程中文，清楚、温和、不吓唬人。`;

const PERSPECTIVES = {
  psychology: { label: '心理探索', icon: '🧠', prompt: SYSTEM_PROMPT },
  folk: { label: '古人怎么说', icon: '🏮', prompt: FOLK_PROMPT },
  science: { label: '科学解释', icon: '🌙', prompt: SCIENCE_PROMPT },
};
function perspectiveOf(m) { return (m && PERSPECTIVES[m.perspective]) ? m.perspective : 'psychology'; }

/* 民俗语料独立存放，只有用户主动选择「古人怎么说」时才检索并注入。 */
let FOLK_CORPUS = [];
const folkCorpusReady = fetch('folk-corpus.json?v=20261126i')
  .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
  .then(d => { FOLK_CORPUS = Array.isArray(d.entries) ? d.entries : []; })
  .catch(() => { FOLK_CORPUS = []; });

const WEEKLY_PROMPT = `你是「梦境手记」的回顾助手。用户会给你最近几天记录的若干个梦（含日期、情绪和片段）。
请生成一份温和的周小结，结构如下（Markdown 二级标题）：
## 这一周的情绪基调
## 反复出现的主题或意象
## 值得留意的变化
## 一个可以带着走的问题
要求：只基于给出的梦境内容归纳，不编造；这些只是个人记录里的规律，不是心理诊断；不预测未来；语言温暖简短，全程中文。`;

/* ---------- 数据层 ---------- */
const STORE_KEY = 'dreamJournal.v1';
const MOODS = ['平静', '开心', '温暖', '兴奋', '困惑', '焦虑', '害怕', '委屈', '悲伤', '羞耻'];
const CLARITIES = ['清晰', '模糊', '只记得片段'];

function loadData() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d.dreams)) return d;
    }
  } catch (e) { /* 数据损坏时重置 */ }
  return { dreams: [], weeklyCache: null };
}
function saveData() { localStorage.setItem(STORE_KEY, JSON.stringify(state.data)); }

const state = {
  data: loadData(),          // 只有主动保存的梦
  sessionDreams: [],         // 直接解读的梦：仅本次打开期间存在
  view: 'home',
  activeDreamId: null,
  sending: false,
  editingId: null,
};

function findDream(id) {
  return state.sessionDreams.find(d => d.id === id) || state.data.dreams.find(d => d.id === id) || null;
}
function isDreamSaved(dream) {
  return !!dream && state.data.dreams.some(d => d.id === dream.id);
}

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function fmtDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fmtTime(ts) {
  const d = new Date(ts);
  return `${fmtDate(ts)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- 极简 Markdown 渲染（仅用于 AI 消息） ---------- */
function inlineMd(s) {
  return s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}
function renderMarkdown(src) {
  const lines = escapeHtml(src).split('\n');
  let html = '', listOpen = null;
  const closeList = () => { if (listOpen) { html += `</${listOpen}>`; listOpen = null; } };
  for (const raw of lines) {
    const t = raw.trim();
    let m;
    if ((m = t.match(/^(#{1,4})\s+(.*)/))) {
      closeList();
      const lv = Math.min(m[1].length + 1, 4);
      html += `<h${lv}>${inlineMd(m[2])}</h${lv}>`;
    } else if ((m = t.match(/^[-•*]\s+(.*)/))) {
      if (listOpen !== 'ul') { closeList(); html += '<ul>'; listOpen = 'ul'; }
      html += `<li>${inlineMd(m[1])}</li>`;
    } else if ((m = t.match(/^\d+[.、)]\s*(.*)/))) {
      if (listOpen !== 'ol') { closeList(); html += '<ol>'; listOpen = 'ol'; }
      html += `<li>${inlineMd(m[1])}</li>`;
    } else if (t === '') {
      closeList();
    } else {
      closeList();
      html += `<p>${inlineMd(t)}</p>`;
    }
  }
  closeList();
  return html;
}

/* ---------- 提示与弹窗 ---------- */
let toastTimer = null;
function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
}
function confirmModal(text) {
  return new Promise(resolve => {
    $('#modal-text').textContent = text;
    $('#modal').hidden = false;
    const done = (v) => {
      $('#modal').hidden = true;
      $('#modal-ok').onclick = $('#modal-cancel').onclick = null;
      resolve(v);
    };
    $('#modal-ok').onclick = () => done(true);
    $('#modal-cancel').onclick = () => done(false);
  });
}

/* ---------- 视图切换 ---------- */
function showView(name) {
  state.view = name;
  $$('.view').forEach(v => { v.hidden = v.id !== 'view-' + name; });
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === name));
  window.scrollTo({ top: 0 });
  if (name === 'home') renderHome();
  if (name === 'archive') renderArchive();
  if (name === 'insights') renderInsights();
  if (name === 'chat') renderChat();
}
$$('.tab').forEach(t => t.addEventListener('click', () => showView(t.dataset.view)));
$$('[data-go]').forEach(b => b.addEventListener('click', () => showView(b.dataset.go)));

/* ---------- 记梦页 ---------- */
const pickedMoods = new Set();
let pickedClarity = '';

function renderChips() {
  $('#f-moods').innerHTML = MOODS.map(m =>
    `<button type="button" class="chip ${pickedMoods.has(m) ? 'on' : ''}" data-mood="${m}">${m}</button>`).join('');
  $$('#f-moods .chip').forEach(c => c.addEventListener('click', () => {
    const m = c.dataset.mood;
    pickedMoods.has(m) ? pickedMoods.delete(m) : pickedMoods.add(m);
    c.classList.toggle('on');
  }));
  $('#f-clarity').innerHTML = CLARITIES.map(c =>
    `<button type="button" class="chip ${pickedClarity === c ? 'on' : ''}" data-c="${c}">${c}</button>`).join('');
  $$('#f-clarity .chip').forEach(c => c.addEventListener('click', () => {
    pickedClarity = pickedClarity === c.dataset.c ? '' : c.dataset.c;
    renderChips();
  }));
}

function renderGreeting() {
  const h = new Date().getHours();
  let g;
  if (h >= 5 && h < 9) g = '早上好，还记得昨晚的梦吗？';
  else if (h >= 9 && h < 12) g = '上午好，把夜里没散尽的梦记下来吧';
  else if (h >= 12 && h < 18) g = '下午好，也可以补记一个旧梦';
  else if (h >= 18 && h < 23) g = '晚上好，今晚也留意自己的梦';
  else g = '夜深了，做完梦记得回来 🌙';
  $('#greeting').textContent = g;
}

function renderHome() {
  renderGreeting();
}

function dreamItemHtml(d) {
  const excerpt = escapeHtml(d.content.slice(0, 60));
  const moods = (d.moods || []).map(m => `<span class="badge">${escapeHtml(m)}</span>`).join('');
  const done = d.messages && d.messages.some(m => m.role === 'assistant');
  return `<div class="dream-item" data-id="${d.id}">
    <div class="dream-item-head">
      <span class="dream-item-title">${escapeHtml(d.title || '未命名的梦')}</span>
      <span class="dream-item-date">${fmtDate(d.createdAt)}</span>
    </div>
    <div class="dream-item-excerpt">${excerpt}…</div>
    <div class="dream-item-foot">${moods}${done ? '<span class="badge done">已解读</span>' : ''}</div>
  </div>`;
}
function bindDreamItems(container) {
  container.querySelectorAll('.dream-item').forEach(el => {
    el.addEventListener('click', () => openDreamDetail(el.dataset.id));
  });
}

function collectForm() {
  const content = $('#f-content').value.trim();
  if (!content) { toast('先写一点梦的内容吧'); return null; }
  const tags = $('#f-tags').value.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
  return {
    title: $('#f-title').value.trim(),
    content,
    moods: [...pickedMoods],
    clarity: pickedClarity,
    tags,
    associations: $('#f-assoc').value.trim(),
    preSleep: $('#f-presleep').value.trim(),
  };
}
function resetForm() {
  $('#f-title').value = ''; $('#f-content').value = '';
  $('#f-tags').value = ''; $('#f-assoc').value = ''; $('#f-presleep').value = '';
  pickedMoods.clear(); pickedClarity = '';
  renderChips();
}

function saveDream(startChat) {
  const f = collectForm();
  if (!f) return;
  if (state.editingId) {
    const d = state.data.dreams.find(x => x.id === state.editingId);
    if (d) Object.assign(d, f);
    state.editingId = null;
    $('#btn-save-chat').textContent = '开始解读';
    $('#btn-save').textContent = '保存到档案';
    toast('修改已保存');
    saveData(); resetForm();
    if (startChat && d) { state.activeDreamId = d.id; showView('chat'); }
    else showView('archive');
    return;
  }
  const dream = { id: uid(), createdAt: Date.now(), messages: [], ...f };
  resetForm();
  if (startChat) {
    /* 默认不保存：新梦只进入内存，刷新或关闭页面后即消失。 */
    state.sessionDreams.push(dream);
    state.activeDreamId = dream.id;
    showView('chat');
    startInterpretation(dream, 'ask');
  } else {
    /* 只有用户主动点「保存到档案」才写入 localStorage。 */
    state.data.dreams.push(dream);
    saveData();
    renderHome();
    toast('已保存到档案，可在「我的」里查看');
  }
}
$('#btn-save').addEventListener('click', () => saveDream(false));
$('#btn-save-chat').addEventListener('click', () => saveDream(true));

/* ---------- 语音输入 ---------- */
(function initVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = $('#btn-voice');
  if (!SR) { btn.hidden = true; return; }
  btn.hidden = false;
  let rec = null, on = false;
  btn.addEventListener('click', () => {
    if (on) { rec.stop(); return; }
    rec = new SR();
    rec.lang = 'zh-CN';
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e) => {
      let text = '';
      for (const r of e.results) text += r[0].transcript;
      if (text) $('#f-content').value = text;
    };
    rec.onend = () => { on = false; btn.classList.remove('recording'); };
    rec.onerror = () => { on = false; btn.classList.remove('recording'); toast('语音不可用，试试手动输入'); };
    rec.start();
    on = true; btn.classList.add('recording');
    toast('正在聆听，说吧……');
  });
})();

/* ---------- 解读对话 ---------- */
function getActiveDream() {
  return findDream(state.activeDreamId);
}

function buildInitialMessages(dream, mode) {
  const meta = [];
  if (dream.moods && dream.moods.length) meta.push(`梦里/醒来时的情绪：${dream.moods.join('、')}`);
  if (dream.clarity) meta.push(`记忆清晰度：${dream.clarity}`);
  if (dream.tags && dream.tags.length) meta.push(`我打的标签：${dream.tags.join('、')}`);
  if (dream.associations) meta.push(`我的个人联想：${dream.associations}`);
  if (dream.preSleep) meta.push(`睡前/最近在想：${dream.preSleep}`);
  const text = `我记录了一个梦：\n\n【梦的内容】\n${dream.content}\n\n` +
    (meta.length ? `【补充信息】\n${meta.join('\n')}\n\n` : '') +
    (mode === 'direct'
      ? '请直接为我生成详细的解梦报告。'
      : '请先判断信息是否足够：如果还缺关键信息，先问我最多3个最重要的问题；如果已经足够，就开始生成详细解读。');
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: text },
  ];
}

function isControlText(content) {
  const t = (content || '').trim();
  return t.length < 240 && /^(?:信息够了|跳过追问|够了[，,]?直接|请换一个角度重新解读|请从「|请直接生成完整解读|直接生成完整解读)/.test(t);
}

/* 不同视角共享的只有原始梦境与用户亲口补充的事实，不共享其他 AI 的结论。 */
function buildDreamBrief(dream, excludePerspective) {
  const meta = [];
  if (dream.moods && dream.moods.length) meta.push(`梦里/醒来时的情绪：${dream.moods.join('、')}`);
  if (dream.clarity) meta.push(`记忆清晰度：${dream.clarity}`);
  if (dream.tags && dream.tags.length) meta.push(`我打的标签：${dream.tags.join('、')}`);
  if (dream.associations) meta.push(`我的个人联想：${dream.associations}`);
  if (dream.preSleep) meta.push(`睡前/最近在想：${dream.preSleep}`);
  const supplements = (dream.messages || [])
    .filter(m => m.role === 'user' && !m.pending && !m.command && perspectiveOf(m) !== excludePerspective)
    .map(m => (m.content || '').trim())
    .filter(t => t && !t.startsWith('我记录了一个梦：') && !isControlText(t));
  return `【梦的内容】\n${dream.content}\n\n` +
    (meta.length ? `【原始补充】\n${meta.join('\n')}\n\n` : '') +
    (supplements.length ? `【我后来补充的事实与感受】\n${supplements.join('\n')}\n\n` : '');
}

function retrieveFolkEntries(dream) {
  if (!FOLK_CORPUS.length) return [];
  const text = buildDreamBrief(dream);
  const safetyIds = ['qianfulun-individual-difference', 'qianfulun-dont-overtrust'];
  const genericTags = new Set(['梦象', '动作', '分类', '原则', '方法', '成因', '态度', '总纲', '文献', '现代阐释', '健康', '身体', '个体差异', '反省', '理性', '安慰']);
  const scored = FOLK_CORPUS.filter(e => !safetyIds.includes(e.id)).map(e => {
    let score = 0;
    (e.tags || []).filter(tag => !genericTags.has(tag)).forEach(tag => {
      if (tag && text.includes(tag)) score += tag.length === 1 ? 3 : 7;
    });
    return { entry: e, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  let chosen = scored.slice(0, 2).map(x => x.entry);
  if (!chosen.length) {
    chosen = FOLK_CORPUS.filter(e => ['liezi-dream-cause', 'qianfulun-thought-dream'].includes(e.id));
  } else if (chosen.length < 2) {
    const filler = FOLK_CORPUS.find(e => ['liezi-dream-cause', 'qianfulun-thought-dream'].includes(e.id) && !chosen.some(x => x.id === e.id));
    if (filler) chosen.push(filler);
  }
  safetyIds.forEach(id => {
    const item = FOLK_CORPUS.find(e => e.id === id);
    if (item && !chosen.some(e => e.id === id)) chosen.push(item);
  });
  return chosen.slice(0, 4);
}

function folkContext(entries) {
  if (!entries.length) return '';
  return '【古代语料：具体古文和出处只能使用以下内容】\n' + entries.map((e, i) =>
    `${i + 1}. ${e.title}\n来源：${e.source.work}（${e.source.era}）\n原文/研究表述：${e.quote}\n白话：${e.paraphrase}\n使用提醒：${e.note}`
  ).join('\n\n') + '\n\n';
}

function buildIndependentHistory(dream, perspective) {
  const entries = perspective === 'folk' ? retrieveFolkEntries(dream) : [];
  const instruction = `追问已经结束。请从「${PERSPECTIVES[perspective].label}」视角独立生成一篇解读：只依据上面的梦境和我补充的事实，不沿用、不复述任何其他视角的 AI 结论。`;
  return [
    { role: 'system', content: PERSPECTIVES[perspective].prompt },
    { role: 'user', content: buildDreamBrief(dream) + folkContext(entries) + instruction },
  ];
}

function buildPerspectiveHistory(dream, perspective, independent) {
  if (independent) return buildIndependentHistory(dream, perspective);
  if (perspective === 'psychology') {
    return [{ role: 'system', content: SYSTEM_PROMPT }].concat(
      dream.messages.filter(m => !m.pending && perspectiveOf(m) === 'psychology')
        .map(m => ({ role: m.role, content: m.content }))
    );
  }
  const entries = perspective === 'folk' ? retrieveFolkEntries(dream) : [];
  const history = [
    { role: 'system', content: PERSPECTIVES[perspective].prompt },
    { role: 'user', content: buildDreamBrief(dream, perspective) + folkContext(entries) +
      `以下是「${PERSPECTIVES[perspective].label}」视角的已有对话，请只衔接这一视角，回答我最新的补充，不要带入其他视角的 AI 结论。` },
  ];
  dream.messages.filter(m => !m.pending && perspectiveOf(m) === perspective)
    .forEach(m => history.push({ role: m.role, content: m.content }));
  return history;
}

/* ---------- 模型调用：优先浏览器直连，其次服务器代理 ---------- */
const DIRECT_API = 'https://api.deepseek.com/chat/completions';
const KEY_STORE = 'dreamJournal.apiKey';

function loadApiKey() {
  try { return (localStorage.getItem(KEY_STORE) || '').trim(); } catch (e) { return ''; }
}
function saveApiKey(v) {
  try { localStorage.setItem(KEY_STORE, (v || '').trim()); } catch (e) { /* 忽略 */ }
}

/* 逐块读取 SSE 流，返回完整文本 */
async function readStream(resp, onDelta) {
  const reader = resp.body.getReader();
  const dec = new TextDecoder('utf-8');
  let buf = '', full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const evt = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of evt.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const j = JSON.parse(data);
          const delta = j.choices?.[0]?.delta?.content || '';
          if (delta) { full += delta; onDelta(delta, full); }
        } catch (e) { /* 忽略不完整分片 */ }
      }
    }
  }
  return full;
}

function friendlyHttpError(status, detail) {
  if (status === 401) return '密钥无效或已过期（401），请到「我的」页重新填一次';
  if (status === 402) return 'DeepSeek 账户余额不足（402）';
  if (status === 429) return '请求太频繁了，等半分钟再试（429）';
  if (status >= 500) return '模型服务暂时不稳定（' + status + '），稍后再试';
  return detail || ('HTTP ' + status);
}

/* 直连 DeepSeek（不需要服务器） */
async function callDirect(messages, onDelta, apiKey) {
  const resp = await fetch(DIRECT_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
    body: JSON.stringify({ model: 'deepseek-chat', messages, stream: true, temperature: 0.9, max_tokens: 2400 }),
  });
  if (!resp.ok) {
    let detail = '';
    try { const j = await resp.json(); detail = j.error?.message || ''; } catch (e) { /* 忽略 */ }
    throw new Error(friendlyHttpError(resp.status, detail));
  }
  return readStream(resp, onDelta);
}

/* 走本机/自建服务器代理 */
async function callProxy(messages, onDelta) {
  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, stream: true }),
  });
  if (!resp.ok) {
    let msg = '';
    try { const j = await resp.json(); msg = j.error?.message || j.error || ''; } catch (e) { /* 忽略 */ }
    if (resp.status === 404) throw new Error('还没有配置 AI 密钥：请打开「我的」页填入密钥后重试');
    throw new Error(friendlyHttpError(resp.status, msg) || ('HTTP ' + resp.status));
  }
  return readStream(resp, onDelta);
}

async function callAI(messages, onDelta) {
  const key = loadApiKey();
  if (key) return callDirect(messages, onDelta, key);
  return callProxy(messages, onDelta);
}

function startInterpretation(dream, mode) {
  if (!dream.messages) dream.messages = [];
  if (dream.messages.length > 0) { renderChat(); return; }
  const msgs = buildInitialMessages(dream, mode);
  dream.messages.push({ role: 'user', content: msgs[1].content, ts: Date.now(), perspective: 'psychology' });
  saveData();
  renderChat();
  runAssistant(dream, { perspective: 'psychology' });
}

async function runAssistant(dream, options = {}) {
  if (state.sending) return;
  const perspective = options.perspective || perspectiveOf(dream.messages[dream.messages.length - 1]);
  let sources = [];
  state.sending = true;
  updateSendBtn();
  const placeholder = { role: 'assistant', content: '', ts: Date.now(), pending: true, perspective, sources };
  if (options.report || options.independent) placeholder.report = true;
  dream.messages.push(placeholder);
  renderChatMessages(dream);
  try {
    if (perspective === 'folk') {
      await folkCorpusReady;
      if (!FOLK_CORPUS.length) throw new Error('古代语料库还没有加载成功，请检查网络后刷新再试');
      sources = retrieveFolkEntries(dream)
        .map(e => ({ title: e.source.work, url: e.source.url }))
        .filter((s, i, arr) => arr.findIndex(x => x.url === s.url) === i);
      placeholder.sources = sources;
    }
    const history = buildPerspectiveHistory(dream, perspective, !!options.independent);
    const full = await callAI(history, (_d, acc) => {
      placeholder.content = acc;
      renderChatMessages(dream, true);
    });
    placeholder.content = full || '（没有收到回复，请再试一次）';
  } catch (err) {
    const reason = !navigator.onLine ? '当前离线。旧档案仍可查看，生成解读需要联网。' : err.message;
    placeholder.content = `这次解读没有成功：${reason}\n\n可以稍后再试，或在「我的 → 连接状态」里检查 AI 连接。`;
    placeholder.error = true;
  }
  delete placeholder.pending;
  state.sending = false;
  saveData();
  renderChatMessages(dream);
  updateSendBtn();
}

function updateSendBtn() {
  const btn = $('#btn-send');
  btn.disabled = state.sending;
  btn.textContent = state.sending ? '解读中…' : '发送';
}

function perspectiveBadgeHtml(m) {
  const p = perspectiveOf(m);
  if (p === 'psychology' && !isReportMessage(m)) return '';
  const meta = PERSPECTIVES[p];
  return `<div class="perspective-badge ${p}">${meta.icon} ${meta.label}</div>`;
}

function sourcesHtml(m) {
  if (m.pending || !m.sources || !m.sources.length) return '';
  return `<div class="report-sources">语料出处：${m.sources.map((s, i) =>
    `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.title)}${i < m.sources.length - 1 ? ' · ' : ''}</a>`
  ).join('')}</div>`;
}

function perspectiveSwitchHtml(m, idx) {
  if (!isReportMessage(m) || m.pending || m.error) return '';
  const current = perspectiveOf(m);
  return `<div class="perspective-switch"><span>换个视角</span><div class="perspective-options">${Object.entries(PERSPECTIVES).map(([key, meta]) => {
    const active = key === current;
    return `<button type="button" class="perspective-btn ${active ? 'active' : ''}" data-perspective="${key}" data-idx="${idx}" ${active ? 'disabled aria-pressed="true"' : 'aria-pressed="false"'}>${meta.icon} ${meta.label}</button>`;
  }).join('')}</div></div>`;
}

function msgActionsHtml(dream, m, idx) {
  if (m.role !== 'assistant' || m.pending || m.error) return '';
  const fb = m.feedback;
  const isLast = idx === dream.messages.length - 1;
  const copyBtn = isReportMessage(m)
    ? `<button class="fb-btn" data-copy="${idx}">📋 复制这篇解读</button>` : '';
  return sourcesHtml(m) + perspectiveSwitchHtml(m, idx) + `<div class="msg-actions">
    ${copyBtn}
    <button class="fb-btn ${fb === 'resonant' ? 'on' : ''}" data-fb="resonant" data-idx="${idx}">😊 有共鸣</button>
    <button class="fb-btn ${fb === 'unsure' ? 'on' : ''}" data-fb="unsure" data-idx="${idx}">🤔 不确定</button>
    <button class="fb-btn ${fb === 'notme' ? 'on' : ''}" data-fb="notme" data-idx="${idx}">🙅 不太像我</button>
    ${isLast ? `<button class="fb-btn" data-regen="1">🔁 换个角度重新解读</button>` : ''}
  </div>` + (fb ? `<div class="msg-feedback-note">${fb === 'resonant' ? '已记下：这个方向有共鸣。' : fb === 'unsure' ? '已记下：先保留这个可能性。' : '已记下：下次解读会参考你的否定。'}</div>` : '');
}

/* ---------- 追问选项块：<<OPTIONS>> 问题|选项|选项 <<OPTIONS>> ---------- */
const OPT_BLOCK_RE = /<<OPTIONS>>([\s\S]*?)<<\/OPTIONS>>/;

function splitOptions(content) {
  content = content || '';
  const m = OPT_BLOCK_RE.exec(content);
  if (m) {
    const options = m[1].split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const parts = line.split('|').map(s => s.trim()).filter(Boolean);
      if (parts.length < 2) return null;
      return { q: parts[0], opts: parts.slice(1) };
    }).filter(Boolean);
    return { text: content.replace(OPT_BLOCK_RE, '').trim(), options };
  }
  /* 流式输出时块还没写完，先把它藏起来，避免露出半截标签 */
  const idx = content.indexOf('<<OPTIONS>>');
  if (idx >= 0) content = content.slice(0, idx);
  return { text: content.trim(), options: [] };
}

function optionsHtml(options, idx, text, pending) {
  if (pending) return '';
  const groups = options.map(g => `
    <div class="opt-group">
      <p class="opt-q">${escapeHtml(g.q)}</p>
      <div class="opt-chips">${g.opts.map(o =>
        `<button class="opt-chip" type="button" data-q="${escapeHtml(g.q)}" data-v="${escapeHtml(o)}">${escapeHtml(o)}</button>`
      ).join('')}</div>
    </div>`).join('');
  /* 没有选项块、但看起来是在追问（短消息且带问号）时，也给一个跳过入口 */
  const guessedAsk = !options.length && text.length < 420 && /[？?]/.test(text);
  if (!options.length && !guessedAsk) return '';
  return `<div class="opt-panel">
    ${groups}
    <button class="opt-skip" type="button">跳过追问，直接解读 →</button>
  </div>`;
}

/* ---------- 复制解读：只取最新那篇报告正文 ---------- */
function mdToPlain(md) {
  return md
    .replace(/<<OPTIONS>>[\s\S]*?<<\/OPTIONS>>/g, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '· ')
    .replace(/^\s*\d+\.\s+/gm, (s) => s.replace(/^\s*/, ''))
    .replace(/`{1,3}/g, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* 将默认展示的简洁解读与可折叠的详细分析分开 */
const DETAIL_HEADING_RE = /^##\s*(?:详细分析|更多细节)\s*$/m;

function splitReportDetails(content) {
  const text = content || '';
  const m = DETAIL_HEADING_RE.exec(text);
  if (!m) return { main: text, details: '' };
  return {
    main: text.slice(0, m.index).trim(),
    details: text.slice(m.index + m[0].length).trim(),
  };
}

function interpretationHtml(content) {
  const sections = splitReportDetails(content);
  let html = renderMarkdown(sections.main);
  if (sections.details) {
    html += `<details class="analysis-details"><summary><span class="summary-closed">展开更多细节</span><span class="summary-open">收起详细分析</span></summary><div class="analysis-detail-body">${renderMarkdown(sections.details)}</div></details>`;
  }
  return html;
}

/* 是否是一篇完整报告（含 Markdown 小标题） */
function isReport(content) {
  const t = (content || '');
  return DETAIL_HEADING_RE.test(t) ||
    (/^##\s/m.test(t) && /梦境主线|情绪脉络|核心意象/.test(t)) ||
    /\*\*(?:古人怎么理解|这些说法为什么不一样|这个梦可能怎样形成|哪些细节不必过度解释)\*\*/.test(t);
}

function isReportMessage(m) {
  return !!m && (m.report === true || isReport(m.content));
}

/* 新版只复制第一屏的简洁解读；旧版仍从第一个小标题开始复制 */
function reportText(content) {
  const body = splitOptions(content).text;
  const sections = splitReportDetails(body);
  if (sections.details) return mdToPlain(sections.main);
  const at = body.search(/^##\s/m);
  return mdToPlain(at >= 0 ? body.slice(at) : body);
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { /* 落到下面的兜底 */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch (e) {
    return false;
  }
}

function renderChatMessages(dream, keepScroll) {
  const box = $('#chat-messages');
  const winY = window.scrollY || window.pageYOffset || 0;
  box.innerHTML = dream.messages.map((m, i) => {
    if (m.role === 'system') return '';
    if (m.role === 'user') {
      return `<div class="msg user">${escapeHtml(m.content)}</div>`;
    }
    const parts = splitOptions(m.content);
    const isLast = i === dream.messages.length - 1;
    const body = m.pending && !m.content
      ? '<p class="typing">正在读你的梦 ……</p>'
      : interpretationHtml(parts.text) + (m.pending ? '<p class="typing">▍</p>' : '') +
        optionsHtml(parts.options, i, parts.text, m.pending || !isLast);
    return `<div class="msg assistant ${perspectiveOf(m)}">${perspectiveBadgeHtml(m)}${body}${msgActionsHtml(dream, m, i)}</div>`;
  }).join('');
  box.querySelectorAll('[data-perspective]').forEach(b => b.addEventListener('click', () => {
    switchPerspective(dream, Number(b.dataset.idx), b.dataset.perspective);
  }));
  box.querySelectorAll('[data-fb]').forEach(b => b.addEventListener('click', () => {
    const m = dream.messages[Number(b.dataset.idx)];
    if (!m) return;
    m.feedback = m.feedback === b.dataset.fb ? null : b.dataset.fb;
    saveData();
    renderChatMessages(dream, true);
  }));
  box.querySelectorAll('[data-regen]').forEach(b => b.addEventListener('click', () => regenerate(dream)));
  box.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    const m = dream.messages[Number(b.dataset.copy)];
    if (!m) return;
    const ok = await copyText(reportText(m.content));
    toast(ok ? '已复制，可以直接粘贴' : '复制失败，请长按文字手动复制');
    if (ok) {
      const old = b.textContent;
      b.textContent = '✓ 已复制';
      setTimeout(() => { b.textContent = old; }, 1600);
    }
  }));
  box.querySelectorAll('.opt-chip').forEach(chip => chip.addEventListener('click', () => {
    appendAnswer(chip.dataset.q, chip.dataset.v, chip);
  }));
  const rp = $('#btn-report');
  if (rp && !rp._bound) {
    rp._bound = true;
    rp.addEventListener('click', () => {
      if (state.sending) return;
      $('#chat-input').value = '信息够了，请直接生成完整解读报告，不要再提问。';
      sendUserMessage();
    });
  }
  box.querySelectorAll('.opt-skip').forEach(b => b.addEventListener('click', () => {
    if (state.sending) return;
    $('#chat-input').value = '跳过追问，直接解读吧';
    sendUserMessage();
  }));
  renderRecordActions(dream);
  if (keepScroll) {
    /* 点按钮这类局部刷新：页面停在原处，不往回跳 */
    window.scrollTo({ top: winY, behavior: 'auto' });
  } else {
    /* 发了新消息/开始解读：滚到最新一条，而不是页顶 */
    const last = box.lastElementChild;
    if (last && last.scrollIntoView) last.scrollIntoView({ block: 'end', behavior: 'auto' });
  }
}

function switchPerspective(dream, idx, perspective) {
  if (state.sending || !PERSPECTIVES[perspective]) return;
  const source = dream.messages[idx];
  if (!source) return;
  if (perspectiveOf(source) === perspective) {
    toast(`这篇已经是「${PERSPECTIVES[perspective].label}」`);
    return;
  }
  dream.messages.push({
    role: 'user',
    content: `请从「${PERSPECTIVES[perspective].label}」独立解读这个梦，不要沿用其他视角的 AI 结论。`,
    ts: Date.now(),
    command: true,
    perspective,
  });
  saveData();
  renderChatMessages(dream);
  runAssistant(dream, { perspective, independent: true });
}

function regenerate(dream) {
  if (state.sending) return;
  const perspective = perspectiveOf(dream.messages[dream.messages.length - 1]);
  dream.messages.push({
    role: 'user',
    content: `请换一个角度，从「${PERSPECTIVES[perspective].label}」视角重新解读这个梦：给出与之前不同的可能性，保持这一视角的报告结构，并参考我补充过的信息。`,
    ts: Date.now(),
    command: true,
    perspective,
  });
  saveData();
  renderChatMessages(dream);
  runAssistant(dream, { perspective, report: true });
}

function renderRecordActions(dream) {
  const bar = $('#chat-record-actions');
  if (!bar) return;
  if (!dream) { bar.hidden = true; return; }
  const saved = isDreamSaved(dream);
  bar.hidden = false;
  $('#record-save-state').textContent = saved
    ? '已保存 · 可在「我的 → 梦境档案」里找到'
    : '未保存 · 刷新或关闭页面后就会消失';
  const saveBtn = $('#btn-archive-active');
  saveBtn.hidden = saved;
  saveBtn.disabled = state.sending;
  $('#btn-delete-active').disabled = state.sending;
}

$('#btn-archive-active').addEventListener('click', () => {
  const dream = getActiveDream();
  if (!dream || state.sending || isDreamSaved(dream)) return;
  state.sessionDreams = state.sessionDreams.filter(d => d.id !== dream.id);
  state.data.dreams.push(dream);
  saveData();
  renderRecordActions(dream);
  toast('已保存到档案，可在「我的」里查看');
});

$('#btn-delete-active').addEventListener('click', async () => {
  const dream = getActiveDream();
  if (!dream || state.sending) return;
  const ok = await confirmModal('确定删除这个梦和它的全部解读吗？删除后无法恢复。');
  if (!ok) return;
  const saved = isDreamSaved(dream);
  state.sessionDreams = state.sessionDreams.filter(d => d.id !== dream.id);
  if (saved) {
    state.data.dreams = state.data.dreams.filter(d => d.id !== dream.id);
    saveData();
  }
  if (detailId === dream.id) closeDetail();
  if (state.editingId === dream.id) state.editingId = null;
  state.activeDreamId = null;
  $('#chat-input').value = '';
  showView('chat');
  toast('已删除，没有留下档案');
});

function renderChat() {
  const dream = getActiveDream();
  const empty = $('#chat-empty'), main = $('#chat-main');
  if (!dream) {
    empty.hidden = false; main.hidden = true;
    renderRecordActions(null);
    const undiscussed = [...state.data.dreams].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
    $('#chat-pick').innerHTML = undiscussed.length
      ? undiscussed.map(dreamItemHtml).join('')
      : '';
    $('#chat-pick').querySelectorAll('.dream-item').forEach(el => {
      el.addEventListener('click', () => {
        state.activeDreamId = el.dataset.id;
        const d = getActiveDream();
        renderChat();
        if (d && (!d.messages || d.messages.length === 0)) startInterpretation(d, 'ask');
      });
    });
    return;
  }
  empty.hidden = true; main.hidden = false;
  const moods = (dream.moods || []).map(m => `<span class="badge">${escapeHtml(m)}</span>`).join('');
  $('#dream-context').innerHTML =
    `<strong>${escapeHtml(dream.title || '未命名的梦')}</strong>` +
    `${fmtTime(dream.createdAt)}${dream.clarity ? ' · ' + escapeHtml(dream.clarity) : ''}` +
    (moods ? `<div class="ctx-moods">${moods}</div>` : '');
  renderChatMessages(dream);
  if (dream.messages && dream.messages.length === 0) startInterpretation(dream, 'ask');
}

$('#btn-send').addEventListener('click', sendUserMessage);
$('#chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendUserMessage(); }
});
function appendAnswer(q, v, chip) {
  if (state.sending) return;
  const inp = $('#chat-input');
  const prefix = q + '：';
  const cur = (inp.value || '').trim();
  const lines = cur ? cur.split('\n').filter(l => l.trim() && !l.startsWith(prefix)) : [];
  lines.push(prefix + v);
  inp.value = lines.join('\n');
  try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); }
  chip.classList.add('picked');
}

function sendUserMessage() {
  const dream = getActiveDream();
  if (!dream || state.sending) return;
  const text = $('#chat-input').value.trim();
  if (!text) return;
  const perspective = perspectiveOf(dream.messages[dream.messages.length - 1]);
  $('#chat-input').value = '';
  dream.messages.push({ role: 'user', content: text, ts: Date.now(), perspective });
  saveData();
  renderChatMessages(dream);
  runAssistant(dream, { perspective });
}

/* ---------- 档案 ---------- */
let detailId = null;

function renderArchive() {
  const q = ($('#archive-search').value || '').trim().toLowerCase();
  let list = [...state.data.dreams].sort((a, b) => b.createdAt - a.createdAt);
  if (q) {
    list = list.filter(d =>
      (d.title || '').toLowerCase().includes(q) ||
      d.content.toLowerCase().includes(q) ||
      (d.tags || []).some(t => t.toLowerCase().includes(q)) ||
      (d.moods || []).some(m => m.includes(q)));
  }
  $('#archive-list').innerHTML = list.length
    ? list.map(dreamItemHtml).join('')
    : `<div class="card empty-card"><p class="empty-icon">🗂️</p><p>${q ? '没有找到匹配的梦。' : '档案还是空的。'}</p></div>`;
  bindDreamItems($('#archive-list'));
  if (detailId && !state.data.dreams.find(d => d.id === detailId)) closeDetail();
}
$('#archive-search').addEventListener('input', renderArchive);

function openDreamDetail(id) {
  const d = state.data.dreams.find(x => x.id === id);
  if (!d) return;
  detailId = id;
  $('#dream-detail').hidden = false;
  $('#detail-title').textContent = d.title || '未命名的梦';
  const bits = [fmtTime(d.createdAt)];
  if (d.clarity) bits.push(d.clarity);
  (d.moods || []).forEach(m => bits.push('情绪：' + m));
  (d.tags || []).forEach(t => bits.push('#' + t));
  $('#detail-meta').innerHTML = bits.map(escapeHtml).join(' · ');
  $('#detail-content').textContent = d.content;
  const extra = [];
  if (d.associations) extra.push('个人联想：' + d.associations);
  if (d.preSleep) extra.push('睡前在想：' + d.preSleep);
  $('#detail-assoc').textContent = extra.join('\n');
  const msgs = (d.messages || []).filter(m => m.role === 'assistant' && !m.pending);
  $('#detail-messages').innerHTML = msgs.length
    ? msgs.map((m, i) => {
        const parts = splitOptions(m.content);
        const meta = PERSPECTIVES[perspectiveOf(m)];
        const copy = isReportMessage(m) ? `<button class="dm-copy" type="button" data-dmi="${i}">复制</button>` : '';
        return `<div class="dm"><div class="dm-role"><span>${meta.icon} ${meta.label} · 解读 ${i + 1}${m.feedback ? ' · ' + ({ resonant: '有共鸣', unsure: '不确定', notme: '不太像我' }[m.feedback] || '') : ''}</span>${copy}</div>${interpretationHtml(parts.text)}${sourcesHtml(m)}</div>`;
      }).join('')
    : '<p class="empty-sub">还没有解读记录。</p>';
  $('#detail-messages').querySelectorAll('[data-dmi]').forEach(btn => btn.addEventListener('click', async () => {
    const m = msgs[Number(btn.dataset.dmi)];
    if (!m) return;
    const ok = await copyText(reportText(m.content));
    toast(ok ? '已复制，可以直接粘贴' : '复制失败，请长按文字手动复制');
    if (ok) { const old = btn.textContent; btn.textContent = '✓ 已复制'; setTimeout(() => { btn.textContent = old; }, 1600); }
  }));
  if (state.view !== 'archive') showView('archive');
  $('#dream-detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function closeDetail() { detailId = null; $('#dream-detail').hidden = true; }
$('#detail-close').addEventListener('click', closeDetail);
$('#detail-chat').addEventListener('click', () => {
  if (!detailId) return;
  state.activeDreamId = detailId;
  showView('chat');
  const d = getActiveDream();
  if (d && (!d.messages || d.messages.length === 0)) startInterpretation(d, 'ask');
});
$('#detail-delete').addEventListener('click', async () => {
  if (!detailId) return;
  const ok = await confirmModal('确定删除这个梦和它的全部解读吗？删除后无法恢复。');
  if (!ok) return;
  state.data.dreams = state.data.dreams.filter(d => d.id !== detailId);
  if (state.activeDreamId === detailId) state.activeDreamId = null;
  saveData(); closeDetail(); renderArchive(); toast('已删除');
});
$('#detail-edit').addEventListener('click', () => {
  const d = state.data.dreams.find(x => x.id === detailId);
  if (!d) return;
  state.editingId = d.id;
  $('#f-title').value = d.title || '';
  $('#f-content').value = d.content;
  $('#f-tags').value = (d.tags || []).join(', ');
  $('#f-assoc').value = d.associations || '';
  $('#f-presleep').value = d.preSleep || '';
  pickedMoods.clear(); (d.moods || []).forEach(m => pickedMoods.add(m));
  pickedClarity = d.clarity || '';
  renderChips();
  $('#btn-save-chat').textContent = '保存修改并解读';
  $('#btn-save').textContent = '保存修改';
  closeDetail();
  showView('home');
  toast('正在编辑这个梦');
});

/* ---------- 回顾 ---------- */
function computeStats() {
  const dreams = state.data.dreams;
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const thisMonth = dreams.filter(d => {
    const t = new Date(d.createdAt);
    return `${t.getFullYear()}-${t.getMonth()}` === monthKey;
  }).length;
  const days = new Set(dreams.map(d => fmtDate(d.createdAt)));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(fmtDate(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(fmtDate(cursor.getTime()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  const moodCount = {};
  dreams.forEach(d => (d.moods || []).forEach(m => { moodCount[m] = (moodCount[m] || 0) + 1; }));
  const tagCount = {};
  dreams.forEach(d => (d.tags || []).forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; }));
  return { total: dreams.length, thisMonth, streak, moodCount, tagCount, days };
}

function renderInsights() {
  const s = computeStats();
  $('#stat-total').textContent = s.total;
  $('#stat-month').textContent = s.thisMonth;
  $('#stat-streak').textContent = s.streak;

  const moods = Object.entries(s.moodCount).sort((a, b) => b[1] - a[1]);
  const max = moods.length ? moods[0][1] : 1;
  $('#mood-bars').innerHTML = moods.length
    ? moods.map(([m, c]) => `<div class="mood-bar-row">
        <span class="mood-bar-name">${escapeHtml(m)}</span>
        <span class="mood-bar-track"><span class="mood-bar-fill" style="width:${Math.round(c / max * 100)}%"></span></span>
        <span class="mood-bar-num">${c}</span>
      </div>`).join('')
    : '<p class="empty-sub">记录几个梦之后，这里会出现情绪的变化。</p>';

  const tags = Object.entries(s.tagCount).sort((a, b) => b[1] - a[1]).slice(0, 20);
  $('#tag-cloud').innerHTML = tags.length
    ? tags.map(([t, c]) => `<span class="chip static">${escapeHtml(t)}<span class="cnt">×${c}</span></span>`).join('')
    : '<p class="empty-sub">给梦打上标签，就能看出什么主题最常在夜里出现。</p>';

  renderCalendar(s.days);

  const cache = state.data.weeklyCache;
  $('#weekly-result').innerHTML = cache && cache.text
    ? renderMarkdown(cache.text) + `<p class="empty-sub">生成于 ${fmtTime(cache.ts)}</p>`
    : '';
}

function renderCalendar(days) {
  const now = new Date();
  const y = now.getFullYear(), mo = now.getMonth();
  const first = new Date(y, mo, 1);
  const count = new Date(y, mo + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // 周一起
  let html = ['一', '二', '三', '四', '五', '六', '日'].map(d => `<div class="cal-dow">${d}</div>`).join('');
  for (let i = 0; i < offset; i++) html += '<div class="cal-day blank"></div>';
  let has = false;
  for (let d = 1; d <= count; d++) {
    const key = `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const marked = days.has(key);
    if (marked) has = true;
    html += `<div class="cal-day ${marked ? 'has' : ''}">${d}</div>`;
  }
  $('#calendar').innerHTML = html;
  $('#calendar-empty').hidden = has;
}

$('#btn-weekly').addEventListener('click', async () => {
  const since = Date.now() - 7 * 86400000;
  const recent = state.data.dreams.filter(d => d.createdAt >= since).sort((a, b) => a.createdAt - b.createdAt);
  if (!recent.length) { toast('近 7 天还没有记录梦境'); return; }
  const btn = $('#btn-weekly');
  btn.disabled = true; btn.textContent = '生成中…';
  $('#weekly-result').innerHTML = '<p class="typing">正在读这一周的梦 ……</p>';
  const digest = recent.map(d =>
    `【${fmtDate(d.createdAt)}】${d.title || '未命名'}（情绪：${(d.moods || []).join('、') || '未标记'}）\n${d.content.slice(0, 400)}`
  ).join('\n\n---\n\n');
  try {
    const text = await callAI([
      { role: 'system', content: WEEKLY_PROMPT },
      { role: 'user', content: `这是我最近 ${recent.length} 个梦：\n\n${digest}` },
    ], (_d, acc) => { $('#weekly-result').innerHTML = renderMarkdown(acc); });
    state.data.weeklyCache = { ts: Date.now(), text };
    saveData();
  } catch (err) {
    $('#weekly-result').innerHTML = `<p class="empty-sub">生成失败：${escapeHtml(err.message)}</p>`;
  }
  btn.disabled = false; btn.textContent = '生成小结';
});

/* ---------- 我的 ---------- */
$('#btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `梦境手记备份-${fmtDate(Date.now())}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('备份已导出');
});
$('#btn-import').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const text = await file.text();
    const d = JSON.parse(text);
    if (!Array.isArray(d.dreams)) throw new Error('格式不正确');
    const ok = await confirmModal(`备份里有 ${d.dreams.length} 个梦。导入会覆盖当前全部数据，确定继续吗？（建议先导出当前备份）`);
    if (!ok) return;
    state.data = { dreams: d.dreams, weeklyCache: d.weeklyCache || null };
    state.sessionDreams = [];
    state.activeDreamId = null;
    saveData(); showView('home');
    toast('导入完成');
  } catch (err) {
    toast('导入失败：文件不是有效的备份');
  }
});
$('#btn-clear').addEventListener('click', async () => {
  const ok1 = await confirmModal('确定清空全部梦境记录吗？此操作无法撤销。');
  if (!ok1) return;
  const ok2 = await confirmModal('再次确认：所有梦和解读都会被删除。建议先导出备份。仍要清空吗？');
  if (!ok2) return;
  state.data = { dreams: [], weeklyCache: null };
  state.sessionDreams = [];
  state.activeDreamId = null;
  state.editingId = null;
  closeDetail();
  saveData(); showView('home');
  toast('已清空');
});
/* ---------- 密钥设置 ---------- */
function refreshKeyState() {
  const el = $('#key-state');
  if (!el) return;
  const has = loadApiKey();
  el.className = 'ping-result' + (has ? ' ok' : '');
  el.textContent = has ? '已保存 ✓' : '还没填密钥';
}
$('#btn-save-key').addEventListener('click', () => {
  const v = ($('#key-input').value || '').trim();
  if (!v) { toast('先把密钥粘贴进来'); return; }
  saveApiKey(v);
  $('#key-input').value = '';
  refreshKeyState();
  toast('密钥已保存在这台设备');
});
$('#btn-clear-key').addEventListener('click', () => {
  saveApiKey('');
  refreshKeyState();
  toast('已清除密钥');
});

$('#btn-ping').addEventListener('click', async () => {
  const el = $('#ping-result');
  el.className = 'ping-result'; el.textContent = '检查中…';
  try {
    const key = loadApiKey();
    if (key) {
      const resp = await fetch(DIRECT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
        body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: '只回复：ok' }], max_tokens: 10, stream: false }),
      });
      if (!resp.ok) throw new Error(friendlyHttpError(resp.status, ''));
      const j = await resp.json();
      if (!j.choices || !j.choices[0]) throw new Error('返回异常');
      el.classList.add('ok'); el.textContent = '连接正常，可以解读 ✓（直连）';
    } else {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: '只回复：ok' }], stream: false, max_tokens: 10 }),
      });
      if (!resp.ok) throw new Error(resp.status === 404 ? '还没填密钥，也没有服务器' : friendlyHttpError(resp.status, ''));
      const j = await resp.json();
      if (!j.choices || !j.choices[0]) throw new Error('返回异常');
      el.classList.add('ok'); el.textContent = '连接正常 ✓（服务器代理）';
    }
  } catch (err) {
    el.classList.add('bad');
    el.textContent = '连接失败：' + err.message;
  }
});

/* ---------- PWA 安装与离线状态 ---------- */
let deferredInstallPrompt = null;
function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function refreshInstallState() {
  const btn = $('#btn-install'), status = $('#install-status');
  if (!btn || !status) return;
  if (isStandaloneMode()) {
    btn.hidden = true;
    status.textContent = '已以桌面应用模式打开 ✓ 旧档案可离线查看，AI 解读需要联网。';
  } else {
    btn.hidden = !deferredInstallPrompt;
  }
}
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  refreshInstallState();
});
$('#btn-install').addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  const promptEvent = deferredInstallPrompt;
  deferredInstallPrompt = null;
  refreshInstallState();
  try {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome !== 'accepted') toast('已取消安装，也可以稍后再来');
  } catch (e) { toast('请用浏览器菜单里的「安装应用／添加到主屏幕」'); }
});
window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  refreshInstallState();
  toast('已安装到桌面，下次点图标就能打开');
});
const standaloneMedia = window.matchMedia('(display-mode: standalone)');
if (standaloneMedia.addEventListener) standaloneMedia.addEventListener('change', refreshInstallState);
else if (standaloneMedia.addListener) standaloneMedia.addListener(refreshInstallState);

function updateOnlineState() {
  const banner = $('#offline-banner');
  if (banner) banner.hidden = navigator.onLine;
}
window.addEventListener('online', () => { updateOnlineState(); toast('网络已恢复，可以继续解读'); });
window.addEventListener('offline', updateOnlineState);
updateOnlineState();
refreshInstallState();

if ('serviceWorker' in navigator &&
    (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* 安装失败不影响网页版使用 */ });
  });
}

/* ---------- 启动 ---------- */
/* 支持从链接参数自动填密钥：打开 …/#k=sk-xxx 即可，不经过服务器 */
(function applyKeyFromLink() {
  try {
    const raw = (location.hash || '').replace(/^#/, '');
    if (!raw) return;
    const params = new URLSearchParams(raw);
    const k = (params.get('k') || params.get('key') || '').trim();
    if (!k) return;
    saveApiKey(k);
    history.replaceState(null, '', location.pathname + location.search);
    setTimeout(() => toast('密钥已自动填好，可以直接记梦了'), 500);
  } catch (e) { /* 忽略 */ }
})();
refreshKeyState();
renderChips();
showView('home');
