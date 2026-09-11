from __future__ import annotations

import re
import subprocess
from pathlib import Path

BRANCH = "release/prism-commercial-integration-20260911"
SOURCE = "origin/agent/persistent-inquiry-runtime"


def run(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, text=True, check=check)


run("git", "fetch", "origin", "main", "agent/persistent-inquiry-runtime")
run("git", "config", "user.name", "github-actions[bot]")
run("git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")

# Merge first; expected conflicts are resolved explicitly below.
run("git", "merge", "--no-ff", "--no-commit", SOURCE, check=False)

for file in (
    "api/interpret.js",
    "lib/prompt-modules/progressive-inquiry.js",
    "qt.html",
    "tests/test-runtime-constitution-conformance.mjs",
    "vercel.json",
):
    unmerged = subprocess.run(
        ["git", "ls-files", "-u", "--", file],
        text=True,
        capture_output=True,
        check=True,
    ).stdout.strip()
    if unmerged:
        run("git", "checkout", "--theirs", "--", file)
        run("git", "add", file)

# api/interpret.js: preserve the production crisis-continuation acknowledgement.
api_path = Path("api/interpret.js")
api = api_path.read_text(encoding="utf-8")
if "const crisisAcknowledged = req.body?.crisisAcknowledged === true;" not in api:
    old = """  if (detectCrisis(lastUserText)) {
    timing('safety_complete', { outcome: 'crisis_intercept' });
    return res.status(200).json({ crisis: true });
  }
  timing('safety_complete', { outcome: 'clear' });"""
    new = """  const crisisAcknowledged = req.body?.crisisAcknowledged === true;
  if (!crisisAcknowledged && detectCrisis(lastUserText)) {
    timing('safety_complete', { outcome: 'crisis_intercept' });
    return res.status(200).json({ crisis: true });
  }
  timing('safety_complete', { outcome: crisisAcknowledged ? 'crisis_acknowledged' : 'clear' });"""
    if old not in api:
        raise SystemExit("interpret.js crisis block not found in reconstructed runtime")
    api = api.replace(old, new, 1)
    api_path.write_text(api, encoding="utf-8")

# qt.html: preserve production legibility stylesheet and crisis-resume behavior.
qt_path = Path("qt.html")
qt = qt_path.read_text(encoding="utf-8")
if "/prism-ui.css" not in qt:
    anchor = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>'
    if anchor not in qt:
        raise SystemExit("qt.html stylesheet insertion anchor not found")
    qt = qt.replace(anchor, '<link rel="stylesheet" href="/prism-ui.css">\n' + anchor, 1)

if "crisisAcknowledged: options.crisisAcknowledged === true" not in qt:
    old_sig = "async function callProxy(messages, rawQuery, requestId) {"
    new_sig = "async function callProxy(messages, rawQuery, requestId, options) {\n  options = options || {};"
    if old_sig not in qt:
        raise SystemExit("qt.html callProxy signature not found")
    qt = qt.replace(old_sig, new_sig, 1)

    old_payload = """        rawQuery: rawQuery || '',
        debugMode: getTheodicyDebugMode(),
        requestId"""
    new_payload = """        rawQuery: rawQuery || '',
        crisisAcknowledged: options.crisisAcknowledged === true,
        debugMode: getTheodicyDebugMode(),
        requestId"""
    if old_payload not in qt:
        raise SystemExit("qt.html callProxy payload not found")
    qt = qt.replace(old_payload, new_payload, 1)

    crisis_branch = re.compile(
        r"if \(bodyData\.crisis\) \{\s*showCrisisPanel\(\);\s*throw new Error\('CRISIS_DETECTED'\);\s*\}",
        re.M,
    )
    replacement = """if (bodyData.crisis) {
      await showCrisisPanel();
      return callProxy(messages, rawQuery, requestId, { crisisAcknowledged: true });
    }"""
    qt, count = crisis_branch.subn(replacement, qt, count=1)
    if count != 1:
        raise SystemExit(f"expected one crisis response branch, found {count}")

    start_marker = "// ── CRISIS PANEL"
    end_marker = "// ── CHILD ABUSE PANEL"
    start = qt.find(start_marker)
    end = qt.find(end_marker, start)
    if start < 0 or end < 0:
        raise SystemExit("crisis panel section markers not found")
    section = qt[start:end]

    if "var _crisisContinueResolver = null;" not in section:
        section = section.replace(
            "function showCrisisPanel() {",
            "var _crisisContinueResolver = null;\n\nfunction showCrisisPanel() {",
            1,
        )

    scroll_line = "  document.getElementById('resultContent').scrollIntoView({ behavior: 'smooth', block: 'start' });\n}"
    if "return new Promise(function(resolve)" not in section:
        if scroll_line not in section:
            raise SystemExit("showCrisisPanel closing sequence not found")
        section = section.replace(
            scroll_line,
            """  document.getElementById('resultContent').scrollIntoView({ behavior: 'smooth', block: 'start' });

  return new Promise(function(resolve) {
    _crisisContinueResolver = resolve;
  });
}""",
            1,
        )

    if "var continueInquiry = _crisisContinueResolver;" not in section:
        dismiss_pattern = re.compile(r"function dismissCrisisPanel\(\) \{.*?\n\}", re.S)
        match = dismiss_pattern.search(section)
        if not match:
            raise SystemExit("dismissCrisisPanel function not found")
        new_dismiss = """function dismissCrisisPanel() {
  var continueInquiry = _crisisContinueResolver;
  _crisisContinueResolver = null;
  var panel = document.getElementById('crisisPanel');

  var resume = function() {
    if (!continueInquiry) {
      document.getElementById('resultBlock').classList.remove('visible');
      document.getElementById('userInput').focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    document.getElementById('resultBlock').classList.remove('visible');
    document.getElementById('loadingBlock').classList.add('visible');
    document.getElementById('inputSection').style.opacity = '0.45';
    document.getElementById('inputSection').style.pointerEvents = 'none';
    document.getElementById('submitBtn').disabled = true;
    continueInquiry();
  };

  if (panel) {
    panel.style.transition = 'opacity 0.4s ease';
    panel.style.opacity = '0';
    setTimeout(function() {
      if (panel.parentNode) panel.parentNode.removeChild(panel);
      resume();
    }, 400);
  } else {
    resume();
  }
}"""
        section = section[: match.start()] + new_dismiss + section[match.end() :]

    qt = qt[:start] + section + qt[end:]

qt_path.write_text(qt, encoding="utf-8")
run("git", "add", "api/interpret.js", "qt.html")

unmerged = subprocess.run(
    ["git", "ls-files", "-u"], text=True, capture_output=True, check=True
).stdout.strip()
if unmerged:
    raise SystemExit("unresolved merge entries remain:\n" + unmerged)

# Deterministic verification only; no provider calls.
run("git", "diff", "--check")
for file in ("api/interpret.js", "api/webhook.js", "api/threads.js", "api/share.js", "api/followups.js"):
    run("node", "--check", file)
for test in sorted(Path("tests").glob("*.mjs")):
    run("node", str(test))

run("git", "add", "-A")
run("git", "commit", "-m", "release: integrate verified Prism commercial runtime")
run("git", "push", "origin", f"HEAD:{BRANCH}")
