/* =========================================================
 * 梦境手记 · 前端逻辑
 * 数据保存在浏览器 localStorage；AI 解读通过 /api/chat 安全调用。
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

工作流程：
1. 用户第一次描述梦境后，如果关键信息明显不足，先问最多3个最重要的问题（例如：梦中最强烈的情绪、梦中人物让TA联想到谁、最近的相关事件）。问题要具体、简短、编号列出。如果用户说"直接解读""跳过"或信息已经足够，就直接生成报告，不要再追问。
2. 生成解读报告时，使用以下结构（Markdown 二级标题）：
## 梦境主线
（一两句话复述梦的主线，确认没有遗漏关键情节）
## 情绪脉络
（分析梦里情绪的起伏变化）
## 核心意象
（挑选2至4个真正重要的意象或冲突，结合用户的个人联想说明它们可能意味着什么）
## 几种可能的理解
（给出2至3种不同但合理的解读角度，每种都说明依据了哪些梦境细节；不要为凑数强行解释）
## 与现实生活的可能联系
（温和地提出假设，明确这是假设而非定论）
## 可以带着思考的问题
（1至2个供用户自我反思的问题）
## 一句温和的总结
（简短、不绝对、有陪伴感）
3. 用户可以追问、补充或否定你的解读。被否定时不要坚持，结合新信息修正。
4. 如果用户提到反复噩梦、长期失眠、明显影响生活，温和建议关注睡眠与心理状态，必要时寻求专业帮助，但不夸大一两次梦境的意义。

语言温暖、真诚、平静，详细但不堆砌，像一位值得信任的朋友在深夜里陪用户说话。全程使用中文。`;

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
  data: loadData(),
  view: 'home',
  activeDreamId: null,
  sending: false,
  editingId: null,
};

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
  const recent = [...state.data.dreams].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
  $('#recent-list').innerHTML = recent.length
    ? recent.map(dreamItemHtml).join('')
    : '<p class="empty-sub">还没有记录。第一个梦，从上面开始。</p>';
  bindDreamItems($('#recent-list'));
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
    $('#btn-save-chat').textContent = '保存并开始解读';
    $('#btn-save').textContent = '仅保存';
    toast('已保存修改');
    saveData(); resetForm();
    if (startChat && d) { state.activeDreamId = d.id; showView('chat'); }
    else showView('archive');
    return;
  }
  const dream = { id: uid(), createdAt: Date.now(), messages: [], ...f };
  state.data.dreams.push(dream);
  saveData(); resetForm();
  toast('梦已收进档案 🌙');
  if (startChat) {
    state.activeDreamId = dream.id;
    showView('chat');
    startInterpretation(dream, 'ask');
  } else {
    renderHome();
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
  return state.data.dreams.find(d => d.id === state.activeDreamId) || null;
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

async function callAI(messages, onDelta) {
  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, stream: true }),
  });
  if (!resp.ok) {
    let msg = 'HTTP ' + resp.status;
    try {
      const j = await resp.json();
      msg = j.error?.message || j.error || msg;
    } catch (e) { /* keep default */ }
    throw new Error(msg);
  }
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

function startInterpretation(dream, mode) {
  if (!dream.messages) dream.messages = [];
  if (dream.messages.length > 0) { renderChat(); return; }
  const msgs = buildInitialMessages(dream, mode);
  dream.messages.push({ role: 'user', content: msgs[1].content, ts: Date.now() });
  saveData();
  renderChat();
  runAssistant(dream);
}

async function runAssistant(dream) {
  if (state.sending) return;
  state.sending = true;
  updateSendBtn();
  const placeholder = { role: 'assistant', content: '', ts: Date.now(), pending: true };
  dream.messages.push(placeholder);
  renderChatMessages(dream);
  try {
    const history = [{ role: 'system', content: SYSTEM_PROMPT }]
      .concat(dream.messages.filter(m => !m.pending).map(m => ({ role: m.role, content: m.content })));
    const full = await callAI(history, (_d, acc) => {
      placeholder.content = acc;
      renderChatMessages(dream, true);
    });
    placeholder.content = full || '（没有收到回复，请再试一次）';
  } catch (err) {
    placeholder.content = `这次解读没有成功：${err.message}\n\n可以稍后再试，或在「我的 → 连接状态」里检查 AI 连接。`;
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

function msgActionsHtml(dream, m, idx) {
  if (m.role !== 'assistant' || m.pending || m.error) return '';
  const fb = m.feedback;
  const isLast = idx === dream.messages.length - 1;
  return `<div class="msg-actions">
    <button class="fb-btn ${fb === 'resonant' ? 'on' : ''}" data-fb="resonant" data-idx="${idx}">😊 有共鸣</button>
    <button class="fb-btn ${fb === 'unsure' ? 'on' : ''}" data-fb="unsure" data-idx="${idx}">🤔 不确定</button>
    <button class="fb-btn ${fb === 'notme' ? 'on' : ''}" data-fb="notme" data-idx="${idx}">🙅 不太像我</button>
    ${isLast ? `<button class="fb-btn" data-regen="1">🔁 换个角度重新解读</button>` : ''}
  </div>` + (fb ? `<div class="msg-feedback-note">${fb === 'resonant' ? '已记下：这个方向有共鸣。' : fb === 'unsure' ? '已记下：先保留这个可能性。' : '已记下：下次解读会参考你的否定。'}</div>` : '');
}

function renderChatMessages(dream, keepScroll) {
  const box = $('#chat-messages');
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
  box.innerHTML = dream.messages.map((m, i) => {
    if (m.role === 'system') return '';
    if (m.role === 'user') {
      return `<div class="msg user">${escapeHtml(m.content)}</div>`;
    }
    const body = m.pending && !m.content
      ? '<p class="typing">正在读你的梦 ……</p>'
      : renderMarkdown(m.content) + (m.pending ? '<p class="typing">▍</p>' : '');
    return `<div class="msg assistant">${body}${msgActionsHtml(dream, m, i)}</div>`;
  }).join('');
  box.querySelectorAll('[data-fb]').forEach(b => b.addEventListener('click', () => {
    const m = dream.messages[Number(b.dataset.idx)];
    if (!m) return;
    m.feedback = m.feedback === b.dataset.fb ? null : b.dataset.fb;
    saveData();
    renderChatMessages(dream, true);
  }));
  box.querySelectorAll('[data-regen]').forEach(b => b.addEventListener('click', () => regenerate(dream)));
  if (keepScroll ? nearBottom : true) box.scrollTop = box.scrollHeight;
  if (!keepScroll) window.scrollTo({ top: 0 });
}

function regenerate(dream) {
  if (state.sending) return;
  dream.messages.push({
    role: 'user',
    content: '请换一个角度重新解读这个梦：给出与之前不同的可能性，保持同样的报告结构，并参考我标记过的共鸣反馈。',
    ts: Date.now(),
  });
  saveData();
  renderChatMessages(dream);
  runAssistant(dream);
}

function renderChat() {
  const dream = getActiveDream();
  const empty = $('#chat-empty'), main = $('#chat-main');
  if (!dream) {
    empty.hidden = false; main.hidden = true;
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
function sendUserMessage() {
  const dream = getActiveDream();
  if (!dream || state.sending) return;
  const text = $('#chat-input').value.trim();
  if (!text) return;
  $('#chat-input').value = '';
  dream.messages.push({ role: 'user', content: text, ts: Date.now() });
  saveData();
  renderChatMessages(dream);
  runAssistant(dream);
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
    ? msgs.map((m, i) => `<div class="dm"><div class="dm-role">解读 ${i + 1}${m.feedback ? ' · ' + ({ resonant: '有共鸣', unsure: '不确定', notme: '不太像我' }[m.feedback] || '') : ''}</div>${renderMarkdown(m.content)}</div>`).join('')
    : '<p class="empty-sub">还没有解读记录。</p>';
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
  state.activeDreamId = null;
  saveData(); showView('home');
  toast('已清空');
});
$('#btn-ping').addEventListener('click', async () => {
  const el = $('#ping-result');
  el.className = 'ping-result'; el.textContent = '检查中…';
  try {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: '只回复：ok' }], stream: false, max_tokens: 10 }),
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const j = await resp.json();
    if (!j.choices || !j.choices[0]) throw new Error('返回异常');
    el.classList.add('ok'); el.textContent = '连接正常，可以解读 ✓';
  } catch (err) {
    el.classList.add('bad');
    el.textContent = '连接失败：' + err.message + '（本地打开请先启动服务器，见 README）';
  }
});

/* ---------- 启动 ---------- */
renderChips();
showView('home');
