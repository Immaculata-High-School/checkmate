<script lang="ts">
  import '../app.css';
  import { ShieldIcon, Building2Icon } from 'lucide-svelte';
  import type { LayoutData } from './$types';

  let { children, data }: { children: any; data: LayoutData } = $props();
</script>

<svelte:head>
  <title>Checkmate - AI-Powered Learning Platform</title>
  <meta name="description" content="Create tests, study materials, and track progress with AI-powered tools" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
</svelte:head>

{#if data.isImpersonating}
  <div class="bg-amber-500 text-amber-900 py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2 sticky top-0 z-50">
    <ShieldIcon class="w-4 h-4" />
    <span>You are viewing as <strong>{data.user?.name || data.user?.email}</strong></span>
    <a
      href="/admin/return-to-admin"
      class="ml-4 px-3 py-1 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors text-xs font-semibold"
    >
      Return to Admin
    </a>
  </div>
{:else if data.isOrgAdminImpersonating && data.orgAdminReturnSlug}
  <div class="bg-purple-500 text-white py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2 sticky top-0 z-50">
    <Building2Icon class="w-4 h-4" />
    <span>Viewing as <strong>{data.user?.name || data.user?.email}</strong></span>
    <a
      href="/org/{data.orgAdminReturnSlug}/return-to-org-admin"
      class="ml-4 px-3 py-1 bg-purple-700 text-white rounded-md hover:bg-purple-800 transition-colors text-xs font-semibold"
    >
      Return to Org Admin
    </a>
  </div>
{/if}

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
  {@render children()}
</div>
