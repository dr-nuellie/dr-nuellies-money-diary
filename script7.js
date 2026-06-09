
/* '1.1.1';

  function addPatchCss(){
    if(document.getElementById('v111MobilePatchCss'))return;
    const st=document.createElement('style'); st.id='v111MobilePatchCss';
    st.textContent=`
      :root{--fun-pop: cubic-bezier(.2,.9,.25,1.25);} 
      .topbar,.tb-inner{overflow:visible!important;max-width:100vw!important;}
      .tb-inner{display:flex!important;flex-wrap:wrap!important;gap:6px!important;align-items:center!important;}
      .tb-srch-wrap{flex:1 1 230px!important;min-width:0!important;max-width:100%!important;order:2;}
      .hbdgs{order:1;display:flex!important;flex:1 1 100%!important;flex-wrap:wrap!important;gap:5px!important;overflow:visible!important;max-width:100%!important;justify-content:flex-start!important;}
      #undoB,#redoB{order:3!important;position:static!important;white-space:nowrap!important;}
      .tb-search #undoB,.tb-search #redoB{display:none!important;}
      .hb,.sc,.card,.btn,.nav-link,.fab-add{transition:transform .18s var(--fun-pop), box-shadow .18s ease, background-color .18s ease;}
      .btn:active,.nav-link:active,.fab-add:active,.sc:active,.hb:active{transform:scale(.97)}
      .page.active{animation:softSlideIn .22s ease both;}
      @keyframes softSlideIn{from{opacity:.25;transform:translateY(6px)}to{opacity:1;transform:none}}
      body.reduce-motion .page.active, body.reduce-motion .hb, body.reduce-motion .sc, body.reduce-motion .card, body.reduce-motion .btn, body.reduce-motion .nav-link, body.reduce-motion .fab-add{animation:none!important;transition:none!important;}
      .sg{gap:9px!important;}
      .sc{padding:10px 11px!important;min-height:70px!important;}
      .sc .sl{font-size:9.5px!important;}
      .sc .sv{font-size:17px!important;line-height:1.15!important;}
      .sc .ss{font-size:9.5px!important;}
      .toast,.notification,.notify,.inapp-notification,#toast{max-width:calc(100vw - 22px)!important;width:auto!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:break-word!important;line-height:1.35!important;box-sizing:border-box!important;}
      #page-income .card>div[style*="display:flex"],#page-expenses .card>div[style*="display:flex"]{max-width:100%;}
      #page-income .fg,#page-expenses .fg{min-width:0;}
      #page-income .card input,#page-income .card select,#page-expenses .card input,#page-expenses .card select{max-width:100%;box-sizing:border-box;}
      #incList .txi,#expList .txi{display:grid!important;grid-template-columns:1fr auto!important;gap:8px!important;align-items:start!important;}
      #incList .txi-info,#expList .txi-info{min-width:0!important;overflow-wrap:anywhere!important;}
      #incList .txi-actions,#expList .txi-actions{display:flex!important;gap:4px!important;flex-wrap:wrap!important;justify-content:flex-end!important;max-width:125px!important;}
      #qaSmsBox{display:block!important;}
      #quickSheetSmsResult{margin-top:8px;}
      .home-clickable-card{cursor:pointer;}
      .home-clickable-card:hover{box-shadow:0 10px 24px rgba(0,0,0,.09)!important;}
      #tool-pwa-share,[data-tool="pwa-share"]{display:none!important;}
      .action-desc,.sec-desc,.calc-note{line-height:1.55;}
      @media(max-width:650px){
        .topbar{padding:7px 8px!important;}
        .tb-title-wrap{flex:1 1 100%!important;min-width:0!important;}
        .hbdgs{flex-basis:100%!important;}
        .hb{padding:4px 7px!important;}
        .hb .hl{font-size:7px!important}.hb .hv{font-size:11px!important;}
        .tb-srch-wrap{flex:1 1 100%!important;}
        #undoB,#redoB{font-size:10px!important;padding:5px 8px!important;}
        #page-income .card>div[style*="display:flex"],#page-expenses .card>div[style*="display:flex"]{display:grid!important;grid-template-columns:1fr 1fr!important;gap:7px!important;}
        #page-income .card>div[style*="display:flex"] .fg,#page-expenses .card>div[style*="display:flex"] .fg{min-width:0!important;width:100%!important;}
        #page-income .card>div[style*="display:flex"] button,#page-expenses .card>div[style*="display:flex"] button{width:fit-content;}
      }
    `;
    document.head.appendChild(st);
  }

  function daysAgo(n){const d=new Date();d.setDate(d.getDate()-n+1);return d.toISOString().slice(0,10);}

  function strongestAmount(raw){
    const s=String(raw||'');
    const re=/(?:GHS|GH₵|GHC|GHc|₵|cedis?)\s*([0-9][0-9,]*(?:\.\d{1,2})?)|([0-9][0-9,]*(?:\.\d{1,2})?)\s*(?:GHS|GH₵|GHC|GHc|₵|cedis?)/gi;
    const matches=[]; let m;
    while((m=re.exec(s))){
      const amount=parseFloat((m[1]||m[2]||'0').replace(/,/g,''));
      const ctx=s.slice(Math.max(0,m.index-45), Math.min(s.length,m.index+m[0].length+45)).toLowerCase();
      let score=1;
      if(/balance|available|bal\.?:?|ledger/.test(ctx))score-=8;
      if(/charge|fee|levy|commission/.test(ctx))score-=3;
      if(/amount|paid|payment|debit|debited|credited|credit|received|sent|cash out|cash in|withdrawn|purchase|transfer/.test(ctx))score+=7;
      if(/new balance|current balance|available balance/.test(ctx))score-=10;
      matches.push({amount,score,index:m.index});
    }
    matches.sort((a,b)=>b.score-a.score || a.index-b.index);
    return matches[0]?.amount||0;
  }

  function improvedSmsParser(raw){
    const old=window.__oldParseSmsMessageForV111||window.parseSmsMessage;
    const base=old?old(raw):{};
    const s=String(raw||'').replace(/\s+/g,' ').trim();
    const lower=s.toLowerCase();
    const amount=strongestAmount(s)||base.amount||0;
    let type=base.type||'';
    if(/\b(credit alert|credited|credit to|cr\b|deposit|received|inward|cash in|has sent you|paid into|salary|transfer received)\b/i.test(s))type='income';
    if(/\b(debit alert|debited|debit from|dr\b|paid to|payment|purchase|pos|atm|withdrawn|cash out|sent to|transfer to|momo pay)\b/i.test(s))type='expense';
    if(/salary|payroll|allowance|stipend/i.test(s))type='income';
    if(!type)type=/credit/i.test(s)&&!/debit/i.test(s)?'income':'expense';
    let wallet=base.wallet||'Bank Account', accountType=base.accountType||'Bank';
    if(/mtn|momo|mobile money/i.test(s)){wallet='MTN MoMo';accountType='MoMo';}
    if(/telecel|vodafone cash|voda cash/i.test(s)){wallet='Vodafone Cash';accountType='MoMo';}
    if(/cash/i.test(s)&&!/cash out|cash in|momo|mobile money/i.test(s)){wallet='Cash';accountType='Cash';}
    const txid=(s.match(/(?:transaction id|txn id|trans id|reference|ref(?:erence)?|receipt no|external ref|id)[:\s#-]*([A-Z0-9][A-Z0-9\-\/]+)/i)||[])[1]||base.txid||'';
    let cp=base.counterparty||'';
    const pats=[/(?:from|by)\s+(.+?)(?:\s+(?:on|at|ref|reference|id|bal|balance)\b|[.,]|$)/i,/(?:to|paid to|sent to|merchant)\s+(.+?)(?:\s+(?:on|at|ref|reference|id|bal|balance)\b|[.,]|$)/i,/(?:description|narration|details)[:\s-]+(.+?)(?:\s+(?:amount|date|ref|balance)\b|$)/i];
    for(const p of pats){const m=s.match(p); if(m&&m[1]&&m[1].trim().length>2){cp=m[1].trim();break;}}
    if(!cp)cp=type==='income'?'Bank/MoMo credit':'Bank/MoMo debit';
    const cat=window.inferSmsCat?inferSmsCat(s):base.cat||'Miscellaneous';
    return {type,amount,wallet,accountType,counterparty:cp,txid,cat,raw:s};
  }

  function setSelectValue(id,value){const el=document.getElementById(id); if(!el)return; const opts=[...el.options||[]]; const hit=opts.find(o=>o.value===value||o.text===value); if(hit)el.value=hit.value;}
  function fillMainForm(d,navigate=true){
    const p=d.type==='income'?'i':'e'; if(navigate)showPage(d.type==='income'?'income':'expenses');
    setTimeout(()=>{
      const set=(id,v)=>{const el=document.getElementById(id); if(el&&v!==undefined&&v!==null)el.value=v;};
      set(p+'Desc',d.counterparty||'Parsed transaction'); set(p+'Amt',d.amount||''); set(p+'Cur','GHS'); set(p+'Date',today()); set(p+'Notes',`Parsed alert${d.txid?' | Transaction ID: '+d.txid:''}`);
      setSelectValue(p+'Wal',d.wallet||'Bank Account'); const acct=document.getElementById(p+'AcctType'); if(acct)acct.value=d.accountType||inferAccountType(d.wallet);
      const fx=document.getElementById(p+'FxRate'); if(fx)fx.value=S.usdRate||window.usdRate||15.5;
      setSelectValue(p+'Cat',d.cat||'Miscellaneous'); if(typeof showParsedSummaryOnForm==='function')showParsedSummaryOnForm(p,d);
      const first=document.getElementById(p+'Desc'); if(first&&navigate){first.scrollIntoView({behavior:'smooth',block:'center'});first.focus();}
    },navigate?160:20);
    const textBox=document.getElementById('smsText'); if(document.getElementById('smsAutoClear')?.checked&&textBox)textBox.value='';
    toast('Alert parsed. Review the prefilled form and save.');
  }
  function fillQuickAdd(d){
    const set=(id,v)=>{const el=document.getElementById(id); if(el&&v!==undefined&&v!==null)el.value=v;};
    set('qaType',d.type||'expense'); if(typeof buildQuickAddCats==='function')buildQuickAddCats();
    set('qaAmt',d.amount||''); set('qaDesc',d.counterparty||'Parsed transaction'); set('qaDate',today()); set('qaNotes',`Parsed alert${d.txid?' | Transaction ID: '+d.txid:''}`); set('qaCur','GHS');
    setSelectValue('qaWal',d.wallet||'Bank Account'); setSelectValue('qaCat',d.cat||'Miscellaneous');
    const res=document.getElementById('quickSheetSmsResult');
    if(res)res.innerHTML=`<div class="sms-summary"><b>Parsed ${d.type==='income'?'income':'expense'}</b><br>Amount: ${fmt(d.amount)}<br>Category: ${esc(d.cat||'')}<br>Wallet: ${esc(d.wallet||'')}<br>Counterparty: ${esc(d.counterparty||'')}${d.txid?'<br>Transaction ID: '+esc(d.txid):''}</div>`;
    toast('Quick Add fields filled. Review and save.');
  }

  function renderParsedResult(container,d,onClick){
    if(!container)return;
    if(!d.amount){container.innerHTML='<div class="err">Could not detect the transaction amount. Check whether the alert has a transaction amount and not only a balance.</div>';return;}
    window.__lastParsedAlert=d;
    container.innerHTML=`<div class="sms-summary"><b>Parsed ${d.type==='income'?'Income':'Expense'} Alert</b><br>Amount: ${fmt(d.amount)}<br>Category: ${esc(d.cat||'')}<br>Wallet: ${esc(d.wallet||'')}<br>Counterparty/Description: ${esc(d.counterparty||'—')}<br>Transaction ID: ${esc(d.txid||'—')}</div><div style="margin-top:8px;"><button class="btn btn-pk btn-sm" onclick="${onClick}">✨ Prefill Transaction Form</button></div>`;
  }

  function addAnalysisRangeButtons(){
    const wrap=document.getElementById('perBtns'); if(!wrap||document.getElementById('pbtn30'))return;
    const allBtn=[...wrap.querySelectorAll('button')].find(b=>/All Time/i.test(b.textContent||''));
    [['30','Last 30 Days'],['60','Last 60 Days'],['90','Last 90 Days']].forEach(([n,label])=>{
      const b=document.createElement('button'); b.id='pbtn'+n; b.className='pbtn'; b.title=label; b.setAttribute('aria-label',label); b.textContent=label; b.onclick=()=>setPeriod('last'+n);
      wrap.insertBefore(b, allBtn||null);
    });
  }

  function addEmailAlertTool(){
    if(document.getElementById('tool-email-alert'))return;
    const btnRow=document.querySelector('#page-tools .tool-grid, #page-tools .tool-buttons, #page-tools .tool-list') || document.querySelector('#page-tools');
    const smsBtn=document.querySelector('[data-tool="sms"]');
    const btn=document.createElement('button'); btn.title='Email Alert Add'; btn.setAttribute('aria-label','Email Alert Add'); btn.className='tool-btn'; btn.dataset.tool='email-alert'; btn.innerHTML='📧<br>Email Alert Add'; btn.onclick=()=>showTool('email-alert');
    if(smsBtn&&smsBtn.parentNode)smsBtn.parentNode.insertBefore(btn,smsBtn.nextSibling); else btnRow&&btnRow.appendChild(btn);
    const panel=document.createElement('div'); panel.className='tool-detail'; panel.id='tool-email-alert';
    panel.innerHTML=`<div class="card"><div class="ct"><span class="cico" style="background:var(--bl-l);">📧</span>Email Alert Add</div><p class="sec-desc">Paste a bank transaction email or shared email text. The app will extract the amount, direction, description, date and reference, then prefill the matching form for review.</p><div class="fg"><label>Paste Bank Email Alert</label><textarea id="emailAlertText" placeholder="Paste the transaction email text here..."></textarea></div><div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;"><button class="btn btn-mt" onclick="parseEmailAlert()">✨ Parse Email Alert</button><button class="btn btn-out" onclick="document.getElementById('emailAlertText').value='';document.getElementById('emailAlertResult').innerHTML=''">Clear</button></div><div id="emailAlertResult" style="margin-top:10px;"></div><p class="calc-note" style="margin-top:8px;">For privacy, a PWA cannot silently read your inbox. This supports paste/share of bank transaction emails into the app.</p></div>`;
    const page=document.getElementById('page-tools'); page&&page.appendChild(panel);
  }

  async function updateFxFrankfurter(){
    const status=document.getElementById('fxLiveStatus')||document.getElementById('rateStatus')||null;
    try{
      const res=await fetch('https://api.frankfurter.app/latest?from=USD&to=GHS',{cache:'no-store'});
      if(!res.ok)throw new Error('FX response not OK');
      const data=await res.json(); const rate=parseFloat(data?.rates?.GHS);
      if(!rate)throw new Error('No GHS rate');
      S.usdRate=rate; window.usdRate=rate; persist(); refreshAll&&refreshAll();
      const h=document.getElementById('hURate'); if(h)h.textContent=rate.toFixed(2);
      if(status)status.textContent='Live USD→GHS rate updated from Frankfurter.';
      toast('Live USD→GHS rate updated.');
    }catch(e){console.warn(e); if(status)status.textContent='Could not fetch live rate. Manual rate retained.'; toast('Could not fetch live FX rate. Manual rate retained.');}
  }

  function addDescriptions(){
    const items=[
      ['#page-expenses .card:nth-of-type(2) .ct','Save frequent expenses as templates so you can add repeated spending quickly.'],
      ['#page-tools .tool-detail:not(#tool-sms) .ct','Use this tool to speed up recording, planning or analysis. Review outputs before saving them.'],
      ['#page-settings .settings-menu','Choose a settings area below. Changes are stored on this device.'],
      ['#page-analysis .ct','Use the date ranges to compare income, spending and savings patterns over time.']
    ];
    items.forEach(([sel,text])=>{document.querySelectorAll(sel).forEach(el=>{const card=el.closest('.card')||el.parentElement; if(card&&!card.querySelector(':scope > .sec-desc, :scope > .calc-note, :scope > .action-desc')){const p=document.createElement('p');p.className='action-desc calc-note';p.textContent=text;el.insertAdjacentElement('afterend',p);}});});
  }

  function addSwipeSidebar(){
    if(window.__v111SwipeAdded)return; window.__v111SwipeAdded=true; let sx=0,sy=0,tracking=false;
    document.addEventListener('touchstart',e=>{const t=e.touches&&e.touches[0]; if(!t)return; sx=t.clientX; sy=t.clientY; tracking=sx<24;},{passive:true});
    document.addEventListener('touchmove',e=>{if(!tracking)return; const t=e.touches&&e.touches[0]; if(!t)return; const dx=t.clientX-sx, dy=Math.abs(t.clientY-sy); if(dx>55&&dy<45){tracking=false; if(typeof openSidebar==='function')openSidebar(); else document.body.classList.add('sidebar-open');}},{passive:true});
    document.addEventListener('touchend',()=>{tracking=false;},{passive:true});
  }

  function makeHomeCardsClickable(){
    const map=[['d-inc','income'],['d-exp','expenses'],['d-sav','analysis'],['d-inv','investments'],['d-health','adviser'],['d-efund','wallets'],['d-dti','loans'],['d-forecast','planner']];
    map.forEach(([id,page])=>{const el=document.getElementById(id); const card=el&&el.closest('.sc'); if(card&&!card.dataset.navPage){card.dataset.navPage=page; card.classList.add('home-clickable-card'); card.title='Open '+page; card.onclick=()=>showPage(page);}});
  }

  async function loadPDFStatementSmart(file){
    const status=document.getElementById('csvStatus'); if(status)status.textContent='Reading PDF statement tables…';
    if(typeof pdfjsLib==='undefined'){toast('PDF reader could not load. Try Excel/CSV or reconnect internet.'); if(status)status.textContent='PDF reader unavailable.'; return;}
    try{
      pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const buf=await file.arrayBuffer(); const pdf=await pdfjsLib.getDocument({data:buf}).promise; const rows=[['Date','Description','Debit','Credit','Balance','Reference']];
      for(let i=1;i<=pdf.numPages;i++){
        const page=await pdf.getPage(i); const tc=await page.getTextContent();
        const items=tc.items.map(it=>({str:it.str.trim(),x:it.transform[4],y:it.transform[5]})).filter(it=>it.str);
        const lines=[];
        items.sort((a,b)=>Math.abs(b.y-a.y)>3?b.y-a.y:a.x-b.x).forEach(it=>{
          let line=lines.find(l=>Math.abs(l.y-it.y)<3); if(!line){line={y:it.y,items:[]}; lines.push(line);} line.items.push(it);
        });
        lines.forEach(line=>{
          line.items.sort((a,b)=>a.x-b.x); const parts=line.items.map(it=>it.str); const text=parts.join(' ').replace(/\s+/g,' ').trim();
          const date=(text.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})\b/)||[])[1];
          if(!date)return;
          const moneyMatches=[...text.matchAll(/(?:GHS|GH₵|GHC|₵)?\s*([0-9][0-9,]*(?:\.\d{2}))/g)].map(m=>m[1]);
          if(!moneyMatches.length)return;
          const low=text.toLowerCase(); let debit='',credit='',balance='';
          if(/credit|cr\b|deposit|received|inward/.test(low)&&!/debit|dr\b/.test(low))credit=moneyMatches[0];
          else if(/debit|dr\b|withdrawal|payment|pos|atm|transfer to|paid/.test(low))debit=moneyMatches[0];
          else if(moneyMatches.length>=3){debit=moneyMatches[0];credit=moneyMatches[1];balance=moneyMatches[2];}
          else debit=moneyMatches[0];
          if(!balance&&moneyMatches.length>1&&/balance|bal/.test(low))balance=moneyMatches[moneyMatches.length-1];
          const desc=text.replace(date,'').replace(/(?:GHS|GH₵|GHC|₵)?\s*[0-9][0-9,]*(?:\.\d{2})/g,'').replace(/\b(debit|credit|balance|dr|cr)\b/gi,'').trim().slice(0,160)||'Imported statement entry';
          const ref=(text.match(/(?:ref|reference|txn|transaction|id)[:\s#-]*([A-Z0-9\-\/]+)/i)||[])[1]||'';
          rows.push([date,desc,debit,credit,balance,ref]);
        });
      }
      if(rows.length<2){toast('I still could not detect statement rows in this PDF. Some scanned PDFs need OCR or an Excel export.'); if(status)status.textContent='No statement rows detected.'; return;}
      window.csvRowsCache=rows; setupCSVMapping(rows); if(status)status.textContent=`Loaded ${rows.length-1} possible PDF statement row(s). Please review carefully before saving.`;
    }catch(e){console.error(e); toast('Could not read this PDF statement. Try another file or Excel/CSV.'); if(status)status.textContent='PDF parsing failed.';}
  }

  function init(){
    addPatchCss(); addAnalysisRangeButtons(); addEmailAlertTool(); addSwipeSidebar(); makeHomeCardsClickable(); addDescriptions();
    // Remove SMS Share Setup guidance
    document.querySelectorAll('[data-tool="pwa-share"],#tool-pwa-share').forEach(el=>el.style.display='none');
    // Undo/Redo buttons stay in their original HTML position (no DOM move needed)
    const qbox=document.getElementById('qaSmsBox'); if(qbox&&!document.getElementById('quickSheetSmsResult')){const d=document.createElement('div');d.id='quickSheetSmsResult';qbox.appendChild(d);}
    const ver=document.getElementById('appVersionNote'); if(ver)ver.innerHTML='App version: <b>v'+PATCH_VERSION+'</b>';
  }

  // Preserve old parser once, then override.
  if(!window.__oldParseSmsMessageForV111)window.__oldParseSmsMessageForV111=window.parseSmsMessage;
  window.parseSmsMessage=improvedSmsParser;
  window.parseSMS=function(){
    const box=document.getElementById('smsText'),out=document.getElementById('smsResult'); const raw=(box&&box.value||'').trim(); if(!raw){toast('Paste an SMS first.');return;}
    const p=improvedSmsParser(raw); renderParsedResult(out,p,'prefillSMS(__lastParsedAlert)'); toast(p.amount?'Alert parsed. Click Prefill Transaction Form to continue.':'Could not detect the amount.');
  };
  window.prefillSMS=function(d){fillMainForm(d||window.__lastParsedAlert,true);};
  window.parseSheetSMS=function(){
    const t=document.getElementById('quickSheetSmsText'); if(!t||!t.value.trim()){toast('Paste an SMS alert first.');return;}
    const p=improvedSmsParser(t.value.trim()); if(!p.amount){const r=document.getElementById('quickSheetSmsResult'); if(r)r.innerHTML='<div class="err">Could not detect the amount. Please review the alert.</div>'; toast('Could not detect the amount.'); return;}
    fillQuickAdd(p); if(document.getElementById('quickSheetSmsAutoClear')?.checked)t.value='';
  };
  window.parseQuickSMS=window.parseSheetSMS;
  window.parseEmailAlert=function(){
    const t=document.getElementById('emailAlertText'), r=document.getElementById('emailAlertResult'); const raw=(t&&t.value||'').trim(); if(!raw){toast('Paste the bank email alert first.');return;}
    const p=improvedSmsParser(raw); renderParsedResult(r,p,'prefillEmailAlert()'); toast(p.amount?'Email alert parsed. Click Prefill Transaction Form to continue.':'Could not detect the amount.');
  };
  window.prefillEmailAlert=function(){fillMainForm(window.__lastParsedAlert,true);};

  const oldSetPeriod=window.setPeriod;
  window.setPeriod=function(p){
    if(/^last(30|60|90)$/.test(p)){window.anPeriod=p;document.querySelectorAll('#perBtns .pbtn').forEach(b=>b.classList.toggle('active',b.id==='pbtn'+p.replace('last',''))); const cr=document.getElementById('customRangeRow'); if(cr)cr.style.display='none'; runAnalysis(); return;}
    return oldSetPeriod?oldSetPeriod.apply(this,arguments):undefined;
  };
  const oldGetPeriod=window.getPeriodTxns;
  window.getPeriodTxns=function(){
    if(/^last(30|60|90)$/.test(window.anPeriod||'')){const n=parseInt(window.anPeriod.replace('last',''),10); const from=daysAgo(n), to=today(); return (S.transactions||[]).filter(t=>(!from||t.date>=from)&&(!to||t.date<=to));}
    return oldGetPeriod?oldGetPeriod.apply(this,arguments):(S.transactions||[]);
  };
  const oldShowPage=window.showPage;
  window.showPage=function(p){const r=oldShowPage?oldShowPage.apply(this,arguments):undefined; if(window.innerWidth<=900&&typeof closeSidebar==='function')closeSidebar(); makeHomeCardsClickable(); return r;};
  const oldOpenQuick=window.openQuickSheet;
  window.openQuickSheet=function(){if(oldOpenQuick)oldOpenQuick(); const fab=document.querySelector('.fab-add'); if(fab)fab.classList.add('quick-open'); const box=document.getElementById('qaSmsBox'); if(box)box.style.display='block'; init();};
  const oldCloseQuick=window.closeQuickSheet;
  window.closeQuickSheet=function(){if(oldCloseQuick)oldCloseQuick(); const fab=document.querySelector('.fab-add'); if(fab)fab.classList.remove('quick-open');};
  const oldLoadCSV=window.loadCSVFile;
  window.loadCSVFile=function(event){const file=event?.target?.files?.[0]; if(file&&/\.pdf$/i.test(file.name))return loadPDFStatementSmart(file); return oldLoadCSV?oldLoadCSV(event):undefined;};
  window.updateLiveFX=window.updateLiveFX||updateFxFrankfurter;
  window.fetchLiveRate=window.fetchLiveRate||updateFxFrankfurter;
  window.updateFxFrankfurter=updateFxFrankfurter;

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
  window.addEventListener('load',init);
})();
