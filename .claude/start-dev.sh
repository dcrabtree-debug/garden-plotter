#!/bin/bash
cd /Users/davidcrabtree/garden-plotter
exec ./node_modules/.bin/vite --host --port "${PORT:-5173}"
