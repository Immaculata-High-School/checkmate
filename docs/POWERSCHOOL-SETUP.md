# PowerSchool Integration Setup Guide

This guide explains how to configure the PowerSchool integration for releasing grades from Checkmate to PowerSchool.

## Overview

The PowerSchool integration allows teachers to:
- Connect their PowerSchool teacher account via OAuth
- Link Checkmate classes to PowerSchool sections
- Release graded test scores directly to the PowerSchool gradebook

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│    Checkmate    │────▶│  PowerSchool API     │────▶│   PowerSchool   │
│   (SvelteKit)   │◀────│  Gateway (Flask)     │◀────│    Server       │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
```

The API Gateway (in the `APIs/` repo) handles:
- OAuth 2.0 authentication flow for teachers
- Teachers log in with their PowerSchool credentials
- Session management and auto-refresh
- Proxying API requests to PowerSchool

**No PowerSchool admin/plugin configuration is required.** Teachers simply log in with their existing PowerSchool credentials.

---

## Step 1: Deploy the PowerSchool API Gateway

The API Gateway (Flask app) must be deployed and accessible from the internet.

### Option A: Deploy to Railway (Recommended)

1. Push the `APIs/` folder to a GitHub repo (or use the existing one)
2. Create a new project on [Railway](https://railway.app)
3. Connect the GitHub repo
4. Add a PostgreSQL database (Railway Add-ons)
5. Set the environment variables:

```env
DATABASE_URL=<auto-set by Railway>
SECRET_KEY=<generate a random 64-char string>
ENCRYPTION_KEY=<generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">
```

6. Deploy and note the URL (e.g., `https://ps-api-production.up.railway.app`)

### Option B: Deploy to Other Platforms

Works with any platform that supports Python/Docker:
- Render
- Fly.io  
- Heroku
- AWS/GCP/Azure

```bash
cd APIs/
docker build -t powerschool-api-gateway .
# Push to your container registry and deploy
```

### Option C: Run Locally (Development)

```bash
cd APIs/
pip install -e .
flask run --host=0.0.0.0 --port=5000
```

For local dev, use [ngrok](https://ngrok.com) to expose it:
```bash
ngrok http 5000
# Note the https URL like https://abc123.ngrok.io
```

---

## Step 2: Register Your App in the API Gateway

The API Gateway has a developer portal where you register applications.

### Create a Developer Account

1. Go to your API Gateway URL (e.g., `https://ps-api.yourschool.com`)
2. Click **Developer Portal** or go to `/developer/register`
3. Register with an email and password
4. You may need an invite code from an admin

### Create a Teacher App

1. Log into the Developer Portal
2. Click **Create New App**
3. Fill in the details:
   - **App Name**: `Checkmate Grade Sync`
   - **App Type**: `Teacher` (important!)
   - **Redirect URIs**: Add your Checkmate callback URL (see below)
   - **Scopes**: Select all teacher scopes needed:
     - `teacher.profile`
     - `teacher.classes`
     - `teacher.students`
     - `teacher.assignments`
     - `teacher.assignments.write`
     - `teacher.grades`

4. Click **Create**
5. **Copy the Client ID and Client Secret** - you'll need these

---

## Step 3: Configure Redirect URIs

The **Redirect URI** is where teachers are sent after authorizing. It must point to your Checkmate app.

### What's the Redirect URI?

The redirect URI for Checkmate is always:
```
https://[your-checkmate-domain]/api/powerschool/callback
```

### Examples by Environment

| Environment | Redirect URI |
|-------------|--------------|
| Production | `https://checkmate.yourschool.com/api/powerschool/callback` |
| Staging | `https://staging-checkmate.yourschool.com/api/powerschool/callback` |
| Local Dev | `http://localhost:5173/api/powerschool/callback` |

### Adding the Redirect URI

In the API Gateway Developer Portal:
1. Edit your app
2. Add the redirect URI(s) to the list
3. Save

You can add multiple redirect URIs (e.g., for both production and staging).

---

## Step 4: Configure Checkmate Environment Variables

Add these to your Checkmate `.env` file:

```env
# URL of your deployed API Gateway
POWERSCHOOL_API_URL=https://ps-api.yourschool.com

# OAuth credentials from the Developer Portal
POWERSCHOOL_CLIENT_ID=app_xxxxxxxxxxxxxxxx
POWERSCHOOL_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

The redirect URI is automatically generated as `{your-checkmate-url}/api/powerschool/callback`.

### Variable Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `POWERSCHOOL_API_URL` | Base URL of your API Gateway | `https://ps-api.yourschool.com` |
| `POWERSCHOOL_CLIENT_ID` | App ID from Developer Portal | `app_abc123def456` |
| `POWERSCHOOL_CLIENT_SECRET` | Secret from Developer Portal | `secret_xyz789...` |

---

## Step 5: Database Migration

Run the Prisma migration to add the PowerSchool tables:

```bash
npx prisma db push
```

This creates three tables:
- `PowerSchoolToken` - Stores teacher OAuth tokens
- `PowerSchoolClassMapping` - Links Checkmate classes to PS sections  
- `PowerSchoolGradeRelease` - Tracks which grades have been released

---

## Step 6: Test the Integration

### 1. Connect a Teacher Account

1. Log into Checkmate as a teacher
2. Go to **Settings** (in the teacher nav)
3. Find the **PowerSchool Connection** section
4. Click **Connect PowerSchool**
5. You'll be redirected to the API Gateway's OAuth page
6. Enter your **PowerSchool district URL**, **username**, and **password**
7. Click **Authorize**
8. You'll be redirected back to Checkmate

### 2. Link Classes

After connecting:
1. In Settings, find "Link Classes to PowerSchool"
2. For each Checkmate class:
   - Select the matching PowerSchool section from the dropdown
   - Optionally set a default grade category
3. Click **Save** for each class

### 3. Release Grades

1. Go to a test's **Submissions** page
2. Make sure some submissions are graded
3. Click the **Release to PowerSchool** button
4. In the modal:
   - Select which linked class to release to
   - Enter the assignment name (as it will appear in PS)
   - Select a grade category
   - Set the due date
5. Click **Release Grades**
6. You'll see a success message with the count

Released submissions show a blue PowerSchool icon in the Status column.

---

## How It Works

### OAuth Flow

1. Teacher clicks "Connect PowerSchool" in Checkmate
2. Checkmate redirects to the API Gateway's `/oauth/teacher/authorize`
3. Teacher enters their PowerSchool credentials
4. API Gateway logs into PowerSchool and creates a session
5. API Gateway redirects back to Checkmate with an auth code
6. Checkmate exchanges the code for access/refresh tokens
7. Tokens are stored in the database

### Grade Release Flow

1. Teacher clicks "Release to PowerSchool"
2. Checkmate calls the API Gateway to:
   - Create an assignment (if it doesn't exist)
   - Match students by email
   - Update scores in PowerSchool
3. Checkmate records the release in `PowerSchoolGradeRelease`

### Token Refresh

- Access tokens expire after 1 hour
- Checkmate automatically refreshes them using the refresh token
- If refresh fails, teacher needs to reconnect

---

## Troubleshooting

### "PowerSchool not configured"

**Cause**: Environment variables not set.

**Fix**: Add all four `POWERSCHOOL_*` variables to your `.env` file and restart.

### "Invalid redirect URI"

**Cause**: The redirect URI in Checkmate's env doesn't match what's registered in the API Gateway.

**Fix**: 
1. Check `POWERSCHOOL_REDIRECT_URI` in your `.env`
2. Make sure it matches **exactly** in the API Gateway's app settings
3. Include protocol (http/https), domain, port, and path

### "Failed to connect to PowerSchool"

**Cause**: Can't reach the API Gateway.

**Fix**:
- Verify `POWERSCHOOL_API_URL` is correct
- Make sure the API Gateway is running
- Check for firewall/network issues

### "Invalid credentials" during OAuth

**Cause**: Wrong PowerSchool username/password.

**Fix**: 
- Use the teacher's PowerSchool login (same as PowerTeacher Portal)
- Make sure the district URL is correct (e.g., `https://district.powerschool.com`)

### "Student not found"

**Cause**: Student name in Checkmate doesn't match PowerSchool.

**Fix**:
- Student matching is done by **name**, not email (PowerSchool doesn't expose student emails to teachers)
- Ensure student names match between systems
- Names are matched flexibly: "John Smith", "Smith, John", etc. should all work
- Check that students are enrolled in the linked PowerSchool section

### No sections showing up

**Cause**: Teacher doesn't have any active sections in PowerSchool.

**Fix**:
- Verify teacher is assigned to sections in PowerSchool
- Check the current term/year

---

## Security Notes

1. **Teacher credentials are encrypted** - The API Gateway encrypts stored credentials using Fernet symmetric encryption
2. **Never share client secrets** - Keep `POWERSCHOOL_CLIENT_SECRET` private
3. **Use HTTPS** - Required for OAuth in production
4. **Tokens auto-expire** - Access tokens expire after 1 hour

---

## API Gateway Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/oauth/teacher/authorize` | GET/POST | OAuth authorization page |
| `/oauth/teacher/token` | POST | Token exchange and refresh |
| `/api/v1/teacher/me` | GET | Get teacher profile |
| `/api/v1/teacher/classes` | GET | List teacher's sections |
| `/api/v1/teacher/categories` | GET | Get grade categories |
| `/api/v1/teacher/classes/{id}/students` | GET | Get students in a section |
| `/api/v1/teacher/assignments` | POST | Create assignment |
| `/api/v1/teacher/scores/batch` | POST | Update multiple scores |

---

## Environment Variables Summary

### Checkmate

```env
POWERSCHOOL_API_URL=https://ps-api.yourschool.com
POWERSCHOOL_CLIENT_ID=app_xxxxxxxxxxxxxxxx
POWERSCHOOL_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

The redirect URI (`https://your-checkmate-domain/api/powerschool/callback`) is generated automatically from the request URL.

### API Gateway

```env
DATABASE_URL=postgresql://user:pass@host:5432/db
SECRET_KEY=<random-64-char-string>
ENCRYPTION_KEY=<fernet-key-from-python>
```

---

## Support

If you run into issues:
1. Check Checkmate server logs
2. Check API Gateway logs
3. Verify all environment variables
4. Make sure teacher has appropriate PowerSchool permissions

