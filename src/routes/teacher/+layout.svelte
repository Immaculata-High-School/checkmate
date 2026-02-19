<script lang="ts">
  import { page } from '$app/stores';
  import {
    LayoutDashboard,
    Users,
    FileText,
    BookMarked,
    ClipboardList,
    Settings,
    Menu,
    X,
    ChevronDown,
    LogOut,
    User,
    UserCircle,
    Cpu,
    Library,
    Lightbulb
  } from 'lucide-svelte';
  import ChessKing from '$lib/components/ChessKing.svelte';
  import OrgDisabled from '$lib/components/OrgDisabled.svelte';
  import AIAssistant from '$lib/components/AIAssistant.svelte';
  import PinLock from '$lib/components/PinLock.svelte';
  import type { LayoutData } from './$types';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  import LoadingBar from '$lib/components/LoadingBar.svelte';

  let { children, data }: { children: any; data: LayoutData } = $props();

  let sidebarOpen = $state(false);
  let userMenuOpen = $state(false);

  const navItems = [
    { href: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/teacher/classes', label: 'Classes', icon: Users },
    { href: '/teacher/tests', label: 'Tests', icon: FileText },
    { href: '/teacher/worksheets', label: 'Worksheets', icon: ClipboardList },
    { href: '/teacher/docs', label: 'Documents', icon: FileText },
    { href: '/teacher/study-guides', label: 'Study Guides', icon: BookMarked },
    { href: '/teacher/study-sets', label: 'Flashcards', icon: Library },
    { href: '/teacher/jobs', label: 'Compute Jobs', icon: Cpu },
    { href: '/teacher/feature-request', label: 'Feature Request', icon: Lightbulb }
  ];

  function isActive(href: string): boolean {
    if (href === '/teacher') {
      return $page.url.pathname === '/teacher';
    }
    return $page.url.pathname.startsWith(href);
  }

  function getInitials(name: string | null): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
</script>

{#if data.orgDisabled}
  <OrgDisabled organizationName={data.disabledOrgName} />
{:else}
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
    class="fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 {sidebarOpen
      ? 'translate-x-0'
      : '-translate-x-full lg:translate-x-0'}"
  >
    <div class="flex flex-col h-full">
      <!-- Logo -->
      <div class="flex items-center justify-between px-4 py-4 border-b border-gray-200">
        <a href="/" class="flex items-center gap-2">
          <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <ChessKing class="w-5 h-5 text-white" />
          </div>
          <span class="text-lg font-bold text-gray-900">Checkmate</span>
          <span class="ml-auto text-xs font-medium text-gray-500">{(data.user as any)?.role === 'OWNER' ? 'Admin' : 'Teacher'}</span>
        </a>
        <button onclick={() => (sidebarOpen = false)} class="lg:hidden p-1 hover:bg-gray-100 rounded">
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {#each navItems as item}
          <a
            href={item.href}
            class="nav-link {isActive(item.href) ? 'nav-link-active' : ''}"
            onclick={() => (sidebarOpen = false)}
          >
            <item.icon class="w-5 h-5" />
            {item.label}
            {#if item.href === '/teacher/jobs' && data.runningJobsCount > 0}
              <span class="ml-auto inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-500 rounded-full animate-pulse">
                {data.runningJobsCount}
              </span>
            {/if}
          </a>
        {/each}
      </nav>

      <!-- User section -->
      <div class="p-3 border-t border-gray-200">
        <a href="/teacher/settings" class="nav-link">
          <Settings class="w-5 h-5" />
          Settings
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
            {navItems.find((item) => isActive(item.href))?.label || 'Dashboard'}
          </h1>
        </div>

        <div class="flex items-center gap-2">
          <!-- Notifications -->
          <NotificationBell />

          <!-- User menu -->
          <div class="relative">
            <button
              onclick={() => (userMenuOpen = !userMenuOpen)}
              class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span class="text-sm font-medium text-blue-600">{getInitials(data.user?.name || '')}</span>
            </div>
            <span class="hidden sm:block text-sm font-medium text-gray-700">{data.user?.name || 'User'}</span>
            <ChevronDown class="w-4 h-4 text-gray-400" />
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

    <!-- Page content -->
    <main class="flex-1 overflow-y-auto p-6">
      {@render children()}
    </main>
  </div>
</div>

<!-- Global AI Assistant -->
<AIAssistant />

<!-- Dashboard PIN Lock -->
{#if (data as any).dashboardPinEnabled}
  <PinLock />
{/if}
{/if}