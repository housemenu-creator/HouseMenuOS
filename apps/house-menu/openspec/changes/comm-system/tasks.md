# Tasks: comm-system

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 800-1000+ |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (foundation+shell) → PR 2 (messages+ACK) → PR 3 (voice+templates) → PR 4 (notes+KDS) → PR 5 (broadcast+sounds) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation: commService RTDB + useCommStore + CommPanel shell | PR 1 | Base branch; no dependencies |
| 2 | Core: priority messages, reactions, ACK receipts, overdue alerts | PR 2 | Depends on PR 1 |
| 3 | Voice: PTT recording, voice notes, playback UI | PR 3 | Depends on PR 2 |
| 4 | Notes: order notes schema, KDS badge integration | PR 4 | Depends on PR 2 |
| 5 | Polish: templates, broadcast, role-based sounds | PR 5 | Depends on PR 3+4 |

## Phase 1: Infrastructure & Foundation

- [x] 1.1 Create `src/comm/commService.js` — RTDB paths (commChannels, messages, voiceNotes), sendMessage(), ackMessage(), getMessages(), addReaction(), getVoiceNotes(), uploadVoiceNote() using `@house/db`
- [x] 1.2 Create `src/comm/store/commStore.js` — Zustand store with slices: messages{}, currentChannel, voiceNotes{}, soundSettings, offlineQueue; methods: sendMessage, setChannel, addReaction, ackMessage, queueOffline
- [x] 1.3 Create `src/comm/components/CommPanel.jsx` — slide-out panel layout with AnimatePresence, channel selector tabs, message list, compose input
- [x] 1.4 Add `src/comm/components/ChannelSelector.jsx` — tabs for #general #kitchen-bar #cash-delivery #admin based on user role from useAuth
- [x] 1.5 Create `src/comm/components/MessageList.jsx` — virtualized message list with RTDB listener via useCommStore, auto-scroll on new messages

## Phase 2: Core Messaging (comm-messages)

- [x] 2.1 Create `src/comm/components/MessageBubble.jsx` — priority styling (🔴URGENT/🟡NORMAL/🔵INFO), sender name, timestamp, reaction bar
- [x] 2.2 Implement reaction bar in MessageBubble — 👍👀✅❌ buttons, optimistic update via useCommStore.addReaction
- [x] 2.3 Implement ACK receipts in MessageBubble — show "✓ Read by [role]" when user opens URGENT/NORMAL message via useCommStore.ackMessage
- [x] 2.4 Create `src/comm/components/OverdueAlert.jsx` — checks messages with no ACK every 10s via setInterval in CommPanel, displays "⚠️ NO RESPONSE" in red, triggers alert sound
- [ ] 2.5 RED: Write `src/comm/__tests__/useCommStore.test.js` — test sendMessage, addReaction, ackMessage, overdue detection
- [ ] 2.6 GREEN: Implement useCommStore methods to pass tests
- [ ] 2.7 REFACTOR: Extract sound playing logic into `src/comm/sounds.js`

## Phase 3: Voice (comm-voice)

- [x] 3.1 Create `src/comm/components/PTTButton.jsx` — long-press handler (onMouseDown/onMouseUp touchstart/touchend), visual "Recording..." indicator, 15s max timer
- [x] 3.2 Implement getUserMedia recording in PTTButton — MediaRecorder → blob → call commService.uploadVoiceNote() on release
- [x] 3.3 Create `src/comm/components/VoiceNotePlayer.jsx` — inline audio player with play/pause, duration counter, 🎤 icon
- [x] 3.4 Add order-scoped voice note: create VoiceNoteAttach button on KDS tickets, link to orderId via commService.uploadVoiceNote(orderId)
- [x] 3.5 Handle mic permission denial gracefully in PTTButton — show toast "Microphone access needed", disable voice features
- [x] 3.6 RED: Write `src/comm/__tests__/PTTButton.test.jsx` — test recording lifecycle, permission denial, max duration cutoff
- [x] 3.7 GREEN: Implement PTTButton to pass tests

## Phase 4: Templates (comm-templates)

- [x] 4.1 Create `src/comm/components/TemplatePicker.jsx` — 6 template buttons with icon+text+priority badge: 🍺Driver arrived, 📦Order ready, 💰Payment confirmed, ⚠️Low stock, 🔴Urgent, 🚨Help
- [x] 4.2 Implement 1-tap send: tap template → call useCommStore.sendMessage with pre-set priority+channel, bypass compose input, show toast "Sent: [template]"
- [x] 4.3 Add TemplatePicker toggle button in CommPanel header

## Phase 5: Order Notes (comm-notes)

- [ ] 5.1 Create `src/comm/commNotesService.js` — getOrderNote(orderId), saveOrderNote(orderId, text), deleteOrderNote(orderId) using RTDB
- [ ] 5.2 Create `src/comm/hooks/useOrderNote.js` — hook wrapping commNotesService with local state
- [ ] 5.3 Create `src/comm/components/NoteBadge.jsx` — 📝 badge component, expandable to show note preview
- [ ] 5.4 Modify `src/kds/components/OrderCard.jsx` or KDS ticket component — inject NoteBadge when order has note (useOrderNote hook)
- [ ] 5.5 Verify NoteBadge visible on MonitorView, KitchenView, DispatchView

## Phase 6: Broadcast (comm-broadcast)

- [ ] 6.1 Add 📢 Broadcast button to CommPanel header (admin role only via useAuth.can)
- [ ] 6.2 Create `src/comm/components/BroadcastModal.jsx` — text input, send as INFO priority to #admin channel with isBroadcast:true
- [ ] 6.3 Modify MessageBubble — display broadcast indicator when isBroadcast:true, no ACK tracking for broadcasts

## Phase 7: Sounds & Polish

- [ ] 7.1 Create `src/comm/sounds.js` — pre-loaded Audio objects per role (metallic kitchen, soft beep cash, vibration+sound delivery)
- [ ] 7.2 Wire role-based sounds into useCommStore — play on new message, louder for URGENT, special pattern for overdue
- [ ] 7.3 Create `src/comm/components/SoundToggle.jsx` — mute/unmute button in CommPanel settings
- [ ] 7.4 Update `database.rules.json` — add rules for commChannels/, voiceNotes/, orderNotes/ paths
- [ ] 7.5 Update `storage.rules` — add voiceNotes/ path with 7-day TTL, max 30s duration
- [ ] 7.6 Add `src/App.jsx` route for `/comm` → CommView wrapper component

## Phase 8: Integration & Verification

- [ ] 8.1 Write `src/comm/__tests__/commService.test.js` — mock RTDB, test sendMessage, ackMessage, addReaction, uploadVoiceNote
- [ ] 8.2 Write `src/comm/__tests__/MessageBubble.test.jsx` — test priority styling, reaction bar, ACK display
- [ ] 8.3 Integration test: send message → verify appears in list → add reaction → verify reaction count increments
- [ ] 8.4 Verify offline queue: go offline, send message, reconnect, verify message syncs
- [ ] 8.5 Run `npm run build` — verify no build errors

## Phase 9: Cleanup

- [ ] 9.1 Remove any dead code from CommPanel if features are split across PRs
- [ ] 9.2 Add JSDoc comments to commService.js public methods
- [ ] 9.3 Ensure all components use cm-* Tailwind tokens only (no hardcoded colors)