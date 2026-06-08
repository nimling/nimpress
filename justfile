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
    ../sbump/sbump.sh patch --json package.json@.version --push-version --auto
