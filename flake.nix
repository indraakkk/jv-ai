{
  description = "Jackson Ventures - AI Agentic Platform";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    llm-agents.url = "github:numtide/llm-agents.nix";
    serena.url = "github:oraios/serena";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
    llm-agents,
    serena,
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = nixpkgs.legacyPackages.${system};
      llm-agents-pkgs = llm-agents.packages.${system};
      serena-pkgs = serena.packages.${system};
    in {
      devShells.default = pkgs.mkShell {
        buildInputs = [
          # Runtime
          pkgs.bun
          pkgs.nodejs_22

          # Database client tools
          pkgs.postgresql_16

          # AI agent tooling
          llm-agents-pkgs.rtk
          serena-pkgs.default

          # Version control
          pkgs.git
        ];

        shellHook = ''
          echo "Jackson Ventures devshell ready"
          echo "  bun:    $(bun --version 2>/dev/null || echo 'not found')"
          echo "  node:   $(node --version 2>/dev/null || echo 'not found')"
          echo "  psql:   $(psql --version 2>/dev/null | head -1 || echo 'not found')"
          echo "  rtk:    $(rtk --version 2>/dev/null || echo 'available')"
        '';
      };
    });
}
