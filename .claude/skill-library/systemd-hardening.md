# Systemd Security Hardening

## When to use

When creating or modifying systemd services in clanServices modules.

## Shared Security Config

Import from `nix/lib/systemdSecurity.nix`:
```nix
inherit (import ../../nix/lib/systemdSecurity.nix) commonSecurityConfig;

serviceConfig = commonSecurityConfig // {
  Type = "simple";
  User = "myuser";
  # service-specific options
};
```

## What commonSecurityConfig includes

- `NoNewPrivileges` — prevent privilege escalation
- `ProtectSystem = "strict"` — read-only /usr, /boot, /efi, /etc
- `ProtectHome` — no access to /home, /root, /run/user
- `PrivateTmp` — private /tmp namespace
- `PrivateDevices` — no physical device access
- `ProtectKernelTunables/Modules/Logs` — kernel protection
- `ProtectControlGroups` — read-only cgroup
- `RestrictNamespaces/Realtime/SUIDSGID` — limit capabilities
- `LockPersonality` — prevent ABI changes
- `SystemCallArchitectures = "native"` — native syscalls only
- `UMask = "0077"` — restrictive file creation

**NOT included**: `MemoryDenyWriteExecute` (breaks JIT — bun/Node.js)

## Common Overrides

```nix
# Services needing device access (postgres)
PrivateDevices = lib.mkForce false;

# Services needing write paths
ReadWritePaths = [ settings.dataDirectory ];
```

## Secrets: LoadCredential

More secure than environment variables:
```nix
serviceConfig.LoadCredential = [
  "secret_name:${path-to-secret}"
];
```
Access in scripts: `cat "$CREDENTIALS_DIRECTORY/secret_name"`

Benefits: stored in memory-only tmpfs, not visible in `/proc/[pid]/environ`.

## Shared Secret Access

```nix
serviceConfig.SupplementaryGroups = [ "my-service-secrets" ];
```

## Secure Temp Files

```bash
WRAPPER_SCRIPT=$(mktemp)
install -m 700 /dev/null "$WRAPPER_SCRIPT"
cat > "$WRAPPER_SCRIPT" <<'EOF'
...
EOF
```

## Avoid Password in CLI

Use heredocs instead of `-c` (avoids /proc/cmdline exposure):
```bash
${pkgs.postgresql}/bin/psql <<EOSQL
  CREATE USER "$USER" WITH PASSWORD '$PASSWORD';
EOSQL
```
