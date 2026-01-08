<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';
  import {
    Users,
    UserPlus,
    Mail,
    MoreVertical,
    Key,
    LogIn,
    Trash2,
    X,
    Clock,
    CheckCircle,
    AlertCircle,
    Copy,
    Send
  } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showInviteModal = $state(false);
  let showBulkInviteModal = $state(false);
  let showPasswordModal = $state<any>(null);
  let showRemoveConfirm = $state<any>(null);
  let openMenu = $state<string | null>(null);
  let tempPassword = $state<string | null>(null);

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

  function getRoleBadge(role: string) {
    switch (role) {
      case 'ORG_OWNER': return { class: 'badge-purple', label: 'Owner' };
      case 'ORG_ADMIN': return { class: 'badge-blue', label: 'Admin' };
      case 'TEACHER': return { class: 'badge-green', label: 'Teacher' };
      case 'TEACHING_ASSISTANT': return { class: 'badge-yellow', label: 'TA' };
      default: return { class: 'badge-gray', label: role };
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  $effect(() => {
    if (form?.tempPassword) {
      tempPassword = form.tempPassword;
    }
    if (form?.impersonating) {
      goto('/teacher');
    }
  });
</script>

<div class="max-w-6xl mx-auto">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Teachers</h1>
      <p class="text-gray-500 mt-1">Manage teachers and staff in your organization</p>
    </div>
    <div class="flex gap-2">
      <button onclick={() => (showBulkInviteModal = true)} class="btn btn-secondary">
        <Users class="w-5 h-5" />
        Bulk Invite
      </button>
      <button onclick={() => (showInviteModal = true)} class="btn btn-primary">
        <UserPlus class="w-5 h-5" />
        Invite Teacher
      </button>
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

  <!-- Pending Invites -->
  {#if data.invites && data.invites.length > 0}
    <div class="card p-4 mb-6 border-yellow-200 bg-yellow-50">
      <h3 class="font-medium text-yellow-800 mb-3 flex items-center gap-2">
        <Mail class="w-4 h-4" />
        Pending Invitations ({data.invites.length})
      </h3>
      <div class="space-y-2">
        {#each data.invites as invite}
          <div class="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-yellow-200">
            <div>
              <span class="font-medium text-gray-900">{invite.email}</span>
              <span class="badge {getRoleBadge(invite.role).class} ml-2">{getRoleBadge(invite.role).label}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm text-gray-500">Expires {formatDate(invite.expiresAt)}</span>
              <form method="POST" action="?/cancelInvite" use:enhance>
                <input type="hidden" name="inviteId" value={invite.id} />
                <button type="submit" class="p-1 hover:bg-yellow-100 rounded text-gray-500">
                  <X class="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Teachers List -->
  <div class="card overflow-hidden">
    <table class="w-full">
      <thead class="bg-gray-50 border-b border-gray-200">
        <tr>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Teacher</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">Role</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden lg:table-cell">Department</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden sm:table-cell">Last Login</th>
          <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200">
        {#each data.teachers as member}
          {@const role = getRoleBadge(member.role)}
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span class="text-sm font-medium text-indigo-600">{getInitials(member.user.name)}</span>
                </div>
                <div>
                  <p class="font-medium text-gray-900">{member.user.name}</p>
                  <p class="text-sm text-gray-500">{member.user.email}</p>
                </div>
              </div>
            </td>
            <td class="px-4 py-4 hidden md:table-cell">
              <span class="badge {role.class}">{role.label}</span>
            </td>
            <td class="px-4 py-4 hidden lg:table-cell text-sm text-gray-500">
              {member.department?.name || '-'}
            </td>
            <td class="px-4 py-4 hidden sm:table-cell text-sm text-gray-500">
              {formatDate(member.user.lastLoginAt)}
            </td>
            <td class="px-4 py-4 text-right">
              <div class="relative">
                <button
                  onclick={() => (openMenu = openMenu === member.id ? null : member.id)}
                  class="p-1 hover:bg-gray-100 rounded"
                >
                  <MoreVertical class="w-5 h-5 text-gray-400" />
                </button>
                {#if openMenu === member.id}
                  <div class="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    {#if member.role !== 'ORG_OWNER'}
                      <form method="POST" action="?/impersonate" use:enhance={() => {
                        return async ({ result }) => {
                          if (result.type === 'success' && result.data?.redirect) {
                            window.location.href = result.data.redirect;
                          }
                        };
                      }}>
                        <input type="hidden" name="userId" value={member.user.id} />
                        <button type="submit" class="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          <LogIn class="w-4 h-4" />
                          Login as Teacher
                        </button>
                      </form>
                    {/if}
                    <button
                      onclick={() => { showPasswordModal = member; openMenu = null; }}
                      class="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Key class="w-4 h-4" />
                      Reset Password
                    </button>
                    {#if member.role !== 'ORG_OWNER'}
                      <button
                        onclick={() => { showRemoveConfirm = member; openMenu = null; }}
                        class="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        <Trash2 class="w-4 h-4" />
                        Remove
                      </button>
                    {/if}
                  </div>
                {/if}
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="5" class="px-4 py-8 text-center text-gray-500">
              No teachers found. Invite your first teacher!
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
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

<!-- Invite Modal -->
{#if showInviteModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Invite Teacher</h2>
        <button onclick={() => (showInviteModal = false)} class="p-1 hover:bg-gray-100 rounded">
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>
      <form method="POST" action="?/invite" use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === 'success') {
            showInviteModal = false;
            await invalidateAll();
          }
          await update();
        };
      }}>
        <div class="p-6 space-y-4">
          <div>
            <label for="name" class="label">Name (optional)</label>
            <input type="text" id="name" name="name" class="input" placeholder="John Smith" />
          </div>
          <div>
            <label for="email" class="label">Email Address</label>
            <input type="email" id="email" name="email" required class="input" placeholder="teacher@school.edu" />
          </div>
          <div>
            <label for="role" class="label">Role</label>
            <select id="role" name="role" class="input">
              <option value="TEACHER">Teacher</option>
              <option value="TEACHING_ASSISTANT">Teaching Assistant</option>
              <option value="ORG_ADMIN">Organization Admin</option>
            </select>
          </div>
        </div>
        <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button type="button" onclick={() => (showInviteModal = false)} class="btn btn-secondary">Cancel</button>
          <button type="submit" class="btn btn-primary">
            <Send class="w-4 h-4" />
            Send Invite
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Bulk Invite Modal -->
{#if showBulkInviteModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-lg w-full">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Bulk Invite Teachers</h2>
        <button onclick={() => (showBulkInviteModal = false)} class="p-1 hover:bg-gray-100 rounded">
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>
      <form method="POST" action="?/bulkInvite" use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === 'success') {
            showBulkInviteModal = false;
            await invalidateAll();
          }
          await update();
        };
      }}>
        <div class="p-6 space-y-4">
          <div>
            <label for="bulkEmails" class="label">Email Addresses</label>
            <textarea
              id="bulkEmails"
              name="emails"
              rows="6"
              required
              class="input font-mono text-sm"
              placeholder="Enter email addresses, one per line or comma-separated:&#10;teacher1@school.edu&#10;teacher2@school.edu&#10;teacher3@school.edu"
            ></textarea>
            <p class="text-xs text-gray-500 mt-1">
              Enter up to 50 email addresses. Separate with commas, semicolons, spaces, or new lines.
            </p>
          </div>
          <div>
            <label for="bulkRole" class="label">Role</label>
            <select id="bulkRole" name="role" class="input">
              <option value="TEACHER">Teacher</option>
              <option value="TEACHING_ASSISTANT">Teaching Assistant</option>
              <option value="ORG_ADMIN">Organization Admin</option>
            </select>
          </div>
        </div>
        <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button type="button" onclick={() => (showBulkInviteModal = false)} class="btn btn-secondary">Cancel</button>
          <button type="submit" class="btn btn-primary">
            <Send class="w-4 h-4" />
            Send Invites
          </button>
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
            <p class="text-xs text-green-600 mt-2">Share this password securely with the teacher.</p>
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

<!-- Remove Confirmation -->
{#if showRemoveConfirm}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
      <div class="p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-2">Remove Teacher?</h2>
        <p class="text-gray-600">
          Are you sure you want to remove <strong>{showRemoveConfirm.user.name}</strong> from your organization?
          They will lose access to all classes and materials.
        </p>
      </div>
      <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
        <button onclick={() => (showRemoveConfirm = null)} class="btn btn-secondary">Cancel</button>
        <form method="POST" action="?/removeTeacher" use:enhance={() => {
          return async ({ update }) => {
            showRemoveConfirm = null;
            await update();
            await invalidateAll();
          };
        }}>
          <input type="hidden" name="memberId" value={showRemoveConfirm.id} />
          <button type="submit" class="btn btn-danger">Remove Teacher</button>
        </form>
      </div>
    </div>
  </div>
{/if}
