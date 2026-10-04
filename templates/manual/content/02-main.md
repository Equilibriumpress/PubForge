# Operating procedure

## Decision path

<div class="decision-table">
<div><span>IF</span><strong>Build succeeds</strong><p>Continue to verification.</p></div>
<div><span>IF</span><strong>Build fails</strong><p>Capture logs before retrying.</p></div>
<div><span>IF</span><strong>Verification differs</strong><p>Stop and escalate.</p></div>
</div>

## Standard procedure

<ol class="procedure procedure-long">
<li>
<strong>Identify the exact revision</strong>
<p>Record the commit or release identifier before making a change.</p>
</li>
<li>
<strong>Apply one coherent change</strong>
<p>Avoid bundling unrelated modifications into the same operational step.</p>
</li>
<li>
<strong>Run the standard checks</strong>
<p>Use the documented command sequence and preserve diagnostic output.</p>
</li>
<li>
<strong>Compare expected and observed state</strong>
<p>Successful execution is only one part of acceptance.</p>
</li>
</ol>

<div class="manual-note">
<strong>Operator note</strong>
If the observed state cannot be reproduced from the recorded revision, treat the run as incomplete.
</div>

## Troubleshooting matrix

| Symptom | Likely cause | Action |
|---|---|---|
| Build stops immediately | Invalid configuration | Validate manifest syntax |
| Output differs by machine | Environment drift | Compare tool versions |
| Links fail after export | Path rewrite | Inspect packaged resource graph |
| PDF looks correct but press check fails | Production conversion | Use press-ready workflow |
