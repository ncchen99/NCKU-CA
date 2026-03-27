# NCKU-CA

NCKU-CA is an open-source CMS platform built on Firebase and Next.js.
It includes both frontend and backend systems, and this repository is currently used by the NCKU Club Association (NCKU-CA).

If you need Chinese documentation (中文的文件), please read: [README.zh-TW.md](README.zh-TW.md)

## Core Features

- Basic website content editing
- Article publishing (news and activity posts)
- Custom form builder and form submission
- Attendance tracking and deposit management

## Interface Demo

| Interface          | Image                                               |
| ------------------ | --------------------------------------------------- |
| 1. Homepage        | ![Homepage](data/assets/images/demo1-en.png)        |
| 2. News            | ![News](data/assets/images/demo2-en.png)            |
| 3. Article Section | ![Article Section](data/assets/images/demo3-en.png) |
| 4. Admin Dashboard | ![Admin Dashboard](data/assets/images/demo4-en.png) |

## Why This Stack

- Deploy on Vercel and use Firebase as the backend.
- Use Cloudflare R2 as the image hosting service.
- Users can customize this CMS system based on their own organizational and workflow needs.
- With ISR and SSG, backend load is relatively low, helping increase practical traffic capacity as much as possible within Vercel free-tier limits.

Under baseline usage, this combination can run at zero cost on free tiers.
For self-hosted CMS scenarios, it is a practical low-cost architecture before traffic grows large.

## Tech Stack

- Frontend/Backend: Next.js (App Router)
- Database: Firebase Firestore
- Authentication: Firebase Authentication + session flow
- Storage: Firebase Storage and optional Cloudflare R2 for images

## Project Structure

- `web/`: Main web application (public site, admin pages, APIs)
- `scripts/`: Data sync and seed scripts
- `data/`: Static and source content files

## Quick Start

1. Install dependencies

```bash
cd web
npm install
```

2. Create environment file

```bash
copy .env.example .env
```

3. Fill required Firebase variables in `web/.env`

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64`

4. Run development server

```bash
cd web
npm run dev
```

5. (Optional) Seed initial data

```bash
cd web
npm run seed
```

## I18n (Optional)

This project supports optional multilingual UI switching (Traditional Chinese and English).
To enable language switcher in the UI:

```bash
NEXT_PUBLIC_ENABLE_I18N=true
NEXT_PUBLIC_DEFAULT_LOCALE=zh-TW
```

`NEXT_PUBLIC_DEFAULT_LOCALE` controls the default locale (`zh-TW` or `en`).
If disabled (default), the language switcher is hidden and the site uses Traditional Chinese.
Although the UI supports multilingual switching, current article content is primarily written in Chinese, so Chinese text may still appear in content sections.

## Deployment and Configuration

You can deploy this project to any platform that supports Next.js + Node.js and can access Firebase services.

Recommended deployment checklist:

1. Prepare production Firebase project (Firestore + Auth + service account)
2. Set all required environment variables in your deployment platform
3. Build and start

```bash
cd web
npm run build
npm run start
```

4. Apply Firestore and Storage rules from `firebase/`
5. Verify admin login, content editing, form submission, attendance, and deposit workflows

This English README focuses on how to use this open-source system and how to deploy/configure it yourself.
