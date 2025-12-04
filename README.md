# The Tech Lab LMS

_The Tech Lab_ is a modern, role-based Learning Management System built with Node.js, Express, OracleDB, EJS, and custom CSS, featuring Google Login support and a visually engaging TTL (The Tech Lab) theme.

---

## Features

- **JWT-based Authentication** (Learner/Mentor/Admin)
- **Google Login & One Tap Sign-In**
  - Users can sign up or sign in with their Google account for an instant, secure onboarding experience.
- **Role-based Sidebar & Navigation**
  - Learners: Access to Projects, full curriculum tracking
  - Mentors: No "Projects" visibility, mentor-specific controls
- **Profile & Avatar Management**
  - Upload and update profile pictures
  - Edit personal info (name, email) and password (secure, with bcrypt)
- **Courses, Modules, Lessons Hierarchy**
  - Courses grouped by tracks; modules and lessons display status and update dates
- **Dashboard, Calendar, and Reports**
- **Accessible, responsive TTL-themed UI**

---

## Technologies

- **Node.js + Express**
- **OracleDB**
- **EJS Templating**
- **Multer** (file uploads)
- **bcrypt/bcryptjs** (secure password hashing)
- **FullCalendar.js** (calendar UI)
- **Google Identity Services** (OAuth2/One Tap)
- **Custom CSS** (TTL color palette: azure, magenta, yellow, dark grey)

---

## Google Login Integration

**The Tech Lab** integrates [Google Identity Services](https://developers.google.com/identity/one-tap/web/) for fast and secure account creation and sign-in.

### How it works

- **On login/register pages:**  
  Users see the Google One Tap prompt or button.
- **Client-side:**  
  Google JS client gets a credential token via One Tap or button.
- **Server-side:**  
  The credential is sent to the backend (`/google`), where the server verifies it (with Google) and either registers or authenticates the user.
- **User Experience:**  
  No need to remember another password. New users are enrolled instantly with their Google info.

### Setup (for local development)

1. **Create OAuth 2.0 credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)**
   - Set "Authorized JavaScript origins" and "Authorized redirect URIs" appropriately.

2. **Store your Google client ID in your `.env` file:**

## Quick Start

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/the-tech-lab.git
   cd the-tech-lab

2. **Install dependencies**


Colors used for The Tech Lab 
Primary Colors
Azure (Primary): #2198b4

Use for: primary buttons, links, headers, active elements, highlights.
Dark Grey Azure (Background / Dark Mode): #171d22

Use for: page background, sidebars, footers, card backgrounds in dark mode, text on light backgrounds if needed.
Accent Colors
Magenta (Accent / Call to Action): #d3428e

Use for: secondary buttons, badges, important highlights, hover states for links or buttons.
Yellow (Highlight / Alert / Notification): #fecd2a

Use for: notifications, alerts, callouts, progress bars, or to emphasize key text.

