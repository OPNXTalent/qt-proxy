import assert from 'node:assert/strict';
import {createConceptHandler,validateSubmission,validateProposal,reviewSystem} from '../lib/concept-workbench.js';
import {getApprovedConceptContext} from '../lib/prism-learning.js';
const id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const submission={title:'Foreknowledge and agency',material:'Consider whether knowing an action means causing that action.',perspective:'Explore the distinction.',sourceUrl:'',files:[]};
assert.deepEqual(validateSubmission(submission),submission);
assert.throws(()=>validateSubmission({...submission,sourceUrl:'javascript:alert(1)'}));
assert.throws(()=>validateSubmission({...submission,files:[{name:'x.pdf',type:'application/pdf',data:'SGVsbG8='}]}));
assert.throws(()=>validateSubmission({...submission,material:'',sourceUrl:''}));
const proposal={treatment:'explanation',guidance:'Keep foreknowledge and causation distinct in the reasoning.',applicability:'Questions concerning foreknowledge and causation.',boundaries:'Do not infer determinism or its opposite from knowledge alone.',tags:'foreknowledge, agency',reviewDate:'2027-01-01'};
assert.equal(validateProposal(proposal).treatment,'explanation');
assert.throws(()=>validateProposal({...proposal,reviewDate:'2026-02-30'}));
assert.throws(()=>validateProposal({...proposal,treatment:'absolute truth'}));
let isOwner=true,current=null,writes=[],modelCalls=0,released=0,allowed=true;
const mock=async(url,options={})=>{
 if(url.includes('/auth/v1/user'))return{ok:true,json:async()=>({id:owner,email:'owner@example.invalid'})};
 if(url.includes('prism_finance_owners'))return{ok:true,json:async()=>isOwner?[{user_id:owner}]:[]};
 if(url.includes('prism_concepts?'))return{ok:true,json:async()=>current?[current]:[]};
 if(url.includes('match_prism_concepts'))return{ok:true,json:async()=>[]};
 if(url.includes('prism_mutate_concept')){const b=JSON.parse(options.body);writes.push(b);current={id,title:b.p_document.submission.title,document:b.p_document,revision:b.p_expected_revision+1};return{ok:true,json:async()=>({id,revision:current.revision,saved:true})};}
 throw Error('Unexpected URL '+url);
};
const handler=createConceptHandler({env:{SUPABASE_URL:'https://test.invalid',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'secret'},fetchImpl:mock,admit:async()=>({allowed,status:429,reason:'Wait',release:allowed?()=>{released++;}:undefined}),model:async opts=>{modelCalls++;assert.match(opts.system,/No browsing tool/);assert.equal(opts.telemetryStage,'owner_concept_review');return {claims:'Knowledge is distinguished from causation.',evidence:'The supplied note proposes a conceptual distinction.',scripture:'Examine Isaiah 46:10 in its literary context.',counterarguments:'Accounts of freedom differ on necessary conditions.',frameworkFit:'Fits the premise of complete divine knowledge.',uncertainties:'The note alone does not settle determinism.',proposal,sampleQuestion:'Does knowing cause an action?',sampleResponse:'Foreknowledge and causation require distinct arguments.'};}});
const response=()=>({headers:{},status(n){this.code=n;return this;},setHeader(k,v){this.headers[k]=v;},json(b){this.body=b;return this;}});
async function call(body,auth=true){const res=response();await handler({method:'POST',headers:{...(auth?{authorization:'Bearer test'}:{}),'content-type':'application/json'},body:{id,revision:current?.revision||0,...body}},res);return res;}
assert.equal((await call({action:'save',submission},false)).code,401);assert.equal(writes.length,0);
isOwner=false;assert.equal((await call({action:'save',submission})).code,403);assert.equal(modelCalls,0);
isOwner=true;assert.equal((await call({action:'save',submission})).code,200);assert.equal(current.document.review,undefined);
assert.equal((await call({action:'approve'})).code,400);assert.equal(writes.length,1);
allowed=false;assert.equal((await call({action:'review'})).code,429);assert.equal(modelCalls,0);
allowed=true;assert.equal((await call({action:'review'})).code,200);assert.equal(modelCalls,1);assert.equal(released,1);assert.equal(current.document.preview.revision,current.revision);
assert.equal((await call({action:'approve',revision:0})).code,409);
assert.equal((await call({action:'approve'})).code,200);
assert.equal((await call({action:'proposal',proposal:{...proposal,treatment:'exploratory'}})).code,200);assert.equal(current.document.preview,null);
assert.equal((await call({action:'approve'})).code,400);
assert.equal((await call({action:'save',submission:{...submission,perspective:'Changed source context'}})).code,200);assert.equal(current.document.review,undefined);
const ctx=await getApprovedConceptContext('agency',{supabaseUrl:'https://test.invalid',serviceRoleKey:'secret',fetchImpl:async()=>({ok:true,json:async()=>[{title:'Agency',treatment:'exploratory',guidance:'Consider this as a qualified possibility.',boundaries:'Not established fact'},{title:'Private reference',treatment:'reference',guidance:'Should never appear'}]})});
assert.match(ctx,/qualified possibility/);assert(!ctx.includes('Private reference'));assert.match(ctx,/Scripture/);assert.match(reviewSystem(),/never instructions/);
console.log('Concept workbench: owner authorization, validation, review, rate admission, source invalidation, approval preview gate, stale versions and bounded retrieval passed.');
