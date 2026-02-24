<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import {
    GraduationCap,
    Search,
    Mail,
    Calendar,
    BookOpen,
    Clock,
    ChevronLeftIcon,
    ChevronRightIcon,
    MoreVertical,
    LogIn,
    Key,
    Trash2,
    X,
    CheckCircle,
    AlertCircle,
    Copy,
    Ban,
    ShieldCheck
  } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let searchInput = $state('');

  $effect(() => {
    searchInput = data.search || '';
  });
  let searchTimeout: ReturnType<typeof setTimeout>;
  let openMenu = $state<string | null>(null);
  let showPasswordModal = $state<any>(null);
  let showRemoveConfirm = $state<any>(null);
  let showSuspendConfirm = $state<any>(null);
  let tempPassword = $state<string | null>(null);

  $effect(() => {
    if (form?.tempPassword) {
      tempPassword = form.tempPassword;
    }
    if (form?.impersonating) {
      window.location.href = (form as any).redirect || '/student';
    }
  });

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

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }
</script>

<div class="max-w-6xl mx-auto">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Students</h1>
      <p class="text-gray-500 mt-1">Manage students in your organization</p>
    </div>
    <div class="text-sm text-gray-500">
      {data.total} total students
    </div>
  </div>

  {#if form?.success && form?.message}
    <div class="alert alert-success mb-6">
      <CheckCircle class="w-5 h-5" />
      {form.message}
    </div>
  {/if}

  {#if form?.error}
    <div class="alert alert-error mb-6">
      <AlertCircle class="w-5 h-5" />
      {form.error}
    </div>
  {/if}

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
  <div class="card">
    <table class="w-full">
      <thead class="bg-gray-50 border-b border-gray-200">
        <tr>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Student</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">Student ID</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden sm:table-cell">Classes</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden lg:table-cell">Joined</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden lg:table-cell">Last Login</th>
          <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200">
        {#each data.students as student}
          <tr class="hover:bg-gray-50 {student.user.suspended ? 'opacity-60' : ''}">
            <td class="px-4 py-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full {student.user.suspended ? 'bg-red-100' : 'bg-green-100'} flex items-center justify-center">
                  <span class="text-sm font-medium {student.user.suspended ? 'text-red-600' : 'text-green-600'}">{getInitials(student.user.name)}</span>
                </div>
                <div>
                  <p class="font-medium text-gray-900">
                    {student.user.name || 'Unknown'}
                    {#if student.user.suspended}
                      <span class="badge badge-red ml-2 text-xs">Suspended</span>
                    {/if}
                  </p>
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
            <td class="px-4 py-4 text-right">
              <div class="relative">
                <button
                  onclick={() => (openMenu = openMenu === student.id ? null : student.id)}
                  class="p-1 hover:bg-gray-100 rounded"
                >
                  <MoreVertical class="w-5 h-5 text-gray-400" />
                </button>
                {#if openMenu === student.id}
                  <div class="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <form method="POST" action="?/impersonate" use:enhance={() => {
                      return async ({ result }) => {
                        if (result.type === 'success' && (result.data as any)?.redirect) {
                          window.location.href = (result.data as any).redirect;
                        }
                      };
                    }}>
                      <input type="hidden" name="userId" value={student.user.id} />
                      <button type="submit" class="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <LogIn class="w-4 h-4" />
                        Login as Student
                      </button>
                    </form>
                    <button
                      onclick={() => { showPasswordModal = student; openMenu = null; }}
                      class="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Key class="w-4 h-4" />
                      Reset Password
                    </button>
                    <button
                      onclick={() => { showSuspendConfirm = student; openMenu = null; }}
                      class="w-full flex items-center gap-2 px-4 py-2 text-sm {student.user.suspended ? 'text-green-600' : 'text-orange-600'} hover:bg-gray-100"
                    >
                      {#if student.user.suspended}
                        <ShieldCheck class="w-4 h-4" />
                        Unsuspend
                      {:else}
                        <Ban class="w-4 h-4" />
                        Suspend
                      {/if}
                    </button>
                    <button
                      onclick={() => { showRemoveConfirm = student; openMenu = null; }}
                      class="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      <Trash2 class="w-4 h-4" />
                      Remove
                    </button>
                  </div>
                {/if}
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="6" class="px-4 py-8 text-center text-gray-500">
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

<!-- Click outside to close menu -->
{#if openMenu}
  <div
    class="fixed inset-0 z-5"
    onclick={() => (openMenu = null)}
    role="button"
    tabindex="-1"
    onkeydown={(e) => e.key === 'Escape' && (openMenu = null)}
  ></div>
{/if}

<!-- Password Reset Modal -->
{#if showPasswordModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Reset Password</h2>
        <button onclick={() => { showPasswordModal = null; tempPassword = null; }} class="p-1 hover:bg-gray-100 rounded">
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>
      <div class="p-6">
        <p class="text-gray-600 mb-4">
          Reset password for <strong>{showPasswordModal.user.name}</strong> ({showPasswordModal.user.email})
        </p>

        {#if tempPassword}
          <div class="p-4 bg-green-50 rounded-lg border border-green-200 mb-4">
            <p class="text-sm text-green-700 mb-2">Temporary password set:</p>
            <div class="flex items-center gap-2">
              <code class="flex-1 p-2 bg-white rounded border font-mono">{tempPassword}</code>
              <button onclick={() => copyToClipboard(tempPassword!)} class="btn btn-sm btn-secondary">
                <Copy class="w-4 h-4" />
              </button>
            </div>
            <p class="text-xs text-green-600 mt-2">Share this password securely with the student.</p>
          </div>
        {/if}

        <div class="space-y-3">
          <form method="POST" action="?/resetPassword" use:enhance={() => {
            return async ({ update }) => {
              await update();
              await invalidateAll();
            };
          }}>
            <input type="hidden" name="userId" value={showPasswordModal.user.id} />
            <button type="submit" class="btn btn-secondary w-full">
              <Mail class="w-4 h-4" />
              Send Reset Link via Email
            </button>
          </form>

          <form method="POST" action="?/setTempPassword" use:enhance={() => {
            return async ({ update }) => {
              await update();
            };
          }}>
            <input type="hidden" name="userId" value={showPasswordModal.user.id} />
            <button type="submit" class="btn btn-primary w-full">
              <Key class="w-4 h-4" />
              Set Temporary Password
            </button>
          </form>
        </div>
      </div>
      <div class="flex justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
        <button onclick={() => { showPasswordModal = null; tempPassword = null; }} class="btn btn-secondary">Close</button>
      </div>
    </div>
  </div>
{/if}

<!-- Suspend Confirmation -->
{#if showSuspendConfirm}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
      <div class="p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-2">
          {showSuspendConfirm.user.suspended ? 'Unsuspend' : 'Suspend'} Student?
        </h2>
        <p class="text-gray-600">
          {#if showSuspendConfirm.user.suspended}
            Are you sure you want to unsuspend <strong>{showSuspendConfirm.user.name}</strong>?
            They will be able to log in and access their classes again.
          {:else}
            Are you sure you want to suspend <strong>{showSuspendConfirm.user.name}</strong>?
            They will not be able to log in until unsuspended.
          {/if}
        </p>
      </div>
      <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
        <button onclick={() => (showSuspendConfirm = null)} class="btn btn-secondary">Cancel</button>
        <form method="POST" action="?/toggleSuspend" use:enhance={() => {
          return async ({ update }) => {
            showSuspendConfirm = null;
            await update();
            await invalidateAll();
          };
        }}>
          <input type="hidden" name="userId" value={showSuspendConfirm.user.id} />
          <button type="submit" class="btn {showSuspendConfirm.user.suspended ? 'btn-primary' : 'btn-danger'}">
            {showSuspendConfirm.user.suspended ? 'Unsuspend' : 'Suspend'} Student
          </button>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- Remove Confirmation -->
{#if showRemoveConfirm}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
      <div class="p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-2">Remove Student?</h2>
        <p class="text-gray-600">
          Are you sure you want to remove <strong>{showRemoveConfirm.user.name}</strong> from your organization?
          They will lose access to all classes and materials.
        </p>
      </div>
      <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
        <button onclick={() => (showRemoveConfirm = null)} class="btn btn-secondary">Cancel</button>
        <form method="POST" action="?/removeStudent" use:enhance={() => {
          return async ({ update }) => {
            showRemoveConfirm = null;
            await update();
            await invalidateAll();
          };
        }}>
          <input type="hidden" name="memberId" value={showRemoveConfirm.id} />
          <button type="submit" class="btn btn-danger">Remove Student</button>
        </form>
      </div>
    </div>
  </div>
{/if}
