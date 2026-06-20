set dotenv-load
set export

default:
    @just --list

install:
    pnpm install

dev:
    pnpm run dev

build:
    pnpm run build:lib

check:
    pnpm run type-check

clean:
    rm -rf dist node_modules .vite .cache

publish:
    pnpm publish --no-git-checks

deploy:
    go run ../sbump/cmd patch --json package.json@.version --push-version --auto --workflow

deploy-minor:
    go run ../sbump/cmd minor --json package.json@.version --push-version --auto --workflow

deploy-major:
    go run ../sbump/cmd major --json package.json@.version --push-version --auto --workflow
