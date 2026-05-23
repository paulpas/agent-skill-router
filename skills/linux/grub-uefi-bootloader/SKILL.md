---
name: grub-uefi-bootloader
description: Configures GRUB2 bootloader for UEFI firmware boot processes including
  ESP management, Secure Boot signing, multi-boot setups, kernel parameters, and bootloader
  recovery procedures.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: linux
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - config
  - do-dont
  triggers: grub2, UEFI boot, Secure Boot, EFI System Partition, bootloader recovery,
    how do i repair bootloader, efibootmgr, GRUB configuration, dual boot, shim signing
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: linux-services, linux-security, kernel-tuning, shell-process-management,
    cloud-linux-engineering
  maturity: stable
  completeness: 95
  exampleCount: 5
------

# GRUB2 and UEFI Bootloader Manager

System engineer managing the GRUB2 bootloader in UEFI environments — configuring boot entries, integrating Secure Boot via Shim signing, setting up multi-boot systems, tuning kernel parameters, performing recovery operations, and chain-loading network boot configurations.

## TL;DR Checklist

- [ ] Verify ESP is mounted at `/boot/efi` with FAT32 filesystem and 512 MiB minimum size
- [ ] Confirm UEFI firmware mode with `efibootmgr --verbose` before any bootloader changes
- [ ] Set kernel parameters in `/etc/default/grub`, never edit `grub.cfg` directly
- [ ] Generate new GRUB config with `grub-mkconfig -o /boot/grub2/grub.cfg` (RHEL) or `update-grub` (Debian)
- [ ] For Secure Boot: sign kernel and initramfs with `sbsign` using Shim/MOK key pair
- [ ] Validate boot entries with `efibootmgr` after every GRUB reinstall
- [ ] Test bootloader recovery procedure on non-production systems before relying on it

