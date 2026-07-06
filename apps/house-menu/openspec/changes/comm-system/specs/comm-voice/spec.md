# comm-voice Specification

## Purpose
Push-to-talk broadcast and persistent voice notes attached to orders.

## Requirements

### Requirement: PTT Recording
When user long-presses PTT button, the system SHALL start recording via getUserMedia. On release, the audio clip MUST be uploaded to Firebase Storage and its URL broadcast to the user's station channel.

#### Scenario: PTT broadcast
- GIVEN user holds PTT button
- WHEN button is held
- THEN recording starts and visual indicator shows "Recording... (0:03)"
- AND on release, audio uploads to Storage and URL posts to channel

### Requirement: Voice Note Duration Limits
PTT broadcasts MUST NOT exceed 15 seconds. Persistent voice notes MUST NOT exceed 60 seconds.

#### Scenario: PTT max duration
- GIVEN user holds PTT button
- WHEN recording reaches 15 seconds
- THEN recording stops automatically
- AND audio is uploaded

### Requirement: Voice Note Attachment
Users MAY record a voice note and attach it to a specific orderId. The note SHALL be stored in Firebase Storage as `voiceNotes/{orderId}/{msgId}.webm`.

#### Scenario: Attach voice note to order
- GIVEN user taps 🎤 on an order
- WHEN they record and release within 60s
- THEN audio saves to voiceNotes/{orderId}/{msgId}.webm
- AND RTDB record created with { orderId, audioUrl, duration, createdAt, createdBy }

### Requirement: Voice Note Playback
Voice notes MUST display as 🎤 "Voice note · 0:08" with an inline play button.

#### Scenario: Play voice note
- GIVEN user sees voice note attachment
- WHEN they tap play button
- THEN audio plays inline
- AND duration counter updates during playback

### Requirement: Microphone Permission
The system SHALL request microphone permission via getUserMedia. If denied, the system MUST fall back to text-only mode gracefully.

#### Scenario: Mic permission denied
- GIVEN getUserMedia returns error
- WHEN user attempts PTT or voice note
- THEN show toast "Microphone access needed"
- AND disable voice features for session

## RTDB Schema
```
/voiceNotes/{orderId}/{msgId}
  - orderId, audioUrl, duration, createdAt, createdBy
```