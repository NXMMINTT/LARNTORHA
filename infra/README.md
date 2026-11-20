# infra

- `dynamodb-table.json` — `aws dynamodb create-table --cli-input-json file://infra/dynamodb-table.json`
  then enable TTL and PITR (not part of create-table):
  - `aws dynamodb update-time-to-live --table-name larntorha --time-to-live-specification Enabled=true,AttributeName=ttl`
  - `aws dynamodb update-continuous-backups --table-name larntorha --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true`
- `iam-policy.json` — replace `<ACCOUNT_ID>`, `<BEDROCK_MODEL_ID>`, `<FOUNDATION_MODEL_ID>`, `<BEDROCK_GUARDRAIL_ID>`.
  A cross-region inference profile also needs the foundation-model ARN in every destination region (hence `arn:aws:bedrock:*::`).
