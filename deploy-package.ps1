# ==============================================================================
# Great-Favour Montessori School (GFMS)
# Production Build & Deployment Packaging Script
# ==============================================================================

Write-Host "Triggering automated packaging script (Node.js + bsdtar POSIX compliant)..." -ForegroundColor Cyan
node scripts/package-deploy.js
