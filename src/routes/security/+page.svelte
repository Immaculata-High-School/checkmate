<script lang="ts">
  import {
    Shield,
    Lock,
    Eye,
    EyeOff,
    Database,
    Server,
    Users,
    GraduationCap,
    KeyRound,
    ShieldCheck,
    FileCheck,
    Globe,
    CheckCircle,
    ArrowRight,
    Baby
  } from 'lucide-svelte';
  import ChessKing from '$lib/components/ChessKing.svelte';
  import PowerSchoolIcon from '$lib/components/PowerSchoolIcon.svelte';
</script>

<svelte:head>
  <title>Security & Privacy - Checkmate</title>
  <meta name="description" content="Learn how Checkmate protects student data, teacher credentials, and school information with enterprise-grade security." />
</svelte:head>

<div class="min-h-screen bg-white">
  <!-- Header -->
  <header class="border-b border-gray-200">
    <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
      <a href="/" class="flex items-center gap-2">
        <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <ChessKing class="w-5 h-5 text-white" />
        </div>
        <span class="text-xl font-bold text-gray-900">Checkmate</span>
      </a>
      <nav class="flex items-center gap-4">
        <a href="/login" class="btn btn-ghost">Sign In</a>
        <a href="/register" class="btn btn-primary">Get Started</a>
      </nav>
    </div>
  </header>

  <!-- Hero -->
  <section class="py-16 px-4 bg-gradient-to-b from-gray-50 to-white">
    <div class="max-w-4xl mx-auto text-center">
      <div class="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
        <ShieldCheck class="w-4 h-4" />
        Enterprise-Grade Security
      </div>
      <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
        Your Data is Safe with Checkmate
      </h1>
      <p class="text-xl text-gray-600 max-w-2xl mx-auto">
        We take the security and privacy of student data, teacher credentials, and school information seriously. Here's how we protect everything.
      </p>
    </div>
  </section>

  <!-- COPPA Compliance Badge -->
  <section class="py-12 px-4">
    <div class="max-w-4xl mx-auto">
      <div class="bg-blue-50 border border-blue-200 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-6">
        <div class="w-24 h-24 bg-white rounded-2xl shadow-sm border border-blue-200 flex items-center justify-center flex-shrink-0">
          <div class="text-center">
            <Baby class="w-8 h-8 text-blue-600 mx-auto mb-1" />
            <span class="text-[10px] font-bold text-blue-600 uppercase tracking-wide">COPPA</span>
          </div>
        </div>
        <div>
          <h2 class="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            COPPA Compliant
            <CheckCircle class="w-5 h-5 text-green-500" />
          </h2>
          <p class="text-gray-600">
            Checkmate is fully compliant with the <strong>Children's Online Privacy Protection Act (COPPA)</strong>. We collect only the minimum data necessary for educational purposes. Student accounts are created through teacher-issued class codes — never independently. We do not collect personal information from children under 13 without verifiable parental or school consent, and we never sell, share, or use student data for advertising or marketing purposes.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Trust Badges Row -->
  <section class="py-8 px-4">
    <div class="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="text-center p-4 bg-gray-50 rounded-xl">
        <Lock class="w-6 h-6 text-blue-600 mx-auto mb-2" />
        <p class="text-sm font-semibold text-gray-900">256-bit TLS</p>
        <p class="text-xs text-gray-500">Encrypted in Transit</p>
      </div>
      <div class="text-center p-4 bg-gray-50 rounded-xl">
        <KeyRound class="w-6 h-6 text-blue-600 mx-auto mb-2" />
        <p class="text-sm font-semibold text-gray-900">Bcrypt Hashed</p>
        <p class="text-xs text-gray-500">Passwords & Credentials</p>
      </div>
      <div class="text-center p-4 bg-gray-50 rounded-xl">
        <Database class="w-6 h-6 text-blue-600 mx-auto mb-2" />
        <p class="text-sm font-semibold text-gray-900">Encrypted at Rest</p>
        <p class="text-xs text-gray-500">Database & Tokens</p>
      </div>
      <div class="text-center p-4 bg-gray-50 rounded-xl">
        <ShieldCheck class="w-6 h-6 text-blue-600 mx-auto mb-2" />
        <p class="text-sm font-semibold text-gray-900">Role-Based Access</p>
        <p class="text-xs text-gray-500">Strict Permissions</p>
      </div>
    </div>
  </section>

  <!-- Student Data Protection -->
  <section class="py-12 px-4">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <GraduationCap class="w-6 h-6 text-blue-600" />
        </div>
        <h2 class="text-2xl font-bold text-gray-900">Student Data Protection</h2>
      </div>

      <div class="grid md:grid-cols-2 gap-6">
        <div class="bg-gray-50 rounded-xl p-6">
          <h3 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <EyeOff class="w-4 h-4 text-blue-600" />
            Minimal Data Collection
          </h3>
          <p class="text-sm text-gray-600">
            We only collect what's needed: name, date of birth, and email. No social media profiles, no tracking cookies, no behavioral analytics. Student data is used exclusively for educational purposes.
          </p>
        </div>

        <div class="bg-gray-50 rounded-xl p-6">
          <h3 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Lock class="w-4 h-4 text-blue-600" />
            Passwords are Never Stored
          </h3>
          <p class="text-sm text-gray-600">
            Student passwords are hashed using <strong>bcrypt</strong> with unique salts. Even we can't see them. The original password is irreversibly transformed — it can only be verified, never retrieved.
          </p>
        </div>

        <div class="bg-gray-50 rounded-xl p-6">
          <h3 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Shield class="w-4 h-4 text-blue-600" />
            Students Can Only See Their Own Data
          </h3>
          <p class="text-sm text-gray-600">
            Every request is verified server-side. Students can only access their own submissions, grades, and assignments. They cannot view other students' work or personal information.
          </p>
        </div>

        <div class="bg-gray-50 rounded-xl p-6">
          <h3 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users class="w-4 h-4 text-blue-600" />
            Teacher-Controlled Access
          </h3>
          <p class="text-sm text-gray-600">
            Students can only join a class with a <strong>teacher-issued code</strong>. There's no open registration — teachers control exactly who enters their classroom.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Teacher & Admin Security -->
  <section class="py-12 px-4 bg-gray-50">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <KeyRound class="w-6 h-6 text-green-600" />
        </div>
        <h2 class="text-2xl font-bold text-gray-900">Teacher & Admin Security</h2>
      </div>

      <div class="space-y-4">
        <div class="bg-white rounded-xl p-6 border border-gray-200">
          <h3 class="font-semibold text-gray-900 mb-2">Secure Session Management</h3>
          <p class="text-sm text-gray-600">
            Teacher and admin sessions use cryptographically random tokens stored in <strong>HTTP-only, secure cookies</strong>. Sessions can't be accessed by JavaScript, can't be stolen via XSS attacks, and are only sent over HTTPS in production. Sessions automatically expire and are invalidated on logout.
          </p>
        </div>

        <div class="bg-white rounded-xl p-6 border border-gray-200">
          <h3 class="font-semibold text-gray-900 mb-2">Role-Based Access Control (RBAC)</h3>
          <p class="text-sm text-gray-600 mb-3">
            Every user has a specific role that determines exactly what they can access. Permissions are enforced on the server — not the browser.
          </p>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            {#each [
              { role: 'Org Owner', desc: 'Full org control' },
              { role: 'Org Admin', desc: 'Admin access' },
              { role: 'Dept. Head', desc: 'Department level' },
              { role: 'Teacher', desc: 'Class management' },
              { role: 'TA', desc: 'Assist teachers' },
              { role: 'Student', desc: 'Own data only' }
            ] as item}
              <div class="bg-gray-50 rounded-lg px-3 py-2">
                <p class="text-xs font-semibold text-gray-900">{item.role}</p>
                <p class="text-xs text-gray-500">{item.desc}</p>
              </div>
            {/each}
          </div>
        </div>

        <div class="bg-white rounded-xl p-6 border border-gray-200">
          <h3 class="font-semibold text-gray-900 mb-2">Organization Data Isolation</h3>
          <p class="text-sm text-gray-600">
            Each school's data is completely isolated. Teachers can only access their own classes. Organization admins can only see their own organization. Even Checkmate platform administrators <strong>cannot access private organization data</strong> — your school stays in your control.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- PowerSchool Integration Security -->
  <section class="py-12 px-4">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <PowerSchoolIcon class="w-6 h-6 text-blue-600" />
        </div>
        <h2 class="text-2xl font-bold text-gray-900">PowerSchool Integration Security</h2>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h3 class="font-semibold text-gray-900 mb-3">We Never See PowerSchool Passwords</h3>
        <p class="text-sm text-gray-600 mb-4">
          Checkmate uses <strong>OAuth 2.0</strong> to connect to PowerSchool. Teachers log in to PowerSchool directly — their credentials are never sent to or stored by Checkmate. We only receive a limited-scope access token.
        </p>
        <div class="bg-gray-50 rounded-lg p-4 font-mono text-xs text-gray-500 text-center">
          Teacher → PowerSchool Login → OAuth Token → Checkmate (encrypted storage)
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-4">
        <div class="bg-white rounded-xl border border-gray-200 p-5">
          <h4 class="font-semibold text-gray-900 mb-2 text-sm">Token Encryption</h4>
          <p class="text-sm text-gray-600">
            OAuth access and refresh tokens are stored <strong>encrypted</strong> in the database. They cannot be read without the encryption key. Teachers can revoke access at any time.
          </p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-5">
          <h4 class="font-semibold text-gray-900 mb-2 text-sm">Scope Limitations</h4>
          <p class="text-sm text-gray-600">
            The integration only requests the minimum permissions needed to release grades. It cannot modify student records, change schedules, or access data beyond what's necessary.
          </p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-5">
          <h4 class="font-semibold text-gray-900 mb-2 text-sm">CSRF Protection</h4>
          <p class="text-sm text-gray-600">
            The OAuth flow includes a <strong>state parameter</strong> that prevents cross-site request forgery attacks. Redirect URIs are strictly validated.
          </p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-5">
          <h4 class="font-semibold text-gray-900 mb-2 text-sm">Secure API Gateway</h4>
          <p class="text-sm text-gray-600">
            All communication with PowerSchool goes through an encrypted API gateway. Traffic is encrypted both ways using TLS. No direct browser-to-PowerSchool communication.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Infrastructure & Technical Security -->
  <section class="py-12 px-4 bg-gray-50">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <Server class="w-6 h-6 text-purple-600" />
        </div>
        <h2 class="text-2xl font-bold text-gray-900">Infrastructure & Technical Security</h2>
      </div>

      <div class="space-y-4">
        <div class="bg-white rounded-xl p-6 border border-gray-200">
          <h3 class="font-semibold text-gray-900 mb-2">Encryption Everywhere</h3>
          <ul class="space-y-2 text-sm text-gray-600">
            <li class="flex items-start gap-2">
              <CheckCircle class="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span><strong>In transit:</strong> All traffic uses HTTPS/TLS encryption. Cookies are marked <code class="bg-gray-100 px-1 rounded">Secure</code> and <code class="bg-gray-100 px-1 rounded">HttpOnly</code>.</span>
            </li>
            <li class="flex items-start gap-2">
              <CheckCircle class="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span><strong>At rest:</strong> Database connections use SSL/TLS. Sensitive tokens are encrypted before storage.</span>
            </li>
            <li class="flex items-start gap-2">
              <CheckCircle class="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span><strong>Passwords:</strong> Bcrypt with cost factor 10 — adaptive, salted, and irreversible.</span>
            </li>
          </ul>
        </div>

        <div class="bg-white rounded-xl p-6 border border-gray-200">
          <h3 class="font-semibold text-gray-900 mb-2">SQL Injection Prevention</h3>
          <p class="text-sm text-gray-600">
            We use <strong>Prisma ORM</strong> with parameterized queries. User input is never concatenated into SQL statements, making SQL injection attacks impossible.
          </p>
        </div>

        <div class="bg-white rounded-xl p-6 border border-gray-200">
          <h3 class="font-semibold text-gray-900 mb-2">Rate Limiting & Abuse Protection</h3>
          <p class="text-sm text-gray-600">
            AI-powered features are rate-limited to prevent abuse. Requests are tracked per-user with sliding window throttling. Excessive requests are queued gracefully rather than rejected.
          </p>
        </div>

        <div class="bg-white rounded-xl p-6 border border-gray-200">
          <h3 class="font-semibold text-gray-900 mb-2">Audit Logging</h3>
          <p class="text-sm text-gray-600">
            Every authentication event, permission change, and administrative action is logged with timestamps, user IDs, and IP addresses. Logs are searchable and retained for compliance purposes.
          </p>
        </div>

        <div class="bg-white rounded-xl p-6 border border-gray-200">
          <h3 class="font-semibold text-gray-900 mb-2">No Secrets in Code</h3>
          <p class="text-sm text-gray-600">
            Database credentials, API keys, and OAuth secrets are stored as environment variables — never hardcoded. The application runs in isolated Docker containers with minimal attack surface.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- COPPA Details -->
  <section class="py-12 px-4">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
          <Baby class="w-6 h-6 text-amber-600" />
        </div>
        <h2 class="text-2xl font-bold text-gray-900">COPPA Compliance Details</h2>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="divide-y divide-gray-200">
          <div class="p-5 flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 class="font-semibold text-gray-900 text-sm">No Direct Child Registration</h4>
              <p class="text-sm text-gray-600">Students cannot create accounts independently. They must use a teacher-issued class code, ensuring school consent is in place before any data is collected.</p>
            </div>
          </div>

          <div class="p-5 flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 class="font-semibold text-gray-900 text-sm">Data Minimization</h4>
              <p class="text-sm text-gray-600">We only collect information necessary for the educational service: name, date of birth, and email. No photos, locations, social profiles, or unnecessary personal details.</p>
            </div>
          </div>

          <div class="p-5 flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 class="font-semibold text-gray-900 text-sm">No Advertising or Marketing</h4>
              <p class="text-sm text-gray-600">Student data is never used for advertising, marketing, or profiling. There are no third-party ad trackers, no behavioral targeting, and no data sales — ever.</p>
            </div>
          </div>

          <div class="p-5 flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 class="font-semibold text-gray-900 text-sm">School Acts as Agent of Consent</h4>
              <p class="text-sm text-gray-600">Under COPPA's school exception, schools can consent on behalf of parents for educational services. Teachers and administrators control student account creation and data access.</p>
            </div>
          </div>

          <div class="p-5 flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 class="font-semibold text-gray-900 text-sm">Data Deletion Rights</h4>
              <p class="text-sm text-gray-600">Schools and parents can request deletion of a student's personal information at any time. We will promptly remove all associated data from our systems.</p>
            </div>
          </div>

          <div class="p-5 flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 class="font-semibold text-gray-900 text-sm">Secure Data Handling</h4>
              <p class="text-sm text-gray-600">All student data is encrypted in transit and at rest. Access is restricted by role-based permissions. We maintain comprehensive audit logs for accountability.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Security Summary -->
  <section class="py-12 px-4 bg-gray-50">
    <div class="max-w-4xl mx-auto">
      <h2 class="text-2xl font-bold text-gray-900 text-center mb-8">Security at a Glance</h2>
      <div class="grid md:grid-cols-3 gap-6">
        <div class="bg-white rounded-xl p-6 border border-gray-200 text-center">
          <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock class="w-6 h-6 text-blue-600" />
          </div>
          <h3 class="font-semibold text-gray-900 mb-1">Authentication</h3>
          <p class="text-sm text-gray-500">Secure sessions, bcrypt passwords, HTTP-only cookies, automatic expiration</p>
        </div>
        <div class="bg-white rounded-xl p-6 border border-gray-200 text-center">
          <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Shield class="w-6 h-6 text-green-600" />
          </div>
          <h3 class="font-semibold text-gray-900 mb-1">Authorization</h3>
          <p class="text-sm text-gray-500">Role-based access, data isolation, server-side enforcement, audit logs</p>
        </div>
        <div class="bg-white rounded-xl p-6 border border-gray-200 text-center">
          <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Globe class="w-6 h-6 text-purple-600" />
          </div>
          <h3 class="font-semibold text-gray-900 mb-1">Compliance</h3>
          <p class="text-sm text-gray-500">COPPA compliant, data minimization, no ads, school-controlled consent</p>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="py-16 px-4 bg-blue-600">
    <div class="max-w-3xl mx-auto text-center">
      <h2 class="text-2xl font-bold text-white mb-4">
        Have security questions?
      </h2>
      <p class="text-blue-100 mb-8">
        We're happy to answer any questions about how we protect your school's data.
      </p>
      <a href="/register" class="btn bg-white text-blue-600 hover:bg-gray-100 btn-lg">
        Get Started
        <ArrowRight class="w-5 h-5" />
      </a>
    </div>
  </section>

  <!-- Footer -->
  <footer class="py-8 px-4 border-t border-gray-200">
    <div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
          <ChessKing class="w-4 h-4 text-white" />
        </div>
        <span class="font-semibold text-gray-900">Checkmate</span>
      </div>
      <p class="text-sm text-gray-500">
        &copy; 2025 Checkmate. All rights reserved.
      </p>
    </div>
  </footer>
</div>
