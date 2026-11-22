# IDLETOIDEA

A makerspace equipment and workspace sharing platform for organizations, workshops, and independent makers.

## Features
- **Public Discovery**: Visitors can browse, search, and filter active listings without signing in.
- **Role-Based Access**: Visitors, Requesters, Equipment Owners/Organizations, Supervisors, and Admins backed by Firebase Authentication and Firestore security rules.
- **Safety & Eligibility**: Risk-level badges, custom safety quizzes, supervisor approvals, and safety policy acknowledgments.
- **Fair Booking & Waitlist**: Transactional booking cap enforcement, slot overlap prevention, FIFO waitlist offers, and cancellation handling.
- **Handover & Incident Tracking**: Check-out and return condition inspections, append-only audit logs, and advisory Gemini AI incident summaries (`AI-generated, advisory only`).
- **External Payment / Booking Support**: Listings never process in-app payments; owners can publish optional pricing notes and an external booking link or contact email.

## Prerequisites
- Node.js 18+
- A Firebase project with **Authentication** and **Cloud Firestore** enabled (configured in `firebase-applet-config.json`).
- (Optional) A Gemini API key set as `GEMINI_API_KEY` on the server for AI-assisted matching and incident summaries.

## Local Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` if running locally outside AI Studio and set `GEMINI_API_KEY` (optional) and `APP_URL`.
3. Start the development server (runs Express + Vite on port `3000`):
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

## Firebase Configuration Steps
1. **Enable Sign-In Providers**:
   - Open the **Firebase Console** -> **Authentication** -> **Sign-in method**.
   - Enable **Email/Password** and **Google** providers.
2. **Deploy Security Rules**:
   - Ensure `firestore.rules` is deployed to your Firestore database.
3. **Configure the First Admin (No Hardcoded Accounts)**:
   - Sign up in the app with your admin email address and verify your email.
   - Open **Firebase Console** -> **Firestore Database**.
   - Locate your user document in `users/{your_uid}` and change `role` from `"requester"` to `"admin"` (or create a document at `admins/{your_uid}` with `{ "active": true }`).
   - Sign back in to access the **Admin & Audit** dashboard, verify owners, and assign roles (`owner`, `supervisor`, `requester`, `admin`).

## Customizing Static & Placeholder Content
- Update the **About**, **Terms**, **Privacy**, and **Contact** sections in `src/pages/StaticPages.tsx` before launching publicly.
- Replace `GEMINI_API_KEY` via your hosting environment's secret manager (never expose server API keys in client `VITE_*` variables).
