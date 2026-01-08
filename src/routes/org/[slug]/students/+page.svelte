<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import {
    GraduationCap,
    Search,
    Mail,
    Calendar,
    BookOpen,
    Clock,
    ChevronLeftIcon,
    ChevronRightIcon
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let searchInput = $state(data.search || '');
  let searchTimeout: ReturnType<typeof setTimeout>;

  // Debounced search
  function handleSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const url = new URL($page.url);
      if (searchInput) {
        url.searchParams.set('search', searchInput);
      } else {
        url.searchParams.delete('search');
      }
      url.searchParams.set('page', '1');
      goto(url.toString(), { replaceState: true });
    }, 300);
  }

  function goToPage(pageNum: number) {
    const url = new URL($page.url);
    url.searchParams.set('page', pageNum.toString());
    goto(url.toString());
  }

  function formatDate(date: Date | string | null) {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function getInitials(name: string | null): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
</script>

<div class="max-w-6xl mx-auto">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Students</h1>
      <p class="text-gray-500 mt-1">View all students in your organization</p>
    </div>
    <div class="text-sm text-gray-500">
      {data.total} total students
    </div>
  </div>

  <!-- Search -->
  <div class="card p-4 mb-6">
    <div class="relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        placeholder="Search by name, email, or student ID..."
        bind:value={searchInput}
        oninput={handleSearch}
        class="input pl-10"
      />
    </div>
  </div>

  <!-- Students Table -->
  <div class="card overflow-hidden">
    <table class="w-full">
      <thead class="bg-gray-50 border-b border-gray-200">
        <tr>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Student</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">Student ID</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden sm:table-cell">Classes</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden lg:table-cell">Joined</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden lg:table-cell">Last Login</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200">
        {#each data.students as student}
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <span class="text-sm font-medium text-green-600">{getInitials(student.user.name)}</span>
                </div>
                <div>
                  <p class="font-medium text-gray-900">{student.user.name || 'Unknown'}</p>
                  <p class="text-sm text-gray-500">{student.user.email}</p>
                </div>
              </div>
            </td>
            <td class="px-4 py-4 hidden md:table-cell">
              <span class="text-sm text-gray-600 font-mono">{student.studentId || '-'}</span>
            </td>
            <td class="px-4 py-4 hidden sm:table-cell">
              <div class="flex items-center gap-1 text-sm text-gray-600">
                <BookOpen class="w-4 h-4 text-gray-400" />
                {student.classCount}
              </div>
            </td>
            <td class="px-4 py-4 hidden lg:table-cell text-sm text-gray-500">
              {formatDate(student.joinedAt)}
            </td>
            <td class="px-4 py-4 hidden lg:table-cell text-sm text-gray-500">
              {formatDate(student.user.lastLoginAt)}
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="5" class="px-4 py-8 text-center text-gray-500">
              {#if data.search}
                No students match your search.
              {:else}
                No students in this organization yet.
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Pagination -->
  {#if data.totalPages > 1}
    <div class="flex items-center justify-between mt-4 px-2">
      <p class="text-sm text-gray-600">
        Showing {(data.page - 1) * data.pageSize + 1} - {Math.min(data.page * data.pageSize, data.total)} of {data.total}
      </p>
      <div class="flex items-center gap-2">
        <button
          onclick={() => goToPage(data.page - 1)}
          disabled={data.page <= 1}
          class="btn btn-secondary btn-sm"
        >
          <ChevronLeftIcon class="w-4 h-4" />
          Previous
        </button>
        <span class="text-sm text-gray-600 px-2">
          Page {data.page} of {data.totalPages}
        </span>
        <button
          onclick={() => goToPage(data.page + 1)}
          disabled={data.page >= data.totalPages}
          class="btn btn-secondary btn-sm"
        >
          Next
          <ChevronRightIcon class="w-4 h-4" />
        </button>
      </div>
    </div>
  {/if}
</div>
