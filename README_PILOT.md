# Whop Pilot: Handover & Deployment Guide 🛫

The "Whop Pilot" assistant is now ready for production. This document summarizes the setup and deployment steps.

## Project Structure
- **Root**: Legacy "CourseRocket" logic (content generation focus).
- **`pilot/`**: New **Whop Pilot** (Mission Control & AI Mentor focus). This is the primary directory for current development.

## Environment Variables
Ensure the following variables are set in `pilot/.env.local`:

| Key | Description |
|-----|-------------|
| `WHOP_API_KEY` | Whop Creator API Key |
| `NEXT_PUBLIC_WHOP_APP_ID` | Your Whop App ID |
| `WHOP_REDIRECT_URI` | Auth redirect (usually `http://localhost:3000/api/auth/callback` for dev) |
| `GROQ_API_KEY` | Used for the AI Mentor ("Hocam" mode) |

## How to Run
1.  Navigate to the pilot directory: `cd pilot`
2.  Install dependencies: `npm install`
3.  Run development server: `npm run dev`
4.  Open `http://localhost:3000/dashboard/[your-company-id]`

## Submission for Whop App Store
- **New Description**: Use the content in `APP_STORE_DESCRIPTION.md`.
- **Targeting**: Focus on high-retention "Daily Management" rather than "One-off Generation".
- **Signals**: The app currently tracks:
  - Student Inactivity (completion rate 0%)
  - Abandoned Carts (open payments)
  - Forum Engagement (recent posts/comments)

## Deployment (Vercel)
The project is Next.js native. To deploy:
1.  Connect the `pilot/` directory to Vercel.
2.  Add the environment variables listed above.
3.  Set the Framework Preset to **Next.js**.
