#!/usr/bin/env bash
# Downloads the MDHHS Children's Foster Care Manual (FOM) sections into
# source/fom/.
#
# Must run on a machine with open network access. Claude's sandbox is behind
# an egress proxy that denies these hosts, so this step is yours.
#
# Re-run it whenever MDHHS issues a bulletin (FOB) revising a section — the
# header line printed for each file shows the bulletin number and effective
# date, which is how you tell.

set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p source/fom

SECTIONS=(
  722-02    # Foster Care - Administrative Rules
  722-02A   # Corporal Punishment and Seclusion/Isolation
  722-03    # Placement Selection and Standards
  722-03A   # Absent Without Legal Permission (AWOLP)
  722-03C   # Older Youth: Preparation, Placement, and Discharge
  722-03D   # Placement Change
  722-03F   # Approved Absences from Foster Care Placement
  722-06B   # Family Team Meeting
  722-06I   # Maintaining Connections: Parenting Time, Sibling Visitation, Contact
  722-06J   # Rights of Children in Foster Care
  723       # Education Services
)

BASE="https://dhhs.michigan.gov/OLMWeb/ex/FO/Public/FOM"
ok=0; fail=0

for s in "${SECTIONS[@]}"; do
  if curl -fsSL --max-time 60 -o "source/fom/$s.pdf" "$BASE/$s.pdf"; then
    if head -c 4 "source/fom/$s.pdf" | grep -q '%PDF'; then
      printf 'ok    %-10s %s\n' "$s" "$(du -h "source/fom/$s.pdf" | cut -f1)"
      ok=$((ok+1))
    else
      printf 'BAD   %-10s not a PDF (probably an error page)\n' "$s"
      rm -f "source/fom/$s.pdf"; fail=$((fail+1))
    fi
  else
    printf 'FAIL  %-10s download failed\n' "$s"
    fail=$((fail+1))
  fi
done

echo
echo "$ok downloaded, $fail failed -> source/fom/"

if command -v pdftotext >/dev/null 2>&1; then
  echo
  echo "Header line per section (FOB bulletin + effective date):"
  for f in source/fom/*.pdf; do
    printf '  %-14s %s\n' "$(basename "$f" .pdf)" \
      "$(pdftotext -f 1 -l 1 "$f" - 2>/dev/null | tr -s ' \n' ' ' | cut -c1-90)"
  done
else
  echo "(install poppler for header output: brew install poppler)"
fi
