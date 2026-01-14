<script lang="ts">
  import { FileText, Plus, Search, MoreVertical, Edit, Trash2, Copy, Eye } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let searchQuery = $state('');

  const filteredTests = $derived(
    data.tests.filter(test =>
      test.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
</script>

<div class="max-w-6xl mx-auto">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
        <FileText class="w-5 h-5 text-blue-600" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Tests</h1>
        <p class="text-gray-600">Create and manage your tests</p>
      </div>
    </div>
    <div class="flex gap-3">
      <a href="/teacher/tests/create" class="btn btn-primary">
        <Plus class="w-4 h-4" />
        Create Test
      </a>
    </div>
  </div>

  <!-- Search -->
  <div class="mb-6">
    <div class="relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search tests..."
        class="input pl-10"
      />
    </div>
  </div>

  <!-- Tests List -->
  {#if filteredTests.length === 0}
    <div class="card p-12">
      <div class="empty-state">
        <FileText class="empty-state-icon" />
        <div class="empty-state-title">
          {searchQuery ? 'No tests found' : 'No tests yet'}
        </div>
        <div class="empty-state-text">
          {searchQuery ? 'Try a different search term' : 'Create your first test to get started'}
        </div>
        {#if !searchQuery}
          <a href="/teacher/tests/create" class="btn btn-primary mt-4">
            <Plus class="w-4 h-4" />
            Create Test
          </a>
        {/if}
      </div>
    </div>
  {:else}
    <div class="space-y-3">
      {#each filteredTests as test}
        <a href="/teacher/tests/{test.id}" class="card p-4 hover:border-blue-300 transition-colors block">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText class="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 class="font-medium text-gray-900">{test.title}</h3>
                <div class="text-sm text-gray-500">
                  {test._count.questions} questions · {test._count.submissions} submissions
                  {#if test.accessCode}
                    · Code: <span class="font-mono">{test.accessCode}</span>
                  {/if}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="badge {test.status === 'PUBLISHED' ? 'badge-green' : 'badge-gray'}" title="{test.status === 'PUBLISHED' ? 'Students can access this test' : 'Not yet visible to students'}">
                {test.status === 'PUBLISHED' ? 'Open' : 'Draft'}
              </span>
              <span class="text-sm text-gray-500">
                {new Date(test.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
