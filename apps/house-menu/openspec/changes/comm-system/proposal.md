# Proposal: comm-system

## Intent

Restaurant staff (kitchen, bar, cash, delivery) lack a unified, real-time internal communication channel inside House Portal OS. Current workarounds (shouting, WhatsApp) are unreliable and break the KDS flow. This change builds a free, real-time comm system using Firebase RTDB and Storage — embedded directly in the existing app.

## Scope

### In Scope
- Priority messages (🔴 URGENT / 🟡 NORMAL / 🔵 INFO) with role-based channels
- 1-tap quick templates with pre-set priority and channel
- Order-attached internal notes (e.g. "allergic to X") travelling through KDS → cooking → expo
- 1-tap quick reactions (👍👀✅❌)
- ACK receipts + URGENT overdue alerts (visual + sound, 30s timeout)
- PTT (Push-to-Talk) broadcast via getUserMedia (long-press, station-scoped)
- Persistent voice notes attached to specific orders (Firebase Storage)
- Admin broadcast to all stations
- Role-differentiated sounds (metallic for kitchen, soft beep for cash, vibration+sound for delivery)
- Dark mode support, mobile-first, offline queue with sync-on-reconnect

### Out of Scope
- Direct 1:1 private messaging
- Message editing/deletion after send
- Video communication
- Cross-restaurant communication
- Integration with external chat platforms (Slack, etc.)

## Capabilities

### New Capabilities
- `comm-messages`: Real-time priority messages with RTDB listeners, channel routing, reactions, ACK/receipts, and overdue alerts
- `comm-voice`: PTT broadcast + persistent voice notes (Firebase Storage, getUserMedia)
- `comm-templates`: 1-tap pre-defined message templates (driver arrived, order ready, etc.)
- `comm-notes`: Internal order notes that attach to orders and persist through the full KDS→cooking→expo flow
- `comm-broadcast`: Admin-to-all station broadcast capability

### Modified Capabilities
- None — this is a net-new feature set; no existing spec-level behavior changes

## Approach

- **RTDB schema**: `messages/{channelId}/{msgId}` with priority, sender, timestamp, ack status; `channels/{channelId}` for metadata; `voiceNotes/{msgId}` pointing to Storage refs
- **Storage**: `voiceNotes/{orderId}/{msgId}.webm` for audio files
- **State**: Zustand `useCommStore` — messages slice, voice slice, presence slice; offline writes via RTDB persistence
- **Auth**: Leverage existing `useAuth` context; role (kitchen/bar/cash/delivery/admin) from auth claims
- **Sound**: Pre-loaded Audio objects per role; Web Audio API for vibration on delivery
- **PTT**: getUserMedia → MediaRecorder → short blob uploaded on release; visual "speaking" indicator
- **Voice notes**: Same pipeline but saved with `orderId` ref; playable inline
- **Offline**: RTDB `goOffline()` handled gracefully; queue outbound messages, sync on reconnect

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/comm/` | New | New comm feature directory (views, components) |
| `src/stores/commStore.js` | New | Zustand store for message/voice state |
| `database.rules.json` | Modified | RTDB rules for `messages/`, `voiceNotes/` |
| `storage.rules` | Modified | Firebase Storage rules for voice notes |
| `src/App.jsx` | Modified | Route for new CommView |
| `src/pages/CommView.jsx` | New | Main comm interface |
| `src/kds/store/orderStore.js` | Modified | Inject note rendering into order items |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| getUserMedia blocked on some devices | Medium | Graceful fallback to text-only; prompt user for mic permission |
| Offline queue grows large | Low | Cap queue at 50 messages; drop oldest on overflow with user warning |
| Firebase Storage costs (voice notes) | Low | Short clips only (≤30s); TTL rule auto-deletes after 7 days |
| RTDB read costs spike with many concurrent listeners | Medium | Paginate message history (last 100); lazy-load older |

## Rollback Plan

Disable the comm feature via a feature flag (`VITE_COMM_ENABLED=false`). RTDB data remains but UI route is removed. Voice Storage files are independent — no rollback needed for existing recordings.

## Dependencies

- Firebase RTDB + Storage (already provisioned)
- getUserMedia API (Chrome mobile supported)
- Existing `useAuth` context for role detection

## Success Criteria

- [ ] Kitchen staff can send/receive priority messages with <1s latency
- [ ] URGENT message shows visual+sound alert and triggers overdue warning after 30s no ACK
- [ ] Order notes appear on all KDS screens (MonitorView, KitchenView, DispatchView)
- [ ] PTT broadcast reaches all stations in the same role within 2s
- [ ] Voice note plays inline attached to its order
- [ ] Offline messages queue and sync automatically on reconnect
- [ ] No new Firebase costs beyond existing free-tier limits