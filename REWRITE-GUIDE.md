# Checkmate - Complete Rewrite Documentation

**AI-Powered Educational Testing Platform**

> **Purpose**: This document provides complete specifications for rewriting the Checkmate educational platform in any modern web framework. It includes architecture details, database schemas, AI integration guides, and framework recommendations.

---

## Table of Contents

1. [Application Overview](#application-overview)
2. [Current Technology Stack](#current-technology-stack)
3. [Recommended Alternative Frameworks](#recommended-alternative-frameworks)
4. [Database Schema](#database-schema)
5. [Authentication & Authorization](#authentication--authorization)
6. [ShuttleAI Integration Guide](#shuttleai-integration-guide)
7. [Core Features](#core-features)
8. [User Flows](#user-flows)
9. [UI/UX Design System](#uiux-design-system)
10. [Migration Strategy](#migration-strategy)
   
---

## Application Overview

### What is Checkmate?

Checkmate is a **multi-tenant educational testing and assessment platform** designed for schools, districts, and educational organizations. It enables teachers to create AI-powered tests, worksheets, and study materials with automatic grading capabilities.

### Core Value Propositions

- **AI-Powered Test Generation**: Create entire tests from a topic description using GPT-5, Claude Opus, or DeepSeek models
- **Automatic Grading**: AI grades all question types (multiple choice, essays, short answers) with detailed feedback
- **Multi-Tenant Architecture**: Support for schools, districts, universities with hierarchical organization structures
- **Class-Based Organization**: Teachers create classes, students join via class codes
- **Study Tools**: Flashcard sets with Learn mode, printable worksheets with AI-generated visuals
- **Comprehensive Analytics**: Class summaries, performance tracking, grade categories
- **Enterprise Features**: Department management, academic terms, grade levels, audit logs

### Target Users

1. **Platform Admins** - Manage the entire platform, create organizations, handle support
2. **Organization Admins** - Manage school/district settings, users, departments
3. **Teachers** - Create tests, worksheets, study sets, manage classes
4. **Students** - Take tests, study with flashcards, view grades
5. **Parents** - Monitor student progress (linked accounts)

---

## Current Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router with React Server Components)
- **Language**: TypeScript 5.9
- **UI Library**: React 19.2
- **Styling**: TailwindCSS 4.1 with CSS custom properties
- **Icons**: FontAwesome Pro + Lucide React
- **Forms**: React Hook Form + Zod validation
- **Utilities**: clsx, tailwind-merge, class-variance-authority

### Backend
- **API**: Next.js API Routes (App Router pattern)
- **Database**: PostgreSQL with Prisma ORM 6.19
- **Authentication**: NextAuth.js v4 (Credentials provider, JWT sessions)
- **Password Hashing**: bcryptjs (10 salt rounds)
- **Email**: Nodemailer

### AI Integration
- **Provider**: ShuttleAI API (unified interface for multiple LLM providers)
- **Available Models**:
  - OpenAI: gpt-5, gpt-4o, gpt-4.1, gpt-5-mini, gpt-5-nano
  - Anthropic: claude-opus-4-1, claude-sonnet-4-5, claude-3-7-sonnet
  - DeepSeek: deepseek-r1-distill-llama-70b
  - Shuttle: shuttle-3.5

### Development Tools
- **Runtime**: Node.js
- **Package Manager**: npm
- **Dev Commands**: `npm run dev`, `npm run build`, `npm run db:push`

---

## Recommended Alternative Frameworks

### Why Move Away from Next.js?

While Next.js is powerful, you might consider alternatives for:
- **Simpler mental model** (no RSC complexity)
- **Better developer experience** (faster hot reload, clearer data flow)
- **Framework stability** (Next.js changes frequently)
- **Performance** (smaller bundle sizes, faster initial loads)

### Top Recommendations

#### 1. **SvelteKit** ⭐ Best Overall

**Why SvelteKit:**
- **Reactive by default**: No virtual DOM, compiles to vanilla JS
- **Simpler syntax**: Less boilerplate than React
- **Built-in features**: Forms, progressive enhancement, SSR, SSG
- **Performance**: Smaller bundles (30-70% smaller than Next.js)
- **Type safety**: Full TypeScript support with excellent inference
- **Easy auth**: lucia-auth or SvelteKit Auth
- **Form handling**: Native with `enhance` + Superforms library

**Migration Path:**
```
Next.js App Router → SvelteKit Routes
React Components → Svelte Components
API Routes → +server.ts files
Server Components → load functions
Client State → Svelte stores + $state runes
```

**Stack:**
```typescript
- SvelteKit 2.x
- Prisma (same schema)
- Lucia Auth or SvelteKit Auth
- TailwindCSS (same config)
- Superforms + Zod
- shadcn-svelte (component library)
```

**Example SvelteKit Route:**
```typescript
// src/routes/teacher/classes/[id]/+page.server.ts
import { prisma } from '$lib/server/db';
import { redirect } from '@sveltejs/kit';

export async function load({ params, locals }) {
  const session = await locals.getSession();
  if (!session) throw redirect(302, '/login');

  const classData = await prisma.class.findUnique({
    where: { id: params.id },
    include: { members: true, assignments: true }
  });

  return { classData };
}

export const actions = {
  addStudent: async ({ request, locals }) => {
    const data = await request.formData();
    // Handle form submission
  }
};
```

```svelte
<!-- src/routes/teacher/classes/[id]/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  export let data;

  $: ({ classData } = data);
</script>

<h1>{classData.name}</h1>

<form method="POST" action="?/addStudent" use:enhance>
  <input name="email" required />
  <button>Add Student</button>
</form>
```

---

#### 2. **Remix** - Full-Stack with Web Standards

**Why Remix:**
- **Web standards first**: Uses native FormData, Request, Response
- **Nested routing**: Colocation of data loading and UI
- **Progressive enhancement**: Works without JavaScript
- **Optimistic UI**: Built-in mutation handling
- **Error boundaries**: Granular error handling

**Stack:**
```typescript
- Remix 2.x
- Prisma
- Remix Auth
- TailwindCSS
- Zod
- Radix UI or shadcn/ui
```

**Example Remix Route:**
```typescript
// app/routes/teacher.classes.$id.tsx
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { useLoaderData, Form } from '@remix-run/react';
import { prisma } from '~/lib/prisma.server';
import { requireAuth } from '~/lib/auth.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await requireAuth(request);

  const classData = await prisma.class.findUnique({
    where: { id: params.id },
    include: { members: true }
  });

  return json({ classData });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  // Handle mutations
  return json({ success: true });
}

export default function ClassPage() {
  const { classData } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>{classData.name}</h1>
      <Form method="post">
        <input name="email" required />
        <button>Add Student</button>
      </Form>
    </div>
  );
}
```

---

#### 3. **Astro** - Content-First with Islands

**Why Astro:**
- **Zero JS by default**: Ship HTML/CSS only
- **Islands architecture**: Hydrate components selectively
- **Framework agnostic**: Use React, Svelte, Vue together
- **Best for**: Content-heavy apps with some interactivity

**Note**: Astro is better for marketing sites. For a complex app like Checkmate, use SvelteKit or Remix.

---

#### 4. **Solid Start** - Fine-Grained Reactivity

**Why Solid:**
- **No virtual DOM**: Fine-grained reactivity like Svelte
- **React-like syntax**: Easy migration from React
- **Better performance**: Faster than React
- **TypeScript-first**: Excellent type inference

**Stack:**
```typescript
- Solid Start
- Prisma
- Auth.js (formerly NextAuth)
- TailwindCSS
- Zod
```

---

#### 5. **T3 Stack** (Staying with Next.js but improved)

If you want to stick with Next.js but improve the stack:

```typescript
- Next.js 15+ (Pages Router - more stable than App Router)
- tRPC (type-safe API layer, replaces REST)
- Prisma
- NextAuth.js
- TailwindCSS
- Zod
```

**Why T3:**
- **End-to-end type safety**: No API route typing needed
- **Better DX**: Auto-completion for all API calls
- **Proven stack**: Used by thousands of production apps

---

### Framework Comparison Table

| Feature | SvelteKit | Remix | Next.js | Solid Start | Astro |
|---------|-----------|-------|---------|-------------|-------|
| **Bundle Size** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **DX** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Performance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Learning Curve** | Easy | Medium | Hard | Medium | Easy |
| **Community** | Growing | Strong | Huge | Small | Growing |
| **SSR/SSG** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **File Routing** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Form Handling** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Auth Options** | Lucia, SK Auth | Remix Auth | NextAuth | Auth.js | Manual |
| **Best For** | Full apps | Full apps | Large apps | High perf | Content |

**Recommendation:** **SvelteKit** for the best balance of DX, performance, and features.

---

## Database Schema

### Core Models

#### User Model
```prisma
model User {
  id                   String       @id @default(cuid())
  email                String       @unique
  name                 String?
  password             String       // bcrypt hashed
  avatarUrl            String?
  platformRole         PlatformRole @default(USER)
  suspended            Boolean      @default(false)
  birthdate            DateTime?
  emailVerified        Boolean      @default(false)
  lastLoginAt          DateTime?
  timezone             String       @default("America/New_York")
  locale               String       @default("en-US")
  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt

  // Relations
  orgMemberships   OrganizationMember[]
  testsCreated     Test[]
  submissions      TestSubmission[]
  classesOwned     Class[]
  classMemberships ClassMember[]
  studySets        StudySet[]
}
```

**Key Fields:**
- `platformRole`: PLATFORM_ADMIN, SUPPORT, or USER
- `suspended`: Account suspension status
- `emailVerified`: Email verification flag
- `timezone`, `locale`: User preferences

---

#### Organization Model
```prisma
model Organization {
  id                   String           @id @default(cuid())
  name                 String
  slug                 String           @unique  // URL identifier
  type                 OrganizationType @default(SCHOOL)
  logoUrl              String?
  email                String?
  timezone             String           @default("America/New_York")
  subscriptionTier     SubscriptionTier @default(ENTERPRISE)
  subscriptionStatus   SubscriptionStatus @default(ACTIVE)
  maxStudents          Int              @default(999999)
  maxTeachers          Int              @default(999999)
  features             Json?            // Feature flags
  isActive             Boolean          @default(true)

  // Relations
  members      OrganizationMember[]
  departments  Department[]
  classes      Class[]
  terms        AcademicTerm[]
  subjects     Subject[]
}
```

**Organization Types:**
- SCHOOL (K-12)
- DISTRICT (multiple schools)
- UNIVERSITY
- TUTORING_CENTER
- CORPORATE
- INDIVIDUAL

**All organizations get ENTERPRISE tier** with unlimited features.

---

#### OrganizationMember Model
```prisma
model OrganizationMember {
  id             String  @id @default(cuid())
  organizationId String
  userId         String
  role           OrgRole @default(STUDENT)
  title          String?      // "Math Teacher", "Principal"
  employeeId     String?      // School employee ID
  studentId      String?      // Student ID number
  departmentId   String?
  isActive       Boolean @default(true)
  joinedAt       DateTime @default(now())
}
```

**Organization Roles:**
- ORG_OWNER - Full control, billing
- ORG_ADMIN - Manage settings, users
- DEPARTMENT_HEAD - Manage department
- TEACHER - Create classes, tests
- TEACHING_ASSISTANT - Help teachers
- STUDENT - Take tests
- PARENT - View student progress

---

#### Class Model
```prisma
model Class {
  id             String   @id @default(cuid())
  name           String
  description    String?
  code           String   @unique  // 6-char code like "ABC123"
  teacherId      String
  organizationId String?
  theme          String   @default("#6366f1")  // Hex color
  emoji          String?  // Class icon
  archived       Boolean  @default(false)

  // Relations
  teacher     User
  members     ClassMember[]
  assignments ClassAssignment[]
  studySets   StudySet[]
}
```

**Class Features:**
- Unique 6-character join code (uppercase)
- Custom theme color (12 predefined colors)
- Custom emoji icon (12 predefined emojis)

**Class Colors:**
```javascript
['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#f59e0b',
 '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#8b5cf6']
```

**Class Emojis:**
```javascript
['📚', '🎓', '✏️', '📖', '🧮', '🔬', '🎨', '🎭', '🎵', '⚡', '🌟', '🚀']
```

---

#### Test Model
```prisma
model Test {
  id                     String     @id @default(cuid())
  title                  String
  description            String?
  accessCode             String     @unique  // 6-char code
  teacherId              String
  status                 TestStatus @default(DRAFT)
  autoGrade              Boolean    @default(false)
  showResultsImmediately Boolean    @default(true)
  timeLimit              Int?       // minutes
  startDate              DateTime?
  endDate                DateTime?
  allowRetake            Boolean    @default(false)
  scrambleQuestions      Boolean    @default(true)
  studyGuide             String?    @db.Text  // Cached HTML

  // Relations
  questions   Question[]
  submissions TestSubmission[]
}
```

**Test Statuses:**
- DRAFT - Being created
- PUBLISHED - Live and available
- ARCHIVED - No longer active

---

#### Question Model
```prisma
model Question {
  id            String       @id @default(cuid())
  testId        String
  type          QuestionType
  question      String       @db.Text
  options       Json?        // ["opt1", "opt2", "opt3"]
  correctAnswer String?      @db.Text
  points        Int          @default(1)
  order         Int
  aiGenerated   Boolean      @default(false)
}
```

**Question Types:**
- MULTIPLE_CHOICE - Select from options
- TRUE_FALSE - True or false
- SHORT_ANSWER - Brief answer (1-2 sentences)
- LONG_ANSWER - Paragraph answer
- ESSAY - Extended response
- FILL_IN_BLANK - Complete the sentence

---

#### TestSubmission Model
```prisma
model TestSubmission {
  id          String           @id @default(cuid())
  testId      String
  studentId   String
  status      SubmissionStatus @default(IN_PROGRESS)
  score       Float?
  totalPoints Int?
  feedback    String?          @db.Text
  startedAt   DateTime         @default(now())
  submittedAt DateTime?
  gradedAt    DateTime?

  answers Answer[]
}
```

**Submission Statuses:**
- IN_PROGRESS - Student is taking test
- SUBMITTED - Completed, awaiting grading
- PENDING - Grading in progress
- GRADED - Complete with score

---

#### StudySet Model
```prisma
model StudySet {
  id          String   @id @default(cuid())
  title       String
  description String?
  creatorId   String
  isPublic    Boolean  @default(false)
  shareCode   String?  @unique
  classId     String?

  cards StudyCard[]
}

model StudyCard {
  id         String   @id @default(cuid())
  studySetId String
  term       String   @db.Text
  definition String   @db.Text
  order      Int
}
```

---

#### Worksheet Model
```prisma
model Worksheet {
  id               String          @id @default(cuid())
  title            String
  subject          String          // "Math", "Science", etc.
  gradeLevel       String?         // "5th Grade"
  teacherId        String
  status           WorksheetStatus @default(DRAFT)
  includeAnswerKey Boolean         @default(true)

  items WorksheetItem[]
}

model WorksheetItem {
  id           String            @id @default(cuid())
  worksheetId  String
  type         WorksheetItemType
  content      String            @db.Text
  imageUrl     String?           // SVG code or LaTeX
  imageCaption String?
  options      Json?
  answer       String?           @db.Text
  hint         String?
  difficulty   String?
  order        Int
  aiGenerated  Boolean           @default(false)
}
```

**Worksheet Item Types:**
- PROBLEM - Math problem, exercise
- INSTRUCTION - Text instructions
- IMAGE - Image with caption
- GRAPH - AI-generated SVG graph
- DIAGRAM - AI-generated SVG diagram
- TABLE - Data table
- FILL_IN_BLANK, SHORT_ANSWER, LONG_ANSWER, etc.

---

### Complete Schema Overview

**Total Models:** 31

**Key Relationships:**
1. User → OrganizationMember → Organization (many-to-many)
2. Teacher → Class → ClassMember → Student (many-to-many)
3. Test → Question → Answer → TestSubmission
4. Class → ClassAssignment → Test/Worksheet/StudySet
5. Organization → Department → Subject → Class

**Database Indexes:**
- All foreign keys indexed
- Email, slug, code fields indexed
- Status fields indexed for filtering
- Date fields indexed for time-based queries

---

## Authentication & Authorization

### Authentication Flow

**Technology:** NextAuth.js v4 with Credentials provider

**Session Strategy:** JWT (30-day expiration)

**Password Hashing:** bcryptjs with 10 salt rounds

#### Login Process

```typescript
// lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from './prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        // 1. Find user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            orgMemberships: {
              where: { isActive: true },
              include: { organization: true }
            }
          }
        });

        // 2. Verify password
        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) throw new Error('Invalid credentials');

        // 3. Check suspension status
        if (user.suspended) throw new Error('Account suspended');

        // 4. Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        });

        // 5. Determine effective role
        let effectiveRole = 'STUDENT';
        if (user.platformRole === 'PLATFORM_ADMIN') {
          effectiveRole = 'ADMIN';
        } else if (hasOrgRole(user, 'TEACHER')) {
          effectiveRole = 'TEACHER';
        }

        // 6. Return session data
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: effectiveRole,
          platformRole: user.platformRole,
          orgMemberships: user.orgMemberships.map(m => ({
            orgId: m.organization.id,
            orgSlug: m.organization.slug,
            orgName: m.organization.name,
            role: m.role
          }))
        };
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.platformRole = user.platformRole;
        token.orgMemberships = user.orgMemberships;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.platformRole = token.platformRole;
      session.user.orgMemberships = token.orgMemberships;
      return session;
    }
  }
};
```

---

### Authorization System

**Two-Level Role System:**

1. **Platform Roles** (system-wide)
   - PLATFORM_ADMIN - Super admin (manage all orgs)
   - SUPPORT - Support staff (limited admin)
   - USER - Regular user

2. **Organization Roles** (per-organization)
   - ORG_OWNER - Full org control
   - ORG_ADMIN - Manage org settings
   - DEPARTMENT_HEAD - Manage department
   - TEACHER - Create content
   - TEACHING_ASSISTANT - Limited creation
   - STUDENT - Consume content
   - PARENT - View linked student data

**Role Hierarchy:**

```
PLATFORM_ADMIN (can access everything)
  ├─ SUPPORT (limited platform access)
  └─ USER
      ├─ ORG_OWNER (full org access)
      ├─ ORG_ADMIN (manage org)
      ├─ DEPARTMENT_HEAD (manage dept)
      ├─ TEACHER (create content)
      ├─ TEACHING_ASSISTANT (limited)
      ├─ STUDENT (consume)
      └─ PARENT (view only)
```

**Permission Checking:**

```typescript
// Check if user can access a resource
async function canAccessClass(userId: string, classId: string) {
  const membership = await prisma.classMember.findUnique({
    where: { classId_userId: { classId, userId } }
  });

  if (!membership) {
    // Check if user is teacher of the class
    const classData = await prisma.class.findUnique({
      where: { id: classId }
    });
    return classData?.teacherId === userId;
  }

  return true;
}

// Check org-level permissions
async function hasOrgPermission(
  userId: string,
  orgId: string,
  requiredRole: OrgRole
) {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organizationId: orgId,
      isActive: true
    }
  });

  if (!membership) return false;

  const roleHierarchy = {
    ORG_OWNER: 6,
    ORG_ADMIN: 5,
    DEPARTMENT_HEAD: 4,
    TEACHER: 3,
    TEACHING_ASSISTANT: 2,
    STUDENT: 1,
    PARENT: 0
  };

  return roleHierarchy[membership.role] >= roleHierarchy[requiredRole];
}
```

---

### Registration Flows

#### 1. Student Self-Registration

**URL:** `/register`

**Flow:**
1. Student selects "I'm a Student"
2. Enters class code (6 characters)
3. Validates class code exists
4. Enters name, email, password
5. Creates user account
6. Automatically joins class's organization
7. Enrolls in the class
8. Auto sign-in and redirect to student dashboard

**Code:**
```typescript
// app/api/auth/register/route.ts
export async function POST(req: Request) {
  const { classCode, name, email, password } = await req.json();

  // 1. Find class by code
  const classData = await prisma.class.findUnique({
    where: { code: classCode.toUpperCase() },
    include: { organization: true }
  });

  if (!classData) {
    return Response.json({ error: 'Invalid class code' }, { status: 400 });
  }

  // 2. Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // 3. Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      platformRole: 'USER'
    }
  });

  // 4. Add to organization as student
  await prisma.organizationMember.create({
    data: {
      userId: user.id,
      organizationId: classData.organizationId,
      role: 'STUDENT'
    }
  });

  // 5. Join class
  await prisma.classMember.create({
    data: {
      userId: user.id,
      classId: classData.id,
      role: 'STUDENT'
    }
  });

  return Response.json({ success: true });
}
```

---

#### 2. Teacher Registration

**Teachers cannot self-register.** They must be invited by an organization admin.

**Invitation Flow:**
1. Org admin creates invite with email and role
2. Unique invite code generated
3. Email sent to teacher
4. Teacher clicks link, creates account
5. Automatically added to organization

---

#### 3. Organization Request

**URL:** `/register` → "I'm Setting Up a School"

**Flow:**
1. Fill contact info, org details, address
2. Submit request (stored in `OrganizationRequest`)
3. Platform admin reviews in `/admin`
4. On approval:
   - Organization created
   - User becomes ORG_OWNER
   - Email notification sent

---

## ShuttleAI Integration Guide

### What is ShuttleAI?

**ShuttleAI** is a unified API gateway that provides access to multiple LLM providers (OpenAI, Anthropic, DeepSeek, etc.) through a single interface. It's compatible with the OpenAI API format but proxies requests to any model.

**Website:** https://shuttleai.com
**Docs:** https://docs.shuttleai.com

---

### Getting Started

#### 1. Get API Key

```bash
# Sign up at https://shuttleai.com
# Navigate to Dashboard → API Keys
# Create new key
# Copy key to .env file
```

```env
SHUTTLEAI_API_KEY=your_key_here
```

---

#### 2. Available Models

```typescript
export const AVAILABLE_MODELS = [
  // OpenAI Models
  'openai/gpt-5',
  'openai/gpt-4o',
  'openai/gpt-4.1',
  'openai/gpt-5-mini',
  'openai/gpt-5-nano',

  // Anthropic Models
  'anthropic/claude-opus-4-1-20250805',
  'anthropic/claude-sonnet-4-5-20250929',
  'anthropic/claude-3-7-sonnet-20250219',

  // DeepSeek Models
  'deepseek/deepseek-r1-distill-llama-70b',

  // Shuttle Models
  'shuttleai/shuttle-3.5'
];
```

**Default Model:** `anthropic/claude-opus-4-1-20250805`

**Pricing:** Varies by model, check https://shuttleai.com/pricing

---

### Core ShuttleAI Service

Create a service class to handle all AI operations:

```typescript
// lib/shuttleai.ts
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ShuttleAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class ShuttleAIService {
  private apiKey: string;
  private baseUrl = 'https://api.shuttleai.com/v1/chat/completions';

  constructor() {
    this.apiKey = process.env.SHUTTLEAI_API_KEY || '';
  }

  /**
   * Make a request to ShuttleAI
   */
  private async makeRequest(
    messages: Message[],
    maxTokens: number = 2000,
    model?: string
  ): Promise<string> {
    const selectedModel = model || await this.getModel();

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        temperature: 0.7,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ShuttleAI API error: ${error}`);
    }

    const data: ShuttleAIResponse = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Get current model from database
   */
  private async getModel(): Promise<string> {
    const config = await prisma.systemConfig.findUnique({
      where: { id: 'singleton' }
    });
    return config?.aiModel || 'anthropic/claude-opus-4-1-20250805';
  }
}

export const shuttleAI = new ShuttleAIService();
```

---

### Feature 1: Test Question Generation

**Generate entire tests from a topic description.**

```typescript
/**
 * Generate test questions using AI
 *
 * @example
 * const questions = await shuttleAI.generateTestQuestions({
 *   topic: "World War II",
 *   numberOfQuestions: 10,
 *   questionTypes: ['MULTIPLE_CHOICE', 'SHORT_ANSWER', 'ESSAY'],
 *   difficulty: 'medium',
 *   additionalInstructions: 'Focus on the European theater'
 * });
 */
async generateTestQuestions(params: {
  topic: string;
  numberOfQuestions: number;
  questionTypes: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  additionalInstructions?: string;
}): Promise<Array<{
  type: QuestionType;
  question: string;
  options: string[] | null;
  correctAnswer: string;
  points: number;
}>> {
  const systemPrompt = `You are an expert test creator. Generate high-quality test questions.

CRITICAL FORMATTING RULES:
1. Return ONLY raw JSON - DO NOT wrap in markdown code blocks
2. DO NOT include \`\`\`json or \`\`\` anywhere in your response
3. Start your response directly with [ and end with ]
4. No explanatory text before or after the JSON`;

  const userPrompt = `Create ${params.numberOfQuestions} ${params.difficulty} difficulty test questions about: ${params.topic}

Question types to include: ${params.questionTypes.join(', ')}
${params.additionalInstructions ? `Additional instructions: ${params.additionalInstructions}` : ''}

Return a JSON array where each question object has:
- type: One of "MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "LONG_ANSWER", "ESSAY", "FILL_IN_BLANK"
- question: The question text (string)
- options: Array of strings (for MULTIPLE_CHOICE/TRUE_FALSE) or null for other types
- correctAnswer: The correct answer (string)
- points: Point value 1-10 (number)

Example format:
[
  {
    "type": "MULTIPLE_CHOICE",
    "question": "What is 2+2?",
    "options": ["3", "4", "5", "6"],
    "correctAnswer": "4",
    "points": 5
  }
]

IMPORTANT: Return ONLY the JSON array. No markdown formatting. No code blocks. Just pure JSON starting with [ and ending with ].`;

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  // Calculate appropriate token limit
  const estimatedTokensPerQuestion = 350;
  const baseTokens = 2000;
  const calculatedTokens = baseTokens + (params.numberOfQuestions * estimatedTokensPerQuestion);
  const maxTokens = Math.max(4000, Math.min(calculatedTokens, 16000));

  const response = await this.makeRequest(messages, maxTokens);

  // Parse and clean response
  const questions = this.extractAndRepairJSON(response, true);

  return questions;
}

/**
 * Extract and repair JSON from AI response
 * Handles markdown code blocks, malformed JSON, and truncated responses
 */
private extractAndRepairJSON(response: string, expectArray: boolean = true): any {
  // Step 1: Clean markdown code blocks
  let cleaned = response.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '');
  cleaned = cleaned.replace(/\n?```\s*$/, '');
  cleaned = cleaned.trim();

  // Step 2: Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    // Continue to repair logic
  }

  // Step 3: Extract JSON pattern
  const pattern = expectArray ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const jsonMatch = cleaned.match(pattern);

  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  let jsonStr = jsonMatch[0];

  // Step 4: Remove control characters
  jsonStr = jsonStr.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  // Step 5: Fix incomplete objects/arrays
  const openBraces = (jsonStr.match(/\{/g) || []).length;
  const closeBraces = (jsonStr.match(/\}/g) || []).length;
  if (openBraces > closeBraces) {
    jsonStr = jsonStr + '}'.repeat(openBraces - closeBraces);
  }

  const openBrackets = (jsonStr.match(/\[/g) || []).length;
  const closeBrackets = (jsonStr.match(/\]/g) || []).length;
  if (openBrackets > closeBrackets) {
    jsonStr = jsonStr + ']'.repeat(openBrackets - closeBrackets);
  }

  // Step 6: Remove trailing commas
  jsonStr = jsonStr.replace(/,(\s*[\]}])/g, '$1');

  return JSON.parse(jsonStr);
}
```

**Example Usage:**

```typescript
// In your API route
import { shuttleAI } from '@/lib/shuttleai';

export async function POST(req: Request) {
  const { topic, numberOfQuestions } = await req.json();

  const questions = await shuttleAI.generateTestQuestions({
    topic,
    numberOfQuestions,
    questionTypes: ['MULTIPLE_CHOICE', 'SHORT_ANSWER', 'ESSAY'],
    difficulty: 'medium'
  });

  // Save questions to database
  await prisma.question.createMany({
    data: questions.map((q, i) => ({
      testId: testId,
      type: q.type,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      points: q.points,
      order: i,
      aiGenerated: true
    }))
  });

  return Response.json({ questions });
}
```

---

### Feature 2: Auto-Grading with AI

**Grade student answers with detailed feedback.**

#### Single Answer Grading

```typescript
/**
 * Grade a single answer
 *
 * @example
 * const result = await shuttleAI.gradeAnswer({
 *   question: "What caused World War I?",
 *   correctAnswer: "Assassination of Archduke Franz Ferdinand...",
 *   studentAnswer: "A war started because of the death of a duke",
 *   questionType: "SHORT_ANSWER",
 *   points: 10
 * });
 *
 * // Returns:
 * // {
 * //   isCorrect: true,
 * //   pointsAwarded: 7,
 * //   feedback: "Partially correct. You identified the assassination..."
 * // }
 */
async gradeAnswer(params: {
  question: string;
  correctAnswer: string;
  studentAnswer: string;
  questionType: string;
  points: number;
}): Promise<{
  isCorrect: boolean;
  pointsAwarded: number;
  feedback: string;
}> {
  const systemPrompt = `You are an expert grader. Evaluate student answers fairly and provide constructive feedback.

CRITICAL FORMATTING RULES:
1. Return ONLY raw JSON - DO NOT wrap in markdown code blocks
2. Start with { and end with }
3. No explanatory text before or after`;

  const userPrompt = `Question: ${params.question}
Question Type: ${params.questionType}
Correct Answer: ${params.correctAnswer}
Student Answer: ${params.studentAnswer}
Max Points: ${params.points}

Return a JSON object with exactly these fields:
{
  "isCorrect": boolean,
  "pointsAwarded": number (0 to ${params.points}),
  "feedback": "detailed feedback string"
}

Return ONLY the JSON object. No markdown. No code blocks. Just pure JSON.`;

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  const response = await this.makeRequest(messages, 500);
  const parsed = this.extractAndRepairJSON(response, false);

  return {
    isCorrect: parsed.isCorrect || false,
    pointsAwarded: parsed.pointsAwarded || 0,
    feedback: parsed.feedback || 'No feedback provided'
  };
}
```

---

#### Batch Grading (Efficient)

**Grade all answers + generate overall feedback in ONE API call.**

```typescript
/**
 * Grade entire test submission in one request
 * Most efficient: all grading + overall feedback = 1 API call
 *
 * @example
 * const result = await shuttleAI.gradeTestComprehensive({
 *   testTitle: "World War II Quiz",
 *   answers: [
 *     {
 *       id: "q1",
 *       question: "What year did WWII start?",
 *       correctAnswer: "1939",
 *       studentAnswer: "1939",
 *       questionType: "SHORT_ANSWER",
 *       points: 5
 *     },
 *     // ... more answers
 *   ]
 * });
 */
async gradeTestComprehensive(params: {
  testTitle: string;
  answers: Array<{
    id: string;
    question: string;
    correctAnswer: string;
    studentAnswer: string;
    questionType: string;
    points: number;
  }>;
}): Promise<{
  gradedAnswers: Array<{
    id: string;
    isCorrect: boolean;
    pointsAwarded: number;
    feedback: string;
  }>;
  overallFeedback: string;
  totalScore: number;
  totalPoints: number;
}> {
  const answersList = params.answers
    .map((a, idx) => `QUESTION ${idx + 1}:
Question Text: ${a.question}
Type: ${a.questionType}
Max Points: ${a.points}
Correct Answer: ${a.correctAnswer}
Student Answer: ${a.studentAnswer}`)
    .join('\n\n');

  const totalPoints = params.answers.reduce((sum, a) => sum + a.points, 0);

  const systemPrompt = `You are an expert teacher grading a test.

CRITICAL FORMATTING RULES:
1. Return ONLY raw JSON - DO NOT wrap in markdown code blocks
2. Start with { and end with }
3. No explanatory text before or after

Your JSON must contain two sections:

1. "gradedAnswers" - array of objects for each question with:
   - id: question number (1, 2, 3, etc.)
   - isCorrect: boolean
   - pointsAwarded: number (0 to max)
   - feedback: string - DETAILED, specific feedback (2-3 sentences minimum)

2. "overallFeedback" - string containing:
   - Brief acknowledgment of performance
   - 1-2 specific strengths (with examples)
   - 1-2 areas for improvement (with examples)
   - Actionable study suggestions
   - Encouraging conclusion (3-4 sentences total)

IMPORTANT:
- Provide detailed feedback, not just "Correct" or "Incorrect"
- Consider partial credit for answers showing understanding
- Reference specific parts of the student's answer`;

  const userPrompt = `Test: "${params.testTitle}"
Total Points Possible: ${totalPoints}

Please grade ALL of these student answers and provide comprehensive feedback:

${answersList}

Return a JSON object with exactly this structure:
{
  "gradedAnswers": [ /* array of graded answers */ ],
  "overallFeedback": "detailed feedback string"
}

Return ONLY the JSON object. No markdown. No code blocks. Just pure JSON.`;

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  const maxTokens = Math.min(4000, Math.max(2000, params.answers.length * 500));
  const response = await this.makeRequest(messages, maxTokens);

  const parsed = this.extractAndRepairJSON(response, false);
  const gradedAnswers = parsed.gradedAnswers || [];
  const overallFeedback = parsed.overallFeedback || '';

  // Calculate total score
  let totalScore = 0;
  const mappedAnswers = params.answers.map((answer, idx) => {
    const result = gradedAnswers[idx] || gradedAnswers.find(
      (r: any) => r.id === idx + 1 || r.id === answer.id
    );

    const isCorrect = result?.isCorrect || false;
    const pointsAwarded = Math.min(result?.pointsAwarded || 0, answer.points);
    const feedback = result?.feedback || 'No feedback provided';

    totalScore += pointsAwarded;

    return {
      id: answer.id,
      isCorrect,
      pointsAwarded,
      feedback
    };
  });

  return {
    gradedAnswers: mappedAnswers,
    overallFeedback,
    totalScore,
    totalPoints
  };
}
```

**Example Usage:**

```typescript
// In submission grading API route
const submission = await prisma.testSubmission.findUnique({
  where: { id: submissionId },
  include: {
    test: { include: { questions: true } },
    answers: true
  }
});

// Grade entire test in one call
const gradingResult = await shuttleAI.gradeTestComprehensive({
  testTitle: submission.test.title,
  answers: submission.answers.map(a => ({
    id: a.id,
    question: a.question.question,
    correctAnswer: a.question.correctAnswer,
    studentAnswer: a.answer,
    questionType: a.question.type,
    points: a.question.points
  }))
});

// Update database with results
await prisma.$transaction([
  // Update each answer
  ...gradingResult.gradedAnswers.map(result =>
    prisma.answer.update({
      where: { id: result.id },
      data: {
        isCorrect: result.isCorrect,
        pointsAwarded: result.pointsAwarded,
        feedback: result.feedback
      }
    })
  ),
  // Update submission
  prisma.testSubmission.update({
    where: { id: submissionId },
    data: {
      status: 'GRADED',
      score: gradingResult.totalScore,
      totalPoints: gradingResult.totalPoints,
      feedback: gradingResult.overallFeedback,
      gradedAt: new Date()
    }
  })
]);
```

---

### Feature 3: Study Guide Generation

**Generate comprehensive HTML study guides from test questions.**

```typescript
/**
 * Generate a study guide for a test
 *
 * @example
 * const studyGuide = await shuttleAI.generateStudyGuide({
 *   testTitle: "American Revolution Quiz",
 *   testDescription: "Covers causes, events, and outcomes",
 *   questions: test.questions
 * });
 *
 * // Returns HTML with sections, icons, practice questions
 */
async generateStudyGuide(params: {
  testTitle: string;
  testDescription: string;
  questions: Array<{
    question: string;
    type: string;
    correctAnswer: string;
    points: number;
  }>;
}): Promise<string> {
  const systemPrompt = `You are an expert educator creating study guides. Generate a comprehensive, well-structured study guide in HTML format.

Your study guide should:
- Identify key topics and concepts from the test material
- Explain important concepts clearly
- Provide practice questions SIMILAR but NOT IDENTICAL to the test questions
- Include study tips and strategies
- Use proper HTML formatting with semantic tags (h2, h3, ul, ol, p, etc.)
- Use Font Awesome icons to make it visually appealing:
  * <i class="fas fa-lightbulb"></i> for key concepts
  * <i class="fas fa-star"></i> for study tips
  * <i class="fas fa-exclamation-triangle"></i> for warnings
  * <i class="fas fa-book-open"></i> for main sections
- Use these CSS classes for special boxes:
  * class="highlight-box" for key concepts
  * class="tip-box" for study tips
  * class="warning-box" for common mistakes

IMPORTANT:
- DO NOT include the exact test questions
- DO NOT reveal the exact answers to test questions
- Instead, create SIMILAR practice questions that help students prepare
- Focus on understanding concepts, not memorizing answers
- Return ONLY the HTML content (no <html> or <body> tags)
- Include Font Awesome icons throughout`;

  const questionSummary = params.questions.map((q, idx) =>
    `Question ${idx + 1} (${q.type}, ${q.points} pts): About "${q.question.substring(0, 60)}..."`
  ).join('\n');

  const userPrompt = `Create a study guide for: "${params.testTitle}"
${params.testDescription ? `Description: ${params.testDescription}` : ''}

The test covers these topics (${params.questions.length} questions):
${questionSummary}

Generate a comprehensive study guide with:
1. Overview section introducing the topics
2. Key concepts section with detailed explanations
3. Practice questions section (create NEW questions similar to but different from the test)
4. Study tips section with strategies for success
5. Summary/conclusion section

Use proper HTML formatting with h2 for main sections, h3 for subsections, and the special CSS classes mentioned. Include Font Awesome icons throughout.

Return ONLY the HTML content.`;

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  const response = await this.makeRequest(messages, 4000);

  // Clean up response - remove any markdown code blocks if present
  let cleaned = response.trim();
  if (cleaned.startsWith('```html')) {
    cleaned = cleaned.replace(/^```html\n/, '').replace(/\n```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\n/, '').replace(/\n```$/, '');
  }

  return cleaned;
}
```

**Caching Study Guides:**

```typescript
// In test creation/update
if (test.status === 'PUBLISHED' && !test.studyGuide) {
  const studyGuide = await shuttleAI.generateStudyGuide({
    testTitle: test.title,
    testDescription: test.description || '',
    questions: test.questions
  });

  await prisma.test.update({
    where: { id: test.id },
    data: { studyGuide } // Cache it!
  });
}
```

---

### Feature 4: Worksheet Generation with SVG Visuals

**Generate worksheets with AI-generated graphs, diagrams, and formulas.**

```typescript
/**
 * Generate worksheet items with visual content
 *
 * @example
 * const items = await shuttleAI.generateWorksheetItems({
 *   topic: "Linear Equations",
 *   subject: "Math",
 *   gradeLevel: "8th Grade",
 *   numberOfItems: 15,
 *   itemTypes: ['PROBLEM', 'GRAPH', 'FILL_IN_BLANK'],
 *   difficulty: 'medium',
 *   includeGraphs: true
 * });
 */
async generateWorksheetItems(params: {
  topic: string;
  subject: string;
  gradeLevel?: string;
  numberOfItems: number;
  itemTypes: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  includeImages?: boolean;
  includeGraphs?: boolean;
}): Promise<Array<{
  type: WorksheetItemType;
  content: string;
  imageUrl?: string;  // SVG code or LaTeX
  imageCaption?: string;
  options?: string[];
  answer?: string;
  hint?: string;
  difficulty?: string;
}>> {
  const systemPrompt = `You are an expert worksheet creator specializing in educational materials for ${params.subject}.

CRITICAL FORMATTING RULES:
1. Return ONLY raw JSON - DO NOT wrap in markdown code blocks
2. Start your response directly with [ and end with ]
3. No explanatory text before or after

Generate diverse, engaging worksheet items that include:
- Clear, age-appropriate content for ${params.gradeLevel || 'the specified grade level'}
- Variety of item types
- Visual elements when appropriate
- Progressive difficulty`;

  const userPrompt = `Create ${params.numberOfItems} ${params.difficulty} difficulty worksheet items for ${params.subject} about: ${params.topic}
${params.gradeLevel ? `Grade Level: ${params.gradeLevel}` : ''}

Item types to include: ${params.itemTypes.join(', ')}

Return a JSON array where each item object has:
- type: One of "PROBLEM", "INSTRUCTION", "GRAPH", "DIAGRAM", "TABLE", "FILL_IN_BLANK", "SHORT_ANSWER", etc.
- content: The main content/problem text (string)
- imageUrl: For GRAPH/DIAGRAM types, generate ACTUAL CONTENT:
  * For GRAPH: Generate complete SVG code for charts/graphs
  * For DIAGRAM: Generate SVG code for diagrams
  * For formulas: Use LaTeX notation wrapped in $$ delimiters (e.g., "$$E = mc^2$$")
- imageCaption: Caption for images (optional)
- options: Array of strings (for MULTIPLE_CHOICE) or null
- answer: The correct answer (optional)
- hint: A helpful hint (optional)
- difficulty: "easy", "medium", or "hard"

Example format:
[
  {
    "type": "PROBLEM",
    "content": "Solve for x: $$2x + 5 = 15$$",
    "imageUrl": null,
    "answer": "x = 5",
    "hint": "Subtract 5 from both sides first",
    "difficulty": "medium"
  },
  {
    "type": "GRAPH",
    "content": "Use the graph to answer: What was the temperature on Friday?",
    "imageUrl": "<svg width='400' height='300'><rect fill='#f9fafb' width='400' height='300'/><line x1='50' y1='250' x2='350' y2='250' stroke='#374151' stroke-width='2'/><polyline points='80,180 130,170 180,150 230,120 280,110' fill='none' stroke='#ef4444' stroke-width='3'/><text x='280' y='265' text-anchor='middle' font-size='10'>Fri</text></svg>",
    "imageCaption": "Temperature graph",
    "answer": "82°F",
    "difficulty": "medium"
  }
]

CRITICAL REQUIREMENTS FOR VISUAL CONTENT:
- GRAPH type: Generate COMPLETE, VALID SVG code with axes, data points, labels
- SVG should be 400x300 pixels, use clear colors
- For math formulas: Use LaTeX wrapped in $$ (double backslashes: \\\\pi, \\\\frac)
- Keep SVG minimal but complete

Return ONLY the JSON array.`;

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  const baseTokensPerItem = params.includeGraphs ? 600 : 300;
  const maxTokens = Math.max(4000, Math.min(
    1500 + (params.numberOfItems * baseTokensPerItem),
    16000
  ));

  const response = await this.makeRequest(messages, maxTokens);
  const items = this.extractAndRepairJSON(response, true);

  return items;
}
```

**Rendering Worksheets:**

```typescript
// In your worksheet display component
function WorksheetItem({ item }: { item: WorksheetItem }) {
  return (
    <div className="mb-6">
      <div className="prose">
        {/* Main content with LaTeX support */}
        <div dangerouslySetInnerHTML={{ __html: processLatex(item.content) }} />

        {/* Visual content (SVG or formula) */}
        {item.imageUrl && (
          <div className="my-4">
            {item.imageUrl.startsWith('<svg') ? (
              // Render SVG directly
              <div dangerouslySetInnerHTML={{ __html: item.imageUrl }} />
            ) : item.imageUrl.startsWith('$$') ? (
              // Render LaTeX formula
              <div className="text-center">
                <div dangerouslySetInnerHTML={{ __html: renderLatex(item.imageUrl) }} />
              </div>
            ) : (
              // Regular image
              <img src={item.imageUrl} alt={item.imageCaption} />
            )}
            {item.imageCaption && (
              <p className="text-sm text-gray-600 text-center mt-2">
                {item.imageCaption}
              </p>
            )}
          </div>
        )}

        {/* Answer space */}
        <div className="border-t-2 border-gray-300 mt-4 pt-2">
          {/* Student writes answer here */}
        </div>
      </div>
    </div>
  );
}
```

---

### Feature 5: Class Performance Analysis

**Analyze all student submissions and generate insights.**

```typescript
/**
 * Generate class performance summary
 *
 * @example
 * const summary = await shuttleAI.generateClassSummary({
 *   testTitle: "Algebra Final",
 *   submissions: allSubmissions.map(s => ({
 *     studentName: s.student.name,
 *     score: s.score,
 *     totalPoints: s.totalPoints,
 *     answers: s.answers
 *   }))
 * });
 *
 * // Returns HTML with charts, insights, recommendations
 */
async generateClassSummary(params: {
  testTitle: string;
  testDescription?: string;
  submissions: Array<{
    studentName: string;
    score: number;
    totalPoints: number;
    answers: Array<{
      question: string;
      studentAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
      pointsAwarded: number;
      maxPoints: number;
    }>;
  }>;
}): Promise<string> {
  if (params.submissions.length === 0) {
    return '<div><p>No submissions available to analyze yet.</p></div>';
  }

  const totalStudents = params.submissions.length;
  const avgScore = params.submissions.reduce((sum, s) => sum + s.score, 0) / totalStudents;
  const avgTotal = params.submissions[0]?.totalPoints || 0;
  const avgPercentage = (avgScore / avgTotal) * 100;

  // Analyze each question across all students
  const questionAnalysis: any[] = [];
  const allAnswers = params.submissions.flatMap(s => s.answers);
  const questionMap = new Map<string, any[]>();

  allAnswers.forEach(answer => {
    if (!questionMap.has(answer.question)) {
      questionMap.set(answer.question, []);
    }
    questionMap.get(answer.question)!.push(answer);
  });

  questionMap.forEach((answers, question) => {
    const correctCount = answers.filter(a => a.isCorrect).length;
    const successRate = (correctCount / answers.length) * 100;

    questionAnalysis.push({
      question,
      successRate,
      correctCount,
      incorrectCount: answers.length - correctCount,
      totalAttempts: answers.length,
      commonMistakes: answers
        .filter(a => !a.isCorrect)
        .slice(0, 3)
        .map(a => a.studentAnswer),
      correctAnswer: answers[0]?.correctAnswer
    });
  });

  // Sort by success rate (lowest first - these need most attention)
  questionAnalysis.sort((a, b) => a.successRate - b.successRate);

  const systemPrompt = `You are an expert educator analyzing class performance. Generate a comprehensive, visually appealing HTML summary.

Create a beautiful, professional summary with:
- FontAwesome icons for visual appeal
- Color-coded sections (red for concerns, yellow for caution, green for strengths)
- Clear headings and subheadings
- Bullet points and lists for readability
- Highlight boxes for key insights
- Specific, actionable recommendations`;

  const userPrompt = `Analyze this test performance and create a comprehensive HTML summary:

Test: "${params.testTitle}"

Class Statistics:
- Total Students: ${totalStudents}
- Average Score: ${avgScore.toFixed(1)}/${avgTotal} (${avgPercentage.toFixed(1)}%)
- Highest Score: ${Math.max(...params.submissions.map(s => s.score))}/${avgTotal}
- Lowest Score: ${Math.min(...params.submissions.map(s => s.score))}/${avgTotal}

Question Performance (sorted by difficulty):
${questionAnalysis.map((q, i) => `
${i + 1}. "${q.question}"
   - Success Rate: ${q.successRate.toFixed(1)}%
   - Correct: ${q.correctCount}/${q.totalAttempts}
   - Common Wrong Answers: ${q.commonMistakes.length > 0 ? q.commonMistakes.join(', ') : 'N/A'}
`).join('\n')}

Generate an HTML summary with these sections:

<h2><i class="fas fa-chart-line"></i> Overall Performance</h2>
Summary of class performance with visual indicators

<h2><i class="fas fa-exclamation-triangle"></i> Areas Needing Attention</h2>
Top 3-5 questions with lowest success rates, explain why students struggled

<h2><i class="fas fa-check-circle"></i> Class Strengths</h2>
Topics/questions where students excelled

<h2><i class="fas fa-lightbulb"></i> Recommendations</h2>
Specific, actionable teaching recommendations

<h2><i class="fas fa-graduation-cap"></i> Next Steps</h2>
Suggested review topics, study materials, or follow-up activities

Use div elements with these classes:
- class="highlight-box" for yellow/important notes
- class="tip-box" for blue/helpful tips
- class="warning-box" for red/critical concerns

Return ONLY the HTML content.`;

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  const maxTokens = Math.max(3000, Math.min(6000, totalStudents * 400));
  const response = await this.makeRequest(messages, maxTokens);

  return this.cleanResponse(response);
}
```

---

### Error Handling & Retry Logic

**Implement robust error handling for AI API calls:**

```typescript
// lib/retry.ts
export async function retryWithDelay<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    onRetry?: (error: any, attempt: number) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 10, onRetry } = options;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on client errors (4xx except 429)
      if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }

      if (attempt < maxRetries) {
        // Exponential backoff: 30s base for rate limits
        const delay = error.status === 429 ? 30000 : Math.min(1000 * Math.pow(2, attempt), 30000);

        onRetry?.(error, attempt);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// Usage in ShuttleAIService
private async makeRequest(messages: Message[], maxTokens: number): Promise<string> {
  return retryWithDelay(async () => {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: await this.getModel(),
        messages,
        temperature: 0.7,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const error: any = new Error(`ShuttleAI API error: ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }, {
    maxRetries: 10,
    onRetry: (error, attempt) => {
      console.log(`[ShuttleAI] Retry ${attempt}/10 - ${error.message}`);
    }
  });
}
```

---

### Cost Optimization Tips

1. **Cache Results**: Store generated content (study guides, questions) in database
2. **Batch Operations**: Use comprehensive grading instead of individual calls
3. **Token Limits**: Calculate appropriate max_tokens based on expected output
4. **Model Selection**: Use cheaper models for simple tasks
   - `gpt-5-mini` or `claude-3-7-sonnet` for grading
   - `gpt-5` or `claude-opus-4` for generation
5. **Prompt Engineering**: Be specific to get better results in fewer tokens

---

## Core Features

### 1. Class Management

**Creating a Class:**
```typescript
const classCode = generateClassCode(); // 6-char uppercase

const newClass = await prisma.class.create({
  data: {
    name: "Algebra I - Period 3",
    description: "Morning algebra class",
    code: classCode,
    teacherId: session.user.id,
    organizationId: session.user.orgMemberships[0].orgId,
    theme: "#6366f1",
    emoji: "📚"
  }
});
```

**Joining a Class (Student):**
```typescript
// Student enters class code
const classData = await prisma.class.findUnique({
  where: { code: classCode.toUpperCase() }
});

// Add to class
await prisma.classMember.create({
  data: {
    userId: student.id,
    classId: classData.id,
    role: "STUDENT"
  }
});
```

---

### 2. Test Creation & Taking

**Create Test with AI:**
```typescript
// 1. Create test
const test = await prisma.test.create({
  data: {
    title: "World War II Quiz",
    description: "Covers major events and figures",
    accessCode: generateTestCode(),
    teacherId: session.user.id,
    status: "DRAFT",
    autoGrade: true
  }
});

// 2. Generate questions with AI
const questions = await shuttleAI.generateTestQuestions({
  topic: "World War II major events and key figures",
  numberOfQuestions: 15,
  questionTypes: ["MULTIPLE_CHOICE", "SHORT_ANSWER", "ESSAY"],
  difficulty: "medium"
});

// 3. Save questions
await prisma.question.createMany({
  data: questions.map((q, i) => ({
    testId: test.id,
    type: q.type,
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer,
    points: q.points,
    order: i,
    aiGenerated: true
  }))
});

// 4. Publish
await prisma.test.update({
  where: { id: test.id },
  data: { status: "PUBLISHED" }
});
```

**Student Takes Test:**
```typescript
// 1. Start submission
const submission = await prisma.testSubmission.create({
  data: {
    testId: test.id,
    studentId: student.id,
    status: "IN_PROGRESS"
  }
});

// 2. Student answers questions (one at a time or all together)
await prisma.answer.create({
  data: {
    submissionId: submission.id,
    questionId: question.id,
    answer: studentAnswer
  }
});

// 3. Submit
await prisma.testSubmission.update({
  where: { id: submission.id },
  data: {
    status: "SUBMITTED",
    submittedAt: new Date()
  }
});

// 4. Auto-grade with AI
const gradingResult = await shuttleAI.gradeTestComprehensive({
  testTitle: test.title,
  answers: submission.answers.map(a => ({
    id: a.id,
    question: a.question.question,
    correctAnswer: a.question.correctAnswer,
    studentAnswer: a.answer,
    questionType: a.question.type,
    points: a.question.points
  }))
});

// 5. Save grades
await updateSubmissionGrades(submission.id, gradingResult);
```

---

### 3. Study Sets (Flashcards)

**Create Study Set:**
```typescript
const studySet = await prisma.studySet.create({
  data: {
    title: "Spanish Vocabulary - Chapter 1",
    description: "Common phrases and words",
    creatorId: teacher.id,
    isPublic: false,
    classId: class.id
  }
});

// Add cards
await prisma.studyCard.createMany({
  data: [
    { studySetId: studySet.id, term: "Hola", definition: "Hello", order: 0 },
    { studySetId: studySet.id, term: "Adiós", definition: "Goodbye", order: 1 },
    // ... more cards
  ]
});
```

**Study Modes:**
- **Flashcard Mode**: Flip through cards, click to reveal definition
- **Learn Mode**: Quiz-style, tracks progress, requires correct answers

---

### 4. Worksheets

**Generate Worksheet:**
```typescript
// 1. Create worksheet
const worksheet = await prisma.worksheet.create({
  data: {
    title: "Quadratic Equations Practice",
    subject: "Math",
    gradeLevel: "9th Grade",
    teacherId: teacher.id,
    status: "DRAFT"
  }
});

// 2. Generate items with AI (including graphs!)
const items = await shuttleAI.generateWorksheetItems({
  topic: "Solving quadratic equations",
  subject: "Math",
  gradeLevel: "9th Grade",
  numberOfItems: 20,
  itemTypes: ["PROBLEM", "GRAPH", "FILL_IN_BLANK"],
  difficulty: "medium",
  includeGraphs: true
});

// 3. Save items
await prisma.worksheetItem.createMany({
  data: items.map((item, i) => ({
    worksheetId: worksheet.id,
    type: item.type,
    content: item.content,
    imageUrl: item.imageUrl, // May contain SVG or LaTeX
    answer: item.answer,
    hint: item.hint,
    order: i,
    aiGenerated: true
  }))
});

// 4. Publish
await prisma.worksheet.update({
  where: { id: worksheet.id },
  data: { status: "PUBLISHED" }
});
```

---

## User Flows

### Student Registration Flow

```
1. Student visits /register
2. Clicks "I'm a Student"
3. Enters class code from teacher
4. System validates code
5. Student enters name, email, password
6. System creates account
7. System adds student to class's organization
8. System enrolls student in class
9. Auto sign-in
10. Redirect to student dashboard
```

### Teacher Creating a Test

```
1. Teacher goes to /teacher/test/create
2. Chooses "Generate with AI"
3. Enters topic: "Photosynthesis"
4. Sets number of questions: 15
5. Selects difficulty: medium
6. Selects question types: MC, Short Answer, Essay
7. Clicks "Generate"
8. AI generates 15 questions
9. Teacher reviews and edits if needed
10. Publishes test
11. Gets test access code
```

### Assigning to Class

```
1. Teacher goes to /teacher/classes/[id]
2. Clicks "Assignments" tab
3. Clicks "Create Assignment"
4. Selects type: "Test"
5. Chooses test from list
6. Sets due date
7. Sets availability window
8. Clicks "Assign"
9. Students see assignment on their dashboard
```

### Student Taking Test

```
1. Student sees assignment on dashboard
2. Clicks "Start Test"
3. Views questions one at a time
4. Navigation dots show progress
5. Can go back/forward between questions
6. Answers are auto-saved
7. Clicks "Submit" when done
8. Confirmation modal appears
9. Confirms submission
10. If autoGrade=true: AI grades immediately
11. Student sees results (if showResultsImmediately=true)
```

---

## UI/UX Design System

### Brand Colors

```css
:root {
  --checkmate-primary: #1e40af;       /* Primary blue */
  --checkmate-primary-light: #3b82f6;  /* Light blue */
  --checkmate-accent: #10b981;         /* Green (success) */
  --checkmate-warning: #f59e0b;        /* Yellow (warning) */
  --checkmate-danger: #ef4444;         /* Red (danger) */
  --background: #f8fafc;               /* Off-white */
  --foreground: #0f172a;               /* Dark blue-gray */
  --card: #ffffff;                     /* White */
  --border: #e2e8f0;                   /* Light gray */
}
```

### Typography

```css
/* Body text */
font-family: 'Inter', sans-serif;

/* Headings */
font-family: 'Poppins', sans-serif;
font-weight: 600;
```

### Component Patterns

#### Button Variants

```typescript
// Using class-variance-authority
const buttonVariants = cva(
  "px-4 py-2 rounded-lg font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary-dark",
        destructive: "bg-danger text-white hover:bg-red-600",
        outline: "border border-border bg-transparent hover:bg-gray-50",
        secondary: "bg-gray-200 text-foreground hover:bg-gray-300",
        ghost: "bg-transparent hover:bg-gray-100",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "px-4 py-2 text-sm",
        sm: "px-3 py-1.5 text-xs",
        lg: "px-6 py-3 text-base",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
```

#### Card Component

```tsx
<div className="bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow">
  <h3 className="text-xl font-semibold mb-2">Card Title</h3>
  <p className="text-gray-600">Card description</p>
</div>
```

#### Modal Component

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, type = 'info', children }: ModalProps) {
  const icons = {
    success: <CheckCircle className="w-12 h-12 text-green-500" />,
    error: <XCircle className="w-12 h-12 text-red-500" />,
    warning: <AlertTriangle className="w-12 h-12 text-yellow-500" />,
    info: <Info className="w-12 h-12 text-blue-500" />
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex flex-col items-center text-center">
          {icons[type]}
          <h2 className="text-2xl font-bold mt-4 mb-2">{title}</h2>
          <div className="text-gray-600">{children}</div>
        </div>
      </div>
    </div>
  );
}
```

#### Tab Navigation

```tsx
function TabNavigation({ tabs, activeTab, onTabChange, themeColor }) {
  return (
    <div className="border-b border-border mb-6">
      <nav className="flex space-x-8">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "pb-4 px-1 border-b-2 font-medium transition-colors",
              activeTab === tab.id
                ? "border-current text-foreground"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
            style={activeTab === tab.id ? { color: themeColor } : {}}
          >
            <i className={`${tab.icon} mr-2`} />
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
```

### Class Theme System

```tsx
// Predefined colors (12 options)
const CLASS_COLORS = [
  '#6366f1', '#a855f7', '#ec4899', '#f43f5e',
  '#f97316', '#f59e0b', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#8b5cf6'
];

// Predefined emojis (12 options)
const CLASS_EMOJIS = [
  '📚', '🎓', '✏️', '📖', '🧮', '🔬',
  '🎨', '🎭', '🎵', '⚡', '🌟', '🚀'
];

// Class header with theme
function ClassHeader({ classData }) {
  return (
    <div
      className="rounded-lg p-6 text-white"
      style={{ backgroundColor: classData.theme }}
    >
      <div className="flex items-center gap-3">
        <span className="text-4xl">{classData.emoji}</span>
        <div>
          <h1 className="text-3xl font-bold">{classData.name}</h1>
          <p className="opacity-90">{classData.description}</p>
        </div>
      </div>

      {/* Class code display */}
      <div className="mt-4 inline-block bg-white/20 px-4 py-2 rounded">
        <span className="text-sm opacity-75">Class Code:</span>
        <span className="ml-2 font-mono text-xl font-bold tracking-wider">
          {classData.code}
        </span>
      </div>
    </div>
  );
}
```

---

## Migration Strategy

### Phase 1: Planning (Week 1)

1. **Choose framework** (Recommended: SvelteKit)
2. **Set up project structure**
   ```bash
   npm create svelte@latest checkmate-svelte
   cd checkmate-svelte
   npm install

   # Install dependencies
   npm install prisma @prisma/client
   npm install lucia-auth
   npm install zod
   npm install tailwindcss autoprefixer
   npm install -D @tailwindcss/typography
   ```

3. **Copy database schema**
   ```bash
   cp ../the-evaluator/prisma/schema.prisma ./prisma/
   npx prisma generate
   ```

4. **Set up authentication**
   - Choose: Lucia Auth (lightweight, SvelteKit-native)
   - Implement session management
   - Create login/register pages

---

### Phase 2: Core Infrastructure (Week 2-3)

1. **Database layer** (same Prisma schema)
2. **Authentication system**
3. **Authorization helpers**
4. **ShuttleAI service** (port TypeScript class)
5. **Base layout and navigation**

---

### Phase 3: Feature Migration (Week 4-8)

**Week 4: User Management**
- Registration flows
- Login/logout
- User dashboard
- Organization management

**Week 5: Classes**
- Create/edit/delete classes
- Class member management
- Class code system
- Class dashboard

**Week 6: Tests**
- Test creation (manual + AI)
- Question editing
- Test taking interface
- Submission grading

**Week 7: Study Tools**
- Study sets (flashcards)
- Learn mode
- Worksheets
- Study guides

**Week 8: Analytics & Polish**
- Class summaries
- Grade tracking
- Reports
- UI polish

---

### Phase 4: Data Migration (Week 9)

1. **Export existing data**
   ```typescript
   // Export script
   const users = await prisma.user.findMany();
   const orgs = await prisma.organization.findMany();
   // ... export all tables

   fs.writeFileSync('migration-data.json', JSON.stringify({
     users, orgs, classes, tests
   }));
   ```

2. **Import to new system**
   ```typescript
   const data = JSON.parse(fs.readFileSync('migration-data.json'));

   // Same database schema = direct import
   await prisma.user.createMany({ data: data.users });
   await prisma.organization.createMany({ data: data.orgs });
   // ... import all tables
   ```

3. **Verify data integrity**
4. **Run in parallel** (old + new) for 1-2 weeks
5. **Switch DNS** when confident

---

### Phase 5: Testing & Deployment (Week 10)

1. **Unit tests** for critical functions
2. **Integration tests** for API routes
3. **E2E tests** for user flows
4. **Performance testing**
5. **Deploy to production**

---

## Additional Resources

### ShuttleAI Resources
- **Docs**: https://docs.shuttleai.com
- **Pricing**: https://shuttleai.com/pricing
- **Models**: https://shuttleai.com/models
- **Discord**: https://discord.gg/shuttleai

### SvelteKit Resources
- **Docs**: https://kit.svelte.dev/docs
- **Tutorial**: https://learn.svelte.dev
- **Examples**: https://github.com/sveltejs/kit/tree/master/examples
- **Discord**: https://svelte.dev/chat

### Remix Resources
- **Docs**: https://remix.run/docs
- **Examples**: https://github.com/remix-run/examples
- **Discord**: https://rmx.as/discord

### Database
- **Prisma Docs**: https://www.prisma.io/docs
- **Schema Reference**: https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference

---

## Summary

This guide provides everything needed to rewrite Checkmate in any modern framework:

✅ **Complete tech stack** overview
✅ **Database schema** with all 31 models
✅ **Authentication & authorization** implementation
✅ **ShuttleAI integration** with full code examples
✅ **Framework recommendations** with pros/cons
✅ **UI/UX design system** with colors, components, patterns
✅ **Migration strategy** with timeline

**Recommended Stack for Rewrite:**
```
SvelteKit 2.x
+ Prisma (same schema)
+ Lucia Auth
+ TailwindCSS
+ Superforms + Zod
+ ShuttleAI (same service)
```

**Key Benefits:**
- 40-60% smaller bundle sizes
- Faster development
- Simpler mental model
- Same database (no migration needed)
- Same AI service (just port the class)

Good luck with the rewrite! 🚀
