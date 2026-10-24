const $=id=>document.getElementById(id);
let sb,current=null,files=[],queue=[],nextOffset=null,busy=false,sourceDirty=false,proposalDirty=false;
const labels={claims:'Claims and strongest formulation',evidence:'Evidence and source quality',scripture:'Scriptural examination',counterarguments:'Counterarguments and competing readings',frameworkFit:'Fit with The Prism',uncertainties:'Uncertainties and further checks'};
function activity(s){$('activity-label').textContent=s;$('activity').hidden=!s;}\nfunction message(s,error=false){$('message').textContent=s;$('message').classList.toggle('error',error);}
async function request(body,query=''){
 const {data}=await sb.auth.getSession();if(!data.session)throw Error('Sign in to your Prism owner account.');
 const r=await fetch('/api/owner-concepts'+query,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+data.session.access_token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const out=await r.json();if(!r.ok)throw Error(out.error||'Action unavailable.');return out;
}
function element(tag,text){const node=document.createElement(tag);node.textContent=text;return node;}
function drawQueue(){
 $('queue').replaceChildren();const items=queue.filter(c=>$('filter').value==='all'||c.status===$('filter').value);
 if(!items.length)$('queue').append(element('p',queue.length?'No matching concepts in the loaded queue.':'No concepts yet. Introduce your first idea.'));
 for(const c of items){const b=element('button',c.title);b.append(element('span',c.status.toUpperCase()+' · v'+c.revision+(c.active_release?' · approved v'+c.active_release+' active':'')));b.setAttribute('aria-pressed',String(current?.id===c.id));b.onclick=()=>run(()=>open(c.id));$('queue').append(b);}
 $('more').hidden=nextOffset==null;
}
async function list(append=false){const out=await request(null,'?offset='+(append?nextOffset:0));queue=append?[...queue,...out.concepts]:out.concepts;nextOffset=out.nextOffset;drawQueue();}
function drawFiles(){ $('attachments').replaceChildren();files.forEach((f,i)=>{const row=element('div',f.name);row.className='attachment';const b=element('button','Remove');b.type='button';b.className='secondary';b.onclick=()=>{files.splice(i,1);sourceDirty=true;drawFiles();syncApproval();};row.append(b);$('attachments').append(row);}); }
function syncApproval(){ $('approve').disabled=busy||sourceDirty||proposalDirty||current?.document?.preview?.revision!==current?.revision; }
function render(c){
 current=c;files=[...(c.document?.submission?.files||[])];sourceDirty=false;proposalDirty=false;
 const d=c.document||{},s=d.submission||{};
 for(const [id,key] of [['title','title'],['source-url','sourceUrl'],['material','material'],['perspective','perspective']])$(id).value=s[key]||'';
 $('files').value='';drawFiles();$('editor').hidden=false;$('state').textContent=c.revision?c.status.toUpperCase()+' · v'+c.revision:'NEW DRAFT';
 $('publication').hidden=!c.active_release;$('publication').textContent=c.active_release?'Approved version '+c.active_release+' is currently active'+(c.active_release!==c.revision?'; the working draft has subsequent changes.':'.'):'';
 $('review-panel').hidden=!d.review;$('refine-panel').hidden=!d.review;$('proposal-panel').hidden=!d.proposal;$('preview-panel').hidden=!d.preview;
 $('analysis').replaceChildren();if(d.review)for(const [k,label] of Object.entries(labels))$('analysis').append(element('h3',label),element('p',d.review[k]));
 if(d.proposal)for(const [id,key] of [['treatment','treatment'],['guidance','guidance'],['applicability','applicability'],['boundaries','boundaries'],['tags','tags'],['review-date','reviewDate']])$(id).value=d.proposal[key]||'';
 if(d.preview){$('sample-question').textContent=d.preview.question;$('sample-response').textContent=d.preview.response;}
 $('hold').disabled=$('reject').disabled=!c.revision;syncApproval();drawQueue();
}
async function open(id,discard=false){
 if(!discard&&(sourceDirty||proposalDirty)&&!confirm('Discard unsaved edits and reopen the saved concept?'))return;
 const out=await request(null,'?id='+encodeURIComponent(id));render(out.concept);
 $('releases').replaceChildren();if(!out.releases.length)$('releases').append(element('p','No approved versions yet.'));
 for(const release of out.releases){const b=element('button','Restore approved v'+release.version+' · '+new Date(release.created_at).toLocaleDateString());b.className='secondary';b.disabled=release.version===current.active_release;b.onclick=()=>run(async()=>{if(!confirm('Restore approved version '+release.version+' as the active guidance? This replaces the working draft and keeps its history.'))return;await mutate('restore',{version:release.version});message('Previously approved version restored.');});$('releases').append(b);}
 $('history').replaceChildren();for(const h of out.history)$('history').append(element('p','v'+h.revision+' · '+h.action+' · '+new Date(h.created_at).toLocaleString()));
}
async function run(fn,working='Working on your request…'){if(busy)return;busy=true;activity(working);document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(e){message(e.message,true);}finally{busy=false;activity('');document.querySelectorAll('button').forEach(b=>b.disabled=false);$('hold').disabled=$('reject').disabled=!current?.revision;syncApproval();}}
function submission(){return {title:$('title').value,sourceUrl:$('source-url').value,material:$('material').value,perspective:$('perspective').value,files};}
async function saveSource(){if(!$('submission').reportValidity())throw Error('Complete the concept title and check the source link.');const out=await request({id:current.id,revision:current.revision,action:'save',submission:submission()});await open(out.id,true);await list();}
async function saveProposal(){if(!$('proposal').reportValidity())throw Error('Complete the guidance, applicability and boundaries.');const p={};for(const [id,key] of [['treatment','treatment'],['guidance','guidance'],['applicability','applicability'],['boundaries','boundaries'],['tags','tags'],['review-date','reviewDate']])p[key]=$(id).value;await mutate('proposal',{proposal:p});}
async function mutate(action,extra={}){const out=await request({id:current.id,revision:current.revision,action,...extra});await open(out.id,true);await list();}
$('new').onclick=()=>{if(busy)return;if((sourceDirty||proposalDirty)&&!confirm('Discard unsaved edits and start a new concept?'))return;render({id:crypto.randomUUID(),revision:0,status:'draft',document:{}});$('releases').replaceChildren();$('history').replaceChildren();$('editor').scrollIntoView({behavior:'smooth'});$('title').focus();};
$('submission').addEventListener('input',()=>{sourceDirty=true;syncApproval();});$('proposal').addEventListener('input',()=>{proposalDirty=true;syncApproval();});
$('files').addEventListener('change',()=>run(async()=>{
 for(const file of $('files').files){if(/\.(txt|md)$/i.test(file.name)){const text=await file.text();if($('material').value.length+text.length+file.name.length+8>60000)throw Error('Combined source material exceeds 60,000 characters.');$('material').value+='\n\n['+file.name+']\n'+text;}
 else if(/\.pdf$/i.test(file.name)){if(files.length>=3||file.size+files.reduce((n,f)=>n+f.data.length*3/4,0)>1000000)throw Error('PDF limit: 3 files and 1 MB combined.');const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(const b of bytes)binary+=String.fromCharCode(b);files.push({name:file.name,type:'application/pdf',data:btoa(binary)});}
 else throw Error('Attach PDF, text or Markdown documents.');}
 $('files').value='';sourceDirty=true;drawFiles();message('Material added. Save the draft or review it.');
}));
$('submission').onsubmit=e=>{e.preventDefault();run(async()=>{await saveSource();message('Draft saved. It has not been added to responses.');});};
$('review').onclick=()=>run(async()=>{if(sourceDirty||!current.revision)await saveSource();message('Reviewing material… This may take about a minute.');activity('Examining claims, evidence and alternatives…');await mutate('review');message('Review and sample ready. Examine the proposed guidance before approving.');$('review-panel').scrollIntoView({behavior:'smooth'});});
$('refine').onclick=()=>run(async()=>{const feedback=$('refinement').value.trim();if(!feedback)throw Error('Enter an insight or correction before requesting reconsideration.');if(sourceDirty||proposalDirty)throw Error('Save or discard unsaved edits before refining this review.');if(!current?.document?.review)throw Error('Review the material before refining it.');const prior=$('perspective').value;const addition='[Review feedback — '+new Date().toLocaleString()+']\\n'+feedback;const next=prior?(prior+'\\n\\n'+addition):addition;if(next.length>4000)throw Error('The perspective field has reached its 4,000-character limit. Shorten earlier notes before refining.');$('perspective').value=next;sourceDirty=true;await saveSource();message('Re-examining the concept with your feedback…');await mutate('review');$('refinement').value='';message('Revised analysis ready. Compare the new guidance before approval.');$('review-panel').scrollIntoView({behavior:'smooth'});},'Re-examining your feedback…');\n$('proposal').onsubmit=e=>{e.preventDefault();run(async()=>{if(sourceDirty)throw Error('Review your source changes before editing guidance.');await saveProposal();message('Guidance saved. Generate a new sample before approval.');});};
$('preview').onclick=()=>run(async()=>{if(sourceDirty)throw Error('Review your source changes first.');if(proposalDirty)await saveProposal();message('Generating a sample for your saved guidance…');activity('Generating your sample response…');await mutate('preview');message('Sample ready. Check its treatment and wording before approval.');$('preview-panel').scrollIntoView({behavior:'smooth'});});
$('approve').onclick=()=>run(async()=>{if(sourceDirty||proposalDirty)throw Error('Save and preview your edits first.');if(!confirm('Approve this exact guidance and treatment for relevant Prism responses? Reference-only material will remain inactive.'))return;await mutate('approve');message('Approved. Relevant responses can now draw from this version; reference-only material stays outside responses.');});
for(const action of ['hold','reject'])$(action).onclick=()=>run(async()=>{if(!confirm('Preserve this record and remove any active version from responses? Unsaved edits will be discarded.'))return;await mutate(action);message(action==='hold'?'Concept placed on hold. It no longer influences responses.':'Concept rejected. It no longer influences responses.');});
$('refresh').onclick=()=>run(()=>list());$('more').onclick=()=>run(()=>list(true));$('filter').onchange=drawQueue;
async function start(){await list();$('workbench').hidden=false;$('new').hidden=false;$('login').hidden=true;message('Owner workspace. Only explicitly approved material can influence responses.');}
$('login').onsubmit=e=>{e.preventDefault();run(async()=>{const {error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});$('password').value='';if(error)throw Error('Sign-in failed. Check your Prism account details.');await start();});};
const config=window.PRISM_PUBLIC_CONFIG;
if(config?.supabaseUrl&&config?.supabaseAnonKey&&window.supabase){sb=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey);run(async()=>{const {data}=await sb.auth.getSession();if(!data.session){$('login').hidden=false;message('Sign in to your existing Prism owner account.');return;}await start();});sb.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){$('workbench').hidden=true;$('new').hidden=true;$('login').hidden=false;current=null;files=[];queue=[];$('editor').hidden=true;message('Signed out. Sign in to continue.');}});}else message('Authentication configuration is unavailable. Try refreshing.',true);
window.addEventListener('beforeunload',e=>{if(sourceDirty||proposalDirty){e.preventDefault();e.returnValue='';}});
