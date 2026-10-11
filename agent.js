'use strict';
/* Rule-based offline Arabic parser. No model, server, or network requests. */
const KarnfalAgent=(()=>{
 const groups=[
 ['bills',/فاتور|كهرباء|ماء|انترنت|إنترنت|اشتراك|قسط|ايجار|إيجار|ادفع|أدفع|سداد|راتب|مصروف|تحويل مالي/],
 ['appointments',/موعد|اجتماع|احجز|حجز|طبيب|دكتور|عيادة|مستشفى|مقابلة/],
 ['shopping',/اشتري|أشتري|شراء|تسوق|سوبرماركت|بقالة|حليب|خبز|خضار|منظف|مشتريات/],
 ['car',/سيار|بنزين|وقود|تأمين المركبة|رخصة|إطارات|زيت المحرك|صيانة السيارة|فحص السيارة/],
 ['documents',/جواز|هوية|بطاقة شخصية|وثيقة|مستند|شهادة|تجديد جواز|انتهاء الاقامة|انتهاء الإقامة/],
 ['health',/رياضة|مشي|دواء|فيتامين|تمرين|نوم|شرب الماء|عادة صحية|وزن/],
 ['events',/عيد ميلاد|ذكرى|مناسبة|زواج|هدية|تهنئة|زيارة عائلية/],
 ['travel',/رحلة|سفر|طيران|فندق|تذكرة سفر|مطار|حقيبة السفر/],
 ['email',/ايميل|إيميل|بريد|رسالة|رد على|راسل|واتساب/],
 ['goals',/هدف|تعلم|دورة|كتاب|دراسة|لغة جديدة|مهارة/],
 ['work',/مشروع|عميل|تقرير عمل|دوام|وظيفة|تسليم|عرض تقديمي/],
 ['memory',/تذكر أن|تذكّر أن|احفظ معلومة|معلومة عني|أفضل |احب |أحب /],
 ['scanner',/صورة فاتورة|صور الفاتورة|امسح فاتورة/],
 ['briefing',/تقرير صباحي|ملخص اليوم|ماذا عندي اليوم/],
 ['tasks',/مهمة|لازم|يجب|أنجز|سوي|سوّي|رتب|نظف|ذكرني|ذكّرني/]
 ];
 const arDigits='٠١٢٣٤٥٦٧٨٩';
 function digits(s){return s.replace(/[٠-٩]/g,c=>String(arDigits.indexOf(c)).replace(/-1/,'')).replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))}
 function iso(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
 function valid(y,m,d){const t=new Date(y,m-1,d);return t.getFullYear()===y&&t.getMonth()===m-1&&t.getDate()===d}
 function dateOf(s,now){let m=s.match(/\b(20\d\d)[\/-](\d{1,2})[\/-](\d{1,2})\b/);if(m){const [y,mo,da]=m.slice(1).map(Number);return valid(y,mo,da)?`${y}-${String(mo).padStart(2,'0')}-${String(da).padStart(2,'0')}`:null}
 m=s.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](20\d\d))?\b/);if(m){const d=+m[1],mo=+m[2],y=m[3]?+m[3]:now.getFullYear();return valid(y,mo,d)?`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`:null}
 if(/بعد غد|بعد بكرة|بعد بكره/.test(s)){const d=new Date(now);d.setDate(d.getDate()+2);return iso(d)}
 if(/غدا|غداً|بكرة|بكره/.test(s)){const d=new Date(now);d.setDate(d.getDate()+1);return iso(d)}
 if(/اليوم/.test(s))return iso(now);
 const names=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];const found=names.findIndex(n=>s.includes(n));if(found>=0){const d=new Date(now);let diff=(found-d.getDay()+7)%7;if(/القادم|الجاي/.test(s)&&diff===0)diff=7;d.setDate(d.getDate()+diff);return iso(d)}
 m=s.match(/(?:يوم|بتاريخ|تاريخ|في)\s+(\d{1,2})\s+(يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر)(?:\s+(20\d\d))?/);if(m){const months=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];const norm=x=>x.replace(/^ا/,'أ');const mo=months.findIndex(x=>norm(x)===norm(m[2]))+1;let y=m[3]?+m[3]:now.getFullYear();if(!m[3]&&valid(y,mo,+m[1])&&`${y}-${String(mo).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`<iso(now))y++;return valid(y,mo,+m[1])?`${y}-${String(mo).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`:null}
 return null}
 function timeOf(s){const m=s.match(/(?:الساعة|ساعه|عند)\s*(\d{1,2})(?::(\d{2}))?\s*(صباحا|صباحاً|ص|مساء|مساءً|م)?/);if(!m)return null;let h=+m[1],min=+(m[2]||0);if(h>23||min>59)return null;if(m[3]){if(h>12||h===0)return null;if(/مساء|^م$/.test(m[3])&&h<12)h+=12;if(/صباح|^ص$/.test(m[3])&&h===12)h=0}return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`}
 function split(s){return s.split(/(?:[\n؛;]+|\s+،\s+|\s+(?:وكمان|وأيضا|وأيضاً|بالإضافة إلى)\s+)/).map(x=>x.trim()).filter(Boolean).slice(0,15)}
 function parse(text,now=new Date()){const parts=split(digits(text));return parts.map(raw=>{
 const matched=groups.find(([id,re])=>re.test(raw));let category=matched?.[0]||'tasks';let date=dateOf(raw,now),time=timeOf(raw);let amountMatch=raw.match(/(?:مبلغ|بقيمة|بـ|بمبلغ)\s*(\d+(?:[.,]\d+)?)/)||raw.match(/(\d+(?:[.,]\d+)?)\s*(?:شيكل|شاقل|دولار|ريال|دينار|درهم|₪|\$)/);let amount=amountMatch?amountMatch[1].replace(',','.'):'';
 let title=raw.replace(/^(?:لو سمحت|من فضلك|يا كرنفل)\s*/,'').replace(/^(?:ذكرني|ذكّرني|سجل|سجّل|أضف|اضف|احفظ|حط|ضع|لازم|يجب|عندي)\s*(?:أن|اني|إني|بـ|ب)?\s*/,'').trim();
 if(!title)title=raw;
 let flags=[];if(!matched)flags.push('لم أتعرف على القسم بثقة؛ اخترت المهام اليومية');if(!date&&/\d{1,2}[\/-]\d{1,2}|بتاريخ|يوم \d|غد|بكر/.test(raw))flags.push('تحقق من التاريخ: لم أستطع قراءته');if(time&&!date)flags.push('الوقت موجود دون تاريخ؛ أضف تاريخاً');if(category==='scanner'||category==='briefing'){flags.push('هذا الطلب يحتاج إجراءً خاصاً؛ لم أُنشئ سجلاً تلقائياً');category='tasks'}
 return {category,title:title.slice(0,150),date:date?(category==='appointments'&&time?date+'T'+time:date):'',amount,notes:raw,flags,remind:!!date,done:false};
 })}
 return {parse};
})();
