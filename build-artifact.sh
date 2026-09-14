#!/bin/sh
# Assembles the Artifact build: the same game, as a body-only page with the
# stylesheet inlined (the Artifact host supplies <!doctype>, <head> and <body>).
set -e
out="${1:-build/page.html}"
mkdir -p "$(dirname "$out")"
{
  echo '<title>Word War 3</title>'
  echo '<link rel="preconnect" href="https://fonts.googleapis.com">'
  echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
  echo '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Roboto+Condensed:wght@400;700&family=Special+Elite&display=swap">'
  echo '<style>'
  cat styles.css
  echo '</style>'
  # everything between <body> and </body> of index.html
  sed -n '/<body>/,/<\/body>/p' index.html | sed '1d;$d'
} > "$out"
echo "wrote $out"
