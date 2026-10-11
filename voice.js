/* Karnfal Voice v6: browser speech interface; no cloud AI integration. */
'use strict';
(() => {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let listening = false, active = null, question = null;
  const byId = id => document.getElementById(id);
  function say(message) {
    const status = byId('voiceStatus');
    if (status) status.textContent = message;
    if (!('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'ar-SA'; utterance.rate = 0.95;
      const voices = speechSynthesis.getVoices();
      const arabic = voices.find(v => v.lang.toLowerCase().startsWith('ar'));
      if (arabic) utterance.voice = arabic;
      speechSynthesis.speak(utterance);
    } catch (_) { /* Text response remains available. */ }
  }
  function missing() {
    if (!Array.isArray(drafts) || drafts.length !== 1) return null;
    const r = drafts[0];
    if (r.category === 'bills' && !String(r.amount || '').trim()) return 'amount';
    if (['bills','appointments'].includes(r.category) && !r.date?.slice(0,10)) return 'date';
    return null;
  }
  function followUp() {
    question = missing();
    if (question === 'amount') say('كم مبلغ الدفعة بالشيكل؟');
    else if (question === 'date') say('ما تاريخ الموعد أو الاستحقاق؟ يمكنك قوله أو تحديده في النموذج.');
    else if (drafts.length) say('جهزت البيانات للمراجعة. تأكد من التفاصيل ثم اضغط حفظ للتأكيد.');
    else say('لم أفهم الطلب بشكل كاف. حاول وصفه بتفاصيل أكثر أو استخدم نموذج الإضافة.');
  }
  function normalizeDigits(s) { return s.replace(/[٠-٩]/g, x => String('٠١٢٣٤٥٦٧٨٩'.indexOf(x))).replace(/[۰-۹]/g, x => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(x))); }
  function parseDate(text) {
    const s = normalizeDigits(text);
    const now = new Date();
    if (/بعد غد/.test(s)) now.setDate(now.getDate() + 2);
    else if (/غد|بكره|بكرة/.test(s)) now.setDate(now.getDate() + 1);
    else if (/اليوم/.test(s)) { /* keep today */ }
    else {
      const match = s.match(/(\d{1,2})\s*[/\-.]\s*(\d{1,2})(?:\s*[/\-.]\s*(\d{4}))?/);
      if (!match) return '';
      const day = Number(match[1]), month = Number(match[2]), year = match[3] ? Number(match[3]) : now.getFullYear();
      const test = new Date(year, month - 1, day);
      if (test.getFullYear() !== year || test.getMonth() !== month - 1 || test.getDate() !== day) return '';
      now.setFullYear(year, month - 1, day);
    }
    return [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-');
  }
  function acceptAnswer(value) {
    if (!question || drafts.length !== 1) return false;
    const r = drafts[0];
    if (question === 'amount') {
      const number = normalizeDigits(value).match(/\d+(?:[.,]\d+)?/);
      if (!number) { say('لم أسمع المبلغ بوضوح. قل المبلغ بالأرقام، مثل 300 شيكل.'); return true; }
      r.amount = number[0].replace(',','.');
    } else if (question === 'date') {
      const date = parseDate(value);
      if (!date) { say('لم أتعرف على التاريخ. قل مثلاً غداً أو 15/11، أو أدخله في الحقل.'); return true; }
      r.date = date;
    }
    question = null;
    agentPage();
    followUp();
    return true;
  }
  // Capture follow-up answers before the existing rule-based submit handler.
  document.addEventListener('submit', event => {
    if (event.target.id !== 'agentForm') return;
    const text = byId('agentText')?.value.trim() || '';
    if (question && text) {
      event.preventDefault(); event.stopImmediatePropagation();
      acceptAnswer(text);
      return;
    }
    // Existing app parser handles the request; then voice announces the result.
    setTimeout(followUp, 0);
  }, true);
  document.addEventListener('click', event => {
    const button = event.target.closest('#voiceTalk');
    if (!button) return;
    if (!Recognition) {
      say('التعرف الصوتي غير متاح في هذا المتصفح. استخدم الكتابة، أو جرّب متصفحاً يدعم التعرف على الكلام بالعربية.');
      return;
    }
    if (listening && active) { active.stop(); return; }
    try {
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      const recognizer = new Recognition(); active = recognizer;
      recognizer.lang = 'ar-SA'; recognizer.interimResults = false; recognizer.continuous = false; recognizer.maxAlternatives = 1;
      recognizer.onstart = () => { listening = true; button.textContent = '⏹ إيقاف الاستماع'; const el=byId('voiceStatus'); if(el) el.textContent='أستمع الآن...'; };
      recognizer.onresult = e => {
        const text = e.results?.[0]?.[0]?.transcript?.trim();
        if (!text) return;
        const input = byId('agentText'); if (!input) return;
        input.value = text;
        const form = byId('agentForm'); if (form) form.requestSubmit();
      };
      recognizer.onerror = e => { const el=byId('voiceStatus'); if(el) el.textContent = e.error === 'not-allowed' ? 'اسمح باستخدام الميكروفون من إعدادات المتصفح.' : 'تعذر التعرف على الصوت. يمكنك استخدام الكتابة.'; };
      recognizer.onend = () => { listening = false; active = null; const b=byId('voiceTalk'); if(b) b.textContent='🎙️ اضغط وتحدث'; };
      recognizer.start();
    } catch (_) { say('تعذر تشغيل الميكروفون في هذا المتصفح.'); }
  });
  document.addEventListener('click', event => {
    if (event.target.closest('#saveDrafts,#cancelDrafts,[data-nav],[data-go]')) question = null;
  });
})();
