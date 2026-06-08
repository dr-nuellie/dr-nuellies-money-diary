
/* 'use strict';
  const VERSION='';
  const $=(id)=>document.getElementById(id);
  const clean=(v)=>String(v||'').replace(/\s+/g,' ').trim();
  const esc=(v)=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dispatch=(el)=>{ if(!el) return; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); };
  function toastSafe(msg){ try{ if(typeof toast==='function') toast(msg); else console.log(msg); }catch(e){ console.log(msg); } }
  function todaySafe(){ try{ return typeof today==='function'?today():new Date().toISOString().slice(0,10); }catch(e){ return new Date().toISOString().slice(0,10); } }
  function parseMoneyNumber(num){
    let s=String(num||'').replace(/[^0-9.,]/g,'');
    if(!s) return 0;
    if(/,\d{1,2}$/.test(s) && !/\.\d{1,2}$/.test(s)) s=s.replace(/,(\d{1,2})$/,'.$1');
    return Number(s.replace(/,/g,''))||0;
  }
  function fmtAlert(n,cur){ return (cur==='USD'?'$':'GH₵ ')+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function parseCurrencyAmounts(raw){
    const s=clean(raw);
    const results=[];
    const patterns=[
      /(?:GHS|GHC|GH₵|GH¢|₵|USD|US\$|\$)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi,
      /([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*(?:GHS|GHC|GH₵|GH¢|₵|USD|US\$|\$)/gi
    ];
    for(const rx of patterns){
      let m; while((m=rx.exec(s))){
        const value=parseMoneyNumber(m[1]);
        if(!value) continue;
        const ctx=s.slice(Math.max(0,m.index-80),Math.min(s.length,m.index+120)).toLowerCase();
        const isBalance=/balance|bal\.?|available|ledger|closing|wallet balance|new balance/.test(ctx);
        const isFee=/fee|charge|levy|tax/.test(ctx);
        const strong=/received|credited|deposited|cash in|sent|paid|debited|withdrawn|transferred|purchase|payment|amount|amt|value/.test(ctx);
        results.push({value,index:m.index,ctx,isBalance,isFee,strong,raw:m[0]});
      }
    }
    return results.sort((a,b)=>a.index-b.index);
  }
  function amountOf(raw){
    const amounts=parseCurrencyAmounts(raw);
    if(!amounts.length) return 0; // Never use long unlabelled reference numbers as money.
    const preferred=amounts.find(a=>a.strong && !a.isBalance && !a.isFee) || amounts.find(a=>!a.isBalance && !a.isFee) || amounts.find(a=>!a.isBalance) || amounts[0];
    return preferred.value;
  }
  function currencyOf(raw){ return /\bUSD\b|US\$|\$/.test(raw)?'USD':'GHS'; }
  function typeOf(raw){
    const s=clean(raw).toLowerCase();
    const inc=/you have received|received|credited|credit alert|cash in|deposit|inward|refund|reversal|salary|interest credited/.test(s);
    const exp=/you paid|paid to|sent to|debited|debit alert|cash out|withdrawn|purchase|payment to|merchant payment|transfer to|fee charged/.test(s);
    if(inc && !exp) return 'income';
    if(exp && !inc) return 'expense';
    if(/you have received|received from|credited/.test(s)) return 'income';
    return 'expense';
  }
  function walletOf(raw){
    const s=clean(raw).toLowerCase();
    if(/telecel\s+cash|telecel/.test(s)) return 'Telecel Cash';
    if(/vodafone\s+cash|vodafone|vcash/.test(s)) return 'Vodafone Cash';
    if(/mtn|momo|mobile money/.test(s)) return 'MTN MoMo';
    if(/airteltigo|airtel|tigo/.test(s)) return 'AirtelTigo Money';
    if(/gcb|ghana commercial bank/.test(s)) return 'GCB Bank';
    if(/ecobank/.test(s)) return 'Ecobank';
    if(/stanbic/.test(s)) return 'Stanbic Bank';
    if(/absa/.test(s)) return 'Absa Bank';
    if(/fidelity/.test(s)) return 'Fidelity Bank';
    return 'Bank Account';
  }
  function dateOf(raw){
    const s=clean(raw); let m=s.match(/\b(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})\b/);
    if(m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
    m=s.match(/\b(\d{1,2})[-\/](\d{1,2})[-\/](20\d{2}|\d{2})\b/);
    if(m){let y=Number(m[3]); if(y<100)y+=2000; return `${y}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;}
    return todaySafe();
  }
  function descOf(raw,type){
    const s=clean(raw); let m;
    if(type==='income'){
      m=s.match(/(?:received|credited)\s+(?:GHS|GHC|GH₵|GH¢|₵|USD|US\$|\$)?\s*[0-9,]+(?:\.\d{1,2})?\s+from\s+(.+?)(?:\s+on\s+20\d{2}[-\/]\d{1,2}[-\/]\d{1,2}|\s+at\s+\d{1,2}:|\.\s*Your\b|\s+Your\b|\s+Ref\b|$)/i)
       || s.match(/\bfrom\s+(.+?)(?:\s+on\s+20\d{2}[-\/]\d{1,2}[-\/]\d{1,2}|\s+at\s+\d{1,2}:|\.\s*Your\b|\s+Your\b|\s+Ref\b|$)/i);
    }else{
      m=s.match(/(?:paid|sent|transferred|debited)\s+(?:GHS|GHC|GH₵|GH¢|₵|USD|US\$|\$)?\s*[0-9,]+(?:\.\d{1,2})?\s+(?:to|for)\s+(.+?)(?:\s+on\s+20\d{2}[-\/]\d{1,2}[-\/]\d{1,2}|\s+at\s+\d{1,2}:|\.\s*Your\b|\s+Your\b|\s+Ref\b|$)/i)
       || s.match(/\b(?:to|paid to|sent to|payment to|merchant|beneficiary|recipient)\s+(.+?)(?:\s+on\s+20\d{2}[-\/]\d{1,2}[-\/]\d{1,2}|\s+at\s+\d{1,2}:|\.\s*Your\b|\s+Your\b|\s+Ref\b|$)/i);
    }
    let d=m&&m[1]?m[1]:(type==='income'?'Received funds':'Payment');
    return d.replace(/^[#:\-\s]+/,'').replace(/\*+/g,'').replace(/[.;,:]+$/,'').trim();
  }
  function refOf(raw){
    const s=clean(raw);
    return (s.match(/\b(?:Ref|Reference|Transaction ID|Txn ID)\s*[:#-]?\s*(.+)$/i)||[])[1]||'';
  }
  function catOf(raw,type,desc){
    const t=(raw+' '+desc).toLowerCase();
    if(type==='income'){
      if(/salary|payroll|wage/.test(t)) return 'Salary / Monthly Pay';
      if(/maxprem|enterprise|client|invoice|sales|business|customer/.test(t)) return 'Business / Self-Employment';
      if(/interest|dividend|coupon|investment/.test(t)) return 'Investment Returns';
      return 'Other Income';
    }
    if(typeof inferSmsCat==='function') return inferSmsCat(t);
    return 'Miscellaneous';
  }
  function parseAlert(raw){
    raw=clean(raw); const type=typeOf(raw); const desc=descOf(raw,type); const cur=currencyOf(raw); const wallet=walletOf(raw);
    return {type,amount:amountOf(raw),currency:cur,wallet,accountType:/telecel|vodafone|mtn|momo|mobile money|airteltigo|airtel|tigo/i.test(raw)?'MoMo':'Bank',date:dateOf(raw),desc,counterparty:desc,cat:catOf(raw,type,desc),txid:refOf(raw),raw,parserVersion:VERSION};
  }
  function setVal(id,val){ const el=$(id); if(!el) return false; el.value=val==null?'':String(val); dispatch(el); return true; }
  function setSelect(id,val){
    const el=$(id); if(!el) return false; const wanted=String(val||'').trim(); if(!wanted) return false;
    const key=wanted.toLowerCase(); let opt=[...el.options].find(o=>String(o.value).toLowerCase()===key || String(o.textContent).trim().toLowerCase()===key || String(o.textContent).replace(/^\S+\s*/,'').trim().toLowerCase()===key);
    if(!opt){ opt=document.createElement('option'); opt.value=wanted; opt.textContent=wanted; el.appendChild(opt); }
    el.value=opt.value; dispatch(el); return true;
  }
  function renderResult(out,d,kind){
    if(!out) return;
    out.innerHTML='<div class="sms-summary"><b>Parsed '+(d.type==='income'?'Income':'Expense')+' Alert</b> <span style="font-size:10px;opacity:.65">'+esc(VERSION)+'</span><br>Amount: <b>'+esc(fmtAlert(d.amount,d.currency))+'</b><br>Wallet: '+esc(d.wallet)+'<br>Description: '+esc(d.desc)+'<br>Category: '+esc(d.cat)+(d.txid?'<br>Reference: '+esc(d.txid):'')+'</div><div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn btn-pk btn-sm" id="'+kind+'PrefillBtn">✨ Prefill Transaction Form</button></div>';
    setTimeout(()=>{ const b=$(kind+'PrefillBtn'); if(b) b.onclick=()=>fillTransactionForm(d); },0);
  }
  function fillTransactionForm(d){
    d=d&&d.amount?d:window.__lastParsedAlert; if(!d||!d.amount){toastSafe('Parse an alert first.');return;}
    const pre=d.type==='income'?'i':'e';
    const page=d.type==='income'?'income':'expenses';
    if(typeof showPage==='function') showPage(page);
    const apply=()=>{
      setVal(pre+'Amt',Number(d.amount).toFixed(2));
      setVal(pre+'Desc',d.desc||d.counterparty||'Parsed transaction');
      setVal(pre+'Date',d.date||todaySafe());
      setVal(pre+'Notes',(d.txid?'Reference: '+d.txid+' | ':'')+'Parsed '+(d.type==='income'?'income':'expense')+' alert');
      setSelect(pre+'Cur',d.currency||'GHS');
      setSelect(pre+'Wal',d.wallet||'Bank Account');
      setSelect(pre+'Cat',d.cat||'Miscellaneous');
      const acct=$(pre+'AcctType'); if(acct){ acct.value=d.accountType||'Bank'; dispatch(acct); }
    };
    apply(); setTimeout(apply,100); setTimeout(apply,350); setTimeout(()=>{
      apply(); const first=$(pre+'Amt')||$(pre+'Desc'); if(first){first.scrollIntoView({behavior:'smooth',block:'center'}); first.focus();}
      toastSafe('✅ Form filled. Review and save.');
    },700);
  }
  window.__NUELLIE_ALERT_PARSER_VERSION=VERSION;
  window.parseSmsMessage=parseAlert;
  window.parseAlert=parseAlert;
  window.parseSMS=function(){
    const raw=clean($('smsText')&&$('smsText').value); if(!raw){toastSafe('Paste an SMS first.');return;}
    const d=parseAlert(raw); window.__lastParsedAlert=d; window.__lastParsedSMS=d; renderResult($('smsResult'),d,'sms'); toastSafe(d.amount?'SMS parsed. Click Prefill Transaction Form.':'Could not detect a currency amount.');
  };
  window.prefillSMS=function(){ fillTransactionForm(window.__lastParsedAlert||window.__lastParsedSMS); };
  window.parseEmailAlert=function(){
    const raw=clean($('emailAlertText')&&$('emailAlertText').value); if(!raw){toastSafe('Paste the bank email alert first.');return;}
    const d=parseAlert(raw); window.__lastParsedAlert=d; renderResult($('emailAlertResult'),d,'email'); toastSafe(d.amount?'Email parsed. Click Prefill Transaction Form.':'Could not detect a currency amount.');
  };
  window.prefillEmailAlert=function(){ fillTransactionForm(window.__lastParsedAlert); };
  window.parseSheetSMS=function(){
    const raw=clean($('quickSheetSmsText')&&$('quickSheetSmsText').value); if(!raw){toastSafe('Paste an SMS alert first.');return;}
    const d=parseAlert(raw); window.__lastParsedAlert=d;
    setSelect('qaType',d.type); setVal('qaAmt',Number(d.amount).toFixed(2)); setVal('qaDesc',d.desc); setSelect('qaCur',d.currency); setSelect('qaWal',d.wallet); setSelect('qaCat',d.cat);
    const qr=$('quickSheetSmsResult'); if(qr) qr.innerHTML='<div class="sms-summary"><b>Quick Add fields filled</b> <span style="font-size:10px;opacity:.65">'+esc(VERSION)+'</span><br>Amount: '+esc(fmtAlert(d.amount,d.currency))+'<br>Description: '+esc(d.desc)+'</div>';
    toastSafe('✅ Quick Add fields filled. Review and record.');
  };
  window.parseQuickSMS=window.parseSheetSMS;
  document.addEventListener('click',function(e){
    const t=e.target.closest && e.target.closest('button'); if(!t) return;
    const txt=(t.textContent||'').toLowerCase();
    if(/prefill transaction form/.test(txt) && (window.__lastParsedAlert||window.__lastParsedSMS)){ e.preventDefault(); fillTransactionForm(window.__lastParsedAlert||window.__lastParsedSMS); }
  },true);
})();
