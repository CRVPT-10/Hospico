# HospiCo HealthMate Chatbot - Feature Report

## Overview

The HealthMate Bot is an AI-powered health assistant integrated into the HospiCo healthcare platform. It provides symptom information, hospital search capabilities, and voice interaction features.

---

## Core Features

### 1. **AI-Powered Health Assistance**
- Uses Gemini AI (Google's LLM) for intelligent conversation
- Provides general symptom information and health guidance
- Maintains conversation history for contextual responses
- Includes disclaimer: "Not a professional diagnosis. Consult a doctor."

### 2. **Hospital Search**
- Users can ask to find hospitals (e.g., "Find hospitals near me", "Show hospitals in Mumbai")
- Returns hospital cards with:
  - Hospital name
  - Image
  - City/Location
  - Star rating
  - Clickable cards that navigate to hospital profile page

### 3. **Voice Input (Speech-to-Text)**
- Microphone button for hands-free input
- Uses Web Speech Recognition API
- Supports English language input
- Visual feedback with pulsing red microphone when active

### 4. **Voice Output (Text-to-Speech)**
- Speaker icon below each bot message
- Reads bot responses aloud
- Multi-language support based on Google Translate selection
- Supported languages:
  - English (en-US)
  - Hindi (hi-IN)
  - Telugu (te-IN)
  - Tamil (ta-IN)
  - Kannada (kn-IN)
  - Malayalam (ml-IN)
  - Marathi (mr-IN)
  - Gujarati (gu-IN)
  - Bengali (bn-IN)
  - Punjabi (pa-IN)
  - Odia (or-IN)
  - Assamese (as-IN)
  - Urdu (ur-IN)

---

## UI/UX Features

### 5. **Modern Chat Interface**
- Floating chat widget (bottom-right corner)
- Glassmorphic design with backdrop blur
- Dark mode support
- Smooth Framer Motion animations
- Responsive design (mobile-friendly)
- Fullscreen on mobile, popup window on desktop (380x600px)

### 6. **Embed Mode**
- Can be embedded in external websites via `/embed` route
- Opens automatically in embed mode
- No toggle button (always open)
- Works inside iframes

### 7. **Authentication Gating**
- Chatbot requires user login
- Shows "Restricted Access" popup for unauthenticated users
- Prompts to Login or Sign Up
- Auto-hides after 5 seconds

---

## Technical Implementation

### Backend Integration
- **Endpoint**: `/api/chat` (POST)
- **Request Body**:
  ```json
  {
    "messages": [{ "role": "user/assistant", "content": "..." }],
    "language": "en"
  }
  ```
- **Response Types**:
  1. Normal chat: `{ "reply": "...", "type": "text" }`
  2. Hospital search: `{ "reply": "...", "type": "hospitals", "hospitals": [...] }`
  3. Error: `{ "error": "..." }`

### State Management
- Uses React useState for chat state
- Redux integration for authentication state
- useRef for speech recognition instance

### Key Dependencies
- `framer-motion` - Animations
- `lucide-react` - Icons
- Web Speech API - Voice features
- Redux - Auth state

---

## Component Structure

```
ChatWidget.tsx
├── HospitalCard (sub-component)
│   ├── Hospital image
│   ├── Hospital name
│   ├── Location
│   └── Rating
├── Messages Area
│   ├── User messages
│   ├── Bot messages
│   ├── Hospital cards (if search result)
│   └── Voice output button
├── Input Area
│   ├── Text input
│   ├── Microphone button
│   └── Send button
└── Auth Prompt (overlay for unauthenticated users)
```

---

## Current Limitations

1. **No persistent chat history** - Messages reset on page reload
2. **No typing indicators** - Only "Thinking..." loader
3. **No file/image upload** - Text-only input
4. **No appointment booking via chat** - Must navigate to hospital page
5. **Speech recognition** - English only (input)
6. **Offline support** - None (requires internet)

---

## Future Enhancement Ideas

1. **Appointment Booking** - Book appointments directly from chat
2. **Symptom Checker** - Interactive symptom questionnaire
3. **Prescription Upload** - Upload and analyze prescriptions
4. **Doctor Chat** - Connect with real doctors
5. **Persistent History** - Save chat history per user
6. **Rich Media** - Support images, documents
7. **Push Notifications** - Appointment reminders via chat
8. **Multi-turn Flows** - Guided conversations for complex tasks

---

## File Location

**Component**: `src/components/ChatWidget.tsx`  
**Lines**: 554  
**Size**: ~28KB

---

*Last Updated: December 21, 2024*
