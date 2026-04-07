{
  description = "Jackson Ventures - AI Agentic Platform";

  outputs =
    inputs:
    inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [
        "aarch64-darwin"
        "aarch64-linux"
        "x86_64-linux"
      ];

      imports = [
        ./nix/dev.nix
      ];
    };

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    flake-parts.url = "github:hercules-ci/flake-parts";
    flake-parts.inputs.nixpkgs-lib.follows = "nixpkgs";

    llm-agents.url = "github:numtide/llm-agents.nix";

    serena.url = "github:oraios/serena";
    serena.inputs.nixpkgs.follows = "nixpkgs";
  };
}
