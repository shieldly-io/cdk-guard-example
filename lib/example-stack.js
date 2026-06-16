/**
 * Example stack with intentional IAM security issues so cdk-guard has
 * something to find. In a real project these would be your actual stacks.
 *
 * This file also demonstrates risk acceptance — one finding is suppressed
 * inline so you can see the [ACCEPTED] section in the output.
 */
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { accept } from '@shieldly/cdk-guard';

export class ExampleStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // S3 bucket with public access allowed (Shieldly should flag this)
    new s3.Bucket(this, 'InsecureBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda role with overly broad permissions (Shieldly should flag wildcard).
    // We accept this specific finding inline — it shows up as [ACCEPTED] in the
    // output and does NOT count toward the --fail-on threshold.
    const broadRole = new iam.Role(this, 'BroadRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        TooPermissive: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['s3:*'],
              resources: ['*'],
            }),
          ],
        }),
      },
    });
    accept(broadRole, {
      reason: 'Demo bootstrap role — intentionally broad for illustration purposes',
    });

    // Lambda using the broad role
    new lambda.Function(this, 'ExampleFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async () => ({ statusCode: 200 });
      `),
      role: broadRole,
    });
  }
}
