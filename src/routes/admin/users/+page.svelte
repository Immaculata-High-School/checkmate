<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';
  import {
    Users,
    Plus,
    Search,
    Shield,
    Mail,
    MoreVertical,
    Edit,
    Trash2,
    Ban,
    Key,
    X,
    Building2,
    Check,
    UserCheck
  } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showCreateModal = $state(false);
  let showDeleteConfirm = $state<string | null>(null);
  let showPasswordModal = $state<{ userId: string; password?: string } | null>(null);
  let search = $state(data.filters.search);
  let roleFilter = $state(data.filters.role);
  let statusFilter = $state(data.filters.status);
  let openMenu = $state<string | null>(null);

  const platformRoles = [
    { value: 'USER', label: 'User' },
    { value: 'SUPPORT', label: 'Support' },
    { value: 'PLATFORM_ADMIN', label: 'Platform Admin' }
  ];

  function applyFilters() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (roleFilter) params.set('role', roleFilter);
    if (statusFilter) params.set('status', statusFilter);
    goto(`?${params.toString()}`);
  }

  function getRoleLabel(role: string) {
    return platformRoles.find(r => r.value === role)?.label || role;
  }

  function getRoleBadgeClass(role: string) {
    switch (role) {
      case 'PLATFORM_ADMIN': return 'badge-red';
      case 'SUPPORT': return 'badge-yellow';
      default: return 'badge-gray';
    }
  }

  function formatDate(date: Date | string | null) {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function formatRelativeTime(date: Date | string | null) {
    if (!date) return 'Never';
    const now = new Date();
    const d = new Date(date);
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return formatDate(date);
  }

  $effect(() => {
    if (form?.tempPassword && !showPasswordModal) {
      // Show password was reset
    }
  });
</script>

<div class="max-w-7xl mx-auto">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Users</h1>
      <p class="text-gray-500 mt-1">Manage all users on the platform</p>
    </div>
    <button onclick={() => (showCreateModal = true)} class="btn btn-primary">
      <Plus class="w-5 h-5" />
      Create User
    </button>
  </div>

  <!-- Filters -->
  <div class="card p-4 mb-6">
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1 relative">
        <Search class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search users..."
          bind:value={search}
          onkeydown={(e) => e.key === 'Enter' && applyFilters()}
          class="input pl-10"
        />
      </div>
      <select bind:value={roleFilter} onchange={applyFilters} class="input w-full sm:w-40">
        <option value="">All Roles</option>
        {#each platformRoles as role}
          <option value={role.value}>{role.label}</option>
        {/each}
      </select>
      <select bind:value={statusFilter} onchange={applyFilters} class="input w-full sm:w-40">
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
      </select>
      <button onclick={applyFilters} class="btn btn-secondary">
        Apply Filters
      </button>
    </div>
  </div>

  <!-- Temp Password Display -->
  {#if form?.tempPassword}
    <div class="card p-4 mb-6 bg-green-50 border-green-200">
      <div class="flex items-center justify-between">
        <div>
          <p class="font-medium text-green-800">User created successfully!</p>
          <p class="text-green-700">Temporary password: <code class="bg-green-100 px-2 py-1 rounded font-mono">{form.tempPassword}</code></p>
        </div>
        <button onclick={() => navigator.clipboard.writeText(form.tempPassword)} class="btn btn-sm btn-secondary">
          Copy
        </button>
      </div>
    </div>
  {/if}

  <!-- Users List -->
  <div class="card overflow-hidden">
    <table class="w-full">
      <thead class="bg-gray-50 border-b border-gray-200">
        <tr>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">Role</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden lg:table-cell">Organizations</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden lg:table-cell">Last Login</th>
          <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
          <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200">
        {#each data.users as user}
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-4">
              <div class="flex items-center gap-3">
                <div class="avatar avatar-sm {user.suspended ? 'opacity-50' : ''}">{user.name?.charAt(0) || '?'}</div>
                <div>
                  <div class="font-medium text-gray-900 {user.suspended ? 'line-through opacity-50' : ''}">{user.name}</div>
                  <div class="text-sm text-gray-500 flex items-center gap-1">
                    {user.email}
                    {#if user.emailVerified}
                      <Check class="w-3 h-3 text-green-500" />
                    {/if}
                  </div>
                </div>
              </div>
            </td>
            <td class="px-4 py-4 hidden md:table-cell">
              <span class="badge {getRoleBadgeClass(user.platformRole)}">{getRoleLabel(user.platformRole)}</span>
            </td>
            <td class="px-4 py-4 hidden lg:table-cell">
              {#if user.orgMemberships.length > 0}
                <div class="flex flex-wrap gap-1">
                  {#each user.orgMemberships.slice(0, 2) as membership}
                    <a href="/admin/organizations/{membership.organization.id}" class="badge badge-blue hover:bg-blue-200">
                      {membership.organization.name}
                    </a>
                  {/each}
                  {#if user.orgMemberships.length > 2}
                    <span class="badge badge-gray">+{user.orgMemberships.length - 2}</span>
                  {/if}
                </div>
              {:else}
                <span class="text-gray-400">None</span>
              {/if}
            </td>
            <td class="px-4 py-4 text-sm text-gray-500 hidden lg:table-cell">
              {formatRelativeTime(user.lastLoginAt)}
            </td>
            <td class="px-4 py-4 text-center">
              <span class="badge {user.suspended ? 'badge-red' : 'badge-green'}">
                {user.suspended ? 'Suspended' : 'Active'}
              </span>
            </td>
            <td class="px-4 py-4 text-right">
              <div class="relative">
                <button
                  onclick={() => (openMenu = openMenu === user.id ? null : user.id)}
                  class="p-1 hover:bg-gray-100 rounded"
                >
                  <MoreVertical class="w-5 h-5 text-gray-400" />
                </button>
                {#if openMenu === user.id}
                  <div class="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    <form method="POST" action="?/impersonate" use:enhance>
                      <input type="hidden" name="userId" value={user.id} />
                      <button type="submit" class="w-full flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 hover:bg-gray-100">
                        <UserCheck class="w-4 h-4" />
                        Login as User
                      </button>
                    </form>
                    <hr class="my-1" />
                    <form method="POST" action="?/toggleSuspend" use:enhance={() => {
                      openMenu = null;
                      return async ({ update }) => { await update(); };
                    }}>
                      <input type="hidden" name="userId" value={user.id} />
                      <button type="submit" class="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <Ban class="w-4 h-4" />
                        {user.suspended ? 'Unsuspend' : 'Suspend'}
                      </button>
                    </form>
                    <form method="POST" action="?/resetPassword" use:enhance={() => {
                      openMenu = null;
                      return async ({ result, update }) => {
                        if (result.type === 'success' && result.data?.tempPassword) {
                          showPasswordModal = { userId: user.id, password: result.data.tempPassword as string };
                        }
                        await update();
                      };
                    }}>
                      <input type="hidden" name="userId" value={user.id} />
                      <button type="submit" class="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <Key class="w-4 h-4" />
                        Reset Password
                      </button>
                    </form>
                    <hr class="my-1" />
                    <button
                      onclick={() => { showDeleteConfirm = user.id; openMenu = null; }}
                      class="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      <Trash2 class="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                {/if}
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="6" class="px-4 py-8 text-center text-gray-500">
              No users found
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<!-- Create User Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Create User</h2>
        <button onclick={() => (showCreateModal = false)} class="p-1 hover:bg-gray-100 rounded">
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>
      <form method="POST" action="?/create" use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === 'success') {
            showCreateModal = false;
            await invalidateAll();
          }
          await update();
        };
      }}>
        <div class="p-6 space-y-4">
          {#if form?.error}
            <div class="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{form.error}</div>
          {/if}

          <div>
            <label for="name" class="label">Full Name</label>
            <input type="text" id="name" name="name" required class="input" placeholder="John Smith" />
          </div>

          <div>
            <label for="email" class="label">Email Address</label>
            <input type="email" id="email" name="email" required class="input" placeholder="john@example.com" />
          </div>

          <div>
            <label for="platformRole" class="label">Platform Role</label>
            <select id="platformRole" name="platformRole" class="input">
              {#each platformRoles as role}
                <option value={role.value}>{role.label}</option>
              {/each}
            </select>
          </div>

          <label class="flex items-center gap-2">
            <input type="checkbox" name="sendCredentials" value="true" class="rounded border-gray-300" checked />
            <span class="text-sm text-gray-700">Send login credentials via email</span>
          </label>
        </div>
        <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button type="button" onclick={() => (showCreateModal = false)} class="btn btn-secondary">Cancel</button>
          <button type="submit" class="btn btn-primary">Create User</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Password Reset Modal -->
{#if showPasswordModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Password Reset</h2>
        <button onclick={() => (showPasswordModal = null)} class="p-1 hover:bg-gray-100 rounded">
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>
      <div class="p-6">
        <p class="text-gray-600 mb-4">The user's password has been reset. Here is the new temporary password:</p>
        <div class="bg-gray-100 p-4 rounded-lg text-center font-mono text-lg">
          {showPasswordModal.password}
        </div>
        <p class="text-sm text-gray-500 mt-4">Make sure to share this password securely with the user.</p>
      </div>
      <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
        <button
          onclick={() => {
            navigator.clipboard.writeText(showPasswordModal?.password || '');
          }}
          class="btn btn-secondary"
        >
          Copy Password
        </button>
        <button onclick={() => (showPasswordModal = null)} class="btn btn-primary">Done</button>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirmation -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
      <div class="p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-2">Delete User?</h2>
        <p class="text-gray-500">This action cannot be undone. All data associated with this user will be permanently deleted.</p>
      </div>
      <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
        <button onclick={() => (showDeleteConfirm = null)} class="btn btn-secondary">Cancel</button>
        <form method="POST" action="?/delete" use:enhance={() => {
          return async ({ update }) => {
            showDeleteConfirm = null;
            await update();
          };
        }}>
          <input type="hidden" name="userId" value={showDeleteConfirm} />
          <button type="submit" class="btn bg-red-600 text-white hover:bg-red-700">Delete</button>
        </form>
      </div>
    </div>
  </div>
{/if}
