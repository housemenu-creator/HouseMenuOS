# comm-messages Specification

## Purpose
Real-time priority messaging with channels, reactions, ACK receipts, and overdue alerts.

## Requirements

### Requirement: Priority Levels
Messages MUST support three priority levels: URGENT (🔴), NORMAL (🟡), INFO (🔵).

#### Scenario: Send URGENT message
- GIVEN user is in #general channel
- WHEN user sends message with URGENT priority
- THEN message appears in channel with red styling
- AND 30-second ACK timeout countdown begins

### Requirement: Channel Routing
The system SHALL route messages to appropriate channels based on sender role: #general (all), #kitchen-bar (kitchen/bar), #cash-delivery (cashier/delivery), #admin (admin only).

#### Scenario: Kitchen posts to kitchen-bar
- GIVEN user has kitchen role
- WHEN they post to #kitchen-bar
- THEN message is visible only to kitchen/bar roles

### Requirement: Reactions
Users MAY add one reaction per message from: 👍 👀 ✅ ❌. The system MUST display reaction counts per emoji.

#### Scenario: Add reaction
- GIVEN user views a message
- WHEN they tap 👍
- THEN reaction is added and count increments
- AND userId is stored in reactions.👍 array

### Requirement: ACK Receipts
Recipients MUST add themselves to acknowledgedBy[] when opening a URGENT or NORMAL message. The system SHALL display "✓ Read by [role] at [time]".

#### Scenario: ACK a message
- GIVEN user opens a message
- WHEN message has URGENT or NORMAL priority
- THEN user's role and timestamp are added to acknowledgedBy[]

### Requirement: Overdue Alerts
URGENT messages not acknowledged within 30 seconds MUST display "⚠️ NO RESPONSE" in red. A background timer SHALL check every 10 seconds.

#### Scenario: URGENT overdue
- GIVEN URGENT message sent with no ACK
- WHEN 30 seconds elapse
- THEN "⚠️ NO RESPONSE" warning displays in red
- AND role-based alert sound plays

## RTDB Schema
```
/commChannels/{channelId}/messages/{messageId}
  - id, senderId, senderRole, senderName, text, priority, timestamp
  - reactions: { 👍: [], 👀: [], ✅: [], ❌: [] }
  - acknowledgedBy: [{ userId, role, timestamp }]
```