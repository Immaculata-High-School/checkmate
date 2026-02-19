<script lang="ts">
  import { CheckCircle, XCircle, BookOpen, Link, Upload, Users } from 'lucide-svelte';
  import PowerSchoolIcon from '$lib/components/PowerSchoolIcon.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<div class="max-w-4xl mx-auto">
  <!-- Header -->
  <div class="flex items-center gap-3 mb-6">
    <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
      <PowerSchoolIcon class="w-6 h-6 text-blue-600" />
    </div>
    <div>
      <h1 class="text-2xl font-bold text-gray-900">PowerSchool Integration</h1>
      <p class="text-sm text-gray-500">Sync grades from Checkmate to PowerSchool</p>
    </div>
  </div>

  {#if data.powerSchoolEnabled}
    <!-- Enabled State -->
    <div class="card p-4 mb-6 bg-green-50 border-green-200">
      <div class="flex items-center gap-3">
        <CheckCircle class="w-5 h-5 text-green-600 flex-shrink-0" />
        <div>
          <p class="font-medium text-green-800">PowerSchool is enabled for your organization</p>
          <p class="text-sm text-green-600">Teachers can connect their PowerSchool accounts and release grades.</p>
        </div>
      </div>
    </div>

    <div class="card p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">How Teachers Use PowerSchool</h2>
      <p class="text-gray-600 text-sm mb-6">
        Share these instructions with your teachers so they can start syncing grades to PowerSchool.
      </p>

      <div class="space-y-6">
        <!-- Step 1 -->
        <div class="flex gap-4">
          <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <Link class="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 class="font-medium text-gray-900">1. Connect PowerSchool Account</h3>
            <p class="text-sm text-gray-600 mt-1">
              Teachers go to <strong>Settings</strong> in their teacher dashboard and click <strong>"Connect PowerSchool"</strong>. They'll log in with their existing PowerSchool credentials — no admin setup required.
            </p>
          </div>
        </div>

        <!-- Step 2 -->
        <div class="flex gap-4">
          <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <BookOpen class="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 class="font-medium text-gray-900">2. Link Classes to PowerSchool Sections</h3>
            <p class="text-sm text-gray-600 mt-1">
              After connecting, teachers can link each Checkmate class to a PowerSchool section. This tells Checkmate where to send grades. They can also choose a default assignment category (e.g., Tests, Quizzes).
            </p>
          </div>
        </div>

        <!-- Step 3 -->
        <div class="flex gap-4">
          <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <Users class="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 class="font-medium text-gray-900">3. Map Students</h3>
            <p class="text-sm text-gray-600 mt-1">
              Teachers match Checkmate students to their PowerSchool records. This can be done automatically by email or manually for students whose names don't match.
            </p>
          </div>
        </div>

        <!-- Step 4 -->
        <div class="flex gap-4">
          <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <Upload class="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 class="font-medium text-gray-900">4. Release Grades</h3>
            <p class="text-sm text-gray-600 mt-1">
              After grading a test or document, teachers click <strong>"Release to PowerSchool"</strong> on the submissions page. Scores are sent directly to the PowerSchool gradebook.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="card p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-2">Need Help?</h2>
      <p class="text-sm text-gray-600">
        If teachers are having trouble connecting, make sure they're using their <strong>PowerSchool teacher login credentials</strong> (not admin credentials). No PowerSchool plugin or admin configuration is needed — teachers log in directly with their own accounts.
      </p>
    </div>
  {:else}
    <!-- Disabled State -->
    <div class="card p-4 mb-6 bg-amber-50 border-amber-200">
      <div class="flex items-center gap-3">
        <XCircle class="w-5 h-5 text-amber-600 flex-shrink-0" />
        <div>
          <p class="font-medium text-amber-800">PowerSchool is not enabled</p>
          <p class="text-sm text-amber-600">This feature is currently disabled for your organization.</p>
        </div>
      </div>
    </div>

    <div class="card p-8 text-center">
      <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <PowerSchoolIcon class="w-8 h-8 text-gray-400" />
      </div>
      <h2 class="text-xl font-bold text-gray-900 mb-2">PowerSchool Integration</h2>
      <p class="text-gray-600 mb-2">
        The PowerSchool integration lets teachers release grades directly from Checkmate to the PowerSchool gradebook.
      </p>
      <p class="text-gray-500 text-sm">
        Please ask your <strong>Checkmate ambassador</strong> to enable this feature for your organization.
      </p>
    </div>
  {/if}
</div>
