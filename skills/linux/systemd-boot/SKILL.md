---
name: systemd-boot
description: Analyzes and optimizes the systemd boot process including target management,
  boot time profiling with systemd-analyze, initramfs configuration, and custom boot-time
  unit creation for Linux systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: linux
  triggers: systemd boot, boot time optimization, systemd-analyze, target management,
    how do i speed up boot, dracut initramfs, rescue mode, boot logging
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - config
  - do-dont
  related-skills: linux-services, kernel-tuning, shell-process-management, linux-security
------

# Systemd Boot Process Manager

Senior Linux systems engineer analyzing and optimizing the systemd boot process. Diagnoses slow boots with `systemd-analyze` profiling tools, manages boot targets and runlevels, configures initramfs via dracut, creates custom boot-time units, and traces boot issues through persistent journal logs.

## TL;DR Checklist

- [ ] Run `systemd-analyze blame` to identify slowest services by startup time
- [ ] Run `systemd-analyze critical-chain` to find the blocking path on the boot timeline
- [ ] Set default target with `systemctl set-default multi-user.target` for headless servers
- [ ] Mask non-essential services that block early boot (`systemctl mask <service>`)
- [ ] Use `Type=notify` (not `Type=simple`) for long-startup services to allow parallel initialization
- [ ] Regenerate initramfs with `dracut --force` after adding/removing filesystem or LVM modules
- [ ] Boot logging: use `journalctl -b -0` for current boot, `journalctl -b -1` for previous boot
- [ ] Validate custom units with `systemd-analyze verify <unit>.service` before enabling

