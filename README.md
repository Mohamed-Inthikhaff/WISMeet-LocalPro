# Meeting Assistant Platform

A comprehensive video conferencing platform built with Next.js, Stream Video SDK, and Clerk authentication, featuring an advanced Mortgage Meeting Assistant Bot with AI-powered transcript summarization, calendar integration, and automated email workflows.

## Features

### Core Platform Features
- HD video and audio conferencing
- Real-time chat during meetings
- Meeting scheduling and management
- Personal meeting rooms
- Screen sharing capabilities
- Meeting recordings
- Participant management

### Mortgage Meeting Assistant Bot (Phase 2)
- **AI-Powered Transcript Summarization**: Uses Gemini AI to analyze mortgage meeting transcripts and extract key information
- **Smart Follow-up Scheduling**: Automatically creates Google Calendar events based on meeting outcomes
- **Professional Email Summaries**: Sends formatted meeting summaries to advisors and paraplanners
- **Mortgage-Specific Analysis**: Focuses on loan details, rates, documentation requirements, and action items
- **Automated Workflows**: Streamlines the mortgage consultation process from meeting to follow-up

## Quick Start

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and fill in your environment variables
4. Configure Mortgage Assistant Bot integrations (see [Setup Guide](#mortgage-assistant-bot-setup))
5. Run the development server: `npm run dev`
6. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

### Core Platform Variables
```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Stream Video
NEXT_PUBLIC_STREAM_API_KEY=your_stream_api_key
STREAM_SECRET_KEY=your_stream_secret_key

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NODE_ENV=development

# Database
MONGODB_URI=your_mongodb_connection_string
DATABASE_URL=your_database_url
```

### Mortgage Assistant Bot Variables
```bash
# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent

# Google Calendar API Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_SCOPES=https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@wismeet.com

# Alternative: SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@wismeet.com
```

## Mortgage Assistant Bot Setup

### Prerequisites
- Node.js 18+ and npm 9+
- Access to Google Cloud Console
- Gemini AI API access
- Email service (Gmail SMTP or SendGrid)

### 1. Gemini AI Setup

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key
5. Add it to your `.env.local` file as `GEMINI_API_KEY`

### 2. Google Calendar API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Configure authorized redirect URIs
6. Add credentials to your `.env.local` file

### 3. Email Service Setup

#### Gmail SMTP (Recommended)
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password
3. Configure SMTP settings in `.env.local`

#### SendGrid (Alternative)
1. Create a SendGrid account
2. Generate an API key
3. Configure SendGrid settings in `.env.local`

### 4. Testing Integrations

```bash
# Test all integrations
node scripts/test-mortgage-assistant.js

# Test individual components
curl -X POST "http://localhost:3000/api/mortgage-assistant/summarize" \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Your meeting transcript here..."}'

curl "http://localhost:3000/api/mortgage-assistant/calendar?action=auth"
curl "http://localhost:3000/api/mortgage-assistant/email?action=test"
```

## API Endpoints

### Core Platform APIs
- `/api/meetings/scheduled` - Meeting management
- `/api/chat/*` - Real-time chat functionality
- `/api/health` - Health check

### Mortgage Assistant Bot APIs
- `POST /api/mortgage-assistant/summarize` - Transcript summarization
- `GET/POST /api/mortgage-assistant/calendar` - Google Calendar integration
- `GET/POST /api/mortgage-assistant/email` - Email functionality

## Deployment

### Prerequisites

- Node.js 18+ 
- npm 9+
- MongoDB database
- Stream Video account
- Clerk account
- Gemini AI API access
- Google Cloud Console project
- Email service (Gmail SMTP or SendGrid)

### Deployment Steps

1. **Environment Setup**
   - Ensure all environment variables are properly configured
   - Verify Stream Video API keys are valid
   - Check Clerk authentication keys
   - Configure Mortgage Assistant Bot integrations

2. **Build and Deploy**
   ```bash
   npm install
   npm run build
   npm start
   ```

3. **Health Check**
   - Visit `/api/health` to verify the application is running
   - Test Mortgage Assistant Bot endpoints
   - Check browser console for any errors

## Troubleshooting

### Microphone & Audio Issues

#### Common Problems & Solutions

**Issue: Microphone works initially but stops working after a while**

**Solutions:**
1. **Clear browser cache and cookies**
2. **Hard refresh**: Press `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac)
3. **Try incognito/private mode** to test without extensions
4. **Disable browser extensions** temporarily
5. **Check browser microphone permissions**
6. **Reset audio device permissions**

#### Quick Fixes

1. **Refresh the page** (`F5` or `Ctrl + R`)
2. **Click the microphone button** in the meeting room to toggle it off/on
3. **Check if microphone is muted** (red slash icon)
4. **Try speaking louder** to trigger audio detection

#### Browser-Specific Solutions

**Chrome:**
- Go to `chrome://settings/content/microphone`
- Remove the site from blocked list
- Allow microphone access

**Firefox:**
- Go to `about:preferences#privacy`
- Scroll to Permissions → Microphone
- Allow microphone access

**Edge:**
- Go to `edge://settings/content/microphone`
- Remove the site from blocked list
- Allow microphone access

#### Advanced Troubleshooting

1. **Audio Device Reset**
   ```javascript
   // In browser console (F12)
   navigator.mediaDevices.getUserMedia({ audio: true })
     .then(stream => {
       stream.getTracks().forEach(track => track.stop());
       console.log('Audio devices reset');
     })
     .catch(err => console.error('Error:', err));
   ```

2. **Check Audio Levels**
   - **Windows**: Right-click speaker → Open Sound settings → Test microphone
   - **Mac**: System Preferences → Sound → Input → Test microphone

3. **Browser Console Errors**
   - **Press F12** to open developer tools
   - **Check Console tab** for audio-related errors
   - **Look for permission errors** or device access issues

### Mortgage Assistant Bot Issues

1. **Gemini AI Errors**
   - Verify `GEMINI_API_KEY` is set correctly
   - Check API quota limits
   - Ensure transcript format is valid

2. **Google Calendar Errors**
   - Verify OAuth 2.0 credentials are configured
   - Check redirect URI matches exactly
   - Ensure Calendar API is enabled

3. **Email Errors**
   - Verify SMTP settings and credentials
   - Check app password for Gmail
   - Ensure email service is properly configured

### Deployment Issues

1. **Environment Variables**
   - Ensure all required variables are set
   - Check for typos in variable names
   - Verify API keys are valid

2. **Build Errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check Node.js version compatibility
   - Verify all dependencies are installed

3. **Runtime Errors**
   - Check server logs for detailed error messages
   - Verify database connectivity
   - Ensure all services are running

### Audio Debug Information

The application includes comprehensive audio debugging:

- **Device Detection**: Lists all available audio input devices
- **Permission Status**: Shows current microphone permission state
- **Stream SDK State**: Displays Stream microphone configuration
- **Audio Track Analysis**: Tests audio levels and track status

## Development

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `node scripts/test-mortgage-assistant.js` - Test Mortgage Assistant Bot

### Architecture

- **Frontend**: Next.js 14 with TypeScript
- **Video**: Stream Video React SDK
- **Authentication**: Clerk
- **Database**: MongoDB
- **Real-time**: Socket.io
- **Styling**: Tailwind CSS
- **AI Integration**: Gemini AI
- **Calendar**: Google Calendar API
- **Email**: Nodemailer/SMTP

## Support

For issues related to:
- **Microphone/Audio**: Use the debug tools in the meeting setup
- **Deployment**: Check environment variables and build logs
- **Authentication**: Verify Clerk configuration
- **Video**: Ensure Stream Video API keys are correct
- **Mortgage Assistant Bot**: See the setup guide above

## License

MIT License

