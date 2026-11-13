# Deployment — sierragridteam.org

The site is a fully static Astro build (`dist/`), deployed by GitHub Actions to
an AWS S3 bucket behind a CloudFront distribution in the S.I.E.R.R.A AWS
organization.

## Infrastructure ownership

Production infrastructure is managed separately from this source repository, in
the organization's infrastructure repository (Terraform). One static-site unit
there creates everything this site needs: a private, versioned S3 bucket behind
CloudFront Origin Access Control, the distribution with its certificate and DNS
records, an error-rate alarm, and the deploy role this repository assumes. A
CloudFront function redirects `www` to the apex, strips trailing slashes and
rewrites extensionless paths to `index.html`. The contact form is a separate
Lambda/SES integration and is not deployed by this site's workflow. Contact a
deployment administrator for the current resource inventory and infrastructure
change procedure.

## GitHub configuration

There are no AWS secrets. The deploy job presents its GitHub OIDC token and
receives short-lived credentials for a role that trusts only this repository's
`production` environment and may only sync this site's bucket and invalidate
its distribution.

Preserve the `production` environment and its restrictions, and allow
production deployments only from `main`: the role trusts the environment, so
the environment's branch rule is what keeps other branches from deploying.
Repository configuration is four Actions variables, taken from the
infrastructure's `github_variables` output:

| Name                                | Kind     | Purpose                          |
| ----------------------------------- | -------- | -------------------------------- |
| `DEPLOY_ROLE_ARN`                   | Variable | Deploy role assumed through OIDC |
| `DEPLOY_AWS_REGION`                 | Variable | Region of the bucket             |
| `DEPLOY_S3_BUCKET`                  | Variable | Website bucket                   |
| `DEPLOY_CLOUDFRONT_DISTRIBUTION_ID` | Variable | CloudFront distribution          |

## Deployment and verification

`.github/workflows/deploy.yml` runs after a successful CI **push** on `main` from
this repository, or by manual dispatch on `main`. Automatic deployments check out
the exact commit CI tested. A fork PR with a branch named `main` cannot authorize
a production deployment. The workflow builds, assumes the deploy role, syncs
immutable assets and revalidated HTML/manifests (deleting files that no longer
exist), then invalidates CloudFront.

After a change to the infrastructure or a repository transfer, verify the
environment, the variables, organization Actions policy, and a successful CI
run before deploying. Test the home page, extensionless routes, a missing page,
and the contact form.

To roll back website code, revert the change through a reviewed PR and deploy the
previous behavior. A contact-form or DNS failure may require an infrastructure
fix; redeploying this frontend does not change those resources.

## Data freshness

Live operational data is fetched in the browser from `data.sierragridteam.org`.
The home status tiles and emergency banner render placeholders until their
client code receives data. Checked-in `src/data/*.json` files are test fixtures,
not production snapshots embedded in pages. Deployment does not refresh or move
the Grid service.
