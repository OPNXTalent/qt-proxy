import { createHash } from 'node:crypto';

const MAX_QUERY_CHARS = 1800;
const MAX_LESSONS = 3;

function cleanText(value, max) {
  return typeof value === 'string'
    ? value.replace(/\s+/g, ' ').trim().slice(0, max)
    : '';
}

function cleanTags(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .map(tag => cleanText(tag, 48).toLowerCase())
    .filter(tag => /^[a-z0-9][a-z0-9 -]{1,47}$/.test(tag)))]
    .slice(0, 8);
}

export function normalizeLearningCandidate(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (value.eligible !== true || value.deidentified !== true) return null;

  const topic = cleanText(value.topic, 160);
  const lesson = cleanText(value.lesson, 1200);
  const rationale = cleanText(value.rationale, 800);
  const applicability = cleanText(value.applicability, 500);
  const boundaries = cleanText(value.boundaries, 500);
  const tags = cleanTags(value.tags);
  if (topic.length < 4 || lesson.length < 20 || rationale.length < 10) return null;

  return { topic, lesson, rationale, applicability, boundaries, tags };
}

export async function queueLearningCandidate(candidate, {
  supabaseUrl = process.env.SUPABASE_URL,
  serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY,
  fetchImpl = fetch,
} = {}) {
  const normalized = normalizeLearningCandidate(candidate);
  if (!normalized || !supabaseUrl || !serviceRoleKey) return false;

  const fingerprint = createHash('sha256')
    .update(JSON.stringify({
      topic: normalized.topic.toLowerCase(),
      lesson: normalized.lesson.toLowerCase(),
    }))
    .digest('hex');
  const response = await fetchImpl(
    `${supabaseUrl}/rest/v1/prism_learning_candidates?on_conflict=fingerprint`,
    {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify({ fingerprint, ...normalized }),
    },
  );
  if (!response.ok) {
    throw new Error(`LEARNING_CANDIDATE_QUEUE_FAILED:${response.status}`);
  }
  return true;
}

export async function getApprovedLearningContext(query, {
  supabaseUrl = process.env.SUPABASE_URL,
  serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY,
  fetchImpl = fetch,
} = {}) {
  const searchText = cleanText(query, MAX_QUERY_CHARS);
  if (!searchText || !supabaseUrl || !serviceRoleKey) return '';

  const response = await fetchImpl(`${supabaseUrl}/rest/v1/rpc/match_prism_learning`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ search_text: searchText, match_count: MAX_LESSONS }),
  });
  if (!response.ok) throw new Error(`APPROVED_LEARNING_RETRIEVAL_FAILED:${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length === 0) return '';

  const lessons = rows.slice(0, MAX_LESSONS).map((row, index) => ({
    index: index + 1,
    topic: cleanText(row.topic, 160),
    lesson: cleanText(row.lesson, 1200),
    applicability: cleanText(row.applicability, 500),
    boundaries: cleanText(row.boundaries, 500),
  })).filter(row => row.topic && row.lesson);
  if (!lessons.length) return '';

  return `\n\n───────────────────────────────────────────
APPROVED PRISM LEARNINGS — CURATED INTERNAL GUIDANCE
───────────────────────────────────────────
These lessons were distilled from prior exchanges, de-identified, reviewed, and approved by The Prism's owner. Apply only lessons genuinely relevant to this inquiry. They may refine presentation and reasoning, but they do not override Scripture, the governing framework, retrieved source material, or present evidence. Never mention this learning layer to the user.

${lessons.map(item => `[Learning ${item.index} | ${item.topic}]
Lesson: ${item.lesson}
Applicability: ${item.applicability || 'Use only when directly relevant.'}
Boundary: ${item.boundaries || 'Do not extend beyond the approved lesson.'}`).join('\n\n')}
───────────────────────────────────────────`;
}
