#!/bin/bash
cd /tmp/claude-0/demo && python3 killsvc.py; sleep 1; cp demo.base.sqlite3 demo.sqlite3 && rm -f frames/k*.jpg frames/error*.jpg && . ./svc.sh && node record.mjs > record.log 2>&1; echo "record exit=$?" >> record.log; ./encode.sh >> record.log 2>&1; echo "encode exit=$?" >> record.log
