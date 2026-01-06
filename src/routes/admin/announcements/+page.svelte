<script lang="ts">
  import {
    Megaphone,
    Plus,
    Trash2,
    ToggleLeft,
    ToggleRight,
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    Info,
    X
  } from 'lucide-svelte';
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';

  let { data }: { data: PageData } = $props();
  let showCreateModal = $state(false);

  const typeOptions = [
    { value: 'info', label: 'Info', icon: Info, color: 'blue' },
    { value: 'success', label: 'Success', icon: CheckCircle, color: 'green' },
    { value: 'warning', label: 'Warning', icon: AlertTriangle, color: 'yellow' },
    { value: 'error', label: 'Error', icon: AlertCircle, color: 'red' }
  ];

  const roleOptions = [
    'PLATFORM_ADMIN',
    'SUPPORT',
    'ORG_OWNER',
    'ORG_ADMIN',
    'TEACHER',
    'STUDENT'
  ];

  function getTypeInfo(type: string) {
    return typeOptions.find(t => t.value === type) || typeOptions[0];
  }

  function formatDate(date: Date | string) {
    return new Date(date).toLocaleString();
  }

  function isExpired(endsAt: Date | string | null) {
    if (!endsAt) return false;
    return new Date(endsAt) < new Date();
  }
</script>

<div class="max-w-6xl mx-auto">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
        <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
          <Megaphone class="w-5 h-5 text-orange-600" />
        </div>
        System Announcements
      </h1>
      <p class="text-gray-500 mt-1">Broadcast messages to users across the platform</p>
    </div>
    <button onclick={() => showCreateModal = true} class="btn btn-primary">
      <Plus class="w-4 h-4" />
      New Announcement
    </button>
  </div>

  <!-- Announcements List -->
  <div class="space-y-4">
    {#each data.announcements as announcement}
      {@const typeInfo = getTypeInfo(announcement.type)}
      {@const TypeIcon = typeInfo.icon}
      {@const expired = isExpired(announcement.endsAt)}
      <div class="card {!announcement.isActive || expired ? 'opacity-60' : ''}">
        <div class="p-4">
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center bg-{typeInfo.color}-100">
                <TypeIcon class="w-5 h-5 text-{typeInfo.color}-600" />
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold text-gray-900">{announcement.title}</h3>
                  {#if !announcement.isActive}
                    <span class="badge badge-gray text-xs">Inactive</span>
                  {:else if expired}
                    <span class="badge badge-red text-xs">Expired</span>
                  {:else}
                    <span class="badge badge-green text-xs">Active</span>
                  {/if}
                </div>
                <p class="text-gray-600 mt-1">{announcement.content}</p>
                <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>Created {formatDate(announcement.createdAt)}</span>
                  {#if announcement.endsAt}
                    <span>Ends {formatDate(announcement.endsAt)}</span>
                  {/if}
                  <span>By {announcement.createdBy.name || announcement.createdBy.email}</span>
                </div>
                {#if announcement.targetRoles.length > 0 || announcement.targetOrgs.length > 0}
                  <div class="flex items-center gap-2 mt-2">
                    {#if announcement.targetRoles.length > 0}
                      <span class="text-xs text-gray-500">Roles: {announcement.targetRoles.join(', ')}</span>
                    {/if}
                    {#if announcement.targetOrgs.length > 0}
                      <span class="text-xs text-gray-500">({announcement.targetOrgs.length} org(s))</span>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <form method="POST" action="?/toggle" use:enhance>
                <input type="hidden" name="id" value={announcement.id} />
                <button type="submit" class="btn btn-secondary btn-sm" title={announcement.isActive ? 'Deactivate' : 'Activate'}>
                  {#if announcement.isActive}
                    <ToggleRight class="w-4 h-4 text-green-600" />
                  {:else}
                    <ToggleLeft class="w-4 h-4 text-gray-400" />
                  {/if}
                </button>
              </form>
              <form method="POST" action="?/delete" use:enhance onsubmit={(e) => {
                if (!confirm('Delete this announcement?')) e.preventDefault();
              }}>
                <input type="hidden" name="id" value={announcement.id} />
                <button type="submit" class="btn btn-secondary btn-sm text-red-600 hover:bg-red-50">
                  <Trash2 class="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    {:else}
      <div class="card p-8 text-center">
        <Megaphone class="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 class="font-semibold text-gray-900 mb-1">No Announcements</h3>
        <p class="text-gray-500">Create your first announcement to broadcast to users.</p>
      </div>
    {/each}
  </div>
</div>

<!-- Create Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
      <div class="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 class="text-lg font-semibold">New Announcement</h2>
        <button onclick={() => showCreateModal = false} class="p-1 hover:bg-gray-100 rounded">
          <X class="w-5 h-5" />
        </button>
      </div>
      <form method="POST" action="?/create" use:enhance={() => {
        return async ({ result }) => {
          if (result.type === 'success') {
            showCreateModal = false;
            window.location.reload();
          }
        };
      }}>
        <div class="p-4 space-y-4">
          <div>
            <label class="label">Title *</label>
            <input type="text" name="title" class="input" placeholder="Announcement title" required />
          </div>

          <div>
            <label class="label">Content *</label>
            <textarea name="content" class="input" rows="3" placeholder="Announcement message..." required></textarea>
          </div>

          <div>
            <label class="label">Type</label>
            <select name="type" class="input">
              {#each typeOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label">Starts At</label>
              <input type="datetime-local" name="startsAt" class="input" />
            </div>
            <div>
              <label class="label">Ends At (optional)</label>
              <input type="datetime-local" name="endsAt" class="input" />
            </div>
          </div>

          <div>
            <label class="label">Target Roles (leave empty for all)</label>
            <div class="grid grid-cols-2 gap-2">
              {#each roleOptions as role}
                <label class="flex items-center gap-2">
                  <input type="checkbox" name="targetRoles" value={role} class="rounded" />
                  <span class="text-sm">{role.replace('_', ' ')}</span>
                </label>
              {/each}
            </div>
          </div>

          <div>
            <label class="label">Target Organizations (leave empty for all)</label>
            <select name="targetOrgs" multiple class="input" style="height: 100px;">
              {#each data.organizations as org}
                <option value={org.id}>{org.name}</option>
              {/each}
            </select>
            <p class="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
          </div>
        </div>

        <div class="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button type="button" onclick={() => showCreateModal = false} class="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary">
            Create Announcement
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
