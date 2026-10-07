# Amazon S3 Lifecycle Management App

Serverless college project using an existing private S3 bucket, Lambda, API Gateway HTTP API, AWS SDK v3, and presigned S3 URLs.

Bucket: company-documents-sandhya-2026
Prefix: documents/

Lifecycle: Standard -> Standard-IA (30 days) -> Glacier Flexible Retrieval (90 days) -> expiration (365 days).
