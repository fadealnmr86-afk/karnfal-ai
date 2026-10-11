"use strict";
// Generates iCalendar invitations with two VALARM entries. It does NOT register
// notifications or write to Apple Calendar without the user's import action.
const KarnfalCalendar=(()=>{
 const ELIGIBLE=new Set(['bills','appointments','tasks']);
 const clean=s=>String(s??'').replace(/\r\n?/g,'\n').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
 const pad=n=>String(n).padStart(2,'0');
 const utc=d=>d.getUTCFullYear()+pad(d.getUTCMonth()+1)+pad(d.getUTCDate())+'T'+pad(d.getUTCHours())+pad(d.getUTCMinutes())+pad(d.getUTCSeconds())+'Z';
 const day=d=>d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate());
 function eligible(r){return ELIGIBLE.has(r.category)&&!r.done&&typeof r.date==='string'&&/^\d{4}-\d\d-\d\d(?:T\d\d:\d\d)?/.test(r.date)}
 function event(r){
  if(!eligible(r))return null;
  const date=r.date.slice(0,10),hasTime=/T\d\d:\d\d/.test(r.date);
  // Date-only tasks are treated as 09:00 local time, with same-day alarm at 09:00.
  const start=new Date(date+'T'+(hasTime?r.date.slice(11,16):'09:00')+':00');
  if(Number.isNaN(start.getTime())||day(start)!==date.replaceAll('-',''))return null;
  const end=new Date(start.getTime()+30*60000);
  const stamp=utc(new Date());
  const id=String(r.id||'record').replace(/[^a-zA-Z0-9-]/g,'').slice(0,90);
  const label=r.category==='bills'?'فاتورة':r.category==='appointments'?'موعد':'مهمة';
  const summary='كرنفل — '+label+': '+String(r.title||'بدون عنوان');
  return ['BEGIN:VEVENT','UID:'+id+'@karnfal.local','DTSTAMP:'+stamp,'DTSTART:'+utc(start),'DTEND:'+utc(end),'SUMMARY:'+clean(summary),'DESCRIPTION:'+clean('أُنشئ من كرنفل AI. بعد تغيير الموعد داخل كرنفل يجب تحديث حدث التقويم يدوياً.'),...(r.category==='bills'&&r.recurrence==='شهرياً'?['RRULE:FREQ=MONTHLY;BYMONTHDAY='+Number(r.monthlyDay||date.slice(8,10))]:[]),
   'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+clean('بعد 3 أيام: '+summary),'TRIGGER:-P3D','END:VALARM',
   'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+clean('اليوم: '+summary),'TRIGGER:PT0S','END:VALARM','END:VEVENT'].join('\r\n');
 }
 function download(records,filename){const events=records.map(event).filter(Boolean);if(!events.length){alert('لا توجد سجلات نشطة بتاريخ صالح في الفواتير أو المواعيد أو المهام.');return false}
 const body=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Karnfal AI//Arabic Personal Organizer//AR','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:كرنفل',...events,'END:VCALENDAR',''].join('\r\n');
 const blob=new Blob(['\ufeff'+body],{type:'text/calendar;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename||'karnfal-reminders.ics';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);return true;
 }
 return {eligible,download};
})();
