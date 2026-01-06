<script lang="ts">
  import { Users, FileText, ClipboardList, BookOpen, Plus, ArrowRight } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<div class="max-w-6xl mx-auto">
  <!-- Stats -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <div class="stat-card">
      <div class="stat-value">{data.stats.totalClasses}</div>
      <div class="stat-label">Classes</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{data.stats.totalStudents}</div>
      <div class="stat-label">Students</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{data.stats.totalTests}</div>
      <div class="stat-label">Tests</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{data.stats.pendingSubmissions}</div>
      <div class="stat-label">Pending Grading</div>
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="mb-8">
    <h2 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <a href="/teacher/tests/create" class="card p-4 hover:border-blue-300 transition-colors">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <FileText class="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div class="font-medium text-gray-900">Create Test</div>
            <div class="text-sm text-gray-500">New test or quiz</div>
          </div>
        </div>
      </a>

      <a href="/teacher/worksheets/create" class="card p-4 hover:border-blue-300 transition-colors">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <ClipboardList class="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div class="font-medium text-gray-900">Create Worksheet</div>
            <div class="text-sm text-gray-500">Printable worksheet</div>
          </div>
        </div>
      </a>

      <a href="/teacher/classes/create" class="card p-4 hover:border-blue-300 transition-colors">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Users class="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <div class="font-medium text-gray-900">Create Class</div>
            <div class="text-sm text-gray-500">New classroom</div>
          </div>
        </div>
      </a>

      <a href="/teacher/study-sets/create" class="card p-4 hover:border-blue-300 transition-colors">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <BookOpen class="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div class="font-medium text-gray-900">Create Study Set</div>
            <div class="text-sm text-gray-500">Flashcards</div>
          </div>
        </div>
      </a>
    </div>
  </div>

  <div class="grid lg:grid-cols-2 gap-6">
    <!-- Recent Tests -->
    <div class="card">
      <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 class="font-semibold text-gray-900">Recent Tests</h3>
        <a href="/teacher/tests" class="text-sm text-blue-600 hover:underline">View all</a>
      </div>
      <div class="p-4">
        {#if data.recentTests.length === 0}
          <div class="empty-state">
            <FileText class="empty-state-icon" />
            <div class="empty-state-title">No tests yet</div>
            <div class="empty-state-text">Create your first test to get started.</div>
            <a href="/teacher/tests/create" class="btn btn-primary btn-sm mt-4">
              <Plus class="w-4 h-4" />
              Create Test
            </a>
          </div>
        {:else}
          <div class="space-y-3">
            {#each data.recentTests as test}
              <a href="/teacher/tests/{test.id}" class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                <div>
                  <div class="font-medium text-gray-900">{test.title}</div>
                  <div class="text-sm text-gray-500">
                    {test._count.questions} questions · {test._count.submissions} submissions
                  </div>
                </div>
                <span class="badge {test.status === 'PUBLISHED' ? 'badge-green' : 'badge-gray'}">
                  {test.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                </span>
              </a>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Recent Submissions -->
    <div class="card">
      <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 class="font-semibold text-gray-900">Recent Submissions</h3>
        <a href="/teacher/submissions" class="text-sm text-blue-600 hover:underline">View all</a>
      </div>
      <div class="p-4">
        {#if data.recentSubmissions.length === 0}
          <div class="empty-state">
            <ClipboardList class="empty-state-icon" />
            <div class="empty-state-title">No submissions yet</div>
            <div class="empty-state-text">Submissions will appear here when students complete tests.</div>
          </div>
        {:else}
          <div class="space-y-3">
            {#each data.recentSubmissions as submission}
              <div class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                <div>
                  <div class="font-medium text-gray-900">{submission.student.name}</div>
                  <div class="text-sm text-gray-500">{submission.test.title}</div>
                </div>
                {#if submission.status === 'GRADED'}
                  <span class="badge badge-green">
                    {Math.round((submission.score || 0) / (submission.totalPoints || 1) * 100)}%
                  </span>
                {:else if submission.status === 'SUBMITTED'}
                  <span class="badge badge-yellow">Needs Grading</span>
                {:else}
                  <span class="badge badge-gray">In Progress</span>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
