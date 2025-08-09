Kick Channel Filter helps you clean up Kick.com by hiding channels you don’t want to see.

### Features
• Manual block list — add channel usernames (from the URL) and hide their cards across the site.  
• Auto-block spammy names — built-in heuristic detects random-looking usernames and hides them automatically.  
• Popup UI — manage your list from the extension icon; add the current channel in one click.  
• No tracking — no external servers; your data stays in Chrome Storage.

### How it works
The extension runs a content script on Kick.com pages to detect channel links and hide matching cards. It continuously
watches for new content (infinite scroll and SPA navigation) and re-applies the filter.

### Permissions
- storage: save your blocked list & toggles (locally/sync).  
- tabs: used only to read the active tab URL for “Add current.”  
- https://kick.com/*: required to run on Kick pages.

### Notes
- Enter usernames exactly as they appear in the URL (e.g., https://kick.com/username).  
- You can toggle the auto-block feature from the popup.  
- Designed for Manifest V3.

If you find channels the auto-block misses (or false positives), please send examples via the Web Store support page.
We'll keep improving the heuristic.
