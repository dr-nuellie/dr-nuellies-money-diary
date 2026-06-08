
(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const clean = v => String(v || '').replace(/\s+/g,' ').trim();
  const notify = m => { try { typeof toast === 'function' ? toast(m) : console.log(m); } catch(e) { console.log(m); } };
  const fire = el => { if(!el) return; ['input','change','keyup','blur'].forEach(t => { try { el.dispatchEvent(new Event(t,{bubbles:true})); } catch(e){} }); };
  const todayIso = () => { try { return typeof today === 'function' ? today() : new Date().toISOString().slice(0,10); } catch(e){ return new Date().toISOString().slice(0,10); } };
  const escHtml = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function parseAmountToken(token){
    let s = String(token || '').replace(/[^0-9.,]/g,'');
    if(!s) return 0;
    if(s.includes('.') && s.includes(',')) s = s.replace(/,/g,'');
    else if(/,\d{1,2}$/.test(s)) s = s.replace(/,(\d{1,2})$/,'.$1');
    else s = s.replace(/,/g,'');
    return Number(s) || 0;
  }
  function findCurrencyAmounts(raw){
    const s = clean(raw);
    const rx = /(?:GHS|GHC|GH₵|GH¢|₵|USD|US\$|\$)\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi;
    const out = []; let m;
    while((m = rx.exec(s))){
      const val = parseAmountToken(m[1]);
      if(!val) continue;
      const context = s.slice(Math.max(0,m.index-90), Math.min(s.length, rx.lastIndex+110)).toLowerCase();
      let score = 50;
      if(/you have received|received|credited|credit alert|cash in|deposit|salary|inward/.test(context)) score += 160;
      if(/you paid|paid to|sent to|debited|debit alert|cash out|withdraw|purchase|payment/.test(context)) score += 150;
      if(/amount|amt|value|transaction/.test(context)) score += 40;
      if(/balance|available balance|wallet balance|current balance|new balance|closing balance|ledger balance/.test(context)) score -= 1000;
      if(/fee|charge|levy|tax/.test(context)) score -= 250;
      out.push({ amount: val, currency: /usd|us\$|\$/i.test(m[0]) ? 'USD' : 'GHS', score, index: m.index, text: m[0] });
    }
    out.sort((a,b) => b.score - a.score || a.index - b.index);
    return out;
  }
  function parseDate(raw){
    const s = clean(raw); let m = s.match(/\b(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})\b/);
    if(m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
    m = s.match(/\b(\d{1,2})[-\/](\d{1,2})[-\/](20\d{2}|\d{2})\b/);
    if(m){ let y = Number(m[3]); if(y < 100) y += 2000; return `${y}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`; }
    return todayIso();
  }
  function parseType(raw){
    const s = clean(raw).toLowerCase();
    const income = /you have received|received|credited|credit alert|cash in|deposit|paid into|inward|salary|refund|reversal/.test(s);
    const expense = /you paid|paid to|sent to|debited|debit alert|cash out|withdrawn|purchase|payment to|merchant payment|transfer to|fee charged/.test(s);
    if(income && !expense) return 'income';
    if(expense && !income) return 'expense';
    if(/you have received|received from|credited/.test(s)) return 'income';
    return 'expense';
  }
  function parseWallet(raw){
    const s = clean(raw).toLowerCase();
    if(/telecel cash|telecel/.test(s)) return 'Telecel Cash';
    if(/vodafone cash|vodafone|vcash/.test(s)) return 'Vodafone Cash';
    if(/mtn|momo|mobile money/.test(s)) return 'MTN MoMo';
    if(/airteltigo|airtel|tigo/.test(s)) return 'AirtelTigo Money';
    if(/gcb|ghana commercial bank/.test(s)) return 'GCB Bank';
    if(/ecobank/.test(s)) return 'Ecobank';
    if(/stanbic/.test(s)) return 'Stanbic Bank';
    if(/absa/.test(s)) return 'Absa Bank';
    if(/fidelity/.test(s)) return 'Fidelity Bank';
    return 'Bank Account';
  }
  function parseDescription(raw,type){
    const s = clean(raw); let m;
    if(type === 'income'){
      m = s.match(/(?:received|credited)\s+(?:GHS|GHC|GH₵|GH¢|₵|USD|US\$|\$)?\s*[0-9,]+(?:\.\d{1,2})?\s+from\s+(.+?)(?:\s+on\s+20\d{2}[-\/]\d{1,2}[-\/]\d{1,2}|\s+at\s+\d{1,2}:|\.\s*Your\b|\s+Your\b|\s+Reference\b|\s+Ref\b|$)/i)
       || s.match(/\bfrom\s+(.+?)(?:\s+on\s+20\d{2}[-\/]\d{1,2}[-\/]\d{1,2}|\s+at\s+\d{1,2}:|\.\s*Your\b|\s+Your\b|\s+Reference\b|\s+Ref\b|$)/i);
    } else {
      m = s.match(/(?:paid|sent|transferred|debited)\s+(?:GHS|GHC|GH₵|GH¢|₵|USD|US\$|\$)?\s*[0-9,]+(?:\.\d{1,2})?\s+(?:to|for)\s+(.+?)(?:\s+on\s+20\d{2}[-\/]\d{1,2}[-\/]\d{1,2}|\s+at\s+\d{1,2}:|\.\s*Your\b|\s+Your\b|\s+Reference\b|\s+Ref\b|$)/i)
       || s.match(/\b(?:to|beneficiary|recipient|merchant)\s+(.+?)(?:\s+on\s+20\d{2}[-\/]\d{1,2}[-\/]\d{1,2}|\s+at\s+\d{1,2}:|\.\s*Your\b|\s+Your\b|\s+Reference\b|\s+Ref\b|$)/i);
    }
    return clean((m && m[1]) || (type === 'income' ? 'Received funds' : 'Payment')).replace(/[.;,:]+$/,'');
  }
  function parseReference(raw){
    return (clean(raw).match(/\b(?:Reference|Ref|Transaction ID|Txn ID)\s*[:#-]?\s*(.+)$/i) || [])[1] || '';
  }
  function categoryFor(raw,type,desc){
    const t = (raw + ' ' + desc).toLowerCase();
    if(type === 'income'){
      if(/salary|payroll|wage/.test(t)) return 'Salary / Monthly Pay';
      if(/maxprem|enterprise|client|customer|invoice|business|sales|chai/.test(t)) return 'Business / Self-Employment';
      if(/interest|dividend|investment/.test(t)) return 'Investment Returns';
      return 'Other Income';
    }
    if(typeof window.inferSmsCat === 'function') return window.inferSmsCat(t);
    return 'Miscellaneous';
  }
  function parseBankAlert(raw){
    raw = clean(raw);
    const best = findCurrencyAmounts(raw)[0] || {amount:0,currency:'GHS'};
    const type = parseType(raw);
    const desc = parseDescription(raw,type);
    const wallet = parseWallet(raw);
    return {
      type, amount: best.amount, currency: best.currency, wallet,
      accountType: /telecel|vodafone|mtn|momo|mobile money|airteltigo|airtel|tigo/i.test(raw) ? 'MoMo' : (wallet === 'Cash' ? 'Cash' : 'Bank'),
      date: parseDate(raw), desc, counterparty: desc,
      cat: categoryFor(raw,type,desc), txid: parseReference(raw), raw
    };
  }
  function setInput(id,val){
    const el = $(id); if(!el) return false;
    el.value = val == null ? '' : String(val);
    try { el.setAttribute('value', el.value); } catch(e){}
    fire(el); return true;
  }
  function normalise(s){ return clean(s).replace(/^[^A-Za-z0-9]+\s*/,'').toLowerCase(); }
  function setSelect(id,val){
    const el = $(id); if(!el) return false;
    const wanted = clean(val); if(!wanted) return false;
    let opt = [...el.options].find(o => normalise(o.value) === normalise(wanted) || normalise(o.textContent) === normalise(wanted) || normalise(o.textContent).includes(normalise(wanted)) || normalise(wanted).includes(normalise(o.textContent)));
    if(!opt){ opt = document.createElement('option'); opt.value = wanted; opt.textContent = wanted; el.appendChild(opt); }
    el.value = opt.value; fire(el); return true;
  }
  function applyToVisibleForm(d){
    const p = d.type === 'income' ? 'i' : 'e';
    const amount = Number(d.amount || 0).toFixed(2);
    const ok = [];
    ok.push(setInput(p+'Amt', amount));
    ok.push(setInput(p+'Desc', d.desc || d.counterparty || 'Parsed transaction'));
    ok.push(setInput(p+'Date', d.date || todayIso()));
    ok.push(setInput(p+'Notes', (d.txid ? 'Reference: '+d.txid+' | ' : '')+'Parsed '+d.type+' alert'));
    setSelect(p+'Cur', d.currency || 'GHS');
    setSelect(p+'Wal', d.wallet || 'Bank Account');
    setSelect(p+'Cat', d.cat || (d.type === 'income' ? 'Other Income' : 'Miscellaneous'));
    const acct = $(p+'AcctType'); if(acct){ acct.value = d.accountType || ''; fire(acct); }
    return ok.some(Boolean) && $(p+'Amt') && String($(p+'Amt').value) === amount;
  }
  function openPageAndFill(d){
    if(!d || !d.amount){ notify('Parse an alert first.'); return false; }
    window.__lastParsedAlert = d; window.__lastParsedSMS = d;
    try { sessionStorage.setItem('nuelliePendingPrefill', JSON.stringify(d)); } catch(e){}
    const page = d.type === 'income' ? 'income' : 'expenses';
    try { if(typeof window.showPage === 'function') window.showPage(page); } catch(e){}
    let tries = 0, success = false;
    const attempt = () => {
      tries += 1;
      success = applyToVisibleForm(d) || success;
      if(tries >= 12 || success){
        clearInterval(timer);
        const p = d.type === 'income' ? 'i' : 'e';
        const target = $(p+'Amt') || $(p+'Desc');
        if(target){ try{ target.scrollIntoView({behavior:'smooth',block:'center'}); target.focus(); }catch(e){} }
        notify(success ? '✅ Transaction form filled. Review and save.' : '⚠️ The parser read the alert, but could not find the form fields to fill.');
      }
    };
    attempt();
    const timer = setInterval(attempt, 150);
    return true;
  }
  function showParsed(out,d,source){
    if(!out) return;
    if(!d.amount){ out.innerHTML = '<div class="err">Could not detect the transaction amount. Please check the alert text.</div>'; return; }
    const btnText = d.type === 'income' ? '✨ Fill Income Fields' : '✨ Fill Expense Fields';
    out.innerHTML = '<div class="sms-summary"><b>Parsed '+(d.type==='income'?'Income':'Expense')+' Alert</b><br>Amount: <b>'+(d.currency==='USD'?'$':'GH₵ ')+Number(d.amount).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})+'</b><br>Date: '+escHtml(d.date)+'<br>Wallet: '+escHtml(d.wallet)+'<br>Description: '+escHtml(d.desc)+'<br>Category: '+escHtml(d.cat)+(d.txid?'<br>Reference: '+escHtml(d.txid):'')+'</div><div style="margin-top:8px"><button type="button" class="btn btn-pk btn-sm" id="nuellie-'+source+'-fill">'+btnText+'</button></div>';
    setTimeout(() => { const b = $('nuellie-'+source+'-fill'); if(b) b.onclick = function(ev){ if(ev){ev.preventDefault(); ev.stopPropagation();} openPageAndFill(window.__lastParsedAlert || d); }; }, 0);
  }
  window.NuellieParseBankAlert = parseBankAlert;
  window.NuellieFillParsedAlert = openPageAndFill;
  window.parseSMS = function(){
    const raw = clean($('smsText') && $('smsText').value);
    if(!raw){ notify('Paste an SMS first.'); return; }
    const d = parseBankAlert(raw); window.__lastParsedAlert = d; window.__lastParsedSMS = d; showParsed($('smsResult'), d, 'sms');
    notify(d.amount ? 'SMS parsed. Review it, then fill the form.' : 'Could not detect the amount.');
  };
  window.prefillSMS = function(d){ return openPageAndFill(d || window.__lastParsedAlert || window.__lastParsedSMS); };
  window.parseEmailAlert = function(){
    const raw = clean($('emailAlertText') && $('emailAlertText').value);
    if(!raw){ notify('Paste the bank email alert first.'); return; }
    const d = parseBankAlert(raw); window.__lastParsedAlert = d; window.__lastParsedSMS = d; showParsed($('emailAlertResult'), d, 'email');
    notify(d.amount ? 'Email alert parsed. Review it, then fill the form.' : 'Could not detect the amount.');
  };
  window.prefillEmailAlert = function(){ return openPageAndFill(window.__lastParsedAlert || window.__lastParsedSMS); };
  window.parseSmsMessage = parseBankAlert;
  window.parseAlert = parseBankAlert;
  window.__NUELLIE_ALERT_PARSER_VERSION = '';
})();
