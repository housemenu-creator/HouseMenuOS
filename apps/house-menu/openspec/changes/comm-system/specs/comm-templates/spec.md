# comm-templates Specification

## Purpose
One-tap pre-defined message templates with embedded priority and channel.

## Requirements

### Requirement: Template Actions
Tapping a template MUST immediately send the message to its pre-configured channel without confirmation.

#### Scenario: Send template message
- GIVEN user is on CommView
- WHEN they tap [🍺 Driver arrived]
- THEN message sends immediately to #cash-delivery
- AND toast confirms "Sent: Driver arrived"

### Requirement: Template Configuration
Templates MUST be pre-configured with priority and target channel:

| Template | Priority | Channel |
|----------|----------|---------|
| 🍺 Driver arrived | NORMAL | #cash-delivery |
| 📦 Order ready | NORMAL | #general |
| 💰 Payment confirmed | INFO | #general |
| ⚠️ Low stock | URGENT | #general |
| 🔴 Urgent | URGENT | #general |
| 🚨 Help | URGENT | #general |

#### Scenario: All templates visible
- GIVEN user opens template picker
- THEN all 6 templates display with icon, text, priority badge
- AND channel indicator shows target

### Requirement: Immediate Send
Templates MUST bypass compose input — tap sends instantly.

#### Scenario: Tap template while composing
- GIVEN user has typed in compose field
- WHEN they tap any template
- THEN compose field is ignored
- AND template message sends immediately