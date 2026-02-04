<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import {
    Settings,
    Link,
    Unlink,
    School,
    BookOpen,
    CheckCircle,
    AlertCircle,
    Loader2,
    ChevronDown,
    ExternalLink,
    Users,
    Folder
  } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Check if PowerSchool is enabled for the organization
  const powerSchoolEnabled = $derived($page.data.powerSchoolEnabled ?? true);

  let connectingPS = $state(false);
  let savingMapping = $state<string | null>(null);
  let selectedMappings = $state<Record<string, { sectionId: string }>>({});

  // Initialize selected mappings from existing data
  $effect(() => {
    const initial: Record<string, { sectionId: string }> = {};
    for (const cls of data.classes) {
      if (cls.powerSchoolMapping) {
        initial[cls.id] = {
          sectionId: cls.powerSchoolMapping.sectionId.toString()
        };
      }
    }
    selectedMappings = initial;
  });

  function getSectionName(sectionId: string): string {
    const section = data.powerSchool.sections.find(s => s.id.toString() === sectionId);
    return section ? `${section.name}${section.course_name ? ` - ${section.course_name}` : ''}` : '';
  }
</script>

<svelte:head>
  <title>Settings | Teacher Dashboard</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
  <div class="mb-8">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
        <Settings class="w-5 h-5 text-indigo-600" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Teacher Settings</h1>
        <p class="text-gray-500 mt-1">Manage integrations and class configurations</p>
      </div>
    </div>
  </div>

  <!-- Status Messages -->
  {#if data.messages.psConnected}
    <div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
      <CheckCircle class="w-5 h-5 text-green-600" />
      <span class="text-green-800">Successfully connected to PowerSchool!</span>
    </div>
  {/if}

  {#if data.messages.psError}
    <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
      <AlertCircle class="w-5 h-5 text-red-600" />
      <span class="text-red-800">PowerSchool error: {data.messages.psError}</span>
    </div>
  {/if}

  {#if form?.error}
    <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
      <AlertCircle class="w-5 h-5 text-red-600" />
      <span class="text-red-800">{form.error}</span>
    </div>
  {/if}

  {#if form?.success}
    <div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
      <CheckCircle class="w-5 h-5 text-green-600" />
      <span class="text-green-800">{form.message}</span>
    </div>
  {/if}

  <!-- PowerSchool Integration Section - Only show if enabled for the organization -->
  {#if powerSchoolEnabled}
  <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
    <div class="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
            <School class="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 class="text-lg font-semibold text-gray-900">PowerSchool Integration</h2>
            <p class="text-sm text-gray-500">Sync grades directly to your gradebook</p>
          </div>
        </div>

        {#if !data.powerSchool.configured}
          <span class="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">
            Not Configured
          </span>
        {:else if data.powerSchool.connected}
          <span class="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium flex items-center gap-1.5">
            <CheckCircle class="w-4 h-4" />
            Connected
          </span>
        {:else}
          <span class="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium">
            Not Connected
          </span>
        {/if}
      </div>
    </div>

    <div class="p-6">
      {#if !data.powerSchool.configured}
        <p class="text-gray-500 text-center py-8">
          PowerSchool integration has not been configured for this instance.<br />
          Please contact your administrator to set up the integration.
        </p>
      {:else if data.powerSchool.connected}
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p class="font-medium text-gray-900">
                {data.powerSchool.teacherName || 'Connected Teacher'}
              </p>
              <p class="text-sm text-gray-500">
                Teacher ID: {data.powerSchool.teacherId || 'N/A'}
              </p>
            </div>
            <form method="POST" action="?/disconnectPowerSchool" use:enhance>
              <button type="submit" class="btn btn-secondary btn-sm text-red-600 hover:bg-red-50">
                <Unlink class="w-4 h-4" />
                Disconnect
              </button>
            </form>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 bg-blue-50 rounded-lg">
              <div class="flex items-center gap-2 text-blue-700 font-medium">
                <BookOpen class="w-4 h-4" />
                {data.powerSchool.sections.length} Classes
              </div>
              <p class="text-sm text-blue-600 mt-1">Available to link</p>
            </div>
            <div class="p-4 bg-purple-50 rounded-lg">
              <div class="flex items-center gap-2 text-purple-700 font-medium">
                <Folder class="w-4 h-4" />
                {data.powerSchool.categories.length} Categories
              </div>
              <p class="text-sm text-purple-600 mt-1">For assignments</p>
            </div>
          </div>
        </div>
      {:else}
        <div class="text-center py-8">
          <p class="text-gray-500 mb-4">
            Connect your PowerSchool account to sync grades directly to your gradebook.
          </p>
          <form method="POST" action="?/connectPowerSchool" use:enhance={() => {
            connectingPS = true;
            return async ({ result }) => {
              if (result.type === 'redirect') {
                // Follow the redirect (works for external URLs too)
                window.location.href = result.location;
              } else {
                connectingPS = false;
              }
            };
          }}>
            <button 
              type="submit" 
              class="btn btn-primary"
              disabled={connectingPS}
            >
              {#if connectingPS}
                <Loader2 class="w-4 h-4 animate-spin" />
              {:else}
                <Link class="w-4 h-4" />
              {/if}
              Connect PowerSchool
            </button>
          </form>
        </div>
      {/if}
    </div>
  </div>

  <!-- Class Mappings Section -->
  {#if data.powerSchool.connected && data.classes.length > 0}
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="p-6 border-b border-gray-100">
        <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users class="w-5 h-5 text-indigo-600" />
          Link Classes to PowerSchool
        </h2>
        <p class="text-sm text-gray-500 mt-1">
          Map your Checkmate classes to PowerSchool sections for grade sync
        </p>
      </div>

      <div class="divide-y divide-gray-100">
        {#each data.classes as cls}
          {@const mapping = cls.powerSchoolMapping}
          {@const selected = selectedMappings[cls.id] || { sectionId: '' }}
          
          <form 
            method="POST" 
            action="?/saveClassMapping"
            use:enhance={() => {
              savingMapping = cls.id;
              return async ({ update }) => {
                await update();
                savingMapping = null;
              };
            }}
            class="p-4 hover:bg-gray-50 transition-colors"
          >
            <input type="hidden" name="classId" value={cls.id} />
            
            <div class="flex items-start gap-4">
              <!-- Class Info -->
              <div class="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                style="background-color: {cls.theme}20; color: {cls.theme}"
              >
                {cls.emoji || '📚'}
              </div>
              
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-2">
                  <h3 class="font-medium text-gray-900">{cls.name}</h3>
                  <span class="text-xs text-gray-400">
                    {cls._count.members} student{cls._count.members !== 1 ? 's' : ''}
                  </span>
                  {#if mapping}
                    <span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                      Linked
                    </span>
                  {/if}
                </div>

                <!-- Section Select -->
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">
                    PowerSchool Section
                  </label>
                  <select
                    name="sectionId"
                    class="input input-sm w-full"
                    bind:value={selected.sectionId}
                    onchange={(e) => {
                      const target = e.target as HTMLSelectElement;
                      selectedMappings[cls.id] = { sectionId: target.value };
                    }}
                  >
                    <option value="">Select a section...</option>
                    {#each data.powerSchool.sections as section}
                      <option value={section.id.toString()}>
                        {section.name}
                        {#if section.course_name}
                          - {section.course_name}
                        {/if}
                        {#if section.period}
                          (P{section.period})
                        {/if}
                      </option>
                    {/each}
                  </select>
                  <input type="hidden" name="sectionName" value={getSectionName(selected.sectionId)} />
                </div>

                {#if mapping}
                  <p class="text-xs text-gray-400 mt-2">
                    Currently linked to: {mapping.sectionName}
                  </p>
                {/if}
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-2 flex-shrink-0">
                <button
                  type="submit"
                  class="btn btn-sm btn-primary"
                  disabled={!selected.sectionId || savingMapping === cls.id}
                >
                  {#if savingMapping === cls.id}
                    <Loader2 class="w-4 h-4 animate-spin" />
                  {:else}
                    <CheckCircle class="w-4 h-4" />
                  {/if}
                  {mapping ? 'Update' : 'Link'}
                </button>

                {#if mapping}
                  <button
                    type="submit"
                    formaction="?/removeClassMapping"
                    class="btn btn-sm btn-secondary text-red-600 hover:bg-red-50"
                    title="Remove link"
                  >
                    <Unlink class="w-4 h-4" />
                  </button>
                {/if}
              </div>
            </div>
          </form>
        {/each}
      </div>
    </div>
  {:else if data.powerSchool.connected && data.classes.length === 0}
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
      <BookOpen class="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 class="font-medium text-gray-900 mb-2">No Classes Yet</h3>
      <p class="text-gray-500 mb-4">Create a class first, then link it to PowerSchool.</p>
      <a href="/teacher/classes/create" class="btn btn-primary">
        Create Class
      </a>
    </div>
  {/if}
  {/if}

  <!-- Account Settings Link -->
  <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mt-8">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="font-medium text-gray-900">Account Settings</h3>
        <p class="text-sm text-gray-500">Manage your profile, password, and preferences</p>
      </div>
      <a href="/account" class="btn btn-secondary">
        <ExternalLink class="w-4 h-4" />
        Go to Account
      </a>
    </div>
  </div>
</div>
