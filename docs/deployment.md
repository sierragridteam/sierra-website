# Deployment — sierragridteam.org

The site is a fully static Astro build (`dist/`), deployed by GitHub Actions to
the existing AWS S3 bucket and CloudFront distribution. Moving the source to
`sierragridteam/sierra-website` does not move the AWS resources or change the domain.

## Infrastructure ownership

Production infrastructure is managed separately from this source repository.
The deployment requires a wildcard ACM certificate, Route 53 DNS, a dedicated
deploy IAM user, and a KMS-encrypted, versioned S3 bucket behind CloudFront
Origin Access Control. A CloudFront function rewrites extensionless paths to
`index.html`. The contact form is a separate Lambda/SES integration and is not
deployed by this site's workflow. Contact a deployment administrator for the
current resource inventory and infrastructure change procedure.

Hostinger is the registrar; the infrastructure source configures Route 53 as the
DNS host. Confirm live nameserver delegation before making DNS changes. Older
instructions to add individual website records at Hostinger are superseded by
this infrastructure configuration. Do not provision replacement infrastructure
as part of a source-repository transfer.

## GitHub configuration

Preserve the `production` environment and its restrictions. Allow production
deployments only from `main`. Repository/environment configuration is:

| Name                    | Kind     | Purpose                                 |
| ----------------------- | -------- | --------------------------------------- |
| `AWS_ACCESS_KEY_ID`     | Secret   | Dedicated website deploy user           |
| `AWS_SECRET_ACCESS_KEY` | Secret   | Deploy user's secret key                |
| `AWS_REGION`            | Variable | Existing AWS region                     |
| `AWS_ACCOUNT_ID`        | Variable | Expected account; checked before upload |
| `S3_BUCKET_NAME`        | Variable | Existing website bucket                 |
| `CF_DISTRO_ID`          | Variable | Existing CloudFront distribution        |

Use the existing infrastructure outputs for configuration; do not copy values
from old documentation examples. GitHub cannot return the plaintext of stored
secrets. Preserve them during transfer and recover replacements from the provider
or approved credential store when necessary.

## Deployment and verification

`.github/workflows/deploy.yml` runs after a successful CI **push** on `main` from
this repository, or by manual dispatch on `main`. Automatic deployments check out
the exact commit CI tested. A fork PR with a branch named `main` cannot authorize
a production deployment. The workflow verifies the AWS account, builds, syncs
immutable assets and revalidated HTML/manifests, then invalidates CloudFront.

After a transfer, verify the environment, secret names, variables, organization
Actions policy, and a successful CI run before deploying. Test the home page,
extensionless routes, a missing page, and the contact form. Keep the existing
AWS account, bucket, distribution, DNS and credentials until a separately planned
infrastructure migration.

To roll back website code, revert the change through a reviewed PR and deploy the
previous behavior. A contact-form or DNS failure may require an infrastructure
fix; redeploying this frontend does not change those resources.

## Data freshness

Live operational data is fetched in the browser from `data.sierragridteam.org`.
The home status tiles and emergency banner render placeholders until their
client code receives data. Checked-in `src/data/*.json` files are test fixtures,
not production snapshots embedded in pages. Deployment does not refresh or move
the Grid service.
