#!/usr/bin/env bash
set -euo pipefail

# =========================
# CONFIG
# =========================
KRATOS_ADMIN_URL=${KRATOS_ADMIN_URL:-http://localhost:4434}
SCHEMA_ID="scansure_v1"
SCHEMA_FILE="infra/kratos/identity.schema.scansure.json"

echo "🚀 Applying Kratos identity schema (TC-4)"
echo "Admin URL : $KRATOS_ADMIN_URL"
echo "Schema ID : $SCHEMA_ID"
echo "Schema    : $SCHEMA_FILE"
echo "-------------------------------------"

# =========================
# VALIDATE FILE
# =========================
if [ ! -f "$SCHEMA_FILE" ]; then
  echo "❌ Schema file not found: $SCHEMA_FILE"
  exit 1
fi

# =========================
# APPLY SCHEMA (ADMIN API)
# =========================
curl -f -sS -X PUT \
  "$KRATOS_ADMIN_URL/identity/schemas/$SCHEMA_ID" \
  -H "Content-Type: application/json" \
  --data-binary @"$SCHEMA_FILE" \
  -o /tmp/kratos-schema-apply.json

echo "✅ Schema applied via Admin API"

# =========================
# VERIFY SCHEMA
# =========================
echo "🔍 Verifying schema..."

curl -f -sS "$KRATOS_ADMIN_URL/identity/schemas/$SCHEMA_ID" \
  || { echo "❌ Failed to verify schema"; exit 1; }

echo "PASSED: Schema applied and verified"
