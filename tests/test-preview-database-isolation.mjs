import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { assertPreviewDatabaseIsolation, publicClientConfig } from '../lib/preview-database-isolation.js';
import handler from '../api/client-config.js';

const ref = 'abcdefghijklmnopqrst';
const token = role => ['header', Buffer.from(JSON.stringify({ ref, role })).toString('base64url'), 'signature'].join('.');
const isolated = { VERCEL_ENV: 'preview', PRISM_PREVIEW_SUPABASE_REF: ref,
  SUPABASE_URL: `https://${ref}.supabase.co`, SUPABASE_ANON_KEY: token('anon'),
  SUPABASE_SERVICE_ROLE_KEY: token('service_role') };

test('preview rejects shared production database, missing confirmation and mixed keys', () => {
  assert.doesNotThrow(() => assertPreviewDatabaseIsolation(isolated));
  for (const env of [
    { ...isolated, PRISM_PREVIEW_SUPABASE_REF: undefined },
    { ...isolated, PRISM_PREVIEW_SUPABASE_REF: 'fgngixbhpilefmyyeldr', SUPABASE_URL: 'https://fgngixbhpilefmyyeldr.supabase.co' },
    { ...isolated, SUPABASE_URL: 'https://fgngixbhpilefmyyeldr.supabase.co' },
    { ...isolated, SUPABASE_ANON_KEY: token('service_role') },
    { ...isolated, SUPABASE_SERVICE_ROLE_KEY: token('anon') },
    { ...isolated, SUPABASE_SERVICE_ROLE_KEY: 'missing' },
  ]) assert.throws(() => assertPreviewDatabaseIsolation(env), /PRISM_PREVIEW_DATABASE/);
  assert.doesNotThrow(() => assertPreviewDatabaseIsolation({ VERCEL_ENV: 'production' }));
});

test('public config allowlist never includes privileged or provider credentials', () => {
  const config = publicClientConfig({ ...isolated, OPENAI_API_KEY: 'secret-openai', ANTHROPIC_API_KEY: 'secret-anthropic' });
  assert.deepEqual(config, { supabaseUrl: isolated.SUPABASE_URL, supabaseAnonKey: token('anon') });
  assert.doesNotMatch(JSON.stringify(config), /secret-openai|secret-anthropic|service_role/);
  assert.throws(() => publicClientConfig({ ...isolated, VERCEL_ENV: 'production', SUPABASE_ANON_KEY: token('service_role') }), /PUBLIC_DATABASE_KEY_INVALID/);
});

test('unisolated preview route imports stop before any fetch can run', () => {
  const run = spawnSync(process.execPath, ['--input-type=module', '-e',
    "global.fetch=()=>{throw Error('NETWORK_CALLED')}; await import('./api/interpret.js');"],
  { cwd: new URL('..', import.meta.url), env: { ...process.env, VERCEL_ENV: 'preview', PRISM_PREVIEW_SUPABASE_REF: '' }, encoding: 'utf8' });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /PRISM_PREVIEW_DATABASE_NOT_ISOLATED/);
  assert.doesNotMatch(run.stderr, /NETWORK_CALLED/);
});

test('configuration endpoint is uncached JavaScript and rejects missing setup', () => {
  const keys = [...Object.keys(isolated), 'OPENAI_API_KEY'];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  function request(method) {
    const response = { headers: {}, setHeader(k,v) {this.headers[k]=v;},
      status(code) {this.statusCode=code;return this;}, end(body) {this.body=body;} };
    handler({method},response); return response;
  }
  try {
    Object.assign(process.env, isolated);
    const good = request('GET');
    assert.equal(good.statusCode, 200);
    assert.equal(good.headers['Cache-Control'], 'no-store');
    const context = {window:{}}; vm.runInNewContext(good.body,context);
    assert.equal(context.window.PRISM_PUBLIC_CONFIG.supabaseUrl, isolated.SUPABASE_URL);
    assert.equal(request('POST').statusCode, 405);
    delete process.env.PRISM_PREVIEW_SUPABASE_REF;
    const bad = request('GET');
    assert.equal(bad.statusCode, 503);
    assert.equal(bad.body, 'window.PRISM_PUBLIC_CONFIG = null;');
  } finally {
    for (const [key,value] of Object.entries(saved)) {
      if(value===undefined)delete process.env[key];else process.env[key]=value;
    }
  }
});

test('browser auth/realtime reads deployed config and scripts still parse', () => {
  for (const name of ['qt.html','qt-gateway.html','reset-password.html','highlights.js','realtime.js']) {
    const source = fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
    assert.doesNotMatch(source, /fgngixbhpilefmyyeldr\.supabase\.co|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/);
    assert.match(source, /window\.PRISM_PUBLIC_CONFIG\.supabaseUrl/);
    if(source.includes('<head>')) {
      assert.match(source, /<head>\s*<script src="\/api\/client-config"><\/script>/);
      for(const match of source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
        if(!match[2].trim() || /application\/ld\+json/.test(match[1]))continue;
        new vm.Script(match[2],{filename:name});
      }
    } else new vm.Script(source,{filename:name});
  }
  for(const filename of fs.readdirSync(new URL('../api/',import.meta.url)).filter(n=>n.endsWith('.js'))) {
    const source=fs.readFileSync(new URL('../api/'+filename,import.meta.url),'utf8');
    if(/process\.env\.SUPABASE_(URL|ANON_KEY|SERVICE_ROLE_KEY)/.test(source))
      assert.match(source, /import '\.\.\/lib\/require-preview-isolation\.js'/,filename);
  }
  const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  assert.match(sw, /url\.pathname\.startsWith\('\/api\/'\)/);
});
