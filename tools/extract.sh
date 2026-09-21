#!/usr/bin/env bash
# Step 1 of corpus ingestion: PDF -> text.
# The .txt is committed so parsing is reproducible without poppler installed,
# and so a rule amendment shows up as a readable diff.
# -layout is required: default mode silently drops hyphens at line breaks
#   ("trauma-responsive" becomes "traumaresponsive").
# Needs: brew install poppler
set -euo pipefail
cd "$(dirname "$0")/.."
pdftotext -layout "source/R 400.9101 to R 400.9506.pdf" source/mi-foster-rules.txt
echo "wrote source/mi-foster-rules.txt ($(wc -l < source/mi-foster-rules.txt) lines)"
