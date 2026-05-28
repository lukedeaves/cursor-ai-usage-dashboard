#!/usr/bin/env python3
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VENDOR = os.path.join(ROOT, 'vendor')
FILES = ['papaparse.min.js', 'chart.umd.min.js', 'tabulator.min.css', 'tabulator.min.js']

missing = [f for f in FILES if not os.path.isfile(os.path.join(VENDOR, f))]
if missing:
    print('Missing vendor files:', ', '.join(missing))
    sys.exit(1)
print('All vendor files present.')
