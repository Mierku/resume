# Rollback / Freeze Playbook

Follow the PRD hard policy:

- visual threshold breach -> freeze + rollback batch
- key E2E failure -> freeze + rollback batch
- depth violation or new vars -> block merge
- two consecutive batch failures -> project freeze + 24h review

Recovery requires all blockers cleared plus a full green re-run of the affected batch evidence.
