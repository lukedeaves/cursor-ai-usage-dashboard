.PHONY: serve test vendor screenshots desktop

PORT ?= 8080

serve:
	python3 -m http.server $(PORT)

test:
	python3 scripts/run_tests.py

vendor:
	python3 scripts/vendor_check.py

screenshots:
	python3 scripts/capture_screenshots.py

desktop:
	python3 desktop/run.py
