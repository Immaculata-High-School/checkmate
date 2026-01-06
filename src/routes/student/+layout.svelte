<script lang="ts">
  import { page } from '$app/stores';
  import {
    GraduationCap,
    LayoutDashboard,
    BookOpen,
    FileText,
    Trophy,
    Settings,
    Menu,
    X,
    Bell,
    ChevronDown,
    Search,
    User,
    LogOut
  } from 'lucide-svelte';
  import ChessKing from '$lib/components/ChessKing.svelte';
  import OrgDisabled from '$lib/components/OrgDisabled.svelte';
  import { getInitials } from '$lib/utils';
  import type { LayoutData } from './$types';
  import LoadingBar from '$lib/components/LoadingBar.svelte';

  let { children, data }: { children: any; data: LayoutData } = $props();

  let sidebarOpen = $state(false);
  let userMenuOpen = $state(false);

  const navItems = [
    { href: '/student', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/student/classes', label: 'My Classes', icon: BookOpen },
    { href: '/student/assignments', label: 'Assignments', icon: FileText },
    { href: '/student/study', label: 'Study Materials', icon: GraduationCap },
    { href: '/student/grades', label: 'My Grades', icon: Trophy }
  ];

  function isActive(href: string): boolean {
    if (href === '/student') {
      return $page.url.pathname === '/student';
    }
    return $page.url.pathname.startsWith(href);
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
    class="fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out {sidebarOpen
      ? 'translate-x-0'
      : '-translate-x-full lg:translate-x-0'}"
  >
    <div class="flex flex-col h-full">
      <!-- Logo -->
      <div class="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <a href="/" class="flex items-center gap-2">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
            <ChessKing class="w-6 h-6 text-white" />
          </div>
          <span class="text-xl font-bold text-gradient">Checkmate</span>
        </a>
        <button onclick={() => (sidebarOpen = false)} class="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <!-- Join Class / Test Code -->
      <div class="px-4 py-4">
        <div class="relative">
          <Search class="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Enter class code..."
            class="input pl-12 text-sm uppercase tracking-wider"
            maxlength="6"
          />
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
        {#each navItems as item}
          <a
            href={item.href}
            class="nav-link {isActive(item.href) ? 'nav-link-active' : ''}"
            onclick={() => (sidebarOpen = false)}
          >
            <item.icon class="w-5 h-5" />
            {item.label}
          </a>
        {/each}
      </nav>

      <!-- Classes List -->
      {#if data.classes && data.classes.length > 0}
        <div class="px-4 py-4 border-t border-gray-100">
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">My Classes</span>
          <div class="mt-3 space-y-1">
            {#each data.classes as cls}
              <a
                href="/student/classes/{cls.id}"
                class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span class="text-lg">{cls.emoji || '📚'}</span>
                <div class="flex-1 min-w-0">
                  <span class="text-sm text-gray-700 truncate block">{cls.name}</span>
                  <span class="text-xs text-gray-400">{cls.teacher.name}</span>
                </div>
              </a>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Settings -->
      <div class="p-4 border-t border-gray-100">
        <a href="/student/settings" class="nav-link">
          <Settings class="w-5 h-5" />
          Settings
        </a>
      </div>
    </div>
  </aside>

  <!-- Main content -->
  <div class="flex-1 flex flex-col overflow-hidden">
    <!-- Top bar -->
    <header class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button onclick={() => (sidebarOpen = true)} class="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
            <Menu class="w-5 h-5 text-gray-500" />
          </button>
          <h1 class="text-xl font-semibold text-gray-900">
            {navItems.find((item) => isActive(item.href))?.label || 'Dashboard'}
          </h1>
        </div>

        <div class="flex items-center gap-4">
          <!-- Notifications -->
          <button class="relative p-2 hover:bg-gray-100 rounded-lg">
            <Bell class="w-5 h-5 text-gray-500" />
          </button>

          <!-- User menu -->
          <div class="relative">
            <button
              onclick={() => (userMenuOpen = !userMenuOpen)}
              class="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div class="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-medium">
                {getInitials(data.user?.name)}
              </div>
              <div class="hidden sm:block text-left">
                <div class="text-sm font-medium text-gray-700">{data.user?.name}</div>
                <div class="text-xs text-gray-500">Student</div>
              </div>
              <ChevronDown class="w-4 h-4 text-gray-400 hidden sm:block" />
            </button>

            {#if userMenuOpen}
              <div class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <a
                  href="/account"
                  onclick={() => (userMenuOpen = false)}
                  class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <User class="w-4 h-4" />
                  Account Settings
                </a>
                <a
                  href="/student/settings"
                  onclick={() => (userMenuOpen = false)}
                  class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Settings class="w-4 h-4" />
                  Preferences
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
    <main class="flex-1 overflow-y-auto p-6 bg-gray-50">
      {@render children()}
    </main>
  </div>
</div>
{/if}