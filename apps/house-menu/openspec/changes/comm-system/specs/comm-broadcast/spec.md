# comm-broadcast Specification

## Purpose
Admin broadcast messages to all stations simultaneously.

## Requirements

### Requirement: Broadcast Creation
Admin users MAY create a broadcast message via "📢 Broadcast" action. The message is sent to #admin channel and tagged as visible to all roles.

#### Scenario: Create admin broadcast
- GIVEN user has admin role
- WHEN they select 📢 Broadcast and send message
- THEN message posts to #admin
- AND all roles can view the message

### Requirement: Broadcast Priority
Admin broadcasts MUST always use INFO (🔵) priority and require no ACK.

#### Scenario: Broadcast has no ACK
- GIVEN admin sends broadcast
- THEN message uses INFO priority
- AND no acknowledgment tracking occurs

### Requirement: Broadcast Use Case
Typical broadcasts include: store announcements, hours changes, special menu items.

#### Scenario: Closing announcement
- GIVEN admin sends "CLOSING 2-3pm"
- WHEN kitchen, bar, cash, delivery users view #admin
- THEN they all see the closing announcement
- AND role-based notification sound plays

## RTDB Schema
```
/commChannels/admin/messages/{messageId}
  - id, senderId, senderRole: "admin", senderName, text
  - priority: "INFO", timestamp
  - isBroadcast: true
```