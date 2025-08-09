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

## Random Channel Detection Heuristic

The extension includes an **optional auto-block** feature that attempts to hide spam or throwaway channels on Kick.com automatically.  
These channels often follow patterns such as:
- Randomly generated usernames with minimal semantic meaning  
- A mix of letters and digits in unusual distributions  
- Very low vowel-to-consonant ratio  
- Long runs of consecutive consonants  
- High character diversity and entropy

### Detection Logic

When scanning visible channel cards, the username is extracted from the channel URL (e.g., `https://kick.com/<username>`).  
Each username is analyzed and scored against several metrics:

| Metric | Description |
|--------|-------------|
| `len` | Total length of the username |
| `digitsCount` | Number of digits present |
| `vowelRatio` | Ratio of vowels (a, e, i, o, u, y) to total characters |
| `maxConsRun` | Maximum number of consecutive consonants |
| `uniqRatio` | Ratio of unique characters to total length |
| `entropy` | Shannon entropy based on character distribution |
| `triDiv` | Diversity of 3-character sequences (trigrams) |

### Main Rules

A username is flagged as **random-like** if:
1. It contains a **balanced mix of letters and digits** *or*  
2. It contains **only letters** but shows high entropy, high uniqueness, and long consonant runs *or*  
3. It has **exactly one digit** but is consonant-heavy with high entropy and diversity  
   *(special handling for cases like `oiofwtvbks9ta`)*

### Example Triggers

- `jdlcfvgkvvsqu` → Letters-only, low vowel ratio, high consonant run  
- `hu9dqynzyldwz` → One digit, consonant-heavy, high uniqueness  
- `oiofwtvbks9ta` → One digit, consonant-heavy, long consonant run, high trigram diversity  
- `59bu0a8ltyjl0` → Multiple digit groups, high entropy

### Limitations

The heuristic is intentionally aggressive for spam reduction but may occasionally hide legitimate short or stylized usernames.  
Users can disable auto-block or whitelist usernames manually if needed.
