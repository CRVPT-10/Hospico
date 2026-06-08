Project Chat Summary — Actions, Changes, and Notes

Generated: 2026-05-12

Purpose
- Concise record of everything I (assistant) did in this workspace during our conversation and the important project facts I observed. This is an operational summary — not a replacement for formal docs, but it contains the steps, files changed, and how to reproduce or continue work.

Important safety note
- Secrets and credentials that appeared in the repo (tokens, passwords, API keys) have been intentionally redacted from this summary. Do NOT commit secrets into Git; use AppSail/Catalyst config or a secrets manager.

High-level summary
- Repo: Hospico (Java Spring Boot backend + React + Vite frontend)
- Major feature implemented: migrate hospital image storage from local filesystem -> Zoho File Store -> Zoho Stratus.
- Fixed deployment/config issues so AppSail envs are preserved and the app runs in AppSail.
- Implemented robust Stratus support with backward compatibility to legacy File Store reads.
- Resolved a blocked git push caused by a secret in a previous commit (GitHub push protection) by rewriting local history and re-pushing.
- Cleaned up AppSail/App-config deployments to avoid clearing UI environment variables on deploy.

Timeline / Principal actions taken
1) Initial diagnostics
- Ran `git status` and inspected modified files.
- Checked frontend build and backend compile locally.
- Found environment variable management problems: environment variables set in AppSail UI were getting removed on deploy because deploy config files in the repo contained env blocks.

2) Prevent envs being overwritten by `catalyst deploy`
- Removed `env` / `env_variables` blocks from these repo files so deploy won't overwrite AppSail UI values:
  - `app-config.json`
  - `backend/app-config.json`
  - `backend/app-sail-config.json`
- Added guidance and recommended approach: manage secrets in AppSail Console or via `catalyst config:set` instead of committing them.

3) Added Zoho File Store integration (initial implementation)
- Implemented `ZohoFileStorageService.java` to upload/retrieve images via Cloud Scale File Store APIs.
- Updated `CloudScaleDataStoreService.java` with file store operations (`storeFile`, `retrieveFile`, `deleteFile`).
- Updated `ClinicController` to use the new service endpoints for `/api/clinics/upload-image` and `/api/clinics/image/{fileName}`.
- Made metadata insertion to DataStore best-effort (catches failures so upload still succeeds if metadata table absent).

4) Frontend build & validation
- Verified `npm run build` and fixed no TypeScript errors in `AdminDashboard` and other pages.
- Implemented immediate local preview in the Admin UI when selecting an image (so preview shows independently of upload success).

5) Handling AppSail environment persistence and deployment flow
- Found multiple AppSail/Catalyst config files; standardized approach and ensured `catalyst deploy` uses expected files.
- Created/updated `app-sail-config.json`/`backend/app-sail-config.json` where appropriate with `scripts` but removed `env` blocks per user preference.
- Used `catalyst deploy --verbose` to inspect and debug deployment API calls.

6) GitHub push protection incident
- A commit containing a secret was detected by GitHub protection and blocked push.
- Fixed by removing the secret-bearing commit from local history (interactive rebase equivalent) and re-pushing the cleaned branch.
- NOTE: If historical secrets were pushed previously, consider rotating the secret (regenerate) and removing it from repo history (bfg/git filter-repo) if needed.

7) Migration from File Store to Stratus
- Because Zoho is deprecating File Store, implemented Stratus object operations in `CloudScaleDataStoreService`:
  - `putStratusObject(bucket, key, bytes, contentType)`
  - `getStratusObject(bucket, key)`
  - `deleteStratusObject(bucket, key)`
- Updated `ZohoFileStorageService` to store images to Stratus (object key prefix configurable), while keeping a read fallback to the legacy File Store for previously stored images.
- Added `zoho.stratus.bucket` and optional `zoho.stratus.prefix` and `zoho.stratus.bucket-url` config keys.
- Implemented a fallback method to derive Stratus bucket URL: `https://<bucket>-<env>.zohostratus.in/<object>` when `ZOHO_STRATUS_BUCKET_URL` is not supplied.

8) Tests, builds, and deploys
- Recompiled backend (Maven wrapper) after each change; builds succeeded.
- Deployed multiple times via `catalyst deploy` and monitored the AppSail console.
- Resolved runtime 503 by fixing AppSail startup config and port/startup command issues.

9) Final repo sync
- Committed and pushed all code changes. Commits included messages such as:
  - "Fix AppSail config handling and deploy settings"
  - "Fix: Implement Zoho File Store for persistent hospital image storage"
  - "Migrate hospital images to Stratus storage"
  - "Fix Stratus bucket URL handling"
- If any remaining local files are modified, run `git status` and push as needed.

Files changed (not exhaustive) — important ones
- backend/src/main/java/com/hospitalfinder/backend/service/CloudScaleDataStoreService.java
  - Added File Store and Stratus file/object operations; auth headers handling and response parsing.
- backend/src/main/java/com/hospitalfinder/backend/service/ZohoFileStorageService.java
  - Service used by `ClinicController` for store/read image — migrated to Stratus with legacy fallback.
- backend/src/main/java/com/hospitalfinder/backend/controller/ClinicController.java
  - Upload/GET endpoints unchanged but wired to new storage service.
- backend/src/main/resources/application.yml
  - Added `zoho.stratus.*` keys (bucket, prefix, optional bucket-url) and other settings.
- backend/app-sail-config.json, app-config.json
  - Adjusted to avoid committing env variables; kept `scripts` and startup config.
- frontend/src/pages/AdminDashboard.tsx
  - Image preview and upload flow: compress, local preview, background upload via `/api/clinics/upload-image`.
- frontend/src/api.ts
  - `API_BASE_URL` logic; axios client interceptors; error handling; supports `VITE_API_BASE_URL`.
- frontend/vite.config.ts
  - Configured dev-time proxy for `/api` to backend (uses `VITE_DEV_API` or `http://127.0.0.1:8080`).

Environment variables (names only — DO NOT COMMIT VALUES)
- ZOHO_PROJECT_ID
- ZOHO_CLIENT_ID
- ZOHO_CLIENT_SECRET
- ZOHO_REFRESH_TOKEN
- ZOHO_REGION
- ZOHO_ENV_ID
- DATA_STORE_PROVIDER (zoho)
- ZOHO_ENABLED
- ZOHO_USERS_TABLE_ID
- ZOHO_STRATUS_BUCKET (clinic-images)
- ZOHO_STRATUS_PREFIX (optional)
- ZOHO_STRATUS_BUCKET_URL (optional; e.g. https://clinic-images-development.zohostratus.in)
- GROQ_API_KEY
- GOOGLE_CLIENT_ID
- GOOGLE_MAPS_API_KEY
- SPRING_MAIL_HOST
- SPRING_MAIL_PORT
- SPRING_MAIL_USERNAME
- SPRING_MAIL_PASSWORD
- APP_MAIL_FROM
- APP_SIGNUP_OTP_ALLOW_CONSOLE_FALLBACK
- CORS_ALLOWED_ORIGINS
- VITE_API_BASE_URL (frontend build)

Deployment notes and testing
- AppSail Console (Serverless → AppSail → Hospiico-Backend) shows deployments and environment variables.
- After setting `ZOHO_STRATUS_BUCKET` (and optionally `ZOHO_STRATUS_BUCKET_URL`) on the AppSail environment, re-run:
  cd backend
  catalyst deploy --verbose
- Test endpoints:
  - Health: `https://<appsail-url>/actuator/health` → should return {"status":"UP"}
  - Upload image: POST to `/api/clinics/upload-image` (multipart/form-data with `file`) — returns `imageUrl` and `fileName`.
  - Retrieve image: GET `/api/clinics/image/{fileName}` — serves bytes with the correct Content-Type.

Known issues & troubleshooting
- GitHub push protection blocked a push due to a secret in an earlier local commit; fixed by removing the commit from local history and re-pushing. If secret was ever pushed to remote, rotate the secret immediately.
- AppSail build queueing: if deployments queue or abort, clear queued builds in AppSail console or check org quotas and concurrent build limits.
- If image URLs still 404: check the upload response body for errors (500), check Stratus bucket permissions/policy (need PutObject/GetObject/DeleteObject for server/service account or authenticated users depending on flow), and verify `ZOHO_STRATUS_BUCKET` or `ZOHO_STRATUS_BUCKET_URL` env is set.
- UI shows local preview immediately; upload runs in background. If upload fails the preview still shows but saved hospital image URL may be missing — check network console and backend logs.

Commands used frequently during this work
- Backend compile/build:
  - `cd backend` 
  - `./mvnw.cmd -DskipTests compile`
- Deploy: `catalyst deploy` (use `--verbose` for troubleshooting)
- Git: `git add -A && git commit -m "..." && git push origin main`
- Frontend: `cd hospico-frontend-main` or `cd frontend` then `npm run build` / `npm run dev`

Recommended next steps (actionable)
1. On Catalyst/AppSail console, confirm and set the Stratus bucket URL env if you prefer explicit control:
   - `ZOHO_STRATUS_BUCKET_URL=https://clinic-images-development.zohostratus.in`
2. Ensure Stratus bucket permissions allow server-side PutObject/GetObject/DeleteObject for the service identity (or for authenticated users if design requires).
3. Re-upload a couple of hospital images via Admin to confirm end-to-end storage in Stratus and display in the app.
4. Rotate any secrets found in repo history.
5. Optionally run `git filter-repo`/BFG if any secret were pushed in earlier commits you want removed from history.

If you want I can
- Produce a more formal changelog with exact commit hashes + diffs for each change (surgical, per-file), or
- Extract the specific lines added/modified per file into a single patch or PR-friendly set of changes,
- Or create a small runbook to onboard another developer to the exact steps to deploy and test image uploads.

End of summary.
