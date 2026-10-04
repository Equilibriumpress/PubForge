# Getting started

<p class="manual-lead">This manual demonstrates instruction-heavy layout: prerequisites, warnings, procedural sequences, decision notes and code blocks.</p>

<div class="manual-grid">
<div class="manual-card">
<span class="manual-label">PREREQUISITE</span>
<strong>Access verified</strong>
<p>Confirm credentials, workspace permissions and local connectivity.</p>
</div>
<div class="manual-card">
<span class="manual-label">TARGET</span>
<strong>15 minutes</strong>
<p>A normal startup should complete without escalation.</p>
</div>
</div>

{{image:workflow}}

<div class="manual-warning">
<strong>Warning</strong>
Do not skip the verification step after a configuration change. A successful command is not the same as a verified result.
</div>

## First successful task

<ol class="procedure">
<li>
<strong>Prepare the workspace</strong>
<p>Confirm the source revision and remove stale generated output.</p>
</li>
<li>
<strong>Run the operation</strong>
<p>Execute the standard command with the documented configuration.</p>
</li>
<li>
<strong>Verify the result</strong>
<p>Check both the expected output and the absence of new warnings.</p>
</li>
</ol>

~~~bash
pubforge build --profile production
pubforge verify --strict
~~~
