
/* 'use strict';
  const VERSION='';
  const $=id=>document.getElementById(id);
  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
  const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function toastSafe(m){try{typeof toast==='function'?toast(m):console.log(m);}catch(e){console.log(m);}}
  function fire(el){if(!el)return; ['input','change','blur'].forEach(t=>{try{el.dispatchEvent(new Event(t,{bubbles:true}));}catch(e){}});}
  function setVal(id,val){const el=$(id); if(!el)return false; el.value=(val==null?'':String(val)); fire(el); return true;}
  function setSelect(id,val){
    const el=$(id); if(!el)return false; const wanted=clean(val); if(!wanted)return false;
    const norm=s=>clean(s).replace(/^\p{Emoji_Presentation}\s*/u,'').toLowerCase();
    let opt=[...el.options].find(o=>norm(o.value)===norm(wanted)||norm(o.textContent)===norm(wanted));
    if(!opt){opt=document.createElement('option'); opt.value=wanted; opt.textContent=wanted; el.appendChild(opt);} el.value=opt.value; fire(el); return true;
  }
  function numFromMoney(s){
    let x=String(s||'').replace(/[^0-9.,]/g,''); if(!x)return 0;
    if(x.includes('.') && x.includes(',')) x=x.replace(/,/g,'');
    else if(/,\d{1,2}$/.test(x)) x=x.replace(/,(\d{1,2})$/,'.$1');
    else x=x.replace(/,/g,'');
    return Number(x)||0;
  }
  function moneyCandidates(raw){
    const s=clean(raw), out=[];
    const rx=/(GHS|GHC|GH₵|GH¢|₵|USD|US\$|\$)\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi;
    let m; while((m=rx.exec(s))){
      const start=m.index, end=rx.lastIndex, value=numFromMoney(m[2]); if(!value)continue;
      const before=s.slice(Math.max(0,start-90),start).toLowerCase();
      const after=s.slice(end,Math.min(s.length,end+90)).toLowerCase();
      const near=(before+' '+after).toLowerCase();
      let score=0;
      if(/received|credited|deposited|cash in|sent|paid|debited|withdrawn|transferred|purchase|payment|amount|amt/.test(before))score+=120;
      if(/you have received|have received|received/.test(before))score+=200;
      if(/from\s+/.test(after)||/to\s+/.test(after))score+=40;
      if(/balance|bal\.?|available|ledger|closing/.test(before.slice(-35))||/balance|bal\.?|available|ledger|closing/.test(after.slice(0,45))||/your\s+\w*\s*(cash|wallet|account)\s+balance/.test(near))score-=1000;
      if(/fee|charge|levy|tax/.test(near))score-=300;
      // Smaller currency-labelled transaction amount should beat large balances/reference-like values when contextual words support it.
      if(value>1000000 && /balance|available|ledger/.test(near))score-=1000;
      out.push({value,currency:/usd|\$/i.test(m[1])?'USD':'GHS',score,index:start,token:m[0],before,after});
    }
    return out.sort((a,b)=>b.score-a.score||a.index-b.index);
  }
  function detectType(raw){const s=clean(raw).toLowerCase(); if(/received|credited|cash in|deposit|inward|refund|reversal|salary/.test(s) && !/paid|sent|debited|withdrawn|cash out/.test(s))return 'income'; if(/received|credited/.test(s))return 'income'; return 'expense';}
  function detectDate(raw){const s=clean(raw); let m=s.match(/\b(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})\b/); if(m)return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`; m=s.match(/\b(\d{1,2})[-\/](\d{1,2})[-\/](20\d{2}|\d{2})\b/); if(m){let y=+m[3]; if(y<100)y+=2000; return `${y}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;} return (typeof today==='function'?today():new Date().toISOString().slice(0,10));}
  function detectWallet(raw){const s=clean(raw).toLowerCase(); if(/telecel/.test(s))return 'Telecel Cash'; if(/vodafone|vcash/.test(s))return 'Vodafone Cash'; if(/mtn|momo|mobile money/.test(s))return 'MTN MoMo'; if(/airteltigo|airtel|tigo/.test(s))return 'AirtelTigo Money'; if(/gcb/.test(s))return 'GCB Bank'; if(/ecobank/.test(s))return 'Ecobank'; if(/stanbic/.test(s))return 'Stanbic Bank'; if(/absa/.test(s))return 'Absa Bank'; return 'Bank Account';}
  function detectDesc(raw,type){
    const s=clean(raw); let m;
    if(type==='income'){
      m=s.match(/(?:received|credited)\s+(?:GHS|GHC|GH₵|GH¢|₵|USD|US\$|\$)?\s*[0-9,]+(?:\.\d{1,2})?\s+from\s+(.+?)(?:\s+on\s+20\d{2}[-\/]\d{1,2}[-\/]\d{1,2}|\s+at\s+\d{1,2}:|\.\s*Your\b|\s+Your\b|\s+Reference\b|\s+Ref\b|$)/i) || s.match(/\bfrom\s+(.+?)(?:\s+on\s+20\d{2}[-\/]\d{1,2}[-\/]\d{1,2}|\s+at\s+\d{1,2}:|\.\s*Your\b|\s+Your\b|\s+Reference\b|\s+Ref\b|$)/i);
    } else {
      m=s.match(/(?:paid|sent|transferred|debited)\s+(?:GHS|GHC|GH₵|GH¢|₵|USD|US\$|\$)?\s*[0-9,]+(?:\.\d{1,2})?\s+(?:to|for)\s+(.+?)(?:\s+on\s+20\d{2}[-\/]\d{1,2}[-\/]\d{1,2}|\s+at\s+\d{1,2}:|\.\s*Your\b|\s+Your\b|\s+Reference\b|\s+Ref\b|$)/i) || s.match(/\b(?:to|beneficiary|recipient|merchant)\s+(.+?)(?:\s+on\s+20\d{2}[-\/]\d{1,2}[-\/]\d{1,2}|\s+at\s+\d{1,2}:|\.\s*Your\b|\s+Your\b|\s+Reference\b|\s+Ref\b|$)/i);
    }
    return clean((m&&m[1]) || (type==='income'?'Received funds':'Payment')).replace(/[.;,:]+$/,'');
  }
  function detectCat(raw,type,desc){const t=(raw+' '+desc).toLowerCase(); if(type==='income'){if(/salary|payroll|wage/.test(t))return 'Salary / Monthly Pay'; if(/maxprem|enterprise|client|invoice|sales|business|customer|chai/.test(t))return 'Business / Self-Employment'; if(/interest|dividend|coupon|investment/.test(t))return 'Investment Returns'; return 'Other Income';} if(typeof inferSmsCat==='function')return inferSmsCat(t); if(/fuel|goil|shell|petrol|diesel/.test(t))return 'Transport'; if(/food|bread|rice|restaurant|cafe/.test(t))return 'Food & Dining'; return 'Miscellaneous';}
  function detectRef(raw){const s=clean(raw); return (s.match(/\b(?:Reference|Ref|Transaction ID|Txn ID)\s*[:#-]?\s*(.+)$/i)||[])[1]||'';}
  function parseAlertHard(raw){
    raw=clean(raw); const cands=moneyCandidates(raw); const best=cands[0]||{value:0,currency:/\bUSD\b|US\$|\$/.test(raw)?'USD':'GHS'};
    const type=detectType(raw), desc=detectDesc(raw,type);
    return {type,amount:best.value,currency:best.currency||'GHS',wallet:detectWallet(raw),accountType:/telecel|vodafone|mtn|momo|mobile money|airteltigo|airtel|tigo/i.test(raw)?'MoMo':'Bank',date:detectDate(raw),desc,counterparty:desc,cat:detectCat(raw,type,desc),txid:detectRef(raw),raw,parserVersion:VERSION,candidates:cands};
  }
  function fmtAmount(d){return (d.currency==='USD'?'$':'GH₵ ')+Number(d.amount||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});}
  function render(out,d,source){
    if(!out)return; window.__lastParsedAlert=d; window.__lastParsedSMS=d;
    out.innerHTML='<div class="sms-summary"><b>Parsed '+(d.type==='income'?'Income':'Expense')+' Alert</b><br>Amount: <b>'+esc(fmtAmount(d))+'</b><br>Wallet: '+esc(d.wallet)+'<br>Description: '+esc(d.desc)+'<br>Category: '+esc(d.cat)+(d.txid?'<br>Reference: '+esc(d.txid):'')+'<br><span style="font-size:10px;opacity:.65">Parser candidates: '+esc((d.candidates||[]).slice(0,3).map(c=>c.token+' score '+c.score).join(' | '))+'</span></div><div style="margin-top:8px"><button type="button" class="btn btn-pk btn-sm nuellie-hard-prefill" data-source="'+source+'">✨ Prefill Transaction Form</button></div>';
  }
  function fillForm(d){
    d=d&&d.amount?d:(window.__lastParsedAlert||window.__lastParsedSMS); if(!d||!d.amount){toastSafe('Parse an alert first.');return;}
    const pre=d.type==='income'?'i':'e'; if(typeof showPage==='function')showPage(d.type==='income'?'income':'expenses');
    const apply=()=>{setVal(pre+'Amt',Number(d.amount).toFixed(2)); setVal(pre+'Desc',d.desc||d.counterparty||'Parsed transaction'); setVal(pre+'Date',d.date); setVal(pre+'Notes',(d.txid?'Reference: '+d.txid+' | ':'')+'Parsed alert'); setSelect(pre+'Cur',d.currency); setSelect(pre+'Wal',d.wallet); setSelect(pre+'Cat',d.cat); const acct=$(pre+'AcctType'); if(acct){acct.value=d.accountType; fire(acct);}};
    apply(); setTimeout(apply,50); setTimeout(apply,250); setTimeout(()=>{apply(); const target=$(pre+'Amt')||$(pre+'Desc'); if(target){target.scrollIntoView({behavior:'smooth',block:'center'}); target.focus();} toastSafe('✅ Form filled with '+fmtAmount(d)+'. Review and save.');},600);
  }
  function runSms(){const raw=clean($('smsText')&&$('smsText').value); if(!raw){toastSafe('Paste an SMS first.');return;} const d=parseAlertHard(raw); render($('smsResult'),d,'sms'); toastSafe(d.amount?'SMS parsed by '+VERSION+'. Click Prefill.':'Could not detect a currency amount.');}
  function runEmail(){const raw=clean($('emailAlertText')&&$('emailAlertText').value); if(!raw){toastSafe('Paste the email alert first.');return;} const d=parseAlertHard(raw); render($('emailAlertResult'),d,'email'); toastSafe(d.amount?'Email parsed by '+VERSION+'. Click Prefill.':'Could not detect a currency amount.');}
  function runQuick(){const raw=clean($('quickSheetSmsText')&&$('quickSheetSmsText').value); if(!raw){toastSafe('Paste an SMS alert first.');return;} const d=parseAlertHard(raw); window.__lastParsedAlert=d; setSelect('qaType',d.type); setVal('qaAmt',Number(d.amount).toFixed(2)); setVal('qaDesc',d.desc); setSelect('qaCur',d.currency); setSelect('qaWal',d.wallet); setSelect('qaCat',d.cat); const r=$('quickSheetSmsResult'); if(r)r.innerHTML='<div class="sms-summary"><b>Quick Add fields filled</b><br>Amount: '+esc(fmtAmount(d))+'<br>Description: '+esc(d.desc)+'</div>'; toastSafe('✅ Quick Add fields filled.');}
  function bind(){
    window.parseAlert=parseAlertHard; window.parseSmsMessage=parseAlertHard; window.parseSMS=runSms; window.prefillSMS=function(d){fillForm(d||window.__lastParsedAlert||window.__lastParsedSMS);}; window.parseEmailAlert=runEmail; window.prefillEmailAlert=function(){fillForm(window.__lastParsedAlert);}; window.parseSheetSMS=runQuick; window.parseQuickSMS=runQuick; window.__NUELLIE_ALERT_PARSER_VERSION=VERSION;
    const smsBtn=[...document.querySelectorAll('button')].find(b=>/parse sms/i.test(b.textContent||'') && b.closest('#tool-sms')); if(smsBtn){smsBtn.onclick=null; smsBtn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();runSms();},true);}
    const emailBtn=[...document.querySelectorAll('button')].find(b=>/parse email/i.test(b.textContent||'') && (b.closest('#tool-email-alert')||document.getElementById('emailAlertText'))); if(emailBtn){emailBtn.onclick=null; emailBtn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();runEmail();},true);}
    const quickBtn=[...document.querySelectorAll('button')].find(b=>/parse sms/i.test(b.textContent||'') && b.closest('#qaSmsBox')); if(quickBtn){quickBtn.onclick=null; quickBtn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();runQuick();},true);}
  }
  document.addEventListener('click',function(e){const b=e.target.closest&&e.target.closest('button'); if(!b)return; const txt=(b.textContent||'').toLowerCase(); if(b.classList.contains('nuellie-hard-prefill')||/prefill transaction form/.test(txt)){e.preventDefault();e.stopImmediatePropagation();fillForm(window.__lastParsedAlert||window.__lastParsedSMS);}},true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind); else bind();
  setTimeout(bind,500); setTimeout(bind,1500); setTimeout(bind,3500);
  // Console self-test for the exact Telecel issue.
  window.__testNuellieSmsParser=function(){return parseAlertHard('0000013264775053 Confirmed. You have received GHS1,600.00 from MAXPREM ENTERPRISE on 2026-06-05 at 15:08. Your Telecel Cash balance is GHS13,264,775.53. Reference: GIPOutwardCHAI BIA MTG 7806617849580');};
})();
