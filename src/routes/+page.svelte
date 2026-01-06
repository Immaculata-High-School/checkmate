<script lang="ts">
  import { Users, FileText, BookOpen, CheckCircle, ArrowRight } from 'lucide-svelte';
  import ChessKing from '$lib/components/ChessKing.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

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
        {#if data.user}
          <a href="/dashboard" class="btn btn-primary">
            Go to Dashboard
          </a>
        {:else}
          <a href="/login" class="btn btn-ghost">Sign In</a>
          <a href="/register" class="btn btn-primary">Get Started</a>
        {/if}
      </nav>
    </div>
  </header>

  <!-- Hero -->
  <section class="py-20 px-4">
    <div class="max-w-3xl mx-auto text-center">
      <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
        The Simple Way to Create and Manage Tests
      </h1>
      <p class="text-xl text-gray-600 mb-8">
        Checkmate helps schools create tests, worksheets, and study materials.
        Teachers focus on teaching while we handle the rest.
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="/register" class="btn btn-primary btn-lg">
          Request School Access
          <ArrowRight class="w-5 h-5" />
        </a>
        <a href="/join" class="btn btn-secondary btn-lg">
          Join with Class Code
        </a>
      </div>
    </div>
  </section>

  <!-- Features -->
  <section class="py-16 px-4 bg-gray-50">
    <div class="max-w-5xl mx-auto">
      <h2 class="text-2xl font-bold text-gray-900 text-center mb-12">
        Everything your school needs
      </h2>

      <div class="grid md:grid-cols-3 gap-8">
        <div class="bg-white p-6 rounded-lg border border-gray-200">
          <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <FileText class="w-5 h-5 text-blue-600" />
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Tests & Quizzes</h3>
          <p class="text-gray-600">
            Create tests manually or generate them with AI. Multiple choice, short answer, essays, and more.
          </p>
        </div>

        <div class="bg-white p-6 rounded-lg border border-gray-200">
          <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <BookOpen class="w-5 h-5 text-green-600" />
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Worksheets</h3>
          <p class="text-gray-600">
            Build printable worksheets with problems, diagrams, and answer keys. Great for homework and practice.
          </p>
        </div>

        <div class="bg-white p-6 rounded-lg border border-gray-200">
          <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <Users class="w-5 h-5 text-purple-600" />
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Class Management</h3>
          <p class="text-gray-600">
            Organize students into classes, assign work, and track progress all in one place.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- How it works -->
  <section class="py-16 px-4">
    <div class="max-w-4xl mx-auto">
      <h2 class="text-2xl font-bold text-gray-900 text-center mb-12">
        How it works
      </h2>

      <div class="space-y-8">
        <div class="flex gap-6 items-start">
          <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
            1
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-1">School admin requests access</h3>
            <p class="text-gray-600">Fill out a quick form and we'll set up your school account.</p>
          </div>
        </div>

        <div class="flex gap-6 items-start">
          <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
            2
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-1">Invite your teachers</h3>
            <p class="text-gray-600">Send email invitations to teachers. They create accounts and start building content.</p>
          </div>
        </div>

        <div class="flex gap-6 items-start">
          <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
            3
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-1">Students join with a code</h3>
            <p class="text-gray-600">Teachers share class codes. Students join and access their assignments.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="py-16 px-4 bg-blue-600">
    <div class="max-w-3xl mx-auto text-center">
      <h2 class="text-2xl font-bold text-white mb-4">
        Ready to get started?
      </h2>
      <p class="text-blue-100 mb-8">
        Request access for your school today. It's free to try.
      </p>
      <a href="/register" class="btn bg-white text-blue-600 hover:bg-gray-100 btn-lg">
        Request School Access
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
