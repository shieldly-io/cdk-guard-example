/**
 * Example CDK app showing three ways to use @shieldly/cdk-guard.
 *
 * Pick ONE of the three patterns below and uncomment it.
 * Set SHIELDLY_API_KEY before running.
 */

import * as cdk from 'aws-cdk-lib';
import { ExampleStack } from '../lib/example-stack.js';

const app = new cdk.App();
new ExampleStack(app, 'ExampleStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

// ─── Pattern A: ShieldlyGuard hook (auto-fires after cdk synth) ──────────────
//
// import { ShieldlyGuard } from '@shieldly/cdk-guard';
// new ShieldlyGuard({
//   failOn: 'High',         // exit 1 if any High or Critical finding
//   // apiKey: 'sk_live_...' // or set SHIELDLY_API_KEY env var
// });

// ─── Pattern B: explicit post-synth (ESM top-level await) ────────────────────
//
// import { shieldlyGuard } from '@shieldly/cdk-guard';
// const assembly = app.synth();
// const { failed } = await shieldlyGuard(assembly.directory, { failOn: 'High' });
// if (failed) process.exit(1);
