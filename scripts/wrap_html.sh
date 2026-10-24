#!/usr/bin/env bash
# Embrulha uma página escrita para Artifact (sem doctype/head) num HTML completo para o GitHub Pages.
# Uso: wrap.sh entrada.html saida.html
set -euo pipefail
in="$1"; out="$2"
if head -c 200 "$in" | grep -qi '<!doctype'; then cp "$in" "$out"; exit 0; fi
{
  printf '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
  sed 's#<meta name="claude:viewport-fit-sides"[^>]*>##' "$in"
  printf '\n</html>\n'
} > "$out"
