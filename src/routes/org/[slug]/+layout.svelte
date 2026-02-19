<script lang="ts">
  import { page } from '$app/stores';
  import {
    Building2,
    LayoutDashboard,
    Users,
    GraduationCap,
    Settings,
    Menu,
    X,
    ChevronDown,
    LogOut,
    User,
    UserCircle,
    BookOpen,
    FileText,
    BarChart3,
    TrendingUp,
    CreditCard,
    AlertTriangle,
    Lightbulb
  } from 'lucide-svelte';
  import PowerSchoolIcon from '$lib/components/PowerSchoolIcon.svelte';
  import type { LayoutData } from './$types';
  import LoadingBar from '$lib/components/LoadingBar.svelte';

  let { children, data }: { children: any; data: LayoutData } = $props();

  let sidebarOpen = $state(false);
  let userMenuOpen = $state(false);

  const navItems = $derived([
    { href: `/org/${data.organization.slug}`, label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: `/org/${data.organization.slug}/performance`, label: 'Performance', icon: TrendingUp },
    { href: `/org/${data.organization.slug}/analytics`, label: 'AI Analytics', icon: BarChart3 },
    { href: `/org/${data.organization.slug}/teachers`, label: 'Teachers', icon: Users },
    { href: `/org/${data.organization.slug}/classes`, label: 'Classes', icon: BookOpen },
    { href: `/org/${data.organization.slug}/students`, label: 'Students', icon: GraduationCap },
    { href: `/org/${data.organization.slug}/powerschool`, label: 'PowerSchool', icon: PowerSchoolIcon },
    { href: `/org/${data.organization.slug}/billing`, label: 'Billing', icon: CreditCard, warn: data.hasBillingIssue },
    { href: `/org/${data.organization.slug}/feature-request`, label: 'Feature Request', icon: Lightbulb },
    { href: `/org/${data.organization.slug}/settings`, label: 'Settings', icon: Settings }
  ]);

  function isActive(href: string, exact: boolean = false): boolean {
    if (exact) {
      return $page.url.pathname === href;
    }
    return $page.url.pathname.startsWith(href);
  }

  function getInitials(name: string | null): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
</script>

<LoadingBar />

<div class="flex h-screen bg-gray-50">
  <!-- Mobile sidebar backdrop -->
  {#if sidebarOpen}
    <div
      class="fixed inset-0 bg-black/50 z-40 lg:hidden"
      onclick={() => (sidebarOpen = false)}
      role="button"
      tabindex="-1"
      onkeydown={(e) => e.key === 'Escape' && (sidebarOpen = false)}
    ></div>
  {/if}

  <!-- Sidebar -->
  <aside
    class="fixed lg:static inset-y-0 left-0 z-50 w-64 bg-indigo-900 transform transition-transform duration-200 {sidebarOpen
      ? 'translate-x-0'
      : '-translate-x-full lg:translate-x-0'}"
  >
    <div class="flex flex-col h-full">
      <!-- Logo -->
      <div class="flex items-center justify-between px-4 py-4 border-b border-indigo-800">
        <a href="/org/{data.organization.slug}" class="flex items-center gap-2">
          <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Building2 class="w-5 h-5 text-white" />
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-bold text-white truncate max-w-[140px]">{data.organization.name}</span>
            <span class="text-xs text-indigo-300">Organization</span>
          </div>
        </a>
        <button onclick={() => (sidebarOpen = false)} class="lg:hidden p-1 hover:bg-indigo-800 rounded">
          <X class="w-5 h-5 text-indigo-300" />
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {#each navItems as item}
          <a
            href={item.href}
            class="sidebar-nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors {item.warn
              ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 ring-1 ring-red-400/50'
              : isActive(item.href, item.exact)
                ? 'bg-indigo-800 text-white'
                : 'text-indigo-300 hover:text-white hover:bg-indigo-800'}"
            onclick={() => (sidebarOpen = false)}
          >
            <item.icon class="w-5 h-5 {item.warn ? 'text-red-400' : ''}" />
            <span class="flex-1">{item.label}</span>
            {#if item.warn}
              <span class="flex items-center justify-center w-5 h-5 bg-red-500 rounded-full">
                <AlertTriangle class="w-3 h-3 text-white" />
              </span>
            {/if}
          </a>
        {/each}
      </nav>

      <!-- User section -->
      <div class="p-3 border-t border-indigo-800">
        <a href="/" class="sidebar-nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-indigo-300 hover:text-white hover:bg-indigo-800">
          <LogOut class="w-5 h-5" />
          Back to Home
        </a>
      </div>
    </div>
  </aside>

  <!-- Main content -->
  <div class="flex-1 flex flex-col overflow-hidden">
    <!-- Top bar -->
    <header class="bg-white border-b border-gray-200 px-4 py-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button onclick={() => (sidebarOpen = true)} class="lg:hidden p-1 hover:bg-gray-100 rounded">
            <Menu class="w-5 h-5 text-gray-500" />
          </button>
          <h1 class="text-lg font-semibold text-gray-900">
            {navItems.find((item) => isActive(item.href, item.exact))?.label || 'Organization'}
          </h1>
        </div>

        <div class="relative">
          <button
            onclick={() => (userMenuOpen = !userMenuOpen)}
            class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <span class="text-sm font-medium text-indigo-600">{getInitials(data.user?.name)}</span>
            </div>
            <span class="text-sm font-medium text-gray-700">{data.user?.name}</span>
            <ChevronDown class="w-4 h-4 text-gray-500" />
          </button>

          {#if userMenuOpen}
            <div class="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
              <a
                href="/account"
                onclick={() => (userMenuOpen = false)}
                class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <User class="w-4 h-4" />
                Account Settings
              </a>
              <hr class="my-1 border-gray-200" />
              <form action="/logout" method="POST">
                <button
                  type="submit"
                  class="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                >
                  <LogOut class="w-4 h-4" />
                  Sign Out
                </button>
              </form>
            </div>
          {/if}
        </div>
      </div>
    </header>

    <!-- Click outside to close menu -->
    {#if userMenuOpen}
      <div
        class="fixed inset-0 z-40"
        onclick={() => (userMenuOpen = false)}
        role="button"
        tabindex="-1"
        onkeydown={(e) => e.key === 'Escape' && (userMenuOpen = false)}
      ></div>
    {/if}

    <!-- Billing warning banner -->
    {#if data.hasBillingIssue}
      <div class="bg-red-600 text-white px-4 py-3">
        <div class="flex items-center justify-between max-w-7xl mx-auto">
          <div class="flex items-center gap-3">
            <AlertTriangle class="w-5 h-5 flex-shrink-0" />
            <div>
              <span class="font-medium">Billing Issue:</span>
              <span class="ml-1">
                {#if data.balance <= 0}
                  Your organization's balance is depleted. Teachers and students cannot access the platform.
                {:else}
                  Billing is disabled for your organization. Please contact support.
                {/if}
              </span>
            </div>
          </div>
          <a
            href="/org/{data.organization.slug}/billing"
            class="px-4 py-1.5 bg-white text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex-shrink-0"
          >
            Update Billing
          </a>
        </div>
      </div>
    {/if}

    <!-- Page content -->
    <main class="flex-1 overflow-y-auto p-6">
      {@render children()}
    </main>
  </div>
</div>
