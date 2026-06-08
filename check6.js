
// ─── '1.1.0';
(function(){
  if(!S.catLearning)S.catLearning={};
  if(!S.dataHealthLastRun)S.dataHealthLastRun='';
  persist();

  window.resetBadAppNameCache=function(){
    snap&&snap('Reset app name');
    S.profileName='';S.userName='';
    localStorage.removeItem('nuellieBadAppName');
    const el=document.getElementById('profileNameInput'); if(el)el.value='';
    persist();applyAppName();refreshAll();toast('App name reset to Dr. Nuellie’s Money Diary.');
  };

  window.toggleSub=function(id){
    const s=(S.subscriptions||[]).find(x=>String(x.id)===String(id));
    if(!s){toast('Subscription not found.');return;}
    snap('Toggle subscription');
    s.active=s.active===false?true:false;
    persist();refreshAll();toast(s.active?'Subscription resumed.':'Subscription paused.');
  };
  window.delSub=function(id){
    const s=(S.subscriptions||[]).find(x=>String(x.id)===String(id));
    if(!s){toast('Subscription not found.');return;}
    confirmDlg('Delete Subscription',`Delete “${esc(s.name||'this subscription')}”?`,'Delete','btn-re',()=>{snap('Delete subscription');S.subscriptions=(S.subscriptions||[]).filter(x=>String(x.id)!==String(id));persist();refreshAll();toast('Subscription deleted.');});
  };

  const baseRules=[
    [/\b(bread|tea bread|sugar bread|rice|yam|plantain|tomatoes?|onions?|pepper|eggs?|milk|fish|chicken|meat|oil|gari|beans|kontomire|kenkey|banku|provisions?|supermarket|grocery|groceries|market food|foodstuff)\b/i,'Groceries / Food Market'],
    [/\b(shoes?|heels?|sandals?|slippers?|dress(es)?|clothes|clothing|shirt|skirt|jeans|trousers?|bag|handbag|purse|watch|jewellery|jewelry|earrings?|necklace|accessor(y|ies))\b/i,'Clothing & Accessories'],
    [/\b(lipstick|foundation|powder|makeup|skin ?care|skincare|lotion|cream|perfume|serum|cleanser|sunscreen|body splash)\b/i,'Skincare & Makeup'],
    [/\b(braids?|wig|weave|salon|barber|nails?|pedicure|manicure|lashes|hair|hairdresser)\b/i,'Hair & Beauty'],
    [/\b(data|bundle|airtime|mtn|telecel|vodafone|airteltigo|wifi|internet|broadband)\b/i,'Airtime & Mobile Data'],
    [/\b(uber|bolt|yango|taxi|trotro|bus|fare|fuel|petrol|diesel|goil|shell|totalenergies|parking)\b/i,'Transport / Fuel / Ride'],
    [/\b(kfc|pizza|shawarma|restaurant|cafe|café|jollof|fried rice|lunch|dinner|breakfast|takeaway|delivery|glovo|bolt food|food order)\b/i,'Restaurants / Eating Out'],
    [/\b(soap|toothpaste|toothbrush|tissue|toilet roll|detergent|deodorant|shampoo|conditioner|sanitary pad|pads?|cleaning)\b/i,'Personal Hygiene'],
    [/\b(medicine|meds|pharmacy|hospital|clinic|doctor|lab|scan|xray|x-ray|ultrasound|consultation|prescription)\b/i,'Medical / Pharmacy'],
    [/\b(mechanic|servicing|oil change|tyre|tire|alignment|brake|battery|spare part|car wash|vulcaniser|vulcanizer)\b/i,'Car Maintenance'],
    [/\b(salary|payroll|wage|allowance|stipend|monthly pay)\b/i,'Salary / Monthly Pay'],
    [/\b(freelance|contract|consulting|consultancy|gig|client paid|professional fee)\b/i,'Freelance / Contract'],
    [/\b(interest|dividend|coupon|treasury bill|t[- ]?bill|investment return|mutual fund)\b/i,'Investment Returns'],
    [/\b(rent received|tenant paid|rental income)\b/i,'Rental Income'],
    [/\b(gift received|sent me money|money received|support received)\b/i,'Gift / Money Received']
  ];
  function learnableKey(text){
    return String(text||'').toLowerCase().replace(/[₵$£€0-9.,]/g,' ').split(/\s+/).filter(w=>w.length>2&&!/^(paid|spent|bought|for|from|the|and|with|today|yesterday|cedis|ghana|ghs|usd)$/.test(w)).slice(0,5).join(' ');
  }
  window.learnCategoryFromFields=function(pre){
    const desc=(document.getElementById(pre+'Desc')||document.getElementById(pre==='qa'?'qaDesc':''))?.value||'';
    const cat=(document.getElementById(pre+'Cat')||document.getElementById(pre==='qa'?'qaCat':''))?.value||'';
    const k=learnableKey(desc); if(k&&cat){S.catLearning[k]=cat;persist();}
  };
  const oldInfer=window.inferSmsCat;
  window.inferSmsCat=function(text){
    const s=String(text||''); const k=learnableKey(s);
    if(k&&S.catLearning&&S.catLearning[k])return S.catLearning[k];
    for(const [rx,cat] of baseRules){if(rx.test(s))return cat;}
    return oldInfer?oldInfer(s):'Miscellaneous';
  };
  window.inferImportCat=function(desc,type){
    const c=inferSmsCat(desc);
    if(type==='income')return getIncCats().includes(c)?c:'Other Income';
    return getExpCats().includes(c)?c:'Miscellaneous';
  };
  const oldAuto=window.autoCategorize;
  window.autoCategorize=function(pre){
    if(oldAuto)oldAuto(pre);
    const desc=(document.getElementById(pre+'Desc')||{}).value||'';
    const sel=document.getElementById(pre+'Cat'); if(!sel)return;
    const cat=inferSmsCat(desc); if([...sel.options].some(o=>o.value===cat))sel.value=cat;
  };
  document.addEventListener('change',e=>{
    if(e.target&&/(iCat|eCat|qaCat)$/.test(e.target.id||'')) learnCategoryFromFields(e.target.id.startsWith('i')?'i':e.target.id.startsWith('qa')?'qa':'e');
  });

  window.runDataHealthCheck=function(){
    const tx=S.transactions||[], warnings=[];
    const seen=new Map(); let dups=0, missingCat=0, missingWallet=0, oldFx=0;
    tx.forEach(t=>{const k=txnKey(t); if(seen.has(k))dups++; else seen.set(k,true); if(!t.cat||/miscellaneous/i.test(t.cat))missingCat++; if(!t.wallet)missingWallet++; if(t.currency==='USD'&&(!t.fxRate||Number(t.fxRate)<=0))oldFx++;});
    if(dups)warnings.push(`${dups} possible duplicate transaction(s).`);
    if(missingCat)warnings.push(`${missingCat} transaction(s) need better categorisation.`);
    if(missingWallet)warnings.push(`${missingWallet} transaction(s) have no wallet.`);
    if(oldFx)warnings.push(`${oldFx} USD record(s) need a stored historical FX rate.`);
    S.dataHealthLastRun=new Date().toISOString();persist();
    confirmDlg('Data Health Check',warnings.length?warnings.map(w=>'• '+w).join('<br>'):'No major data issues found.','OK','btn-gr',()=>{});
  };

  window.updateAppNow=async function(){
    try{
      toast('Checking for app update…');
      if('serviceWorker' in navigator){
        const reg=await navigator.serviceWorker.getRegistration();
        if(reg){await reg.update(); if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});}
      }
      if('caches' in window){const keys=await caches.keys(); await Promise.all(keys.filter(k=>/dr-nuellies-money-diary/.test(k)).map(k=>caches.delete(k)));}
      location.reload();
    }catch(e){console.error(e);toast('Could not force update. Close and reopen the app.');}
  };

  const oldSetup=window.setupCSVMapping;
  window.setupCSVMapping=function(rows){
    if(oldSetup)oldSetup(rows);
    const source=document.getElementById('statementSource')?.value||'auto';
    const headers=(rows[0]||[]).map(h=>String(h||'').trim());
    const set=(id,rx)=>{const i=headers.findIndex(h=>rx.test(h)); if(i>-1){const el=document.getElementById(id); if(el)el.value=i;}};
    if(source==='momo'){set('csvDescCol',/details|narration|description|transaction|reference/i);set('csvDebitCol',/paid out|debit|withdrawal|cash out|sent/i);set('csvCreditCol',/paid in|credit|deposit|cash in|received/i);set('csvDateCol',/date|time/i);}
    if(source==='bank'){set('csvDescCol',/narration|description|particulars|remarks|details/i);set('csvDebitCol',/debit|withdrawal|dr/i);set('csvCreditCol',/credit|deposit|cr/i);}
  };

  const oldRenderDraft=window.renderCSVImportDraft;
  window.renderCSVImportDraft=function(){
    if(oldRenderDraft)oldRenderDraft();
    const info=document.getElementById('csvPreview');
    if(info&&csvImportDraft&&csvImportDraft.length&&!info.querySelector('.smart-import-note')){
      info.insertAdjacentHTML('afterbegin','<div class="ok smart-import-note" style="margin-bottom:8px;">Smart import is best-effort. Please review dates, descriptions, categories and duplicates before saving.</div>');
    }
  };

  window.runSearch=function(){
    const input=document.getElementById('globalSearch'),box=document.getElementById('searchResults'); if(!input||!box)return;
    const q=(input.value||'').trim().toLowerCase(); if(!q){box.style.display='none';box.innerHTML='';return;}
    const terms=q.split(/\s+/).filter(Boolean), has=t=>terms.every(x=>String(t||'').toLowerCase().includes(x));
    const actions=[
      ['Home','dashboard','home dashboard savings rate streak summary'],['Income','income','add income salary received money credit'],['Expenses','expenses','add expense spend debit groceries food shoes transport'],['Subscriptions','subscriptions','subscriptions recurring bills netflix'],['Investments','investments','investment portfolio returns'],['Assets','assets','asset car property land portfolio'],['Planner / Goals','planner','planner savings goal budget debt what if'],['Analysis','analysis','analysis report chart export excel'],['Settings','settings','settings profile wallets security accessibility display'],
      ['SMS Parser','tools','sms parser mobile money momo bank alert parse'],['Statement Import','tools|csv','statement import csv excel pdf bank momo'],['Receipt Parser','tools|receipt-parser','receipt parser upload receipt itemise'],['T-Bill Calculator','tools|tbill','treasury bill tbill calculator'],['PAYE Calculator','tools|paye','paye tax calculator'],['Retirement Calculator','tools|retire','retirement pension calculator'],['Debt Payoff Calculator','tools|debt','debt payoff snowball avalanche'],['Update App','settings|update','update app pwa refresh version'],['Data Health Check','settings|health','data health duplicates missing categories']
    ].filter(a=>has(a.join(' ')));
    const go=a=>{const [pg,tool]=String(a).split('|'); showPage(pg); if(tool==='update')setTimeout(updateAppNow,100); else if(tool==='health')setTimeout(runDataHealthCheck,100); else if(tool)setTimeout(()=>showTool(tool),100); clearSearch();};
    window.__searchGo=go;
    const tx=(S.transactions||[]).filter(o=>has(JSON.stringify(o))).slice(0,8);
    let out='';
    if(actions.length)out+='<div class="search-section-title">Functions</div>'+actions.slice(0,10).map((a,i)=>`<div class="sr-item" onclick="__searchGo('${a[1]}')"><b>${esc(a[0])}</b><br><small>${esc(a[2])}</small></div>`).join('');
    if(tx.length)out+='<div class="search-section-title">Transactions</div>'+tx.map(t=>`<div class="sr-item" onclick="showPage('${t.type==='income'?'income':'expenses'}');clearSearch();"><b>${esc(t.desc||t.cat||'Transaction')}</b><br><small>${fmt(t.amount)} · ${esc(t.cat||'')} · ${esc(t.date||'')}</small></div>`).join('');
    const inputs=[...document.querySelectorAll('input[id],select[id],textarea[id]')].filter(el=>has([el.id,el.placeholder,el.closest('.fg')?.querySelector('label')?.innerText].join(' '))).slice(0,8);
    if(inputs.length)out+='<div class="search-section-title">Inputs & Forms</div>'+inputs.map(el=>{const label=el.closest('.fg')?.querySelector('label')?.innerText||el.placeholder||el.id;return`<div class="sr-item" onclick="focusFoundInput('${el.id}')">📝 <b>${esc(label)}</b><br><small>${esc(pageForElement(el)||'current page')}</small></div>`}).join('');
    box.innerHTML=out||'<div class="sr-empty">No match found.</div>'; box.style.display='block';
  };

  window.addEventListener('load',()=>{
    const n=document.getElementById('appVersionNote'); if(n)n.innerHTML='App version: <b>v'+APP_VERSION+'</b>';
    ['iDesc','eDesc','qaDesc'].forEach(id=>{const el=document.getElementById(id); if(el&&!el.dataset.smartCat){el.dataset.smartCat='1';el.addEventListener('input',()=>{const pre=id.startsWith('i')?'i':id.startsWith('qa')?'qa':'e'; setTimeout(()=>autoCategorize(pre),80);});}});
  });
})();
