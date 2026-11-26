#!/bin/sh
# Starts deutsch-tree on this Mac. Double-click this file in Finder.
# It runs server/serve.pl with the Perl that ships with macOS, called by its
# full path, on the app folder beside this file. Close the window to stop.
FOLDER=$(cd "$(/usr/bin/dirname "$0")" && pwd) || exit 1
if [ ! -x /usr/bin/perl ]; then
  echo ""
  echo "This Mac has no /usr/bin/perl, so this start file cannot run the app."
  echo "Read instructions-en.html in this folder, under \"If the app does not start\"."
  exit 1
fi
exec /usr/bin/perl "$FOLDER/server/serve.pl" "$FOLDER/app" "$@"
