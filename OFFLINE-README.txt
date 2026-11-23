TaxCollect - Offline preparation
================================

This project now includes a Service Worker that caches the application shell and same-origin app files as they are first loaded. This supports reopening the app offline after a successful initial visit while using its local features.

Important limitations:
- The first visit and initial cache setup require an internet connection.
- The AI Assistant calls /api/ai/chat and requires the server plus Gemini API/internet. It is not an offline AI model.
- Project export calls /api/export-project and requires the server.
- Browser/PWA offline installation requires HTTPS (or localhost). Opening index.html directly as a file will not enable Service Workers.
- Invoices, tax rules and preferences are stored in this browser's localStorage. Clearing browser/app data can erase them. Export/backup should be added before relying on it for important records.
- This is an offline-capable web app project, not yet an Android APK. Android packaging and offline testing are still required.

Suggested test:
1. Deploy/serve the app over HTTPS and open it while online.
2. Wait for the page to finish loading, then close and reopen it once online so the cache is populated.
3. Turn off Wi-Fi and mobile data, then reopen the installed PWA/shortcut.
4. Test calculator, invoice editing, reports, language and theme. The AI Assistant and server export are expected not to work offline.
