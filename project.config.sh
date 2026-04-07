#!/usr/bin/env bash
# Project Configuration for Claude Orchestration Template
# Edit these values for your project, then run ./setup.sh

PROJECT_NAME="jackson-ventures"
WORKSPACE_SCOPE="jackson-ventures"    # @jackson-ventures/* package imports
RUNTIME="bun"                          # bun or node
TEST_COMMAND="bun test"                # test runner command
TYPECHECK_COMMAND="bunx tsc --noEmit"  # type checker command
NIX_EVAL_COMMAND="nix flake check . --no-build"  # Nix verification command
