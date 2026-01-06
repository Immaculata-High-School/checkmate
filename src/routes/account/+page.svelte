<script lang="ts">
  import { enhance } from '$app/forms';
  import {
    User,
    Mail,
    Lock,
    Trash2,
    Globe,
    Calendar,
    Building2,
    Shield,
    AlertTriangle,
    CheckCircle,
    Clock,
    ArrowLeft,
    ExternalLink
  } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showDeleteModal = $state(false);
  let activeTab = $state('profile');

  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Anchorage',
    'Pacific/Honolulu',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Dubai',
    'Australia/Sydney'
  ];

  const locales = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'es-ES', label: 'Spanish' },
    { value: 'fr-FR', label: 'French' },
    { value: 'de-DE', label: 'German' },
    { value: 'pt-BR', label: 'Portuguese (Brazil)' },
    { value: 'zh-CN', label: 'Chinese (Simplified)' },
    { value: 'ja-JP', label: 'Japanese' }
  ];

  function formatDate(date: Date | string | null) {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function getRoleLabel(role: string) {
    switch (role) {
      case 'SUPER_ADMIN': return 'Super Admin';
      case 'ADMIN': return 'Admin';
      case 'SUPPORT': return 'Support';
      default: return 'User';
    }
  }

  function getOrgRoleLabel(role: string) {
    switch (role) {
      case 'OWNER': return 'Owner';
      case 'ADMIN': return 'Admin';
      case 'TEACHER': return 'Teacher';
      case 'STUDENT': return 'Student';
      default: return role;
    }
  }
</script>

<div class="min-h-screen bg-gray-50 py-8">
  <div class="max-w-4xl mx-auto px-4">
    <!-- Header -->
    <div class="mb-8">
      <button onclick={() => history.back()} class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft class="w-4 h-4" />
        Back
      </button>
      <div class="flex items-center gap-4">
        <div class="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
          {data.user.name ? data.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{data.user.name || 'Account Settings'}</h1>
          <p class="text-gray-500">{data.user.email}</p>
        </div>
      </div>
    </div>

  <!-- Tabs -->
  <div class="tabs mb-6">
    <button
      class="tab {activeTab === 'profile' ? 'tab-active' : ''}"
      onclick={() => (activeTab = 'profile')}
    >
      <User class="w-4 h-4 inline mr-2" />
      Profile
    </button>
    <button
      class="tab {activeTab === 'security' ? 'tab-active' : ''}"
      onclick={() => (activeTab = 'security')}
    >
      <Lock class="w-4 h-4 inline mr-2" />
      Security
    </button>
    <button
      class="tab {activeTab === 'organizations' ? 'tab-active' : ''}"
      onclick={() => (activeTab = 'organizations')}
    >
      <Building2 class="w-4 h-4 inline mr-2" />
      Organizations
    </button>
  </div>

  <!-- Email Verification Banner -->
  {#if !data.user.emailVerified}
    <div class="alert alert-warning mb-6">
      <AlertTriangle class="w-5 h-5 flex-shrink-0" />
      <div class="flex-1">
        <p class="font-medium">Email not verified</p>
        <p class="text-sm">Please verify your email address to access all features.</p>
      </div>
      <form method="POST" action="?/resendVerification" use:enhance>
        <button type="submit" class="btn btn-sm btn-secondary">
          Resend Verification
        </button>
      </form>
    </div>
  {/if}

  {#if form?.verificationSent}
    <div class="alert alert-success mb-6">
      <CheckCircle class="w-5 h-5" />
      Verification email sent! Please check your inbox.
    </div>
  {/if}

  <!-- Profile Tab -->
  {#if activeTab === 'profile'}
    <div class="space-y-6">
      <!-- Account Info -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-gray-500">Account ID:</span>
            <span class="ml-2 font-mono text-gray-700">{data.user.id.slice(0, 8)}...</span>
          </div>
          <div>
            <span class="text-gray-500">Platform Role:</span>
            <span class="ml-2">
              <span class="badge badge-blue">{getRoleLabel(data.user.platformRole)}</span>
            </span>
          </div>
          <div>
            <span class="text-gray-500">Member Since:</span>
            <span class="ml-2 text-gray-700">{formatDate(data.user.createdAt)}</span>
          </div>
          <div>
            <span class="text-gray-500">Last Login:</span>
            <span class="ml-2 text-gray-700">{formatDate(data.user.lastLoginAt)}</span>
          </div>
        </div>
      </div>

      <!-- Profile Form -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Profile Details</h2>

        {#if form?.profileSuccess}
          <div class="alert alert-success mb-4">
            <CheckCircle class="w-5 h-5" />
            Profile updated successfully!
          </div>
        {/if}

        {#if form?.profileError}
          <div class="alert alert-error mb-4">
            <AlertTriangle class="w-5 h-5" />
            {form.profileError}
          </div>
        {/if}

        <form method="POST" action="?/updateProfile" use:enhance class="space-y-4">
          <div>
            <label for="name" class="label">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={data.user.name || ''}
              required
              class="input"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="timezone" class="label">
                <Globe class="w-4 h-4 inline mr-1" />
                Timezone
              </label>
              <select id="timezone" name="timezone" class="input">
                {#each timezones as tz}
                  <option value={tz} selected={data.user.timezone === tz}>{tz}</option>
                {/each}
              </select>
            </div>

            <div>
              <label for="locale" class="label">Language</label>
              <select id="locale" name="locale" class="input">
                {#each locales as loc}
                  <option value={loc.value} selected={data.user.locale === loc.value}>{loc.label}</option>
                {/each}
              </select>
            </div>
          </div>

          <div>
            <label for="birthdate" class="label">
              <Calendar class="w-4 h-4 inline mr-1" />
              Date of Birth
            </label>
            <input
              type="date"
              id="birthdate"
              name="birthdate"
              value={data.user.birthdate ? new Date(data.user.birthdate).toISOString().split('T')[0] : ''}
              class="input"
            />
            <p class="form-hint">Optional. Used for age-appropriate content.</p>
          </div>

          <div class="pt-4">
            <button type="submit" class="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <!-- Security Tab -->
  {#if activeTab === 'security'}
    <div class="space-y-6">
      <!-- Change Email -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">
          <Mail class="w-5 h-5 inline mr-2" />
          Email Address
        </h2>

        <div class="mb-4 p-3 bg-gray-50 rounded-lg">
          <div class="flex items-center gap-2">
            <span class="text-gray-700">{data.user.email}</span>
            {#if data.user.emailVerified}
              <span class="badge badge-green">Verified</span>
            {:else}
              <span class="badge badge-yellow">Unverified</span>
            {/if}
          </div>
        </div>

        {#if form?.emailSuccess}
          <div class="alert alert-success mb-4">
            <CheckCircle class="w-5 h-5" />
            {form.message || 'Email updated! Please verify your new email address.'}
          </div>
        {/if}

        {#if form?.emailError}
          <div class="alert alert-error mb-4">
            <AlertTriangle class="w-5 h-5" />
            {form.emailError}
          </div>
        {/if}

        <form method="POST" action="?/updateEmail" use:enhance class="space-y-4">
          <div>
            <label for="newEmail" class="label">New Email Address</label>
            <input
              type="email"
              id="newEmail"
              name="newEmail"
              required
              class="input"
              placeholder="newemail@example.com"
            />
          </div>

          <div>
            <label for="emailPassword" class="label">Current Password</label>
            <input
              type="password"
              id="emailPassword"
              name="password"
              required
              class="input"
              placeholder="Enter your password to confirm"
            />
          </div>

          <button type="submit" class="btn btn-primary">
            Update Email
          </button>
        </form>
      </div>

      <!-- Change Password -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">
          <Lock class="w-5 h-5 inline mr-2" />
          Password
        </h2>

        {#if form?.passwordSuccess}
          <div class="alert alert-success mb-4">
            <CheckCircle class="w-5 h-5" />
            Password updated successfully!
          </div>
        {/if}

        {#if form?.passwordError}
          <div class="alert alert-error mb-4">
            <AlertTriangle class="w-5 h-5" />
            {form.passwordError}
          </div>
        {/if}

        <form method="POST" action="?/updatePassword" use:enhance class="space-y-4">
          <div>
            <label for="currentPassword" class="label">Current Password</label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              required
              class="input"
            />
          </div>

          <div>
            <label for="newPassword" class="label">New Password</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              required
              minlength="8"
              class="input"
            />
            <p class="form-hint">Minimum 8 characters</p>
          </div>

          <div>
            <label for="confirmPassword" class="label">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              required
              class="input"
            />
          </div>

          <button type="submit" class="btn btn-primary">
            Update Password
          </button>
        </form>
      </div>

      <!-- Delete Account -->
      <div class="card p-6 border-red-200">
        <h2 class="text-lg font-semibold text-red-600 mb-2">
          <Trash2 class="w-5 h-5 inline mr-2" />
          Delete Account
        </h2>
        <p class="text-gray-500 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button onclick={() => (showDeleteModal = true)} class="btn btn-danger">
          Delete My Account
        </button>
      </div>
    </div>
  {/if}

  <!-- Organizations Tab -->
  {#if activeTab === 'organizations'}
    <div class="space-y-6">
      {#if data.user.orgMemberships.length > 0}
        {#each data.user.orgMemberships as membership}
          <div class="card p-6">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Building2 class="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900">{membership.organization.name}</h3>
                  <p class="text-sm text-gray-500">/{membership.organization.slug}</p>
                </div>
              </div>
              <span class="badge badge-blue">{getOrgRoleLabel(membership.role)}</span>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-100">
              <a href="/org/{membership.organization.slug}" class="btn btn-sm btn-secondary">
                Go to Organization
              </a>
            </div>
          </div>
        {/each}
      {:else}
        <div class="card p-8 text-center">
          <Building2 class="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">No Organizations</h3>
          <p class="text-gray-500 mb-4">You're not a member of any organizations yet.</p>
        </div>
      {/if}
    </div>
  {/if}
  </div>
</div>

<!-- Delete Account Modal -->
{#if showDeleteModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
      <div class="p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle class="w-5 h-5 text-red-600" />
          </div>
          <h2 class="text-lg font-semibold text-gray-900">Delete Account</h2>
        </div>

        <p class="text-gray-600 mb-4">
          This will permanently delete your account, including:
        </p>
        <ul class="list-disc list-inside text-gray-600 mb-4 space-y-1">
          <li>Your profile and settings</li>
          <li>Organization memberships</li>
          <li>Test submissions and grades</li>
          <li>All associated data</li>
        </ul>

        {#if form?.deleteError}
          <div class="alert alert-error mb-4">
            <AlertTriangle class="w-5 h-5" />
            {form.deleteError}
          </div>
        {/if}

        <form method="POST" action="?/deleteAccount" use:enhance class="space-y-4">
          <div>
            <label for="deletePassword" class="label">Enter your password</label>
            <input
              type="password"
              id="deletePassword"
              name="password"
              required
              class="input"
            />
          </div>

          <div>
            <label for="confirmation" class="label">Type DELETE to confirm</label>
            <input
              type="text"
              id="confirmation"
              name="confirmation"
              required
              class="input"
              placeholder="DELETE"
            />
          </div>

          <div class="flex gap-3 pt-2">
            <button type="button" onclick={() => (showDeleteModal = false)} class="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" class="btn btn-danger flex-1">
              Delete Account
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}
