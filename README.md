# Cel-Ron Enterprises Pte Ltd — Digital Card, Document Sharing, AI Card Scanner & Reception Visitor Diary System

> **A complete enterprise digital business card, marine catalogue distribution, AI business card scanner, and realtime visitor diary platform built for Cel-Ron Enterprises Pte Ltd, Singapore.**

---

## ⚓ Table of Contents
1. [Overview & Highlights](#-overview--highlights)
2. [Project Architecture & Monorepo Structure](#-project-architecture--monorepo-structure)
3. [Step 1: Supabase Setup (1-Click Database Setup)](#step-1-supabase-setup-1-click-database-setup)
4. [Step 2: Admin Password & Staff Accounts](#step-2-admin-password--staff-accounts)
5. [Step 3: Storage Buckets & Permissions](#step-3-storage-buckets--permissions)
6. [Step 4: Deploying Supabase Edge Functions](#step-4-deploying-supabase-edge-functions)
7. [Step 5: Meta WhatsApp Cloud API & Coexistence Setup](#step-5-meta-whatsapp-cloud-api--coexistence-setup)
8. [Step 6: Deploying the Web Application (Vercel)](#step-6-deploying-the-web-application-vercel)
9. [Step 7: Building & Installing the Mobile App (Expo & EAS Build)](#step-7-building--installing-the-mobile-app-expo--eas-build)
10. [Step 8: Singapore PDPA 12-Month Data Retention Compliance](#step-8-singapore-pdpa-12-month-data-retention-compliance)
11. [Master Feature Guide & Testing Checklist](#-master-feature-guide--testing-checklist)

---

## 🌟 Overview & Highlights

- **Company**: Cel-Ron Enterprises Pte Ltd (Singapore Marine Spare Parts, Pumps, Valves, Engine Components).
- **Office Location**: 10 Jalan Besar, #03-05 Sim Lim Tower, Singapore 208787.
- **WhatsApp Business Hotline**: `+65 8196 2270`.
- **System Owner Email**: `celron.simlim0305@gmail.com`.
- **Primary Design Aesthetic**: Clean, modern marine executive theme (`#06101E` dark navy, `#0A2540` oceanic blue, emerald `#059669`, and gold accents).

### Core Capabilities:
1. **Digital Business Cards (`/c/[code]` & `/t/[slug]`)**: Instant mobile landing page with 1-tap Call, WhatsApp, Email, vCard 3.0 phone contact download, document previews, and lead capture.
2. **Marine Document Management**: Upload product catalogues, pump line sheets, and quality certificates with ordering, category filtering, and public share toggles.
3. **Share Flow & Dynamic QR**: Instant QR code generator with screen auto-max brightness, document checklist bundling, native OS share sheet, and **Offline vCard QR mode** (works at sea or in engine rooms without internet).
4. **Physical NFC Card Programming & Android Tap Mode**: Write NDEF URLs to standard NFC tags (NTAG213 / 215 / 216), hardware UID logging, read-only lock toggle, test reader, lost card deactivation, and Android phone-to-phone Host Card Emulation (HCE).
5. **AI Camera Business Card Scanner**: 2-step capture (Front + optional Back), Gemini Flash 1.5 multi-modal OCR, field confidence scoring, duplicate phone/name detection, and 1-tap export to native iOS/Android phone contacts.
6. **Realtime Reception Visitor Diary**:
   - **Printable A4 Reception Poster (`/admin/visit-qr`)**: Dual QR signage for reception acrylic stands.
   - **WhatsApp QR Check-In**: Pre-fills `[VISIT]` greeting to Cel-Ron WhatsApp Business (`+65 8196 2270`), auto-replies with details link.
   - **Web Fallback Check-In (`/visit`)**: For walk-ins or visitors without WhatsApp.
   - **Details Completion (`/visit/[visit_code]`)**: Captures company/vessel, purpose, host staff, party size, and explicit PDPA consent.
   - **Mobile Live Diary Screen**: Live realtime updates, active visitor count, source badges (WhatsApp, Web, Walk-In), quick actions (Call, WhatsApp, Send Card, Scan Card, Check Out), and manual walk-in entry modal.
7. **Analytics, Leads & PDPA Auto-Delete**: Scan channel distribution (QR vs NFC vs Link), prospective lead follow-ups, 1-tap CSV exports, and automated Singapore PDPA 12-month visitor data purge.

---

## 📁 Project Architecture & Monorepo Structure

```text
visitorDiary+HpNoScanner/
├── mobile/                        # Expo 52 React Native Mobile App (Staff)
│   ├── app/
│   │   ├── (auth)/login.tsx       # Staff Login & 1-tap demo logins
│   │   ├── (tabs)/
│   │   │   ├── index.tsx          # Home dashboard & action shortcuts
│   │   │   ├── scan.tsx           # AI Business Card Camera Scanner
│   │   │   ├── visitors.tsx       # Realtime Reception Visitor Diary
│   │   │   └── profile.tsx        # Profile, NFC slug & system status
│   │   ├── contacts.tsx           # Scanned business cards directory
│   │   ├── documents.tsx          # PDF catalogue & line sheet admin
│   │   ├── leads-stats.tsx        # Analytics, leads & PDPA compliance
│   │   ├── nfc-card.tsx           # Physical NFC tag writer & Android tap mode
│   │   └── share.tsx              # QR generator, pack selector & offline QR
│   ├── src/
│   │   ├── context/AuthContext.tsx# Offline caching & auth state
│   │   ├── lib/
│   │   │   ├── cardScanner.ts     # Gemini Flash OCR client & phone contacts
│   │   │   ├── documents.ts       # Document upload & storage client
│   │   │   ├── nfc.ts             # NFC Manager & HCE tap emulation
│   │   │   ├── notifications.ts   # Expo push token registration
│   │   │   ├── shareLinks.ts      # Short code & pack link generator
│   │   │   ├── stats.ts           # Analytics metrics, CSV exports & PDPA
│   │   │   ├── supabase.ts        # Resilient Supabase client with offline fallback
│   │   │   ├── vcard.ts           # Compliant vCard 3.0 formatter
│   │   │   └── visitors.ts        # Realtime diary sync & walk-ins
│   │   └── types.ts               # Shared TypeScript schemas
│   ├── app.json                   # Expo config, NFC plugins & permissions
│   └── eas.json                   # EAS Build config (APK preview & production)
│
├── web/                           # Next.js 16 App Router Web Application (Public)
│   ├── src/app/
│   │   ├── admin/visit-qr/page.tsx# Printable A4 reception poster with dual QRs
│   │   ├── api/vcard/
│   │   │   ├── [code]/route.ts    # Dynamic vCard 3.0 download endpoint
│   │   │   └── t/[slug]/route.ts  # Permanent NFC slug vCard download
│   │   ├── c/[code]/page.tsx      # Public QR / link card page
│   │   ├── t/[slug]/page.tsx      # Permanent physical NFC tap page
│   │   ├── visit/
│   │   │   ├── [visit_code]/page.tsx # WhatsApp check-in details completion
│   │   │   └── page.tsx           # Standalone web fallback check-in form
│   │   ├── layout.tsx             # Root layout with Inter font & metadata
│   │   └── page.tsx               # Cel-Ron corporate gateway
│   └── src/components/
│       ├── CardView.tsx           # Mobile-responsive digital card layout
│       └── LeadForm.tsx           # Interactive client inquiry form
│
└── supabase/                      # Supabase Database & Edge Functions
    ├── functions/
    │   ├── extract-card/          # Gemini Flash multi-modal card OCR
    │   ├── notify/                # High-priority Expo push notification dispatcher
    │   └── whatsapp-webhook/      # Meta webhook handshake, deduplication & auto-reply
    ├── migrations/                # Version-controlled SQL migration scripts
    │   ├── 20260929000001_initial_schema.sql
    │   ├── 20260929000002_storage_setup.sql
    │   ├── 20260929000003_rpc_functions.sql
    │   ├── 20260929000004_rls_policies.sql
    │   └── 20260929000005_pdpa_cleanup.sql
    ├── setup_database.sql         # 1-CLICK ALL-IN-ONE SQL SCRIPT FOR SUPABASE
    └── seed.sql                   # Sample Cel-Ron company, staff, docs & visits
```

---

## Step 1: Supabase Setup (1-Click Database Setup)

You do **not** need to run migrations one by one. An all-in-one setup script is provided.

1. Go to [supabase.com](https://supabase.com) and log in with **`celron.simlim0305@gmail.com`**.
2. Click **"New Project"**:
   - **Name**: `celron-marine-diary`
   - **Database Password**: Choose a strong password and save it securely.
   - **Region**: **Singapore (ap-southeast-1)** (Lowest latency for Cel-Ron).
   - **Pricing Plan**: Free or Pro.
3. Once the project finishes provisioning (~2 minutes):
   - In the left sidebar, click the **SQL Editor** (icon with `>_`).
   - Click **"New Query"**.
   - Open [`supabase/setup_database.sql`](file:///c:/Users/ADMIN/Antigravity_Projects/visitorDiary+HpNoScanner/supabase/setup_database.sql) from this repository, copy the entire contents, and paste it into the SQL Editor.
   - Click **"Run"** (or press `Ctrl+Enter` / `Cmd+Enter`).
4. **Result**: All 11 tables, storage buckets, stored procedures (RPCs), Row Level Security (RLS) policies, seed company profile, and Singapore PDPA auto-cleanup functions are created instantly.

---

## Step 2: Admin Password & Staff Accounts

To ensure security, passwords are never hardcoded in scripts. The seed script pre-registers the following staff accounts:

| Email | Full Name | Role | Staff Slug | Phone |
| :--- | :--- | :--- | :--- | :--- |
| **`celron.simlim0305@gmail.com`** | Cel-Ron Operations Admin | `admin` | `admin` | `+65 8196 2270` |
| **`ronald.tan@celron.com.sg`** | Ronald Tan | `staff` | `ronald-tan` | `+65 9123 4567` |
| **`celine.lim@celron.com.sg`** | Celine Lim | `staff` | `celine-lim` | `+65 9234 5678` |

### How to Set or Reset Passwords in Supabase:
1. In your Supabase Dashboard, go to **Authentication** -> **Users**.
2. Find `celron.simlim0305@gmail.com`.
3. Click the three dots `...` on the right side of the row -> Click **"Send Password Reset Email"** (or click **"Edit user"** -> set a password directly).
4. Repeat for Ronald Tan and Celine Lim if they will be logging in with email and password.
5. *(Note: The mobile app also includes 1-tap **"Demo Mode"** buttons on the login screen for testing without credentials!)*

---

## Step 3: Storage Buckets & Permissions

The setup script automatically configures the two required Supabase Storage buckets:

1. **`documents` (Public Bucket)**:
   - Used for: Marine catalogues, pump brochures, line sheets, and quality certificates.
   - Max file size: 25MB (PDF, PNG, JPG).
   - Public access: Anyone with the card link can view or download documents.
2. **`scanned-cards` (Private Bucket)**:
   - Used for: Photos of business cards captured by staff using the AI scanner.
   - Max file size: 15MB.
   - Access: Authenticated staff only.

### Verification in Supabase Dashboard:
- Go to **Storage** in the left sidebar.
- Confirm both `documents` (marked "Public") and `scanned-cards` (marked "Private") appear in the list.

---

## Step 4: Deploying Supabase Edge Functions

There are three Edge Functions in `/supabase/functions`:
1. `extract-card`: Uses Gemini Flash 1.5 multi-modal AI to extract business card details.
2. `whatsapp-webhook`: Receives Meta Cloud API check-in webhooks and sends auto-replies.
3. `notify`: Dispatches high-priority push notifications to staff via the Expo Push API.

### 1. Set Function Secrets in Supabase
In Supabase Dashboard -> **Project Settings** -> **Edge Functions** -> **Secrets** (or via Supabase CLI), add:

```ini
GEMINI_API_KEY=your_gemini_api_key_from_aistudio
WHATSAPP_ENABLED=true
WHATSAPP_PHONE_NUMBER_ID=your_meta_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_meta_system_user_token
WHATSAPP_APP_SECRET=your_meta_app_secret
WHATSAPP_VERIFY_TOKEN=celron_visitor_secret_verify_token
NEXT_PUBLIC_APP_URL=https://celron.com.sg
```

> **Tip**: If you do not have Meta WhatsApp credentials yet, set `WHATSAPP_ENABLED=false`. The system will safely log auto-replies in test mode without throwing errors.

### 2. Deploy Functions via Terminal
Run the following commands using the Supabase CLI:

```bash
# Log in to your Supabase account
npx supabase login

# Link to your project (found in Project Settings -> General -> Reference ID)
npx supabase link --project-ref your-project-ref

# Deploy the 3 Edge Functions
npx supabase functions deploy extract-card --no-verify-jwt
npx supabase functions deploy whatsapp-webhook --no-verify-jwt
npx supabase functions deploy notify --no-verify-jwt
```

---

## Step 5: Meta WhatsApp Cloud API & Coexistence Setup

### How "WhatsApp Coexistence" Works for Cel-Ron
Cel-Ron uses the official company phone number: **`+65 8196 2270`**.
With **Meta Cloud API Coexistence**, Cel-Ron staff can **continue using the physical WhatsApp Business mobile app** on the office phone for normal customer conversations, while simultaneously having the Cloud API receive reception check-in messages in the background!

### Step-by-Step Meta Configuration:
1. Log in to [developers.facebook.com](https://developers.facebook.com) with the business Facebook account.
2. Go to **My Apps** -> **Create App** -> Select **"Business"** -> Name it `Cel-Ron Reception Diary`.
3. Add the **WhatsApp** product.
4. Under **WhatsApp** -> **Configuration**:
   - **Callback URL**: `https://<YOUR-PROJECT-REF>.supabase.co/functions/v1/whatsapp-webhook`
   - **Verify Token**: Enter `celron_visitor_secret_verify_token` (matches your `WHATSAPP_VERIFY_TOKEN`).
   - Click **"Verify and Save"**.
5. Under **Webhook Fields**, click **Manage** -> Check **`messages`** -> Click **Done**.
6. Under **API Setup**:
   - Connect the phone number `+65 8196 2270` via Embedded Signup (select "Use alongside WhatsApp Business App" for Coexistence).
   - Copy the **Phone Number ID** and generate a permanent **System User Access Token**.
   - Add these values into your Supabase Edge Function Secrets.

---

## Step 6: Deploying the Web Application (Vercel)

The web application powers the public digital business cards (`/c/[code]`, `/t/[slug]`), the fallback check-in form (`/visit`), the WhatsApp completion page (`/visit/[visit_code]`), and the reception poster (`/admin/visit-qr`).

### Deploy to Vercel in 4 Steps:
1. Push your repository to GitHub.
2. Go to [vercel.com](https://vercel.com) -> Click **"Add New Project"** -> Import this repository.
3. Configure the project:
   - **Root Directory**: Click `Edit` and select **`web`**.
   - **Framework Preset**: `Next.js` (automatically detected).
4. Add **Environment Variables**:
   ```ini
   NEXT_PUBLIC_SUPABASE_URL=https://<YOUR-PROJECT-REF>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   NEXT_PUBLIC_BASE_URL=https://celron.com.sg
   NEXT_PUBLIC_COMPANY_WHATSAPP=+6581962270
   ```
5. Click **"Deploy"**.
6. *(Optional)* Add your custom domain `celron.com.sg` under **Settings** -> **Domains**.

---

## Step 7: Building & Installing the Mobile App (Expo & EAS Build)

The mobile application is built with Expo Dev Client and EAS Build to support physical hardware features like NFC read/write and native camera AI scanning.

### Local Development Running:
```bash
# Navigate to mobile directory
cd mobile

# Copy environment template and fill in your Supabase credentials
cp .env.example .env

# Install dependencies
npm install

# Start development build server
npx expo start --dev-client
```

### Generating an Installable Android APK (`.apk`):
To install the app directly onto staff Android phones (Samsung, Google Pixel, etc.) without Google Play Store approval:

```bash
# 1. Install EAS CLI globally if not already installed
npm install -g eas-cli

# 2. Log in to your Expo account
eas login

# 3. Configure EAS Build (uses mobile/eas.json already included)
cd mobile
eas build -p android --profile preview
```
Once the build completes (~5 minutes in the cloud), EAS will provide a **direct download link and QR code**. Scan the QR code with any staff phone to install the APK directly!

---

## Step 8: Singapore PDPA 12-Month Data Retention Compliance

Under Singapore Personal Data Protection Act (PDPA 2012) and Advisory Guidelines on the PDPA for Identification Data:
- **No NRIC / FIN Storage**: Cel-Ron's check-in forms never request or store NRIC or FIN numbers.
- **Explicit Consent**: Every visitor check-in displays explicit PDPA consent text stating data is collected solely for premise safety and building security.
- **12-Month Automated Purge**: Visitor check-in logs and WhatsApp audit records older than 12 months are purged.
- **Business Contact Exemption**: Business cards scanned into the company directory are classified as Business Contact Information (BCI) voluntarily exchanged and are safely preserved.

### How to Run or Schedule the 12-Month Purge:
1. **From the Staff Mobile App**:
   - Open **Analytics & Leads** (`/leads-stats`) -> Tap the **"PDPA"** tab.
   - Tap **"Run PDPA 12-Month Purge"** -> Confirm.
2. **From Supabase SQL Editor / Cron**:
   - Run SQL command:
     ```sql
     SELECT public.purge_expired_visitor_data(12);
     ```
   - To schedule it to run automatically on the 1st of every month using `pg_cron`:
     ```sql
     SELECT cron.schedule('pdpa-monthly-cleanup', '0 0 1 * *', 'SELECT public.purge_expired_visitor_data(12)');
     ```

---

## 📋 Master Feature Guide & Testing Checklist

Use this checklist to test and verify every feature end-to-end:

### 1. Digital Business Card & Leads
- [ ] Open `https://celron.com.sg/c/RONALD-T` (or `http://localhost:3000/c/RONALD-T`).
- [ ] Verify profile photo, job title (*Marine Sales Director*), and Cel-Ron logo render cleanly.
- [ ] Tap **"Save Contact (vCard)"** -> Verify it downloads a `.vcf` file with Ronald Tan's details.
- [ ] Scroll to **"Leave a Message / Request Quote"** -> Enter test inquiry -> Tap **Send**.
- [ ] Confirm submission is logged in the `leads` table and appears immediately in the mobile app under **Analytics & Leads -> Leads**.

### 2. NFC Card Programming & Tap Mode
- [ ] In the mobile app, tap **Physical NFC Card** (`/nfc-card`).
- [ ] Select staff profile -> Tap **"Write Card"** -> Hold standard NTAG213/215/216 sticker to phone back -> Verify success beep and hardware UID logged.
- [ ] Test the written card by tapping it against any standard iPhone or Android phone -> Confirm it opens `https://celron.com.sg/t/ronald-tan` directly in the browser!
- [ ] Toggle **"Android Phone Tap Mode"** (HCE) -> Hold another phone against it -> Confirm it opens the card page without physical stickers.

### 3. AI Business Card Camera Scanner
- [ ] In the mobile app, tap the **Scan Card** bottom tab (`/(tabs)/scan`).
- [ ] Snap front of a business card (or pick from photo library) -> Snap optional back.
- [ ] Tap **"Extract with Gemini AI"** -> Watch the 2-step visual progress.
- [ ] Verify extracted fields (Full Name, Company, Job Title, Mobile, Office Phone, Email, Website, Products).
- [ ] Notice any low-confidence fields highlighted in yellow for review.
- [ ] Tap **"Save Contact"** -> Contact is saved to company directory.
- [ ] Tap **"Add to Phone Contacts"** -> Confirm contact is added to native phone address book.

### 4. Reception Visitor Diary (WhatsApp + Web Fallback)
- [ ] Open the A4 Reception Poster (`/admin/visit-qr`) -> Click **"Print Poster (A4)"** to test print layout.
- [ ] **Test Web Fallback**:
  - Scan or open `/visit`.
  - Fill in Name: `Capt. Johnathan Goh`, Phone: `+65 9876 5432`, Company: `Keppel Shipyard`, Host: `Ronald Tan`.
  - Tap **"Check In"** -> Verify instant confirmation with Visit Code.
  - Open staff mobile app under **Visitors** tab -> Confirm arrival appears live in the list!
- [ ] **Test WhatsApp Check-In**:
  - Send message `[VISIT] Hello Cel-Ron, I am visiting today` to `+65 8196 2270`.
  - Verify receipt in `whatsapp_messages` and auto-reply message received with `/visit/[visit_code]` link.
  - Tap the link -> Complete company and party size -> Tap **Confirm**.
  - In staff mobile app, verify visitor card status updates from active to completed.

### 5. Check-Out & Quick Actions
- [ ] On the visitor card in the mobile app, tap **"Call"** -> Initiates phone call.
- [ ] Tap **"WhatsApp"** -> Opens WhatsApp with customized greeting.
- [ ] Tap **"Send Card"** -> Shares Cel-Ron digital business card.
- [ ] Tap **"Check Out"** -> Confirms check-out -> Badge changes to "Departed" with timestamp.

### 6. One-Tap CSV Data Exports
- [ ] In mobile app, open **Leads & Stats** (`/leads-stats`).
- [ ] Tap **"Export Client Leads CSV"** -> Native share sheet opens -> Verify clean CSV with contact inquiries.
- [ ] Tap **"Export Visitor Diary CSV"** -> Verify check-in/out timestamps and host details.
- [ ] Tap **"Export Scanned Business Cards"** -> Verify contacts directory export.

---

## 📞 Support & Maintenance

- **Company**: Cel-Ron Enterprises Pte Ltd
- **Address**: 10 Jalan Besar, #03-05 Sim Lim Tower, Singapore 208787
- **Admin Inquiries**: `celron.simlim0305@gmail.com`
- **WhatsApp Support Hotline**: `+65 8196 2270`
