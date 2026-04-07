{ inputs, ... }:
{
  perSystem =
    {
      pkgs,
      inputs',
      system,
      ...
    }:
    {
      _module.args.pkgs = import inputs.nixpkgs {
        inherit system;
      };

      devShells = {
        default = pkgs.mkShell {
          buildInputs = [
            # Runtime
            pkgs.bun
            pkgs.nodejs_22

            # Database client tools
            pkgs.postgresql_16

            # AI agent tooling
            inputs'.llm-agents.packages.rtk
            inputs'.serena.packages.default

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
      };
    };
}
