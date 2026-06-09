
(function(){
  'use strict';
  const VERSION='1.1.3';
  const $=id=>document.getElementById(id);
  const esc2=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const moneyClean=v=>Math.abs(parseFloat(String(v??'').replace(/[^0-9.\-]/g,''))||0);
  function dmy(iso){
    const s=String(iso||'');
    let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m)return `${m[3]}/${m[2]}/${m[1]}`;
    m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/); if(m){const y=m[3].length===2?'20'+m[3]:m[3];return `${m[1].padStart(2,'0')}/${m[2].padStart(2,'0')}/${y}`;}
    return s;
  }
  function parseDateAny(raw){
    const s=String(raw||'').trim(); if(!s)return (typeof today==='function'?today():new Date().toISOString().slice(0,10));
    let m=s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/); if(m)return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
    m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/); if(m){let y=m[3]; if(y.length===2)y='20'+y; return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;}
    const dt=new Date(s); return isNaN(dt)?(typeof today==='function'?today():new Date().toISOString().slice(0,10)):dt.toISOString().slice(0,10);
  }

  function addCss(){
    if($('nuellie113css'))return;
    const st=document.createElement('style'); st.id='nuellie113css'; st.textContent=`
      .topbar{overflow:visible!important}.tb-inner{display:flex!important;align-items:center!important;gap:8px!important;flex-wrap:wrap!important;overflow:visible!important}.tb-srch-wrap{flex:1 1 260px!important;min-width:220px!important;max-width:none!important;order:0!important}.tb-search{display:flex!important;align-items:center!important;gap:5px!important;overflow:visible!important}.tb-search input{min-width:0!important;flex:1!important}.hbdgs{display:flex!important;gap:6px!important;flex-wrap:wrap!important;overflow:visible!important;max-width:none!important;order:0!important}.hb{min-width:72px!important;flex:0 0 auto!important}.hb .hl{font-size:7.5px!important}.hb .hv{font-size:11px!important}#undoB,#redoB{position:static!important;order:0!important;white-space:nowrap!important;flex:0 0 auto!important}.topbar *{max-width:100%}.toast,.notification,.alert-pill{max-width:calc(100vw - 22px)!important;white-space:normal!important;overflow-wrap:anywhere!important;line-height:1.35!important}.sc{padding:10px 11px!important;min-height:auto!important}.sc .sv{font-size:16px!important}.sc .sl{font-size:10.5px!important}.txi{display:grid!important;grid-template-columns:auto minmax(0,1fr) auto auto!important;gap:8px!important;align-items:center!important}.txi-info{min-width:0!important}.txi-name,.txi-cat{overflow-wrap:anywhere!important}.txi-date{white-space:nowrap!important;font-size:10.5px!important;color:var(--txm)!important}.txi-actions{display:flex;gap:4px;flex-wrap:nowrap}.txi-amt{white-space:normal!important;word-break:break-word!important;max-width:118px}.nuellie-fun-pop{animation:nuelliePop .26s ease both}@keyframes nuelliePop{0%{transform:scale(.96);opacity:.7}65%{transform:scale(1.025);opacity:1}100%{transform:scale(1);opacity:1}}.page.active .card{animation:nuellieFade .18s ease both}@keyframes nuellieFade{from{opacity:.82;transform:translateY(4px)}to{opacity:1;transform:none}}.csv-review-table input,.csv-review-table select{min-width:120px!important}.csv-review-table td{vertical-align:top!important}.rp-item-row{grid-template-columns:1fr 92px 30px!important}.rp-item-name input{width:100%!important}#rpSaveMsg{transition:opacity .25s}.quick-recorded{animation:nuelliePop .24s ease both}
      @media(max-width:650px){.tb-inner{gap:6px!important}.tb-srch-wrap{order:1!important;flex:1 1 100%!important;min-width:0!important}.hbdgs{order:2!important;width:100%!important;justify-content:flex-start!important}.hb{padding:3px 6px!important;min-width:66px!important}.ubtn{font-size:10px!important;padding:5px 7px!important}.txi{grid-template-columns:34px minmax(0,1fr) auto!important;border-radius:12px!important;padding:9px!important}.txi>div[style*="text-align:right"]{grid-column:2/4;text-align:left!important;margin-top:2px}.txi-actions{grid-column:3;grid-row:1/3;align-self:start;flex-direction:column}.txi-amt{max-width:none!important;font-size:12px!important}.fgg,.fgg3{grid-template-columns:1fr!important}.xt{font-size:11px!important}.xt th,.xt td{padding:7px 6px!important}.csv-review-table{min-width:860px}.rp-item-row{grid-template-columns:1fr 82px 28px!important}.sidebar.open~.main-area{pointer-events:none}}
    `; document.head.appendChild(st);
  }

  function navFix(){
    // Only close sidebar on nav-link click - do NOT move undo/redo buttons
    document.querySelectorAll('.nav-link').forEach(btn=>{
      if(btn.dataset.v113)return; btn.dataset.v113='1';
      btn.addEventListener('click',()=>setTimeout(()=>{try{closeSidebar&&closeSidebar();}catch(e){const s=$('sidebar'),o=$('sideOverlay'); if(s)s.classList.remove('open'); if(o)o.classList.remove('open');}},80),true);
    });
  }
  const oldShow=window.showPage;
  window.showPage=function(p){
    const res=oldShow?oldShow.apply(this,arguments):undefined;
    setTimeout(()=>{try{closeSidebar&&closeSidebar();}catch(e){const s=$('sidebar'),o=$('sideOverlay'); if(s)s.classList.remove('open'); if(o)o.classList.remove('open');} navFix();},60);
    return res;
  };
  function swipeClose(){
    if(window.__v113Swipe)return; window.__v113Swipe=1; let sx=0,sy=0,active=false;
    document.addEventListener('touchstart',e=>{const t=e.touches&&e.touches[0]; if(!t)return; sx=t.clientX; sy=t.clientY; const s=$('sidebar'); active=!!(s&&s.classList.contains('open'));},{passive:true});
    document.addEventListener('touchmove',e=>{if(!active)return; const t=e.touches&&e.touches[0]; if(!t)return; const dx=t.clientX-sx, dy=Math.abs(t.clientY-sy); if(dx<-55&&dy<45){active=false; try{closeSidebar();}catch(_){}}},{passive:true});
  }

  const expenseRules = [
    ['Food / Groceries',/\b(bread|tea bread|sugar bread|butter bread|milk|egg|eggs|rice|jollof|waakye|banku|kenkey|fufu|gari|beans|yam|plantain|tomato|tomatoes|onion|pepper|oil|cooking oil|fish|meat|chicken|turkey|sausage|tuna|sardine|shito|vegetable|lettuce|cabbage|fruit|banana|apple|orange|mango|pineapple|water|bottle water|bottled water|sobolo|malt|indomie|noodles|spaghetti|corned beef|cerelac|oats|milo|bournvita|coffee|cocoa|provision|provisions|grocery|groceries|market|supermarket|shoprite|melcom grocery|marina mall supermarket|game groceries)\b/i],
    ['Eating Out',/\b(restaurant|eatery|kfc|pizza|papaye|chicken republic|burger|shawarma|waffle|ice cream|takeout|take away|takeaway|lunch|dinner|breakfast|brunch|cafe|cafeteria|food delivery|bolt food|glovo|pizzaman|chickenman|barbecue|bbq|tilapia joint|chop bar|waakye joint)\b/i],
    ['Clothing & Accessories',/\b(shoe|shoes|sneaker|sneakers|heel|heels|sandals|slippers|bag|handbag|purse|wallet|dress|gown|skirt|shirt|blouse|jeans|trouser|trousers|fabric|cloth|kente|lace|ankara|seamstress|tailor|sewing|watch|jewellery|jewelry|earring|earrings|necklace|bracelet|ring|wig cap|belt|underwear|bra|panties|fashion|boutique)\b/i],
    ['Transport',/\b(fuel|petrol|diesel|lpg|gas station|total|goil|shell|puma|uber|bolt|yango|taxi|trotro|bus|fare|transport|parking|toll|driver|ride|car wash|carwash|tyre|tire|alignment|brake|oil change|mechanic|servicing|spare parts|battery|coolant)\b/i],
    ['Utilities',/\b(electricity|ecg|power|prepaid|water bill|gwcl|utility|utilities|internet|wifi|broadband|mtn fibre|telecel fibre|airteltigo|data bundle|bundle|airtime|credit top up|phone bill|dstv|gotv|startimes)\b/i],
    ['Medical / Pharmacy',/\b(pharmacy|chemist|drug|medicine|medication|hospital|clinic|doctor|consultation|lab test|scan|xray|x-ray|ultrasound|dentist|dental|optical|eye test|glasses|lens|antibiotic|paracetamol|malaria|insurance copay|medical)\b/i],
    ['Beauty / Personal Care',/\b(hair|braids|wig|salon|barber|makeup|cosmetics|nails|manicure|pedicure|spa|skincare|soap|cream|lotion|perfume|deodorant|toiletries|sanitary pad|pads|tampon|toothpaste|toothbrush)\b/i],
    ['Home / Household',/\b(detergent|omo|soap powder|bleach|cleaning|mop|broom|bucket|tissue|toilet roll|furniture|curtain|bedsheet|duvet|pillow|plate|cup|kitchen|gas cylinder|household|homeware|decor|repair|plumber|electrician)\b/i],
    ['Rent / Housing',/\b(rent|landlord|landlady|apartment|housing|service charge|estate dues|maintenance fee|property tax)\b/i],
    ['Education',/\b(school fees|tuition|course|training|books|textbook|stationery|notebook|pen|exam|udemy|coursera|certificate|lesson|classes)\b/i],
    ['Giving / Gifts',/\b(gift|donation|offering|tithe|church|charity|support|funeral contribution|wedding contribution|birthday gift|dash|dashed)\b/i],
    ['Entertainment',/\b(cinema|movie|netflix|spotify|apple music|showmax|youtube premium|outing|concert|event|ticket|club|drinks|bar|lounge)\b/i],
    ['Car Maintenance',/\b(servicing|mechanic|spare part|spares|brake pad|engine oil|oil filter|tyre|tire|wheel|alignment|balancing|battery|wiper|car repair|auto repair|spraying|panel beating|car maintenance)\b/i]
  ];
  const incomeRules = [
    ['Salary / Monthly Pay',/\b(salary|payroll|monthly pay|wages|allowance|stipend|honorarium|per diem|per-diem|sitting allowance)\b/i],
    ['Business Income',/\b(sales|sold|business|customer paid|client paid|invoice paid|income from|proceeds|revenue)\b/i],
    ['Gift / Money Received',/\b(gift received|cash gift|gift from|received from|dash from|support from|money received|momo received)\b/i],
    ['Investment Returns',/\b(dividend|interest|coupon|return|investment|treasury bill|t-bill|mutual fund|fixed deposit|bond)\b/i],
    ['Rental Income',/\b(rent received|rental income|tenant paid|tenant)\b/i],
    ['Refunds / Reimbursements',/\b(refund|reimbursement|reimbursed|cashback|reversal|reversed|returned payment)\b/i]
  ];
  const oldInfer=window.inferSmsCat;
  window.inferSmsCat=function(s){
    const text=String(s||'');
    for(const [cat,rx] of incomeRules){if(rx.test(text))return cat;}
    for(const [cat,rx] of expenseRules){if(rx.test(text))return cat;}
    return oldInfer?oldInfer(text):'Miscellaneous';
  };
  window.inferImportCat=function(desc,type){const c=window.inferSmsCat(desc); if(type==='income'){return incomeRules.some(([cat])=>cat===c)?c:'Other Income';} return c;};

  function smsParse(raw){
    const s=String(raw||'').replace(/\s+/g,' ').trim();
    const amountMatches=[...s.matchAll(/(?:GHS|GHC|GH₵|₵|cedis?|amount:?|amt:?|value:?|USD|US\$|\$)\s*([0-9][0-9,]*(?:\.\d{1,2})?)/ig)].map(m=>moneyClean(m[1])).filter(Boolean);
    const bare=[...s.matchAll(/\b([0-9][0-9,]{2,}(?:\.\d{1,2})?)\b/g)].map(m=>moneyClean(m[1])).filter(n=>n>=1);
    const amount=amountMatches[0]||bare[0]||0;
    const low=s.toLowerCase();
    let type=/\b(received|credited|credit|deposit|paid into|from\b|cash in|money in|reversal|refund)\b/.test(low)&&!/\b(sent|debited|debit|withdrawn|paid to|payment to|purchase|pos|atm|cash out)\b/.test(low)?'income':'expense';
    if(/\b(sent|debited|debit|withdrawn|paid to|payment to|purchase|pos|atm|cash out|transfer to|airtime|bundle)\b/.test(low))type='expense';
    const wallet=/mtn|momo|mobile money/i.test(s)?'MTN MoMo':(/telecel|vodafone/i.test(s)?'Vodafone Cash':(/cash/i.test(s)?'Cash':'Bank Account'));
    const accountType=/momo|mobile money|telecel|vodafone|mtn/i.test(s)?'MoMo':(wallet==='Cash'?'Cash':'Bank');
    const txid=(s.match(/(?:transaction\s*id|trans\s*id|txn\s*id|ref(?:erence)?|financial transaction id|id)[:\s#-]*([A-Z0-9\/-]{5,})/i)||[])[1]||'';
    let cp='';
    const pats=[/\bfrom\s+(.+?)(?:\s+(?:on|at|ref|transaction|txn|new balance|available|bal\b)|\.|$)/i,/\bto\s+(.+?)(?:\s+(?:on|at|ref|transaction|txn|new balance|available|bal\b)|\.|$)/i,/\bfor\s+(.+?)(?:\s+(?:on|at|ref|transaction|txn|new balance|available|bal\b)|\.|$)/i,/\b(?:merchant|beneficiary|sender|recipient)[:\s-]+(.+?)(?:\s+(?:ref|transaction|txn|new balance|available|bal\b)|\.|$)/i];
    for(const rx of pats){const m=s.match(rx); if(m&&m[1]){cp=m[1].replace(/GHS|GHC|GH₵|₵|\d+[\d,.]*/gi,'').trim(); break;}}
    if(!cp)cp=s.replace(/(?:GHS|GHC|GH₵|₵|USD|US\$|\$)\s*[0-9][0-9,]*(?:\.\d{1,2})?/ig,'').slice(0,90).trim()||'Parsed transaction';
    return {type,amount,wallet,accountType,counterparty:cp,txid,cat:window.inferSmsCat(cp+' '+s),raw:s};
  }
  function setSelect(id,val){const el=$(id); if(!el)return; const wanted=String(val||''); let opt=[...el.options].find(o=>o.value===wanted||o.text===wanted||o.text.replace(/^\S+\s/,'')===wanted); if(opt)el.value=opt.value;}
  function fillFullForm(d){
    const p=d.type==='income'?'i':'e'; window.showPage&&showPage(d.type==='income'?'income':'expenses');
    setTimeout(()=>{['Desc','Amt','Date','Notes'].forEach(()=>{}); if($(p+'Desc'))$(p+'Desc').value=d.counterparty||'Parsed transaction'; if($(p+'Amt'))$(p+'Amt').value=d.amount||''; if($(p+'Date'))$(p+'Date').value=typeof today==='function'?today():new Date().toISOString().slice(0,10); if($(p+'Notes'))$(p+'Notes').value=`Parsed alert${d.txid?' | Transaction ID: '+d.txid:''}`; setSelect(p+'Wal',d.wallet); setSelect(p+'Cat',d.cat); setSelect(p+'Cur','GHS'); const ac=$(p+'AcctType'); if(ac)ac.value=d.accountType||''; const first=$(p+'Desc'); if(first){first.scrollIntoView({behavior:'smooth',block:'center'}); first.focus();}},100);
    const t=$('smsText'); if($('smsAutoClear')?.checked&&t)t.value=''; if($('smsResult'))$('smsResult').innerHTML='';
    toast('✅ SMS details filled. Review and save.');
  }
  window.prefillSMS=function(d){fillFullForm(d||window.__lastParsedAlert||{});};
  window.parseSMS=function(){const box=$('smsText'),out=$('smsResult'); const raw=(box?.value||'').trim(); if(!raw){toast('Paste an SMS first.');return;} const d=smsParse(raw); window.__lastParsedAlert=d; if(out)out.innerHTML=`<div class="sms-summary"><b>Parsed ${d.type==='income'?'Income':'Expense'} Alert</b><br>Amount: ${(typeof fmt==='function'?fmt(d.amount):d.amount)}<br>Category: ${esc2(d.cat)}<br>Wallet: ${esc2(d.wallet)}<br>Description: ${esc2(d.counterparty)}${d.txid?'<br>Transaction ID: '+esc2(d.txid):''}</div><div style="margin-top:8px"><button class="btn btn-pk btn-sm" onclick="prefillSMS(window.__lastParsedAlert)">✨ Prefill Transaction Form</button></div>`; toast(d.amount?'SMS parsed. Click Prefill Transaction Form.':'Could not detect the amount.');};
  function fillQuick(d){
    if($('qaType'))$('qaType').value=d.type; if($('qaAmt'))$('qaAmt').value=d.amount||''; if($('qaDesc'))$('qaDesc').value=d.counterparty||'Parsed transaction'; if($('qaDate'))$('qaDate').value=typeof today==='function'?today():new Date().toISOString().slice(0,10); if($('qaNotes'))$('qaNotes').value=`Parsed alert${d.txid?' | Transaction ID: '+d.txid:''}`; setSelect('qaWal',d.wallet); setSelect('qaCat',d.cat); setSelect('qaCur','GHS');
    let r=$('quickSheetSmsResult'); const box=$('qaSmsBox'); if(!r&&box){r=document.createElement('div');r.id='quickSheetSmsResult';r.style.marginTop='8px';box.appendChild(r);} if(r)r.innerHTML=`<div class="sms-summary"><b>Quick Add fields filled</b><br>Amount: ${(typeof fmt==='function'?fmt(d.amount):d.amount)}<br>Category: ${esc2(d.cat)}<br>Wallet: ${esc2(d.wallet)}<br>Description: ${esc2(d.counterparty)}</div>`;
  }
  window.parseSheetSMS=function(){const t=$('quickSheetSmsText'); const raw=(t?.value||'').trim(); if(!raw){toast('Paste an SMS alert first.');return;} const d=smsParse(raw); window.__lastParsedAlert=d; fillQuick(d); if($('quickSheetSmsAutoClear')?.checked&&t)t.value=''; toast('✅ Quick Add fields filled. Review and record.');};

  window.renderTxnList=function(elId,filter,limit){
    const el=$(elId); if(!el)return; let txns=(S.transactions||[]).filter(filter).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))); if(limit)txns=txns.slice(0,limit);
    if(!txns.length){el.innerHTML='<div class="empty"><div class="big">✨</div><p>No entries yet.</p></div>';return;}
    el.innerHTML=txns.map(t=>{const id=String(t.id); const amt=t.currency==='USD'?'$'+(+(t.rawAmount||0)).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})+' → '+(typeof fmt==='function'?fmt(t.amount):t.amount):(typeof fmt==='function'?fmt(t.amount):t.amount);return `<div class="txi nuellie-fun-pop" onclick="editTxnInline('${esc2(id)}')"><div class="txico" style="background:${t.type==='income'?'var(--gr-l)':'var(--red-l)'}">${typeof ce==='function'?ce(t.cat):''}</div><div class="txi-info"><div class="txi-name">${esc2(t.desc||t.cat||'Transaction')}</div><div class="txi-cat"><span class="badge ${t.type==='income'?'bgr':'bre'}">${typeof ce==='function'?ce(t.cat):''} ${esc2(t.cat||'')}</span> · ${esc2(t.wallet||'')} ${t.accountType?' · '+esc2(t.accountType):''}</div></div><div style="text-align:right"><div class="txi-amt ${t.type==='income'?'ain':'aout'}">${t.type==='income'?'+':'-'}${amt}</div><div class="txi-date">${dmy(t.date)}</div></div><div class="txi-actions"><button class="btn btn-out btn-xs" onclick="event.stopPropagation();editTxnInline('${esc2(id)}')">✏️</button><button class="btn btn-re btn-xs" onclick="event.stopPropagation();delTxn('${esc2(id)}')">✕</button></div></div>`}).join('');
  };

  const oldEdit=window.editTxnInline;
  window.editTxnInline=function(id){
    const t=(S.transactions||[]).find(x=>String(x.id)===String(id)); if(!t){toast('Could not find this transaction.');return;}
    return oldEdit?oldEdit.call(this,id):undefined;
  };
  const oldAddTxn=window.addTxn;
  window.addTxn=function(type){const res=oldAddTxn?oldAddTxn.apply(this,arguments):undefined; setTimeout(()=>{const pre=type==='income'?'i':'e'; ['Desc','Amt','Notes','FxRate'].forEach(k=>{const x=$(pre+k); if(x)x.value='';}); const sr=$('smsResult'); if(sr)sr.innerHTML=''; const qs=$('quickSheetSmsResult'); if(qs)qs.innerHTML='';},250); return res;};
  const oldAddQuick=window.addQuick;
  if(oldAddQuick)window.addQuick=function(){const res=oldAddQuick.apply(this,arguments); setTimeout(()=>{['qaAmt','qaDesc','qaNotes','quickSheetSmsText'].forEach(id=>{const x=$(id); if(x)x.value='';}); const r=$('quickSheetSmsResult'); if(r)r.innerHTML=''; toast('✅ Quick entry recorded.');},250); return res;};

  async function loadExcelAllSheets(file){
    const status=$('csvStatus'); if(status)status.textContent='Reading all sheets…';
    const wb=XLSX.read(new Uint8Array(await file.arrayBuffer()),{type:'array'}); const all=[]; let header=null;
    for(const name of wb.SheetNames){const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:false}).filter(r=>(r||[]).some(c=>String(c||'').trim())); if(!rows.length)continue; if(!header){header=rows[0]; all.push(header);} all.push(...rows.slice(1).map(r=>{const copy=[...r]; copy.__sheet=name; return copy;}));}
    if(all.length<2){toast('Excel file appears empty.');return;} window.csvRowsCache=all; setupCSVMapping(all); setTimeout(()=>{try{importCSVRows();}catch(e){}},50); if(status)status.textContent=`Extracted ${all.length-1} row(s) from ${wb.SheetNames.length} sheet(s). Review and edit before saving.`;
  }
  function improvedSetup(rows){
    if(!rows||!rows.length)return; const headers=rows[0].map(h=>String(h||'').trim()||'Column'); const opts='<option value="">—</option>'+headers.map((h,i)=>`<option value="${i}">${esc2(h)}</option>`).join('');
    ['csvDateCol','csvDescCol','csvDebitCol','csvCreditCol','csvAmountCol','csvTypeCol'].forEach(id=>{const el=$(id); if(el)el.innerHTML=opts;});
    const set=(id,rx)=>{const i=headers.findIndex(h=>rx.test(h));if(i>-1&&$(id))$(id).value=i;};
    set('csvDateCol',/date|posted|value/i); set('csvDescCol',/narration|description|details|particulars|remark|transaction/i); set('csvDebitCol',/debit|withdrawal|paid out|money out|dr/i); set('csvCreditCol',/credit|deposit|paid in|money in|cr/i); set('csvAmountCol',/^amount|amt/i); set('csvTypeCol',/type|drcr|cr\/dr|direction/i);
    const map=$('csvMapBox'); if(map)map.style.display='block';
    const pv=$('csvPreview'); if(pv)pv.innerHTML=`<div class="ok">Extracted ${rows.length-1} row(s). All rows will be converted into an editable review table. Confirm accuracy before saving.</div><div style="overflow-x:auto"><table class="xt"><thead><tr>${headers.map(h=>`<th>${esc2(h)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(r=>`<tr>${headers.map((_,i)=>`<td>${esc2(r[i]||'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  window.setupCSVMapping=improvedSetup;
  const oldLoadCSV=window.loadCSVFile;
  window.loadCSVFile=function(event){const file=event?.target?.files?.[0]; if(!file)return; if(/\.(xls|xlsx)$/i.test(file.name)&&typeof XLSX!=='undefined')return loadExcelAllSheets(file); if(/\.pdf$/i.test(file.name))return readPdfBetter(file); return oldLoadCSV?oldLoadCSV(event):undefined;};
  const oldImport=window.importCSVRows;
  window.importCSVRows=function(){
    const res=oldImport?oldImport.apply(this,arguments):undefined;
    setTimeout(()=>{const tb=$('csvPreview'); if(tb)tb.classList.add('csv-review-table');},80);
    return res;
  };
  async function readPdfBetter(file){
    const status=$('csvStatus'); if(status)status.textContent='Reading PDF statement…'; if(typeof pdfjsLib==='undefined'){toast('PDF reader unavailable.');return;}
    try{pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise; const rows=[['Date','Description','Debit','Credit','Balance','Reference']];
      for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p); const tc=await page.getTextContent(); const items=tc.items.map(it=>({s:String(it.str||'').trim(),x:it.transform[4],y:it.transform[5]})).filter(i=>i.s); items.sort((a,b)=>Math.abs(b.y-a.y)>4?b.y-a.y:a.x-b.x); const lines=[]; for(const it of items){let ln=lines.find(l=>Math.abs(l.y-it.y)<4.5); if(!ln){ln={y:it.y,items:[]}; lines.push(ln);} ln.items.push(it);} for(const ln of lines){ln.items.sort((a,b)=>a.x-b.x); const text=ln.items.map(i=>i.s).join(' ').replace(/\s+/g,' ').trim(); const dm=text.match(/\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{4}[\/-]\d{1,2}[\/-]\d{1,2})\b/); if(!dm)continue; const amounts=[...text.matchAll(/(?:GHS|GH₵|GHC|₵)?\s*([0-9][0-9,]*(?:\.\d{2}))/g)].map(m=>m[1]); if(!amounts.length)continue; const low=text.toLowerCase(); let debit='',credit='',balance=''; if(/\b(cr|credit|deposit|received|money in|paid in)\b/.test(low))credit=amounts[0]; else debit=amounts[0]; if(amounts.length>1)balance=amounts[amounts.length-1]; const desc=text.replace(dm[1],'').replace(/(?:GHS|GH₵|GHC|₵)?\s*[0-9][0-9,]*(?:\.\d{2})/g,'').replace(/\b(debit|credit|balance|bal|dr|cr)\b/gi,'').trim()||'Imported statement entry'; rows.push([parseDateAny(dm[1]),desc,debit,credit,balance,'']); }}
      if(rows.length<2){toast('No editable rows detected. Scanned PDFs need OCR or an Excel/CSV export.'); if(status)status.textContent='No rows detected.'; return;} window.csvRowsCache=rows; setupCSVMapping(rows); setTimeout(()=>{try{importCSVRows();}catch(e){}},80); if(status)status.textContent=`Extracted ${rows.length-1} row(s). Review and edit before saving.`;
    }catch(e){console.error(e); toast('Could not read this PDF statement.'); if(status)status.textContent='PDF parsing failed.';}
  }

  function receiptHeuristic(text){
    const cats=(typeof getExpCats==='function'?getExpCats():['Miscellaneous','Food / Groceries','Eating Out','Shopping']); const skip=/\b(total|subtotal|sub total|tax|vat|change|cash|card|visa|mastercard|balance|amount due|receipt|invoice|thank you)\b/i; const rows=[];
    String(text||'').split(/\n+/).forEach((line,idx)=>{let s=line.replace(/\s+/g,' ').trim(); if(s.length<4||skip.test(s))return; const m=s.match(/(.+?)\s+(?:GHS|GH₵|₵)?\s*([0-9][0-9,]*(?:\.\d{2})?)\s*$/i); if(!m)return; const amt=moneyClean(m[2]); if(!amt||amt>100000)return; const name=m[1].replace(/^\d+\s*x\s*/i,'').trim(); if(!name||/^[\d\W]+$/.test(name))return; rows.push({id:Date.now()+idx,name,amount:amt,category:window.inferSmsCat(name),keep:true});});
    return rows.slice(0,60);
  }
  window.parseReceiptAI=async function(){
    const statusBox=$('rpStatus'), statusText=$('rpStatusText'), review=$('rpReviewWrap'); if(statusBox)statusBox.style.display='block'; if(statusText)statusText.textContent='Scanning receipt image…';
    try{let text=''; if(window.rpImageBase64&&typeof Tesseract!=='undefined'){const data='data:'+(window.rpImageType||'image/png')+';base64,'+window.rpImageBase64; const out=await Tesseract.recognize(data,'eng'); text=out?.data?.text||'';} const items=receiptHeuristic(text); window.rpParsedItems=items.length?items:[{id:Date.now(),name:'Receipt item',amount:0,category:'Miscellaneous',keep:true}]; if(typeof renderRPItems==='function')renderRPItems(); if(review)review.style.display='block'; if(statusText)statusText.textContent=items.length?`Found ${items.length} possible item(s). Please review and edit before saving.`:'Could not confidently read items. Edit the row manually.'; setTimeout(()=>{if(statusBox)statusBox.style.display='none';},2500);
    }catch(e){console.error(e); if(statusText)statusText.textContent='Could not read this image. You can still enter the receipt item manually.'; setTimeout(()=>{if(statusBox)statusBox.style.display='none';},2500);}
  };
  window.renderRPItems=function(){const el=$('rpItemsTable'); if(!el)return; const cats=(typeof getExpCats==='function'?getExpCats():['Miscellaneous']); const items=(window.rpParsedItems||[]).filter(x=>x.keep!==false); if(!items.length){el.innerHTML='<div class="warn">No items extracted yet.</div>';return;} const total=items.reduce((s,i)=>s+(+i.amount||0),0); el.innerHTML=items.map((it,i)=>`<div class="rp-item-row" data-rpid="${it.id}"><div><div class="rp-item-name"><input value="${esc2(it.name)}" onchange="rpUpdateName(${it.id},this.value)"></div><div class="rp-item-cat"><select onchange="rpUpdateCat(${it.id},this.value)">${cats.map(c=>`<option value="${esc2(c)}"${c===it.category?' selected':''}>${typeof ce==='function'?ce(c):''} ${esc2(c)}</option>`).join('')}</select></div></div><input type="number" value="${+it.amount||0}" step="0.01" onchange="rpUpdateAmt(${it.id},this.value)"><button class="rp-item-del" onclick="rpRemoveItem(${it.id})">✕</button></div>`).join('')+`<div class="rp-total-row"><span>Total (${items.length})</span><span>GH₵ ${total.toFixed(2)}</span></div>`;};
  window.rpUpdateName=function(id,v){const it=(window.rpParsedItems||[]).find(x=>String(x.id)===String(id)); if(it)it.name=v;};
  window.rpUpdateAmt=function(id,v){const it=(window.rpParsedItems||[]).find(x=>String(x.id)===String(id)); if(it)it.amount=moneyClean(v);};
  const oldRpSave=window.rpSaveAll;
  if(oldRpSave)window.rpSaveAll=function(){const r=oldRpSave.apply(this,arguments); setTimeout(()=>{const msg=$('rpSaveMsg'); if(msg){msg.classList.add('quick-recorded'); setTimeout(()=>{msg.style.opacity='0'; setTimeout(()=>{msg.style.display='none'; msg.style.opacity='';},300);},2200);}},100); return r;};

  window.fetchRate=async function(){const show=(rate,src)=>{window.usdRate=rate; S.usdRate=rate; S.usdRateSource=src; S.usdRateFetchedAt=new Date().toISOString(); persist&&persist(); const live=$('liveRD'),srcEl=$('rateSrc'),hero=$('hURate'),hb=$('hUbox'),inp=$('usdRI'); if(live)live.textContent='GH₵ '+rate.toFixed(4)+' per $1'; if(srcEl)srcEl.textContent='Source: '+src; if(hero)hero.textContent=rate.toFixed(2); if(hb)hb.style.display=''; if(inp)inp.value=rate.toFixed(4); try{loadWals();updNW();renderNWB();renderWalChart();}catch(e){}}; try{let r=await fetch('https://api.frankfurter.dev/v2/rates?base=USD&quotes=GHS',{cache:'no-store'}); let j=await r.json(); let rate=+(j.rates&&j.rates.GHS); if(!rate)throw 0; show(rate,'Frankfurter');}catch(e){try{let r=await fetch('https://open.er-api.com/v6/latest/USD',{cache:'no-store'}); let j=await r.json(); let rate=+(j.rates&&j.rates.GHS); if(!rate)throw 0; show(rate,'ExchangeRate fallback');}catch(e2){const live=$('liveRD'),srcEl=$('rateSrc'); if(live)live.textContent='Live rate unavailable. Manual rate retained.'; if(srcEl)srcEl.textContent='Source: Manual fallback'; toast('Live FX unavailable. Manual rate retained.');}}};
  window.updateLiveFX=window.fetchRate; window.fetchLiveRate=window.fetchRate; window.updateFxFrankfurter=window.fetchRate;

  function advisorUpdate(){window.NUELLIE_FEATURES={version:VERSION,features:['income and expenses','wallets','quick add','SMS parser','email alert parser','statement import for CSV Excel PDF','receipt parser with OCR fallback','investments','assets','subscriptions','planner and goals','budgets','analysis ranges','reports','undo and redo','PWA updates','live FX with Frankfurter fallback']};}
  function init(){addCss(); navFix(); swipeClose(); advisorUpdate(); const qbox=$('qaSmsBox'); if(qbox&&!$('quickSheetSmsResult')){const d=document.createElement('div');d.id='quickSheetSmsResult';d.style.marginTop='8px';qbox.appendChild(d);} if($('appVersion'))$('appVersion').textContent='v'+VERSION; if(typeof refreshAll==='function')refreshAll();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init(); window.addEventListener('load',init);
})();

/* '').replace(/[,₵GHSghc ]/g,'').match(/-?\d+(?:\.\d+)?/)||[0])[0]||0;}
  function categoriseReceiptItem(name){
    if(typeof inferSmsCat==='function')return inferSmsCat(name);
    const s=String(name||'').toLowerCase();
    if(/bread|rice|milk|egg|fish|meat|chicken|oil|tomato|pepper|onion|yam|plantain|grocery|food/.test(s))return 'Food / Groceries';
    if(/drug|pharmacy|medicine|hospital|clinic/.test(s))return 'Medical / Pharmacy';
    if(/fuel|petrol|diesel|bolt|uber|taxi|transport/.test(s))return 'Transport';
    if(/shoe|dress|bag|hair|makeup|clothes|clothing/.test(s))return 'Clothing & Accessories';
    return 'Miscellaneous';
  }
  function receiptHeuristicV115(text){
    const rows=[]; const skip=/\b(total|subtotal|sub total|tax|vat|change|cash|card|visa|mastercard|balance|amount due|receipt|invoice|thank you|tel|phone|tin|served by)\b/i;
    String(text||'').split(/\n+/).forEach((line,idx)=>{
      let s=line.replace(/\s+/g,' ').trim();
      if(s.length<4||skip.test(s))return;
      let m=s.match(/(.+?)\s+(?:GHS|GH₵|GHC|₵)?\s*([0-9][0-9,]*(?:\.\d{2})?)\s*$/i);
      if(!m)m=s.match(/(.+?)\s+([0-9][0-9,]+)$/i);
      if(!m)return;
      const amt=moneyNum(m[2]); if(!amt||amt>100000)return;
      const name=m[1].replace(/^\d+\s*x\s*/i,'').replace(/^[-*•]+/,'').trim();
      if(!name||/^[\d\W]+$/.test(name))return;
      rows.push({id:Date.now()+idx,name,amount:amt,category:categoriseReceiptItem(name),keep:true});
    });
    return rows.slice(0,80);
  }
  window.parseReceiptAI=async function(){
    const statusBox=$id('rpStatus'), statusText=$id('rpStatusText'), review=$id('rpReviewWrap'), preview=$id('rpPreviewWrap');
    if(!window.rpImageBase64&&!window.rpFileObject){toast('Please upload a receipt file first.');return;}
    if(statusBox)statusBox.style.display='block'; if(statusText)statusText.textContent='Reading uploaded receipt…'; if(review)review.style.display='none';
    try{
      let text=''; const file=window.rpFileObject;
      if(file && /pdf/i.test(file.type||file.name||'') && typeof pdfjsLib!=='undefined'){
        if(statusText)statusText.textContent='Reading PDF receipt text…';
        pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
        for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p); const tc=await page.getTextContent(); text+='\n'+tc.items.map(i=>i.str||'').join('\n');}
      }else if(window.rpImageBase64 && typeof Tesseract!=='undefined'){
        if(statusText)statusText.textContent='Scanning image with OCR…';
        const data='data:'+(window.rpImageType||'image/png')+';base64,'+window.rpImageBase64;
        const out=await Tesseract.recognize(data,'eng'); text=out?.data?.text||'';
      }
      const items=receiptHeuristicV115(text);
      window.rpParsedItems=rpParsedItems=items.length?items:[{id:Date.now(),name:'Receipt item',amount:0,category:'Miscellaneous',keep:true}];
      if(typeof renderRPItems==='function')renderRPItems(); if(review)review.style.display='block'; if(preview)preview.style.display='block';
      if(statusText)statusText.textContent=items.length?`Found ${items.length} possible item(s). Review and edit before saving.`:'Could not confidently extract items. Edit the row manually before saving.';
      setTimeout(()=>{if(statusBox)statusBox.style.display='none';},3200);
    }catch(e){console.error(e); if(statusText)statusText.textContent='Could not read this receipt. Edit the row manually before saving.'; window.rpParsedItems=rpParsedItems=[{id:Date.now(),name:'Receipt item',amount:0,category:'Miscellaneous',keep:true}]; if(typeof renderRPItems==='function')renderRPItems(); if(review)review.style.display='block'; setTimeout(()=>{if(statusBox)statusBox.style.display='none';},3200);}
  };
  // Do NOT override parseReceiptWithAI — the main AI-first version is already set
  const zone=$id('rpUploadZone');
  if(zone){
    zone.addEventListener('paste',e=>{const file=[...(e.clipboardData?.files||[])][0]; if(file){e.preventDefault(); rpLoadFile(file);}},true);
    zone.tabIndex=0;
  }
  document.addEventListener('paste',e=>{const active=document.activeElement; const inReceipt=active&&($id('tool-receipt-parser')?.contains(active)||active?.id==='rpUploadZone'); if(!inReceipt)return; const file=[...(e.clipboardData?.files||[])][0]; if(file){e.preventDefault(); rpLoadFile(file);}},true);
})();


/* '1.1.6';
  const $=id=>document.getElementById(id);
  function addStyle(){
    if($('v116-style'))return;
    const st=document.createElement('style');st.id='v116-style';st.textContent=`
      /* Restore the original desktop navbar arrangement from the reference image */
      .topbar{background:var(--hdr)!important;padding:9px 14px!important;display:flex!important;align-items:center!important;gap:9px!important;flex-wrap:nowrap!important;position:sticky!important;top:0!important;z-index:900!important;box-shadow:0 2px 10px rgba(173,20,87,.25)!important;overflow:visible!important;max-width:100%!important;}
      .topbar::before{content:''!important;position:absolute!important;inset:0!important;background-image:radial-gradient(circle,rgba(255,255,255,.1) 1.5px,transparent 1.5px)!important;background-size:18px 18px!important;pointer-events:none!important;}
      .topbar::after{content:''!important;position:absolute!important;bottom:0!important;left:0!important;right:0!important;height:2.5px!important;background:repeating-linear-gradient(90deg,#FF6B9D 0,#FF6B9D 18px,#FFD93D 18px,#FFD93D 36px,#4ECDC4 36px,#4ECDC4 54px,#C77DFF 54px,#C77DFF 72px)!important;}
      .tb-inner{position:relative!important;z-index:2!important;display:flex!important;align-items:center!important;gap:9px!important;width:100%!important;flex-wrap:nowrap!important;overflow:visible!important;max-width:100%!important;}
      .tb-title-wrap{display:flex!important;align-items:center!important;gap:8px!important;flex:0 0 auto!important;min-width:0!important;}
      .tb-title{display:block!important;font-family:'Pacifico',serif!important;font-size:16px!important;color:#fff!important;white-space:nowrap!important;}
      .tb-srch-wrap{flex:1 1 280px!important;min-width:180px!important;max-width:380px!important;position:relative!important;margin-left:4px!important;}
      .tb-search{display:flex!important;align-items:center!important;background:rgba(255,255,255,.18)!important;border:1.5px solid rgba(255,255,255,.28)!important;border-radius:20px!important;padding:5px 12px!important;gap:7px!important;}
      .hbdgs{display:flex!important;gap:5px!important;flex-wrap:nowrap!important;margin-left:auto!important;overflow:visible!important;width:auto!important;max-width:none!important;justify-content:flex-end!important;order:initial!important;}
      .hb{background:rgba(255,255,255,.17)!important;border:1.5px solid rgba(255,255,255,.28)!important;border-radius:9px!important;padding:4px 9px!important;text-align:right!important;min-width:auto!important;flex:0 0 auto!important;}
      .hb .hl{font-size:8px!important;color:rgba(255,255,255,.8)!important;font-weight:800!important;text-transform:uppercase!important;letter-spacing:.4px!important;}
      .hb .hv{font-size:13px!important;font-weight:800!important;color:#fff!important;}
      .ubtn{background:rgba(255,255,255,.2)!important;border:1.5px solid rgba(255,255,255,.3)!important;color:#fff!important;border-radius:7px!important;padding:5px 9px!important;font-size:11px!important;font-weight:800!important;white-space:nowrap!important;flex:0 0 auto!important;order:initial!important;}
      .hamburger{flex:0 0 auto!important;}
      @media(max-width:820px){
        .topbar{padding:7px 8px!important;overflow:visible!important;}
        .tb-inner{display:grid!important;grid-template-columns:auto 1fr auto auto!important;gap:6px!important;align-items:center!important;overflow:visible!important;}
        .tb-title-wrap{grid-column:2!important;min-width:0!important;overflow:hidden!important;}
        .tb-title{display:block!important;font-size:13px!important;overflow:hidden!important;text-overflow:ellipsis!important;max-width:100%!important;}
        .tb-srch-wrap{grid-column:1 / -1!important;grid-row:2!important;max-width:none!important;min-width:0!important;width:100%!important;margin:0!important;}
        .hbdgs{grid-column:3!important;display:flex!important;gap:3px!important;justify-content:flex-end!important;overflow:visible!important;max-width:none!important;width:auto!important;}
        .hb{padding:3px 6px!important;border-radius:8px!important;}
        .hb .hl{font-size:6.5px!important;line-height:1.1!important;}
        .hb .hv{font-size:10px!important;line-height:1.15!important;}
        .ubtn{grid-column:auto!important;padding:4px 7px!important;font-size:10px!important;}
        .search-results{position:fixed!important;left:8px!important;right:8px!important;top:88px!important;max-height:68vh!important;}
      }
      @media(max-width:520px){
        .tb-inner{grid-template-columns:auto minmax(0,1fr) auto auto!important;}
        .app-logo-img{width:28px!important;height:28px!important;}
        .tb-title{font-size:12px!important;}
        .hbdgs .hb:nth-child(n+3){display:none!important;}
        .hb{padding:3px 5px!important;}
      }
      /* Receipt review must be editable and readable on phone */
      .rp-item-row{display:grid!important;grid-template-columns:1fr 92px 32px!important;gap:8px!important;align-items:center!important;padding:9px!important;border:1px solid var(--bdr)!important;border-radius:10px!important;margin-bottom:7px!important;background:#fff!important;}
      .rp-item-row input,.rp-item-row select{width:100%!important;min-width:0!important;padding:7px 8px!important;border:1.5px solid var(--bdr)!important;border-radius:8px!important;font-size:12px!important;font-family:'Nunito',sans-serif!important;}
      .rp-item-row .rp-item-amt input{text-align:right!important;font-weight:800!important;}
      @media(max-width:520px){.rp-item-row{grid-template-columns:1fr!important}.rp-item-del{justify-self:end!important}.rp-item-amt input{text-align:left!important}}
    `;document.head.appendChild(st);
  }
  function money(v){
    // Fix common OCR character substitutions before parsing
    const s=String(v||'').replace(/[Oo]/g,'0').replace(/[lI]/g,'1').replace(/[Ss]/g,'5');
    const m=s.match(/\d{1,3}(?:[, ]\d{3})*(?:\.\d{1,2})|\d+(?:\.\d{1,2})?/);
    return m?+m[0].replace(/[, ]/g,''):0;
  }
  function categoryForItem(name){
    const s=String(name||'').toLowerCase();
    const rules=[
      ['Food / Groceries',/\b(bread|butter|milk|egg|eggs|rice|spaghetti|noodle|indomie|gari|beans|yam|plantain|tomato|pepper|onion|fish|tuna|sardine|canned fish|meat|beef|chicken|turkey|sausage|oil|palm oil|sugar|salt|flour|oats|cereal|tea|coffee|milo|bournvita|ovaltine|cocoa|chocolate|biscuit|cookie|cracker|wafer|water|bottled water|mineral water|juice|drink|yoghurt|fruit|apple|banana|orange|mango|pineapple|watermelon|vegetable|lettuce|carrot|cabbage|spinach|ginger|garlic|shallot|tomato paste|tin|canned|market|grocery|groceries|provision|provisions|supermarket|shop|shoprite|melcom|game food|palace|koala|maxmart|sobolo|tigernut|groundnut|nut|kenkey|waakye ingredients|fufu flour|plantain flour|corn|maize|millet)\b/i],
      ['Eating Out',/\b(restaurant|pizza|burger|kfc|pizza inn|chicken inn|food delivery|jollof|fried rice|waakye|banku|kenkey|fufu|chop bar|eatery|fast food|lunch|breakfast|dinner|cafe|coffee shop|shawarma|kebab|grilled|tilapia|grilled fish|light soup|palmnut soup|delivery order|glovo|bolt food|uber eats|papaye|papaye burger|ice cream|gelato|waffles|crepe)\b/i],
      ['Transport',/\b(fuel|petrol|diesel|gasoline|goil|total energies|shell|topic oil|oil change|uber|bolt|yango|taxi|trotro|bus|bus fare|fare|transport|parking|toll|highway|road|commute)\b/i],
      ['Car Maintenance',/\b(car wash|mechanic|brake|brake pad|spark plug|wheel alignment|car battery|engine oil|coolant|radiator|vehicle service|car service|tyre|tire|vulcanise|exhaust|gear box|power steering|wiper)\b/i],
      ['Medical / Pharmacy',/\b(pharmacy|drug|drugs|medicine|paracetamol|ibuprofen|amoxicillin|amoxil|antibiotic|metronidazole|flagyl|coartem|malaria|cough syrup|antacid|vitamin|supplement|dettol|hospital|clinic|lab|scan|x-ray|xray|doctor|consultation|prescription|condom|pad|sanitary|band-aid|plaster|thermometer|syrup|tablet|capsule|injection|eye drop|ear drop)\b/i],
      ['Airtime & Mobile Data',/\b(airtime|mtn|telecel|vodafone|airteltigo|data bundle|bundle|recharge|top up|topup|internet bundle|gb data|mb data|smile|surfline)\b/i],
      ['Utilities',/\b(electric|electricity|ecg|power|prepaid unit|credit unit|water bill|gwcl|internet|wifi|broadband|dstv|gotv|startimes|netflix|showmax|youtube premium|spotify|apple music|icloud|google one|subscription fee|monthly fee)\b/i],
      ['Household',/\b(detergent|washing powder|washing liquid|fabric softener|omo|ariel|soap|toilet roll|tissue|tissue paper|bleach|jik|cleaner|mop|broom|bucket|dustbin|plate|cup|glass|knife|fork|spoon|pan|pot|pressure pot|bedsheet|pillow|pillowcase|curtain|furniture|candle|mosquito coil|insecticide|wick|lighter|matchbox|bin bag)\b/i],
      ['Skincare & Makeup',/\b(lotion|body lotion|moisturiser|face cream|sunscreen|foundation|lipstick|lip gloss|mascara|eyeliner|blusher|powder|concealer|serum|toner|face wash|cleanser|exfoliant|body butter|vaseline|nivea|olay|dove|fair lovely|skincare|skin care|perfume|body spray|cologne|deodorant|roll on|antiperspirant|primer|setting spray|eyeshadow)\b/i],
      ['Hair & Beauty',/\b(braids|braid|wig|weave|relaxer|hair|shampoo|conditioner|hair oil|hair cream|edge control|gel|hair gel|salon|barber|barbering|nails|nail polish|acrylic|pedicure|manicure|lashes|eyelash|beauty)\b/i],
      ['Clothing & Accessories',/\b(shoes|shoe|heels|sandals|slippers|dress|dresses|shirt|blouse|skirt|jeans|trousers|shorts|suit|tie|belt|handbag|purse|wallet|watch|jewellery|jewelry|earring|necklace|bracelet|ring|anklet|fabric|cloth|tailor|seamstress|uniform|kaftan|agbada|kente|ankara|sewing)\b/i],
      ['Education',/\b(school fees|tuition|textbook|exercise book|notebook|pen|pencil|ruler|calculator|school bag|uniform|school uniform|stationery|lesson|tutorial|course|exam fee|admission|registration fee|library)\b/i],
      ['Shopping',/\b(mall|shopping mall|melcom|jumia|tonaton|china mall|cosmetic|toiletries|gift|present|toy|gadget|electronics|phone case|charger|earphone|headphone)\b/i]
    ];
    for(const [cat,re] of rules)if(re.test(s))return cat;
    if(typeof inferSmsCat==='function')return inferSmsCat(name)||'Miscellaneous';
    return 'Miscellaneous';
  }
  async function imageToBetterDataUrl(file){
    const url=URL.createObjectURL(file);
    try{
      const img=await new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=url;});
      // Increase max resolution for better OCR accuracy
      const max=2200, scale=Math.min(max/img.width,max/img.height,1)||1;
      const c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);
      const ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);
      const data=ctx.getImageData(0,0,c.width,c.height), d=data.data;
      // Adaptive threshold: use otsu-like binarization for better receipt OCR
      let sum=0;for(let i=0;i<d.length;i+=4)sum+=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
      const avg=sum/(d.length/4);const threshold=Math.max(100,Math.min(180,avg*0.92));
      for(let i=0;i<d.length;i+=4){let g=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2]; g=g>threshold?255:0; d[i]=d[i+1]=d[i+2]=g;}
      ctx.putImageData(data,0,0);
      return c.toDataURL('image/png');
    }finally{URL.revokeObjectURL(url);}
  }
  function parseReceiptText(text){
    const lines=String(text||'').replace(/\r/g,'\n').split(/\n+/).map(x=>x.replace(/[|]/g,' ').replace(/\s{2,}/g,' ').trim()).filter(Boolean);
    // Comprehensive skip patterns for receipt metadata
    const skip=/^(qty|item|description|price|amount|cashier|tel|phone|address|tin|vat|tax|sub\s?total|total|balance|change|cash|card|visa|mastercard|receipt|invoice|thank you|served by|date|time|customer|operator|pos|approval|auth|merchant|branch|no\.?|#|welcome|receipt no|order no|table|server|ref|reference)$/i;
    const skipLine=/\b(grand total|sub total|subtotal|total due|balance due|amount due|change due|cash tendered|cash received|amount paid|vat \d|tax \d|service charge|discount|loyalty|points earned|rewards|hsbc|account|transaction id|terminal id|mid \d|tid \d|auth code|approval code|terminal|batch)\b/i;
    const rows=[];
    for(let i=0;i<lines.length;i++){
      let line=lines[i];
      if(line.length<3||skip.test(line.trim())||skipLine.test(line))continue;
      // Pattern 1: Standard "Item name   12.50"
      let m=line.match(/^(.{2,60}?)\s{2,}(?:GHS|GH[C₵¢]|₵)?\s*([0-9OoIlS][0-9OoIlS, ]*(?:[.,][0-9OoIlS]{1,2})?)$/i);
      // Pattern 2: "Item name : 12.50" or "Item name - 12.50"
      if(!m)m=line.match(/^(.{2,60}?)[\s]*[:\-]\s*(?:GHS|GH[C₵¢]|₵)?\s*([0-9OoIlS][0-9OoIlS, ]*(?:[.,][0-9OoIlS]{1,2})?)$/i);
      // Pattern 3: OCR splits item name and amount to next line
      if(!m&&i+1<lines.length&&/^[\s₵GHSghc0-9OoIlS,.\-]+$/.test(lines[i+1])&&lines[i+1].match(/\d/)){
        m=[null,line,lines[i+1]];i++;
      }
      // Pattern 4: Quantity x price = total format e.g. "Milo 400g 2 x 18.00 36.00"
      if(!m){
        const qtyMatch=line.match(/^(.{2,50}?)\s+(\d+)\s*[xX*]\s*(?:GHS|GH[C₵¢]|₵)?\s*(\d+(?:[.,]\d{1,2})?)\s+(?:GHS|GH[C₵¢]|₵)?\s*(\d+(?:[.,]\d{1,2})?)$/i);
        if(qtyMatch){const total=money(qtyMatch[4])||money(qtyMatch[3])*+qtyMatch[2];m=[null,qtyMatch[1]+'',total.toString()];}
      }
      // Pattern 5: Multiple money values on one line — use the LAST one as total price
      if(!m){
        const vals=[...line.matchAll(/(?:GHS|GH[C₵¢]|₵)?\s*([0-9OoIlS]{1,3}(?:[,\s][0-9OoIlS]{3})*(?:[.,][0-9OoIlS]{1,2}))/gi)];
        if(vals.length>=1){
          const last=vals[vals.length-1];
          const name=line.slice(0,last.index).replace(/\s*(?:GHS|GH[C₵¢]|₵)?\s*[0-9OoIlS,.\s]+$/,'').trim();
          if(name.length>1)m=[null,name,last[1]];
        }
      }
      if(!m)continue;
      // Clean up item name
      let name=String(m[1]||'')
        .replace(/^\d+\s*[xX*]\s*/,'')      // remove qty prefix
        .replace(/^[-*•·\.#>]+\s*/,'')       // remove bullet/marker chars
        .replace(/\b(qty|pcs?|each|unit|units|pk|pack|kg|g|ml|l|oz|lb)\b/ig,'')
        .replace(/\b[A-Z0-9]{6,}\b/g,'')    // remove PLU/barcode numbers
        .replace(/\s+/g,' ')
        .trim();
      const amount=money(String(m[2]||''));
      if(!name||name.length<2||!amount||amount<0.01||amount>100000)continue;
      if(skip.test(name)||skipLine.test(name))continue;
      rows.push({id:Date.now()+rows.length,name,amount,category:categoryForItem(name),keep:true});
    }
    return rows.slice(0,150);
  }
  function renderEditableReceiptRows(){
    const el=$('rpItemsTable'); if(!el)return;
    const cats=(typeof getExpCats==='function'?getExpCats():['Miscellaneous','Food / Groceries','Transport','Shopping']);
    const rows=(window.rpParsedItems||rpParsedItems||[]).filter(it=>it.keep!==false);
    if(!rows.length){el.innerHTML='<div class="empty"><p>No clear items found. Add a row manually or try a clearer photo.</p><button class="btn btn-out btn-sm" style="margin-top:8px" onclick="rpAddManualItem()">+ Add Item</button></div>';return;}
    const total=rows.reduce((a,b)=>a+(+b.amount||0),0);
    el.innerHTML=rows.map((it,i)=>`<div class="rp-item-row" data-rpid="${it.id}">
      <div><input value="${esc(it.name||'')}" placeholder="Item name" oninput="rpUpdateName(${it.id},this.value)">${it.qty&&it.qty>1?`<div style="font-size:10px;color:var(--txm);margin-top:2px;">${it.qty} x GH\u20b5${Number(it.unitPrice||0).toFixed(2)}</div>`:''}<div class="rp-item-cat" style="margin-top:6px"><select onchange="rpUpdateCat(${it.id},this.value)">${cats.map(c=>`<option value="${esc(c)}"${c===(it.category||'Miscellaneous')?' selected':''}>${(typeof ce==='function'?ce(c):'')} ${esc(c)}</option>`).join('')}</select></div></div>
      <div class="rp-item-amt"><input type="number" step="0.01" value="${(+it.amount||0).toFixed(2)}" oninput="rpUpdateAmount(${it.id},this.value)"></div>
      <button class="rp-item-del" onclick="rpRemoveItem(${it.id})" title="Remove">\u2715</button>
    </div>`).join('')+`<div style="margin-top:8px;padding-top:8px;border-top:2px solid var(--bdr);display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;"><button class="btn btn-out btn-sm" onclick="rpAddManualItem()">\uFF0B Add Item</button><div class="rp-total-row" style="margin:0;"><span>Total (${rows.length} item${rows.length!==1?'s':''})</span><span>GH\u20b5 ${total.toFixed(2)}</span></div></div>`;
  }
  window.rpUpdateName=function(id,val){const it=(window.rpParsedItems||rpParsedItems||[]).find(x=>x.id===id);if(it){it.name=val;if(!it._catOverridden)it.category=categoryForItem(val);}};
  window.rpUpdateAmount=function(id,val){const it=(window.rpParsedItems||rpParsedItems||[]).find(x=>x.id===id);if(it)it.amount=+val||0;};
  window.rpUpdateCat=function(id,val){const it=(window.rpParsedItems||rpParsedItems||[]).find(x=>x.id===id);if(it){it.category=val;it._catOverridden=true;}};
  window.rpAddManualItem=function(){const items=window.rpParsedItems||rpParsedItems;items.push({id:Date.now()+Math.random(),name:'',amount:0,category:'Miscellaneous',keep:true});renderEditableReceiptRows();};
  window.renderRPItems=renderEditableReceiptRows;
  window.parseReceiptAI=async function(){
    const status=$('rpStatus'), st=$('rpStatusText'), review=$('rpReviewWrap'), preview=$('rpPreviewWrap');
    const file=window.rpFileObject;
    if(!file&&!window.rpImageBase64){toast('Please upload a receipt image or PDF first.');return;}
    if(status)status.style.display='block'; if(st)st.textContent='Reading receipt. This may take a moment\u2026'; if(review)review.style.display='none';
    try{
      let text='';
      if(file && /pdf/i.test((file.type||'')+' '+(file.name||'')) && typeof pdfjsLib!=='undefined'){
        pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
        for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p);const tc=await page.getTextContent();text+='\n'+tc.items.map(i=>i.str||'').join('\n');}
      }else if(file && typeof Tesseract!=='undefined'){
        if(st)st.textContent='Scanning receipt with OCR (local). For best results use Parse with AI.';
        const dataUrl=await imageToBetterDataUrl(file).catch(()=>'data:'+(window.rpImageType||file.type||'image/png')+';base64,'+window.rpImageBase64);
        const out=await Tesseract.recognize(dataUrl,'eng',{logger:m=>{if(st&&m.status)st.textContent='OCR: '+m.status+(m.progress?` ${Math.round(m.progress*100)}%`:'');}});
        text=out?.data?.text||'';
      } else if(window.rpImageBase64){
        // No Tesseract and no file — can't do OCR
        if(st)st.textContent='Cannot perform local OCR. Try the AI parser instead.';
        setTimeout(()=>{if(status)status.style.display='none';},3000);
        return;
      }
      const rows=parseReceiptText(text);
      window.rpParsedItems=rpParsedItems=rows.length?rows:[{id:Date.now(),name:'Receipt item',amount:0,category:'Miscellaneous',keep:true}];
      renderEditableReceiptRows();
      if(review)review.style.display='block'; if(preview)preview.style.display='block';
      if(st)st.textContent=rows.length?`Found ${rows.length} item(s). Review and edit before saving.`:'Could not detect items. Add rows manually or try the AI parser.';
      setTimeout(()=>{if(status)status.style.display='none';},3500);
    }catch(e){
      console.error(e);
      window.rpParsedItems=rpParsedItems=[{id:Date.now(),name:'Receipt item',amount:0,category:'Miscellaneous',keep:true}];
      renderEditableReceiptRows();
      if(review)review.style.display='block';
      if(st)st.textContent='Could not read this file. Edit the row manually before saving.';
      setTimeout(()=>{if(status)status.style.display='none';},3500);
    }
  };
  // Keep window.parseReceiptWithAI pointing to the main AI-first function, not the local OCR
  // (the main parseReceiptWithAI defined earlier handles AI-first with OCR fallback)
  if(typeof window.parseReceiptWithAI!=='function'||window.parseReceiptWithAI===window.parseReceiptAI){
    // Only set the fallback if the AI version hasn't been set yet
    window.parseReceiptWithAI=window.parseReceiptAI;
  }
  function init(){addStyle(); if($('appVersion'))$('appVersion').textContent='v'+VERSION; const n=$('appVersionNote'); if(n)n.innerHTML='App version: <b>v'+VERSION+'</b>';}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

