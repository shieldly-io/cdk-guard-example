# cdk-guard-example

Example CDK app demonstrating [`@shieldly/cdk-guard`](https://www.npmjs.com/package/@shieldly/cdk-guard) — AI-Powered AWS security analysis that catches risky IAM policies and CloudFormation misconfigurations on every `cdk synth`.

## Quick start

```bash
# 1. Install
npm install

# 2. Get a free API key (no credit card)
# https://www.shieldly.io/app/api
export SHIELDLY_API_KEY=sk_live_...

# 3. Run: synthesizes the CDK app then analyzes all stacks
npm run guard
```

## What this example does

`lib/example-stack.js` defines a stack with intentional security issues:
- An S3 bucket with partial public-access settings
- A Lambda execution role with `s3:*` on `*` (wildcard action + wildcard resource)

`@shieldly/cdk-guard` finds these issues, explains each one in plain English, and provides the tightened policy.

The stack also demonstrates **risk acceptance**: the broad IAM role finding is suppressed inline via `accept()`. It appears as `[ACCEPTED]` in the output and never fails CI — because the developer consciously chose to accept it.

## Risk acceptance

Sometimes you know better than the AI. Accept a finding so it never blocks CI again:

### Option 1 — Inline CDK (scoped to one resource, visible in code review)

```js
import { accept } from '@shieldly/cdk-guard';

const broadRole = new iam.Role(this, 'BroadRole', { ... });
accept(broadRole, ['Overly Permissive S3 Access in IAM Role'], {
  reason: 'Bootstrap role — removed post-deploy',
});
```

### Option 2 — CLI (writes to .shieldly.json, no CDK code changes)

```bash
# Scope to a specific construct path (recommended):
npx @shieldly/cdk-guard accept "Overly Permissive S3 Access in IAM Role" \
  --path "*/BroadRole/*" \
  --reason "Bootstrap role — removed post-deploy"

# Or accept globally across all resources:
npx @shieldly/cdk-guard accept "Incomplete S3 Public Access Blocking"
```

### Option 3 — .shieldly.json (edit by hand)

```json
{
  "ignore": [
    {
      "title": "Overly Permissive S3 Access in IAM Role",
      "path": "*/BroadRole/*",
      "reason": "Bootstrap role — removed post-deploy"
    }
  ]
}
```

**Precedence:** inline metadata > config path-glob > config global title-only. Accepted findings print in the `[ACCEPTED]` section and never count toward `--fail-on`.

## Usage patterns

### Pattern A — CLI (no code changes, any language CDK app)

```bash
# Synth + analyze in one command:
npx @shieldly/cdk-guard

# Fail only on Critical (not High):
npx @shieldly/cdk-guard --fail-on Critical

# Analyze existing cdk.out/ without re-synthesizing:
npx @shieldly/cdk-guard --no-synth

# JSON output (pipe to jq, scripts, CI artifacts):
npx @shieldly/cdk-guard --format json | jq '.[].findings[].severity'
```

### Pattern B — ShieldlyGuard construct (hook-based)

Uncomment the `ShieldlyGuard` block in `bin/app.js`. The guard registers a
`process.on('beforeExit')` hook that fires automatically after `cdk synth`:

```js
import { ShieldlyGuard } from '@shieldly/cdk-guard';

const app = new cdk.App();
new ShieldlyGuard({ failOn: 'High' });  // reads SHIELDLY_API_KEY from env
new MyStack(app, 'MyStack');
// No explicit call needed — fires when the process exits.
```

### Pattern C — explicit post-synth

Uncomment the `shieldlyGuard` block in `bin/app.js`:

```js
import { shieldlyGuard } from '@shieldly/cdk-guard';

const assembly = app.synth();
const { failed } = await shieldlyGuard(assembly.directory, { failOn: 'High' });
if (failed) process.exit(1);
```

### Pattern D — cdk.json afterSynth hook

Works with any CDK language (TypeScript, Python, Java, Go):

```json
{
  "app": "node bin/app.js",
  "hooks": {
    "afterSynth": ["npx", "@shieldly/cdk-guard", "--no-synth"]
  }
}
```

## CI example

```yaml
# .github/workflows/cdk-check.yml
name: CDK security check
on: [push, pull_request]
jobs:
  guard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx @shieldly/cdk-guard
        env:
          SHIELDLY_API_KEY: ${{ secrets.SHIELDLY_API_KEY }}
```

## Links

- [@shieldly/cdk-guard on npm](https://www.npmjs.com/package/@shieldly/cdk-guard)
- [shieldly.io](https://www.shieldly.io) — free IAM Advisor demo
- [REST API reference](https://www.shieldly.io/docs/api)
- [GitHub Action](https://github.com/shieldly-io/action) — gate insecure IaC in PRs
