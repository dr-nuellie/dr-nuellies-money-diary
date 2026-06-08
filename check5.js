
/* Phone usability patch – June 2026 */
(function(){
  const css=document.createElement('style');
  css.textContent=`
    .topbar,.tb-inner{overflow:visible!important}.tb-inner{flex-wrap:wrap!important;align-items:center}.tb-srch-wrap{flex:1 1 280px;min-width:210px;max-width:none!important}.tb-search{min-height:36px}.tb-search .ubtn{padding:4px 7px;font-size:10px;border-radius:14px;margin-left:2px}.hbdgs{order:-1;width:100%;margin-left:0!important;display:flex!important;flex-wrap:wrap!important;overflow:visible!important;max-width:none!important;justify-content:flex-end}.hb{padding:3px 7px;min-width:auto!important}.hb .hl{font-size:7px}.hb .hv{font-size:11px}.fab-add.quick-open{display:none!important}.bottom-sheet.open~.fab-add{display:none!important}.xt input,.xt select{min-width:110px;max-width:180px}.xt td{vertical-align:top}.hist-table,.table-wrap,.bulk-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}.sms-parser-box textarea{min-height:110px}@media(max-width:650px){.sidebar{width:min(82vw,var(--sb-w))!important}.topbar{padding:7px 8px!important}.tb-srch-wrap{order:2;flex-basis:100%!important}.hbdgs{order:1;justify-content:flex-start}.hb{flex:0 1 auto}.ubtn{white-space:nowrap}.content{padding:10px!important}.fgg3{grid-template-columns:1fr!important}.xt input,.xt select{min-width:120px}.card{margin-bottom:10px!important}}`;
  document.head.appendChild(css);
})();

(function(){
  const oldShowPage=window.showPage;
  window.showPage=function(p){
    const r=oldShowPage&&oldShowPage.apply(this,arguments);
    if(window.innerWidth<=820 && typeof closeSidebar==='function') closeSidebar();
    if(p==='analysis') moveAnalysisExportLast();
    removeSmartSignalsCard();
    return r;
  };
  const oldOpen=window.openQuickSheet, oldClose=window.closeQuickSheet;
  window.openQuickSheet=function(){ if(oldOpen)oldOpen(); const f=document.querySelector('.fab-add'); if(f)f.classList.add('quick-open'); const box=document.getElementById('qaSmsBox'); if(box)box.style.display='block'; };
  window.closeQuickSheet=function(){ if(oldClose)oldClose(); const f=document.querySelector('.fab-add'); if(f)f.classList.remove('quick-open'); };
  document.addEventListener('DOMContentLoaded',()=>{
    removeSmartSignalsCard(); moveAnalysisExportLast();
  });
  function removeSmartSignalsCard(){
    [...document.querySelectorAll('#page-dashboard .ct')].forEach(ct=>{ if(/Smart Money Signals/i.test(ct.textContent||'')){ const card=ct.closest('.card'); if(card)card.remove(); }});
  }
  function moveAnalysisExportLast(){
    const page=document.getElementById('page-analysis'); if(!page)return;
    const card=[...page.querySelectorAll('.card')].find(c=>/Export to Excel/i.test(c.textContent||''));
    if(card&&card!==page.lastElementChild) page.appendChild(card);
  }
})();

// Smarter voice categorisation and tap-to-stop recording
(function(){
  let activeVoice=null;
  const oldInfer=window.inferSmsCat;
  const extraRules=[
    [/\b(bread|tea bread|sugar bread|butter bread|rice|yam|plantain|tomatoes?|onions?|pepper|eggs?|milk|fish|chicken|meat|oil|gari|beans|kontomire|kenkey|banku|waakye ingredients|grocer(y|ies)|market food|foodstuff|provisions?)\b/i,'Groceries / Food Market'],
    [/\b(shoes?|heels?|sandals?|slippers?|dress(es)?|clothes|clothing|shirt|skirt|jeans|trousers?|bag|handbag|purse|watch|jewellery|jewelry|earrings?|necklace|accessor(y|ies))\b/i,'Clothing & Accessories'],
    [/\b(lipstick|foundation|powder|makeup|skin care|skincare|lotion|cream|perfume|serum|cleanser|sunscreen)\b/i,'Skincare & Makeup'],
    [/\b(braids?|wig|weave|salon|barber|nails?|pedicure|manicure|lashes|hair)\b/i,'Hair & Beauty'],
    [/\b(data|bundle|airtime|mtn|telecel|vodafone|airteltigo|wifi|internet|broadband)\b/i,'Airtime & Mobile Data'],
    [/\b(uber|bolt|yango|taxi|trotro|bus|fare|fuel|petrol|diesel|goil|shell|totalenergies)\b/i,'Transport / Fuel / Ride'],
    [/\b(kfc|pizza|shawarma|restaurant|cafe|café|jollof|fried rice|lunch|dinner|breakfast|takeaway|delivery|glovo|bolt food|food order)\b/i,'Restaurants / Eating Out'],
    [/\b(soap|toothpaste|toothbrush|tissue|toilet roll|detergent|deodorant|shampoo|conditioner|sanitary pad|pads?)\b/i,'Personal Hygiene'],
    [/\b(medicine|meds|pharmacy|hospital|clinic|doctor|lab|scan|xray|x-ray|ultrasound|consultation|prescription)\b/i,'Medical / Pharmacy'],
    [/\b(mechanic|servicing|oil change|tyre|tire|alignment|brake|battery|spare part|car wash|vulcaniser)\b/i,'Car Maintenance']
  ];
  window.inferSmsCat=function(s){ s=String(s||''); for(const [rx,cat] of extraRules){if(rx.test(s))return cat;} return oldInfer?oldInfer(s):'Miscellaneous'; };
  window.voiceInput=function(targetId,btn){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){toast('Voice input is not supported in this browser.');return;}
    if(activeVoice&&activeVoice.btn===btn){try{activeVoice.rec.stop();}catch(e){} btn&&btn.classList.remove('listening'); activeVoice=null; toast('Voice stopped. Transcribing…'); return;}
    if(activeVoice){try{activeVoice.rec.stop();}catch(e){}}
    const rec=new SR(); rec.lang='en-GB'; rec.interimResults=true; rec.maxAlternatives=3; rec.continuous=true;
    let finalText='', interimText=''; activeVoice={rec,btn}; btn&&btn.classList.add('listening'); S.voicePermissionRequested=true; persist();
    rec.onresult=e=>{interimText=''; for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript; if(e.results[i].isFinal)finalText+=(finalText?' ':'')+t; else interimText+=(interimText?' ':'')+t;}};
    rec.onerror=()=>toast('Could not capture voice. Try again.');
    rec.onend=()=>{btn&&btn.classList.remove('listening'); activeVoice=null; const text=(finalText||interimText||'').trim(); if(text){ parseVoiceInput(targetId,text); const pre=targetId.startsWith('i')?'i':targetId.startsWith('qa')?'qa':'e'; const descEl=document.getElementById(pre==='qa'?'qaDesc':pre+'Desc'); if(descEl&&!descEl.value)descEl.value=text; autoCategorize(pre==='qa'?'e':pre); const sel=document.getElementById(pre==='qa'?'qaCat':pre+'Cat'); const cat=inferSmsCat(text); if(sel&&[...sel.options].some(o=>o.value===cat))sel.value=cat; toast('🎙️ Voice transcribed. Review before saving.'); }};
    rec.start(); setTimeout(()=>{if(activeVoice&&activeVoice.rec===rec){try{rec.stop();}catch(e){}}},20000);
  };
})();

// SMS parser navigation fixes
(function(){
  const oldPrefill=window.prefillSMS;
  window.prefillSMS=function(d){
    if(oldPrefill)oldPrefill(d);
    const target=(d&&d.type)==='income'?'income':'expenses';
    setTimeout(()=>{showPage(target); const id=(target==='income'?'iAmt':'eAmt'); const el=document.getElementById(id); if(el)el.scrollIntoView({behavior:'smooth',block:'center'});},80);
  };
  window.parseSheetSMS=function(){
    const t=document.getElementById('quickSheetSmsText'); if(!t||!t.value.trim()){toast('Paste an SMS alert first.');return;}
    const p=parseSmsMessage(t.value.trim());
    prefillSMS(p);
    if(document.getElementById('quickSheetSmsAutoClear')?.checked)t.value='';
    closeQuickSheet();
  };
})();

// Statement import: PDF support plus clearer naming
(function(){
  const oldLoad=window.loadCSVFile;
  window.loadCSVFile=function(event){
    const file=event.target.files[0]; if(!file)return;
    if(/\.pdf$/i.test(file.name)) return loadPDFStatement(file);
    return oldLoad?oldLoad(event):undefined;
  };
  async function loadPDFStatement(file){
    const status=document.getElementById('csvStatus'); if(status)status.textContent='Reading PDF statement…';
    if(typeof pdfjsLib==='undefined'){toast('PDF reader could not load. Try Excel/CSV or reconnect internet.'); if(status)status.textContent='PDF reader unavailable.'; return;}
    try{
      pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const buf=await file.arrayBuffer(); const pdf=await pdfjsLib.getDocument({data:buf}).promise; let text='';
      for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i); const tc=await page.getTextContent(); text+='\n'+tc.items.map(it=>it.str).join(' ');}
      const lines=text.split(/\n|(?=\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/).map(x=>x.trim()).filter(Boolean);
      const rows=[['Date','Description','Debit','Credit','Amount','Type']];
      const money='(?:GHS|GH₵|₵)?\\s*([0-9][0-9,]*(?:\\.[0-9]{2})?)';
      lines.forEach(line=>{
        const d=line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/); const m=[...line.matchAll(new RegExp(money,'gi'))];
        if(!d||!m.length)return; const amt=m[m.length-1][1]; const low=line.toLowerCase(); const type=/credit|cr|deposit|received|paid in/.test(low)&&!/debit|dr|withdrawal|paid out/.test(low)?'credit':'debit';
        const desc=line.replace(d[0],'').replace(m[m.length-1][0],'').trim().slice(0,160);
        rows.push([d[0],desc,type==='debit'?amt:'',type==='credit'?amt:amt,'',type]);
      });
      if(rows.length<2){toast('I could not detect statement rows in this PDF. Try an Excel/CSV export from the bank.'); if(status)status.textContent='No statement rows detected.'; return;}
      csvRowsCache=rows; setupCSVMapping(rows); if(status)status.textContent=`Loaded ${rows.length-1} possible PDF row(s). Please review carefully.`;
    }catch(e){console.error(e); toast('Could not read this PDF statement. Try another file or Excel/CSV.'); if(status)status.textContent='PDF parsing failed.';}
  }
})();

// Receipt parser: browser-side OCR fallback. No exposed AI key is used in the PWA.
(function(){
  window.parseReceiptWithAI=async function(){
    if(typeof window.parseReceiptAI==='function')return window.parseReceiptAI();
    const reviewWrap=document.getElementById('rpReviewWrap');
    const todayStr=(typeof today==='function')?today():new Date().toISOString().slice(0,10); const rd=document.getElementById('rpDate'); if(rd&&!rd.value)rd.value=todayStr;
    window.rpParsedItems=rpParsedItems=[{id:Date.now(),name:'Receipt item',amount:0,category:'Miscellaneous',keep:true}];
    renderRPItems(); if(reviewWrap)reviewWrap.style.display='block';
    toast('Receipt loaded. Edit the item row, then save.');
  };
})();

// Exchange rate: Google has no reliable public browser API; use safer public fallback and preserve manual editing
async function fetchLiveFxRate(){
  const rateEl=document.getElementById('exchangeRate')||document.getElementById('usdRate')||document.getElementById('fxRate');
  try{
    const res=await fetch('https://open.er-api.com/v6/latest/USD',{cache:'no-store'}); const data=await res.json();
    const rate=data&&data.rates&&data.rates.GHS; if(rate&&rate>0){ usdRate=rate; if(rateEl)rateEl.value=Number(rate).toFixed(4); S.usdRate=usdRate; persist(); toast('Live USD→GHS rate updated.'); return rate; }
    throw new Error('No GHS rate');
  }catch(e){toast('Live FX could not be fetched. Use the manual exchange rate field.'); return null;}
}
