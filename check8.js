
(function(){
  const PATCH_VERSION='1.1.2';
  function qs(s,r=document){return r.querySelector(s)}
  function qsa(s,r=document){return Array.from(r.querySelectorAll(s))}
  function el(id){return document.getElementById(id)}
  function moneyNumber(x){return Math.abs(parseFloat(String(x||'').replace(/[^0-9.-]/g,''))||0)}
  function safeEsc(v){return (window.esc?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])))}

  function addV112Css(){
    if(el('v112css'))return;
    const st=document.createElement('style'); st.id='v112css'; st.textContent=`
      /* 'function')closeSidebar(); const s=el('sidebar'),o=el('sideOverlay'); if(s)s.classList.remove('open'); if(o)o.classList.remove('open'); document.body.classList.remove('sidebar-open'); }catch(e){}}
  function addSidebarHandlers(){
    if(window.__v112Sidebar)return; window.__v112Sidebar=true;
    document.addEventListener('click',function(e){const n=e.target.closest&&e.target.closest('.nav-link[data-page]'); if(n){setTimeout(forceCloseSidebar,70); setTimeout(forceCloseSidebar,260);}},true);
    let sx=0,sy=0,tracking=false,mode='';
    document.addEventListener('touchstart',e=>{const t=e.touches&&e.touches[0]; if(!t)return; sx=t.clientX; sy=t.clientY; const side=el('sidebar'); const open=side&&side.classList.contains('open'); if(sx<24){tracking=true;mode='open';} else if(open&&sx>80){tracking=true;mode='close';}},{passive:true});
    document.addEventListener('touchmove',e=>{if(!tracking)return; const t=e.touches&&e.touches[0]; if(!t)return; const dx=t.clientX-sx, dy=Math.abs(t.clientY-sy); if(dy>55)return; if(mode==='open'&&dx>55){tracking=false; if(typeof openSidebar==='function')openSidebar();} if(mode==='close'&&dx<-55){tracking=false; forceCloseSidebar();}},{passive:true});
    document.addEventListener('touchend',()=>{tracking=false;},{passive:true});
  }

  function inferBetterCat(text,type){
    const s=String(text||'').toLowerCase();
    const rules=[
      ['Food / Groceries',/\b(bread|rice|yam|tomato|onion|egg|eggs|milk|water|provision|provisions|grocery|groceries|market|supermarket|shoprite|melcom food|foodstuff|meat|fish|chicken|vegetable|fruit|breakfast|lunch|dinner|restaurant|kfc|pizza|takeaway|snack|kenkey|waakye|banku|fufu)\b/],
      ['Clothing & Accessories',/\b(shoe|shoes|dress|clothes|clothing|shirt|skirt|bag|handbag|purse|watch|jewellery|hair bonnet|heels|sandals|fabric|tailor|seamstress|boutique)\b/],
      ['Transport',/\b(uber|bolt|taxi|trotro|fuel|petrol|diesel|transport|bus|fare|ride|driver|parking)\b/],
      ['Car Maintenance',/\b(car service|servicing|mechanic|tyre|tire|alignment|brake|engine oil|oil change|battery|vulcanizer|spare parts|car wash)\b/],
      ['Utilities',/\b(ecg|electricity|power|water bill|utility|prepaid|ghana water|dstv|internet|wifi|broadband|airtime|data bundle|bundle)\b/],
      ['Health / Medical',/\b(pharmacy|medicine|hospital|clinic|doctor|lab|scan|medical|dental|optical|glasses|drug|prescription)\b/],
      ['Rent / Housing',/\b(rent|landlord|accommodation|apartment|housing|maintenance fee)\b/],
      ['Personal Care',/\b(hair|salon|makeup|spa|nails|barber|skincare|perfume|cosmetic)\b/],
      ['Entertainment',/\b(netflix|spotify|movie|cinema|party|outing|concert|subscription|youtube premium)\b/],
      ['Giving / Donations',/\b(tithe|offering|church|donation|gift|support|charity)\b/]
    ];
    if(type==='income'){
      if(/salary|payroll|allowance|stipend/.test(s))return 'Salary / Monthly Pay';
      if(/interest|dividend|investment|coupon|treasury|t-bill|tbill/.test(s))return 'Investment Returns';
      if(/rent|tenant/.test(s))return 'Rental Income';
      if(/gift|support|sent you|received from/.test(s))return 'Gift / Money Received';
      return 'Other Income';
    }
    for(const [cat,rx] of rules){if(rx.test(s))return cat;}
    return (typeof inferSmsCat==='function'?inferSmsCat(text):'Miscellaneous')||'Miscellaneous';
  }

  function parseAmountStrong(s){
    const vals=[...String(s||'').matchAll(/(?:GHS|GH₵|GHC|₵|USD|US\$|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/gi)].map(m=>({raw:m[0],v:moneyNumber(m[1])})).filter(x=>x.v>0);
    const filtered=vals.filter(x=>!/balance|bal/i.test(x.raw));
    return (filtered[0]||vals[0]||{}).v||0;
  }
  function parser(raw){
    const s=String(raw||'').replace(/\s+/g,' ').trim(), l=s.toLowerCase();
    const amount=(typeof strongestAmount==='function'?strongestAmount(s):0)||parseAmountStrong(s);
    let type='expense';
    if(/\b(credited|credit alert|cr\b|received|deposit|paid into|inward|cash in|has sent you|salary|payroll)\b/i.test(s)&&!/\b(debited|debit alert|dr\b)\b/i.test(s))type='income';
    if(/\b(debited|debit alert|dr\b|paid to|payment|purchase|pos|atm|withdrawn|cash out|sent to|transfer to|momo pay)\b/i.test(s))type='expense';
    let wallet='Bank Account', accountType='Bank';
    if(/mtn|momo|mobile money/i.test(s)){wallet='MTN MoMo';accountType='MoMo';}
    if(/telecel|vodafone cash|voda cash/i.test(s)){wallet='Vodafone Cash';accountType='MoMo';}
    const txid=(s.match(/(?:transaction id|txn id|trans id|reference|ref(?:erence)?|receipt no|external ref|id)[:\s#-]*([A-Z0-9][A-Z0-9\-\/]+)/i)||[])[1]||'';
    let cp='';
    const pats=[/(?:from|by)\s+(.+?)(?:\s+(?:on|at|ref|reference|id|bal|balance)\b|[.,]|$)/i,/(?:to|paid to|sent to|merchant)\s+(.+?)(?:\s+(?:on|at|ref|reference|id|bal|balance)\b|[.,]|$)/i,/(?:description|narration|details)[:\s-]+(.+?)(?:\s+(?:amount|date|ref|balance)\b|$)/i];
    for(const p of pats){const m=s.match(p); if(m&&m[1]){cp=m[1].trim();break;}}
    if(!cp)cp=type==='income'?'Bank/MoMo credit':'Bank/MoMo debit';
    const cat=inferBetterCat(s+' '+cp,type);
    return {type,amount,wallet,accountType,counterparty:cp,txid,cat,raw:s};
  }
  function setSelect(id,value){const x=el(id); if(!x)return; const opts=[...x.options||[]]; let hit=opts.find(o=>o.value===value||o.text===value||o.text.replace(/^\S+\s/,'')===value); if(!hit&&value){const op=document.createElement('option');op.value=value;op.textContent=value;x.appendChild(op);hit=op;} if(hit)x.value=hit.value;}
  function fillMain(d){
    if(!d||!d.amount){toast('Parse the alert first.');return;}
    const p=d.type==='income'?'i':'e'; showPage(d.type==='income'?'income':'expenses');
    setTimeout(()=>{ const set=(id,v)=>{const x=el(id); if(x)x.value=v??''}; set(p+'Desc',d.counterparty||'Parsed transaction'); set(p+'Amt',d.amount); set(p+'Date',typeof today==='function'?today():new Date().toISOString().slice(0,10)); set(p+'Notes',`Parsed alert${d.txid?' | Transaction ID: '+d.txid:''}`); set(p+'Cur','GHS'); setSelect(p+'Wal',d.wallet); setSelect(p+'Cat',d.cat); const ac=el(p+'AcctType'); if(ac)ac.value=d.accountType||''; const first=el(p+'Desc'); if(first){first.focus({preventScroll:true}); first.scrollIntoView({behavior:'smooth',block:'center'});} },80);
    const box=el('smsText'); if(el('smsAutoClear')?.checked&&box)box.value='';
  }
  function fillQuick(d){
    if(!d||!d.amount){toast('Parse the alert first.');return;}
    const set=(id,v)=>{const x=el(id); if(x)x.value=v??''};
    set('qaType',d.type||'expense'); if(typeof buildQuickAddCats==='function')buildQuickAddCats();
    set('qaAmt',d.amount); set('qaDesc',d.counterparty||'Parsed transaction'); set('qaDate',typeof today==='function'?today():new Date().toISOString().slice(0,10)); set('qaCur','GHS'); set('qaNotes',`Parsed alert${d.txid?' | Transaction ID: '+d.txid:''}`); setSelect('qaWal',d.wallet); setSelect('qaCat',d.cat);
    const r=el('quickSheetSmsResult'); if(r)r.innerHTML=`<div class="sms-summary"><b>Quick Add fields filled</b><br>Amount: ${typeof fmt==='function'?fmt(d.amount):d.amount}<br>Category: ${safeEsc(d.cat)}<br>Wallet: ${safeEsc(d.wallet)}<br>Description: ${safeEsc(d.counterparty)}</div>`;
    toast('Quick Add fields filled. Review and save.');
  }
  function renderParsed(container,d,quick){
    if(!container)return; window.__lastParsedAlert=d;
    if(!d.amount){container.innerHTML='<div class="err">Could not detect the transaction amount. Please check that the alert contains the actual transaction amount.</div>';return;}
    const action=quick?'prefillQuickParsedSMS()':'prefillSMS(window.__lastParsedAlert)';
    container.innerHTML=`<div class="sms-summary"><b>Parsed ${d.type==='income'?'Income':'Expense'} Alert</b><br>Amount: ${typeof fmt==='function'?fmt(d.amount):d.amount}<br>Category: ${safeEsc(d.cat)}<br>Wallet: ${safeEsc(d.wallet)}<br>Description: ${safeEsc(d.counterparty)}${d.txid?'<br>Transaction ID: '+safeEsc(d.txid):''}</div><div style="margin-top:8px"><button class="btn btn-pk btn-sm" onclick="${action}">✨ Prefill ${quick?'Quick Add':'Transaction Form'}</button></div>`;
  }
  function overrideParsers(){
    window.parseSmsMessage=parser;
    window.parseSMS=function(){const box=el('smsText'),out=el('smsResult'); const raw=(box?.value||'').trim(); if(!raw){toast('Paste an SMS first.');return;} const d=parser(raw); renderParsed(out,d,false); toast(d.amount?'Alert parsed. Click Prefill Transaction Form.':'Could not detect the amount.');};
    window.prefillSMS=function(d){fillMain(d||window.__lastParsedAlert);};
    window.parseSheetSMS=function(){const t=el('quickSheetSmsText'),r=el('quickSheetSmsResult'); const raw=(t?.value||'').trim(); if(!raw){toast('Paste an SMS alert first.');return;} const d=parser(raw); window.__lastParsedAlert=d; renderParsed(r,d,true); if(d.amount)fillQuick(d); if(el('quickSheetSmsAutoClear')?.checked&&t)t.value='';};
    window.prefillQuickParsedSMS=function(){fillQuick(window.__lastParsedAlert);};
    window.parseQuickSMS=window.parseSheetSMS;
  }

  function resetFieldsWhenSaved(kind,beforeCount){
    let tries=0; const pre=kind==='income'?'i':'e'; const timer=setInterval(()=>{tries++; const closed=!qs('.modal.open'); if((S.transactions||[]).length>beforeCount&&closed){clearInterval(timer); ['Amt','Desc','Notes','Geo','FxRate'].forEach(f=>{const x=el(pre+f); if(x)x.value='';}); const d=el(pre+'Date'); if(d&&typeof today==='function')d.value=today(); const c=el(pre+'Cat'); if(c)c.selectedIndex=0; const cur=el(pre+'Cur'); if(cur)cur.value='GHS'; const ps=el(pre+'ParsedSmsSummary'); if(ps)ps.remove(); const sr=el('smsResult'); if(sr)sr.innerHTML=''; } if(tries>18)clearInterval(timer);},250);
  }
  function wrapSaves(){
    if(!window.__v112SaveWrap&&window.addTxn){window.__v112SaveWrap=true; const old=window.addTxn; window.addTxn=function(type){const n=(S.transactions||[]).length; const r=old.apply(this,arguments); resetFieldsWhenSaved(type,n); return r;};}
    if(!window.__v112QuickWrap&&window.saveQuickSheet){window.__v112QuickWrap=true; const old=window.saveQuickSheet; window.saveQuickSheet=function(){const n=(S.transactions||[]).length; const r=old.apply(this,arguments); let tries=0; const tm=setInterval(()=>{tries++; if((S.transactions||[]).length>n){clearInterval(tm); ['qaAmt','qaDesc','qaNotes'].forEach(id=>{const x=el(id); if(x)x.value='';}); const qd=el('qaDate'); if(qd&&typeof today==='function')qd.value=today(); const qr=el('quickSheetSmsResult'); if(qr)qr.innerHTML='';} if(tries>12)clearInterval(tm);},250); return r;};}
  }

  function renderTxnTable(elId,filter,limit){
    const root=el(elId); if(!root)return; let rows=(S.transactions||[]).filter(filter).sort((a,b)=>(b.date||'').localeCompare(a.date||'')); if(limit)rows=rows.slice(0,limit);
    if(!rows.length){root.innerHTML='<div class="empty"><div class="big">✨</div><p>No entries yet.</p></div>';return;}
    root.innerHTML=`<div class="tx-table-wrap"><table class="tx-table"><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Wallet</th><th>Amount</th><th>Notes</th><th>Actions</th></tr></thead><tbody>${rows.map(t=>`<tr><td>${safeEsc(t.date||'')}</td><td><b>${safeEsc(t.desc||t.cat||'')}</b></td><td>${typeof ce==='function'?ce(t.cat):''} ${safeEsc(t.cat||'')}</td><td>${safeEsc(t.wallet||'')}</td><td class="${t.type==='income'?'ain':'aout'}"><b>${t.type==='income'?'+':'-'}${t.currency==='USD'?'$'+Number(t.rawAmount||t.amount||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})+' = '+(typeof fmt==='function'?fmt(t.amount):t.amount):(typeof fmt==='function'?fmt(t.amount):t.amount)}</b></td><td>${safeEsc(t.notes||'')}</td><td><div class="tx-actions"><button class="btn btn-out btn-xs" onclick="editTxnInline(${t.id})">✏️</button><button class="btn btn-re btn-xs" onclick="delTxn(${t.id})">✕</button></div></td></tr>`).join('')}</tbody></table></div>`;
  }
  function overrideHistory(){window.renderTxnList=renderTxnTable;}

  function addUniqueDescriptions(){
    qsa('#page-analysis .action-desc').forEach(x=>x.remove());
    const pairs=[
      ['#anStats','Use these cards to compare total inflows, spending, net position and number of records for the selected period.'],
      ['#anIncPie','This chart shows which income sources contributed most during the selected period.'],
      ['#anExpPie','This chart shows where your money went by expense category.'],
      ['#anTrend','This trend helps you see whether income is keeping ahead of expenses over time.'],
      ['#anTopExp','These are the categories taking the largest share of your spending.'],
      ['#anInsights','These prompts highlight practical opportunities to reduce spending or improve savings.']
    ];
    pairs.forEach(([sel,text])=>{const target=qs(sel); const card=target&&target.closest('.card'); const ct=card&&qs('.ct',card); if(ct&&!qs(':scope > .sec-desc, :scope > .action-desc, :scope > .calc-note',card)){const p=document.createElement('p');p.className='action-desc calc-note';p.textContent=text;ct.insertAdjacentElement('afterend',p);}});
  }

  function removeOanda(){
    qsa('*').forEach(node=>{ if(node.children.length===0&&/OANDA/i.test(node.textContent||'')){node.textContent=node.textContent.replace(/OANDA[^.]*\.?/gi,'Live rates use a public exchange-rate service when available.');}});
    const src=el('rateSrc'); if(src&&/OANDA/i.test(src.textContent))src.textContent='Live source: Frankfurter / fallback service';
  }
  async function fetchFrankfurter(){
    const status=el('liveRD'), src=el('rateSrc');
    try{
      if(status)status.textContent='Fetching live USD/GHS…';
      const r=await fetch('https://api.frankfurter.dev/v2/rates?base=USD&quotes=GHS',{cache:'no-store'});
      const j=await r.json(); const rate=+(j.rates&&j.rates.GHS);
      if(!rate)throw new Error('No GHS rate returned');
      S.usdRate=rate; window.usdRate=rate; localStorage.setItem('nuellieUSDRate',String(rate)); if(typeof persist==='function')persist(); if(status)status.textContent='GH₵ '+rate.toFixed(4)+' per $1'; if(src)src.textContent='Live source: Frankfurter'; if(typeof refreshAll==='function')refreshAll(); return rate;
    }catch(e){
      try{const r=await fetch('https://open.er-api.com/v6/latest/USD',{cache:'no-store'}); const j=await r.json(); const rate=+(j.rates&&j.rates.GHS); if(!rate)throw new Error('No fallback rate'); S.usdRate=rate; window.usdRate=rate; if(typeof persist==='function')persist(); if(status)status.textContent='GH₵ '+rate.toFixed(4)+' per $1'; if(src)src.textContent='Live source: open.er-api.com fallback'; if(typeof refreshAll==='function')refreshAll(); return rate;}catch(e2){if(status)status.textContent='Live rate unavailable. Manual rate retained.'; if(src)src.textContent='Enter a manual rate if live fetch fails.'; throw e2;}
    }
  }
  function overrideFx(){window.updateLiveFX=fetchFrankfurter; window.fetchLiveRate=fetchFrankfurter; window.updateFxFrankfurter=fetchFrankfurter;}

  function parseDateToken(s){
    s=String(s||'').trim(); let d=new Date(s); if(!isNaN(d))return d.toISOString().slice(0,10);
    const m=s.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/); if(m){let yy=m[3].length===2?'20'+m[3]:m[3]; return `${yy}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;}
    const m2=s.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})/); if(m2){const months='jan feb mar apr may jun jul aug sep oct nov dec'.split(' '); const mo=months.findIndex(x=>m2[2].toLowerCase().startsWith(x))+1; if(mo>0){let yy=m2[3].length===2?'20'+m2[3]:m2[3]; return `${yy}-${String(mo).padStart(2,'0')}-${m2[1].padStart(2,'0')}`;}}
    return typeof today==='function'?today():new Date().toISOString().slice(0,10);
  }
  function improvedSetupMapping(rows){
    window.csvRowsCache=rows; const headers=(rows[0]||[]).map(h=>String(h||'').trim()||'Column'); const opts='<option value="">—</option>'+headers.map((h,i)=>`<option value="${i}">${safeEsc(h)}</option>`).join('');
    ['csvDateCol','csvDescCol','csvDebitCol','csvCreditCol','csvAmountCol','csvTypeCol'].forEach(id=>{const x=el(id); if(x)x.innerHTML=opts;});
    const set=(id,rx)=>{const i=headers.findIndex(h=>rx.test(h)); const x=el(id); if(x&&i>-1)x.value=i;};
    set('csvDateCol',/date|posted|value/i); set('csvDescCol',/narration|description|details|particulars|remark|merchant|transaction/i); set('csvDebitCol',/debit|withdrawal|paid out|money out|dr/i); set('csvCreditCol',/credit|deposit|paid in|money in|cr/i); set('csvAmountCol',/^amount$|transaction amount/i); set('csvTypeCol',/type|drcr|cr\/dr|direction/i);
    const map=el('csvMapBox'); if(map)map.style.display='block'; const prev=el('csvPreview'); if(prev){prev.innerHTML=`<div class="ok" style="margin-bottom:8px;">Extracted ${Math.max(0,rows.length-1)} row(s). All extracted rows are shown below. Map the columns, then click <b>Review Extracted Rows</b> to edit and confirm before saving.</div><div style="overflow-x:auto"><table class="xt"><thead><tr>${headers.map(h=>`<th>${safeEsc(h)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(r=>`<tr>${headers.map((_,i)=>`<td>${safeEsc(r[i]||'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
    const importBtn=[...qsa('button')].find(b=>/Import Statement|Review Extracted Rows/i.test(b.textContent||'')); if(importBtn)importBtn.textContent='🔎 Review Extracted Rows';
  }
  async function readPdfStatement(file){
    const status=el('csvStatus'); if(status)status.textContent='Reading PDF statement…';
    if(typeof pdfjsLib==='undefined'){toast('PDF reader could not load. Try Excel/CSV or reconnect internet.'); if(status)status.textContent='PDF reader unavailable.'; return;}
    try{
      pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise; const rows=[['Date','Description','Debit','Credit','Balance','Reference']];
      for(let p=1;p<=pdf.numPages;p++){
        const page=await pdf.getPage(p); const tc=await page.getTextContent();
        const items=tc.items.map(it=>({s:String(it.str||'').trim(),x:it.transform[4],y:it.transform[5]})).filter(i=>i.s);
        items.sort((a,b)=>Math.abs(b.y-a.y)>2?b.y-a.y:a.x-b.x);
        const lines=[]; for(const it of items){let ln=lines.find(l=>Math.abs(l.y-it.y)<3.5); if(!ln){ln={y:it.y,items:[]}; lines.push(ln);} ln.items.push(it);}
        for(const ln of lines){ln.items.sort((a,b)=>a.x-b.x); const text=ln.items.map(i=>i.s).join(' ').replace(/\s+/g,' ').trim();
          const dm=text.match(/\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{4}[\/-]\d{1,2}[\/-]\d{1,2}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})\b/); if(!dm)continue;
          const monies=[...text.matchAll(/(?:GHS|GH₵|GHC|₵)?\s*([0-9][0-9,]*(?:\.\d{2}))/g)].map(m=>m[1]); if(!monies.length)continue;
          const low=text.toLowerCase(); let debit='',credit='',balance='';
          if(/\b(cr|credit|deposit|received|money in|paid in)\b/.test(low)&&!/\b(dr|debit)\b/.test(low))credit=monies[0]; else if(/\b(dr|debit|withdrawal|payment|pos|atm|transfer to|paid|money out)\b/.test(low))debit=monies[0]; else if(monies.length>=3){debit=monies[0];credit=monies[1];balance=monies[2];} else {debit=monies[0];}
          if(monies.length>1&&!balance)balance=monies[monies.length-1];
          const desc=text.replace(dm[1],'').replace(/(?:GHS|GH₵|GHC|₵)?\s*[0-9][0-9,]*(?:\.\d{2})/g,'').replace(/\b(debit|credit|balance|bal|dr|cr)\b/gi,'').trim()||'Imported statement entry';
          const ref=(text.match(/(?:ref|reference|txn|transaction|id)[:\s#-]*([A-Z0-9\-\/]+)/i)||[])[1]||'';
          rows.push([parseDateToken(dm[1]),desc,debit,credit,balance,ref]);
        }
      }
      if(rows.length<2){toast('No table rows detected. If this is a scanned PDF, export Excel/CSV or use OCR first.'); if(status)status.textContent='No rows detected.'; return;}
      improvedSetupMapping(rows); if(status)status.textContent=`Extracted ${rows.length-1} row(s). Review all rows before saving.`;
    }catch(e){console.error(e); toast('Could not read this PDF statement.'); if(status)status.textContent='PDF parsing failed.';}
  }
  function overrideStatement(){
    window.setupCSVMapping=improvedSetupMapping;
    const oldLoad=window.loadCSVFile;
    window.loadCSVFile=function(event){const file=event?.target?.files?.[0]; if(file&&/\.pdf$/i.test(file.name))return readPdfStatement(file); return oldLoad?oldLoad(event):undefined;};
  }

  function init112(){addV112Css(); addSidebarHandlers(); overrideParsers(); wrapSaves(); overrideHistory(); addUniqueDescriptions(); removeOanda(); overrideFx(); overrideStatement(); if(typeof refreshAll==='function')refreshAll();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init112); else init112(); window.addEventListener('load',init112);
})();
