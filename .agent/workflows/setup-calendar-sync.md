
---
description: Setup Calendar Synchronization (Google & Outlook)
---

# Calendar Sync Setup Guide

This guide explains how to configure the backend and frontend for the new Two-Way Calendar Sync feature.

## 1. Supabase Authentication Setup

To enable Calendar Sync, you must configure the OAuth providers in Supabase dashboard.

### Google Calendar
1. Go to **Supabase Dashboard** -> **Authentication** -> **Providers**.
2. Enable **Google**.
3. Enter your **Client ID** and **Client Secret** from Google Cloud Console.
4. Under **Scopes**, add: `https://www.googleapis.com/auth/calendar.events`.
   - *Note*: You might need `https://www.googleapis.com/auth/calendar` for full access if `calendar.events` is insufficient for listing calendars.
5. In **Google Cloud Console**, ensure the "Google Calendar API" is enabled.

### Outlook (Microsoft) Calendar
1. Go to **Supabase Dashboard** -> **Authentication** -> **Providers**.
2. Enable **Azure (Microsoft)**.
3. Enter your **Application (client) ID** and **Secret** from Azure Portal.
4. Under **Scopes**, add: `Calendars.ReadWrite offline_access`.
   - `offline_access` is crucial for getting a specific refresh token if using the OAuth flow manually, though Supabase handles the session.

## 2. Database Migration

Run the new migration file to create the `calendar_integrations` table:

```bash
supabase db push
# OR if local
supabase migration up
```

## 3. Environment Variables

Ensure your `.env` contains the standard Supabase credentials. No new custom env vars are strictly required for the client-side logic as it relies on Supabase Auth, but usually you need:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## 4. Usage

1. Navigate to `/integrations`.
2. Click "Connect" on Google or Outlook.
3. Authenticate and grant permissions.
4. The system will now:
   - **Export**: Push new bookings to your external calendar.
   - **Import**: Check your external calendar for "Busy" slots when others try to book you.

## 5. Troubleshooting "Free Tier" Limits

- **Google**: Free tier has generous quotas (1,000,000 queries/day).
- **Outlook**: Microsoft Graph API is free for personal/delegated access.
- **Supabase**: Edge Functions and Database have generous free tiers.

If Sync fails, check the browser console. The `CalendarService` logs synchronization errors to the console.
