# StudyQuest 🎮📚

StudyQuest is a gamified learning platform that transforms education into an engaging, interactive experience. Earn XP, level up, and collaborate with other learners while mastering new skills.

## Features

- **Gamified Learning Experience**: Earn XP points and level up as you progress through your studies
- **Interactive Dashboard**: Track your learning progress with visual statistics and achievements
- **Community Forum**: Share study materials, ask questions, and collaborate with other learners
- **User Profiles**: Customize your profile and showcase your achievements
- **Admin Dashboard**: Comprehensive admin tools for managing users, monitoring activity, and moderating content
- **Role-Based Access**: Different experiences for Students, Professionals, and Administrators
- **Real-time Updates**: Instant notifications and live activity tracking
- **Modern UI**: Beautiful, responsive design with dark mode support

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: shadcn/ui + Radix UI
- **Backend**: Lovable Cloud (Supabase)
- **Authentication**: Secure user authentication with email/password
- **Database**: PostgreSQL with Row Level Security
- **Routing**: React Router v6
- **State Management**: React Query (TanStack Query)
- **Forms**: React Hook Form with Zod validation

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- npm (v9 or higher)

## Getting Started

### 1. Clone the Repository

```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

The project comes with a pre-configured `.env` file that connects to Lovable Cloud. No additional environment setup is required.

### 4. Run the Development Server

```bash
npm run dev
```

The application will start on `http://localhost:8080`

### 5. Build for Production

```bash
npm run build
```

The build output will be in the `dist` directory.

### 6. Preview Production Build

```bash
npm run preview
```

## Project Structure

```
studyquest/
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── Navigation.tsx # Main navigation component
│   │   ├── XPBar.tsx      # Experience points display
│   │   └── ...
│   ├── pages/             # Page components
│   │   ├── Index.tsx      # Landing page
│   │   ├── Dashboard.tsx  # User dashboard
│   │   ├── Community.tsx  # Community forum
│   │   ├── AdminDashboard.tsx
│   │   └── ...
│   ├── hooks/             # Custom React hooks
│   ├── integrations/      # External service integrations
│   │   └── supabase/      # Supabase client and types
│   ├── lib/               # Utility functions
│   └── index.css          # Global styles and design tokens
├── supabase/              # Supabase configuration
│   └── migrations/        # Database migrations
└── public/                # Static assets
```

## User Roles

### Student
- Access to personal dashboard
- Participate in community discussions
- Share and view study materials
- Track personal learning progress

### Professional
- All Student features
- Enhanced profile customization
- Advanced learning analytics
- Priority support

### Administrator
- All user features
- User management (block, ban, delete, role assignment)
- Community moderation (delete posts, manage users)
- Access to admin dashboard with analytics
- Activity logs and bug reports monitoring

## Key Features Guide

### For Students & Professionals
1. **Dashboard**: View your learning stats, recent activities, and progress
2. **Community**: Share materials, ask questions, and engage with other learners
3. **Profile**: Customize your profile and track achievements
4. **XP System**: Earn experience points and level up

### For Administrators
1. **Admin Dashboard**: Overview of platform statistics and user activity
2. **User Management**: Manage all users, change roles, and moderate accounts
3. **Activity Logs**: Monitor platform activity and user actions
4. **Bug Reports**: Track and manage reported issues
5. **Community Moderation**: Delete inappropriate posts and manage user behavior

## Contributing

This project is part of the StudyQuest learning platform. For contributions or issues, please contact the development team.

## License

Proprietary - All rights reserved

## Support

For support, please contact the StudyQuest team or visit our community forum within the application.

---

Built with ❤️ using Lovable and modern web technologies
