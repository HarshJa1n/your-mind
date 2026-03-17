# YourMind

YourMind is a multilingual second-brain app built with Next.js, Supabase, Gemini, Chroma, and Lingo.dev.

It lets users save URLs, notes, images, and audio, then:
- summarize and categorize them with AI
- translate titles, summaries, tags, and full content
- search across languages
- browse a card-based visual memory space

## What’s Shipped

- Email/password and Google auth with language preference
- URL save pipeline with Gemini URL Context first, local extraction fallback second
- Notes, image upload, and audio upload flows
- Card-aware dashboard UI with masonry layout and infinite scroll
- Full-content item detail view with on-demand translation and cache
- Semantic search backed by Chroma
- Native multimodal embeddings for image and audio items
- Supabase-backed thumbnail storage for uploaded images
- Locale-routed UI with `en`, `hi`, `es`, `fr`, `de`, and `ja`
- Chrome extension for one-click URL save

## Stack

- Next.js 16 App Router
- React 19
- Supabase Auth, Postgres, and Storage
- Chroma Cloud
- Gemini 2.5 Flash / Gemini 2.0 Flash
- Gemini Embedding 2 Preview
- Lingo.dev SDK + GitHub i18n workflow
- Tailwind CSS
- Vitest

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
LINGO_API_KEY=
LINGODOTDEV_API_KEY=
CHROMA_API_KEY=
CHROMA_TENANT=
CHROMA_DATABASE=
```

Run the app:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Build production:

```bash
npm run build
```

## Supabase Notes

This repo expects the Supabase migrations in [`/Users/appointy/code/your-mind/supabase/migrations`](/Users/appointy/code/your-mind/supabase/migrations) to be applied.

Important shipped migrations:
- `20260312171134_initial_schema.sql`
- `20260315234000_card_type_system.sql`
- `20260315235500_create_uploads_bucket.sql`

The `uploads` bucket is used for image thumbnails and should be public.

## Search and Embeddings

- Text items are embedded as text with Gemini Embedding 2
- Image and audio items now use native multimodal embeddings
- UI-facing titles, summaries, and tags are still generated separately for display and translation
- Search queries remain text queries, but they operate against the same vector space in Chroma

## i18n

Static UI strings live in [`/Users/appointy/code/your-mind/locales`](/Users/appointy/code/your-mind/locales).

This repo is set up to translate locale changes on push to `main` via:

- [`.github/workflows/i18n.yml`](/Users/appointy/code/your-mind/.github/workflows/i18n.yml)

The local `lingo.dev` CLI is configured in the project, but on this machine it may fail with a platform error. In that case, pushing source-string changes to `main` is the intended path so the GitHub workflow can fill missing locale keys.

## Chrome Extension

The extension lives in [`/Users/appointy/code/your-mind/chrome-extension`](/Users/appointy/code/your-mind/chrome-extension).

It redirects the current page into the web app save flow using `?save=<url>`.

## Project Structure

- [`/Users/appointy/code/your-mind/src/app`](/Users/appointy/code/your-mind/src/app): routes, pages, and API handlers
- [`/Users/appointy/code/your-mind/src/components`](/Users/appointy/code/your-mind/src/components): UI building blocks
- [`/Users/appointy/code/your-mind/src/lib`](/Users/appointy/code/your-mind/src/lib): pipeline, Gemini, Chroma, i18n, Supabase helpers
- [`/Users/appointy/code/your-mind/locales`](/Users/appointy/code/your-mind/locales): locale JSON
- [`/Users/appointy/code/your-mind/supabase`](/Users/appointy/code/your-mind/supabase): Supabase config and migrations

## Verification

Latest local verification before this README update:

- `npm test` passed
- `npm run build` passed

