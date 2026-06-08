

(function(){
  try{
    const SK='nuellieV3';
    const raw=localStorage.getItem(SK);
    if(raw){
      const obj=JSON.parse(raw);
      const pn=(obj.profileName||'').trim();
      if(/^my(?:['’]s)?$/i.test(pn) || /^my(?:['’]s)?\s+money\s+diary$/i.test(pn) || /^dr\.?\s*nuellie(?:['’]s)?$/i.test(pn) || /^nuellie$/i.test(pn)){
        obj.profileName='';
        localStorage.setItem(SK,JSON.stringify(obj));
      }
    }
  }catch(e){}
})();

window.addEventListener('load',()=>{
  const warns=[];
  if(typeof Chart==='undefined') warns.push('Chart library could not load. Charts may not display.');
  if(typeof XLSX==='undefined') warns.push('Excel export library could not load. Export may not work.');
  const box=document.getElementById('libWarns');
  if(warns.length && box) box.innerHTML=warns.map(w=>`<div class="warn">⚠️ ${w}</div>`).join('');
  warns.forEach(w=>toast(w));
});

const SK='nuellieV4';
function defState(){return{transactions:[],investments:[],assets:[],loans:[],wallets:{bank:0,mtn:0,voda:0,cash:0,sav:0,usd:0,oth:0},budget:{},projections:[],usdRate:0,interestLog:[],lastInterestRun:'',customIncCats:[],customExpCats:[],goals:[],recurring:[],bills:[],transfers:[],subscriptions:[],extraWallets:[]};}
let S;
try{
  S=JSON.parse(localStorage.getItem(SK)||'null')||JSON.parse(localStorage.getItem('nuellieV3')||'null')||defState();
}catch(e){
  console.warn('Money Diary storage was reset because saved data could not be read:',e);
  S=defState();
}
['transactions','investments','assets','loans','subscriptions','goals','templates','transfers','snapshots','interestLog','customIncCats','customExpCats','extraWallets'].forEach(k=>{if(!Array.isArray(S[k]))S[k]=[];});
if(!S.wallets)S.wallets={bank:0,mtn:0,voda:0,cash:0,sav:0,usd:0,oth:0};
if(!S.budget)S.budget={};
let dashPeriod='month';
let portfolioDisplay='GHS';let assetDisplay='GHS';
function elVal(id, fallback=''){const el=document.getElementById(id);return el?String(el.value??fallback):String(fallback);}
function numVal(id, fallback=0){const n=parseFloat(elVal(id,''));return Number.isFinite(n)?n:fallback;}
function safeText(id){return elVal(id,'').trim();}
function safeSelect(id, fallback=''){const v=elVal(id,fallback);return v||fallback;}



function normalisedProfileName(){
  const n=(S.profileName||'').trim();
  if(!n)return '';
  if(/^my(?:['’]s)?$/i.test(n))return '';
  if(/^my(?:['’]s)?\s+money\s+diary$/i.test(n))return '';
  if(/^dr\.?\s*nuellie(?:['’]s)?$/i.test(n))return '';
  if(/^nuellie$/i.test(n))return '';
  if(/^dr\.?\s*dr\.?\s*nuellie(?:['’]s)?$/i.test(n))return '';
  return n;
}
function possessiveName(name){
  name=(name||'').trim();
  if(!name)return 'Dr. Nuellie’s Money Diary';
  return name+(name.toLowerCase().endsWith('s')?"'":"’s")+' Money Diary';
}
function appDisplayName(){
  const n=normalisedProfileName();
  return n?possessiveName(n):'Dr. Nuellie’s Money Diary';
}
function appDisplayNameHtml(){return esc(appDisplayName());}
function appDisplayNameBreakHtml(){return esc(appDisplayName()).replace(' Money Diary','<br>Money Diary');}
function scrubBadStoredProfileName(){
  const raw=(S.profileName||'').trim(),legacy=(S.userName||'').trim();
  if(!normalisedProfileName())S.profileName='';
  if(/^my(?:['’]s)?$/i.test(legacy)||/^my(?:['’]s)?\s+money\s+diary$/i.test(legacy)||/^dr\.?\s*nuellie(?:['’]s)?$/i.test(legacy)||/^nuellie$/i.test(legacy))S.userName='';
}
function applyAppName(){
  scrubBadStoredProfileName();
  const nm=appDisplayName();
  document.title=nm;
  const logo=document.getElementById('appLogo');
  if(logo)logo.innerHTML='💗 '+appDisplayNameBreakHtml()+'<small>Personal Finance Tracker</small>';
  const topTitle=document.querySelector('.tb-title');if(topTitle)topTitle.textContent=nm;
  document.querySelectorAll('[data-app-name]').forEach(el=>el.textContent=nm);
  document.querySelectorAll('[data-app-name-html]').forEach(el=>el.innerHTML=appDisplayNameHtml());
  document.querySelectorAll('[data-app-name-break]').forEach(el=>el.innerHTML='💗 '+appDisplayNameBreakHtml());
  document.querySelectorAll('.app-name-text').forEach(el=>el.textContent=nm);
}
function saveProfileSettings(){
  const profileEl=document.getElementById('profileNameInput');
  if(profileEl)S.profileName=profileEl.value.trim();
  scrubBadStoredProfileName();
  const dpEl=document.getElementById('settingDashPeriod');if(dpEl)S.defaultDashPeriod=dpEl.value;
  const scEl=document.getElementById('settingShowCents');if(scEl)S.showCents=scEl.checked;
  applyFontSize();persist();applyAppName();refreshAll();toast('✅ Profile settings saved!');
}

function cleanRecord(obj){Object.keys(obj).forEach(k=>{if(obj[k]===undefined||obj[k]===null)obj[k]='';if(typeof obj[k]==='number'&&!Number.isFinite(obj[k]))obj[k]=0;});return obj;}
function moneyDisplay(v,currency='GHS',raw=null,fx=null){
  const n=parseFloat(v||0);
  if(portfolioDisplay==='USD')return '$ '+(n/(fx||usdRate||15.5)).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  if(portfolioDisplay==='MIXED'&&currency==='USD')return '$ '+parseFloat(raw||n/(fx||usdRate||15.5)).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})+' ('+fmt(n)+')';
  return fmt(n);
}
function setPortfolioDisplay(c){portfolioDisplay=c;['GHS','USD','MIXED'].forEach(x=>{const el=document.getElementById('pf'+x);if(el)el.classList.toggle('active',c===x);});renderInv();}
['transactions','investments','assets','loans','projections','interestLog','customIncCats','customExpCats','goals','recurring','bills','transfers','subscriptions'].forEach(k=>{if(!S[k])S[k]=[];});
  // Migration: Car Maintenance is now a built-in default category — remove from custom if stored there
  S.customExpCats=S.customExpCats.filter(x=>x.name!=='Car Maintenance');
if(!S.wallets)S.wallets={bank:0,mtn:0,voda:0,cash:0,sav:0,usd:0,oth:0};
if(!S.budget)S.budget={};
if(!S.lastInterestRun)S.lastInterestRun='';

let undoStk=[],redoStk=[];
let lastPersistedState=JSON.stringify(S),isRestoringState=false,suppressNextPersistSnapshot=false;
function cloneState(){return JSON.stringify(S);}
function pushUndoState(state,label='Change'){
  if(!state)return;
  if(undoStk.length&&undoStk[undoStk.length-1].d===state)return;
  undoStk.push({lbl:label,d:state});
  if(undoStk.length>100)undoStk.shift();
}
function snap(lbl){
  pushUndoState(lastPersistedState||cloneState(),lbl||'Change');
  suppressNextPersistSnapshot=true;
  redoStk=[];
  updUndoUI();
}
function restoreState(state){
  isRestoringState=true;
  S=JSON.parse(state);
  sanitizeState(S);
  localStorage.setItem(SK,JSON.stringify(S));
  lastPersistedState=JSON.stringify(S);
  isRestoringState=false;
  refreshAll();
  applyAppName&&applyAppName();
  updUndoUI();
}
function undo(){
  if(!undoStk.length){toast('Nothing to undo.');return;}
  const current=cloneState();
  const t=undoStk.pop();
  redoStk.push({lbl:'Redo',d:current});
  restoreState(t.d);
  toast('↩ Undone');
}
function redo(){
  if(!redoStk.length){toast('Nothing to redo.');return;}
  const current=cloneState();
  const t=redoStk.pop();
  undoStk.push({lbl:'Undo',d:current});
  restoreState(t.d);
  toast('↪ Redone');
}
function updUndoUI(){
  const u=document.getElementById('undoB'),r=document.getElementById('redoB');
  if(u)u.disabled=!undoStk.length;
  if(r)r.disabled=!redoStk.length;
}
function sanitizeState(v){if(Array.isArray(v))return v.map(sanitizeState);if(v&&typeof v==='object'){Object.keys(v).forEach(k=>{if(v[k]===undefined||v[k]===null)v[k]='';else if(typeof v[k]==='number'&&!Number.isFinite(v[k]))v[k]=0;else v[k]=sanitizeState(v[k]);});}return v;}
function persist(){
  sanitizeState(S);
  const next=JSON.stringify(S);
  if(!isRestoringState&&next!==lastPersistedState){
    if(suppressNextPersistSnapshot)suppressNextPersistSnapshot=false;
    else pushUndoState(lastPersistedState,'Auto change');
    redoStk=[];
  }
  localStorage.setItem(SK,next);
  lastPersistedState=next;
  updUndoUI();
}

let toastTimer;
function toast(msg){announce&&announce(msg);const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2600);}

let usdRate=S.usdRate||15.5;
function today(){return new Date().toISOString().slice(0,10);}
function fmt(n,s='GH₵ '){const opts=S&&S.showCents===false?{maximumFractionDigits:0}:{minimumFractionDigits:2,maximumFractionDigits:2};return s+parseFloat(n||0).toLocaleString('en-GB',opts);}
function fmtS(n){return 'GH₵ '+parseFloat(n||0).toLocaleString('en-GB',{maximumFractionDigits:0});}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function outstanding(l){return Math.max(0,(parseFloat(l.amount)||0)+(parseFloat(l.fees)||0)-(parseFloat(l.paid)||0));}



function currentAppName(){return appDisplayName();}
function updateAppName(){applyAppName();}

function toggleCollapse(id){const el=document.getElementById(id);if(el)el.style.display=el.style.display==='none'||!el.style.display?'block':'none';}
function showEmojiPalette(){
  const p=document.getElementById('emojiPalette');if(!p)return;
  const emojis=['💰','🛒','🚗','🏠','💊','📱','🍽️','🎁','📚','🙏🏾','💼','✨','🐾','✈️','💄','🏦','📈','☕'];
  p.style.display='flex';p.innerHTML=emojis.map(e=>`<button title="${e}" aria-label="${e}" type="button" class="btn btn-out btn-xs" onclick="document.getElementById('catEmoji').value='${e}';document.getElementById('emojiPalette').style.display='none';">${e}</button>`).join('');
}
function parseSheetSMS(){
  const t=document.getElementById('quickSheetSmsText');if(!t||!t.value.trim()){toast('Paste an SMS alert first.');return;}
  const main=document.getElementById('smsText');if(main)main.value=t.value.trim();
  parseSMS();
  if(document.getElementById('quickSheetSmsAutoClear')?.checked)t.value='';
  closeQuickSheet();
}

function dateOffset(days=0){const d=new Date();d.setDate(d.getDate()+days);return d.toISOString().slice(0,10);}
function setDateQuick(id,days){const el=document.getElementById(id);if(el)el.value=dateOffset(days);}
function inferAccountType(wallet){wallet=String(wallet||'').toLowerCase();if(/momo|vodafone|telecel|mtn|airtel|tigo/.test(wallet))return'MoMo';if(/cash/.test(wallet)&&!/account/.test(wallet))return'Cash';return'Bank';}
function syncAccountType(pre){const wal=document.getElementById(pre+'Wal'),acct=document.getElementById(pre+'AcctType');if(wal&&acct)acct.value=inferAccountType(wal.value);}
function autoCategorize(pre){
  const desc=(document.getElementById(pre+'Desc')?.value||'').toLowerCase(),sel=document.getElementById(pre+'Cat');if(!sel)return;
  const cat=inferSmsCat(desc);
  if(cat&&[...sel.options].some(o=>o.value===cat||o.text===cat)){sel.value=cat;return;}
  // Fallback for income forms where expense inference may not apply.
  const incCat=/salary|payroll|wage|stipend/.test(desc)?'Salary / Monthly Pay':/dividend|interest|returns|coupon/.test(desc)?'Investment Returns':'';
  if(incCat&&[...sel.options].some(o=>o.value===incCat||o.text===incCat))sel.value=incCat;
}
function voiceInput(targetId,btn){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast('Voice input is not supported in this browser.');return;}
  const rec=new SR();rec.lang='en-GB';rec.interimResults=true;rec.maxAlternatives=3;rec.continuous=true;
  btn&&btn.classList.add('listening');S.voicePermissionRequested=true;persist();let finalText='';
  rec.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++){const r=e.results[i];if(r.isFinal)finalText+=(finalText?' ':'')+r[0].transcript;}};
  rec.onerror=()=>toast('Could not capture voice. Try again.');
  rec.onend=()=>{btn&&btn.classList.remove('listening');if(finalText.trim())parseVoiceInputEnhanced(targetId,finalText.trim());};
  rec.start();setTimeout(()=>{try{rec.stop();}catch(e){}},14000);
}


function parseVoiceInputEnhanced(targetId,raw){
  parseVoiceInput(targetId,raw);
  const pre=targetId.startsWith('i')?'i':targetId.startsWith('e')?'e':targetId.startsWith('qa')?'qa':'e';
  const txt=raw.toLowerCase();
  const set=(id,v)=>{const el=document.getElementById(id);if(el&&v!==undefined&&v!=='')el.value=v;};
  // type
  if(pre==='qa'){if(/income|received|salary|paid me|credit/.test(txt))set('qaType','income'); if(/expense|spent|paid|bought|debit|cash out/.test(txt))set('qaType','expense');buildQuickAddCats();}
  // category from all known categories
  const cats=(pre==='i'||/income|received|salary|credit/.test(txt))?getIncCats():getExpCats();
  const direct=cats.find(c=>txt.includes(c.toLowerCase().replace(/[\/()]/g,'').split(' ')[0])||txt.includes(c.toLowerCase()));
  const inferred=(pre==='i')?(inferSmsCat(txt)==='Salary / Monthly Pay'?'Salary / Monthly Pay':'Other Income'):inferSmsCat(txt);
  const cat=direct||inferred;
  if(pre==='qa'){const qs=document.getElementById('qaCat');if(qs&&[...qs.options].some(o=>o.value===cat))qs.value=cat;}else{const sel=document.getElementById(pre+'Cat');if(sel&&[...sel.options].some(o=>o.value===cat))sel.value=cat;}
  // wallet
  const opts=['Bank Account','MTN MoMo','Vodafone Cash','Cash','Savings','USD Account','Other',...(S.extraWallets||[]).map(w=>w.name)];
  const wallet=opts.find(w=>txt.includes(w.toLowerCase()))||(txt.includes('momo')?'MTN MoMo':txt.includes('cash')?'Cash':txt.includes('bank')?'Bank Account':'');
  if(wallet){if(pre==='qa')set('qaWal',wallet);else{set(pre+'Wal',wallet);syncAccountType(pre);}}
  // account type
  if(/momo|mobile money/.test(txt)&&pre!=='qa')set(pre+'AcctType','MoMo'); else if(/cash/.test(txt)&&pre!=='qa')set(pre+'AcctType','Cash'); else if(/bank|account/.test(txt)&&pre!=='qa')set(pre+'AcctType','Bank');
  // note/description cleanup
  const desc=raw.replace(/(income|expense|paid|spent|received|salary|today|yesterday|cedis|ghana cedis|dollars|usd|cash|bank|momo)/gi,'').replace(/[0-9,.]+/g,'').trim();
  if(desc){if(pre==='qa')set('qaDesc',desc);else set(pre+'Desc',desc);}
  toast('🎙️ Voice details filled. Review before saving.');
}

function parseVoiceInput(targetId,raw){
  const pre=targetId.startsWith('i')?'i':targetId.startsWith('e')?'e':targetId.startsWith('qa')?'qa':'e';
  const txt=raw.toLowerCase().trim();
  let remaining=raw.trim();
  let parsed={};

  // ── AMOUNT detection ─────────────────────────────
  // patterns: "50 cedis", "GH₵ 200", "200 Ghana cedis", "fifty cedis", "one hundred"
  const wordNums={'zero':0,'one':1,'two':2,'three':3,'four':4,'five':5,'six':6,'seven':7,'eight':8,'nine':9,'ten':10,'eleven':11,'twelve':12,'thirteen':13,'fourteen':14,'fifteen':15,'sixteen':16,'seventeen':17,'eighteen':18,'nineteen':19,'twenty':20,'thirty':30,'forty':40,'fifty':50,'sixty':60,'seventy':70,'eighty':80,'ninety':90,'hundred':100,'thousand':1000,'million':1000000};
  function wordsToNum(s){
    const parts=s.trim().split(/\s+/);let total=0,cur=0;
    for(const p of parts){const n=wordNums[p];if(n===undefined)return NaN;if(n>=1000){total=(total+cur)*n;cur=0;}else if(n===100){cur=cur?cur*100:100;}else cur+=n;}
    return total+cur||NaN;
  }
  // numeric amount with optional currency prefix/suffix
  let amtMatch=txt.match(/(?:gh[₵c]?|ghs|cedis?)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:gh[₵c]?|ghs|cedis?|ghana cedis?|dollars?|usd)?/i);
  if(amtMatch){
    const num=parseFloat(amtMatch[1].replace(/,/g,''));
    if(!isNaN(num)&&num>0){parsed.amount=num;remaining=remaining.replace(amtMatch[0],'').trim();}
  }
  // fallback: word numbers
  if(!parsed.amount){
    const wMatch=txt.match(/((?:(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million)\s*)+)/i);
    if(wMatch){const n=wordsToNum(wMatch[1].toLowerCase());if(!isNaN(n)&&n>0){parsed.amount=n;remaining=remaining.replace(wMatch[0],'').trim();}}
  }

  // ── CURRENCY detection ───────────────────────────
  if(/\$|dollar|usd/i.test(txt)) parsed.currency='USD';
  else if(/gh[₵c]|cedi|ghs/i.test(txt)) parsed.currency='GHS';

  // ── DATE detection ───────────────────────────────
  const todayD=new Date(),yd=new Date();yd.setDate(todayD.getDate()-1);
  const fmt2=d=>d.toISOString().slice(0,10);
  if(/\btoday\b/i.test(txt)){parsed.date=fmt2(todayD);remaining=remaining.replace(/today/i,'').trim();}
  else if(/\byesterday\b/i.test(txt)){parsed.date=fmt2(yd);remaining=remaining.replace(/yesterday/i,'').trim();}
  else if(/\blast\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(txt)){
    const dayMap={sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6};
    const m=txt.match(/last\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    if(m){const target=dayMap[m[1].toLowerCase()],cur=todayD.getDay(),diff=((cur-target)+7)%7||7;const d2=new Date();d2.setDate(todayD.getDate()-diff);parsed.date=fmt2(d2);remaining=remaining.replace(m[0],'').trim();}
  }
  else{
    // DD/MM/YYYY or MM/DD or "3rd May" or "May 3"
    const dmMatch=txt.match(/(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/);
    if(dmMatch){const day=parseInt(dmMatch[1]),mon=parseInt(dmMatch[2])-1,yr=dmMatch[3]?parseInt(dmMatch[3]):todayD.getFullYear();const d2=new Date(yr<100?yr+2000:yr,mon,day);if(!isNaN(d2)){parsed.date=fmt2(d2);remaining=remaining.replace(dmMatch[0],'').trim();}}
    else{
      const mnMap={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11,january:0,february:1,march:2,april:3,june:5,july:6,august:7,september:8,october:9,november:10,december:11};
      const wdMatch=txt.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)/i)||txt.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?/i);
      if(wdMatch){
        let day,mon;
        if(isNaN(parseInt(wdMatch[1]))){mon=mnMap[wdMatch[1].toLowerCase()];day=parseInt(wdMatch[2]);}
        else{day=parseInt(wdMatch[1]);mon=mnMap[wdMatch[2].toLowerCase()];}
        if(mon!==undefined&&day){const d2=new Date(todayD.getFullYear(),mon,day);parsed.date=fmt2(d2);remaining=remaining.replace(wdMatch[0],'').trim();}
      }
    }
  }

  // ── WALLET detection ─────────────────────────────
  if(/mtn|momo|mobile money/i.test(txt)){parsed.wallet='MTN MoMo';remaining=remaining.replace(/mtn momo|mtn|mobile money|momo/gi,'').trim();}
  else if(/voda|telecel|vodafone/i.test(txt)){parsed.wallet='Vodafone Cash';remaining=remaining.replace(/vodafone cash|vodafone|telecel|voda/gi,'').trim();}
  else if(/cash/i.test(txt)&&!/cashback/i.test(txt)){parsed.wallet='Cash';remaining=remaining.replace(/\bcash\b/gi,'').trim();}
  else if(/savings?/i.test(txt)&&!/savings? transfer/i.test(txt)){parsed.wallet='Savings';remaining=remaining.replace(/\bsavings?\b/gi,'').trim();}
  else if(/bank|gcb|ecobank|fidelity|cal bank|absa|access|sg bank|first national|republic bank/i.test(txt)){parsed.wallet='Bank Account';remaining=remaining.replace(/\bbank\b|gcb|ecobank|fidelity|cal bank|absa|access bank|sg bank/gi,'').trim();}

  // ── Clean remaining as description ───────────────
  const desc=remaining.replace(/\s+/g,' ').trim();

  // ── Apply to form ─────────────────────────────────
  const descEl=document.getElementById(targetId);
  if(descEl&&desc){descEl.value=desc;}

  if(parsed.amount){
    const amtEl=document.getElementById(pre+'Amt')||document.getElementById(pre==='qa'?'qaAmt':pre+'Amt');
    if(amtEl)amtEl.value=parsed.amount;
  }
  if(parsed.currency){
    const curEl=document.getElementById(pre+'Cur')||document.getElementById(pre==='qa'?'qaCur':pre+'Cur');
    if(curEl)curEl.value=parsed.currency;
  }
  if(parsed.date){
    const dateEl=document.getElementById(pre+'Date');
    if(dateEl)dateEl.value=parsed.date;
  }
  if(parsed.wallet){
    const walEl=document.getElementById(pre+'Wal');
    if(walEl){
      const opt=[...walEl.options].find(o=>o.value===parsed.wallet||o.textContent.trim()===parsed.wallet);
      if(opt)walEl.value=parsed.wallet;
      if(pre==='i'||pre==='e')syncAccountType(pre);
    }
  }

  // ── Auto-categorise from description ─────────────
  autoCategorize(pre==='qa'?'e':pre);
  applyPayeePrefill(pre==='qa'?'e':pre);

  // ── Feedback toast ────────────────────────────────
  const parts=[];
  if(desc)parts.push('📝 "'+desc+'"');
  if(parsed.amount)parts.push('💰 '+(parsed.currency==='USD'?'$':'')+parsed.amount+(parsed.currency!=='USD'?' GH₵':''));
  if(parsed.date)parts.push('📅 '+parsed.date);
  if(parsed.wallet)parts.push('👛 '+parsed.wallet);
  toast('🎙️ Heard: '+parts.join(' · '));
}

const WMAP={'Bank Account':'bank','MTN MoMo':'mtn','Vodafone Cash':'voda','Cash':'cash','Savings':'sav','USD Account':'usd','Other':'oth','Savings Account':'sav','Reinvested':null};
const WLBL={bank:'Bank Account',mtn:'MTN MoMo',voda:'Vodafone Cash',cash:'Cash',sav:'Savings',usd:'USD Account',oth:'Other'};

const DEF_INC=['Salary / Monthly Pay','Freelance / Contract','Business / Self-Employment','Overtime / Bonus','Commission','Allowance / Stipend','Investment Returns','Dividends','Rental Income','Bank Interest','Social Media / Content','Online Sales','Referral / Affiliate','Tutoring / Teaching','Gift / Money Received','Loan Repayment Received','Grants / Scholarships','Pension / Retirement','Other Income'];
const DEF_EXP=['Rent / Accommodation','Groceries / Food Market','Utilities (GWCL, ECG)','Transport / Fuel / Ride','Car Maintenance','Airtime & Mobile Data','Medical / Pharmacy','Insurance','Restaurants / Eating Out','Takeaway / Delivery','Drinks & Snacks','Hair & Beauty','Skincare & Makeup','Clothing & Accessories','Gym & Fitness','Personal Hygiene','Entertainment / Events','Travel & Holidays','Shopping','Subscriptions','Gifts Given','Education / Courses','Business Expense','Professional Development','Loan Repayment','Savings Transfer','Investment Contribution','Church / Tithe / Donation','Family Support','Miscellaneous'];
const CE={'Salary / Monthly Pay':'👩🏾‍💼','Freelance / Contract':'👩🏾‍💻','Business / Self-Employment':'🏪','Overtime / Bonus':'⏰','Commission':'🤝🏾','Allowance / Stipend':'🎁','Investment Returns':'📈','Dividends':'💎','Rental Income':'🏠','Bank Interest':'🏦','Social Media / Content':'📱','Online Sales':'🛍️','Referral / Affiliate':'🔗','Tutoring / Teaching':'📚','Gift / Money Received':'🎀','Loan Repayment Received':'↩️','Grants / Scholarships':'🏆','Pension / Retirement':'👵🏾','Other Income':'✨','Rent / Accommodation':'🏠','Groceries / Food Market':'🛒','Utilities (GWCL, ECG)':'💡','Transport / Fuel / Ride':'🚗','Car Maintenance':'🔧','Airtime & Mobile Data':'📱','Medical / Pharmacy':'💊','Insurance':'🛡️','Restaurants / Eating Out':'🍽️','Takeaway / Delivery':'🥡','Drinks & Snacks':'☕','Hair & Beauty':'💇🏾‍♀️','Skincare & Makeup':'✨','Clothing & Accessories':'👗','Gym & Fitness':'🏋🏾‍♀️','Personal Hygiene':'🧴','Entertainment / Events':'🎬','Travel & Holidays':'✈️','Shopping':'🛍️','Subscriptions':'📺','Gifts Given':'🎁','Education / Courses':'📚','Business Expense':'💼','Professional Development':'🌟','Loan Repayment':'💳','Savings Transfer':'🏦','Investment Contribution':'📈','Church / Tithe / Donation':'🙏🏾','Family Support':'👨‍👩‍👧','Miscellaneous':'🎲'};

const INC_GROUPS={
  'Employment & Professional':['Salary / Monthly Pay','Allowance / Stipend','Overtime / Bonus','Commission','Freelance / Contract','Consulting / Professional Fees','Tutoring / Teaching'],
  'Business & Investments':['Business / Self-Employment','Investment Returns','Dividends','Rental Income','Bank Interest','Social Media / Content','Online Sales','Referral / Affiliate'],
  'Support & Other':['Gift / Money Received','Loan Repayment Received','Grants / Scholarships','Pension / Retirement','Other Income']
};
const EXP_GROUPS={
  'Home & Essentials':['Rent / Accommodation','Groceries / Food Market','Utilities (GWCL, ECG)','Airtime & Mobile Data'],
  'Transport & Vehicle':['Transport / Fuel / Ride','Car Maintenance'],
  'Health & Personal Care':['Medical / Pharmacy','Insurance','Hair & Beauty','Skincare & Makeup','Personal Hygiene','Gym & Fitness'],
  'Lifestyle & Social':['Restaurants / Eating Out','Takeaway / Delivery','Drinks & Snacks','Entertainment / Events','Travel & Holidays','Shopping','Clothing & Accessories','Gifts Given'],
  'Finance & Growth':['Subscriptions','Loan Repayment','Savings Transfer','Investment Contribution','Education / Courses','Professional Development','Business Expense'],
  'Family, Faith & Other':['Church / Tithe / Donation','Family Support','Miscellaneous']
};
function buildGroupedOptions(groups, custom, selected){
  let html='';
  Object.entries(groups).forEach(([g,cats])=>{html+=`<optgroup label="${esc(g)}">`+cats.map(c=>`<option value="${esc(c)}"${c===selected?' selected':''}>${ce(c)} ${esc(c)}</option>`).join('')+'</optgroup>';});
  if(custom&&custom.length)html+=`<optgroup label="Custom">`+custom.map(x=>`<option value="${esc(x.name)}"${x.name===selected?' selected':''}>${esc(x.emoji||'💰')} ${esc(x.name)}</option>`).join('')+'</optgroup>';
  return html;
}
function ce(c){const cust=[...(S.customIncCats||[]),...(S.customExpCats||[])].find(x=>x.name===c);return cust?(cust.emoji||'💰'):(CE[c]||'💰');}
function getIncCats(){return[...DEF_INC,...(S.customIncCats||[]).map(x=>x.name)];}
function getExpCats(){return[...DEF_EXP,...(S.customExpCats||[]).map(x=>x.name)];}
function buildCatSelects(){
  const iSel=document.getElementById('iCat'),eSel=document.getElementById('eCat');
  const iVal=(iSel&&iSel.value)||getIncCats()[0], eVal=(eSel&&eSel.value)||getExpCats()[0];
  if(iSel)iSel.innerHTML=buildGroupedOptions(INC_GROUPS,S.customIncCats||[],iVal);
  if(eSel)eSel.innerHTML=buildGroupedOptions(EXP_GROUPS,S.customExpCats||[],eVal);
  const bSel=document.getElementById('bCatSelect');
  if(bSel){const bVal=bSel.value||getExpCats()[0];bSel.innerHTML=buildGroupedOptions(EXP_GROUPS,S.customExpCats||[],bVal);}
}
function openCatModal(type){document.getElementById('catType').value=type;document.getElementById('catName').value='';document.getElementById('catEmoji').value='';populateDeleteCustomCatSelect();document.getElementById('catModal').classList.add('open');}
function saveCustomCat(){
  const name=document.getElementById('catName').value.trim(),emoji=document.getElementById('catEmoji').value.trim()||'💰',type=document.getElementById('catType').value;
  if(!name){toast('Please enter a category name.');return;}
  const all=[...getIncCats(),...getExpCats()];
  if(all.includes(name)){toast('That category already exists.');return;}
  snap('Add category '+name);
  if(type==='income')S.customIncCats.push({name,emoji});else S.customExpCats.push({name,emoji});
  persist();buildCatSelects();rebuildWalletSelects();buildBCatList();closeM('catModal');toast('✅ Category added!');
}

const PAGES=['dashboard','income','expenses','subscriptions','investments','loans','budget','wallets','analysis','projections','goals','planner','tools','assets','adviser','settings'];

function scrollSettingsToTop(){
  const content=document.querySelector('.content');
  const main=document.querySelector('.main-area');
  try{window.scrollTo({top:0,left:0,behavior:'auto'});}catch(e){window.scrollTo(0,0);}
  if(content)content.scrollTop=0;
  if(main)main.scrollTop=0;
}

function showPage(p){
  document.body.classList.toggle('settings-open',p==='settings');document.body.classList.toggle('tools-open',p==='tools');if(p==='tools'){setTimeout(()=>{const active=document.querySelector('#page-tools .tool-detail.active')||document.getElementById('tool-sms');if(active){active.classList.add('active');active.style.display='block';}},0);}
  const realPage=(p==='assets'||p==='investments')?'investments':p;
  document.querySelectorAll('.page').forEach(pg=>pg.classList.remove('active'));
  const target=document.getElementById('page-'+realPage);
  if(target)target.classList.add('active');

  document.querySelectorAll('.nav-link').forEach(btn=>{
    btn.classList.remove('active');
    if(btn.dataset.page===p)btn.classList.add('active');
  });

  const content=document.querySelector('.content');
  const main=document.querySelector('.main-area');

  if(p==='settings'){
    loadSettingsPage();
    setTimeout(()=>{
      if(!document.querySelector('#page-settings .setting-detail.active'))showSettingDetail('profile');
      if(content)content.scrollTop=0;
      if(main)main.scrollTop=0;
      window.scrollTo({top:0,left:0,behavior:'auto'});
    },0);
  }else if(p==='assets'){
    const el=document.getElementById('assetsAnchor')||document.getElementById('astN')||document.getElementById('astList');
    if(el)setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'start'}),120);
  }else{
    if(content)content.scrollTop=0;
    if(main)main.scrollTop=0;
    window.scrollTo({top:0,left:0,behavior:'auto'});
  }

  refreshAll();
}
let currentMonth=new Date().toISOString().slice(0,7);
function buildMonthBar(){
  const bar=document.getElementById('mBar'); if(!bar)return;
  const now=new Date(),months=[];
  for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push(d.toISOString().slice(0,7));}
  bar.innerHTML=months.map(m=>{const lbl=new Date(m+'-02').toLocaleDateString('en-GB',{month:'short',year:'numeric'});return`<button class="mpill${m===currentMonth?' active':''}" onclick="setMo('${m}')">${lbl}</button>`;}).join('');
}
function setMo(m){currentMonth=m;buildMonthBar();renderDashStats();renderPies();renderRecent();renderBudgProg();}

function openModal(title,body,actions=[]){document.getElementById('emT').textContent=title;document.getElementById('emB').innerHTML=body;const a=document.querySelector('#editModal .macts');if(a)a.innerHTML=actions.join('');document.getElementById('editModal').classList.add('open');}

function closeM(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.mov').forEach(el=>el.addEventListener('click',function(e){if(e.target===this)this.classList.remove('open');}));

function factoryResetWithPin(){
  const saved=localStorage.getItem(PIN_KEY)||'';
  if(saved){
    const inp=document.getElementById('factoryResetPinInput');
    if(inp)inp.value='';
    document.getElementById('factoryPinModal').classList.add('open');
    setTimeout(()=>document.getElementById('factoryResetPinInput')?.focus(),120);
    return;
  }
  confirmDlg('Factory Reset','This will wipe ALL data, including your PIN, and reset the app. This cannot be undone.','⚠️ Yes, Reset Everything','btn-re',()=>{localStorage.clear();location.reload();});
}
function confirmFactoryResetPin(){
  const saved=localStorage.getItem(PIN_KEY)||'',entered=document.getElementById('factoryResetPinInput')?.value||'';
  if(entered!==saved){toast('Factory reset cancelled. PIN was incorrect.');return;}
  closeM('factoryPinModal');
  confirmDlg('Factory Reset','PIN confirmed. This will wipe ALL data, including your PIN, and reset the app. This cannot be undone.','⚠️ Yes, Reset Everything','btn-re',()=>{localStorage.clear();location.reload();});
}

function togglePinVisibility(ids){ids.forEach(id=>{const el=document.getElementById(id);if(el)el.type=el.type==='password'?'text':'password';});}

function confirmWelcomeGuide(){
  localStorage.setItem('nuellieWelcomeGuideSeen','1');
  const w=document.getElementById('welcomeCard');if(w)w.style.display='none';
  toast('Welcome guide hidden permanently.');
}
function applyWelcomeGuideState(){
  const w=document.getElementById('welcomeCard');if(!w)return;
  if(localStorage.getItem('nuellieWelcomeGuideSeen')==='1')w.style.display='none';
}

function confirmDlg(title,body,yLbl,yCls,onY,nLbl,onN){
  document.getElementById('cmT').textContent=title;document.getElementById('cmB').innerHTML=body;
  const y=document.getElementById('cmY'),n=document.getElementById('cmN');y.textContent=yLbl||'Yes';y.className='btn '+(yCls||'btn-pk');n.textContent=nLbl||'No';
  y.onclick=()=>{closeM('confirmModal');onY&&onY();};n.onclick=()=>{closeM('confirmModal');onN&&onN();};
  document.getElementById('confirmModal').classList.add('open');
}

let editTxnId=null;
function resetTxnEdit(type){
  const pre=type==='income'?'i':'e',btn=document.getElementById(pre+'SubmitBtn');
  editTxnId=null;
  if(btn)btn.textContent=type==='income'?'✅ Save Income':'✅ Save Expense';
}
/* editTxnId already declared */
function resetTxnEdit(type){
  const pre=type==='income'?'i':'e',btn=document.getElementById(pre+'SubmitBtn');
  editTxnId=null;
  if(btn)btn.textContent=type==='income'?'✅ Save Income':'✅ Save Expense';
}

function inferAccountTypeFromWallet(wallet){
  const w=String(wallet||'').toLowerCase();
  if(w.includes('cash') && !w.includes('momo') && !w.includes('vodafone'))return 'Cash';
  if(w.includes('momo')||w.includes('vodafone')||w.includes('telecel')||w.includes('tigo')||w.includes('mobile money'))return 'MoMo';
  if(w.includes('bank')||w.includes('account')||w.includes('savings')||w.includes('usd'))return 'Bank';
  return 'Other';
}

function addTxn(type){
  const isI=type==='income',pre=isI?'i':'e';
  const rawAmt=numVal(pre+'Amt',0),currency=safeSelect(pre+'Cur','GHS'),fxRate=numVal(pre+'FxRate',usdRate||15.5),amt=txnAmountGHS(pre,rawAmt);
  if(!rawAmt||rawAmt<=0){toast('Please enter a valid amount.');return;}
  const splits=getSplits(pre);if(splits.length&&!validateSplits(pre)){toast('Split subtotal must equal total amount.');return;}
  const desc=safeText(pre+'Desc'),cat=safeSelect(pre+'Cat',isI?'Other Income':'Miscellaneous'),wal=safeSelect(pre+'Wal','Bank Account'),date=safeSelect(pre+'Date',today()),notes=safeText(pre+'Notes'),accountType=safeSelect(pre+'AcctType',inferAccountType(wal)),wk=WMAP[wal]||'',geo=safeText(pre+'Geo'),receipt=receiptCache[pre]||'';
  const record=cleanRecord({id:editTxnId||Date.now()+Math.random(),type:type||'',desc,amount:amt,rawAmount:rawAmt,currency,cat,wallet:wal,accountType,date,notes,geo,receipt,splits:splits.map(s=>({cat:s.cat,amount:currency==='USD'?s.amount*fxRate:s.amount,rawAmount:s.amount,currency,fxRate}))});
  function commit(updWal){
    if(editTxnId){
      const idx=S.transactions.findIndex(t=>String(t.id)===String(editTxnId));
      snap('Update transaction');
      if(idx>-1)S.transactions[idx]=Object.assign({},S.transactions[idx],record);
      resetTxnEdit(type);
    }else{
      snap((isI?'Add income ':'Add expense ')+fmt(amt));
      S.transactions.push(record);
      if(updWal&&wk&&S.wallets[wk]!==undefined) S.wallets[wk]=(S.wallets[wk]||0)+(isI?amt:-amt);
    }
    persist();refreshAll();
    ['Amt','Desc','Notes'].forEach(f=>{const el=document.getElementById(pre+f);if(el)el.value='';});
    const acct=document.getElementById(pre+'AcctType');if(acct)acct.value=inferAccountType(safeSelect(pre+'Wal','Bank Account'));
    resetAdvancedEntry(pre);const ps=document.getElementById(pre+'ParsedSmsSummary');if(ps)ps.remove();const sr=document.getElementById('smsResult');if(sr)sr.innerHTML='';const qsr=document.getElementById('quickSheetSmsText');const fx=document.getElementById(pre+'FxRate');if(fx)fx.value='';
    toast(editTxnId?'✅ Entry updated!':'✅ '+(isI?'Income':'Expense')+' saved!');
  }
  function doSave(updWal){ if(editTxnId)commit(false); else similarTxnWarning(record,()=>commit(updWal)); }
  if(editTxnId){doSave(false);return;}
  if(wk&&S.wallets[wk]!==undefined){
    const bal=S.wallets[wk]||0,after=bal+(isI?amt:-amt);
    confirmDlg(isI?'Credit Wallet?':'Debit Wallet?',`<b>${esc(wal)}</b> balance: <b>${fmt(bal)}</b><br>${isI?`Credit <b>+${fmt(amt)}</b> → <b>${fmt(after)}</b>`:`Debit <b>-${fmt(amt)}</b> → <b>${fmt(after)}</b>`}<br><br>Update wallet balance?`,isI?'✅ Yes, credit':'✅ Yes, debit','btn-mt',()=>doSave(true),'Just record',()=>doSave(false));
  } else doSave(false);
}
function delTxn(id){snap('Delete transaction');S.transactions=S.transactions.filter(t=>t.id!==id);persist();refreshAll();toast('Entry deleted.');}

function editTxnInline(id){
  const t=S.transactions.find(x=>String(x.id)===String(id));if(!t)return;
  const isI=t.type==='income',pre=isI?'i':'e';
  showPage(isI?'income':'expenses');
  setTimeout(()=>{
    editTxnId=t.id;
    document.getElementById(pre+'Desc').value=t.desc||'';
    document.getElementById(pre+'Amt').value=t.rawAmount||t.amount||0;const cur=document.getElementById(pre+'Cur');if(cur)cur.value=t.currency||'GHS';const fx=document.getElementById(pre+'FxRate');if(fx)fx.value=t.fxRate||S.usdRate||usdRate||15.5;
    document.getElementById(pre+'Cat').value=t.cat||'';
    document.getElementById(pre+'Wal').value=t.wallet||'Bank Account';
    const acct=document.getElementById(pre+'AcctType');if(acct)acct.value=t.accountType||inferAccountType(t.wallet);
    document.getElementById(pre+'Date').value=t.date||today();
    document.getElementById(pre+'Notes').value=t.notes||'';const geo=document.getElementById(pre+'Geo'),gl=document.getElementById(pre+'GeoLbl');if(geo)geo.value=t.geo||'';if(gl)gl.textContent=t.geo?'📍 Logged near current location':'';
    const btn=document.getElementById(pre+'SubmitBtn');if(btn)btn.textContent='💾 Update '+(isI?'Income':'Expense');
    document.getElementById(pre+'Desc').scrollIntoView({behavior:'smooth',block:'center'});
    document.getElementById(pre+'Desc').focus();
  },120);
}

function openEditTxn(id){
  const t=S.transactions.find(x=>String(x.id)===String(id));if(!t)return;const isI=t.type==='income',cats=isI?getIncCats():getExpCats(),wals=['Bank Account','MTN MoMo','Vodafone Cash','Cash','Savings','USD Account','Other'];
  document.getElementById('emT').textContent='Edit '+(isI?'Income':'Expense');
  document.getElementById('emB').innerHTML=`<div class="fgg"><div class="fg"><label>Description</label><input type="text" id="em-desc" value="${esc(t.desc||'')}"></div><div class="fg"><label>Amount</label><input type="number" id="em-amt" value="${t.rawAmount||t.amount}" min="0"></div><div class="fg"><label>Currency</label><select id="em-cur"><option value="GHS"${(t.currency||'GHS')==='GHS'?' selected':''}>GH₵</option><option value="USD"${t.currency==='USD'?' selected':''}>$ USD</option></select></div><div class="fg"><label>Historical USD Rate</label><input type="number" id="em-fx" value="${t.fxRate||S.usdRate||usdRate||15.5}" step="0.01"></div><div class="fg"><label>Category</label><select id="em-cat">${cats.map(c=>`<option${c===t.cat?' selected':''}>${esc(c)}</option>`).join('')}</select></div><div class="fg"><label>Wallet</label><select id="em-wal">${wals.map(w=>`<option${w===t.wallet?' selected':''}>${esc(w)}</option>`).join('')}</select></div><div class="fg"><label>Date</label><input type="date" id="em-date" value="${t.date}"></div><div class="fg"><label>Notes</label><input type="text" id="em-notes" value="${esc(t.notes||'')}"></div></div>`;
  document.getElementById('emS').onclick=()=>{const a=parseFloat(document.getElementById('em-amt').value);if(!a||a<=0){toast('Please enter a valid amount.');return;}snap('Edit transaction');t.desc=document.getElementById('em-desc').value.trim();t.rawAmount=a;t.currency=document.getElementById('em-cur')?.value||t.currency||'GHS';t.fxRate=parseFloat(document.getElementById('em-fx')?.value)||t.fxRate||S.usdRate||usdRate||15.5;t.amount=t.currency==='USD'?a*t.fxRate:a;t.cat=document.getElementById('em-cat').value;t.wallet=document.getElementById('em-wal').value;t.accountType=inferAccountType(t.wallet);t.date=document.getElementById('em-date').value||today();t.notes=document.getElementById('em-notes').value.trim();persist();closeM('editModal');refreshAll();toast('✅ Updated!');};
  document.getElementById('editModal').classList.add('open');
}
function renderTxnList(elId,filter,limit){
  const el=document.getElementById(elId);if(!el)return;let txns=S.transactions.filter(filter).sort((a,b)=>b.date.localeCompare(a.date));if(limit)txns=txns.slice(0,limit);
  if(!txns.length){el.innerHTML='<div class="empty"><div class="big">✨</div><p>No entries yet.</p></div>';return;}
  el.innerHTML=txns.map(t=>`<div class="txi" onclick="editTxnInline(${t.id})"><div class="txico" style="background:${t.type==='income'?'var(--gr-l)':'var(--red-l)'}">${ce(t.cat)}</div><div class="txi-info"><div class="txi-name">${esc(t.desc||t.cat)}</div><div class="txi-cat"><span class="badge ${t.type==='income'?'bgr':'bre'}">${ce(t.cat)} ${esc(t.cat)}</span> · ${esc(t.wallet)}${t.accountType?' · '+esc(t.accountType):''}</div></div><div style="text-align:right;"><div class="txi-amt ${t.type==='income'?'ain':'aout'}">${t.type==='income'?'+':'-'}${t.currency==='USD'?'$'+(t.rawAmount||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})+' @ '+(t.fxRate||'')+' = '+fmt(t.amount):fmt(t.amount)}</div><div class="txi-date">${t.date}</div></div><div style="display:flex;gap:3px;flex-shrink:0;"><button title="✏️" aria-label="✏️" class="btn btn-out btn-xs" onclick="event.stopPropagation();editTxnInline(${t.id})">✏️</button><button title="✕" aria-label="✕" class="btn btn-re btn-xs" onclick="event.stopPropagation();delTxn(${t.id})">✕</button></div></div>`).join('');
}

let invC='GHS',astC='GHS';
function setIC(c){invC=c;document.getElementById('invGHS').classList.toggle('active',c==='GHS');document.getElementById('invUSD').classList.toggle('active',c==='USD');document.getElementById('invCL').textContent=c==='USD'?'$':'GHS';document.getElementById('invFL').textContent=c==='USD'?'$':'GHS';document.getElementById('invCH').textContent=c==='USD'?`(Rate: GH₵${usdRate.toFixed(2)} per $1)`:'';}
function setAC(c){astC=c;document.getElementById('astGHS').classList.toggle('active',c==='GHS');document.getElementById('astUSD').classList.toggle('active',c==='USD');document.getElementById('astCL').textContent=c==='USD'?'$':'GHS';document.getElementById('astCH').textContent=c==='USD'?`(Rate: GH₵${usdRate.toFixed(2)} per $1)`:'';}
function togInvRT(){const v=document.getElementById('invRT').value;document.getElementById('invPG').style.display=v==='pct'?'':'none';document.getElementById('invFG').style.display=v==='fixed'?'':'none';}
function moRet(inv){if(inv.returnType==='fixed')return inv.fixedMonthly||0;return (inv.amount||0)*(inv.rate||0)/100/12;}
function addInv(){
  const name=safeText('invN'),rawA=numVal('invA',0);
  if(!name||!rawA||rawA<=0){toast('Please enter a name and valid amount.');return;}
  const rt=safeSelect('invRT','pct'),rate=rt==='pct'?numVal('invR',0):0,fixR=rt==='fixed'?numVal('invF',0):0,fixMo=invC==='USD'?fixR*(usdRate||15.5):fixR,amtGHS=invC==='USD'?rawA*(usdRate||15.5):rawA,cvRaw=numVal('invCV',0),divRaw=numVal('invDiv',0),feeRaw=numVal('invFees',0),currentValue=cvRaw?(invC==='USD'?cvRaw*(usdRate||15.5):cvRaw):amtGHS,dividends=invC==='USD'?divRaw*(usdRate||15.5):divRaw,fees=invC==='USD'?feeRaw*(usdRate||15.5):feeRaw;
  snap('Add investment '+name);
  S.investments.push(cleanRecord({id:Date.now()+Math.random(),name,amount:amtGHS,amtRaw:rawA,currency:invC||'GHS',type:safeSelect('invT','Other'),returnType:rt,rate,fixedMonthly:fixMo,start:safeSelect('invS',today()),maturity:safeSelect('invM',''),creditTo:safeSelect('invC','Bank Account'),notes:safeText('invNt'),lastCredited:'',currentValue,dividends,fees}));
  persist();refreshAll();
  ['invN','invA','invR','invF','invNt','invCV','invDiv','invFees'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const m=document.getElementById('invM');if(m)m.value='';
  toast('💎 Investment saved!');
}
function delInv(id){snap('Delete investment');S.investments=S.investments.filter(i=>i.id!==id);persist();refreshAll();toast('Deleted.');}
function openEditInv(id){
  const inv=S.investments.find(i=>i.id===id);if(!inv)return;
  document.getElementById('emT').textContent='Edit Investment';
  document.getElementById('emB').innerHTML=`<div class="fgg"><div class="fg"><label>Name</label><input type="text" id="ei-n" value="${esc(inv.name)}"></div><div class="fg"><label>${inv.currency==='USD'?'Principal (USD $)':'Principal (GH₵)'}</label><input type="number" id="ei-a" value="${inv.currency==='USD'?(inv.amtRaw||inv.amount):inv.amount}" min="0"></div><div class="fg"><label>Currency</label><select id="ei-cur"><option value="GHS"${inv.currency!=='USD'?' selected':''}>GH₵</option><option value="USD"${inv.currency==='USD'?' selected':''}>$ USD</option></select></div><div class="fg"><label>Return Type</label><select id="ei-rt"><option value="pct"${inv.returnType==='pct'?' selected':''}>Percentage</option><option value="fixed"${inv.returnType==='fixed'?' selected':''}>Fixed Monthly</option></select></div><div class="fg"><label>Annual Rate (%)</label><input type="number" id="ei-r" value="${inv.rate||0}" step="0.1" min="0"></div><div class="fg"><label>Fixed Monthly (GH₵)</label><input type="number" id="ei-f" value="${inv.fixedMonthly||0}" min="0"></div><div class="fg"><label>Fund Manager / Transaction Charges (GH₵)</label><input type="number" id="ei-fees" value="${inv.fees||0}" min="0"></div><div class="fg"><label>Start Date</label><input type="date" id="ei-s" value="${inv.start||''}"></div><div class="fg"><label>Maturity</label><input type="date" id="ei-m" value="${inv.maturity||''}"></div><div class="fg"><label>Notes</label><input type="text" id="ei-nt" value="${esc(inv.notes||'')}"></div></div>`;
  document.getElementById('emS').onclick=()=>{snap('Edit investment');const eiCur=document.getElementById('ei-cur').value,eiRaw=parseFloat(document.getElementById('ei-a').value)||0,eiGHS=eiCur==='USD'?eiRaw*(usdRate||15.5):eiRaw;Object.assign(inv,{name:document.getElementById('ei-n').value.trim(),currency:eiCur,amtRaw:eiCur==='USD'?eiRaw:undefined,amount:eiGHS,returnType:document.getElementById('ei-rt').value,rate:parseFloat(document.getElementById('ei-r').value)||0,fixedMonthly:parseFloat(document.getElementById('ei-f').value)||0,fees:parseFloat(document.getElementById('ei-fees').value)||0,start:document.getElementById('ei-s').value,maturity:document.getElementById('ei-m').value,notes:document.getElementById('ei-nt').value.trim()});persist();closeM('editModal');refreshAll();toast('✅ Updated!');};
  document.getElementById('editModal').classList.add('open');
}
function renderInv(){
  const tb=document.getElementById('invBody');if(!tb)return;
  if(!S.investments.length){tb.innerHTML='<tr><td colspan="9"><div class="empty"><div class="big">💎</div><p>No investments yet.</p></div></td></tr>';['itot','imo','iyr'].forEach(id=>document.getElementById(id).textContent='GH₵ 0');document.getElementById('iavg').textContent='0%';return;}
  let tP=0,tM=0,wS=0;
  tb.innerHTML=S.investments.map(inv=>{const m=moRet(inv);tP+=inv.amount||0;tM+=m;if(inv.returnType==='pct')wS+=(inv.amount||0)*(inv.rate||0);const rb=inv.returnType==='pct'?`<span class="badge bpu">${inv.rate}% p.a.</span>`:`<span class="badge bm">Fixed ${fmt(inv.fixedMonthly)}/mo</span>`;const cL=inv.currency==='USD'?`$${inv.amtRaw} (≈${fmt(inv.amount)})`:fmt(inv.amount);return`<tr><td><b>${esc(inv.name)}</b>${inv.notes?`<br><span style="font-size:9.5px;color:var(--txm)">${esc(inv.notes)}</span>`:''}${inv.fees?`<br><span style="font-size:9.5px;color:var(--red)">Charges: ${fmt(inv.fees)}</span>`:''}</td><td><span class="badge bpu">${esc(inv.type)}</span></td><td>${cL}</td><td>${rb}</td><td style="color:var(--mint);font-weight:800;">${fmt(m)}</td><td style="color:var(--pu);font-weight:800;">${fmt(m*12)}</td><td style="font-size:10.5px;">${esc(inv.creditTo)}</td><td style="font-size:10.5px;color:var(--txm);">${inv.maturity||'—'}</td><td style="display:flex;gap:2px;"><button title="✏️" aria-label="✏️" class="btn btn-out btn-xs" onclick="openEditInv(${inv.id})">✏️</button><button title="✕" aria-label="✕" class="btn btn-re btn-xs" onclick="delInv(${inv.id})">✕</button></td></tr>`;}).join('');
  document.getElementById('itot').textContent=fmt(tP);document.getElementById('imo').textContent=fmt(tM);document.getElementById('iyr').textContent=fmt(tM*12);document.getElementById('iavg').textContent=(tP>0?(wS/tP).toFixed(1):0)+'%';
}
function autoCredit(){
  const nowYM=new Date().toISOString().slice(0,7);if(S.lastInterestRun===nowYM)return;
  const pending=S.investments.filter(inv=>inv.lastCredited!==nowYM&&(!inv.start||inv.start.slice(0,7)<nowYM)&&moRet(inv)>0);
  if(!pending.length){S.lastInterestRun=nowYM;persist();return;}
  const inv=pending[0],m=moRet(inv),isR=inv.creditTo==='Reinvest (add to principal)';
  confirmDlg('📅 Monthly Interest Due',`<b>${esc(inv.name)}</b> — monthly return of <b>${fmt(m)}</b> for <b>${nowYM}</b>.<br><br>Have you actually received this in real life?<br>${isR?'Will be added to principal.':`Credit to <b>${esc(inv.creditTo)}</b>.`}`,'✅ Yes, received','btn-mt',()=>{snap('Interest credited: '+inv.name);inv.lastCredited=nowYM;const wk=isR?null:walletKeyForLabel(inv.creditTo);if(wk&&S.wallets[wk]!==undefined)S.wallets[wk]=(S.wallets[wk]||0)+m;if(isR)inv.amount=(inv.amount||0)+m;S.transactions.push({id:Date.now()+Math.random(),type:'income',desc:`Interest: ${inv.name}`,amount:m,cat:'Investment Returns',wallet:isR?'Reinvested':inv.creditTo,date:nowYM+'-01',notes:'Auto-credited',auto:true});S.interestLog.push({invName:inv.name,amount:m,month:nowYM,creditTo:inv.creditTo});S.lastInterestRun=nowYM;persist();refreshAll();const rem=S.investments.filter(iv=>iv.lastCredited!==nowYM&&(!iv.start||iv.start.slice(0,7)<nowYM)&&moRet(iv)>0);if(rem.length)setTimeout(()=>autoCredit(),400);},'⏳ Not yet',()=>{});
}
function renderIntLog(){const card=document.getElementById('invLogCard'),el=document.getElementById('invLog');if(!S.interestLog.length){card.style.display='none';return;}card.style.display='';el.innerHTML=S.interestLog.slice().reverse().slice(0,12).map(l=>`<div class="txi"><div class="txico" style="background:var(--gr-l)">📈</div><div class="txi-info"><div class="txi-name">${esc(l.invName)}</div><div class="txi-cat">→ ${esc(l.creditTo)} · ${l.month}</div></div><div class="txi-amt ain">+${fmt(l.amount)}</div></div>`).join('');}

// ─── NET WORTH TREND ─────────────────────────────────────────────
function logNWSnapshot(){
  if(!S.nwHistory)S.nwHistory=[];
  const nowYM=new Date().toISOString().slice(0,7);
  const last=S.nwHistory[S.nwHistory.length-1];
  if(last&&last.m===nowYM)return; // already logged this month
  const p=nwParts();
  S.nwHistory.push({m:nowYM,nw:p.nw});
  if(S.nwHistory.length>24)S.nwHistory=S.nwHistory.slice(-24); // keep 24 months
  persist();
}
function renderNWTrend(){
  if(!canChart())return;
  dc('nwt');
  const ctx=document.getElementById('nwTrendChart');if(!ctx)return;
  if(!S.nwHistory||S.nwHistory.length<2){ctx.getContext&&ctx.getContext('2d').clearRect(0,0,ctx.width,ctx.height);return;}
  const labels=S.nwHistory.map(x=>new Date(x.m+'-02').toLocaleDateString('en-GB',{month:'short',year:'numeric'}));
  const data=S.nwHistory.map(x=>x.nw);
  CH.nwt=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'Net Worth',data,borderColor:'#7B1FA2',backgroundColor:'rgba(123,31,162,.08)',fill:true,tension:0.4,pointRadius:3,borderWidth:2.5}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>'Net Worth: '+fmt(c.parsed.y)}}},scales:{x:{grid:{display:false},ticks:{font:{size:9}},title:{display:true,text:'Month',font:{size:9},color:'#7E5A8A'}},y:{ticks:{callback:v=>'GHS'+v.toLocaleString(),font:{size:9}},title:{display:true,text:'Net Worth (GH₵)',font:{size:9},color:'#7E5A8A'}}}}});}

function renderDashBudgetSnap(){
  const el=document.getElementById('dashBudgetSnap');if(!el)return;
  const cats=Object.keys(S.budget||{});if(!cats.length){el.innerHTML='<div class="empty" style="padding:10px;"><p style="font-size:12px;">Set budgets in the Budget section to see this snapshot.</p></div>';return;}
  const mExp=S.transactions.filter(t=>t.type==='expense'&&t.date.startsWith(currentMonth)),sp={};mExp.forEach(t=>sp[t.cat]=(sp[t.cat]||0)+t.amount);
  el.innerHTML=cats.slice(0,6).map(c=>{const b=S.budget[c],s=sp[c]||0,p=Math.min(s/b*100,100),col=p>=100?'var(--red)':p>=75?'var(--pe)':'var(--mint)';return`<div style="margin-bottom:8px;"><div style="display:flex;justify-content:space-between;margin-bottom:2px;font-size:11.5px;"><span style="font-weight:700;">${ce(c)} ${esc(c)}</span><span style="color:var(--txm);">${fmt(s)} / ${fmt(b)}</span></div><div class="pb"><div class="pf" style="width:${p}%;background:${col};"></div></div></div>`;}).join('')+(cats.length>6?`<div style="font-size:10.5px;color:var(--txm);margin-top:4px;">+${cats.length-6} more categories — <button title="View All" aria-label="View All" class="btn btn-out btn-xs" onclick="showPage('budget')">View All</button></div>`:'');
}

// ─── TRANSACTION FILTERS ─────────────────────────────────────────
function buildTxnFilterOptions(){
  const incCats=[...new Set(S.transactions.filter(t=>t.type==='income').map(t=>t.cat))].sort();
  const expCats=[...new Set(S.transactions.filter(t=>t.type==='expense').map(t=>t.cat))].sort();
  const iSel=document.getElementById('incFilterCat'),eSel=document.getElementById('expFilterCat');
  if(iSel){const cv=iSel.value;iSel.innerHTML='<option value="">All Categories</option>'+incCats.map(c=>`<option value="${esc(c)}"${c===cv?' selected':''}>${esc(c)}</option>`).join('');iSel.value=cv;}
  if(eSel){const cv=eSel.value;eSel.innerHTML='<option value="">All Categories</option>'+expCats.map(c=>`<option value="${esc(c)}"${c===cv?' selected':''}>${esc(c)}</option>`).join('');eSel.value=cv;}
}
function renderTxnLists(){
  const iCat=(document.getElementById('incFilterCat')||{}).value||'',iFrom=(document.getElementById('incFilterFrom')||{}).value||'',iTo=(document.getElementById('incFilterTo')||{}).value||'',iQ=((document.getElementById('incFilterSearch')||{}).value||'').trim().toLowerCase();
  const eCat=(document.getElementById('expFilterCat')||{}).value||'',eFrom=(document.getElementById('expFilterFrom')||{}).value||'',eTo=(document.getElementById('expFilterTo')||{}).value||'',eQ=((document.getElementById('expFilterSearch')||{}).value||'').trim().toLowerCase();
  renderTxnList('incList',t=>t.type==='income'&&(!iCat||t.cat===iCat)&&(!iFrom||t.date>=iFrom)&&(!iTo||t.date<=iTo)&&(!iQ||(t.desc||'').toLowerCase().includes(iQ)||(t.cat||'').toLowerCase().includes(iQ)));
  renderTxnList('expList',t=>t.type==='expense'&&(!eCat||t.cat===eCat)&&(!eFrom||t.date>=eFrom)&&(!eTo||t.date<=eTo)&&(!eQ||(t.desc||'').toLowerCase().includes(eQ)||(t.cat||'').toLowerCase().includes(eQ)));
}
function clearTxnFilters(type){
  if(type==='income'){['incFilterCat','incFilterFrom','incFilterTo','incFilterSearch'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});}
  else{['expFilterCat','expFilterFrom','expFilterTo','expFilterSearch'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});}
  renderTxnLists();renderPageFlashcards();
}

function addAsset(){const name=safeText('astN'),rawV=numVal('astV',0);if(!name||!rawV||rawV<=0){toast('Please enter a name and value.');return;}const val=astC==='USD'?rawV*(usdRate||15.5):rawV;snap('Add asset '+name);S.assets.push(cleanRecord({id:Date.now()+Math.random(),name,value:val,valRaw:rawV,currency:astC||'GHS',fxRate:astC==='USD'?(usdRate||15.5):1,cat:safeSelect('astCat','Other Asset'),liquidity:safeSelect('astLiquidity','Fixed'),date:safeSelect('astD',''),notes:safeText('astNt')}));persist();refreshAll();['astN','astV','astNt'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});const d=document.getElementById('astD');if(d)d.value='';toast('✅ Asset saved!');}
function delAsset(id){snap('Delete asset');S.assets=S.assets.filter(a=>a.id!==id);persist();refreshAll();toast('Deleted.');}
const AICO={Vehicle:'🚗','Real Estate / Land':'🏠','Electronics & Gadgets':'💻','Jewellery & Accessories':'💍','Furniture & Household':'🛋️','Business Equipment':'⚙️','Collectibles & Art':'🎨','Other Asset':'📦'};
function openEditAsset(id){
  const a=S.assets.find(x=>x.id===id);if(!a)return;
  const cats=['Vehicle','Real Estate / Land','Electronics & Gadgets','Jewellery & Accessories','Furniture & Household','Business Equipment','Collectibles & Art','Other Asset'];
  const currency=a.currency||'GHS';
  const fx=parseFloat(a.fxRate||usdRate||15.5);
  const raw=parseFloat(a.valRaw||(currency==='USD'?(a.value||0)/fx:(a.value||0)))||0;
  document.getElementById('emT').textContent='Edit Asset';
  document.getElementById('emB').innerHTML=`<div class="fgg">
    <div class="fg"><label>Asset Name</label><input type="text" id="ea-n" value="${esc(a.name||'')}"></div>
    <div class="fg"><label>Currency</label><select id="ea-cur" onchange="document.getElementById('ea-fx-wrap').style.display=this.value==='USD'?'':'none';document.getElementById('ea-val-label').textContent=this.value==='USD'?'Value ($ USD)':'Value (GH₵)';">
      <option value="GHS"${currency==='GHS'?' selected':''}>GH₵ Ghana cedi</option>
      <option value="USD"${currency==='USD'?' selected':''}>$ USD</option>
    </select></div>
    <div class="fg"><label id="ea-val-label">${currency==='USD'?'Value ($ USD)':'Value (GH₵)'}</label><input type="number" id="ea-v" value="${raw}" min="0" step="0.01"></div>
    <div class="fg" id="ea-fx-wrap" style="display:${currency==='USD'?'':'none'};"><label>Historical FX Rate (GH₵ per $1)</label><input type="number" id="ea-fx" value="${fx}" min="0" step="0.01"></div>
    <div class="fg"><label>Category</label><select id="ea-cat">${cats.map(c=>`<option${c===a.cat?' selected':''}>${esc(c)}</option>`).join('')}</select></div>
    <div class="fg"><label>Liquidity Status</label><select id="ea-liq"><option value="Fixed"${(a.liquidity||'Fixed')==='Fixed'?' selected':''}>Fixed</option><option value="Liquid"${a.liquidity==='Liquid'?' selected':''}>Liquid</option></select></div>
    <div class="fg"><label>Purchase / Record Date</label><input type="date" id="ea-d" value="${a.date||''}"></div>
    <div class="fg"><label>Notes</label><input type="text" id="ea-nt" value="${esc(a.notes||'')}"></div>
  </div>`;
  document.getElementById('emS').onclick=()=>{
    const cur=document.getElementById('ea-cur').value||'GHS';
    const rawVal=parseFloat(document.getElementById('ea-v').value)||0;
    const fxVal=cur==='USD'?(parseFloat(document.getElementById('ea-fx').value)||usdRate||15.5):1;
    snap('Edit asset');
    Object.assign(a,{
      name:document.getElementById('ea-n').value.trim(),
      valRaw:rawVal,
      currency:cur,
      fxRate:fxVal,
      value:cur==='USD'?rawVal*fxVal:rawVal,
      cat:document.getElementById('ea-cat').value,
      liquidity:document.getElementById('ea-liq').value,
      date:document.getElementById('ea-d').value,
      notes:document.getElementById('ea-nt').value.trim()
    });
    persist();closeM('editModal');refreshAll();toast('✅ Asset updated!');
  };
  document.getElementById('editModal').classList.add('open');
}

function assetMoneyDisplay(v,currency='GHS',raw=null,fx=null){
  const n=parseFloat(v||0);
  if(assetDisplay==='USD')return '$ '+(n/(fx||usdRate||15.5)).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  if(assetDisplay==='MIXED'&&currency==='USD')return '$ '+parseFloat(raw||n/(fx||usdRate||15.5)).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})+' ('+fmt(n)+')';
  return fmt(n);
}
function setAssetDisplay(c){assetDisplay=c;['GHS','USD','MIXED'].forEach(x=>{const el=document.getElementById('astShow'+x);if(el)el.classList.toggle('active',c===x);});renderAssets();}

function renderAssets(){
  const el=document.getElementById('astList');
  const totalEl=document.getElementById('iastv');
  const tot=(S.assets||[]).reduce((s,a)=>s+(parseFloat(a.value)||0),0);
  if(totalEl)totalEl.textContent=assetDisplay==='USD'?'$ '+(tot/(usdRate||15.5)).toLocaleString('en-GB',{maximumFractionDigits:0}):fmt(tot);
  if(!el)return;
  if(!S.assets||!S.assets.length){
    el.innerHTML='<div class="empty"><div class="big">🏠</div><p>No assets recorded yet.</p></div>';
    return;
  }
  el.innerHTML=`<div class="asset-table-wrap"><table class="xt">
    <thead><tr><th>Name</th><th>Category</th><th>Liquidity</th><th>Value</th><th>Currency</th><th>Original Value</th><th>Date</th><th>Notes</th><th></th></tr></thead>
    <tbody>${S.assets.map(a=>{
      const fx=parseFloat(a.fxRate||usdRate||15.5);
      const cur=a.currency||'GHS';
      const raw=parseFloat(a.valRaw||(cur==='USD'?(a.value||0)/fx:(a.value||0)))||0;
      const original=cur==='USD'?'$ '+raw.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2}):fmt(raw);
      const curText=cur==='USD'?`USD${a.fxRate?`<br><span style="font-size:9.5px;color:var(--txm);">FX: ${parseFloat(a.fxRate).toFixed(2)}</span>`:''}`:'GH₵';
      return `<tr>
        <td><b>${AICO[a.cat]||'📦'} ${esc(a.name||'')}</b></td>
        <td><span class="badge bbl">${esc(a.cat||'Other Asset')}</span></td>
        <td><span class="badge ${(a.liquidity||'Fixed')==='Liquid'?'bm':'bbl'}">${esc(a.liquidity||'Fixed')}</span></td>
        <td style="font-weight:800;color:var(--bl);">${assetMoneyDisplay(a.value,cur,raw,fx)}</td>
        <td style="font-size:10.5px;color:var(--txm);">${curText}</td>
        <td>${original}</td>
        <td style="font-size:10.5px;color:var(--txm);">${a.date||'—'}</td>
        <td><div class="asset-notes">${esc(a.notes||'—')}</div></td>
        <td style="display:flex;gap:3px;"><button title="Edit asset" aria-label="Edit asset" class="btn btn-out btn-xs" onclick="openEditAsset(${a.id})">✏️</button><button title="Delete asset" aria-label="Delete asset" class="btn btn-re btn-xs" onclick="delAsset(${a.id})">✕</button></td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

function addLoan(){const name=document.getElementById('lnN').value.trim(),amt=parseFloat(document.getElementById('lnA').value);if(!name||!amt||amt<=0){toast('Please fill in name and amount.');return;}snap('Add loan '+name);S.loans.push({id:Date.now()+Math.random(),name,amount:amt,dir:document.getElementById('lnD').value,type:document.getElementById('lnT').value,rate:parseFloat(document.getElementById('lnR').value)||0,fees:parseFloat(document.getElementById('lnFees').value)||0,due:document.getElementById('lnDu').value,paid:parseFloat(document.getElementById('lnP').value)||0,monthly:parseFloat(document.getElementById('lnMo').value)||0,notes:document.getElementById('lnNt').value.trim()});persist();refreshAll();['lnN','lnA','lnR','lnFees','lnP','lnMo','lnNt'].forEach(id=>document.getElementById(id).value='');document.getElementById('lnDu').value='';toast('✅ Loan recorded!');}
function delLoan(id){snap('Delete loan');S.loans=S.loans.filter(l=>l.id!==id);persist();refreshAll();toast('Deleted.');}
function openEditLoan(id){
  const ln=S.loans.find(l=>l.id===id);if(!ln)return;
  document.getElementById('emT').textContent='Edit Loan / Debt';
  document.getElementById('emB').innerHTML=`<div class="fgg"><div class="fg"><label>Person / Institution</label><input type="text" id="el-n" value="${esc(ln.name)}"></div><div class="fg"><label>Amount (GH₵)</label><input type="number" id="el-a" value="${ln.amount}" min="0"></div><div class="fg"><label>Direction</label><select id="el-d"><option value="owe"${ln.dir==='owe'?' selected':''}>I Owe</option><option value="owed"${ln.dir==='owed'?' selected':''}>They Owe Me</option></select></div><div class="fg"><label>Interest Rate (%)</label><input type="number" id="el-r" value="${ln.rate}" step="0.1" min="0"></div><div class="fg"><label>Other Charges / Processing Fees (GH₵)</label><input type="number" id="el-fees" value="${ln.fees||0}" min="0"></div><div class="fg"><label>Due Date</label><input type="date" id="el-du" value="${ln.due||''}"></div><div class="fg"><label>Amount Paid / Collected (GH₵)</label><input type="number" id="el-p" value="${ln.paid||0}" min="0"></div><div class="fg"><label>Monthly Minimum Payment (GH₵)</label><input type="number" id="el-mo" value="${ln.monthly||0}" min="0"></div><div class="fg"><label>Notes</label><input type="text" id="el-nt" value="${esc(ln.notes||'')}"></div></div>`;
  document.getElementById('emS').onclick=()=>{snap('Edit loan');Object.assign(ln,{name:document.getElementById('el-n').value.trim(),amount:parseFloat(document.getElementById('el-a').value)||0,dir:document.getElementById('el-d').value,rate:parseFloat(document.getElementById('el-r').value)||0,fees:parseFloat(document.getElementById('el-fees').value)||0,due:document.getElementById('el-du').value,paid:parseFloat(document.getElementById('el-p').value)||0,monthly:parseFloat(document.getElementById('el-mo').value)||0,notes:document.getElementById('el-nt').value.trim()});persist();closeM('editModal');refreshAll();toast('✅ Updated!');};
  document.getElementById('editModal').classList.add('open');
}
function renderLoans(){
  const el=document.getElementById('loansOut');if(!el)return;
  if(!S.loans.length){el.innerHTML='<div class="empty"><div class="big">🕊️</div><p>Debt-free!</p></div>';document.getElementById('l-owe').textContent=fmt(0);document.getElementById('l-owed').textContent=fmt(0);document.getElementById('l-net').textContent=fmt(0);return;}
  let owe=0,owed=0;S.loans.forEach(l=>{if(l.dir==='owe')owe+=outstanding(l);else owed+=outstanding(l);}); // corrected: outstanding only
  document.getElementById('l-owe').textContent=fmt(owe);document.getElementById('l-owed').textContent=fmt(owed);const net=owed-owe;document.getElementById('l-net').textContent=fmt(Math.abs(net));document.getElementById('l-net').style.color=net>=0?'var(--mint)':'var(--red)';
  const owing=S.loans.filter(l=>l.dir==='owe'),owedTo=S.loans.filter(l=>l.dir==='owed');let html='';if(owing.length)html+='<div class="slbl">💸 I Owe</div>'+owing.map(lCard).join('');if(owedTo.length)html+='<div class="slbl">💰 Owed to Me</div>'+owedTo.map(lCard).join('');el.innerHTML=html;
}
function lCard(l){const out=outstanding(l),pct=l.amount>0?Math.min(100,((l.paid||0)/l.amount)*100):0,dl=l.due?Math.ceil((new Date(l.due)-new Date())/86400000):null,dstr=l.due?`Due: ${l.due} ${dl!==null?(dl<0?'<span class="badge bre">OVERDUE</span>':`<span class="badge bye">${dl}d</span>`):''}`:'',ib=l.rate>0?`<span class="badge bre">${l.rate}%</span>`:'<span class="badge bgr">0%</span>',repLog=(l.repayments||[]).slice(-3).reverse().map(r=>`<div style="font-size:9.5px;color:var(--txm);">· ${r.date} — ${fmt(r.amount)}${r.note?' ('+esc(r.note)+')':''}</div>`).join('');return`<div class="loan-card loan-${l.dir}"><div style="display:flex;justify-content:space-between;gap:8px;"><div><div style="font-weight:800;font-size:13.5px;">${l.dir==='owe'?'💸':'💰'} ${esc(l.name)}</div><div style="font-size:10.5px;color:var(--txm);">${esc(l.type)} · ${ib} ${dstr}</div>${l.fees?`<div style="font-size:10px;color:var(--red);">Charges/fees: ${fmt(l.fees)}</div>`:''}${l.notes?`<div style="font-size:10px;color:var(--txm);">${esc(l.notes)}</div>`:''}</div><div style="text-align:right;flex-shrink:0;"><div style="font-size:16px;font-weight:800;color:${l.dir==='owe'?'var(--red)':'var(--gr)'};">${fmt(l.amount)}</div><div style="font-size:10px;color:var(--txm);">Outstanding: ${fmt(out)}</div></div></div>${(l.paid||0)>0?`<div class="pb" style="margin-top:6px;"><div class="pf" style="width:${pct}%;background:var(--mint);"></div></div>`:''}<div style="margin-top:8px;display:flex;gap:4px;"><button title="✏️" aria-label="✏️" class="btn btn-out btn-xs" onclick="openEditLoan(${l.id})">✏️</button><button class="btn btn-mt btn-xs" onclick="addLoanRepayment(${l.id})" title="Log a repayment">＋ Pay</button><button title="✕" aria-label="✕" class="btn btn-re btn-xs" onclick="delLoan(${l.id})">✕</button></div>${repLog?`<div style="margin-top:6px;border-top:1px solid var(--bdr);padding-top:4px;"><div style="font-size:9px;font-weight:800;text-transform:uppercase;color:var(--txm);margin-bottom:2px;">Recent Repayments</div>${repLog}</div>`:''}</div>`;}
function addLoanRepayment(id){
  const l=S.loans.find(x=>x.id===id);if(!l)return;
  document.getElementById('emT').textContent='Log Repayment';
  document.getElementById('emB').innerHTML=`<div class="fgg"><div class="fg"><label>Amount (GH₵)</label><input type="number" id="lr-amt" placeholder="0.00" min="0" step="0.01"></div><div class="fg"><label>Date</label><input type="date" id="lr-date" value="${new Date().toISOString().slice(0,10)}"></div><div class="fg"><label>Note (optional)</label><input type="text" id="lr-note" placeholder="e.g. partial, on time"></div></div>`;
  document.getElementById('emS').onclick=()=>{const amt=parseFloat(document.getElementById('lr-amt').value)||0;if(!amt){toast('Enter an amount.');return;}snap('Loan repayment: '+l.name);if(!l.repayments)l.repayments=[];l.repayments.push({date:document.getElementById('lr-date').value||new Date().toISOString().slice(0,10),amount:amt,note:document.getElementById('lr-note').value.trim()});l.paid=(+l.paid||0)+amt;persist();closeM('editModal');refreshAll();toast('✅ Repayment logged!');};
  document.getElementById('editModal').classList.add('open');
}

let selBCat=null;
function buildBCatList(){
  const sel=document.getElementById('bCatSelect');if(!sel)return;
  const old=sel.value||selBCat||getExpCats()[0];
  sel.innerHTML=buildGroupedOptions(EXP_GROUPS,S.customExpCats||[],old);
  if([...sel.options].some(o=>o.value===old))sel.value=old;
  selBCat=sel.value;
  const amt=document.getElementById('bAmt'); if(amt && !document.activeElement.isSameNode(amt)) amt.value=S.budget[selBCat]||'';
}
function selBC(c){selBCat=c;const amt=document.getElementById('bAmt'); if(amt)amt.value=S.budget[c]||'';}
function copyLastMonthBudget(){
  if(!Object.keys(S.budget||{}).length){toast('No budget set to copy.');return;}
  snap('Copy budget');
  toast('✅ Budget values carried forward to this period. Use Undo (↩) to revert.');
}

// ─── SETTINGS PAGE FUNCTIONS ──────────────────────────────────────────────────


function populateProfileSettings(){
  const el=document.getElementById('profileNameInput');if(el)el.value=S.profileName||'';
  const ur=document.getElementById('settingUsdRate');if(ur)ur.value=S.usdRate||usdRate||'';
  const dp=document.getElementById('settingDashPeriod');if(dp)dp.value=S.defaultDashPeriod||'month';
  const sc=document.getElementById('settingShowCents');if(sc)sc.checked=!!S.showCents;
}

function showSettingDetail(id){
  document.querySelectorAll('#page-settings .setting-detail').forEach(c=>c.classList.remove('active'));
  document.querySelectorAll('#page-settings .settings-menu button').forEach(b=>b.classList.remove('active'));
  const el=document.getElementById('setting-'+id);
  if(el){el.classList.add('active');}
  const btn=[...document.querySelectorAll('#page-settings .settings-menu button')].find(b=>(b.getAttribute('onclick')||'').includes("'"+id+"'")||(b.getAttribute('onclick')||'').includes('"'+id+'"'));
  if(btn)btn.classList.add('active');
  if(typeof populateProfileSettings==='function')populateProfileSettings();if(id==='accessibility'&&typeof loadAccessibilitySettings==='function')loadAccessibilitySettings();
}
document.addEventListener('click',function(e){
  const b=e.target.closest && e.target.closest('#page-settings .settings-menu button');
  if(!b)return;
  const m=(b.getAttribute('onclick')||'').match(/showSettingDetail\(['"]([^'"]+)['"]\)/);
  if(m){e.preventDefault();showSettingDetail(m[1]);}
});

function extraWalletKey(){return 'extra_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function addExtraWallet(){const name=safeText('extraWalletName'),type=safeSelect('extraWalletType','Other'),currency=safeSelect('extraWalletCurrency','GHS'),bal=numVal('extraWalletBalance',0);if(!name){toast('Please enter the account name.');return;}S.extraWallets=S.extraWallets||[];if(S.extraWallets.some(w=>w.name.toLowerCase()===name.toLowerCase())){toast('That wallet/account already exists.');return;}const key=extraWalletKey();S.extraWallets.push({key,name,type,currency});S.wallets[key]=bal;snap('Add wallet '+name);persist();refreshAll();loadSettingsPage();toast('✅ Wallet/account added!');}
function deleteExtraWallet(key){confirmDlg('Delete Wallet / Account','This removes the custom wallet/account from lists. Existing transactions remain in history.','🗑 Delete','btn-re',()=>{snap('Delete wallet');S.extraWallets=(S.extraWallets||[]).filter(w=>w.key!==key);delete S.wallets[key];persist();refreshAll();loadSettingsPage();});}
function renderExtraWalletSettings(){const el=document.getElementById('extraWalletList');if(!el)return;const arr=S.extraWallets||[];el.innerHTML=arr.length?arr.map(w=>`<div class="extra-wallet-card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;"><div><b>${esc(w.name)}</b><div class="txi-cat">${esc(w.type)} · ${esc(w.currency||'GHS')} · ${fmt(walletGhsValue(w.key))}</div></div><button title="Delete selected item" aria-label="Delete selected item" class="btn btn-re btn-xs" onclick="deleteExtraWallet('${w.key}')">🗑 Delete</button></div></div>`).join(''):'<div class="empty" style="padding:10px;"><p>No extra wallets/accounts added yet.</p></div>'; }
function walletGhsValue(key){const w=(S.extraWallets||[]).find(x=>x.key===key),v=parseFloat(S.wallets?.[key]||0);return w&&w.currency==='USD'?v*(usdRate||15.5):v;}
function walletOptionsHtml(selected=''){const base=['Bank Account','MTN MoMo','Vodafone Cash','Cash','Savings','USD Account','Other'];const extra=(S.extraWallets||[]).map(w=>w.name);return [...base,...extra].map(w=>`<option${w===selected?' selected':''}>${esc(w)}</option>`).join('');}
function rebuildWalletSelects(){['iWal','eWal','invC','lnWallet','subWal','tplWal','tplWalExp','qaWal','csvWallet','trFrom','trTo'].forEach(id=>{const el=document.getElementById(id);if(el){const v=el.value;el.innerHTML=walletOptionsHtml(v);}});}
function walletKeyForLabel(label){const found=(S.extraWallets||[]).find(w=>w.name===label);return found?found.key:(WMAP[label]||'');}
function applyFontCss(fs){let st=document.getElementById('fontSizeStyle');if(!st){st=document.createElement('style');st.id='fontSizeStyle';document.head.appendChild(st);}st.textContent=`:root{--app-font-size:${fs}px;} body,.fg input,.fg select,.fg textarea,.btn,.nav-link,.txi-name,.txi-cat,.ct,.sc .sv,.sc .sl{font-size:calc(${fs}px * 0.93)!important;} .ct{font-size:calc(${fs}px * 1.08)!important;} .sc .sv{font-size:calc(${fs}px * 1.15)!important;}`;}

function loadSettingsPage(){
  const n=document.getElementById('settingName');if(n)n.value=S.userName||'';
  const th=document.getElementById('settingTheme');if(th)th.value=document.body.classList.contains('dark-mode')?'dark':'light';
  const fs=document.getElementById('settingFontSize');if(fs)fs.value=S.fontSize||14;
  const dp=document.getElementById('settingDashPeriod');if(dp)dp.value=S.defaultDashPeriod||'month';
  const sc=document.getElementById('settingShowCents');if(sc)sc.checked=!!S.showCents;
  const al=document.getElementById('settingAutoLock');if(al)al.value=S.autoLockMins||0;
  const rt=document.getElementById('reminderTime');if(rt)rt.value=S.reminderTime||'20:00';
  // Wallet balances
  const wb=document.getElementById('stgBank');if(wb)wb.value=S.wallets?.bank||0;
  const wm=document.getElementById('stgMtn');if(wm)wm.value=S.wallets?.mtn||0;
  const wv=document.getElementById('stgVoda');if(wv)wv.value=S.wallets?.voda||0;
  const wc=document.getElementById('stgCash');if(wc)wc.value=S.wallets?.cash||0;
  const ws=document.getElementById('stgSav');if(ws)ws.value=S.wallets?.sav||0;
  const wu=document.getElementById('stgUsd');if(wu)wu.value=S.wallets?.usd||0;
  renderStgCustomCats();renderExtraWalletSettings();if(!document.querySelector('#page-settings .setting-detail.active'))showSettingDetail('profile');
  const rsEl=document.getElementById('reminderStatus');
  if(rsEl&&S.reminderTime)rsEl.innerHTML=`<div class="ok">Reminder is set for ${S.reminderTime}.</div>`;
  const alEl=document.getElementById('autoLockStatus');
  if(alEl&&S.autoLockMins>0)alEl.textContent=`Auto-lock is active: ${S.autoLockMins} minute${S.autoLockMins===1?'':'s'}.`;
}
function saveProfileSettings(){
  const profileEl=document.getElementById('profileNameInput');
  if(profileEl)S.profileName=profileEl.value.trim();
  scrubBadStoredProfileName();
  const dpEl=document.getElementById('settingDashPeriod');if(dpEl)S.defaultDashPeriod=dpEl.value;
  const scEl=document.getElementById('settingShowCents');if(scEl)S.showCents=scEl.checked;
  applyFontSize();persist();applyAppName();refreshAll();toast('✅ Profile settings saved!');
}
function saveWalletSettings(){
  const b=parseFloat(document.getElementById('stgBank')?.value)||0,m=parseFloat(document.getElementById('stgMtn')?.value)||0;
  const v=parseFloat(document.getElementById('stgVoda')?.value)||0,c=parseFloat(document.getElementById('stgCash')?.value)||0;
  const sv=parseFloat(document.getElementById('stgSav')?.value)||0,u=parseFloat(document.getElementById('stgUsd')?.value)||0;
  snap('Update wallet balances');S.wallets={...(S.wallets||{}),bank:b,mtn:m,voda:v,cash:c,sav:sv,usd:u,oth:S.wallets?.oth||0};
  persist();refreshAll();loadWals();toast('✅ Wallet balances saved!');
}
function applyThemeSetting(){
  const val=document.getElementById('settingTheme')?.value;
  if(val==='dark'){document.body.classList.add('dark-mode');localStorage.setItem('nuelleDark','1');}
  else{document.body.classList.remove('dark-mode');localStorage.setItem('nuelleDark','0');}
  const dt=document.getElementById('darkToggle');if(dt)dt.textContent=val==='dark'?'☀️ On':'🌙 Off';
}

function applyAccessibilitySettings(){
  const get=id=>!!document.getElementById(id)?.checked;
  const s={
    largeTargets:get('a11yLargeTargets'),
    underlineLinks:get('a11yUnderlineLinks'),
    reduceMotion:get('a11yReduceMotion'),
    highContrast:get('a11yHighContrast')
  };
  S.accessibility=s;persist();
  document.body.classList.toggle('large-targets',s.largeTargets);
  document.body.classList.toggle('underline-links',s.underlineLinks);
  document.body.classList.toggle('high-contrast',s.highContrast);
  document.body.classList.toggle('reduce-motion',s.reduceMotion);
  toast('♿ Accessibility settings applied.');
}
function loadAccessibilitySettings(){
  const s=S.accessibility||{};
  const map={a11yLargeTargets:'largeTargets',a11yUnderlineLinks:'underlineLinks',a11yReduceMotion:'reduceMotion',a11yHighContrast:'highContrast'};
  Object.entries(map).forEach(([id,key])=>{const el=document.getElementById(id);if(el)el.checked=!!s[key];});
  document.body.classList.toggle('large-targets',!!s.largeTargets);
  document.body.classList.toggle('underline-links',!!s.underlineLinks);
  document.body.classList.toggle('high-contrast',!!s.highContrast);
  document.body.classList.toggle('reduce-motion',!!s.reduceMotion);
}
function announce(msg){const el=document.getElementById('a11yLive');if(el)el.textContent=msg;}

function applyFontSize(){
  const fs=parseInt(document.getElementById('settingFontSize')?.value||S.fontSize||14);
  S.fontSize=fs;document.documentElement.style.setProperty('--app-font-size',fs+'px');document.body.style.fontSize=fs+'px';applyFontCss(fs);
}
function saveDisplayPrefs(){
  const dpEl=document.getElementById('settingDashPeriod');if(dpEl)S.defaultDashPeriod=dpEl.value;
  const scEl=document.getElementById('settingShowCents');if(scEl)S.showCents=scEl.checked;
  persist();refreshAll();toast('✅ Display preferences saved!');
}
function saveAutoLock(){
  const mins=parseInt(document.getElementById('settingAutoLock')?.value)||0;
  S.autoLockMins=mins;persist();
  const el=document.getElementById('autoLockStatus');
  if(el)el.textContent=mins>0?`Auto-lock active: locks after ${mins} minute${mins===1?'':'s'} of inactivity.`:'Auto-lock is disabled.';
  resetInactivityTimer();toast('✅ Auto-lock saved!');
}
function stgAddCat(){
  const name=(document.getElementById('stgCatName')?.value||'').trim();
  const emoji=(document.getElementById('stgCatEmoji')?.value||'').trim()||'💰';
  const type=document.getElementById('stgCatType')?.value||'expense';
  if(!name){toast('Please enter a category name.');return;}
  if([...getIncCats(),...getExpCats()].includes(name)){toast('That category already exists.');return;}
  snap('Add category '+name);
  if(type==='income')S.customIncCats.push({name,emoji});else S.customExpCats.push({name,emoji});
  persist();buildCatSelects();buildBCatList();populateDeleteCustomCatSelect();populateTemplateCatList();
  if(document.getElementById('stgCatName'))document.getElementById('stgCatName').value='';
  if(document.getElementById('stgCatEmoji'))document.getElementById('stgCatEmoji').value='';
  renderStgCustomCats();toast('✅ Category added!');
}
function renderStgCustomCats(){
  const el=document.getElementById('stgCustomCatList');if(!el)return;
  const inc=(S.customIncCats||[]).map(c=>({...c,type:'income'}));
  const exp=(S.customExpCats||[]).map(c=>({...c,type:'expense'}));
  const all=[...inc,...exp];
  if(!all.length){el.innerHTML='<p class="calc-note">No custom categories yet.</p>';return;}
  el.innerHTML=all.map(c=>`<div class="txi" style="margin-bottom:4px;"><div class="txi-info"><b>${c.emoji||'🏷️'} ${esc(c.name)}</b><div class="txi-cat">${c.type}</div></div><button title="Delete selected item" aria-label="Delete selected item" class="btn btn-re btn-xs" onclick="stgDeleteCat('${c.type}','${esc(c.name).replace(/'/g,"\\'")}')">✕ Delete</button></div>`).join('');
}
function stgDeleteCat(type,name){
  confirmDlg('Delete Category','Delete the custom category "'+name+'"? Existing transactions using it will keep the category label.','Delete','btn-re',()=>{
    snap('Delete custom category');
    if(type==='income')S.customIncCats=(S.customIncCats||[]).filter(c=>c.name!==name);
    else S.customExpCats=(S.customExpCats||[]).filter(c=>c.name!==name);
    persist();buildCatSelects();buildBCatList();populateDeleteCustomCatSelect();populateTemplateCatList();renderStgCustomCats();toast('Category deleted.');
  });
}
// ─────────────────────────────────────────────────────────────────────────────
function saveCatBudget(){const sel=document.getElementById('bCatSelect');selBCat=sel?sel.value:selBCat;if(!selBCat)return;const v=parseFloat(document.getElementById('bAmt').value)||0;snap('Save budget category');if(v>0)S.budget[selBCat]=v;else delete S.budget[selBCat];renderBudgProg();persist();toast('🎯 Budget saved!');}
function clearCatBudget(){const sel=document.getElementById('bCatSelect');selBCat=sel?sel.value:selBCat;if(!selBCat)return;snap('Clear budget category');delete S.budget[selBCat];document.getElementById('bAmt').value='';renderBudgProg();persist();toast('Budget cleared.');}
function closeBEntry(){}
function renderBudgProg(){
  const mExp=S.transactions.filter(t=>t.type==='expense'&&t.date.startsWith(currentMonth)),sp={};mExp.forEach(t=>sp[t.cat]=(sp[t.cat]||0)+t.amount);
  const cats=Object.keys(S.budget),totB=cats.reduce((s,c)=>s+(S.budget[c]||0),0),totS=cats.reduce((s,c)=>s+(sp[c]||0),0),rem=totB-totS,pct=totB>0?Math.min(100,totS/totB*100):0;
  document.getElementById('b-tot').textContent=fmt(totB);document.getElementById('b-spe').textContent=fmt(totS);document.getElementById('b-rem').textContent=fmt(rem);document.getElementById('b-rem').style.color=rem>=0?'var(--mint)':'var(--red)';document.getElementById('b-pct').textContent=pct.toFixed(0)+'%';
  const el=document.getElementById('bProg');if(!cats.length){el.innerHTML='<div class="empty"><div class="big">🎯</div><p>Set budgets above.</p></div>';return;}
  el.innerHTML=cats.map(c=>{const b=S.budget[c],s=sp[c]||0,p=Math.min(s/b*100,100),col=p>=100?'var(--red)':p>=75?'var(--pe)':'var(--mint)';return`<div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span style="font-size:12.5px;font-weight:700;">${ce(c)} ${esc(c)}</span><span style="font-size:10.5px;color:var(--txm);">${fmt(s)} / ${fmt(b)}</span></div><div class="pb"><div class="pf" style="width:${p}%;background:${col};"></div></div>${s>b?`<div style="font-size:10px;color:var(--red);">⚠️ Over by ${fmt(s-b)}</div>`:''}</div>`;}).join('');
}

function setWal(key,inp){const v=parseFloat(inp.value)||0;snap(`Update ${WLBL[key]} balance`);S.wallets[key]=v;inp.value='';persist();loadWals();updWalTot();updNW();renderWalChart();renderDashStats();renderNWB();}

function renderExtraWalletCards(){const el=document.getElementById('extraWalletCards');if(!el)return;const arr=S.extraWallets||[];el.innerHTML=arr.map(w=>`<div class="wcard w-oth"><span class="we">${w.type==='MoMo'?'📱':w.type==='Bank'?'🏦':w.type==='Cash'?'💵':'📦'}</span><div class="wn">${esc(w.name)}</div><div class="wa" id="wd-${w.key}">${w.currency==='USD'?fmt(S.wallets[w.key]||0,'$ '):fmt(S.wallets[w.key]||0)}</div><input class="w-inp" type="number" id="wi-${w.key}" placeholder="Enter balance" onchange="setWal('${w.key}',this)"><div style="font-size:10px;color:var(--txm);margin-top:3px;">${esc(w.type)} · ${esc(w.currency||'GHS')}</div></div>`).join('');}

function loadWals(){['bank','mtn','voda','cash','sav','oth'].forEach(k=>{const el=document.getElementById('wi-'+k);if(el){el.value='';document.getElementById('wd-'+k).textContent=fmt(S.wallets[k]||0);}});const usdel=document.getElementById('wi-usd');if(usdel)usdel.value='';if(document.getElementById('wd-usd'))document.getElementById('wd-usd').textContent=fmt(S.wallets.usd||0,'$ ');if(document.getElementById('usdEq'))document.getElementById('usdEq').textContent='≈ '+fmt((S.wallets.usd||0)*usdRate);renderExtraWalletCards();updWalTot();}
function liqTot(){const base=['bank','mtn','voda','cash','sav','oth'].reduce((s,k)=>s+(S.wallets[k]||0),0)+(S.wallets.usd||0)*usdRate;const extra=(S.extraWallets||[]).reduce((s,w)=>s+walletGhsValue(w.key),0);return base+extra;}
function updWalTot(){const l=liqTot();document.getElementById('wTot').textContent=fmt(l);document.getElementById('hLiq').textContent=fmtS(l);}
async function fetchRate(){
  const showRate=(rate,src)=>{usdRate=rate;S.usdRate=rate;S.usdRateSource=src;S.usdRateFetchedAt=new Date().toISOString();persist();const live=document.getElementById('liveRD'),srcEl=document.getElementById('rateSrc'),hero=document.getElementById('hURate'),hb=document.getElementById('hUbox'),inp=document.getElementById('usdRI');if(live)live.textContent='GH₵ '+usdRate.toFixed(2)+' per $1';if(srcEl)srcEl.textContent='Source: '+src;if(hero)hero.textContent=usdRate.toFixed(2);if(hb)hb.style.display='';if(inp)inp.value=usdRate.toFixed(2);loadWals();updNW();renderNWB();renderWalChart();};
  const tryJson=async(url,parser)=>{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw 0;const d=await r.json();const val=parser(d);if(!val||isNaN(val))throw 0;return val;};
  try{
    // OANDA requires an API key. A static PWA cannot safely keep that key in the browser, so this app supports OANDA through an optional secure proxy URL saved as S.oandaProxyUrl.
    if(S.oandaProxyUrl){
      const rate=await tryJson(S.oandaProxyUrl,d=>d?.rates?.GHS||d?.GHS||d?.rate||d?.usd_ghs||d?.quotes?.USDGHS);
      showRate(parseFloat(rate),'Secure FX proxy');return;
    }
    const rate=await tryJson('https://api.frankfurter.app/latest?from=USD&to=GHS',d=>d?.rates?.GHS);
    showRate(parseFloat(rate),'Frankfurter / ECB fallback');
  }catch(e){usdRate=S.usdRate||15.5;const live=document.getElementById('liveRD'),srcEl=document.getElementById('rateSrc'),inp=document.getElementById('usdRI');if(live)live.textContent='Could not fetch live rate.';if(srcEl)srcEl.textContent=S.oandaProxyUrl?'Live FX unavailable. Enter the rate manually or try again later.':'Live FX unavailable. Enter the rate manually or try again later.';if(inp)inp.value=usdRate.toFixed(2);}
}
function setManualRate(){
  const inp=document.getElementById('usdRI');const v=parseFloat(inp&&inp.value);
  if(v>0){usdRate=v;S.usdRate=v;persist();const hr=document.getElementById('hURate');if(hr)hr.textContent=v.toFixed(2);const hb=document.getElementById('hUbox');if(hb)hb.style.display='';document.getElementById('liveRD').textContent='Manual rate saved: GH₵ '+v.toFixed(2)+' per $1';document.getElementById('rateSrc').textContent='Source: Manual entry';loadWals();updNW();renderNWB();renderWalChart();}
}

function nwParts(){const liq=liqTot(),inv=S.investments.reduce((s,i)=>s+(i.amount||0),0),ast=S.assets.reduce((s,a)=>s+(a.value||0),0),lRec=S.loans.filter(l=>l.dir==='owed').reduce((s,l)=>s+outstanding(l),0),lOwe=S.loans.filter(l=>l.dir==='owe').reduce((s,l)=>s+outstanding(l),0);return{liq,inv,ast,lRec,lOwe,nw:liq+inv+ast+lRec-lOwe};} // corrected: outstanding only
function updNW(){const p=nwParts();const nwText=fmtS(p.nw),liqText=fmtS(p.liq);document.getElementById('hNW').textContent=nwText;document.getElementById('hLiq').textContent=liqText;const sb=document.getElementById('sbNW');if(sb)sb.textContent=nwText;}
function renderNWB(){const p=nwParts();document.getElementById('nwB').innerHTML=`<div class="nwrow"><span>💧 Liquid</span><b>${fmt(p.liq)}</b></div><div class="nwrow"><span>💎 Investments</span><b style="color:var(--pu);">${fmt(p.inv)}</b></div><div class="nwrow"><span>🏠 Assets</span><b style="color:var(--bl);">${fmt(p.ast)}</b></div><div class="nwrow"><span>💰 Loans Receivable</span><b style="color:var(--gr);">${fmt(p.lRec)}</b></div><div class="nwrow"><span>📉 Debts</span><b style="color:var(--red);">−${fmt(p.lOwe)}</b></div><div style="padding-top:8px;border-top:2px solid var(--bdr);display:flex;justify-content:space-between;"><b style="font-size:13px;">Net Worth</b><b style="font-size:16px;color:${p.nw>=0?'var(--pu)':'var(--red)'};">${fmt(p.nw)}</b></div>`;document.getElementById('liqB').innerHTML=`${['bank','mtn','voda','cash','sav'].map(k=>`<div class="nwrow"><span>${k==='bank'?'🏦':k==='mtn'?'📱':k==='voda'?'📲':k==='cash'?'💵':'💰'} ${WLBL[k]}</span><b>${fmt(S.wallets[k]||0)}</b></div>`).join('')}<div class="nwrow"><span>🇺🇸 USD (equiv.)</span><b>${fmt((S.wallets.usd||0)*usdRate)}</b></div><div class="nwrow"><span>📦 Other</span><b>${fmt(S.wallets.oth||0)}</b></div><div style="padding-top:8px;border-top:2px solid var(--bdr);display:flex;justify-content:space-between;"><b style="font-size:13px;">Total Liquid</b><b style="font-size:16px;color:var(--mint);">${fmt(p.liq)}</b></div>`;}


function selectedDashTxns(){
  const now=new Date();
  if(dashPeriod==='all')return S.transactions.slice();
  if(dashPeriod==='day')return S.transactions.filter(t=>t.date===today());
  if(dashPeriod==='week'){const d=new Date(now);d.setDate(d.getDate()-d.getDay());const from=d.toISOString().slice(0,10);return S.transactions.filter(t=>t.date>=from&&t.date<=today());}
  if(dashPeriod==='year')return S.transactions.filter(t=>t.date.startsWith(currentMonth.slice(0,4)));
  return S.transactions.filter(t=>t.date.startsWith(currentMonth));
}
function applyDashPeriod(){
  const sel=document.getElementById('dashPeriodSel');dashPeriod=sel?sel.value:'month';
  renderDashStats();renderPies();renderRecent();renderSmartSignals();
}
function dashPeriodLabel(){
  return dashPeriod==='all'?'All time':dashPeriod==='day'?'Today':dashPeriod==='week'?'This week':dashPeriod==='year'?'Selected year':'Selected month';
}

function renderDashStats(){
  const wc=document.getElementById('welcomeCard');
  if(wc&&localStorage.getItem('nuellieWelcomeGuideSeen')!=='1'&&S.transactions.length===0&&Object.values(S.wallets||{}).every(v=>!+v)){wc.style.display='';}
  else if(wc){wc.style.display='none';}const tx=selectedDashTxns(),mI=tx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0),mE=tx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0),mV=S.investments.reduce((s,i)=>s+moRet(i),0);document.getElementById('d-inc').textContent=fmt(mI);document.getElementById('d-exp').textContent=fmt(mE);const sv=mI-mE;document.getElementById('d-sav').textContent=fmt(sv);document.getElementById('d-sav').style.color=sv>=0?'var(--mint)':'var(--red)';document.getElementById('d-inv').textContent=fmt(mV);document.querySelector('#d-inc').closest('.sc').querySelector('.ss').textContent=dashPeriodLabel();document.querySelector('#d-exp').closest('.sc').querySelector('.ss').textContent=dashPeriodLabel();}
function renderRecent(){const el=document.getElementById('recTxn'),all=S.transactions.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10);if(!all.length){el.innerHTML='<div class="empty"><div class="big">✨</div><p>No transactions yet.</p></div>';return;}el.innerHTML=all.map(t=>`<div class="txi"><div class="txico" style="background:${t.type==='income'?'var(--gr-l)':'var(--red-l)'}">${ce(t.cat)}</div><div class="txi-info"><div class="txi-name">${esc(t.desc||t.cat)}</div><div class="txi-cat"><span class="badge ${t.type==='income'?'bgr':'bre'}">${ce(t.cat)} ${esc(t.cat)}</span> · ${esc(t.wallet)}</div></div><div style="text-align:right;"><div class="txi-amt ${t.type==='income'?'ain':'aout'}">${t.type==='income'?'+':'-'}${fmt(t.amount)}</div><div class="txi-date">${t.date}</div></div></div>`).join('');}

let CH={};
function dc(k){if(CH[k]){CH[k].destroy();delete CH[k];}}
const PC=['#C2185B','#7B1FA2','#00796B','#E64A19','#F9A825','#2E7D32','#E53935','#1565C0','#AD1457','#4CAF50','#FF7043','#26C6DA','#9C27B0','#FF5722'];
const PIE_LABEL_PLUGIN={id:'pieLabels',afterDatasetsDraw(chart,args,opts){const {ctx}=chart,total=chart.data.datasets[0].data.reduce((s,v)=>s+Number(v||0),0);if(!total)return;ctx.save();ctx.font='700 10px Nunito';ctx.textAlign='center';ctx.textBaseline='middle';chart.getDatasetMeta(0).data.forEach((arc,i)=>{const val=chart.data.datasets[0].data[i];const pct=val/total*100;if(pct<5)return;const p=arc.tooltipPosition();ctx.fillStyle='#fff';ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=3;ctx.strokeText(pct.toFixed(0)+'%',p.x,p.y);ctx.fillText(pct.toFixed(0)+'%',p.x,p.y);});ctx.restore();}};
if(typeof Chart!=='undefined'){try{Chart.register(PIE_LABEL_PLUGIN);}catch(e){}}

function canChart(){return typeof Chart!=='undefined';}
function renderOvChart(){if(!canChart())return;dc('ov');const now=new Date(),months=[];for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push(d.toISOString().slice(0,7));}const lbx=months.map(m=>new Date(m+'-02').toLocaleDateString('en-GB',{month:'short',year:'numeric'})),inc=months.map(m=>S.transactions.filter(t=>t.type==='income'&&t.date.startsWith(m)).reduce((s,t)=>s+t.amount,0)),exp=months.map(m=>S.transactions.filter(t=>t.type==='expense'&&t.date.startsWith(m)).reduce((s,t)=>s+t.amount,0)),ctx=document.getElementById('ovChart');if(!ctx)return;CH.ov=new Chart(ctx,{type:'line',data:{labels:lbx,datasets:[{label:'Income',data:inc,borderColor:'#2E7D32',backgroundColor:'rgba(46,125,50,.1)',fill:true,tension:0.4,pointRadius:4,borderWidth:2.5},{label:'Expenses',data:exp,borderColor:'#C62828',backgroundColor:'rgba(198,40,40,.1)',fill:true,tension:0.4,pointRadius:4,borderWidth:2.5}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{labels:{font:{size:10}}}},scales:{x:{grid:{display:false},ticks:{font:{size:9}},title:{display:true,text:'Month',font:{size:9},color:'#7E5A8A'}},y:{ticks:{callback:v=>'GHS'+v.toLocaleString(),font:{size:9}},title:{display:true,text:'Amount (GH₵)',font:{size:9},color:'#7E5A8A'}}}}}); }
function makePie(cid,dataMap,key){if(!canChart())return;dc(key);const ctx=document.getElementById(cid);if(!ctx)return;const labels=Object.keys(dataMap),data=Object.values(dataMap),total=data.reduce((s,v)=>s+v,0);if(!labels.length||total===0){ctx.getContext&&ctx.getContext('2d').clearRect(0,0,ctx.width,ctx.height);return;}CH[key]=new Chart(ctx,{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:PC,borderWidth:2,borderColor:'#fff'}]},options:{responsive:true,maintainAspectRatio:false,cutout:'45%',layout:{padding:6},plugins:{pieLabels:{},legend:{position:'bottom',labels:{font:{size:9,weight:'400'},boxWidth:9,padding:6,generateLabels:ch=>ch.data.labels.map((lbl,i)=>({text:`${lbl} ${(ch.data.datasets[0].data[i]/total*100).toFixed(0)}%`,fillStyle:PC[i%PC.length],index:i}))}},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${fmt(ctx.parsed)} (${(ctx.parsed/total*100).toFixed(1)}%)`}}}}});}
function renderPies(){const agg=txns=>{const m={};txns.forEach(t=>m[t.cat]=(m[t.cat]||0)+t.amount);return m;};const tx=selectedDashTxns();makePie('incPie',agg(tx.filter(t=>t.type==='income')),'ip');makePie('expPie',agg(tx.filter(t=>t.type==='expense')),'ep');}
function renderWalChart(){if(!canChart())return;dc('wc');const ctx=document.getElementById('walChart');if(!ctx)return;const keys=['bank','mtn','voda','cash','sav','usd','oth'],lbls=['Bank','MTN MoMo','Vodafone','Cash','Savings','USD','Other'],data=keys.map(k=>k==='usd'?(S.wallets.usd||0)*usdRate:(S.wallets[k]||0));if(data.every(v=>v===0))return;const total=data.reduce((s,v)=>s+Math.abs(v),0)||1;CH.wc=new Chart(ctx,{type:'doughnut',data:{labels:lbls,datasets:[{data:data.map(v=>Math.max(0,v)),backgroundColor:['#7B1FA2','#F9A825','#E91E63','#2E7D32','#00796B','#1565C0','#C2185B'],borderWidth:2,borderColor:'#fff'}]},options:{responsive:true,maintainAspectRatio:false,cutout:'45%',plugins:{legend:{position:'bottom',labels:{font:{size:9},boxWidth:9,padding:5}},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${fmt(ctx.parsed)}`}}}}});}

let anPeriod='month',anFrom='',anTo='';
function setPeriod(p){anPeriod=p;document.querySelectorAll('#perBtns .pbtn').forEach(b=>b.classList.toggle('active',(b.getAttribute('onclick')||'').includes(`'${p}'`)));document.getElementById('customRangeRow').style.display=p==='custom'?'':'none';if(p!=='custom')runAnalysis();}
function applyCustomRange(){anFrom=document.getElementById('aFrom').value;anTo=document.getElementById('aTo').value;runAnalysis();}
function getPeriodTxns(){const now=new Date();let from='',to=today();if(anPeriod==='all'){return S.transactions.slice();}if(anPeriod==='day')from=to;else if(anPeriod==='week'){const d=new Date(now);d.setDate(d.getDate()-d.getDay());from=d.toISOString().slice(0,10);}else if(anPeriod==='month')from=now.toISOString().slice(0,7)+'-01';else if(anPeriod==='year')from=now.getFullYear()+'-01-01';else{from=anFrom;to=anTo;}return S.transactions.filter(t=>(!from||t.date>=from)&&(!to||t.date<=to));}
function runAnalysis(){const txns=getPeriodTxns(),inc=txns.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0),exp=txns.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);document.getElementById('anInc').textContent=fmt(inc);document.getElementById('anExp').textContent=fmt(exp);const net=inc-exp;document.getElementById('anNet').textContent=fmt(net);document.getElementById('anNet').style.color='var(--pu)';document.getElementById('anCnt').textContent=txns.length;const agg=type=>{const m={};txns.filter(t=>t.type===type).forEach(t=>m[t.cat]=(m[t.cat]||0)+t.amount);return m;};makePie('anIncPie',agg('income'),'anIP');makePie('anExpPie',agg('expense'),'anEP');renderAnTrend();renderTopExp(txns);renderInsights(txns,inc,exp);}
function renderAnTrend(){if(!canChart())return;dc('ant');const ctx=document.getElementById('anTrend');if(!ctx)return;const now=new Date(),months=[];for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push(d.toISOString().slice(0,7));}const lbx=months.map(m=>new Date(m+'-02').toLocaleDateString('en-GB',{month:'short',year:'numeric'})),inc=months.map(m=>S.transactions.filter(t=>t.type==='income'&&t.date.startsWith(m)).reduce((s,t)=>s+t.amount,0)),exp=months.map(m=>S.transactions.filter(t=>t.type==='expense'&&t.date.startsWith(m)).reduce((s,t)=>s+t.amount,0));CH.ant=new Chart(ctx,{type:'line',data:{labels:lbx,datasets:[{label:'Income',data:inc,borderColor:'#2E7D32',backgroundColor:'rgba(46,125,50,.1)',fill:true,tension:0.4,pointRadius:3},{label:'Expenses',data:exp,borderColor:'#C62828',backgroundColor:'rgba(198,40,40,.1)',fill:true,tension:0.4,pointRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{font:{size:10}}}},scales:{x:{grid:{display:false},ticks:{font:{size:9}},title:{display:true,text:'Month',font:{size:9},color:'#7E5A8A'}},y:{ticks:{callback:v=>'GHS'+v.toLocaleString(),font:{size:9}},title:{display:true,text:'Amount (GH₵)',font:{size:9},color:'#7E5A8A'}}}}});}
function renderTopExp(txns){const el=document.getElementById('anTopExp'),exp={};txns.filter(t=>t.type==='expense').forEach(t=>exp[t.cat]=(exp[t.cat]||0)+t.amount);const sorted=Object.entries(exp).sort((a,b)=>b[1]-a[1]).slice(0,8),total=Object.values(exp).reduce((s,v)=>s+v,0);if(!sorted.length){el.innerHTML='<div class="empty"><p>No expenses in this period.</p></div>';return;}el.innerHTML=sorted.map(([cat,amt])=>{const pct=total>0?(amt/total*100).toFixed(0):0;return`<div style="margin-bottom:9px;"><div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span style="font-size:12.5px;font-weight:700;">${ce(cat)} ${esc(cat)}</span><span style="font-size:11px;color:var(--txm);">${fmt(amt)} (${pct}%)</span></div><div class="pb"><div class="pf" style="width:${pct}%;background:var(--pink);"></div></div></div>`;}).join('');}
function renderInsights(txns,inc,exp){const el=document.getElementById('anInsights'),insights=[],expCats={};txns.filter(t=>t.type==='expense').forEach(t=>expCats[t.cat]=(expCats[t.cat]||0)+t.amount);const sorted=Object.entries(expCats).sort((a,b)=>b[1]-a[1]);if(sorted.length)insights.push(`💸 <b>${esc(sorted[0][0])}</b> is your biggest expense category at ${fmt(sorted[0][1])}.`);if(inc>0){const savRate=((inc-exp)/inc*100).toFixed(0);insights.push(`📊 Your savings rate is <b>${savRate}%</b> for this period.`);}if(exp>inc&&inc>0)insights.push(`⚠️ You're spending <b>${fmt(exp-inc)}</b> more than you're earning. Consider reviewing your budget.`);if(sorted.length>2)insights.push(`🔍 Your top 3 expense categories account for <b>${fmt(sorted.slice(0,3).reduce((s,v)=>s+v[1],0))}</b>.`);if(!insights.length)insights.push('✨ No insights yet — add more transactions to see analysis.');el.innerHTML=insights.map(i=>`<div style="padding:9px 12px;background:var(--pu-p);border-radius:9px;border-left:3px solid var(--pu);font-size:12.5px;line-height:1.5;margin-bottom:8px;">${i}</div>`).join('');}

function exportExcel(){if(typeof XLSX==='undefined'){toast('Excel export library did not load.');return;}const from=document.getElementById('exFrom').value,to=document.getElementById('exTo').value,type=document.getElementById('exType').value,wb=XLSX.utils.book_new();function dateInRange(d){if(!from&&!to)return true;if(from&&d<from)return false;if(to&&d>to)return false;return true;}if(type==='all'||type==='income'||type==='expense'){let txns=S.transactions.filter(t=>dateInRange(t.date));if(type==='income')txns=txns.filter(t=>t.type==='income');else if(type==='expense')txns=txns.filter(t=>t.type==='expense');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(txns.map(t=>({Date:t.date,Type:t.type,Description:t.desc||'',Category:t.cat,Amount:t.amount,Wallet:t.wallet,Notes:t.notes||''}))),'Transactions');}if(type==='all'||type==='investments')XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(S.investments.map(i=>({'Name':i.name,'Type':i.type,'Principal (GH₵)':i.amount,'Charges / Fees (GH₵)':i.fees||0,'Return Type':i.returnType==='pct'?'Percentage':'Fixed','Rate / Fixed Monthly':i.returnType==='pct'?i.rate+'%':i.fixedMonthly,'Est Monthly Return':moRet(i).toFixed(2),'Est Annual Return':(moRet(i)*12).toFixed(2),'Start Date':i.start,'Maturity':i.maturity||'','Credit To':i.creditTo,'Notes':i.notes||''}))),'Investments');if(type==='all'||type==='loans')XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(S.loans.map(l=>({'Name':l.name,'Type':l.type,'Direction':l.dir==='owe'?'I Owe':'They Owe Me','Amount (GH₵)':l.amount,'Other Charges / Fees (GH₵)':l.fees||0,'Amount Paid / Collected':l.paid||0,'Outstanding':outstanding(l),'Interest Rate (%)':l.rate,'Due Date':l.due||'','Notes':l.notes||''}))),'Loans');if(type==='all'||type==='assets')XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(S.assets.map(a=>({'Name':a.name,'Category':a.cat,'Est. Value (GH₵)':a.value,'Date':a.date||'','Notes':a.notes||''}))),'Assets');XLSX.writeFile(wb,`NuelliesMoneyDiary_${from||'start'}_to_${to||'end'}.xlsx`);toast('📥 Exported to Excel!');}

let pjType='investment';
function setPjType(t){pjType=t;document.getElementById('pjTInv').classList.toggle('active',t==='investment');document.getElementById('pjTLoan').classList.toggle('active',t==='loan');document.getElementById('pjInvSec').style.display=t==='investment'?'':'none';document.getElementById('pjLoanSec').style.display=t==='loan'?'':'none';}
function togPjRT(){const v=document.getElementById('pjRT').value;document.getElementById('pjPG').style.display=v==='pct'?'':'none';document.getElementById('pjFG').style.display=v!=='pct'?'':'none';}
function runProj(){const name=document.getElementById('pjN').value.trim()||'Venture',principal=parseFloat(document.getElementById('pjP').value)||0,rtype=document.getElementById('pjRT').value,rate=parseFloat(document.getElementById('pjR').value)||0,fixedR=parseFloat(document.getElementById('pjF').value)||0,costs=parseFloat(document.getElementById('pjC').value)||0,setup=parseFloat(document.getElementById('pjSC').value)||0,fees=parseFloat((document.getElementById('pjFees')||{value:0}).value)||0,period=parseInt(document.getElementById('pjPer').value)||12,compound=document.getElementById('pjCo').value==='yes';let bal=principal,totR=0,totC=setup+fees,bals=[principal];for(let i=1;i<=period;i++){let ret=rtype==='pct'?(compound?bal*(rate/100/12):principal*(rate/100/12)):rtype==='fixmo'?fixedR:fixedR/12;const net=ret-costs;bal=compound&&rtype==='pct'?bal+net:principal+totR+ret-costs;totR+=ret;totC+=costs;bals.push(Math.max(0,bal));}const totNet=totR-totC,roi=principal>0?(totNet/principal)*100:0,avgMo=totR/period;document.getElementById('pjRes').style.display='';document.getElementById('pjRes').innerHTML=`<div class="pres"><div style="font-family:'Playfair Display',serif;font-size:14px;margin-bottom:10px;">📊 ${esc(name)} — ${period}-Month Projection</div><div class="prow"><span>Initial Investment</span><span>${fmt(principal)}</span></div><div class="prow"><span>Setup Costs</span><span>${fmt(setup)}</span></div><div class="prow"><span>Fund / Platform Fees</span><span>${fmt(fees)}</span></div><div class="prow"><span>Monthly Costs</span><span>${fmt(costs)}</span></div><div class="prow"><span>Est. Monthly Return</span><span style="color:var(--gr);">${fmt(avgMo)}</span></div><div class="prow"><span>Total Gross Return</span><span style="color:var(--gr);">${fmt(totR)}</span></div><div class="prow"><span>Total Costs + Fees</span><span style="color:var(--red);">${fmt(totC)}</span></div><div class="prow"><span>Total Net Return</span><span style="color:${totNet>=0?'var(--gr)':'var(--red)'};">${fmt(totNet)}</span></div><div class="prow"><span>ROI after fees</span><span>${roi.toFixed(1)}%</span></div><div class="prow"><span>Projected End Balance</span><span style="color:var(--pu);">${fmt(Math.max(0,bals[bals.length-1]-fees-setup))}</span></div></div><div style="margin-top:9px;"><button title="Save this entry" aria-label="Save this entry" class="btn btn-mt btn-sm" onclick="saveProj('${esc(name)}',${principal},${totNet},${period},${roi.toFixed(1)})">💾 Save</button></div>`;if(canChart()){dc('pjc');document.getElementById('pjChartCard').style.display='';const mos=Array.from({length:period+1},(_,i)=>i===0?'Start':'Mo '+i);CH.pjc=new Chart(document.getElementById('pjChart'),{type:'line',data:{labels:mos,datasets:[{label:'Balance',data:bals.map((v,i)=>Math.max(0,v-(i?setup+fees:0))),borderColor:'#7B1FA2',backgroundColor:'rgba(123,31,162,.08)',fill:true,tension:0.4,pointRadius:2,borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:8,font:{size:9}},title:{display:true,text:'Period',font:{size:9},color:'#7E5A8A'}},y:{ticks:{callback:v=>'GHS'+v.toLocaleString(),font:{size:9}},title:{display:true,text:'Balance (GH₵)',font:{size:9},color:'#7E5A8A'}}}}});}}
function runLoan(){const name=document.getElementById('laN').value.trim()||'Loan',principal=parseFloat(document.getElementById('laA').value)||0,annRate=parseFloat(document.getElementById('laR').value)||0,term=parseInt(document.getElementById('laT').value)||12,ltype=document.getElementById('laIT').value,fees=parseFloat((document.getElementById('laFees')||{value:0}).value)||0;if(!principal||!annRate||!term){toast('Please fill in loan amount, rate, and term.');return;}const moRate=annRate/100/12;let totInt=0,totPd=0,pmt,rows=[];if(ltype==='reducing'){pmt=principal*moRate/(1-Math.pow(1+moRate,-term));let bal=principal;for(let i=1;i<=term;i++){const ip=bal*moRate,pp=pmt-ip;bal=Math.max(0,bal-pp);totInt+=ip;totPd+=pmt;rows.push({mo:i,pmt,int:ip,prin:pp,bal});}}else{totInt=principal*(annRate/100)*(term/12);totPd=principal+totInt;pmt=totPd/term;}const totalWithFees=totPd+fees,effectiveCost=totInt+fees;document.getElementById('laRes').style.display='';document.getElementById('laRes').innerHTML=`<div class="pres"><div style="font-family:'Playfair Display',serif;font-size:14px;margin-bottom:10px;">🏦 ${esc(name)} — Loan Analysis</div><div class="prow"><span>Loan Amount</span><span>${fmt(principal)}</span></div><div class="prow"><span>Annual Rate</span><span>${annRate}%</span></div><div class="prow"><span>Term</span><span>${term} months</span></div><div class="prow"><span>Other Charges / Fees</span><span style="color:var(--red);">${fmt(fees)}</span></div><div class="prow"><span>Monthly Repayment</span><span style="color:var(--red);font-weight:800;">${fmt(pmt)}</span></div><div class="prow"><span>Total Interest</span><span style="color:var(--red);">${fmt(totInt)}</span></div><div class="prow"><span>Total Cost incl. Fees</span><span style="color:var(--red);">${fmt(effectiveCost)}</span></div><div class="prow"><span>Total Repaid incl. Fees</span><span style="font-weight:800;">${fmt(totalWithFees)}</span></div><div class="prow"><span>Effective Cost</span><span>${((effectiveCost/principal)*100).toFixed(1)}%</span></div></div>`+(ltype==='reducing'&&rows.length?`<div style="overflow-x:auto;margin-top:10px;"><table class="xt"><thead><tr><th>Mo</th><th>Payment</th><th>Interest</th><th>Principal</th><th>Balance</th></tr></thead><tbody>${rows.slice(0,24).map(r=>`<tr><td>${r.mo}</td><td style="color:var(--red);">${fmt(r.pmt)}</td><td style="color:var(--pe);">${fmt(r.int)}</td><td style="color:var(--gr);">${fmt(r.prin)}</td><td>${fmt(r.bal)}</td></tr>`).join('')}${rows.length>24?`<tr><td colspan="5" style="text-align:center;color:var(--txm);font-size:10px;">…and ${rows.length-24} more months</td></tr>`:''}</tbody></table></div>`:'');}
function saveProj(name,p,nr,per,roi){snap('Save projection');S.projections.push({id:Date.now()+Math.random(),name,principal:p,netReturn:nr,period:per,roi,date:today()});persist();renderSavedPj();toast('✅ Projection saved!');}
function delProj(id){snap('Delete projection');S.projections=S.projections.filter(p=>p.id!==id);persist();renderSavedPj();}
function renderSavedPj(){const el=document.getElementById('savedPj');if(!S.projections.length){el.innerHTML='<div class="empty"><div class="big">🔮</div><p>No saved projections yet.</p></div>';return;}el.innerHTML=S.projections.slice().reverse().map(p=>`<div class="txi"><div class="txico" style="background:var(--pu-p)">🔮</div><div class="txi-info"><div class="txi-name">${esc(p.name)}</div><div class="txi-cat">${p.period} months · Principal: ${fmt(p.principal)} · ROI: ${p.roi}%</div></div><div style="text-align:right;"><div class="txi-amt ${p.netReturn>=0?'ain':'aout'}">${p.netReturn>=0?'+':'-'}${fmt(Math.abs(p.netReturn))}</div><div class="txi-date">${p.date}</div></div><button title="✕" aria-label="✕" class="btn btn-re btn-xs" onclick="delProj(${p.id})">✕</button></div>`).join('');}


// ─── ENHANCED PLANNER FEATURES ───────────────────
function monthKey(offset=0){const d=new Date();d.setMonth(d.getMonth()+offset);return d.toISOString().slice(0,7);}
function avgMonthly(type,months=3){let total=0,count=0;for(let i=0;i<months;i++){const m=monthKey(-i);const v=S.transactions.filter(t=>t.type===type&&t.date.startsWith(m)).reduce((a,t)=>a+t.amount,0);if(v>0||i===0){total+=v;count++;}}return count?total/count:0;}
function monthlyDebtPayments(){return S.loans.filter(l=>l.dir==='owe').reduce((s,l)=>s+(parseFloat(l.paid)||0),0);}
function emergencyMonths(){const avgExp=avgMonthly('expense',3);return avgExp>0?liqTot()/avgExp:0;}
function savingsRate(){const inc=avgMonthly('income',3),exp=avgMonthly('expense',3);return inc>0?((inc-exp)/inc)*100:0;}
function dtiRatio(){const inc=avgMonthly('income',3);return inc>0?(monthlyDebtPayments()/inc)*100:0;}
function forecastNextMonth(){const recInc=S.recurring.filter(r=>r.type==='income').reduce((s,r)=>s+(+r.amount||0),0);const recExp=S.recurring.filter(r=>r.type==='expense').reduce((s,r)=>s+(+r.amount||0),0);const bills=S.bills.reduce((s,b)=>s+(+b.amount||0),0);const inv=S.investments.reduce((s,i)=>s+moRet(i),0);const fallbackInc=recInc||avgMonthly('income',3);const fallbackExp=recExp||avgMonthly('expense',3);return{inc:fallbackInc+inv,out:fallbackExp+bills,net:(fallbackInc+inv)-(fallbackExp+bills),bills:S.bills.filter(b=>daysUntil(b.due)<=30&&daysUntil(b.due)>=0).length};}
function healthScore(){let score=50;const sr=savingsRate(),ef=emergencyMonths(),dti=dtiRatio(),p=nwParts();if(sr>=20)score+=15;else if(sr>=10)score+=8;else if(sr<0)score-=15;if(ef>=6)score+=15;else if(ef>=3)score+=8;else if(ef<1)score-=10;if(dti<30)score+=10;else if(dti>40)score-=15;if(p.nw>0)score+=10;else score-=10;return Math.max(0,Math.min(100,Math.round(score)));}
function renderSmartSignals(){const f=forecastNextMonth(),ef=emergencyMonths(),dti=dtiRatio(),hs=healthScore(),sr=savingsRate();document.getElementById('d-health').textContent=hs+'/100';document.getElementById('d-health-label').textContent=hs>=80?'Excellent':hs>=60?'Good':hs>=40?'Needs attention':'High risk';document.getElementById('d-efund').textContent=ef.toFixed(1)+' mo';document.getElementById('d-efund-label').textContent=ef>=6?'Excellent':ef>=3?'Moderate':'Build this up';document.getElementById('d-dti').textContent=dti.toFixed(0)+'%';document.getElementById('d-forecast').textContent=fmtS(f.net);const top=topExpenseCategory();const alerts=[];alerts.push(`<span class="alert-pill ${hs>=70?'alert-green':hs>=50?'alert-yellow':'alert-red'}">Health score: ${hs}/100</span>`);alerts.push(`<span class="alert-pill ${ef>=6?'alert-green':ef>=3?'alert-yellow':'alert-red'}">Emergency fund: ${ef.toFixed(1)} months</span>`);alerts.push(`<span class="alert-pill ${dti<30?'alert-green':dti<40?'alert-yellow':'alert-red'}">DTI: ${dti.toFixed(0)}%</span>`);alerts.push(`<span class="alert-pill ${sr>=20?'alert-green':sr>=10?'alert-yellow':'alert-red'}">Savings rate: ${sr.toFixed(0)}%</span>`);if(top)alerts.push(`<span class="alert-pill alert-blue">Top spend: ${esc(top[0])} (${fmt(top[1])})</span>`);if(f.net<0)alerts.push(`<span class="alert-pill alert-red">Next month forecast is negative</span>`);
  const subsoon=(S.subscriptions||[]).filter(s=>s.active!==false&&s.due&&daysUntil(s.due)<=7&&daysUntil(s.due)>=0);
  if(subsoon.length){subsoon.forEach(s=>alerts.push(`<span class="alert-pill alert-yellow">📺 ${esc(s.name)} renews in ${daysUntil(s.due)} day${daysUntil(s.due)===1?'':'s'} (${fmt(subMonthlyCost(s))}/mo)</span>`));}
  document.getElementById('smartSignals').innerHTML='<div class="smart-signal-wrap">'+alerts.join('')+'</div>';}
function topExpenseCategory(){const exp={};selectedDashTxns().filter(t=>t.type==='expense').forEach(t=>exp[t.cat]=(exp[t.cat]||0)+t.amount);return Object.entries(exp).sort((a,b)=>b[1]-a[1])[0];}
function daysUntil(d){if(!d)return 9999;return Math.ceil((new Date(d)-new Date())/86400000);}

function addTransfer(){const from=document.getElementById('trFrom').value,to=document.getElementById('trTo').value,amt=parseFloat(document.getElementById('trAmt').value)||0,date=document.getElementById('trDate').value||today(),note=document.getElementById('trNote').value.trim();if(!amt||amt<=0){toast('Enter a valid transfer amount.');return;}if(from===to){toast('Choose different wallets.');return;}const fk=WMAP[from],tk=WMAP[to];snap('Wallet transfer');if(fk)S.wallets[fk]=(S.wallets[fk]||0)-amt;if(tk)S.wallets[tk]=(S.wallets[tk]||0)+amt;S.transfers.push({id:Date.now()+Math.random(),from,to,amount:amt,date,note});persist();refreshAll();['trAmt','trNote'].forEach(id=>document.getElementById(id).value='');toast('🔁 Transfer saved.');}
function delTransfer(id){snap('Delete transfer');S.transfers=S.transfers.filter(t=>t.id!==id);persist();refreshAll();}
function renderTransfers(){const el=document.getElementById('transferList');if(!el)return;const rows=S.transfers.slice().reverse().slice(0,8);if(!rows.length){el.innerHTML='<div class="empty"><p>No transfers yet.</p></div>';return;}el.innerHTML=rows.map(t=>`<div class="txi"><div class="txico" style="background:var(--mint-p)">🔁</div><div class="txi-info"><div class="txi-name">${esc(t.from)} → ${esc(t.to)}</div><div class="txi-cat">${t.date}${t.note?' · '+esc(t.note):''}</div></div><div class="txi-amt">${fmt(t.amount)}</div><button title="✕" aria-label="✕" class="btn btn-re btn-xs" onclick="delTransfer(${t.id})">✕</button></div>`).join('');}

function addGoal(){const name=document.getElementById('gName').value.trim(),target=parseFloat(document.getElementById('gTarget').value)||0,current=parseFloat(document.getElementById('gCurrent').value)||0;if(!name||!target){toast('Enter goal name and target.');return;}snap('Add goal');S.goals.push({id:Date.now()+Math.random(),name,target,current,deadline:document.getElementById('gDeadline').value,emoji:document.getElementById('gEmoji').value||'🌸',wallet:document.getElementById('gWallet').value});persist();refreshAll();['gName','gTarget','gCurrent','gDeadline','gEmoji'].forEach(id=>document.getElementById(id).value='');toast('🌸 Goal saved.');}
function delGoal(id){snap('Delete goal');S.goals=S.goals.filter(g=>g.id!==id);persist();refreshAll();}
function addGoalMoney(id){const g=S.goals.find(x=>x.id===id);if(!g)return;document.getElementById('gcmT').textContent='Add to Goal';document.getElementById('gcmSub').textContent=`${esc(g.emoji||'🌸')} ${g.name} — currently ${fmt(g.current||0)} of ${fmt(g.target)}`;document.getElementById('gcmAmt').value='';document.getElementById('goalContribModal').dataset.goalId=id;document.getElementById('goalContribModal').dataset.mode='add';document.getElementById('goalContribModal').classList.add('open');setTimeout(()=>document.getElementById('gcmAmt').focus(),80);}
function saveGoalContrib(){const id=parseFloat(document.getElementById('goalContribModal').dataset.goalId),g=S.goals.find(x=>x.id===id);if(!g)return;const v=parseFloat(document.getElementById('gcmAmt').value)||0;if(v<=0){toast('Please enter a valid amount.');return;}const isWithdraw=document.getElementById('goalContribModal').dataset.mode==='withdraw';snap(isWithdraw?'Goal withdrawal':'Goal contribution');g.current=Math.max(0,(+g.current||0)+(isWithdraw?-v:v));persist();refreshAll();closeM('goalContribModal');toast(isWithdraw?'💸 '+fmt(v)+' withdrawn from goal.':'🌸 '+fmt(v)+' added to goal!');}
function withdrawGoalMoney(id){const g=S.goals.find(x=>x.id===id);if(!g)return;document.getElementById('gcmT').textContent='Withdraw from Goal';document.getElementById('gcmSub').textContent=`${esc(g.emoji||'🌸')} ${g.name} — currently saved: ${fmt(g.current||0)}`;document.getElementById('gcmAmt').value='';document.getElementById('goalContribModal').dataset.goalId=id;document.getElementById('goalContribModal').dataset.mode='withdraw';document.getElementById('goalContribModal').classList.add('open');setTimeout(()=>document.getElementById('gcmAmt').focus(),80);}
function renderGoals(){const list=document.getElementById('goalList');if(!list)return;const target=S.goals.reduce((s,g)=>s+(+g.target||0),0),cur=S.goals.reduce((s,g)=>s+(+g.current||0),0),prog=target?cur/target*100:0;document.getElementById('g-count').textContent=S.goals.length;document.getElementById('g-target').textContent=fmtS(target);document.getElementById('g-current').textContent=fmtS(cur);document.getElementById('g-progress').textContent=prog.toFixed(0)+'%';if(!S.goals.length){list.innerHTML='<div class="empty"><div class="big">🌸</div><p>No goals yet.</p></div>';return;}list.innerHTML=S.goals.map(g=>{const p=Math.min(100,(+g.current||0)/(+g.target||1)*100),rem=(+g.target||0)-(+g.current||0);return`<div class="goal-card"><div class="goal-head"><div><div class="goal-title">${esc(g.emoji||'🌸')} ${esc(g.name)}</div><div class="goal-meta">${g.deadline?'Deadline: '+g.deadline+' · ':''}${esc(g.wallet||'No linked wallet')}</div></div><div style="text-align:right;"><b>${p.toFixed(0)}%</b><div class="goal-meta">${fmt(Math.max(0,rem))} left</div></div></div><div class="pb"><div class="pf" style="width:${p}%;background:var(--pink);"></div></div><div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11.5px;"><span>${fmt(g.current)} / ${fmt(g.target)}</span><span><button title="＋ Add" aria-label="＋ Add" class="btn btn-mt btn-xs" onclick="addGoalMoney(${g.id})">＋ Add</button> <button title="− Withdraw" aria-label="− Withdraw" class="btn btn-out btn-xs" onclick="withdrawGoalMoney(${g.id})">− Withdraw</button> <button title="✕" aria-label="✕" class="btn btn-re btn-xs" onclick="delGoal(${g.id})">✕</button></span></div></div>`;}).join('');}

function addRecurring(){const name=document.getElementById('rName').value.trim(),amount=parseFloat(document.getElementById('rAmt').value)||0;if(!name||!amount){toast('Enter recurring name and amount.');return;}snap('Add recurring');S.recurring.push({id:Date.now()+Math.random(),name,type:document.getElementById('rType').value,amount,cat:document.getElementById('rCat').value.trim(),freq:document.getElementById('rFreq').value,next:document.getElementById('rNext').value||today(),wallet:document.getElementById('rWallet').value});persist();refreshAll();['rName','rAmt','rCat','rNext'].forEach(id=>document.getElementById(id).value='');toast('🔁 Recurring item saved.');}
function delRecurring(id){snap('Delete recurring');S.recurring=S.recurring.filter(r=>r.id!==id);persist();refreshAll();}
function postRecurring(id){const r=S.recurring.find(x=>x.id===id);if(!r)return;snap('Post recurring: '+r.name);S.transactions.push(cleanRecord({id:Date.now()+Math.random(),type:r.type||'expense',desc:r.name,amount:+r.amount||0,cat:r.cat||r.name,wallet:r.wallet||'Bank Account',date:today(),notes:'Posted from recurring'}));persist();refreshAll();toast('✅ '+esc(r.name)+' posted to transactions!');}
function renderRecurring(){const el=document.getElementById('recurringList');if(!el)return;if(!S.recurring.length){el.innerHTML='<div class="empty"><p>No recurring items yet.</p></div>';return;}el.innerHTML=S.recurring.map(r=>`<div class="rec-card"><div style="display:flex;justify-content:space-between;gap:8px;"><div><b>${r.type==='income'?'💰':'💸'} ${esc(r.name)}</b><div class="goal-meta">${esc(r.freq)} · next: ${r.next} · ${esc(r.wallet)}</div></div><div style="text-align:right;"><b class="${r.type==='income'?'ain':'aout'}">${fmt(r.amount)}</b><br><div style="display:flex;gap:3px;margin-top:3px;justify-content:flex-end;"><button class="btn btn-mt btn-xs" onclick="postRecurring(${r.id})" title="Post to transactions today">📌 Post</button><button class="btn btn-out btn-xs" onclick="openEditRecurring(${r.id})" title="Edit">✏️</button><button title="✕" aria-label="✕" class="btn btn-re btn-xs" onclick="delRecurring(${r.id})">✕</button></div></div></div></div>`).join('');}
function openEditRecurring(id){
  const r=S.recurring.find(x=>x.id===id);if(!r)return;
  document.getElementById('emT').textContent='Edit Recurring Item';
  const freqOpts=['monthly','weekly','quarterly','yearly'].map(f=>`<option value="${f}"${f===r.freq?' selected':''}>${f.charAt(0).toUpperCase()+f.slice(1)}</option>`).join('');
  const walOpts=['Bank Account','MTN MoMo','Vodafone Cash','Cash','Savings','Other'].map(w=>`<option${w===r.wallet?' selected':''}>${w}</option>`).join('');
  document.getElementById('emB').innerHTML=`<div class="fgg"><div class="fg"><label>Name</label><input type="text" id="er-name" value="${esc(r.name)}"></div><div class="fg"><label>Type</label><select id="er-type"><option value="income"${r.type==='income'?' selected':''}>Income</option><option value="expense"${r.type==='expense'?' selected':''}>Expense</option></select></div><div class="fg"><label>Amount (GH₵)</label><input type="number" id="er-amt" value="${r.amount}" min="0"></div><div class="fg"><label>Category</label><input type="text" id="er-cat" value="${esc(r.cat||'')}"></div><div class="fg"><label>Frequency</label><select id="er-freq">${freqOpts}</select></div><div class="fg"><label>Next Due Date</label><input type="date" id="er-next" value="${r.next||''}"></div><div class="fg"><label>Wallet</label><select id="er-wal">${walOpts}</select></div></div>`;
  document.getElementById('emS').onclick=()=>{snap('Edit recurring');Object.assign(r,{name:document.getElementById('er-name').value.trim(),type:document.getElementById('er-type').value,amount:parseFloat(document.getElementById('er-amt').value)||0,cat:document.getElementById('er-cat').value.trim(),freq:document.getElementById('er-freq').value,next:document.getElementById('er-next').value,wallet:document.getElementById('er-wal').value});persist();closeM('editModal');refreshAll();toast('✅ Recurring item updated!');};
  document.getElementById('editModal').classList.add('open');
}
function addBill(){const name=document.getElementById('billName').value.trim(),amount=parseFloat(document.getElementById('billAmt').value)||0;if(!name||!amount){toast('Enter bill name and amount.');return;}snap('Add bill');S.bills.push({id:Date.now()+Math.random(),name,amount,due:document.getElementById('billDue').value||today(),cat:document.getElementById('billCat').value.trim()});persist();refreshAll();['billName','billAmt','billDue','billCat'].forEach(id=>document.getElementById(id).value='');toast('🧾 Bill saved.');}
function delBill(id){snap('Delete bill');S.bills=S.bills.filter(b=>b.id!==id);persist();refreshAll();}
function renderBills(){const el=document.getElementById('billList');if(!el)return;const rows=S.bills.slice().sort((a,b)=>(a.due||'').localeCompare(b.due||''));if(!rows.length){el.innerHTML='<div class="empty"><p>No bills recorded.</p></div>';return;}el.innerHTML=rows.map(b=>{const d=daysUntil(b.due),cls=d<0?'bre':d<=7?'bye':'bbl';return`<div class="rec-card"><div style="display:flex;justify-content:space-between;gap:8px;"><div><b>🧾 ${esc(b.name)}</b><div class="goal-meta">${esc(b.cat||'Bill')} · due ${b.due} <span class="badge ${cls}">${d<0?'Overdue':d+' days'}</span></div></div><div style="text-align:right;"><b>${fmt(b.amount)}</b><br><button title="✕" aria-label="✕" class="btn btn-re btn-xs" onclick="delBill(${b.id})">✕</button></div></div></div>`;}).join('');}
function renderPlannerSummary(){const f=forecastNextMonth();['pl-inc','pl-out','pl-net','pl-bills'].forEach(id=>{if(!document.getElementById(id))return;});if(!document.getElementById('pl-inc'))return;document.getElementById('pl-inc').textContent=fmtS(f.inc);document.getElementById('pl-out').textContent=fmtS(f.out);document.getElementById('pl-net').textContent=fmtS(f.net);document.getElementById('pl-net').style.color='var(--pu)';document.getElementById('pl-bills').textContent=f.bills;}




function parseQuickSMS(){
  const q=document.getElementById('quickSmsText'),main=document.getElementById('smsText');
  if(!q||!q.value.trim()){toast('Paste an SMS alert first.');return;}
  if(main)main.value=q.value.trim();
  parseSMS();
  const ac=document.getElementById('quickSmsAutoClear');
  if(!ac||ac.checked)q.value='';
  toast('SMS parsed. Review the prefilled entry before saving.');
}

function clearSMSParser(){const t=document.getElementById('smsText'),r=document.getElementById('smsResult');if(t)t.value='';if(r)r.innerHTML='';}
function inferSmsCat(s){
  s=String(s||'').toLowerCase();
  const has=rx=>rx.test(s);
  // Income signals
  if(has(/salary|payroll|wage|allowance|stipend|monthly pay|paid my salary|work pay/))return'Salary / Monthly Pay';
  if(has(/freelance|contract|consulting|consultancy|gig|client paid|professional fee/))return'Freelance / Contract';
  if(has(/business sales|sales income|shop sales|customer paid|self[- ]?employment/))return'Business / Self-Employment';
  if(has(/bonus|overtime|commission/))return has(/commission/)?'Commission':'Overtime / Bonus';
  if(has(/interest|dividend|coupon|investment return|treasury bill|t[- ]?bill|mutual fund|returns/))return'Investment Returns';
  if(has(/rent received|tenant paid|rental income/))return'Rental Income';
  if(has(/gift received|sent me money|money received|support received/))return'Gift / Money Received';

  // Expense signals, ordered from specific to broad so common items classify correctly.
  if(has(/netflix|spotify|showmax|dstv|icloud|apple music|google one|youtube premium|prime video|subscription|renewal|monthly fee/))return'Subscriptions';
  if(has(/mechanic|car service|servicing|vehicle service|maintenance|spare part|tyre|tire|oil change|alignment|brake pad|battery|car wash|vulcaniser/))return'Car Maintenance';
  if(has(/fuel|petrol|diesel|shell|goil|totalenergies|total |uber|bolt|yango|taxi|trotro|bus fare|transport|ride|commute|parking|toll/))return'Transport / Fuel / Ride';
  if(has(/pharmacy|hospital|clinic|lab test|laboratory|medical|meds|medicine|doctor|diagnostic|scan|x[- ]?ray|ultrasound|prescription|consultation/))return'Medical / Pharmacy';
  if(has(/bread|rice|beans|gari|yam|plantain|tomato|onion|pepper|egg|eggs|milk|tea|sugar|oil|fish|meat|chicken|vegetable|fruit|banana|apple|orange|market|grocery|groceries|melcom|shoprite|supermarket|foodstuff|provision|provisions|kenkey|banku|waakye ingredients/))return'Groceries / Food Market';
  if(has(/restaurant|eat out|eating out|kfc|pizza|burger|shawarma|lunch|dinner|breakfast|cafe|café|takeaway|delivery|glovo|bolt food|yango food|jollof|waakye|fried rice|meal|food order/))return has(/takeaway|delivery|glovo|bolt food|yango food|food order/)?'Takeaway / Delivery':'Restaurants / Eating Out';
  if(has(/snack|snacks|drink|drinks|juice|coke|fanta|malt|biscuit|chocolate|ice cream|coffee|tea break/))return'Drinks & Snacks';
  if(has(/ecg|gwcl|water bill|electric|electricity|utility|utilities|power|light bill|prepaid|postpaid bill/))return'Utilities (GWCL, ECG)';
  if(has(/mtn|telecel|vodafone|airteltigo|data|airtime|bundle|internet|wifi|broadband|fibre|router/))return'Airtime & Mobile Data';
  if(has(/rent|landlord|accommodation|house rent|apartment|room rent/))return'Rent / Accommodation';
  if(has(/insurance|premium|policy renewal/))return'Insurance';
  if(has(/school fees|course|tuition|book|textbook|training|education|exam|university|workshop|seminar|certificate|certification/))return has(/workshop|seminar|certificate|certification|cpd|conference/)?'Professional Development':'Education / Courses';
  if(has(/church|tithe|offering|donation|charity|thanksgiving|seed/))return'Church / Tithe / Donation';
  if(has(/hair|braids|wig|weave|salon|barber|nails|pedicure|manicure|lashes/))return'Hair & Beauty';
  if(has(/makeup|skincare|cream|lotion|serum|cleanser|perfume|cosmetic|powder|foundation|lipstick/))return'Skincare & Makeup';
  if(has(/shoe|shoes|sandal|sandals|slipper|slippers|heel|heels|dress|clothes|clothing|shirt|trouser|jeans|skirt|bag|handbag|purse|watch|jewellery|jewelry|earring|necklace|accessor(y|ies)/))return'Clothing & Accessories';
  if(has(/soap|toothpaste|toothbrush|sanitary pad|pad|tissue|toilet roll|deodorant|shampoo|conditioner|detergent|personal hygiene/))return'Personal Hygiene';
  if(has(/gym|fitness|workout|exercise|yoga|aerobics|sports/))return'Gym & Fitness';
  if(has(/movie|cinema|concert|event|party|outing|games|entertainment|ticket/))return'Entertainment / Events';
  if(has(/flight|hotel|visa|passport|holiday|vacation|travel|airbnb|booking/))return'Travel & Holidays';
  if(has(/gift|present|birthday|wedding gift|funeral contribution|baby shower/))return'Gifts Given';
  if(has(/family|mother|father|mum|mom|dad|sibling|brother|sister|school fees for|house help|support for/))return'Family Support';
  if(has(/loan|repayment|debt|credit repayment/))return'Loan Repayment';
  if(has(/savings transfer|save money|moved to savings/))return'Savings Transfer';
  if(has(/investment contribution|invested|bought shares|mutual fund contribution/))return'Investment Contribution';
  if(has(/office supplies|stationery|printer|business expense|work expense/))return'Business Expense';
  if(has(/shopping|mall|boutique|online order|jumia|amazon|shein/))return'Shopping';
  return'Miscellaneous';
}
function showTool(tool){
  const root=document.getElementById('page-tools');
  if(!root)return;
  root.querySelectorAll('.tool-btn').forEach(b=>b.classList.toggle('active',b.dataset.tool===tool));
  root.querySelectorAll('.tool-detail').forEach(s=>{
    const on=s.id==='tool-'+tool;
    s.classList.toggle('active',on);
    s.style.display=on?'block':'none';
  });
  const active=document.getElementById('tool-'+tool);
  if(active&&root.classList.contains('active'))setTimeout(()=>active.scrollIntoView({behavior:'smooth',block:'start'}),30);
}

document.addEventListener('click',function(e){
  const btn=e.target.closest&&e.target.closest('#page-tools .tool-btn[data-tool]');
  if(!btn)return;
  e.preventDefault();
  e.stopPropagation();
  showTool(btn.dataset.tool);
});

function parseSmsMessage(raw){
  const s=String(raw||'').replace(/\s+/g,' ').trim();
  const lower=s.toLowerCase();

  // --- AMOUNT: try all common Ghanaian currency formats, pick the largest plausible transaction amount ---
  const amtRx=[
    /(?:GHS|GH[C₵¢]|GHc|cedis?)\s*([0-9,]+(?:\.\d{1,2})?)/gi,
    /([0-9,]+(?:\.\d{1,2})?)\s*(?:GHS|GH[C₵¢]|GHc|cedis?)/gi,
    /amount[:\s]+([0-9,]+(?:\.\d{1,2})?)/gi,
    /(?:sum|value)[:\s]+([0-9,]+(?:\.\d{1,2})?)/gi
  ];
  const allAmts=[];
  for(const rx of amtRx){for(const m of s.matchAll(rx)){const v=parseFloat((m[1]||'0').replace(/,/g,''));if(v>0&&v<10000000)allAmts.push(v);}}
  // Use the first matched amount (usually the transaction amount, not balance)
  const amount=allAmts.length?allAmts[0]:0;
  // Try to extract balance separately (usually labelled)
  const balMatch=s.match(/(?:bal(?:ance)?|new balance|available)[:\s]+(?:GHS|GH[C₵¢]|GHc)?\s*([0-9,]+(?:\.\d{1,2})?)/i);
  const balance=balMatch?parseFloat(balMatch[1].replace(/,/g,'')):null;

  // --- TRANSACTION ID ---
  const txid=(s.match(/(?:Transaction ID|Txn ID|Trans(?:action)? No\.?|Financial Transaction ID|Receipt No\.?|Ref(?:erence)?(?:\s*No\.?)?|External Ref|Order ID)[:\s#-]*([A-Z0-9][A-Z0-9\-]{3,30})/i)||[])[1]||'';

  // --- WALLET / NETWORK DETECTION (order matters: MoMo first, then banks) ---
  let wallet='Bank Account',accountType='Bank';
  if(/\bmtn\b|momo|mobile money/.test(lower)){wallet='MTN MoMo';accountType='MoMo';}
  else if(/\btelecel\b/.test(lower)){wallet='Telecel Cash';accountType='MoMo';}
  else if(/vodafone cash|voda cash|vcash/.test(lower)){wallet='Vodafone Cash';accountType='MoMo';}
  else if(/at money|airteltigo|tigo cash/.test(lower)){wallet='AirtelTigo Money';accountType='MoMo';}
  else if(/\babsa\b/.test(lower)){wallet='Absa Bank';}
  else if(/\bgcb\b|ghana commercial bank/.test(lower)){wallet='GCB Bank';}
  else if(/\bstanbic\b/.test(lower)){wallet='Stanbic Bank';}
  else if(/\bstandard chartered\b|stanchart/.test(lower)){wallet='Standard Chartered';}
  else if(/\bfidelity\b/.test(lower)){wallet='Fidelity Bank';}
  else if(/\bcal bank\b|\bcalbank\b/.test(lower)){wallet='CAL Bank';}
  else if(/\becobank\b/.test(lower)){wallet='Ecobank';}
  else if(/\bzenith\b/.test(lower)){wallet='Zenith Bank';}
  else if(/\bubs\b|universal bank/.test(lower)){wallet='Universal Merchant Bank';}
  else if(/\bprudential\b/.test(lower)){wallet='Prudential Bank';}
  else if(/\bagt\b|agricultural development/.test(lower)){wallet='ADB';}
  else if(/\bgte\b|guaranty trust/.test(lower)){wallet='GTBank';}
  else if(/\bfirst atlantic\b/.test(lower)){wallet='First Atlantic Bank';}
  else if(/\brepublic bank\b/.test(lower)){wallet='Republic Bank';}
  else if(/\bsinapi\b/.test(lower)){wallet='Sinapi Aba';}
  else if(/\bopay\b/.test(lower)){wallet='OPay';accountType='MoMo';}
  else if(/\bpaystack\b/.test(lower)){wallet='Paystack';}

  // --- TRANSACTION TYPE ---
  let type='';
  const incomeRx=/\b(cash in|received|has sent you|you have received|credit(?:ed)?|credit alert|deposit(?:ed)?|paid into|inward transfer|transfer received|salary|payroll|dividend|interest credited|refund|reversal credit|cashback)\b/i;
  const expenseRx=/\b(cash out|payment|paid to|you paid|debit(?:ed)?|debit alert|withdraw[n]?|sent to|purchase|pos transaction|atm withdraw|transfer to|merchant payment|momo pay|bill pay|fee charged|levy)\b/i;
  if(incomeRx.test(s))type='income';
  if(expenseRx.test(s))type='expense';
  // Resolve conflicts: if both match, check context
  if(!type)type=/\bcredit\b/.test(lower)?'income':/\bdebit\b|paid|payment|cash out/.test(lower)?'expense':'expense';

  // --- COUNTERPARTY EXTRACTION (ordered from most specific to broadest) ---
  let counterparty='';
  const cpPatterns=[
    /(?:sent to|paid to|transfer to|payment to|merchant)[:\s]+([A-Z][A-Za-z0-9 .'\-&\/]{2,50}?)(?:\.|,|\s+on|\s+at|\s+Ref|\s+ID|\s+Balance|$)/i,
    /(?:received from|from|sent by|by)[:\s]+([A-Z][A-Za-z0-9 .'\-&\/]{2,50}?)(?:\.|,|\s+on|\s+at|\s+Ref|\s+ID|\s+Balance|$)/i,
    /(?:at POS|at merchant|at)\s+([A-Z][A-Za-z0-9 .'\-&\/]{2,50}?)(?:\.|,|\s+on|\s+Ref|$)/i,
    /(?:description|narration|details?)[:\s]+([A-Za-z0-9 .'\-&\/]{3,60}?)(?:\.|,|\s+Ref|\s+ID|$)/i,
    /(?:account|acct|a\/c)\s*(?:no\.?|number)?[:\s]+([*X0-9]{4,})/i
  ];
  for(const p of cpPatterns){const m=s.match(p);if(m&&m[1]){counterparty=m[1].trim().replace(/\s{2,}/g,' ');break;}}
  if(!counterparty)counterparty='Transaction';

  // --- SMART CATEGORY: pass full message to inferSmsCat for best accuracy ---
  const cat=inferSmsCat(s+(counterparty?' '+counterparty:''));

  return {type,amount,balance,wallet,accountType,counterparty,txid,cat,raw:s};
}
function parseSMS(){
  const box=document.getElementById('smsText'),out=document.getElementById('smsResult');
  const rawTxt=(box&&box.value||'').trim();
  if(!rawTxt){toast('Paste an SMS first.');return;}
  const p=parseSmsMessage(rawTxt);
  if(!p.amount){if(out)out.innerHTML='<div class="err"><b>Could not detect an amount.</b><br>Ensure the SMS contains a GHS amount (e.g. GH₵120.00 or GHS 120.00). You can also enter the transaction manually.</div>';return;}
  const typeLabel=p.type==='income'?'<span style="color:var(--gr);font-weight:700;">↑ Income</span>':'<span style="color:var(--rd);font-weight:700;">↓ Expense</span>';
  const balLine=p.balance!=null?'<br>Balance After: <b>'+fmt(p.balance)+'</b>':'';
  window.__lastParsedSMS=p;
  window.__lastParsedAlert=p;
  if(out)out.innerHTML='<div class="sms-summary"><div style="font-weight:700;margin-bottom:6px;">Parsed '+(p.accountType==='MoMo'?'MoMo':'Bank')+' Alert '+typeLabel+'</div>Amount: <b>'+fmt(p.amount)+'</b>'+balLine+'<br>Wallet: '+esc(p.wallet||'—')+'<br>Counterparty: '+esc(p.counterparty||'—')+'<br>Category: '+esc(p.cat||'—')+'<br>'+(p.txid?'Transaction ID: <span style="font-size:11px;font-family:monospace;">'+esc(p.txid)+'</span><br>':'')+'</div><div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;"><button title="Prefill the transaction form" class="btn btn-pk btn-sm" onclick="prefillSMS(window.__lastParsedSMS||window.__lastParsedAlert)">✨ Prefill Form</button><button class="btn btn-out btn-sm" onclick="clearSMSParser()">Clear</button></div>';
  toast('SMS parsed. Review the summary and click Prefill Form.');
}
function showParsedSummaryOnForm(pre,d){
  const page=document.getElementById(pre==='i'?'page-income':'page-expenses');if(!page)return;
  let box=document.getElementById(pre+'ParsedSmsSummary');
  if(!box){box=document.createElement('div');box.id=pre+'ParsedSmsSummary';box.className='sms-summary';box.style.marginBottom='10px';page.insertBefore(box,page.firstElementChild);}
  box.innerHTML=`<b>Parsed SMS Summary</b><br>Type: ${d.type==='income'?'Income':'Expense'}<br>Amount: ${fmt(d.amount)}<br>Wallet: ${esc(d.wallet||'')}<br>Counterparty/Account: ${esc(d.counterparty||'')||'—'}${d.txid?'<br>Transaction ID: '+esc(d.txid):''}`;
}

function prefillSMS(d){
  const target=d.type==='income'?'income':'expenses',p=d.type==='income'?'i':'e';
  showPage(target);
  setTimeout(()=>{
    showParsedSummaryOnForm(p,d);
    document.getElementById(p+'Desc').value=d.counterparty||'SMS transaction';
    document.getElementById(p+'Amt').value=d.amount||0;
    const cur=document.getElementById(p+'Cur');if(cur)cur.value='GHS';const fx=document.getElementById(p+'FxRate');if(fx)fx.value=S.usdRate||usdRate||15.5;
    document.getElementById(p+'Wal').value=d.wallet||'Bank Account';
    const acct=document.getElementById(p+'AcctType');if(acct)acct.value=d.accountType||inferAccountType(d.wallet);
    document.getElementById(p+'Date').value=today();
    const catEl=document.getElementById(p+'Cat');if(catEl&&[...catEl.options].some(o=>o.value===d.cat||o.text===d.cat))catEl.value=d.cat;
    document.getElementById(p+'Notes').value=`Imported from SMS${d.txid?' | Transaction ID: '+d.txid:''}`;
    autoCategorize(p);
    const first=document.getElementById(p+'Desc');if(first){first.scrollIntoView({behavior:'smooth',block:'center'});first.focus();}
  },220);
  const textBox=document.getElementById('smsText');if(document.getElementById('smsAutoClear')?.checked&&textBox)textBox.value='';
  toast('SMS parsed. Review the prefilled form and save.');
}
function clearSMSParser(){const t=document.getElementById('smsText'),r=document.getElementById('smsResult');if(t)t.value='';if(r)r.innerHTML='';}
function pageForElement(el){const page=el.closest('.page');return page?page.id.replace('page-',''):'';}
function focusFoundInput(id){const el=document.getElementById(id);if(!el)return;const p=pageForElement(el);if(p)showPage(p);setTimeout(()=>{el.scrollIntoView({behavior:'smooth',block:'center'});el.focus&&el.focus();},120);clearSearch();}
function runSearch(){
  const input=document.getElementById('globalSearch'),box=document.getElementById('searchResults');
  if(!input||!box)return;
  const q=(input.value||'').trim().toLowerCase();
  const terms=q.split(/\s+/).filter(Boolean);
  const smartMatch=text=>terms.every(term=>String(text||'').toLowerCase().includes(term));
  if(!q){box.style.display='none';box.innerHTML='';return;}
  const data=S||{transactions:[],subscriptions:[],investments:[],assets:[],loans:[],goals:[],bills:[],recurring:[],transfers:[],budget:{}};
  const funcs=[
    ['Home dashboard','dashboard','overview home net worth smart money signals chart income expense wallet distribution daily weekly monthly yearly all time insights'],
    ['Add income','income','salary income credit revenue received add money period filters'],
    ['Add expense','expenses','spending expense debit category groceries shopping'],
    ['Subscriptions','subscriptions','recurring subscription netflix spotify usd billing monthly edit pause resume'],
    ['Wallets and USD rate','wallets','wallet balances transfer exchange rate usd ghs rate distribution reconciliation'],
    ['Assets','assets','asset car land property value edit'],
    ['Investments','investments','investment portfolio returns maturity fund manager fees charges'],
    ['Loans and debts','loans','loan debt interest processing fees charges owed owe'],
    ['Budget','budget','budget category limit monthly dropdown'],
    ['Analysis export','analysis','analysis charts excel export trends income expenses day week month year all time custom period'],
    ['Projections','projections','loan investment projection forecast fees charges'],
    ['Goals','goals','savings goals progress target'],
    ['Planner','planner','bills recurring planned calendar'],
    ['SMS parser','tools','sms parser momo bank alert'],
    ['Backup and restore','tools','backup export import json'],
    ['PAYE and T-Bill tools','tools','paye tier 3 tbill treasury bill'],
    ['MoMo Fee Tracker','tools','momo mobile money fees calculator'],
    ['Retirement Projection','tools','retirement pension growth projection'],
    ['Financial Adviser','adviser','advice explain terminology financial coaching net worth emergency fund dti paye']
  ].filter(x=>smartMatch(x.join(' ')));
  const match=o=>smartMatch(JSON.stringify(o||{}));
  const tx=(data.transactions||[]).filter(match).slice(0,8);
  const subs=(data.subscriptions||[]).filter(match).slice(0,5);
  const inv=(data.investments||[]).filter(match).slice(0,5);
  const ast=(data.assets||[]).filter(match).slice(0,5);
  const loans=(data.loans||[]).filter(match).slice(0,5);
  const goals=(data.goals||[]).filter(match).slice(0,5);
  const bills=(data.bills||data.recurring||[]).filter(match).slice(0,5);
  const transfers=(data.transfers||[]).filter(match).slice(0,5);
  const recurring=(data.recurring||[]).filter(match).slice(0,5);
  const projections=(data.projections||[]).filter(match).slice(0,5);
  const cats=[...(data.customIncCats||[]),...(data.customExpCats||[])].filter(match).slice(0,5);
  const budgetItems=Object.entries(data.budget||{}).filter(([k,v])=>smartMatch(k+' '+v)).slice(0,5);
  const inputMatches=[...document.querySelectorAll('input,select,textarea')].filter(el=>{
    if(!el.id||el.type==='hidden')return false;
    const label=el.closest('.fg')?.querySelector('label')?.innerText||'';
    const opts=el.options?Array.from(el.options).map(o=>o.text+' '+o.value).join(' '):'';const text=[el.id,el.name,el.placeholder,el.value,label,opts].join(' ').toLowerCase();
    return smartMatch(text);
  }).slice(0,10);
  let out='';
  if(funcs.length){out+='<div class="search-section-title">Functions</div>'+funcs.slice(0,8).map(f=>`<div class="sr-item" onclick="showPage('${f[1]}');clearSearch();"><b>${esc(f[0])}</b><br><small>${esc(f[2])}</small></div>`).join('');}
  if(inputMatches.length){out+='<div class="search-section-title">Inputs & Forms</div>'+inputMatches.map(el=>{const label=el.closest('.fg')?.querySelector('label')?.innerText||el.placeholder||el.id;const page=pageForElement(el)||'current page';return`<div class="sr-item" onclick="focusFoundInput('${el.id}')">📝 <b>${esc(label)}</b><br><small>${esc(page)} · ${esc(el.placeholder||el.value||el.id)}</small></div>`}).join('');}
  if(tx.length){out+='<div class="search-section-title">Transactions</div>'+tx.map(t=>`<div class="sr-item" onclick="showPage('${t.type==='income'?'income':'expenses'}');clearSearch();">${t.type==='income'?'💚':'❤️'} <b>${esc(t.desc||t.cat)}</b><br><small>${fmt(t.amount)} · ${esc(t.cat)} · ${t.date}</small></div>`).join('');}
  if(subs.length){out+='<div class="search-section-title">Subscriptions</div>'+subs.map(s=>`<div class="sr-item" onclick="showPage('subscriptions');clearSearch();">📺 <b>${esc(s.name)}</b><br><small>${fmt(subMonthlyCost(s))}/mo · due ${s.due}</small></div>`).join('');}
  if(inv.length){out+='<div class="search-section-title">Investments</div>'+inv.map(i=>`<div class="sr-item" onclick="showPage('investments');clearSearch();">📈 <b>${esc(i.name)}</b><br><small>${fmt(i.amount)} · ${esc(i.type||'Investment')}</small></div>`).join('');}
  if(ast.length){out+='<div class="search-section-title">Assets</div>'+ast.map(a=>`<div class="sr-item" onclick="showPage('assets');clearSearch();">🏠 <b>${esc(a.name)}</b><br><small>${fmt(a.value)} · ${esc(a.cat||'Asset')}</small></div>`).join('');}
  if(loans.length){out+='<div class="search-section-title">Loans</div>'+loans.map(l=>`<div class="sr-item" onclick="showPage('loans');clearSearch();">🤝🏾 <b>${esc(l.name)}</b><br><small>${fmt(outstanding(l))} outstanding</small></div>`).join('');}
  if(goals.length){out+='<div class="search-section-title">Goals</div>'+goals.map(g=>`<div class="sr-item" onclick="showPage('goals');clearSearch();">🎯 <b>${esc(g.name)}</b><br><small>${fmt(g.current||0)} / ${fmt(g.target||0)}</small></div>`).join('');}
  if(bills.length){out+='<div class="search-section-title">Planner / Bills</div>'+bills.map(b=>`<div class="sr-item" onclick="showPage('planner');clearSearch();">⏰ <b>${esc(b.name||b.desc||'Planned item')}</b><br><small>${fmt(b.amount||0)} · ${esc(b.frequency||b.freq||'')}</small></div>`).join('');}
  if(recurring.length){out+='<div class="search-section-title">Recurring Items</div>'+recurring.map(r=>`<div class="sr-item" onclick="showPage('planner');clearSearch();">🔁 <b>${esc(r.name||r.desc||'Recurring item')}</b><br><small>${fmt(r.amount||0)} · ${esc(r.freq||r.frequency||'')}</small></div>`).join('');}
  if(projections.length){out+='<div class="search-section-title">Saved Projections</div>'+projections.map(p=>`<div class="sr-item" onclick="showPage('projections');clearSearch();">🔮 <b>${esc(p.name||'Projection')}</b><br><small>${fmt(p.principal||0)} · ${p.period||''} months</small></div>`).join('');}
  if(cats.length){out+='<div class="search-section-title">Custom Categories</div>'+cats.map(c=>`<div class="sr-item" onclick="showPage('budget');clearSearch();">🏷️ <b>${esc(c.name||c)}</b><br><small>Custom category</small></div>`).join('');}
  if(budgetItems.length){out+='<div class="search-section-title">Budgets</div>'+budgetItems.map(([k,v])=>`<div class="sr-item" onclick="showPage('budget');clearSearch();">🎯 <b>${esc(k)}</b><br><small>${fmt(v)}</small></div>`).join('');}
  if(transfers.length){out+='<div class="search-section-title">Wallet Transfers</div>'+transfers.map(t=>`<div class="sr-item" onclick="showPage('wallets');clearSearch();">🔄 <b>${esc(t.from)} → ${esc(t.to)}</b><br><small>${fmt(t.amount)} · ${t.date||''}</small></div>`).join('');}
  box.innerHTML=out||'<div class="sr-item">No matches found.</div>';
  box.style.display='block';
}
function clearSearch(){const i=document.getElementById('globalSearch'),b=document.getElementById('searchResults');if(i)i.value='';if(b){b.innerHTML='';b.style.display='none';}}
function smartAdvisorAnswer(q){
  q=(q||'').toLowerCase().trim();
  const p=nwParts(),ef=emergencyMonths(),sr=savingsRate(),dti=dtiRatio(),f=forecastNextMonth();
  const inc3=avgMonthly('income',3),exp3=avgMonthly('expense',3),invReturn=(S.investments||[]).reduce((s,i)=>s+moRet(i),0);
  const topExp={};(S.transactions||[]).filter(t=>t.type==='expense').forEach(t=>topExp[t.cat]=(topExp[t.cat]||0)+t.amount);
  const topCat=Object.entries(topExp).sort((a,b)=>b[1]-a[1])[0];
  const subs=(S.subscriptions||[]).filter(x=>x.active!==false);
  const subCost=subs.reduce((s,x)=>s+(typeof subMonthlyCost==='function'?subMonthlyCost(x):0),0);
  const goals=(S.goals||[]);
  const loans=(S.loans||[]).filter(l=>l.dir==='owe');
  const modules={
    home:'Home gives your financial overview: net worth, smart money signals, savings-rate progress, recent transactions and charts.',
    income:'Income page records all inflows: salary, freelance, gifts, investments. Use Save Income or Bulk Input. Click any history row to edit.',
    expenses:'Expenses page records spending with categories, split transactions, receipt scanning, geo-tags, bulk input and filters. Click any row to edit.',
    subscriptions:'Subscriptions page tracks recurring bills. Add name, amount, billing cycle and due date. The app estimates cost-per-use to flag wasteful subs.',
    wallets:'Wallets page manages cash, MoMo, bank, savings and USD balances, wallet-to-wallet transfers, reconciliation and FX rates.',
    investments:'Investments page records principal, return rate, maturity, fees and dividends. Supports GHS and USD with performance tracking.',
    assets:'Assets section (inside Investments) tracks cars, land, property and other valuables by current market value.',
    loans:'Loans & Debts page records amounts owed or receivable, repayment schedules, fees and payoff strategy (avalanche or snowball).',
    budget:'Budget page sets monthly spending limits per category and compares actual spending. Tap a bar to see transactions for that category.',
    goals:'Goals page lets you set savings targets with deadlines. The app calculates how much to save monthly to hit each goal on time.',
    planner:'Planner page manages recurring income/expenses, upcoming bills, What-If scenarios and financial commitments.',
    projections:'Projections page models investment returns and loan repayment including fees and amortisation schedules.',
    analysis:'Analysis page shows breakdowns by day/week/month/year/all-time, trends, top categories, insights and Excel export.',
    tools:'Money Tools: SMS Parser, CSV/Excel Import, Backup, Monthly Report, Calendar, Reminders, PAYE, T-Bill, Retirement and other calculators.',
    adviser:'The AI Adviser combines your recorded data with an AI model to give personalised Ghana-specific financial guidance.',
    sms:'Money Tools → SMS Parser: paste a MoMo or bank alert, tap Parse, review the summary, then click Prefill Form to autofill the expense/income form.',
    csv:'Money Tools → Statement Import: upload a bank CSV or Excel, map columns, review and edit rows, then save all at once.',
    backup:'Money Tools → Backup: export data as JSON for safekeeping, or import/merge a backup without losing current records.',
    receipt:'On the Expenses page tap Scan Receipt (camera icon), upload a receipt image, then tap Parse with AI for best results.',
    calendar:'Money Tools → Financial Calendar: shows daily net cash flow and highlights upcoming bill due dates.',
    report:'Money Tools → Monthly Report: generates a printable one-page PDF financial summary for any month.',
    paye:'Money Tools → PAYE Calculator: estimates Ghana income tax, SSNIT deductions and net take-home pay.',
    tbill:'Money Tools → T-Bill Calculator: estimates discount, proceeds and annualised yield on Ghana Treasury Bills (91/182/364-day).',
    retirement:'Money Tools → Retirement Planner: projects how long savings last given monthly withdrawals and a growth rate.'
  };
  const terms={
    'net worth':'Net worth = liquid + investments + assets + receivables − debts. Yours is currently '+fmt(p.nw)+'.',
    'liquid':'Liquid money is cash you can access quickly (bank, MoMo, savings, cash-in-hand). Yours is '+fmt(p.liq)+'.',
    'savings rate':'Savings rate = (income − expenses) ÷ income × 100. Yours is '+sr.toFixed(1)+'%. Aim for at least 20%.',
    'emergency fund':'Emergency fund covers unexpected costs. Target 3–6 months of expenses. You have '+ef.toFixed(1)+' months covered.',
    'cash flow':'Cash flow = income − expenses. Your 3-month average monthly surplus is '+fmt(inc3-exp3)+'.',
    'budget variance':'Budget variance = budgeted − actual. Positive = under budget; negative = over budget.',
    'dti':'DTI (debt-to-income) = monthly debt payments ÷ monthly income × 100. Yours is '+dti.toFixed(0)+'%. Below 35% is healthy.',
    'debt snowball':'Debt snowball: pay smallest balances first for quick wins. Good for motivation.',
    'debt avalanche':'Debt avalanche: pay highest-interest debts first to minimise total interest paid.',
    'compound interest':'Compound interest: your returns earn additional returns. Time is the key ingredient.',
    't-bill':'Treasury Bills: short-term Ghana government securities (91/182/364-day). Low risk and currently competitive. Use the T-Bill calculator in Money Tools.',
    'paye':'PAYE: income tax deducted at source from employment salary in Ghana. Use the PAYE calculator in Money Tools.',
    'ssnit':'SSNIT: Ghana\'s mandatory pension. Employee pays 5.5%, employer pays 8%, total 13.5% of basic salary.',
    'tier 3':'Tier 3: voluntary pension. Contributions reduce taxable income within GRA limits. Good for high earners wanting tax savings.',
    'momo':'MoMo (Mobile Money): widely used in Ghana for payments. Track your MoMo balance in the Wallets section.',
    'split transaction':'Split transaction: divide one payment across multiple categories. Useful for supermarket shops covering food and household items.',
    'fx rate':'FX rate: converts USD to GHS. Rates are stored per-transaction so historical records stay accurate when today\'s rate changes.',
    'reconciliation':'Reconciliation: checks if your manually entered wallet balance matches what the app calculates from transactions and transfers.'
  };
  let ans=[];
  if(!q){
    ans.push('Your snapshot: <b>net worth '+fmt(p.nw)+'</b> | liquid <b>'+fmt(p.liq)+'</b> | savings rate <b>'+sr.toFixed(0)+'%</b> | emergency fund <b>'+ef.toFixed(1)+' months</b> | DTI <b>'+dti.toFixed(0)+'%</b> | next-month forecast <b>'+fmt(f.net)+'</b>.');
    if(ef<3)ans.push('⚠️ Emergency fund is low ('+ef.toFixed(1)+' months). Build at least 3 months of expenses (≈GH₵'+((3*exp3).toFixed(0))+') in a liquid account before new commitments.');
    if(dti>40)ans.push('⚠️ DTI is high ('+dti.toFixed(0)+'%). Avoid new debt and model a payoff plan in the Loans page.');
    if(sr<15&&inc3>0)ans.push('💡 Savings rate ('+sr.toFixed(0)+'%) is below 15%. Try saving GH₵'+((inc3*0.15).toFixed(0))+'/month automatically on payday.');
    if(subCost>inc3*0.1&&inc3>0)ans.push('📺 Subscriptions cost <b>'+fmt(subCost)+'/month</b> — that is '+((subCost/inc3*100).toFixed(0))+'% of your income. Review cost-per-use in the Subscriptions page.');
    if(f.net<0)ans.push('📉 Next-month forecast is negative (<b>'+fmt(f.net)+'</b>). Check recurring items and upcoming bills in the Planner.');
    if(goals.length){const ng=goals.filter(g=>g.target&&(g.current||0)<g.target).sort((a,b)=>((a.current||0)/a.target)-((b.current||0)/b.target));if(ng.length){const g=ng[0];ans.push('🎯 Goal in focus: <b>'+esc(g.name)+'</b> — '+fmt(g.current||0)+' of '+fmt(g.target)+' ('+((((g.current||0)/g.target)*100)||0).toFixed(0)+'%). '+((inc3-exp3>0)?'At current surplus, you need about '+((((g.target||0)-(g.current||0))/(inc3-exp3)).toFixed(1))+' months.':'Increase income or cut expenses to fund this goal.'));}}
    return '<div>'+ans.join('<br><br>')+'</div>';
  }
  Object.keys(modules).forEach(k=>{if(q.includes(k))ans.push('<b>'+k.charAt(0).toUpperCase()+k.slice(1)+'</b>: '+modules[k]);});
  Object.keys(terms).forEach(k=>{if(q.includes(k))ans.push('<b>'+k.charAt(0).toUpperCase()+k.slice(1)+'</b>: '+terms[k]);});
  if(!ans.length&&/where|how|find|record|add|edit|delete|upload|import|export|print|save|use|set/.test(q)){
    ans.push('I can guide you anywhere. Try: "how do I record expenses?", "where is the T-Bill calculator?", "how do I import a bank statement?", "how do I attach a receipt?", "where do I add a savings goal?"');
  }
  if(/afford|can i buy|should i buy/.test(q)){
    ans.push('Affordability check: your average monthly surplus is <b>'+fmt(inc3-exp3)+'</b>. If the purchase is under one month’s surplus it’s generally manageable. For larger amounts, ensure emergency fund ('+ef.toFixed(1)+' months) stays above 3 months after buying.');
  }
  if(/invest|investment|where.*put.*money|grow.*money|returns/.test(q)){
    ans.push('Ghana investment options to consider: <b>Treasury Bills</b> (91/182/364-day, low risk — use T-Bill calculator in Money Tools), <b>Databank/Absa/Fidelity mutual funds</b> (medium risk), <b>fixed deposits</b> at GCB/Stanbic/CAL Bank, or <b>GSE stocks</b> for higher risk/return. Always fund your emergency account first.');
    if(ef<3)ans.push('⚠️ Emergency fund ('+ef.toFixed(1)+' months) is below 3 months — shore this up before locking money in illiquid investments.');
  }
  if(/save|saving|reach.*goal|meet.*target/.test(q)){
    const surplus=inc3-exp3;
    ans.push('Your average monthly surplus is <b>'+fmt(surplus)+'</b>, which compounds to <b>'+fmt(surplus*12)+' per year</b>. Use the Goals page to set a target amount and deadline — the app calculates your required monthly savings.');
    if(goals.length){const g=goals.filter(gg=>gg.target&&(gg.current||0)<gg.target)[0];if(g&&surplus>0){const mo=(((g.target||0)-(g.current||0))/surplus);ans.push('Goal: <b>'+esc(g.name)+'</b> needs <b>'+fmt((g.target||0)-(g.current||0))+'</b> more. At current surplus: about <b>'+mo.toFixed(1)+'</b> months.');}}
  }
  if(/loan|debt|owe|borrow/.test(q)){
    if(loans.length){ans.push('You have <b>'+loans.length+' active loan(s)</b>. DTI: <b>'+dti.toFixed(0)+'%</b>. Use the <b>avalanche</b> method (highest interest first) to save the most money, or <b>snowball</b> (smallest balance first) for motivation. Model both strategies in the Loans page.');}
    else{ans.push('No active debts recorded. If you need to borrow, aim to keep DTI below 35% — with your income that means max <b>'+fmt(inc3*0.35)+'/month</b> in repayments.');}
  }
  if(/budget|overspend|cut|reduce|spending too much/.test(q)){
    if(topCat)ans.push('Your biggest expense area is <b>'+esc(topCat[0])+'</b> at <b>'+fmt(topCat[1])+'</b> total. Set a monthly budget for this category in the Budget page to track and control it.');
    ans.push('Try the 50/30/20 rule: 50% on needs ('+fmt(inc3*0.5)+'/mo), 30% on wants ('+fmt(inc3*0.3)+'/mo), 20% on savings ('+fmt(inc3*0.2)+'/mo). With income of '+fmt(inc3)+' that means saving <b>'+fmt(inc3*0.2)+' monthly</b>.');
  }
  if(/subscription|subscriptions/.test(q)){
    ans.push('You have <b>'+subs.length+' active subscription(s)</b> costing <b>'+fmt(subCost)+'/month</b> ('+((inc3>0?(subCost/inc3*100):0).toFixed(0))+'% of income). Review cost-per-use on the Subscriptions page and consider pausing anything unused for 30+ days.');
  }
  if(/forecast|next month|upcoming|bills/.test(q)){
    ans.push('Next-month forecast: income <b>'+fmt(f.inc)+'</b>, expenses <b>'+fmt(f.out)+'</b>, net <b>'+fmt(f.net)+'</b>. <b>'+f.bills+' bill(s)</b> due this month. '+(f.net<0?'⚠️ Forecast is negative — review your recurring items and upcoming bills in the Planner.':'You\'re on track.'));
  }
  if(/emergency|rainy day|safety net/.test(q)){
    ans.push('Emergency fund: <b>'+ef.toFixed(1)+' months</b> of expenses covered. '+(ef<3?'Target: add <b>'+fmt((3-ef)*exp3)+'</b> more to reach the 3-month minimum. Park it in a high-yield savings account or short-term fixed deposit.':ef>=6?'Excellent — fully funded (6+ months). Consider moving excess beyond 6 months into a T-Bill or mutual fund.':'Good. Push toward 6 months for greater resilience.'));
  }
  if(/net worth|wealth|assets/.test(q)){
    ans.push('Net worth: liquid <b>'+fmt(p.liq)+'</b> + investments <b>'+fmt(p.inv)+'</b> + assets <b>'+fmt(p.ast||0)+'</b> + receivables <b>'+fmt(p.lRec||0)+'</b> − debts <b>'+fmt(p.lOwe||p.debt||0)+'</b> = <b>'+fmt(p.nw)+'</b>. Record vehicles and land in the Assets section for accuracy.');
  }
  if(/advice|advise|recommend|should|improve|tips|help/.test(q)||!ans.length){
    ans.push('Based on your data: income <b>'+fmt(inc3)+'/mo</b>, expenses <b>'+fmt(exp3)+'/mo</b>, savings rate <b>'+sr.toFixed(0)+'%</b>, emergency fund <b>'+ef.toFixed(1)+' months</b>.'+(topCat?' Biggest spend: <b>'+esc(topCat[0])+'</b>.':''));
    if(ef<3)ans.push('1️⃣ Build emergency fund to GH₵'+((3*exp3).toFixed(0))+' (3 months). Use a dedicated savings wallet or short-term fixed deposit.');
    if(sr<20&&inc3>0)ans.push('2️⃣ Raise savings rate to 20%: save <b>'+fmt(inc3*0.2)+'/month</b>. Automate a transfer on payday so it happens before you spend.');
    if(dti>35)ans.push('3️⃣ Reduce debt load: DTI '+dti.toFixed(0)+'% is elevated. Use the avalanche method in Loans to build a payoff plan.');
    if(invReturn===0&&p.liq>exp3*3)ans.push('💡 Idle cash above 3 months of expenses: put the surplus in a T-Bill or mutual fund to beat inflation.');
  }
  return '<div>'+(ans.length?ans.join('<br><br>'):'Ask me anything: "how do I record expenses?", "where is the T-Bill calculator?", "can I afford a car?", "how do I improve my savings rate?"')+'</div>';
}
async function runAdvisor(){
  const q=(document.getElementById('advQ')||{value:''}).value.trim();
  const res=document.getElementById('advRes');
  if(!res)return;
  const localAnswer=smartAdvisorAnswer(q);
  if(!q){res.innerHTML='<div class="advice-box">'+localAnswer+'</div>';return;}
  res.innerHTML='<div class="advice-box" style="opacity:.7;font-size:12.5px;">Getting AI-powered advice\u2026</div>';
  const btn=document.querySelector('button[onclick="runAdvisor()"]');
  if(btn){btn.disabled=true;btn.textContent='Thinking\u2026';}
  var done=false;
  function fallback(){if(done)return;done=true;res.innerHTML='<div class="advice-box">'+localAnswer+'</div>';if(btn){btn.disabled=false;btn.textContent='\ud83d\udca1 Get Advice';}}
  try{
    const p=nwParts(),ef=emergencyMonths(),sr=savingsRate(),dti=dtiRatio();
    const f=typeof forecastNextMonth==='function'?forecastNextMonth():{net:0};
    const inc3=avgMonthly('income',3),exp3=avgMonthly('expense',3);
    const topCats={};(S.transactions||[]).filter(function(t){return t.type==='expense';}).forEach(function(t){topCats[t.cat]=(topCats[t.cat]||0)+t.amount;});
    const top5=Object.entries(topCats).sort(function(a,b){return b[1]-a[1];}).slice(0,5).map(function(e){return e[0]+': GH\u20b5'+e[1].toFixed(0);}).join(', ')||'none recorded';
    const loans=(S.loans||[]).filter(function(l){return l.dir==='owe';}).map(function(l){return l.name+' GH\u20b5'+(typeof outstanding==='function'?outstanding(l):l.amount).toFixed(0);}).join(', ')||'none';
    const goals=(S.goals||[]).slice(0,3).map(function(g){return g.name+' (target GH\u20b5'+g.target+', saved GH\u20b5'+(g.current||0)+')';}).join(', ')||'none';
    const subs=(S.subscriptions||[]).filter(function(x){return x.active!==false;});
    const subCost=subs.reduce(function(s,x){return s+(typeof subMonthlyCost==='function'?subMonthlyCost(x):0);},0);
    const ctx='You are a financial adviser for a personal finance app used in Ghana (West Africa). Be warm, concise and practical.\n\nUSER FINANCIAL SNAPSHOT:\n- Net worth: GH\u20b5'+p.nw.toFixed(0)+'\n- Liquid: GH\u20b5'+p.liq.toFixed(0)+', Investments: GH\u20b5'+p.inv.toFixed(0)+', Debts: GH\u20b5'+p.debt.toFixed(0)+'\n- Avg monthly income: GH\u20b5'+inc3.toFixed(0)+'\n- Avg monthly expenses: GH\u20b5'+exp3.toFixed(0)+'\n- Savings rate: '+sr.toFixed(1)+'%\n- Emergency fund coverage: '+ef.toFixed(1)+' months\n- Debt-to-income: '+dti.toFixed(0)+'%\n- Next-month forecast: GH\u20b5'+f.net.toFixed(0)+'\n- Top expense categories: '+top5+'\n- Debts: '+loans+'\n- Savings goals: '+goals+'\n- Subscriptions: GH\u20b5'+subCost.toFixed(0)+'/month ('+subs.length+' active)\n- Transactions recorded: '+(S.transactions||[]).length+'\n\nAnswer using this real data. Cite specific GHS numbers. Give 2-3 concrete, actionable recommendations specific to Ghana context (GHS, MoMo, T-Bills, Databank, Absa, CAL Bank, Fidelity, SIC etc). Keep response under 200 words. Use simple HTML: bold key numbers/terms with <b>...</b>, separate paragraphs with <br><br>. No markdown, no bullet symbols, no asterisks.';
    const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:600,system:ctx,messages:[{role:'user',content:q}]})});
    if(response.ok){
      const data=await response.json();
      const aiText=((data.content||[]).filter(function(b){return b.type==='text';}).map(function(b){return b.text;}).join(''));
      if(aiText&&aiText.trim()){
        done=true;
        res.innerHTML='<div class="advice-box"><div style="font-size:10px;font-weight:800;color:var(--pu);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">\u2728 AI Adviser</div>'+aiText.trim()+'<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--pu-l);font-size:10.5px;color:var(--txm);">Based on your '+(S.transactions||[]).length+' recorded transactions. Your data stays on your device.</div></div>';
        if(btn){btn.disabled=false;btn.textContent='\ud83d\udca1 Get Advice';}
        return;
      }
    }
    fallback();
  }catch(e){fallback();}
}
function calcTBill(){const face=+document.getElementById('tbFace').value||0,rate=(+document.getElementById('tbRate').value||0)/100,days=+document.getElementById('tbDays').value||91;if(!face||!rate){toast('Enter face value and rate.');return;}const discount=face*rate*days/365,price=face-discount,eff=(discount/price)*(365/days)*100;document.getElementById('tbRes').innerHTML=`<div class="pres"><div class="prow"><span>Purchase Price</span><span>${fmt(price)}</span></div><div class="prow"><span>Discount / Interest</span><span>${fmt(discount)}</span></div><div class="prow"><span>Maturity Value</span><span>${fmt(face)}</span></div><div class="prow"><span>Approx. Effective Yield</span><span>${eff.toFixed(2)}%</span></div></div>`;}
function calcPAYE(){const gross=+document.getElementById('payGross').value||0;if(!gross){toast('Enter monthly gross salary.');return;}const bands=[[490,0],[110,0.05],[130,0.10],[3166.67,0.175],[16000,0.25],[999999999,0.30]];let rem=gross,tax=0;for(const [band,rate] of bands){const take=Math.min(rem,band);if(take>0)tax+=take*rate;rem-=take;if(rem<=0)break;}document.getElementById('payRes').innerHTML=`<div class="pres"><div class="prow"><span>Estimated PAYE</span><span>${fmt(tax)}</span></div><div class="prow"><span>Estimated Net Salary</span><span>${fmt(gross-tax)}</span></div><div class="prow"><span>Effective Tax Rate</span><span>${gross?(tax/gross*100).toFixed(1):0}%</span></div></div>`;}
function calcRetirement(){let age=+document.getElementById('retAge').value||0,target=+document.getElementById('retTarget').value||60,contrib=+document.getElementById('retContrib').value||0,g=(+document.getElementById('retGrowth').value||0)/100/12;if(!age||!contrib||target<=age){toast('Enter valid age, retirement age and contribution.');return;}const months=(target-age)*12;let bal=0;for(let i=0;i<months;i++)bal=(bal+contrib)*(1+g);document.getElementById('retRes').innerHTML=`<div class="pres"><div class="prow"><span>Years to Retirement</span><span>${target-age}</span></div><div class="prow"><span>Total Contributions</span><span>${fmt(contrib*months)}</span></div><div class="prow"><span>Projected Value</span><span>${fmt(bal)}</span></div></div>`;}
function calcMoMo(){const amt=+document.getElementById('momoAmt').value||0,rate=(+document.getElementById('momoRate').value||0)/100,count=+document.getElementById('momoCount').value||0;if(!amt||!count){toast('Enter amount and monthly transactions.');return;}const fee=amt*rate,total=fee*count;document.getElementById('momoRes').innerHTML=`<div class="pres"><div class="prow"><span>Fee per Transaction</span><span>${fmt(fee)}</span></div><div class="prow"><span>Monthly Fees</span><span>${fmt(total)}</span></div><div class="prow"><span>Annual Fees</span><span>${fmt(total*12)}</span></div></div>`;}
function renderLifestyleInflation(){const el=document.getElementById('lifeInflation');if(!el)return;const y=new Date().getFullYear(),cur={},prev={};S.transactions.filter(t=>t.type==='expense').forEach(t=>{const yy=+t.date.slice(0,4);if(yy===y)cur[t.cat]=(cur[t.cat]||0)+t.amount;if(yy===y-1)prev[t.cat]=(prev[t.cat]||0)+t.amount;});const rows=Object.keys(cur).map(c=>[c,prev[c]||0,cur[c]||0]).filter(r=>r[1]>0).map(r=>[...r,((r[2]-r[1])/r[1]*100)]).sort((a,b)=>b[3]-a[3]).slice(0,8);if(!rows.length){el.innerHTML='<div class="empty"><p>Add expenses across two years to see lifestyle inflation.</p></div>';return;}el.innerHTML=rows.map(r=>`<div class="nwrow"><span>${ce(r[0])} ${esc(r[0])}</span><b style="color:${r[3]>20?'var(--red)':'var(--mint)'};">${r[3].toFixed(0)}%</b></div>`).join('');}
function renderBudgetRecommendations(){const el=document.getElementById('budgetRecs');if(!el)return;const cats=getExpCats(),rows=[];cats.forEach(c=>{let vals=[];for(let i=1;i<=3;i++){const m=monthKey(-i);const v=S.transactions.filter(t=>t.type==='expense'&&t.cat===c&&t.date.startsWith(m)).reduce((s,t)=>s+t.amount,0);if(v>0)vals.push(v);}if(vals.length)rows.push([c,vals.reduce((a,b)=>a+b,0)/vals.length]);});if(!rows.length){el.innerHTML='<div class="empty"><p>After a few months of expenses, recommendations will appear here.</p></div>';return;}el.innerHTML=rows.sort((a,b)=>b[1]-a[1]).slice(0,10).map(([c,avg])=>`<div class="nwrow"><span>${ce(c)} ${esc(c)}</span><b>${fmt(Math.ceil(avg/10)*10)}</b></div>`).join('');}



function populateDeleteCustomCatSelect(){
  const sel=document.getElementById('deleteCustomCatSelect');if(!sel)return;
  const cats=[...(S.customIncCats||[]).map(c=>({type:'income',...c})),...(S.customExpCats||[]).map(c=>({type:'expense',...c}))];
  sel.innerHTML=cats.length?cats.map(c=>`<option value="${c.type}|${esc(c.name)}">${c.emoji||'🏷️'} ${esc(c.name)} (${c.type})</option>`).join(''):'<option value="">No custom categories</option>';
}
function deleteCustomCat(){
  const sel=document.getElementById('deleteCustomCatSelect');if(!sel||!sel.value){toast('No custom category selected.');return;}
  const [type,name]=sel.value.split('|');
  snap('Delete custom category');
  if(type==='income')S.customIncCats=(S.customIncCats||[]).filter(c=>c.name!==name);
  else S.customExpCats=(S.customExpCats||[]).filter(c=>c.name!==name);
  persist();buildCatSelects();buildBCatList();populateDeleteCustomCatSelect();populateTemplateCatList();toast('Custom category deleted.');
}
function saveQuickTemplateFrom(suffix){
  const suf=suffix||'', type=safeSelect('tplType'+suf,'expense'),desc=safeText('tplDesc'+suf),amount=numVal('tplAmt'+suf,0),cat=safeSelect('tplCat'+suf,''),wallet=safeSelect('tplWal'+suf,'Bank Account');
  if(!desc||!amount){toast('Enter a description and amount for the template.');return;}
  if(!Array.isArray(S.templates))S.templates=[];
  if(S.templates.length>=3){toast('You can save up to three quick templates. Delete one first.');return;}
  snap('Save quick template');
  S.templates.push(cleanRecord({id:Date.now()+Math.random(),type,desc,amount,cat,wallet,accountType:inferAccountType(wallet)}));
  persist();renderTemplates();['tplDesc'+suf,'tplAmt'+suf].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
}

function saveQuickTemplate(){
  const type=safeSelect('tplType','expense'),desc=safeText('tplDesc'),amount=numVal('tplAmt',0),cat=safeText('tplCat'),wallet=safeSelect('tplWal','Bank Account');
  if(!desc||!amount){toast('Enter a description and amount for the template.');return;}
  if(!Array.isArray(S.templates))S.templates=[];
  if(S.templates.length>=3){toast('You can save up to three quick templates. Delete one first.');return;}
  snap('Save quick template');
  S.templates.push(cleanRecord({id:Date.now()+Math.random(),type,desc,amount,cat,wallet,accountType:inferAccountType(wallet)}));
  persist();renderTemplates();['tplDesc','tplAmt','tplCat'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
}
function deleteQuickTemplate(id){snap('Delete template');S.templates=(S.templates||[]).filter(t=>String(t.id)!==String(id));persist();renderTemplates();}
function applyQuickTemplate(id){
  const t=(S.templates||[]).find(x=>String(x.id)===String(id));if(!t)return;
  const pre=t.type==='income'?'i':'e';
  showPage(t.type==='income'?'income':'expenses');
  setTimeout(()=>{
    document.getElementById(pre+'Desc').value=t.desc||'';
    document.getElementById(pre+'Amt').value=t.amount||0;
    document.getElementById(pre+'Wal').value=t.wallet||'Bank Account';
    const acct=document.getElementById(pre+'AcctType');if(acct)acct.value=t.accountType||inferAccountType(t.wallet);
    document.getElementById(pre+'Date').value=today();
    const cat=t.cat||inferSmsCat(t.desc||'');
    const c=document.getElementById(pre+'Cat');if(c&&cat&&[...c.options].some(o=>o.value===cat||o.text===cat))c.value=cat;
    document.getElementById(pre+'Notes').value='From quick template';
    autoCategorize(pre);
  },120);
}
function renderTemplates(){
  const arr=S.templates||[];
  const render=el=>{
    if(!el)return;
    if(!arr.length){el.innerHTML='<span style="font-size:11px;color:var(--txm);">No templates yet.</span>';return;}
    el.innerHTML=arr.map(t=>`<button class="template-chip" onclick="applyQuickTemplate(${t.id})">${t.type==='income'?'💚':'❤️'} ${esc(t.desc)} · ${fmt(t.amount)}</button><button class="btn btn-re btn-xs" onclick="deleteQuickTemplate(${t.id})">×</button>`).join('');
  };
  ['quickTemplates','quickTemplatesExpense','quickTemplatesSheet'].forEach(id=>render(document.getElementById(id)));
}


function getPayeeMemory(){
  const map={};
  S.transactions.forEach(t=>{
    if(!t.desc)return;
    const key=t.desc.trim().toLowerCase();
    if(!map[key])map[key]={cat:t.cat,wallet:t.wallet,count:0};
    map[key].count++;
    map[key].cat=t.cat;map[key].wallet=t.wallet; // keep most recent
  });
  return map;
}
function applyPayeePrefill(pre){
  const descEl=document.getElementById(pre+'Desc');if(!descEl)return;
  const desc=descEl.value.trim().toLowerCase();if(!desc||desc.length<3)return;
  const memory=getPayeeMemory();
  const match=Object.entries(memory).find(([k,v])=>v.count>=3&&(k===desc||k.includes(desc)||desc.includes(k)));
  if(!match)return;
  const catSel=document.getElementById(pre+'Cat'),walSel=document.getElementById(pre+'Wal');
  if(catSel&&match[1].cat){const opt=[...catSel.options].find(o=>o.value===match[1].cat);if(opt)catSel.value=match[1].cat;}
  if(walSel&&match[1].wallet){const opt=[...walSel.options].find(o=>o.value===match[1].wallet||o.textContent===match[1].wallet);if(opt)walSel.value=match[1].wallet;}
}
function initSmartEntryHelpers(){
  ['iDesc','eDesc'].forEach(id=>{const el=document.getElementById(id);if(el&&!el.dataset.autoCat){el.dataset.autoCat='1';el.addEventListener('keyup',()=>{autoCategorize(id.startsWith('i')?'i':'e');applyPayeePrefill(id.startsWith('i')?'i':'e');});}});
  ['iWal','eWal'].forEach(id=>{const el=document.getElementById(id);if(el&&!el.dataset.acct){el.dataset.acct='1';el.addEventListener('change',()=>syncAccountType(id[0]));syncAccountType(id[0]);}});
}


// ─── ADVANCED WORKFLOWS ───────────────────────────────────────
let receiptCache={};
let duplicateBypassKey='';
let csvRowsCache=[];

function txnAmountGHS(pre, rawAmt){const cur=safeSelect(pre+'Cur','GHS'),fx=numVal(pre+'FxRate',usdRate||15.5);return cur==='USD'?rawAmt*fx:rawAmt;}
function cacheReceipt(pre){
  const input=document.getElementById(pre+'Receipt');
  if(!input||!input.files||!input.files[0])return;
  const reader=new FileReader();
  reader.onload=e=>{receiptCache[pre]=e.target.result;const lbl=document.getElementById(pre+'ReceiptLbl');if(lbl)lbl.textContent=input.files[0].name;toast('Receipt attached.');};
  reader.readAsDataURL(input.files[0]);
}
function captureGeo(pre){
  if(!navigator.geolocation){toast('Geolocation is not available in this browser.');return;}
  navigator.geolocation.getCurrentPosition(pos=>{
    const val=pos.coords.latitude.toFixed(6)+','+pos.coords.longitude.toFixed(6);
    const g=document.getElementById(pre+'Geo'),lbl=document.getElementById(pre+'GeoLbl'),desc=document.getElementById(pre+'Desc');
    if(g)g.value=val;if(lbl)lbl.textContent='📍 Logged near current location';
    if(desc&&!/Logged near current location/i.test(desc.value))desc.value=(desc.value?desc.value+' — ':'')+'Logged near current location';
  },()=>toast('Could not access location.'));
}
function toggleSplitBox(pre){
  const box=document.getElementById(pre+'SplitBox');if(!box)return;
  box.style.display=box.style.display==='none'?'block':'none';
  if(box.style.display==='block'&&!document.getElementById(pre+'SplitRows').children.length)addSplitRow(pre);
}
function addSplitRow(pre,cat='',amt=''){
  const rows=document.getElementById(pre+'SplitRows');if(!rows)return;
  const cats=(pre==='i'?getIncCats():getExpCats()).map(c=>`<option value="${esc(c)}" ${c===cat?'selected':''}>${ce(c)} ${esc(c)}</option>`).join('');
  const id=Date.now()+Math.random();
  const div=document.createElement('div');div.className='split-row';div.dataset.id=id;
  div.innerHTML=`<div class="fg"><label>Split Category</label><select class="split-cat">${cats}</select></div><div class="fg"><label>Amount</label><input type="number" class="split-amt" min="0" value="${amt}" oninput="validateSplits('${pre}')"></div><button title="Delete selected item" aria-label="Delete selected item" type="button" class="btn btn-re btn-xs" onclick="this.closest('.split-row').remove();validateSplits('${pre}')">Remove</button>`;
  rows.appendChild(div);validateSplits(pre);
}
function getSplits(pre){
  const box=document.getElementById(pre+'SplitBox');if(!box||box.style.display==='none')return [];
  return [...document.querySelectorAll(`#${pre}SplitRows .split-row`)].map(r=>({cat:r.querySelector('.split-cat').value,amount:parseFloat(r.querySelector('.split-amt').value)||0})).filter(s=>s.amount>0);
}
function validateSplits(pre){
  const total=numVal(pre+'Amt',0),splits=getSplits(pre),sum=splits.reduce((a,b)=>a+b.amount,0),st=document.getElementById(pre+'SplitStatus');
  if(!st)return true;
  if(!splits.length){st.textContent='No split categories added.';st.style.color='var(--txm)';return true;}
  const ok=Math.abs(sum-total)<0.01;
  st.textContent=`Split subtotal: ${fmt(sum)} / Total: ${fmt(total)} ${ok?'✅':'⚠️'}`;
  st.style.color=ok?'var(--gr)':'var(--red)';
  return ok;
}
function similarTxnWarning(record,cont){
  const key=[record.type,record.wallet,record.cat,Math.round(record.amount)].join('|');
  if(duplicateBypassKey===key){duplicateBypassKey='';cont();return;}
  const start=new Date(record.date||today());start.setDate(start.getDate()-7);const from=start.toISOString().slice(0,10);
  const dup=(S.transactions||[]).find(t=>t.type===record.type&&t.wallet===record.wallet&&t.cat===record.cat&&t.date>=from&&Math.abs((+t.amount||0)-record.amount)<=Math.max(1,record.amount*.01));
  if(dup){confirmDlg('Similar Entry Found',`This looks similar to an entry on <b>${dup.date}</b> for <b>${fmt(dup.amount)}</b> in <b>${esc(dup.cat)}</b> from <b>${esc(dup.wallet)}</b>.<br><br>Save anyway?`,'Save anyway','btn-pk',()=>{duplicateBypassKey=key;cont();},'Cancel',()=>{});}
  else cont();
}
function resetAdvancedEntry(pre){
  receiptCache[pre]='';
  const r=document.getElementById(pre+'Receipt'),g=document.getElementById(pre+'Geo'),gl=document.getElementById(pre+'GeoLbl'),box=document.getElementById(pre+'SplitBox'),rows=document.getElementById(pre+'SplitRows');
  if(r)r.value='';if(g)g.value='';if(gl)gl.textContent='';if(box)box.style.display='none';if(rows)rows.innerHTML='';
}

// ─── BULK INPUT ───────────────────────────────────
function buildBulkRows(){
  [['Income','income'],['Expense','expense']].forEach(([label,type])=>{
    const tbody=document.getElementById('bulk'+label+'Rows');if(!tbody)return;
    const cats=(type==='income'?getIncCats():getExpCats()).map(c=>`<option value="${esc(c)}">${ce(c)} ${esc(c)}</option>`).join('');
    const wallets=['Bank Account','MTN MoMo','Vodafone Cash','Cash','Savings','USD Account','Other'].map(w=>`<option>${w}</option>`).join('');
    const makeRow=()=>`<tr><td><input data-f="desc" placeholder="Description"></td><td><input data-f="amount" type="number" min="0"></td><td><select data-f="cat">${cats}</select></td><td><select data-f="wallet">${wallets}</select></td><td><input data-f="date" type="date" value="${today()}"></td><td><button type="button" class="btn btn-re btn-xs" style="flex-shrink:0;" onclick="this.closest('tr').remove()" title="Remove row">✕</button></td></tr>`;
    tbody.innerHTML=Array.from({length:5},makeRow).join('');
    const addBtnId='bulkAddRow'+label;
    if(!document.getElementById(addBtnId)){
      const btn=document.createElement('button');
      btn.id=addBtnId;btn.type='button';btn.className='btn btn-out btn-sm';btn.style.marginTop='6px';
      btn.textContent='+ Add Row';
      btn.onclick=()=>{const tr=document.createElement('tr');tr.innerHTML=makeRow().slice(4,-5);tbody.appendChild(tr);};
      tbody.closest('div.bulk-wrap').parentNode.appendChild(btn);
    }
  });
}
function saveBulk(type){
  const tbody=document.getElementById(type==='income'?'bulkIncomeRows':'bulkExpenseRows');if(!tbody)return;
  const txns=[];[...tbody.querySelectorAll('tr')].forEach(r=>{
    const amount=parseFloat(r.querySelector('[data-f="amount"]').value)||0;if(!amount)return;
    const wallet=r.querySelector('[data-f="wallet"]').value;
    txns.push(cleanRecord({id:Date.now()+Math.random(),type,desc:r.querySelector('[data-f="desc"]').value.trim(),amount,cat:r.querySelector('[data-f="cat"]').value,wallet,accountType:inferAccountType(wallet),date:r.querySelector('[data-f="date"]').value||today(),notes:'Bulk input',currency:'GHS'}));
  });
  if(!txns.length){toast('No valid rows to save.');return;}
  snap('Bulk '+type);S.transactions.push(...txns);persist();refreshAll();buildBulkRows();toast(`Saved ${txns.length} ${type} entries.`);
}

// ─── QUICK BOTTOM SHEET ───────────────────────────
function openQuickSheet(){buildQuickAddCats();renderTemplates();document.getElementById('quickSheet').classList.add('open');}
function closeQuickSheet(){const s=document.getElementById('quickSheet');if(s)s.classList.remove('open');}

function isQuickSheetOpen(){return document.getElementById('quickSheet')?.classList.contains('open');}
document.addEventListener('click',function(e){
  const sheet=document.getElementById('quickSheet'),fab=document.querySelector('.fab-add');
  if(!sheet||!sheet.classList.contains('open'))return;
  if(sheet.contains(e.target)||fab?.contains(e.target))return;
  closeQuickSheet();
});

function buildQuickAddCats(){
  const sel=document.getElementById('qaCat'),type=document.getElementById('qaType')?.value||'expense';if(!sel)return;
  sel.innerHTML=(type==='income'?getIncCats():getExpCats()).map(c=>`<option value="${esc(c)}">${ce(c)} ${esc(c)}</option>`).join('');
}
function saveQuickSheet(){
  const type=safeSelect('qaType','expense'),amtRaw=numVal('qaAmt',0),cat=safeSelect('qaCat',type==='income'?'Other Income':'Miscellaneous'),wallet=safeSelect('qaWal','Bank Account'),cur=safeSelect('qaCur','GHS');
  if(!amtRaw){toast('Enter an amount.');return;}
  const amount=cur==='USD'?amtRaw*(usdRate||15.5):amtRaw;
  const record=cleanRecord({id:Date.now()+Math.random(),type,amount,cat,wallet,accountType:inferAccountType(wallet),date:today(),desc:safeText('qaDesc')||'Quick add',notes:'Quick bottom sheet',currency:cur,amtRaw:cur==='USD'?amtRaw:undefined});
  similarTxnWarning(record,()=>{snap('Quick add');S.transactions.push(record);persist();refreshAll();closeQuickSheet();document.getElementById('qaAmt').value='';const qd=document.getElementById('qaDesc');if(qd)qd.value='';toast('Quick entry saved.');});
}

// ─── CSV IMPORT ───────────────────────────────────
function parseCSV(text){
  const rows=[];let cur='',row=[],q=false;
  for(let i=0;i<text.length;i++){const ch=text[i],nx=text[i+1];if(ch==='"'&&q&&nx==='"'){cur+='"';i++;}else if(ch==='"'){q=!q;}else if(ch===','&&!q){row.push(cur);cur='';}else if((ch==='\n'||ch==='\r')&&!q){if(cur||row.length){row.push(cur);rows.push(row);row=[];cur='';}if(ch==='\r'&&nx==='\n')i++;}else cur+=ch;}
  if(cur||row.length){row.push(cur);rows.push(row);}return rows;
}
function loadCSVFile(event){
  const file=event.target.files[0];if(!file)return;const rd=new FileReader();
  const isExcel=/\.(xls|xlsx)$/i.test(file.name);
  rd.onload=e=>{
    if(isExcel&&typeof XLSX!=='undefined'){
      const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'});
      const ws=wb.Sheets[wb.SheetNames[0]];
      csvRowsCache=XLSX.utils.sheet_to_json(ws,{header:1,raw:false}).filter(r=>r.some(c=>String(c||'').trim()));
      if(csvRowsCache.length<2){toast('Excel file appears empty.');return;}setupCSVMapping(csvRowsCache);
    }else{
      csvRowsCache=parseCSV(e.target.result).filter(r=>r.some(c=>String(c).trim()));
      if(csvRowsCache.length<2){toast('CSV appears empty.');return;}setupCSVMapping(csvRowsCache);
    }
  };
  if(isExcel)rd.readAsArrayBuffer(file);else rd.readAsText(file);
}
function setupCSVMapping(rows){
  const headers=rows[0].map(h=>String(h||'').trim()),opts='<option value="">—</option>'+headers.map((h,i)=>`<option value="${i}">${esc(h)}</option>`).join('');
  ['csvDateCol','csvDescCol','csvDebitCol','csvCreditCol','csvAmountCol','csvTypeCol'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=opts;});
  const set=(id,rx)=>{const i=headers.findIndex(h=>rx.test(h));if(i>-1)document.getElementById(id).value=i;};
  set('csvDateCol',/date|posted|value/i);set('csvDescCol',/narration|description|details|particulars|remark/i);set('csvDebitCol',/debit|withdrawal|paid out/i);set('csvCreditCol',/credit|deposit|paid in/i);set('csvAmountCol',/^amount$/i);set('csvTypeCol',/type|drcr|cr\/dr/i);
  document.getElementById('csvMapBox').style.display='block';
  document.getElementById('csvPreview').innerHTML='<table class="xt"><thead><tr>'+headers.map(h=>`<th>${esc(h)}</th>`).join('')+'</tr></thead><tbody>'+rows.slice(1,6).map(r=>'<tr>'+headers.map((_,i)=>`<td>${esc(r[i]||'')}</td>`).join('')+'</tr>').join('')+'</tbody></table>';
}

let csvImportDraft=[];
function inferImportCat(desc,type){if(type==='income'){const c=inferSmsCat(desc);return ['Salary / Monthly Pay','Investment Returns','Rental Income','Bank Interest','Gift / Money Received','Loan Repayment Received'].includes(c)?c:'Other Income';}return inferSmsCat(desc);}
function renderCSVImportDraft(){
  const el=document.getElementById('csvPreview');if(!el)return;
  if(!csvImportDraft.length){el.innerHTML='';return;}
  const catsExp=getExpCats(),catsInc=getIncCats(),wallets=['Bank Account','MTN MoMo','Vodafone Cash','Cash','Savings','USD Account','Other'];
  el.innerHTML=`<div class="ok" style="margin-bottom:8px;">Review and edit imported rows before saving. Duplicate-looking rows are highlighted for your verification.</div>
  <div style="overflow-x:auto;"><table class="xt"><thead><tr><th>Import?</th><th>Type</th><th>Date</th><th>Description</th><th>Amount</th><th>Category</th><th>Wallet</th><th>Status</th></tr></thead><tbody>${csvImportDraft.map((r,i)=>{const cats=r.type==='income'?catsInc:catsExp;return `<tr style="${r.duplicate?'background:var(--ye-l);':''}"><td><input type="checkbox" data-csv="${i}" data-f="include" ${r.duplicate?'':'checked'}></td><td><select data-csv="${i}" data-f="type" onchange="syncCsvDraft(${i})"><option value="income"${r.type==='income'?' selected':''}>Income</option><option value="expense"${r.type==='expense'?' selected':''}>Expense</option></select></td><td><input type="date" data-csv="${i}" data-f="date" value="${esc(r.date)}"></td><td><input data-csv="${i}" data-f="desc" value="${esc(r.desc)}" onkeyup="syncCsvDraft(${i})"></td><td><input type="number" data-csv="${i}" data-f="amount" value="${r.amount}"></td><td><select data-csv="${i}" data-f="cat">${cats.map(c=>`<option value="${esc(c)}"${c===r.cat?' selected':''}>${ce(c)} ${esc(c)}</option>`).join('')}</select></td><td><select data-csv="${i}" data-f="wallet">${wallets.map(w=>`<option${w===r.wallet?' selected':''}>${esc(w)}</option>`).join('')}</select></td><td>${r.duplicate?'Possible duplicate — verify':'New'}</td></tr>`}).join('')}</tbody></table></div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;"><button title="Save this entry" aria-label="Save this entry" class="btn btn-bl btn-sm" onclick="commitCSVImport()">✅ Save Reviewed Rows</button><button title="Cancel action" aria-label="Cancel action" class="btn btn-out btn-sm" onclick="csvImportDraft=[];document.getElementById('csvPreview').innerHTML='';">Cancel</button></div>`;
}
function syncCsvDraft(i){
  const row=csvImportDraft[i];if(!row)return;
  const q=f=>document.querySelector(`[data-csv="${i}"][data-f="${f}"]`);
  row.type=q('type')?.value||row.type;row.desc=q('desc')?.value||row.desc;row.cat=inferImportCat(row.desc,row.type);
  renderCSVImportDraft();
}
function commitCSVImport(){
  if(!csvImportDraft.length){toast('No reviewed rows to save.');return;}
  const rows=[];csvImportDraft.forEach((r,i)=>{const q=f=>document.querySelector(`[data-csv="${i}"][data-f="${f}"]`);if(!q('include')?.checked)return;const type=q('type')?.value||r.type,desc=q('desc')?.value.trim()||r.desc,amount=parseFloat(q('amount')?.value)||0;if(!amount)return;const wallet=q('wallet')?.value||r.wallet;rows.push(cleanRecord({id:Date.now()+Math.random(),type,desc,amount,cat:q('cat')?.value||inferImportCat(desc,type),wallet,accountType:inferAccountType(wallet),date:q('date')?.value||today(),notes:'Statement import — reviewed and editable',currency:'GHS',imported:true}));});
  if(!rows.length){toast('No rows selected for import.');return;}
  const dupCount=csvImportDraft.filter(r=>r.duplicate).length;
  const save=()=>{snap('Reviewed statement import');S.transactions.push(...rows);csvImportDraft=[];csvRowsCache=[];persist();refreshAll();document.getElementById('csvPreview').innerHTML='';document.getElementById('csvStatus').textContent=`Saved ${rows.length} reviewed row(s).`;toast(`Saved ${rows.length} reviewed row(s).`);};
  if(dupCount)confirmDlg('Possible Duplicates Found',`${dupCount} row(s) look similar to existing records. Rows marked as duplicates were left unchecked by default. Save the selected reviewed rows now?`,'Save selected','btn-pk',save,'Review again',()=>{});
  else save();
}

function importCSVRows(){
  if(!csvRowsCache.length)return;
  const get=id=>document.getElementById(id).value,di=get('csvDateCol'),de=get('csvDescCol'),db=get('csvDebitCol'),cr=get('csvCreditCol'),am=get('csvAmountCol'),ty=get('csvTypeCol'),wallet=safeSelect('csvWallet','Bank Account');
  const existing=new Set((S.transactions||[]).map(t=>txnKey(t))),seen=new Set();let dup=0;csvImportDraft=[];
  csvRowsCache.slice(1).forEach(r=>{
    const debit=db!==''?parseFloat(String(r[db]||'').replace(/,/g,''))||0:0,credit=cr!==''?parseFloat(String(r[cr]||'').replace(/,/g,''))||0:0,amountCol=am!==''?Math.abs(parseFloat(String(r[am]||'').replace(/,/g,''))||0):0;
    let type=credit>0?'income':debit>0?'expense':(ty!==''&&/cr|credit/i.test(r[ty])?'income':'expense');
    const amount=credit||debit||amountCol;if(!amount)return;
    const rawDate=di!==''?String(r[di]||''):today();let date=today();const d=new Date(rawDate);if(!isNaN(d))date=d.toISOString().slice(0,10);else if(/^\d{4}-\d{2}-\d{2}/.test(rawDate))date=rawDate.slice(0,10);
    const desc=(de!==''?String(r[de]||'Imported statement entry'):'Imported statement entry').trim();
    const cat=inferImportCat(desc,type);
    const rec={type,desc,amount,cat,wallet,accountType:inferAccountType(wallet),date,currency:'GHS'};
    const k=txnKey(rec);const duplicate=existing.has(k)||seen.has(k);if(duplicate)dup++;seen.add(k);
    csvImportDraft.push(cleanRecord({...rec,duplicate}));
  });
  if(!csvImportDraft.length){toast('No valid rows found.');return;}
  renderCSVImportDraft();
  document.getElementById('csvStatus').textContent=`Loaded ${csvImportDraft.length} row(s) for review. ${dup} possible duplicate(s) flagged.`;
  toast('Rows loaded for review. Edit them before saving.');
}

// ─── REPORTS / CALENDAR / REMINDERS ───────────────
function generateMonthlyReport(){
  const m=safeSelect('reportMonth',currentMonth),tx=S.transactions.filter(t=>t.date&&t.date.startsWith(m)),inc=tx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0),exp=tx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0),rate=inc?((inc-exp)/inc*100):0;
  const cats={};tx.filter(t=>t.type==='expense').forEach(t=>cats[t.cat]=(cats[t.cat]||0)+t.amount);const top=Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const snapNow=nwParts().nw;const prev=(S.snapshots||[]).filter(s=>s.month<m).slice(-1)[0]?.nw||0;const move=snapNow-prev;
  const show=id=>document.getElementById(id)?.checked!==false;
  const cards=[];
  if(show('repIncome'))cards.push(`<div><b>Total Income</b><br>${fmt(inc)}</div>`);
  if(show('repExpenses'))cards.push(`<div><b>Total Expenses</b><br>${fmt(exp)}</div>`);
  if(show('repSavings'))cards.push(`<div><b>Net Savings Rate</b><br>${rate.toFixed(1)}%</div>`);
  if(show('repNetWorth'))cards.push(`<div><b>Net Worth Movement</b><br>${fmt(move)}</div>`);
  const topHtml=show('repTopCats')?`<h3>Top Expense Categories</h3><ol>${top.map(([c,a])=>`<li>${esc(c)} — ${fmt(a)}</li>`).join('')||'<li>No expenses recorded.</li>'}</ol>`:'';
  document.getElementById('monthlyReport').innerHTML=`<div class="report-page"><div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;"><img src="app-logo-master.png" alt="${appDisplayName()} logo" style="width:54px;height:54px;border-radius:14px;object-fit:cover;box-shadow:0 3px 10px rgba(0,0,0,.12);"><div><h2 style="font-family:'Playfair Display',serif;color:var(--pink);margin:0;">${appDisplayName()} — ${m} Report</h2><p style="margin:2px 0 0;color:var(--txm);font-size:12px;font-weight:700;">Generated from ${appDisplayName()}</p></div></div><div class="report-grid">${cards.join('')}</div>${topHtml}</div>`;
}
function printMonthlyReport(){if(!document.getElementById('monthlyReport').innerHTML)generateMonthlyReport();window.print();}
let reminderTimer=null;
function saveDailyReminder(){
  const el=document.getElementById('reminderTime');
  const time=el?el.value||'20:00':'20:00';
  S.reminderTime=time;persist();scheduleDailyReminder();
  const rsEl=document.getElementById('reminderStatus');
  const showStatus=p=>{if(rsEl)rsEl.innerHTML=p==='granted'?`<div class="ok">✅ Reminder set for ${time}. You will be reminded to log today’s transactions.</div>`:`<div class="warn">⚠️ Reminder saved for ${time}, but browser notifications are blocked. Allow notifications so the app can remind you to log today’s transactions.</div>`;};
  if(!('Notification'in window)){if(rsEl)rsEl.innerHTML=`<div class="warn">⚠️ This browser does not support notifications. The reminder will show as an in-app toast when the app is open.</div>`;return;}
  if(Notification.permission==='granted'||Notification.permission==='denied'){showStatus(Notification.permission);return;}
  if(!S.notificationPermissionRequested){S.notificationPermissionRequested=true;persist();Notification.requestPermission().then(showStatus).catch(()=>showStatus('denied'));}
  else showStatus(Notification.permission);
}
function notifyUser(msg,opts){showReminderModal(msg);

  const iconSvg='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"%3E%3Ctext y="28" font-size="28"%3E%F0%9F%92%97%3C/text%3E%3C/svg%3E';
  const options={body:msg,icon:iconSvg,tag:'nuellie-diary',requireInteraction:false,...(opts||{})};
  if(!('Notification'in window)){toast('\u23F0 '+msg);return;}
  if(Notification.permission==='granted'){try{new Notification("💗 "+appDisplayName(),options);}catch(e){toast('\u23F0 '+msg);}}
  else if(Notification.permission!=='denied'){Notification.requestPermission().then(p=>{if(p==='granted')try{new Notification("💗 "+appDisplayName(),options);}catch(e){toast('\u23F0 '+msg);}else toast('\u23F0 '+msg);});}
  else{toast('\u23F0 '+msg);}
}
function showReminderModal(msg){
  const m=document.getElementById('logReminderModal'),txt=document.getElementById('logReminderMsg');
  if(txt)txt.textContent=msg||'Remember to log today’s income and expenses so your diary stays accurate.';
  if(m)m.classList.add('open');
}

function getReminderMsg(){
  return "Please log today’s income and expenses in "+appDisplayName()+" so your balances, budgets, and reports stay accurate.";
}
function scheduleDailyReminder(){
  clearTimeout(reminderTimer);if(!S.reminderTime)return;
  const [h,m]=S.reminderTime.split(':').map(Number),now=new Date(),next=new Date();
  next.setHours(h||20,m||0,0,0);if(next<=now)next.setDate(next.getDate()+1);
  const mins=Math.round((next-now)/60000);
  reminderTimer=setTimeout(()=>{notifyUser(getReminderMsg(),{requireInteraction:true});scheduleDailyReminder();},next-now);
  const rsEl=document.getElementById('reminderStatus');
  if(rsEl&&S.reminderTime)rsEl.innerHTML='<div class="ok">\u2705 Reminder set for '+S.reminderTime+' — fires in approx. '+mins+' minute'+(mins===1?'':'s')+'. Keep this browser tab open.</div>';
}
function testReminder(){notifyUser(getReminderMsg(),{requireInteraction:true});}
function renderFinanceCalendar(){
  const m=safeSelect('calMonth',currentMonth),d0=new Date(m+'-01'),year=d0.getFullYear(),month=d0.getMonth(),days=new Date(year,month+1,0).getDate();
  let htmlCal='<div class="cal-grid">'+['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<div style="font-size:10px;font-weight:900;text-align:center;color:var(--txm);">${d}</div>`).join('');
  for(let i=0;i<d0.getDay();i++)htmlCal+='<div></div>';
  for(let d=1;d<=days;d++){const date=`${m}-${String(d).padStart(2,'0')}`,tx=S.transactions.filter(t=>t.date===date),inc=tx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0),exp=tx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0),net=inc-exp,bills=(S.subscriptions||[]).filter(s=>s.due===date),recurring=(S.recurring||[]).filter(r=>r.next===date);htmlCal+=`<div class="cal-day ${net>0?'pos':net<0?'neg':''}" onclick="showCalendarDay('${date}')"><div class="dnum">${d}</div><div>${net?fmt(net):''}</div>${bills.length?`<div>📌 ${bills.length} sub</div>`:''}${recurring.length?`<div>🔁 ${recurring.length} recur</div>`:''}</div>`;}
  htmlCal+='</div>';document.getElementById('financeCalendar').innerHTML=htmlCal;
}
function showCalendarDay(date){const tx=S.transactions.filter(t=>t.date===date),subs=(S.subscriptions||[]).filter(s=>s.due===date),recurring=(S.recurring||[]).filter(r=>r.next===date);document.getElementById('calendarDayDetails').innerHTML=`<div class="card" style="background:var(--bg);box-shadow:none;"><b>${date}</b><div style="margin-top:8px;">${tx.map(t=>`<div class="txi"><div class="txi-info"><div class="txi-name">${esc(t.desc||t.cat)}</div><div class="txi-cat">${esc(t.cat)} · ${esc(t.wallet)}</div></div><div class="txi-amt ${t.type==='income'?'ain':'aout'}">${t.type==='income'?'+':'-'}${fmt(t.amount)}</div></div>`).join('')||'<p class="calc-note">No transactions.</p>'}${subs.map(s=>`<div class="warn" style="margin-top:6px;">📌 Upcoming sub: ${esc(s.name)} · ${fmt(subMonthlyCost(s))}/mo</div>`).join('')}${recurring.map(r=>`<div class="info" style="margin-top:6px;">🔁 Recurring: ${esc(r.name)} · ${fmt(r.amount)} · ${esc(r.wallet)}</div>`).join('')}</div></div>`;}


// ─── SCENARIOS / DEBT / GOALS ─────────────────────
function populateWhatIfCats(){const el=document.getElementById('whatCat');if(!el)return;el.innerHTML=getExpCats().map(c=>`<option value="${esc(c)}">${ce(c)} ${esc(c)}</option>`).join('');}
function runWhatIf(){
  const cat=safeSelect('whatCat',''),pct=numVal('whatPct',30)/100;
  const threeMonthsAgo=new Date();threeMonthsAgo.setMonth(threeMonthsAgo.getMonth()-3);const threeMonthsAgoStr=threeMonthsAgo.toISOString().slice(0,10);  const last=S.transactions.filter(t=>t.type==='expense'&&t.cat===cat&&t.date>=threeMonthsAgoStr);
  const avg=last.reduce((s,t)=>s+t.amount,0)/Math.max(1,Math.min(3,new Set(last.map(t=>t.date.slice(0,7))).size||1));
  const mo=avg*pct;
  document.getElementById('whatIfResult').innerHTML=`<div class="pres"><div class="prow"><span>Estimated monthly extra savings</span><span>${fmt(mo)}</span></div><div class="prow"><span>12 months</span><span>${fmt(mo*12)}</span></div><div class="prow"><span>24 months</span><span>${fmt(mo*24)}</span></div><div class="prow"><span>36 months</span><span>${fmt(mo*36)}</span></div></div>`;
}
function runDebtPayoff(){
  let debts=S.loans.filter(l=>l.dir==='owe'&&outstanding(l)>0).map(l=>({name:l.name,balance:outstanding(l),rate:+l.rate||0,min:+l.monthly||0}));
  if(!debts.length){document.getElementById('debtPayoffResult').innerHTML='<div class="empty"><p>No debts to model.</p></div>';return;}
  const extra=numVal('debtExtra',0),strategy=safeSelect('debtStrategy','snowball');
  debts.sort((a,b)=>strategy==='snowball'?a.balance-b.balance:b.rate-a.rate);
  let month=0,totalInterest=0,rows=[],guard=0;
  while(debts.some(d=>d.balance>0)&&guard++<360){
    month++;let payPool=extra;
    debts.forEach(d=>{if(d.balance<=0)return;const interest=d.balance*(d.rate/100/12);d.balance+=interest;totalInterest+=interest;const minPay=Math.min(d.balance,d.min||0);d.balance-=minPay;});
    for(const d of debts){if(d.balance>0){const p=Math.min(d.balance,payPool);d.balance-=p;payPool-=p;if(payPool<=0)break;}}
    rows.push({month,remaining:debts.reduce((s,d)=>s+Math.max(0,d.balance),0),focus:(debts.find(d=>d.balance>0)||{}).name||'Paid off'});
    if(month>1&&rows[rows.length-1].remaining>=rows[rows.length-2].remaining&&extra===0&&!debts.some(d=>d.min>0))break;
  }
  document.getElementById('debtPayoffResult').innerHTML=`<div class="pres"><div class="prow"><span>Strategy</span><span>${strategy}</span></div><div class="prow"><span>Estimated payoff time</span><span>${month} months</span></div><div class="prow"><span>Estimated interest during payoff</span><span>${fmt(totalInterest)}</span></div></div><div style="overflow-x:auto;margin-top:10px;"><table class="xt"><thead><tr><th>Month</th><th>Focus</th><th>Remaining</th></tr></thead><tbody>${rows.slice(0,36).map(r=>`<tr><td>${r.month}</td><td>${esc(r.focus)}</td><td>${fmt(r.remaining)}</td></tr>`).join('')}</tbody></table></div>`;
}
function saveSavingsRateGoal(){S.savingsRateTarget=numVal('savingsRateTarget',20);persist();renderSavingsRateGoal();toast('Savings rate target saved.');}
function currentSavingsRate(){const tx=selectedDashTxns?selectedDashTxns():S.transactions.filter(t=>t.date.startsWith(currentMonth));const inc=tx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0),exp=tx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);return inc?((inc-exp)/inc*100):0;}
function renderSavingsRateGoal(){
  const t=S.savingsRateTarget||20,rate=currentSavingsRate(),pct=Math.max(0,Math.min(100,rate/t*100));
  const inp=document.getElementById('savingsRateTarget');if(inp&&!inp.value)inp.value=t;
  const bar=document.getElementById('savingsRateMeter'),lbl=document.getElementById('savingsRateMeterLabel');if(bar)bar.style.width=pct+'%';if(lbl)lbl.textContent=`${rate.toFixed(1)}% / ${t}%`;
  const streak=document.getElementById('streakWidget');
  if(streak){
    const s=calcSavingsStreak(t);
    const col=s>=6?'var(--mint)':s>=3?'var(--ye)':'var(--txm)';
    const bg=s>=6?'var(--mint-p)':s>=3?'var(--ye-l)':'var(--bg)';
    const border=s>=6?'var(--mint-l)':s>=3?'var(--ye)':'var(--bdr)';
    streak.style.background=bg;streak.style.borderColor=border;streak.style.color=col;
    streak.textContent=s===0?'🏁 No streak yet — start saving to your target this month!'
      :s===1?`🌱 1 month meeting your ${t}% target — keep it up!`
      :`🔥 ${s}-month streak meeting your ${t}% savings target!`;
  }
}
function calcSavingsStreak(target){let streak=0;for(let i=0;i<12;i++){const m=monthKey(-i),tx=S.transactions.filter(t=>t.date.startsWith(m)),inc=tx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0),exp=tx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0),r=inc?((inc-exp)/inc*100):0;if(inc&&r>=target)streak++;else break;}return streak;}

// ─── ONBOARDING ───────────────────────────────────
function maybeStartOnboarding(){
  if(localStorage.getItem('nuellieOnboarded')==='1')return;
  const hasData=(S.transactions||[]).length||(S.investments||[]).length||(S.assets||[]).length||Object.values(S.wallets||{}).some(v=>+v);
  if(hasData){localStorage.setItem('nuellieOnboarded','1');return;}
  openModal('Welcome to '+appDisplayName()+appDisplayName(),`<div class="fgg"><div class="fg"><label>Bank Balance</label><input type="number" id="obBank" placeholder="0.00"></div><div class="fg"><label>MoMo Balance</label><input type="number" id="obMomo" placeholder="0.00"></div><div class="fg"><label>Cash Balance</label><input type="number" id="obCash" placeholder="0.00"></div><div class="fg"><label>Main Income Category</label><select id="obInc">${getIncCats().map(c=>`<option>${esc(c)}</option>`).join('')}</select></div><div class="fg"><label>Savings Rate Target (%)</label><input type="number" id="obSave" value="20"></div></div>`,[`<button title="Skip" aria-label="Skip" class="btn btn-out" onclick="finishOnboarding(false)">Skip</button>`,`<button title="Finish Setup" aria-label="Finish Setup" class="btn btn-pk" onclick="finishOnboarding(true)">Finish Setup</button>`]);
}
function finishOnboarding(save){if(save){S.wallets.bank=numVal('obBank',0);S.wallets.mtn=numVal('obMomo',0);S.wallets.cash=numVal('obCash',0);S.primaryIncomeCat=safeSelect('obInc','Salary / Monthly Pay');S.savingsRateTarget=numVal('obSave',20);persist();}localStorage.setItem('nuellieOnboarded','1');closeM('editModal');refreshAll();}

// ─── IMPORT MERGE ─────────────────────────────────
function txnKey(t){return [t.type,t.date,Math.round((+t.amount||0)*100),String(t.desc||'').trim().toLowerCase(),t.wallet,t.cat].join('|');}
function mergeImportedState(imported){
  let added=0;const existing=new Set((S.transactions||[]).map(txnKey));
  (imported.transactions||[]).forEach(t=>{const k=txnKey(t);if(!existing.has(k)){S.transactions.push(cleanRecord(t));existing.add(k);added++;}});
  ['investments','assets','loans','subscriptions','goals','templates','transfers','bills','recurring'].forEach(k=>{if(Array.isArray(imported[k]))S[k]=[...(S[k]||[]),...imported[k].map(cleanRecord)];});
  return added;
}


function setupPWAHooks(){
  if('serviceWorker' in navigator && !window.__nuellieSWRegistered){
    window.__nuellieSWRegistered=true;
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
}


function populateMonthYearSelects(){
  const now=new Date(),cy=now.getFullYear();
  const fillYears=(id,val=cy)=>{const el=document.getElementById(id);if(!el)return;el.innerHTML=Array.from({length:7},(_,i)=>cy-3+i).map(y=>`<option value="${y}" ${y==val?'selected':''}>${y}</option>`).join('');};
  const fillMonths=(id,val=String(now.getMonth()+1).padStart(2,'0'))=>{const el=document.getElementById(id);if(!el)return;el.innerHTML=Array.from({length:12},(_,i)=>{const v=String(i+1).padStart(2,'0');return `<option value="${v}" ${v===val?'selected':''}>${new Date(2000,i,1).toLocaleDateString('en-GB',{month:'long'})}</option>`}).join('');};
  const [y,m]=(currentMonth||new Date().toISOString().slice(0,7)).split('-');
  fillYears('calYear',y);fillMonths('calMonthSel',m);
  fillYears('budgetYear',y);fillMonths('budgetMonth',m);
  const cal=document.getElementById('calMonth');if(cal)cal.value=`${y}-${m}`;
}
function setCalendarMonthFromSelects(){const y=document.getElementById('calYear')?.value||new Date().getFullYear(),m=document.getElementById('calMonthSel')?.value||String(new Date().getMonth()+1).padStart(2,'0');const cal=document.getElementById('calMonth');if(cal)cal.value=`${y}-${m}`;renderFinanceCalendar();}
function setBudgetPeriod(){const y=document.getElementById('budgetYear')?.value||new Date().getFullYear(),m=document.getElementById('budgetMonth')?.value||String(new Date().getMonth()+1).padStart(2,'0');S.budgetPeriod=`${y}-${m}`;persist();toast(`Budget period set to ${S.budgetPeriod}`);}
function populateTemplateCatList(){
  const fill=(typeId,catId)=>{const el=document.getElementById(catId);if(!el)return;const type=document.getElementById(typeId)?.value||'expense';el.innerHTML=(type==='income'?getIncCats():getExpCats()).map(c=>`<option value="${esc(c)}">${ce(c)} ${esc(c)}</option>`).join('');};
  fill('tplType','tplCat');fill('tplTypeExp','tplCatExp');
}
document.addEventListener('change',e=>{if(e.target&&e.target.id==='tplType')populateTemplateCatList();});
function initSidebarResize(){
  const r=document.getElementById('sidebarResizer');if(!r||r.dataset.ready)return;r.dataset.ready='1';
  let drag=false;
  r.addEventListener('mousedown',()=>drag=true);r.addEventListener('touchstart',()=>drag=true,{passive:true});
  document.addEventListener('mouseup',()=>drag=false);document.addEventListener('touchend',()=>drag=false);
  const resizeAt=x=>{const w=Math.max(195,Math.min(360,x));document.documentElement.style.setProperty('--sb-w',w+'px');localStorage.setItem('nuellieSidebarW',w);};document.addEventListener('mousemove',e=>{if(!drag)return;resizeAt(e.clientX);});document.addEventListener('touchmove',e=>{if(!drag||!e.touches[0])return;resizeAt(e.touches[0].clientX);},{passive:true});
  const saved=localStorage.getItem('nuellieSidebarW');if(saved)document.documentElement.style.setProperty('--sb-w',saved+'px');
}


function renderPageFlashcards(){
  const inc=S.transactions.filter(t=>t.type==='income'),exp=S.transactions.filter(t=>t.type==='expense');
  const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};
  set('incTotalAll',fmt(inc.reduce((s,t)=>s+(+t.amount||0),0)));
  set('incTotalMonth',fmt(inc.filter(t=>t.date&&t.date.startsWith(currentMonth)).reduce((s,t)=>s+(+t.amount||0),0)));
  set('incEntryCount',inc.length);
  set('expTotalAll',fmt(exp.reduce((s,t)=>s+(+t.amount||0),0)));
  set('expTotalMonth',fmt(exp.filter(t=>t.date&&t.date.startsWith(currentMonth)).reduce((s,t)=>s+(+t.amount||0),0)));
  set('expEntryCount',exp.length);
}

function refreshAll(){buildMoDropdowns();
  logNWSnapshot();
  buildMonthBar();renderDashStats();renderNWB();updNW();updWalTot();renderRecent();
  renderTxnLists();
  buildCatSelects();buildBCatList();renderBudgProg();renderInv();renderIntLog();renderAssets();renderLoans();loadWals();renderSavedPj();
  renderOvChart();renderNWTrend();renderDashBudgetSnap();renderPies();renderWalChart();renderSmartSignals();renderTransfers();renderGoals();renderRecurring();renderBills();renderPlannerSummary();renderLifestyleInflation();renderBudgetRecommendations();renderSubs();renderSavingsRateGoal();populateWhatIfCats();buildBulkRows();buildQuickAddCats();populateMonthYearSelects();populateTemplateCatList();renderFinanceCalendar();scheduleDailyReminder();initSidebarResize();
  buildTxnFilterOptions();
  if(document.getElementById('page-analysis').classList.contains('active'))runAnalysis();
  updateAppName();updUndoUI();
}


function findActivePageId(){return [...document.querySelectorAll('.page')].find(p=>p.classList.contains('active'))?.id||'';}
function hasUsableValue(ids){return ids.some(id=>{const el=document.getElementById(id);return el&&String(el.value||'').trim()!=='';});}
function handleEnterSave(e){
  if(e.key!=='Enter'||e.shiftKey||e.ctrlKey||e.metaKey||e.altKey)return;
  const id=e.target&&e.target.id,tag=(e.target&&e.target.tagName||'').toLowerCase();
  if(tag==='textarea'&&!['smsText','quickSheetSmsText','quickSmsText'].includes(id))return;
  if(id==='globalSearch'){e.preventDefault();runSearch();return;}
  if(id==='advQ'){e.preventDefault();runAdvisor();return;}
  if(id==='smsText'){e.preventDefault();parseSMS();return;}
  if(id==='quickSheetSmsText'){e.preventDefault();parseSheetSMS();return;}
  if(id==='usdRI'){e.preventDefault();setManualRate();return;}
  const walletIds=['wi-bank','wi-mtn','wi-voda','wi-cash','wi-sav','wi-usd','wi-oth'];
  if(walletIds.includes(id)){e.preventDefault();e.target.blur();return;}
  const page=findActivePageId(),activeTool=document.querySelector('.tool-detail.active')?.id||'';
  if(page==='page-income'&&hasUsableValue(['iAmt','iDesc','iNotes'])){e.preventDefault();addTxn('income');return;}
  if(page==='page-expenses'&&hasUsableValue(['eAmt','eDesc','eNotes'])){e.preventDefault();addTxn('expense');return;}
  if(page==='page-subscriptions'&&hasUsableValue(['subName','subAmt'])){e.preventDefault();addSub();return;}
  if(page==='page-wallets'&&(hasUsableValue(['trAmt','trNote'])||['trFrom','trTo','trAmt','trDate','trNote'].includes(id))){e.preventDefault();addTransfer();return;}
  if(page==='page-assets'||page==='page-investments'){
    if(['astN','astV','astNt','astD','astCat'].includes(id)||hasUsableValue(['astN','astV'])){e.preventDefault();addAsset();return;}
    if(hasUsableValue(['invN','invA','invR','invF','invNt'])){e.preventDefault();addInv();return;}
  }
  if(page==='page-loans'&&hasUsableValue(['lnN','lnA','lnNt','lnP','lnFees'])){e.preventDefault();addLoan();return;}
  if(page==='page-budget'&&hasUsableValue(['bAmt'])){e.preventDefault();saveCatBudget();return;}
  if(page==='page-goals'&&hasUsableValue(['gName','gTarget','gCurrent','gMonthly','savingsRateTarget'])){e.preventDefault();if(id==='savingsRateTarget')saveSavingsRateGoal();else addGoal();return;}
  if(page==='page-planner'){if(hasUsableValue(['rName','rAmt','rCat'])){e.preventDefault();addRecurring();return;}if(hasUsableValue(['billName','billAmt'])){e.preventDefault();addBill();return;}}
  if(page==='page-projections'){if(id&&id.startsWith('la')||hasUsableValue(['laN','laA','laR','laFees'])){e.preventDefault();runLoan();return;}if(id&&id.startsWith('pj')||hasUsableValue(['pjN','pjP','pjR','pjF','pjFees'])){e.preventDefault();runProj();return;}}
  if(page==='page-settings'){e.preventDefault();const active=document.querySelector('#page-settings .setting-detail.active')?.id||'';if(active==='setting-profile')saveProfileSettings();else if(active==='setting-wallets')saveWalletSettings();else if(active==='setting-reminder')saveDailyReminder();else if(active==='setting-categories')stgAddCat();else if(active==='setting-pin')updatePinFromSettings();else if(active==='setting-autolock')saveAutoLock();else if(active==='setting-display')saveDisplayPrefs();return;}
  if(page==='page-tools'){
    if(activeTool==='tool-sms'&&hasUsableValue(['smsText'])){e.preventDefault();parseSMS();return;}
    if(activeTool==='tool-csv'){e.preventDefault();importCSVRows();return;}
    if(activeTool==='tool-tbill'){e.preventDefault();calcTBill();return;}
    if(activeTool==='tool-paye'){e.preventDefault();calcPAYE();return;}
    if(activeTool==='tool-retire'){e.preventDefault();calcRetirement();return;}
    if(activeTool==='tool-momo'){e.preventDefault();calcMoMo();return;}
    if(activeTool==='tool-report'){e.preventDefault();generateMonthlyReport();return;}
    if(activeTool==='tool-reminder'){e.preventDefault();saveDailyReminder();return;}
    if(activeTool==='tool-lifestyle'){e.preventDefault();calcLifestyleInflation&&calcLifestyleInflation();return;}
    if(activeTool==='tool-budgetrec'){e.preventDefault();renderBudgetRecommendations&&renderBudgetRecommendations();return;}
  }
  if(document.getElementById('quickSheet')?.classList.contains('open')&&hasUsableValue(['qaAmt','qaDesc'])){e.preventDefault();saveQuickSheet();return;}
}
document.addEventListener('keydown',handleEnterSave);

// ─── PWA SHARE TARGET HANDLER ─────────────────────────────────────
(function handleShareTarget(){
  try{
    const params=new URL(window.location.href).searchParams;
    const text=params.get('sms_text')||params.get('text')||'';
    const title=params.get('sms_title')||params.get('title')||'';
    const url=params.get('sms_url')||params.get('url')||'';
    const combined=[title,text,url].filter(Boolean).join(' ').trim();
    if(!combined)return;
    try{sessionStorage.setItem('nuellieSharedSmsText',combined);}catch(e){}
    const inject=()=>{
      const box=document.getElementById('smsText');
      if(!box)return;
      box.value=combined;
      showPage('tools');
      showTool('sms');
      setTimeout(()=>{
        parseSMS();
        toast('📲 Shared SMS opened in parser. Review it, then click Prefill.');
      },400);
    };
    if(document.readyState==='complete')inject();else window.addEventListener('load',inject,{once:true});
  }catch(e){}
})();

// ─── DEEP LINK HANDLER ────────────────────────────────────────────
(function handleDeepLinks(){
  try{
    const p=new URL(window.location.href).searchParams;
    const tool=p.get('tool'),action=p.get('action');
    if(tool){window.addEventListener('load',()=>{showPage('tools');showTool(tool);},{once:true});}
    if(action==='quickadd'){window.addEventListener('load',()=>{setTimeout(openQuickSheet,600);},{once:true});}
  }catch(e){}
})();

// ─── PWA SHARE TARGET ACTIVATION ──────────────────────────────────
function activatePWAShareTarget(){
  const statusEl=document.getElementById('pwaShareStatus');
  const setStatus=(msg,ok=true)=>{if(statusEl){statusEl.style.display='';statusEl.style.color=ok?'var(--gr)':'var(--red)';statusEl.textContent=msg;}};
  if(!('serviceWorker' in navigator)){setStatus('⚠️ Service workers are not supported in this browser. Use Chrome on Android for Share to App.',false);return;}
  navigator.serviceWorker.register('./sw.js').then(()=>{
    setStatus('✅ Share Target is ready. Install the app, then use Share from an SMS to send text into the parser.');
    toast('✅ Share Target ready.');
  }).catch(err=>{
    setStatus('⚠️ Could not register the service worker: '+err.message,false);
  });
}

// ─── RECEIPT PARSER ───────────────────────────────────────────────
let rpImageBase64='';
let rpImageType='image/jpeg';
let rpParsedItems=[];

function rpHandleDrop(e){e.preventDefault();document.getElementById('rpUploadZone').classList.remove('rp-drag');const file=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(file)rpLoadFile(file);}
function rpFileSelected(e){const file=e.target&&e.target.files&&e.target.files[0];if(file)rpLoadFile(file);}
function rpLoadFile(file){
  if(!file)return;
  rpImageType=file.type||'image/jpeg';
  window.rpImageType=rpImageType;
  window.rpFileObject=file;
  const nameEl=document.getElementById('rpFileName');if(nameEl)nameEl.textContent='Selected: '+file.name;
  const statusText=document.getElementById('rpStatusText');if(statusText)statusText.textContent='Receipt loaded. Tap Parse Receipt to extract items.';
  const reader=new FileReader();
  reader.onload=ev=>{
    const result=String(ev.target.result||'');
    rpImageBase64=result.includes(',')?result.split(',')[1]:result;
    window.rpImageBase64=rpImageBase64;
    window.rpParsedItems=rpParsedItems;
    const preview=document.getElementById('rpPreviewImg'),wrap=document.getElementById('rpPreviewWrap'),zone=document.getElementById('rpUploadZone');
    if(preview){
      if((file.type||'').includes('pdf')){preview.removeAttribute('src');preview.alt='PDF receipt selected: '+file.name;preview.style.display='none';}
      else {preview.src=result;preview.style.display='';}
    }
    if(wrap){wrap.style.display='block';wrap.classList.add('anim-pop');}
    if(zone)zone.style.display='none';
    const rd=document.getElementById('rpDate');if(rd&&!rd.value)rd.value=today();
    const review=document.getElementById('rpReviewWrap');if(review)review.style.display='none';
    const msg=document.getElementById('rpSaveMsg');if(msg)msg.style.display='none';
    toast('Receipt file uploaded. Tap Parse Receipt.');
  };
  reader.readAsDataURL(file);
}
function rpReset(){
  rpImageBase64='';rpParsedItems=[];window.rpImageBase64='';window.rpParsedItems=[];window.rpFileObject=null;
  const zone=document.getElementById('rpUploadZone');if(zone){zone.style.display='';zone.classList.remove('rp-drag');}
  ['rpPreviewWrap','rpStatus','rpReviewWrap','rpSaveMsg'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
  const fi=document.getElementById('rpFile');if(fi)fi.value='';
  const fn=document.getElementById('rpFileName');if(fn)fn.textContent='';
  const m=document.getElementById('rpMerchant');if(m)m.textContent='';
  const tb=document.getElementById('rpItemsTable');if(tb)tb.innerHTML='';
}
async function parseReceiptWithAI(){
  if(!rpImageBase64){toast('Please upload a receipt image first.');return;}
  const statusBox=document.getElementById('rpStatus'),statusText=document.getElementById('rpStatusText');
  const reviewWrap=document.getElementById('rpReviewWrap'),previewWrap=document.getElementById('rpPreviewWrap');
  if(statusBox)statusBox.style.display='block';
  if(previewWrap)previewWrap.style.display='none';
  if(reviewWrap)reviewWrap.style.display='none';
  const msgs=['📸 Uploading receipt…','🔍 Reading line items…','🏷️ Matching categories…','💰 Checking amounts…','✨ Almost done…'];
  let mi=0;const ticker=setInterval(()=>{if(statusText)statusText.textContent=msgs[Math.min(mi++,msgs.length-1)];},1100);
  const cats=getExpCats().map(c=>esc(c)).join(', ');
  const prompt='You are an expert receipt parser for a personal finance app in Ghana (West Africa).\n\nCONTEXT:\n- Currency is most likely GHS (Ghana Cedis) unless clearly marked USD\n- Common stores: Shoprite, Game, Melcom, MaxMart, Koala, pharmacies, markets, chop bars, fuel stations (GOIL, Total, Shell)\n- Prices may show as "12.50", "GH\u20b512.50", "GHC 12.50", or "1250" (pesewas) — use context\n- OCR noise: O and 0 may be swapped, l and 1 may be swapped, S and 5 may be swapped\n- Items with qty x unitprice format: use the line total as amount\n\nReturn ONLY a valid JSON object (no markdown, no backticks, no explanation):\n{"merchant":"Store name or Unknown","date":"YYYY-MM-DD or empty","currency":"GHS","items":[{"name":"Clean item name","qty":1,"unitPrice":12.50,"amount":12.50,"category":"exact category name"}],"subtotal":0,"tax":0,"total":0,"confidence":"high or medium or low","notes":"any issues"}\n\nCATEGORY RULES - use ONLY these exact names: '+cats+'\n\nMapping:\n- Supermarket food/drink/provisions → Food / Groceries\n- Restaurant/cafe/takeaway/chop bar → Eating Out\n- Chemist/pharmacy/drugs/medicine → Medical / Pharmacy\n- Fuel/petrol/diesel → Transport\n- Electricity/water/internet/phone top-up/data → Utilities\n- Soap/detergent/tissue/cleaning → Household\n- Clothing/shoes/fabric/accessories → Clothing & Accessories\n- Cosmetics/skincare/makeup/perfume → Skincare & Makeup\n- Hair/salon/barbering/nails → Hair & Beauty\n- School fees/books/stationery → Education\n- Airtime/mobile data/bundles → Airtime & Mobile Data\n\nRULES:\n1. Include ALL line items — even small ones\n2. EXCLUDE: VAT lines, subtotal lines, total lines, cash tendered, change given\n3. Clean item names: remove PLU codes, expand abbreviations\n4. For qty x unitprice lines, fill qty and unitPrice fields\n5. Amounts must be numbers not strings\n6. If total on receipt does not match sum of items, note it';
  try{
    const response=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:2000,messages:[{role:'user',content:[{type:'image',source:{type:'base64',media_type:rpImageType,data:rpImageBase64}},{type:'text',text:prompt}]}]})
    });
    clearInterval(ticker);
    if(!response.ok){
      const err=await response.json().catch(()=>({}));
      if(statusText)statusText.textContent='AI unavailable — using local OCR…';
      setTimeout(()=>{if(typeof window.parseReceiptAI==='function')window.parseReceiptAI();},200);
      return;
    }
    const data=await response.json();
    const raw=(data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
    const clean=raw.replace(/```json[\s\S]*?```/g,function(m){return m.slice(7,-3);}).replace(/```/g,'').trim();
    let parsed=null;
    try{parsed=JSON.parse(clean);}catch(pe){const jm=clean.match(/\{[\s\S]*\}/);if(jm)try{parsed=JSON.parse(jm[0]);}catch(pe2){parsed=null;}}
    if(!parsed||!Array.isArray(parsed.items)||!parsed.items.length){
      if(statusText)statusText.textContent='AI returned no items — using local OCR…';
      setTimeout(()=>{if(typeof window.parseReceiptAI==='function')window.parseReceiptAI();},200);
      return;
    }
    if(statusBox)statusBox.style.display='none';
    const allCats=getExpCats();
    rpParsedItems=(parsed.items||[]).map(function(item,i){
      const amt=parseFloat(item.amount)||0;
      const cat=allCats.includes(item.category)?item.category:categoryForItem(item.name||'');
      return {id:Date.now()+i,name:String(item.name||'Item').trim(),amount:amt,category:cat,qty:item.qty||1,unitPrice:item.unitPrice||amt,keep:true};
    }).filter(function(it){return it.amount>0||it.name.length>1;});
    if(!rpParsedItems.length)rpParsedItems=[{id:Date.now(),name:'Receipt item',amount:0,category:'Miscellaneous',keep:true}];
    const rd=document.getElementById('rpDate');if(rd&&parsed.date&&/^\d{4}-\d{2}-\d{2}$/.test(parsed.date))rd.value=parsed.date;
    const m=document.getElementById('rpMerchant');if(m)m.textContent=parsed.merchant&&parsed.merchant!=='Unknown'?'— '+parsed.merchant:'';
    if(parsed.confidence==='low'||parsed.notes){
      let nb=document.getElementById('rpNotes');
      if(!nb){nb=document.createElement('div');nb.id='rpNotes';const rw=document.getElementById('rpReviewWrap');if(rw)rw.insertBefore(nb,rw.firstChild);}
      nb.className='warn';nb.style.marginBottom='8px';
      nb.textContent='\u26A0\uFE0F '+(parsed.notes||'Some items may need review — please check amounts carefully.');
    } else {const nb=document.getElementById('rpNotes');if(nb)nb.remove();}
    window.rpParsedItems=rpParsedItems;
    renderRPItems();
    if(reviewWrap){reviewWrap.style.display='block';reviewWrap.classList.add('anim-slide-up');}
    if(statusText)statusText.textContent='Found '+rpParsedItems.length+' item(s). Confidence: '+(parsed.confidence||'medium')+'. Review before saving.';
    setTimeout(function(){if(statusBox)statusBox.style.display='none';},4000);
  }catch(e){
    clearInterval(ticker);
    if(statusBox)statusBox.style.display='none';
    if(typeof window.parseReceiptAI==='function'){
      if(statusText)statusText.textContent='Falling back to local OCR…';
      if(statusBox)statusBox.style.display='block';
      setTimeout(function(){window.parseReceiptAI();},200);
    } else {
      toast('\u26A0\uFE0F Could not parse receipt. Try a clearer photo.');
      if(previewWrap)previewWrap.style.display='block';
    }
  }
}
function renderRPItems(){
  const el=document.getElementById('rpItemsTable');if(!el)return;
  const cats=getExpCats();
  const rows=rpParsedItems.filter(it=>it.keep!==false);
  if(!rows.length){el.innerHTML='<div class="empty"><p>No items found. Try a clearer photo or add items manually.</p></div>';return;}
  const total=rows.reduce((a,b)=>a+(+b.amount||0),0);
  el.innerHTML=rows.map(function(it,i){return '<div class="rp-item-row" style="animation-delay:'+i*0.045+'s" data-rpid="'+it.id+'"><div style="flex:1;min-width:0;"><input value="'+esc(it.name||'')+'" placeholder="Item name" style="width:100%;margin-bottom:4px;" oninput="rpUpdateName('+it.id+',this.value)">'+(it.qty&&it.qty>1?'<div style="font-size:10px;color:var(--txm);margin-bottom:3px;">'+it.qty+' x GH\u20b5'+Number(it.unitPrice||0).toFixed(2)+'</div>':'')+'<div class="rp-item-cat"><select onchange="rpUpdateCat('+it.id+',this.value)">'+cats.map(function(c){return '<option value="'+esc(c)+'"'+(c===it.category?' selected':'')+'>'+((typeof ce==='function')?ce(c):'')+' '+esc(c)+'</option>';}).join('')+'</select></div></div><div class="rp-item-amt"><input type="number" step="0.01" value="'+(+it.amount||0).toFixed(2)+'" style="width:80px;text-align:right;" oninput="rpUpdateAmount('+it.id+',this.value)"></div><button class="rp-item-del" onclick="rpRemoveItem('+it.id+')" title="Remove item">\u2715</button></div>';}).join('')+'<div style="margin-top:8px;padding-top:8px;border-top:2px solid var(--bdr);display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;"><button class="btn btn-out btn-sm" onclick="rpAddManualItem()" title="Add item manually">\uFF0B Add Item</button><div class="rp-total-row" style="margin:0;"><span>Total ('+rows.length+' item'+(rows.length!==1?'s':'')+')</span><span>GH\u20b5 '+total.toFixed(2)+'</span></div></div>';
}
function rpUpdateCat(id,cat){const item=rpParsedItems.find(function(x){return x.id===id;});if(item){item.category=cat;item._catOverridden=true;}}
function rpUpdateName(id,val){const item=rpParsedItems.find(function(x){return x.id===id;});if(item){item.name=val;if(!item._catOverridden)item.category=categoryForItem(val);}}
function rpUpdateAmount(id,val){const item=rpParsedItems.find(function(x){return x.id===id;});if(item)item.amount=+val||0;}
function rpRemoveItem(id){const item=rpParsedItems.find(function(x){return x.id===id;});if(item){item.keep=false;renderRPItems();}}
function rpAddManualItem(){rpParsedItems.push({id:Date.now()+Math.random(),name:'',amount:0,category:'Miscellaneous',keep:true});renderRPItems();}
function rpSaveAll(){
  const items=rpParsedItems.filter(it=>it.keep!==false&&(+it.amount||0)>0);
  if(!items.length){toast('No items to save.');return;}
  const wallet=document.getElementById('rpWallet')?.value||'Cash';
  const date=document.getElementById('rpDate')?.value||today();
  const merchant=(document.getElementById('rpMerchant')?.textContent||'').replace('— ','').trim()||'Receipt';
  snap('Receipt parser import');
  items.forEach(item=>{S.transactions.push(cleanRecord({id:Date.now()+Math.random(),type:'expense',desc:item.name+(merchant&&merchant!=='Unknown'?' ('+merchant+')':''),amount:+item.amount||0,cat:item.category||'Shopping',wallet,date,notes:'Imported via Receipt Parser'}));});
  persist();refreshAll();
  const msg=document.getElementById('rpSaveMsg');if(msg){msg.style.display='';msg.textContent=`✅ ${items.length} item${items.length!==1?'s':''} saved to transactions!`;}
  toast(`✅ ${items.length} receipt item${items.length!==1?'s':''} recorded!`);
}

document.getElementById('iDate').value=today();
document.getElementById('eDate').value=today();
document.getElementById('invS').value=today();
document.getElementById('exFrom').value=new Date(new Date().getFullYear(),0,1).toISOString().slice(0,10);const rm=document.getElementById('reportMonth');if(rm)rm.value=currentMonth;const cm=document.getElementById('calMonth');if(cm)cm.value=currentMonth;const rt=document.getElementById('reminderTime');if(rt)rt.value=S.reminderTime||'20:00';
document.getElementById('exTo').value=today();
document.getElementById('aFrom').value=today();
document.getElementById('aTo').value=today();
document.getElementById('trDate').value=today();
document.getElementById('subDue').value=today();
document.getElementById('rNext').value=today();
document.getElementById('billDue').value=today();
usdRate=S.usdRate||15.5;
fetchRate();
refreshAll();
setTimeout(()=>autoCredit(),900);

// ─── PIN LOCK ────────────────────────────────────────────────────
let pinEntry='';
const PIN_KEY='nuelliePin';
function pinKey(d){if(pinEntry.length>=4)return;pinEntry+=d;updatePinDots();if(pinEntry.length===4)setTimeout(pinSubmit,120);}
function pinClear(){pinEntry=pinEntry.slice(0,-1);updatePinDots();}
function updatePinDots(){document.querySelectorAll('.pin-dot').forEach((dot,i)=>{dot.classList.toggle('filled',i<pinEntry.length);});}
function pinSubmit(){
  const saved=localStorage.getItem(PIN_KEY);
  const err=document.getElementById('pinErr');
  if(!saved){
    if(err)err.textContent='Set a new PIN below first, or click Unlock without PIN.';
    pinEntry='';
    updatePinDots();
    return;
  }
  if(pinEntry===saved){dismissPin();}
  else{
    if(err)err.textContent='Incorrect PIN. Try again.';
    pinEntry='';
    updatePinDots();
  }
}
function dismissPin(){document.getElementById('pinOverlay').style.display='none';resetInactivityTimer&&resetInactivityTimer();}
function skipPin(){if(localStorage.getItem(PIN_KEY)){toast('PIN required to unlock.');return;}dismissPin();}
function saveNewPin(){
  const a=document.getElementById('pinNewA').value,b=document.getElementById('pinNewB').value;
  if(!a){
    const err=document.getElementById('pinErr');
    if(err)err.textContent='Enter a 4-digit PIN or click Unlock without PIN.';
    return;
  }
  if(!/^\d{4}$/.test(a)){alert('PIN must be exactly 4 digits.');return;}
  if(a!==b){alert('PINs do not match.');return;}
  localStorage.setItem(PIN_KEY,a);
  dismissPin();
  toast('🔒 PIN set! You will be prompted next time.');
}
function updatePinFromSettings(){const old=(document.getElementById('settingPinOld')||{}).value||'',a=(document.getElementById('settingPinA')||{}).value||'',b=(document.getElementById('settingPinB')||{}).value||'',saved=localStorage.getItem(PIN_KEY)||'';if(saved&&old!==saved){toast('Enter the current saved PIN first.');return;}if(!a){toast('Enter a new PIN first.');return;}if(!/^\d{4}$/.test(a)){toast('PIN must be exactly 4 digits.');return;}if(a!==b){toast('PINs do not match.');return;}localStorage.setItem(PIN_KEY,a);['settingPinOld','settingPinA','settingPinB'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});const m=document.getElementById('pinSettingMsg');if(m){m.style.display='';m.textContent='✅ PIN updated successfully!';m.style.color='var(--gr)';}toast('🔒 PIN updated!');}
function removePinFromSettings(){const old=(document.getElementById('settingPinOld')||{}).value||'',saved=localStorage.getItem(PIN_KEY)||'';if(saved&&old!==saved){toast('Enter the current saved PIN first.');return;}localStorage.removeItem(PIN_KEY);const m=document.getElementById('pinSettingMsg');if(m){m.style.display='';m.textContent='🔓 PIN removed. App will open without lock.';m.style.color='var(--txm)';}toast('🔓 PIN removed.');}
function showPinSettings(){const el=document.getElementById('pinSettingsArea');if(el)el.style.display=el.style.display==='none'?'':'none';}
(function initPin(){const pinOv=document.getElementById('pinOverlay');if(!pinOv)return;const saved=localStorage.getItem(PIN_KEY);if(saved){pinOv.style.display='flex';}else{pinOv.querySelector('#pinSetupBox').style.display='block';pinOv.style.display='flex';}})();

// ─── SIDEBAR TOGGLE ─────────────────────────────────────────────
function openSidebar(){const s=document.getElementById('sidebar'),o=document.getElementById('sideOverlay');if(s)s.classList.add('open');if(o)o.classList.add('open');}
function closeSidebar(){const s=document.getElementById('sidebar'),o=document.getElementById('sideOverlay');if(s)s.classList.remove('open');if(o)o.classList.remove('open');}

// ─── DARK MODE ───────────────────────────────────────────────────
function toggleDark(){const isDark=document.body.classList.toggle('dark-mode');localStorage.setItem('nuelleDark',isDark?'1':'0');const btn=document.getElementById('darkToggle');if(btn)btn.textContent=isDark?'☀️ On':'🌙 Off';const th=document.getElementById('settingTheme');if(th)th.value=isDark?'dark':'light';}
(function(){if(localStorage.getItem('nuelleDark')==='1'){document.body.classList.add('dark-mode');const btn=document.getElementById('darkToggle');if(btn)btn.textContent='☀️ On';}})();
(function(){try{const S2=JSON.parse(localStorage.getItem('nuellieData')||'{}');if(S2.fontSize&&S2.fontSize!==14)document.documentElement.style.fontSize=S2.fontSize+'px';}catch(e){}})();

// ─── MONTH DROPDOWNS ─────────────────────────────────────────────
function buildMoDropdowns(){
  const ySel=document.getElementById('moYearSel'),mSel=document.getElementById('moMonthSel');
  if(!ySel||!mSel)return;
  const curY=parseInt(currentMonth.slice(0,4)),curM=parseInt(currentMonth.slice(5,7));
  const now=new Date(),curYear=now.getFullYear();
  if(!ySel.innerHTML){
    const years=[];for(let y=curYear;y>=curYear-5;y--)years.push(y);
    ySel.innerHTML=years.map(y=>`<option value="${y}">${y}</option>`).join('');
    const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
    mSel.innerHTML=MONTHS.map((m,i)=>`<option value="${String(i+1).padStart(2,'0')}">${m}</option>`).join('');
  }
  ySel.value=String(curY);
  mSel.value=String(curM).padStart(2,'0');
  const dp=document.getElementById('dashPeriodSel'); if(dp)dp.value=dashPeriod||'month';
}
function applyMoSel(){
  const y=document.getElementById('moYearSel').value,m=document.getElementById('moMonthSel').value;
  if(!y||!m)return;
  currentMonth=`${y}-${m}`;
  const dp=document.getElementById('dashPeriodSel'); if(dp&&dp.value==='month')dashPeriod='month';
  renderDashStats();renderPies();renderRecent();renderBudgProg();renderSmartSignals();
}
function resetToCurrentMonth(){
  currentMonth=new Date().toISOString().slice(0,7);
  buildMoDropdowns();renderDashStats();renderPies();renderRecent();renderBudgProg();renderSmartSignals();
}

// ─── SUBSCRIPTIONS ───────────────────────────────────────────────

function subMonthly(s){
  const amount=+s.amount||0, f=s.frequency||s.freq||'monthly';
  if(f==='weekly')return amount*4.333;
  if(f==='quarterly')return amount/3;
  if(f==='biannual')return amount/6;
  if(f==='annual')return amount/12;
  return amount;
}

function updateSubCurLabel(){
  const cur=(document.getElementById('subCur')||{}).value||'GHS';
  const lbl=document.getElementById('subAmtLbl');
  const inp=document.getElementById('subAmt');
  if(lbl)lbl.textContent=cur==='USD'?'Amount ($ USD)':'Amount (GH₵)';
  if(inp)inp.placeholder=cur==='USD'?'$ 0.00':'0.00';
}
function addSub(){
  const name=safeText('subName'),raw=numVal('subAmt',0),cur=safeSelect('subCur','GHS');
  if(!name||!raw){toast('Enter subscription name and amount.');return;}
  const amount=cur==='USD'?raw*(usdRate||15.5):raw;
  snap('Add subscription');
  S.subscriptions.push(cleanRecord({id:Date.now()+Math.random(),name,amount,rawAmount:raw,currency:cur,frequency:safeSelect('subFreq','monthly'),due:safeSelect('subDue',today()),wallet:safeSelect('subWal','Bank Account'),cat:safeSelect('subCat','Other'),useFrequency:safeSelect('subUse','Weekly'),notes:safeText('subNotes'),active:true,lastRun:''}));
  persist();refreshAll();['subName','subAmt','subNotes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});toast('✅ Subscription saved!');
}

function subUsesPerMonth(s){return s.useFrequency==='Daily'?30:s.useFrequency==='Weekly'?4:s.useFrequency==='Monthly'?1:s.useFrequency==='Rarely'?0.25:4;}
function subValueText(s){const cost=subMonthly(s),uses=subUsesPerMonth(s),cpu=uses?cost/uses:cost;return {cpu,txt:`${fmt(cpu)} per use`,low:cpu>100||s.useFrequency==='Rarely'};}

function renderSubs(){
  const subs=S.subscriptions||[],active=subs.filter(s=>s.active!==false);
  const mo=active.reduce((t,s)=>t+subMonthly(s),0);
  ['sub-count','sub-mo','sub-yr','sub-next'].forEach(id=>{const el=document.getElementById(id);if(!el)return;});
  const ec=document.getElementById('sub-count'),em=document.getElementById('sub-mo'),ey=document.getElementById('sub-yr'),en=document.getElementById('sub-next');
  if(ec)ec.textContent=active.length;if(em)em.textContent=fmt(mo);if(ey)ey.textContent=fmt(mo*12);
  const upcoming=subs.filter(s=>s.active!==false&&s.due).sort((a,b)=>(a.due||'').localeCompare(b.due||''));
  if(en)en.textContent=upcoming.length?upcoming[0].name+' ('+upcoming[0].due+')':'—';
  const el=document.getElementById('subList');if(!el)return;
  if(!subs.length){el.innerHTML='<div class="empty"><div class="big">📺</div><p>No subscriptions yet.</p></div>';return;}
  const FL={monthly:'Monthly',weekly:'Weekly',quarterly:'Quarterly',biannual:'Bi-annual',annual:'Annual'};
  el.innerHTML=subs.map(s=>`<div class="txi" style="${s.active===false?'opacity:.55':''}">
    <div class="txico" style="background:var(--pu-p)">📺</div>
    <div class="txi-info">
      <div class="txi-name">${esc(s.name)} <span class="badge ${s.active===false?'bre':'bpu'}">${s.active===false?'Paused':'Active'}</span></div>
      <div class="txi-cat">${FL[s.frequency||s.freq]||s.frequency||s.freq} · Due: ${s.due||'—'} · ${esc(s.wallet)}</div>
      ${s.notes?`<div class="txi-cat">${esc(s.notes)}</div>`:''}${(()=>{const v=subValueText(s);return `<div class="txi-cat ${v.low?'low-value':''}" style="display:inline-block;padding:3px 7px;border-radius:8px;border:1px solid var(--bdr);margin-top:3px;">${esc(s.useFrequency||'Weekly')} use · ${v.txt}${v.low?' · Low-value alert':''}</div>`})()}
    </div>
    <div style="text-align:right;flex-shrink:0;">
      <div class="txi-amt aout">${s.currency==='USD'?'$'+(s.rawAmount||s.amtRaw||s.amount).toFixed(2)+' ':''}${s.currency==='USD'?'('+fmt(s.amount)+')':fmt(s.amount)}</div>
      <div class="txi-date">${fmt(subMonthly(s))}/mo</div>
    </div>
    <div style="display:flex;gap:3px;flex-shrink:0;">
      <button class="btn btn-out btn-xs" onclick="toggleSub(${s.id})" title="${s.active===false?'Resume':'Pause'}">${s.active===false?'▶':'⏸'}</button>
      <button title="✕" aria-label="✕" class="btn btn-re btn-xs" onclick="delSub(${s.id})">✕</button>
    </div>
  </div>`).join('');
}

// ─── CLEAR ALL TRANSACTIONS ──────────────────────────────────────
function clearAllTxns(type){
  const label=type==='income'?'income entries':'expense entries';
  const count=S.transactions.filter(t=>t.type===type).length;
  if(!count){toast('No '+label+' to clear.');return;}
  confirmDlg('⚠️ Clear All '+(type==='income'?'Income':'Expenses'),
    `This will delete all <b>${count}</b> ${label}. You can undo this with ↩.<br><br>Are you sure?`,
    '🗑 Yes, clear all','btn-re',
    ()=>{snap('Clear all '+type);S.transactions=S.transactions.filter(t=>t.type!==type);persist();refreshAll();toast('Cleared.');},
    'Cancel',()=>{}
  );
}



function clearAllSubscriptions(){
  if(!(S.subscriptions||[]).length){toast('No subscriptions to clear.');return;}
  confirmDlg('⚠️ Clear All Subscriptions',
    `This will remove all <b>${S.subscriptions.length}</b> subscriptions.<br><br>Are you sure?`,
    '🗑 Yes, clear all','btn-re',
    ()=>{
      snap('Clear subscriptions');
      S.subscriptions=[];
      persist();refreshAll();
      toast('Subscriptions cleared.');
    },
    'Cancel',()=>{}
  );
}

// ─── BACKUP / EXPORT ─────────────────────────────────────────────
function exportBackup(){
  const ts=new Date().toISOString().replace(/[:.]/g,'-');
  const data=JSON.stringify(S,null,2);
  const blob=new Blob([data],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`DrNuelliesMoneyDiary_Backup_${ts}.json`;
  a.click();
  toast('✅ Backup exported!');
}
function importBackup(event,merge=false){
  const file=event.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const imported=JSON.parse(e.target.result);
      snap(merge?'Merge backup':'Import backup');
      if(merge){const added=mergeImportedState(imported);persist();refreshAll();toast(`✅ Merge complete. Added ${added} new transactions.`);}
      else{Object.assign(S,imported);persist();refreshAll();toast('✅ Backup imported successfully!');}
    }catch(err){toast('❌ Invalid backup file.');}
  };
  reader.readAsText(file);
  event.target.value='';
}


let inactivityTimer=null;
function lockAppNow(){const saved=localStorage.getItem(PIN_KEY);if(saved){pinEntry='';const pinDots=document.querySelectorAll('.pin-dot');if(pinDots.length)updatePinDots();const ov=document.getElementById('pinOverlay');if(ov)ov.style.display='flex';}}
function resetInactivityTimer(){
  clearTimeout(inactivityTimer);
  const mins=S&&S.autoLockMins>0?S.autoLockMins:10;
  if(localStorage.getItem('nuelliePIN'))inactivityTimer=setTimeout(lockAppNow,mins*60*1000);
}
['click','keydown','touchstart','mousemove','scroll'].forEach(ev=>document.addEventListener(ev,resetInactivityTimer,{passive:true}));
document.addEventListener('click',function(e){
  const btn=e.target.closest('button.btn,button.template-chip,button.tool-btn,button.nav-link');
  if(!btn||btn.disabled||btn.dataset.noGuard)return;
  btn.disabled=true;
  setTimeout(()=>{btn.disabled=false;},600);
},true);

document.addEventListener('click',e=>{const box=document.getElementById('searchResults'),wrap=document.querySelector('.tb-srch-wrap');if(box&&wrap&&!wrap.contains(e.target))box.style.display='none';});

document.addEventListener('click',function(e){
  const nav=e.target.closest&&e.target.closest('.nav-link[data-page]');
  if(!nav)return;
  e.preventDefault();
  if(typeof showPage==='function')showPage(nav.dataset.page);
});

