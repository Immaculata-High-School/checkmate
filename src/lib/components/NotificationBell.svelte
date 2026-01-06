<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Bell,
    Check,
    CheckCircle,
    XCircle,
    BookOpen,
    FileText,
    ClipboardList,
    Sparkles,
    X
  } from 'lucide-svelte';

  interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    link: string | null;
    createdAt: string;
    job?: {
      id: string;
      type: string;
      status: string;
    } | null;
  }

  let notifications = $state<Notification[]>([]);
  let unreadCount = $state(0);
  let isOpen = $state(false);
  let loading = $state(false);

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications?limit=10');
      if (res.ok) {
        const data = await res.json();
        notifications = data.notifications;
        unreadCount = data.unreadCount;
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }

  async function markAsRead(notificationIds: string[]) {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds })
      });
      notifications = notifications.map((n) =>
        notificationIds.includes(n.id) ? { ...n, read: true } : n
      );
      unreadCount = Math.max(0, unreadCount - notificationIds.length);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }

  async function markAllAsRead() {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true })
      });
      notifications = notifications.map((n) => ({ ...n, read: true }));
      unreadCount = 0;
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }

  function handleNotificationClick(notification: Notification) {
    if (!notification.read) {
      markAsRead([notification.id]);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
    isOpen = false;
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'JOB_COMPLETE':
        return CheckCircle;
      case 'JOB_FAILED':
        return XCircle;
      case 'STUDY_GUIDE':
        return BookOpen;
      default:
        return Bell;
    }
  }

  function getIconColor(type: string) {
    switch (type) {
      case 'JOB_COMPLETE':
        return 'text-green-500';
      case 'JOB_FAILED':
        return 'text-red-500';
      case 'STUDY_GUIDE':
        return 'text-amber-500';
      default:
        return 'text-blue-500';
    }
  }

  function formatTime(date: string) {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-dropdown')) {
      isOpen = false;
    }
  }

  onMount(() => {
    fetchNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    // Click outside to close
    document.addEventListener('click', handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('click', handleClickOutside);
    };
  });
</script>

<div class="relative notification-dropdown">
  <button
    onclick={() => (isOpen = !isOpen)}
    class="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
    aria-label="Notifications"
  >
    <Bell class="w-5 h-5 text-gray-600" />
    {#if unreadCount > 0}
      <span
        class="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
      >
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    {/if}
  </button>

  {#if isOpen}
    <div
      class="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50"
    >
      <!-- Header -->
      <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <h3 class="font-semibold text-gray-900">Notifications</h3>
        <div class="flex items-center gap-2">
          {#if unreadCount > 0}
            <button onclick={markAllAsRead} class="text-xs text-blue-600 hover:text-blue-700">
              Mark all read
            </button>
          {/if}
          <button
            onclick={() => (isOpen = false)}
            class="p-1 rounded hover:bg-gray-200 text-gray-500"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Notifications List -->
      <div class="max-h-96 overflow-y-auto">
        {#if notifications.length === 0}
          <div class="p-8 text-center">
            <Bell class="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p class="text-gray-500 text-sm">No notifications yet</p>
          </div>
        {:else}
          {#each notifications as notification}
            {@const Icon = getNotificationIcon(notification.type)}
            <button
              onclick={() => handleNotificationClick(notification)}
              class="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3 {!notification.read
                ? 'bg-blue-50/50'
                : ''}"
            >
              <div
                class="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <Icon class="w-4 h-4 {getIconColor(notification.type)}" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <p class="font-medium text-gray-900 text-sm truncate">{notification.title}</p>
                  <span class="text-xs text-gray-400 flex-shrink-0">
                    {formatTime(notification.createdAt)}
                  </span>
                </div>
                <p class="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
              </div>
              {#if !notification.read}
                <div class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
              {/if}
            </button>
          {/each}
        {/if}
      </div>

      <!-- Footer -->
      <div class="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <a
          href="/teacher/jobs"
          class="text-sm text-blue-600 hover:text-blue-700 font-medium"
          onclick={() => (isOpen = false)}
        >
          View all AI jobs
        </a>
      </div>
    </div>
  {/if}
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
