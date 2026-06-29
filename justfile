set dotenv-load
set export

default:
    @just --list

install:
    pnpm install
    go install github.com/nimling/sbump/cmd@latest
    mv "$(go env GOPATH)/bin/cmd" "$(go env GOPATH)/bin/sbump"

dev:
    pnpm run dev

build:
    pnpm run build:lib

check:
    pnpm run type-check

test:
    cd actions && go test ./...
    pnpm run type-check

clean:
    rm -rf dist node_modules .vite .cache

publish:
    pnpm publish --no-git-checks

deploy:
    sbump patch --json package.json@.version --push-version --auto --workflow

deploy-minor:
    sbump minor --json package.json@.version --push-version --auto --workflow

deploy-major:
    sbump major --json package.json@.version --push-version --auto --workflow
