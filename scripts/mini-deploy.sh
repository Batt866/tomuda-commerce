#!/bin/bash
# Mini deploy — локал backend + HTTPS tunnel
exec "$(dirname "$0")/start-tomuda.sh" "$@"
