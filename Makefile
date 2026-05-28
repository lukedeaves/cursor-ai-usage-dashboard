.PHONY: serve start test vendor docker screenshots open

PORT ?= 8080

serve:
	python3 -m http.server $(PORT)

start:
	npx serve . -l $(PORT)

open: serve
	@echo "Open http://localhost:$(PORT) in your browser"

test:
	npm test

vendor:
	npm run vendor

docker:
	docker compose up --build

screenshots:
	npm run screenshots
