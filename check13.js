
/* 'use strict';
  const VERSION='';
  const $=id=>document.getElementById(id);
  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
  const moneyRx=/(GHS|GHC|GH₵|GH¢|₵|USD|US\$|\$)\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi;
  function toastSafe(m){try{typeof toast==='function'?toast(m):console.log(m);}catch(e){console.log(m);}}
  function fire(el){if(!el)return; ['input','change','keyup','blur'].forEach(t=>{try{el.dispatchEvent(new Event(t,{bubbles:true}));}catch(e){}});}
  function parseMoney(x){x=String(x||'').replace(/[^0-9.,]/g,''); if(!x)return 0; if(x.includes('.')&&x.includes(','))x=x.replace(/,/g,''); else if(/,\d{1,2}$/.test(x))x=x.replace(/,(\d{1,2})$/,'.$1'); else x=x.replace(/,/g,''); return Number(x)||0;}
  function todayISO(){try{return typeof today==='function'?today():new Date().toISOString().slice(0,10);}catch(e){return new Date().toISOString().slice(0,10);}}
  function pickAmount(raw){
    const s=clean(raw), arr=[]; let m;
    while((m=moneyRx.exec(s))){
      const ctx=s.slice(Math.max(0,m.index-90),Math.min(s.length,moneyRx.lastIndex+100)).toLowerCase();
      const val=parseMoney(m[2]); if(!val)continue;
      let score=0;
      if(/received|credited|sent|paid|debited|withdrawn|payment|transferred|amount|amt/.test(ctx))score+=100;
      if(/you have received/.test(ctx))score+=150;
      if(/balance|available balance|wallet balance|account balance|ledger|closing/.test(ctx))score-=1000;
      if(/fee|charge|levy|tax/.test(ctx))score-=300;
      arr.push({val,cur:/usd|\$/i.test(m[1])?'USD':'GHS',score,index:m.index,token:m[0]});
    }
    arr.sort((a,b)=>b.score-a.score||a.index-b.index);
    return arr[0]||{val:0,cur:'GHS'};
  }
  function detectType(raw){const s=clean(raw).toLowerCase(); if(/received|credited|cash in|deposit|inward|refund|salary/.test(s)&&!/you paid|paid to|sent to|debited|cash out|withdrawn/.test(s))return 'income'; if(/received|credited/.test(s))return 'income'; return 'expense';}
  function detectWallet(raw){const s=clean(raw).toLowerCase(); if(/telecel/.test(s))return 'Telecel Cash'; if(/vodafone|vcash/.test(s))return 'Vodafone Cash'; if(/mtn|momo|mobile money/.test(s))return 'MTN MoMo'; if(/airteltigo|airtel|tigo/.test(s))return 'AirtelTigo Money'; if(/gcb/.test(s))return 'GCB Bank'; if(/ecobank/.test(s))return 'Ecobank'; if(/stanbic/.test(s))return 'Stanbic Bank'; if(/absa/.test(s))return 'Absa Bank'; return 'Bank Account';}
  function detectDate(raw){const s=clean(raw); let m=s.match(/\b(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})\b/); if(m)return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`; m=s.match(/\b(\d{1,2})[-\/](\d{1,2})[-\/](20\d{2}|\d{2})\b/); if(m){let y=+m[3]; if(y<100)y+=2000; return `${y}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;} return todayISO();}
  function detectDesc(raw,type){const s=clean(raw); let m; if(type==='income'){m=s.match(/(?:received|credited)\s+(?:GHS|GHC|GH₵|GH¢|₵|USD|US\$|\$)?\s*[0-9,]+(?:\.\d{1,2})?\s+from\s+(.+?)(?:\s+on\s+20\d{2}[-\/]\d{1,2}[-\/]\d{1,2}|\s+at\s+\d{1,2}:|\.\s*Your\b|\s+Your\b|\s+Reference\b|\s+Ref\b|$)/i)||s.match(/\bfrom\s+(.+?)(?:\s+on\s+20\d{2}[-\/]\d{1,2}[-\/]\d{1,2}|\s+at\s+\d{1,2}:|\.\s*Your\b|\s+Your\b|\s+Reference\b|\s+Ref\b|$)/i);}else{m=s.match(/(?:paid|sent|transferred|debited)\s+(?:GHS|GHC|GH₵|GH¢|₵|USD|US\$|\$)?\s*[0-9,]+(?:\.\d{1,2})?\s+(?:to|for)\s+(.+?)(?:\s+on\s+20\d{2}[-\/]\d{1,2}[-\/]\d{1,2}|\s+at\s+\d{1,2}:|\.\s*Your\b|\s+Your\b|\s+Reference\b|\s+Ref\b|$)/i)||s.match(/\b(?:to|beneficiary|recipient|merchant)\s+(.+?)(?:\s+on\s+20\d{2}[-\/]\d{1,2}[-\/]\d{1,2}|\s+at\s+\d{1,2}:|\.\s*Your\b|\s+Your\b|\s+Reference\b|\s+Ref\b|$)/i);} return clean((m&&m[1])||(type==='income'?'Received funds':'Payment')).replace(/[.;,:]+$/,'');}
  function detectCat(raw,type,desc){const t=(raw+' '+desc).toLowerCase(); if(type==='income'){if(/salary|payroll|wage/.test(t))return 'Salary / Monthly Pay'; if(/maxprem|enterprise|client|customer|invoice|business|sales|chai/.test(t))return 'Business / Self-Employment'; if(/interest|dividend|investment/.test(t))return 'Investment Returns'; return 'Other Income';} if(/fuel|petrol|diesel|uber|bolt|taxi|transport/.test(t))return 'Transport'; if(/bread|food|rice|restaurant|grocer|market/.test(t))return 'Food / Groceries'; return 'Miscellaneous';}
  function detectRef(raw){return (clean(raw).match(/\b(?:Reference|Ref|Transaction ID|Txn ID)\s*[:#-]?\s*(.+)$/i)||[])[1]||'';}
  function parseAlert(raw){raw=clean(raw); const m=pickAmount(raw); const type=detectType(raw); const desc=detectDesc(raw,type); return {type,amount:m.val,currency:m.cur,wallet:detectWallet(raw),accountType:/telecel|vodafone|mtn|momo|mobile money|airteltigo|airtel|tigo/i.test(raw)?'MoMo':'Bank',date:detectDate(raw),desc,counterparty:desc,cat:detectCat(raw,type,desc),txid:detectRef(raw),raw,parserVersion:VERSION};}
  function setVal(id,val){const el=$(id); if(!el)return false; el.value=val==null?'':String(val); try{el.setAttribute('value',el.value);}catch(e){} fire(el); return true;}
  function norm(s){return clean(s).replace(/^[^A-Za-z0-9]+\s*/,'').toLowerCase();}
  function setSelect(id,val){const el=$(id); if(!el)return false; const wanted=clean(val); if(!wanted)return false; let opt=[...el.options].find(o=>norm(o.value)===norm(wanted)||norm(o.textContent)===norm(wanted)||norm(o.textContent).includes(norm(wanted))||norm(wanted).includes(norm(o.textContent))); if(!opt){opt=document.createElement('option'); opt.value=wanted; opt.textContent=wanted; el.appendChild(opt);} el.value=opt.value; fire(el); return true;}
  function coreFill(d){const pre=d.type==='income'?'i':'e'; const amt=Number(d.amount||0).toFixed(2); setVal(pre+'Amt',amt); setVal(pre+'Desc',d.desc||d.counterparty||'Parsed transaction'); setVal(pre+'Date',d.date||todayISO()); setVal(pre+'Notes',(d.txid?'Reference: '+d.txid+' | ':'')+'Parsed alert'); setSelect(pre+'Cur',d.currency||'GHS'); setSelect(pre+'Wal',d.wallet||'Bank Account'); setSelect(pre+'Cat',d.cat||'Miscellaneous'); const acct=$(pre+'AcctType'); if(acct){acct.value=d.accountType||'Bank'; fire(acct);} return $(pre+'Amt')&&$(pre+'Amt').value===amt;}
  function fillForm(d){
    d=d&&d.amount?d:(window.__lastParsedAlert||window.__lastParsedSMS); if(!d||!d.amount){toastSafe('Parse an alert first.');return false;}
    window.__pendingNuelliePrefill=d; try{sessionStorage.setItem('nuelliePendingPrefill',JSON.stringify(d));}catch(e){}
    coreFill(d); const page=d.type==='income'?'income':'expenses'; try{if(typeof showPage==='function')showPage(page);}catch(e){}
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const ok=coreFill(d);
      if(tries>=12||ok){
        clearInterval(timer);
        const pre=d.type==='income'?'i':'e';
        const target=$(pre+'Amt')||$(pre+'Desc');
        if(target){
          try{target.scrollIntoView({behavior:'smooth',block:'center'}); target.focus();}catch(e){}
        }
        toastSafe(ok?'✅ Form filled. Review and save.':'⚠️ I tried to fill the form, but the field write was blocked.');
      }
    },120);
    return true;
  }
  function fmt(d){return (d.currency==='USD'?'$':'GH₵ ')+Number(d.amount||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});}
  function render(out,d,label){ if(!out)return; out.innerHTML='<div class="sms-summary"><b>Parsed '+(d.type==='income'?'Income':'Expense')+' Alert</b><br>Amount: <b>'+fmt(d)+'</b><br>Wallet: '+d.wallet+'<br>Description: '+d.desc+'<br>Category: '+d.cat+(d.txid?'<br>Reference: '+d.txid:'')+'</div><div style="margin-top:8px"><button type="button" class="btn btn-pk btn-sm" onclick="window.NuelliePrefillNow()">✨ Prefill Transaction Form</button></div>'; }
  function runFrom(textId,resultId,kind){const raw=clean($(textId)&&$(textId).value); if(!raw){toastSafe(kind==='email'?'Paste the email alert first.':'Paste an SMS first.');return;} const d=parseAlert(raw); window.__lastParsedAlert=d; window.__lastParsedSMS=d; render($(resultId),d,kind); toastSafe((kind==='email'?'Email':'SMS')+' parsed. Amount: '+fmt(d)+'. Click Prefill Transaction Form.');}
  window.NuelliePrefillNow=function(){return fillForm(window.__lastParsedAlert||window.__lastParsedSMS||window.__pendingNuelliePrefill);};
  window.parseSMS=function(){runFrom('smsText','smsResult','sms');};
  window.prefillSMS=function(d){return fillForm(d||window.__lastParsedAlert||window.__lastParsedSMS);};
  window.parseEmailAlert=function(){runFrom('emailAlertText','emailAlertResult','email');};
  window.prefillEmailAlert=function(){return fillForm(window.__lastParsedAlert);};
  window.parseAlert=window.parseSmsMessage=parseAlert; window.__NUELLIE_ALERT_PARSER_VERSION=VERSION;
  document.addEventListener('click',function(e){const b=e.target.closest&&e.target.closest('button'); if(!b)return; const txt=(b.textContent||'').toLowerCase(); if(/prefill transaction form/.test(txt)){e.preventDefault();e.stopImmediatePropagation();fillForm(window.__lastParsedAlert||window.__lastParsedSMS||window.__pendingNuelliePrefill);}},true);
  // Re-apply pending prefill after any page refresh/re-render.
  document.addEventListener('DOMContentLoaded',()=>{try{const raw=sessionStorage.getItem('nuelliePendingPrefill'); if(raw){const d=JSON.parse(raw); setTimeout(()=>coreFill(d),800);}}catch(e){}});
})();
