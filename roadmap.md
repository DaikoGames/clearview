# Creator list update
# Extension-only delivery
- [x] Remove the download website and deliver the existing full offline extension directly through Files (ZIP integrity, bundled model, routing test, and empty preview verified).

- [x] Bundle the Kagi YouTube list and add green Kagi-listed badges, preserving AI and unknown labels.
- [x] Update popup/download information and package the extension.
- [x] Test matching and verify the downloadable package and badges (controlled YouTube-shaped feed; live YouTube not tested).

# YouTube AI disclosures
- [x] Detect official AI labels available on feed cards, without opening or downloading videos.
- [x] Test label precedence and false positives; update and verify the extension download (14 tests and controlled-feed browser checks passed; live YouTube label availability unverified).

# Local text warnings
- [x] Add conservative suspected-AI warnings for displayed descriptions, titles, and opened transcripts.
- [x] Verify text warnings and existing labels, then update the extension download (20 tests and controlled browser checks passed; live YouTube untested).

# Missing suspected-AI warnings
- [x] Fix extraction of displayed descriptions and modern transcript segments.
- [x] Add regression coverage, verify actual badge changes, and rebuild the download (24 tests passed; controlled-page warning reproduced and corrected; live YouTube unverified).