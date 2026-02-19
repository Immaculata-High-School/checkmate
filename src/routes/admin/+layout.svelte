<script lang="ts">
  import { page } from '$app/stores';
  import {
    Shield,
    LayoutDashboard,
    Building2,
    Users,
    Settings,
    FileText,
    Menu,
    X,
    ChevronDown,
    LogOut,
    User,
    UserCircle,
    BarChart3,
    Megaphone,
    ScrollText,
    Gift,
    Lightbulb
  } from 'lucide-svelte';
  import type { LayoutData } from './$types';
  import LoadingBar from '$lib/components/LoadingBar.svelte';

  let { children, data }: { children: any; data: LayoutData } = $props();

  let sidebarOpen = $state(false);
  let userMenuOpen = $state(false);

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/analytics', label: 'AI Analytics', icon: BarChart3 },
    { href: '/admin/requests', label: 'Org Requests', icon: Building2 },
    { href: '/admin/organizations', label: 'Organizations', icon: Building2 },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/vouchers', label: 'Vouchers', icon: Gift },
    { href: '/admin/feature-requests', label: 'Feature Requests', icon: Lightbulb },
    { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
    { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
    { href: '/admin/settings', label: 'Settings', icon: Settings }
  ];

  function isActive(href: string): boolean {
    if (href === '/admin') {
      return $page.url.pathname === '/admin';
    }
    return $page.url.pathname.startsWith(href);
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
    class="fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-200 {sidebarOpen
      ? 'translate-x-0'
      : '-translate-x-full lg:translate-x-0'}"
  >
    <div class="flex flex-col h-full">
      <!-- Logo -->
      <div class="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        <a href="/admin" class="flex items-center gap-2">
          <div class="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <Shield class="w-5 h-5 text-white" />
          </div>
          <span class="text-lg font-bold text-white">Admin Panel</span>
        </a>
        <button onclick={() => (sidebarOpen = false)} class="lg:hidden p-1 hover:bg-gray-800 rounded">
          <X class="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {#each navItems as item}
          <a
            href={item.href}
            class="sidebar-nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors {isActive(item.href)
              ? 'bg-gray-800 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'}"
            onclick={() => (sidebarOpen = false)}
          >
            <item.icon class="w-5 h-5" />
            {item.label}
          </a>
        {/each}
      </nav>

      <!-- User section -->
      <div class="p-3 border-t border-gray-800">
        <a href="/" class="sidebar-nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800">
          <LogOut class="w-5 h-5" />
          Back to App
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
            {navItems.find((item) => isActive(item.href))?.label || 'Admin'}
          </h1>
        </div>
        <div class="relative">
          <button
            onclick={() => (userMenuOpen = !userMenuOpen)}
            class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <UserCircle class="w-5 h-5 text-gray-600" />
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

    <!-- Page content -->
    <main class="flex-1 overflow-y-auto p-6">
      {@render children()}
    </main>
  </div>
</div>
