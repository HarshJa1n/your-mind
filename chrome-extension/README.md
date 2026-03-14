# YourMind Web Clipper — Chrome Extension

Save any webpage to YourMind with one click.

## Install (unpacked, for development/demo)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select this `chrome-extension/` folder
5. The YourMind icon appears in your toolbar (pin it for easy access)

## How it works

1. Click the extension icon on any page
2. See the page title and domain
3. Click **"Save to YourMind"**
4. Your YourMind dashboard opens in a new tab and auto-saves the article
5. AI processing starts — summary, tags, translation appear within ~10 seconds

## Configure URL

If you're running YourMind on a different URL (local dev etc.), click **Configure URL** in the popup and enter your URL.

Default: `https://your-mind.vercel.app`

## Permissions

- `activeTab` — reads the current tab's URL and title when you click the extension. No background tracking.
