# BridgePoint Integrity Index browser extension

Version 0.2 is a user-initiated Manifest V3 preview.

- Manual exact-address lookup is always available.
- **Analyze Current Tab** uses `activeTab` only after the user clicks it.
- The extension reads address metadata already rendered in the active tab, resolves that address through BridgePoint, and places a clearly labeled user-local BII overlay.
- There is no background crawler, no recurring page scan, and no broad third-party host permission.
- The overlay does not claim the underlying website supplies or endorses BridgePoint data.
- BII remains **WITHHELD** when evidence/confidence publication gates do not pass.
