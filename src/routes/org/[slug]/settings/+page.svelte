<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import {
    Building2,
    Mail,
    Phone,
    Globe,
    MapPin,
    Clock,
    Users,
    Plus,
    Trash2,
    CheckCircle,
    AlertCircle,
    Palette,
    Image
  } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let activeTab = $state<'general' | 'branding' | 'departments'>('general');
  let newDepartmentName = $state('');

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
</script>

<div class="max-w-4xl mx-auto">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900">Organization Settings</h1>
    <p class="text-gray-500 mt-1">Manage your organization's settings and configuration</p>
  </div>

  <!-- Tabs -->
  <div class="tabs mb-6">
    <button
      class="tab {activeTab === 'general' ? 'tab-active' : ''}"
      onclick={() => (activeTab = 'general')}
    >
      <Building2 class="w-4 h-4 inline mr-2" />
      General
    </button>
    <button
      class="tab {activeTab === 'branding' ? 'tab-active' : ''}"
      onclick={() => (activeTab = 'branding')}
    >
      <Palette class="w-4 h-4 inline mr-2" />
      Branding
    </button>
    <button
      class="tab {activeTab === 'departments' ? 'tab-active' : ''}"
      onclick={() => (activeTab = 'departments')}
    >
      <Users class="w-4 h-4 inline mr-2" />
      Departments
    </button>
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

  <!-- General Tab -->
  {#if activeTab === 'general'}
    <div class="card p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-6">Organization Details</h2>

      <form method="POST" action="?/updateOrganization" use:enhance class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="md:col-span-2">
            <label for="name" class="label">Organization Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={data.organization?.name || ''}
              required
              class="input"
            />
          </div>

          <div>
            <label for="email" class="label">
              <Mail class="w-4 h-4 inline mr-1" />
              Contact Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={data.organization?.email || ''}
              class="input"
              placeholder="admin@school.edu"
            />
          </div>

          <div>
            <label for="phone" class="label">
              <Phone class="w-4 h-4 inline mr-1" />
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={data.organization?.phone || ''}
              class="input"
              placeholder="(555) 123-4567"
            />
          </div>

          <div class="md:col-span-2">
            <label for="website" class="label">
              <Globe class="w-4 h-4 inline mr-1" />
              Website
            </label>
            <input
              type="url"
              id="website"
              name="website"
              value={data.organization?.website || ''}
              class="input"
              placeholder="https://school.edu"
            />
          </div>
        </div>

        <hr class="border-gray-200" />

        <h3 class="text-md font-semibold text-gray-900">Address</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="md:col-span-2">
            <label for="address" class="label">Street Address</label>
            <input
              type="text"
              id="address"
              name="address"
              value={data.organization?.address || ''}
              class="input"
              placeholder="123 Main Street"
            />
          </div>

          <div>
            <label for="city" class="label">City</label>
            <input
              type="text"
              id="city"
              name="city"
              value={data.organization?.city || ''}
              class="input"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="state" class="label">State</label>
              <input
                type="text"
                id="state"
                name="state"
                value={data.organization?.state || ''}
                class="input"
              />
            </div>

            <div>
              <label for="zipCode" class="label">ZIP Code</label>
              <input
                type="text"
                id="zipCode"
                name="zipCode"
                value={data.organization?.zipCode || ''}
                class="input"
              />
            </div>
          </div>
        </div>

        <hr class="border-gray-200" />

        <div>
          <label for="timezone" class="label">
            <Clock class="w-4 h-4 inline mr-1" />
            Timezone
          </label>
          <select id="timezone" name="timezone" class="input">
            {#each timezones as tz}
              <option value={tz} selected={data.organization?.timezone === tz}>{tz}</option>
            {/each}
          </select>
        </div>

        <div class="pt-4">
          <button type="submit" class="btn btn-primary">
            Save Changes
          </button>
        </div>
      </form>
    </div>

    <!-- Plan Info -->
    <div class="card p-6 mt-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Subscription</h2>
      <div class="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle class="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p class="font-semibold text-green-800">Full Access Plan</p>
            <p class="text-sm text-green-600">All features enabled with unlimited usage</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Branding Tab -->
  {#if activeTab === 'branding'}
    <div class="card p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-6">Branding Settings</h2>
      <p class="text-gray-500 mb-6">Customize your organization's look and feel</p>

      {#if form?.brandingSuccess}
        <div class="alert alert-success mb-6">
          <CheckCircle class="w-5 h-5" />
          Branding settings updated successfully!
        </div>
      {/if}

      <form method="POST" action="?/updateBranding" use:enhance class="space-y-6">
        <!-- Logo -->
        <div>
          <label for="logoUrl" class="label">
            <Image class="w-4 h-4 inline mr-1" />
            Logo URL
          </label>
          <input
            type="url"
            id="logoUrl"
            name="logoUrl"
            value={data.organization?.logoUrl || ''}
            class="input"
            placeholder="https://example.com/logo.png"
          />
          <p class="text-xs text-gray-500 mt-1">Enter the URL of your organization's logo (recommended: 200x200px PNG or SVG)</p>
        </div>

        {#if data.organization?.logoUrl}
          <div class="p-4 bg-gray-50 rounded-lg">
            <p class="text-sm font-medium text-gray-700 mb-2">Current Logo Preview:</p>
            <img
              src={data.organization.logoUrl}
              alt="Organization logo"
              class="h-16 w-auto object-contain"
              onerror={(e) => (e.currentTarget as HTMLImageElement).style.display = 'none'}
            />
          </div>
        {/if}

        <!-- Colors -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label for="primaryColor" class="label">
              <Palette class="w-4 h-4 inline mr-1" />
              Primary Color
            </label>
            <div class="flex gap-3">
              <input
                type="color"
                id="primaryColor"
                name="primaryColor"
                value={data.organization?.primaryColor || '#3b82f6'}
                class="w-12 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={data.organization?.primaryColor || '#3b82f6'}
                class="input flex-1"
                readonly
              />
            </div>
          </div>

          <div>
            <label for="secondaryColor" class="label">
              <Palette class="w-4 h-4 inline mr-1" />
              Secondary Color
            </label>
            <div class="flex gap-3">
              <input
                type="color"
                id="secondaryColor"
                name="secondaryColor"
                value={data.organization?.secondaryColor || '#1e40af'}
                class="w-12 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={data.organization?.secondaryColor || '#1e40af'}
                class="input flex-1"
                readonly
              />
            </div>
          </div>
        </div>

        <!-- Preview -->
        <div class="p-4 bg-gray-50 rounded-lg">
          <p class="text-sm font-medium text-gray-700 mb-3">Color Preview:</p>
          <div class="flex gap-4">
            <div class="flex-1">
              <div
                class="h-12 rounded-lg flex items-center justify-center text-white font-medium"
                style="background-color: {data.organization?.primaryColor || '#3b82f6'}"
              >
                Primary Button
              </div>
            </div>
            <div class="flex-1">
              <div
                class="h-12 rounded-lg flex items-center justify-center text-white font-medium"
                style="background-color: {data.organization?.secondaryColor || '#1e40af'}"
              >
                Secondary
              </div>
            </div>
          </div>
        </div>

        <div class="pt-4">
          <button type="submit" class="btn btn-primary">
            Save Branding
          </button>
        </div>
      </form>
    </div>
  {/if}

  <!-- Departments Tab -->
  {#if activeTab === 'departments'}
    <div class="space-y-6">
      <!-- Add Department -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Add Department</h2>

        {#if form?.deptError}
          <div class="alert alert-error mb-4">
            <AlertCircle class="w-5 h-5" />
            {form.deptError}
          </div>
        {/if}

        {#if form?.deptSuccess}
          <div class="alert alert-success mb-4">
            <CheckCircle class="w-5 h-5" />
            Department updated successfully!
          </div>
        {/if}

        <form
          method="POST"
          action="?/createDepartment"
          use:enhance={() => {
            return async ({ update }) => {
              await update();
              newDepartmentName = '';
              await invalidateAll();
            };
          }}
          class="flex gap-3"
        >
          <input
            type="text"
            name="departmentName"
            bind:value={newDepartmentName}
            placeholder="e.g., Mathematics, Science, English"
            class="input flex-1"
          />
          <button type="submit" class="btn btn-primary">
            <Plus class="w-4 h-4" />
            Add
          </button>
        </form>
      </div>

      <!-- Department List -->
      <div class="card">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="font-semibold text-gray-900">Departments ({data.departments.length})</h2>
        </div>
        {#if data.departments.length > 0}
          <ul class="divide-y divide-gray-200">
            {#each data.departments as dept}
              <li class="px-6 py-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Users class="w-5 h-5 text-indigo-600" />
                  </div>
                  <span class="font-medium text-gray-900">{dept.name}</span>
                </div>
                <form
                  method="POST"
                  action="?/deleteDepartment"
                  use:enhance={() => {
                    return async ({ update }) => {
                      await update();
                      await invalidateAll();
                    };
                  }}
                >
                  <input type="hidden" name="departmentId" value={dept.id} />
                  <button
                    type="submit"
                    class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    onclick={(e) => {
                      if (!confirm(`Delete department "${dept.name}"?`)) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </form>
              </li>
            {/each}
          </ul>
        {:else}
          <div class="p-8 text-center">
            <Users class="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p class="text-gray-500">No departments yet. Add your first department above.</p>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
