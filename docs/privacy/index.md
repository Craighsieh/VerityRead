---
layout: page
title: VerityRead Privacy Policy
permalink: /privacy/
---

# VerityRead Privacy Policy

Effective date: July 26, 2026
Publisher: VerityRead
Support: [craighsieh@gmail.com](mailto:craighsieh@gmail.com)

Other languages:
[繁體中文](zh-TW) · [简体中文](zh-CN) · [日本語](ja) · [한국어](ko)

## Summary

VerityRead is a Chrome extension that summarizes the current page, answers
questions using page excerpts, and translates selected text. It processes this
content on the user's device through Chrome Built-in AI or through the user's
local Ollama service at `http://127.0.0.1:11434`.

VerityRead does not send page content, selected text, prompts, AI answers, page
titles, or page URLs to the publisher, cloud inference services, analytics
providers, advertisers, or data brokers.

## Data VerityRead accesses

Only after a user chooses a feature, VerityRead may temporarily access:

- readable text, headings, title, URL, and domain from the active page;
- text the user selects;
- questions or instructions entered by the user; and
- locally generated summaries, translations, answers, and source references.

This access is necessary to provide the extension's disclosed reading features.
VerityRead does not read pages continuously or collect browsing history in the
background.

## How data is processed

- **Chrome Built-in AI:** Content is processed by Chrome's on-device AI APIs.
- **Ollama:** Content is sent only to the user's own loopback service at
  `127.0.0.1:11434`.
- **Chrome translation and language detection:** Supported Chrome on-device APIs
  may detect or translate language locally.
- **No cloud fallback:** Version 0.1.0 has no cloud inference fallback.

Chrome may download or update model and language-pack files. Chrome Web Store
may update the extension. Those browser-managed network operations do not
include page content supplied by VerityRead.

## Storage and retention

By default, VerityRead does not save page content, selected text, prompts, AI
answers, or task history after the task.

The extension stores local preferences such as Provider choice, model name,
translation target, privacy-consent version, and site-access choices. Summary
caching is off by default. If the user explicitly enables it, the generated
summary and its page URL may be stored locally in IndexedDB until the user
clears the cache, clears all local data, or uninstalls the extension.

Users can clear the cache, history store, or all extension data from Privacy
Center. Version 0.1.0 does not write task-history entries.

## Permissions

- `activeTab` and `scripting`: read the active page only after a user action.
- Optional exact-site access: a user may explicitly allow persistent access to
  the current website and may revoke it later.
- `storage`: save local preferences and an opt-in summary cache.
- `sidePanel`: display the main interface.
- `contextMenus`: provide user-invoked actions for selected text.
- `http://127.0.0.1:11434/*`: communicate only with the user's local Ollama
  service.

VerityRead does not request access to every website at installation time.

## Sharing, sale, advertising, and human access

The publisher does not receive, sell, rent, share, or use extension user data
for advertising, credit decisions, profiling, or unrelated purposes. The
publisher and other humans cannot read page content processed locally by the
extension.

The use of information received from Chrome APIs will adhere to the Chrome Web
Store User Data Policy, including the Limited Use requirements.

## Security

The extension restricts network access to browser-managed updates and the
Ollama loopback endpoint, bundles executable code with the extension, treats
page content and model output as untrusted text, and provides an Offline Lock.
Loopback traffic remains on the user's device.

## Changes and contact

If data practices change, VerityRead will update this policy and provide an
in-product disclosure before the new practice takes effect. Questions or
privacy requests may be sent to
[craighsieh@gmail.com](mailto:craighsieh@gmail.com).
