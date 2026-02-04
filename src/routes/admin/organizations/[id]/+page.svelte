<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import {
    Building2,
    ArrowLeft,
    Users,
    Mail,
    Phone,
    Globe,
    MapPin,
    Clock,
    Crown,
    UserPlus,
    Trash2,
    X,
    Plus,
    BookOpen,
    Calendar,
    Settings,
    Send
  } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let activeTab = $state<'details' | 'members' | 'structure' | 'settings'>('details');
  let showInviteModal = $state(false);
  let showDepartmentModal = $state(false);
  let showSubjectModal = $state(false);
  let showTermModal = $state(false);

  const orgTypes = [
    { value: 'SCHOOL', label: 'School' },
    { value: 'DISTRICT', label: 'District' },
    { value: 'UNIVERSITY', label: 'University' },
    { value: 'TUTORING_CENTER', label: 'Tutoring Center' },
    { value: 'CORPORATE', label: 'Corporate' },
    { value: 'INDIVIDUAL', label: 'Individual' }
  ];

  const roles = [
    { value: 'ORG_OWNER', label: 'Owner' },
    { value: 'ORG_ADMIN', label: 'Admin' },
    { value: 'DEPARTMENT_HEAD', label: 'Department Head' },
    { value: 'TEACHER', label: 'Teacher' },
    { value: 'TEACHING_ASSISTANT', label: 'Teaching Assistant' },
    { value: 'STUDENT', label: 'Student' },
    { value: 'PARENT', label: 'Parent' }
  ];

  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'Pacific/Honolulu',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo'
  ];

  function getRoleLabel(role: string) {
    return roles.find(r => r.value === role)?.label || role;
  }

  function getRoleBadgeClass(role: string) {
    switch (role) {
      case 'ORG_OWNER': return 'badge-purple';
      case 'ORG_ADMIN': return 'badge-blue';
      case 'DEPARTMENT_HEAD': return 'badge-indigo';
      case 'TEACHER': return 'badge-green';
      case 'TEACHING_ASSISTANT': return 'badge-yellow';
      case 'STUDENT': return 'badge-gray';
      case 'PARENT': return 'badge-pink';
      default: return 'badge-gray';
    }
  }

  function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
</script>

<div class="max-w-6xl mx-auto">
  <!-- Header -->
  <div class="flex items-center gap-4 mb-6">
    <a href="/admin/organizations" class="p-2 hover:bg-gray-100 rounded-lg">
      <ArrowLeft class="w-5 h-5 text-gray-500" />
    </a>
    <div class="flex-1">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
          <Building2 class="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{data.organization.name}</h1>
          <p class="text-gray-500">{data.organization.slug}</p>
        </div>
      </div>
    </div>
    <span class="badge {data.organization.isActive ? 'badge-green' : 'badge-red'}">
      {data.organization.isActive ? 'Active' : 'Inactive'}
    </span>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <div class="card p-4">
      <div class="text-2xl font-bold text-gray-900">{data.organization._count.members}</div>
      <div class="text-sm text-gray-500">Members</div>
    </div>
    <div class="card p-4">
      <div class="text-2xl font-bold text-gray-900">{data.organization._count.classes}</div>
      <div class="text-sm text-gray-500">Classes</div>
    </div>
    <div class="card p-4">
      <div class="text-2xl font-bold text-gray-900">{data.organization.departments.length}</div>
      <div class="text-sm text-gray-500">Departments</div>
    </div>
    <div class="card p-4">
      <div class="text-2xl font-bold text-gray-900">{data.organization.subjects.length}</div>
      <div class="text-sm text-gray-500">Subjects</div>
    </div>
  </div>

  <!-- Tabs -->
  <div class="border-b border-gray-200 mb-6">
    <nav class="flex gap-6">
      {#each [
        { id: 'details', label: 'Details', icon: Building2 },
        { id: 'members', label: 'Members', icon: Users },
        { id: 'structure', label: 'Structure', icon: BookOpen },
        { id: 'settings', label: 'Settings', icon: Settings }
      ] as tab}
        <button
          onclick={() => (activeTab = tab.id as any)}
          class="flex items-center gap-2 px-1 py-3 border-b-2 text-sm font-medium transition-colors {activeTab === tab.id
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'}"
        >
          <tab.icon class="w-4 h-4" />
          {tab.label}
        </button>
      {/each}
    </nav>
  </div>

  {#if form?.error}
    <div class="p-3 bg-red-50 text-red-700 rounded-lg text-sm mb-4">{form.error}</div>
  {/if}
  {#if form?.success}
    <div class="p-3 bg-green-50 text-green-700 rounded-lg text-sm mb-4">Changes saved successfully!</div>
  {/if}

  <!-- Details Tab -->
  {#if activeTab === 'details'}
    <form method="POST" action="?/update" use:enhance class="card p-6">
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <label for="name" class="label">Organization Name</label>
          <input type="text" id="name" name="name" value={data.organization.name} required class="input" />
        </div>
        <div>
          <label for="type" class="label">Type</label>
          <select id="type" name="type" class="input">
            {#each orgTypes as type}
              <option value={type.value} selected={data.organization.type === type.value}>{type.label}</option>
            {/each}
          </select>
        </div>
        <div>
          <label for="email" class="label">Email</label>
          <input type="email" id="email" name="email" value={data.organization.email || ''} class="input" />
        </div>
        <div>
          <label for="phone" class="label">Phone</label>
          <input type="tel" id="phone" name="phone" value={data.organization.phone || ''} class="input" />
        </div>
        <div class="md:col-span-2">
          <label for="website" class="label">Website</label>
          <input type="url" id="website" name="website" value={data.organization.website || ''} class="input" />
        </div>
        <div class="md:col-span-2">
          <label for="address" class="label">Address</label>
          <input type="text" id="address" name="address" value={data.organization.address || ''} class="input" />
        </div>
        <div>
          <label for="city" class="label">City</label>
          <input type="text" id="city" name="city" value={data.organization.city || ''} class="input" />
        </div>
        <div>
          <label for="state" class="label">State</label>
          <input type="text" id="state" name="state" value={data.organization.state || ''} class="input" />
        </div>
        <div>
          <label for="zipCode" class="label">ZIP Code</label>
          <input type="text" id="zipCode" name="zipCode" value={data.organization.zipCode || ''} class="input" />
        </div>
        <div>
          <label for="country" class="label">Country</label>
          <input type="text" id="country" name="country" value={data.organization.country || 'US'} class="input" />
        </div>
        <div>
          <label for="timezone" class="label">Timezone</label>
          <select id="timezone" name="timezone" class="input">
            {#each timezones as tz}
              <option value={tz} selected={data.organization.timezone === tz}>{tz}</option>
            {/each}
          </select>
        </div>
      </div>
      <div class="flex justify-end mt-6">
        <button type="submit" class="btn btn-primary">Save Changes</button>
      </div>
    </form>
  {/if}

  <!-- Members Tab -->
  {#if activeTab === 'members'}
    <div class="space-y-4">
      <div class="flex justify-between items-center">
        <h3 class="font-semibold text-gray-900">Members ({data.organization.members.length})</h3>
        <button onclick={() => (showInviteModal = true)} class="btn btn-primary">
          <UserPlus class="w-4 h-4" />
          Invite Member
        </button>
      </div>

      <!-- Pending Invites -->
      {#if data.organization.invites.length > 0}
        <div class="card p-4">
          <h4 class="font-medium text-gray-900 mb-3">Pending Invites</h4>
          <div class="space-y-2">
            {#each data.organization.invites as invite}
              <div class="flex items-center justify-between py-2 px-3 bg-yellow-50 rounded-lg">
                <div>
                  <span class="text-gray-900">{invite.email}</span>
                  <span class="badge badge-yellow ml-2">{getRoleLabel(invite.role)}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-sm text-gray-500">Expires {formatDate(invite.expiresAt)}</span>
                  <form method="POST" action="?/cancelInvite" use:enhance>
                    <input type="hidden" name="inviteId" value={invite.id} />
                    <button type="submit" class="p-1 hover:bg-yellow-100 rounded">
                      <X class="w-4 h-4 text-gray-500" />
                    </button>
                  </form>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Members List -->
      <div class="card overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Member</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">Department</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden lg:table-cell">Joined</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            {#each data.organization.members as member}
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div class="avatar avatar-sm">{member.user.name?.charAt(0) || '?'}</div>
                    <div>
                      <div class="font-medium text-gray-900">{member.user.name}</div>
                      <div class="text-sm text-gray-500">{member.user.email}</div>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span class="badge {getRoleBadgeClass(member.role)}">{getRoleLabel(member.role)}</span>
                </td>
                <td class="px-4 py-3 hidden md:table-cell">
                  {member.department?.name || '-'}
                </td>
                <td class="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                  {formatDate(member.joinedAt)}
                </td>
                <td class="px-4 py-3 text-right">
                  {#if member.role !== 'ORG_OWNER'}
                    <form method="POST" action="?/removeMember" use:enhance class="inline">
                      <input type="hidden" name="memberId" value={member.id} />
                      <button type="submit" class="p-1 hover:bg-gray-100 rounded text-red-500">
                        <Trash2 class="w-4 h-4" />
                      </button>
                    </form>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <!-- Structure Tab -->
  {#if activeTab === 'structure'}
    <div class="grid md:grid-cols-2 gap-6">
      <!-- Departments -->
      <div class="card">
        <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 class="font-semibold text-gray-900">Departments</h3>
          <button onclick={() => (showDepartmentModal = true)} class="btn btn-sm btn-secondary">
            <Plus class="w-4 h-4" />
            Add
          </button>
        </div>
        <div class="p-4 space-y-2">
          {#each data.organization.departments as dept}
            <div class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
              <div>
                <span class="font-medium text-gray-900">{dept.name}</span>
                <span class="text-sm text-gray-500 ml-2">({dept._count.members} members)</span>
              </div>
              <form method="POST" action="?/deleteDepartment" use:enhance>
                <input type="hidden" name="departmentId" value={dept.id} />
                <button type="submit" class="p-1 hover:bg-gray-200 rounded">
                  <Trash2 class="w-4 h-4 text-gray-400" />
                </button>
              </form>
            </div>
          {:else}
            <p class="text-sm text-gray-500 text-center py-4">No departments yet</p>
          {/each}
        </div>
      </div>

      <!-- Subjects -->
      <div class="card">
        <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 class="font-semibold text-gray-900">Subjects</h3>
          <button onclick={() => (showSubjectModal = true)} class="btn btn-sm btn-secondary">
            <Plus class="w-4 h-4" />
            Add
          </button>
        </div>
        <div class="p-4 space-y-2">
          {#each data.organization.subjects as subject}
            <div class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
              <div>
                <span class="font-medium text-gray-900">{subject.name}</span>
                {#if subject.code}
                  <span class="text-sm text-gray-500 ml-2">({subject.code})</span>
                {/if}
              </div>
              <form method="POST" action="?/deleteSubject" use:enhance>
                <input type="hidden" name="subjectId" value={subject.id} />
                <button type="submit" class="p-1 hover:bg-gray-200 rounded">
                  <Trash2 class="w-4 h-4 text-gray-400" />
                </button>
              </form>
            </div>
          {:else}
            <p class="text-sm text-gray-500 text-center py-4">No subjects yet</p>
          {/each}
        </div>
      </div>

      <!-- Academic Terms -->
      <div class="card md:col-span-2">
        <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 class="font-semibold text-gray-900">Academic Terms</h3>
          <button onclick={() => (showTermModal = true)} class="btn btn-sm btn-secondary">
            <Plus class="w-4 h-4" />
            Add
          </button>
        </div>
        <div class="p-4">
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each data.organization.terms as term}
              <div class="p-4 border border-gray-200 rounded-lg {term.isCurrent ? 'border-blue-500 bg-blue-50' : ''}">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-medium text-gray-900">{term.name}</span>
                  {#if term.isCurrent}
                    <span class="badge badge-blue">Current</span>
                  {/if}
                </div>
                <div class="text-sm text-gray-500">
                  {formatDate(term.startDate)} - {formatDate(term.endDate)}
                </div>
                <form method="POST" action="?/deleteTerm" use:enhance class="mt-2">
                  <input type="hidden" name="termId" value={term.id} />
                  <button type="submit" class="text-sm text-red-500 hover:underline">Remove</button>
                </form>
              </div>
            {:else}
              <p class="text-sm text-gray-500 text-center py-4 col-span-full">No academic terms yet</p>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Settings Tab -->
  {#if activeTab === 'settings'}
    <div class="space-y-6">
      <!-- PowerSchool Integration Settings -->
      <div class="card p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
              <Globe class="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 text-lg">PowerSchool Integration</h3>
              <p class="text-gray-500">Enable or disable PowerSchool grade sync for this organization</p>
            </div>
          </div>
          <form method="POST" action="?/togglePowerSchool" use:enhance>
            <button
              type="submit"
              aria-label="Toggle PowerSchool integration"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {data.organization.powerSchoolEnabled ? 'bg-teal-600' : 'bg-gray-200'}"
            >
              <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {data.organization.powerSchoolEnabled ? 'translate-x-6' : 'translate-x-1'}"></span>
            </button>
          </form>
        </div>
        <div class="p-4 rounded-lg {data.organization.powerSchoolEnabled ? 'bg-teal-50 border border-teal-200' : 'bg-gray-50 border border-gray-200'}">
          {#if data.organization.powerSchoolEnabled}
            <div class="flex items-center gap-2 text-teal-700">
              <span class="text-teal-600">✓</span>
              <span class="font-medium">PowerSchool integration is enabled</span>
            </div>
            <p class="text-sm text-teal-600 mt-1">Teachers can connect their PowerSchool accounts and sync grades.</p>
          {:else}
            <div class="flex items-center gap-2 text-gray-700">
              <span class="text-gray-400">✗</span>
              <span class="font-medium">PowerSchool integration is disabled</span>
            </div>
            <p class="text-sm text-gray-500 mt-1">Teachers will not see PowerSchool options in their settings or gradebooks.</p>
          {/if}
        </div>
      </div>

      <!-- Plan Status -->
      <div class="card p-6">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            <Crown class="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 class="font-semibold text-gray-900 text-lg">Full Access Plan</h3>
            <p class="text-gray-500">All features unlocked - No restrictions</p>
          </div>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="p-4 bg-green-50 rounded-lg">
            <div class="text-green-700 font-medium">AI Features</div>
            <div class="text-sm text-green-600">Full Access</div>
          </div>
          <div class="p-4 bg-green-50 rounded-lg">
            <div class="text-green-700 font-medium">Unlimited Students</div>
            <div class="text-sm text-green-600">No Limits</div>
          </div>
          <div class="p-4 bg-green-50 rounded-lg">
            <div class="text-green-700 font-medium">Unlimited Teachers</div>
            <div class="text-sm text-green-600">No Limits</div>
          </div>
          <div class="p-4 {data.organization.powerSchoolEnabled ? 'bg-green-50' : 'bg-yellow-50'} rounded-lg">
            <div class="{data.organization.powerSchoolEnabled ? 'text-green-700' : 'text-yellow-700'} font-medium">PowerSchool</div>
            <div class="text-sm {data.organization.powerSchoolEnabled ? 'text-green-600' : 'text-yellow-600'}">{data.organization.powerSchoolEnabled ? 'Enabled' : 'Disabled'}</div>
          </div>
        </div>
      </div>

      <!-- Feature List -->
      <div class="card p-6">
        <h3 class="font-semibold text-gray-900 mb-4">Included Features</h3>
        <div class="grid sm:grid-cols-2 gap-3">
          {#each [
            'AI Test Generation',
            'AI Grading & Feedback',
            'AI Study Guide Creation',
            'AI Worksheet Generation',
            'Unlimited Classes',
            'Unlimited Tests & Quizzes',
            'Detailed Analytics',
            'Custom Branding',
            'Priority Support',
            'Department Management',
            'Academic Terms',
            'Bulk Import/Export'
          ] as feature}
            <div class="flex items-center gap-2 text-gray-700">
              <div class="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                <span class="text-green-600 text-xs">✓</span>
              </div>
              {feature}
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Invite Modal -->
{#if showInviteModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Invite Member</h2>
        <button onclick={() => (showInviteModal = false)} class="p-1 hover:bg-gray-100 rounded">
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>
      <form method="POST" action="?/inviteMember" use:enhance={() => {
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
            <label for="inviteEmail" class="label">Email Address</label>
            <input type="email" id="inviteEmail" name="email" required class="input" placeholder="teacher@school.edu" />
          </div>
          <div>
            <label for="inviteRole" class="label">Role</label>
            <select id="inviteRole" name="role" required class="input">
              {#each roles.filter(r => r.value !== 'ORG_OWNER') as role}
                <option value={role.value}>{role.label}</option>
              {/each}
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

<!-- Department Modal -->
{#if showDepartmentModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Add Department</h2>
        <button onclick={() => (showDepartmentModal = false)} class="p-1 hover:bg-gray-100 rounded">
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>
      <form method="POST" action="?/createDepartment" use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === 'success') {
            showDepartmentModal = false;
            await invalidateAll();
          }
          await update();
        };
      }}>
        <div class="p-6 space-y-4">
          <div>
            <label for="deptName" class="label">Department Name</label>
            <input type="text" id="deptName" name="name" required class="input" placeholder="Mathematics" />
          </div>
          <div>
            <label for="deptDesc" class="label">Description (optional)</label>
            <textarea id="deptDesc" name="description" class="input" rows="2"></textarea>
          </div>
        </div>
        <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button type="button" onclick={() => (showDepartmentModal = false)} class="btn btn-secondary">Cancel</button>
          <button type="submit" class="btn btn-primary">Add Department</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Subject Modal -->
{#if showSubjectModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Add Subject</h2>
        <button onclick={() => (showSubjectModal = false)} class="p-1 hover:bg-gray-100 rounded">
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>
      <form method="POST" action="?/createSubject" use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === 'success') {
            showSubjectModal = false;
            await invalidateAll();
          }
          await update();
        };
      }}>
        <div class="p-6 space-y-4">
          <div>
            <label for="subjectName" class="label">Subject Name</label>
            <input type="text" id="subjectName" name="name" required class="input" placeholder="Algebra I" />
          </div>
          <div>
            <label for="subjectCode" class="label">Subject Code (optional)</label>
            <input type="text" id="subjectCode" name="code" class="input" placeholder="ALG101" />
          </div>
          <div>
            <label for="subjectDept" class="label">Department (optional)</label>
            <select id="subjectDept" name="departmentId" class="input">
              <option value="">None</option>
              {#each data.organization.departments as dept}
                <option value={dept.id}>{dept.name}</option>
              {/each}
            </select>
          </div>
        </div>
        <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button type="button" onclick={() => (showSubjectModal = false)} class="btn btn-secondary">Cancel</button>
          <button type="submit" class="btn btn-primary">Add Subject</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Term Modal -->
{#if showTermModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Add Academic Term</h2>
        <button onclick={() => (showTermModal = false)} class="p-1 hover:bg-gray-100 rounded">
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>
      <form method="POST" action="?/createTerm" use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === 'success') {
            showTermModal = false;
            await invalidateAll();
          }
          await update();
        };
      }}>
        <div class="p-6 space-y-4">
          <div>
            <label for="termName" class="label">Term Name</label>
            <input type="text" id="termName" name="name" required class="input" placeholder="Fall 2024" />
          </div>
          <div>
            <label for="termStart" class="label">Start Date</label>
            <input type="date" id="termStart" name="startDate" required class="input" />
          </div>
          <div>
            <label for="termEnd" class="label">End Date</label>
            <input type="date" id="termEnd" name="endDate" required class="input" />
          </div>
          <label class="flex items-center gap-2">
            <input type="checkbox" name="isCurrent" value="true" class="rounded border-gray-300" />
            <span class="text-sm text-gray-700">Set as current term</span>
          </label>
        </div>
        <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button type="button" onclick={() => (showTermModal = false)} class="btn btn-secondary">Cancel</button>
          <button type="submit" class="btn btn-primary">Add Term</button>
        </div>
      </form>
    </div>
  </div>
{/if}
