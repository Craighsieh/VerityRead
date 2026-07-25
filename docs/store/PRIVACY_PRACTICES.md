# Chrome Web Store privacy practices

Use this as the source of truth when completing the Developer Dashboard. Keep every answer consistent with the shipped build and public privacy policy.

## Single purpose

> VerityRead is a local AI reading assistant that reads user-selected content from the current webpage to provide summaries, grounded questions and answers, explanations, and translations on the user's device.

## User data disclosures

Select the following handled-data categories:

- Website content: page text and user-selected text needed for the requested reading action.
- Web history: only the active page URL/domain needed to identify and cite the page for the current user-requested action; no browsing history is built or transmitted.
- User-generated content: prompts, questions, and locally generated answers used for the requested task.

For all selected categories:

- Used only to provide the user-facing reading feature.
- Processed on the user's device by Chrome Built-in AI or sent only over loopback to the user's Ollama at `127.0.0.1:11434`.
- Not transmitted to the publisher, a developer-operated server, analytics, advertising, or another third party.
- Not sold.
- Not used for creditworthiness or lending.
- Not used for personalized advertising, retargeting, profiling, or unrelated purposes.
- Not accessed by humans.
- Optional summary cache and local history remain on the device and are off by default.

## Limited Use certification

Certify all dashboard statements:

- Data use is limited to the extension's disclosed single purpose and user-facing features.
- Data is not transferred except as required to provide that purpose. Version 0.1.0 makes no off-device transfer of page data.
- Data is not used or transferred for personalized advertising.
- Humans do not read user data.

The public policy contains an affirmative Chrome Web Store Limited Use statement:

https://craighsieh.github.io/VerityRead/privacy/

## Permission justifications

### `activeTab`

Provides one-time access to the current tab only after the user invokes VerityRead from the toolbar or starts a page action. It avoids persistent access to every visited page.

### `scripting`

Injects the page reader on demand into the active tab after a user action. VerityRead ships no always-on content script.

### `storage`

Stores local preferences, the privacy-consent version, and user-opted-in cache/history. Cache and history are disabled by default, and users can delete local data from the Privacy Center.

### `sidePanel`

Hosts the extension's user-facing reading assistant, settings, consent, status, sources, and privacy receipts.

### `contextMenus`

Lets the user explicitly send highlighted text to local explain, simplify, translate, or ask actions.

### Required host: `http://127.0.0.1:11434/*`

Connects only to Ollama on the same device. Version 0.1.0 rejects custom endpoints, `localhost`, LAN addresses, and alternate ports. The connection check sends no page content.

### Optional hosts: `http://*/*` and `https://*/*`

These declarations let Chrome offer runtime access for whichever normal website the user is currently viewing. VerityRead requests only the exact current origin (for example, `https://example.com/*`) after an explicit user gesture. It never requests or grants all sites at once; users can remove each exact-site grant in Settings. One-time use relies on `activeTab`.

## Remote code

No. All executable JavaScript is bundled in the extension package. Chrome-managed built-in AI models and user-managed Ollama models are data/model resources, not remotely hosted executable extension code.

## Authentication, payments, analytics, and ads

None. Version 0.1.0 has no account, authentication, payment flow, telemetry, analytics SDK, advertising SDK, or developer-operated backend.
