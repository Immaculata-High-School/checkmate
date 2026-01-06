<script lang="ts">
  import {
    Users,
    GraduationCap,
    BookOpen,
    FileText,
    TrendingUp,
    Clock,
    ChevronRight,
    UserPlus
  } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function formatDate(date: Date | string | null) {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function getInitials(name: string | null): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
</script>

<div class="max-w-7xl mx-auto">
  <!-- Welcome Banner -->
  <div class="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 mb-6 text-white">
    <h1 class="text-2xl font-bold mb-2">Welcome to {data.organization.name}</h1>
    <p class="text-indigo-100">Manage your teachers, classes, and monitor organization activity.</p>
  </div>

  <!-- Stats Grid -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <div class="card p-5">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500">Teachers</p>
          <p class="text-2xl font-bold text-gray-900">{data.stats?.totalTeachers || 0}</p>
        </div>
        <div class="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
          <Users class="w-6 h-6 text-blue-600" />
        </div>
      </div>
    </div>

    <div class="card p-5">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500">Students</p>
          <p class="text-2xl font-bold text-gray-900">{data.stats?.totalStudents || 0}</p>
        </div>
        <div class="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
          <GraduationCap class="w-6 h-6 text-green-600" />
        </div>
      </div>
    </div>

    <div class="card p-5">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500">Classes</p>
          <p class="text-2xl font-bold text-gray-900">{data.stats?.totalClasses || 0}</p>
        </div>
        <div class="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
          <BookOpen class="w-6 h-6 text-purple-600" />
        </div>
      </div>
    </div>

    <div class="card p-5">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500">Tests Created</p>
          <p class="text-2xl font-bold text-gray-900">{data.stats?.totalTests || 0}</p>
        </div>
        <div class="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
          <FileText class="w-6 h-6 text-orange-600" />
        </div>
      </div>
    </div>
  </div>

  <div class="grid lg:grid-cols-2 gap-6">
    <!-- Recent Teachers -->
    <div class="card">
      <div class="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 class="font-semibold text-gray-900">Recent Teachers</h2>
        <a href="/org/{data.organization.slug}/teachers" class="text-sm text-indigo-600 hover:underline flex items-center gap-1">
          View All <ChevronRight class="w-4 h-4" />
        </a>
      </div>
      <div class="p-5">
        {#if data.recentTeachers && data.recentTeachers.length > 0}
          <div class="space-y-4">
            {#each data.recentTeachers as member}
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span class="text-sm font-medium text-blue-600">{getInitials(member.user.name)}</span>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{member.user.name}</p>
                    <p class="text-sm text-gray-500">{member.user.email}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-xs text-gray-400">Last login</p>
                  <p class="text-sm text-gray-600">{formatDate(member.user.lastLoginAt)}</p>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-center py-8">
            <Users class="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p class="text-gray-500 mb-3">No teachers yet</p>
            <a href="/org/{data.organization.slug}/teachers" class="btn btn-primary btn-sm">
              <UserPlus class="w-4 h-4" />
              Invite Teachers
            </a>
          </div>
        {/if}
      </div>
    </div>

    <!-- Recent Classes -->
    <div class="card">
      <div class="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 class="font-semibold text-gray-900">Recent Classes</h2>
        <a href="/org/{data.organization.slug}/classes" class="text-sm text-indigo-600 hover:underline flex items-center gap-1">
          View All <ChevronRight class="w-4 h-4" />
        </a>
      </div>
      <div class="p-5">
        {#if data.recentClasses && data.recentClasses.length > 0}
          <div class="space-y-4">
            {#each data.recentClasses as cls}
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="flex items-center gap-3">
                  <span class="text-2xl">{cls.emoji || '📚'}</span>
                  <div>
                    <p class="font-medium text-gray-900">{cls.name}</p>
                    <p class="text-sm text-gray-500">by {cls.teacher.name}</p>
                  </div>
                </div>
                <div class="text-right text-sm">
                  <p class="text-gray-600">{cls._count.members} students</p>
                  <p class="text-gray-400">{cls._count.tests} tests</p>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-center py-8">
            <BookOpen class="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p class="text-gray-500">No classes created yet</p>
            <p class="text-sm text-gray-400 mt-1">Classes will appear here when teachers create them</p>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="mt-6 card p-5">
    <h2 class="font-semibold text-gray-900 mb-4">Quick Actions</h2>
    <div class="grid sm:grid-cols-3 gap-4">
      <a href="/org/{data.organization.slug}/teachers" class="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
        <div class="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
          <UserPlus class="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <p class="font-medium text-gray-900">Invite Teacher</p>
          <p class="text-sm text-gray-500">Add new staff</p>
        </div>
      </a>
      <a href="/org/{data.organization.slug}/classes" class="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors">
        <div class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
          <BookOpen class="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <p class="font-medium text-gray-900">View Classes</p>
          <p class="text-sm text-gray-500">Monitor activity</p>
        </div>
      </a>
      <a href="/org/{data.organization.slug}/settings" class="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors">
        <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
          <TrendingUp class="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <p class="font-medium text-gray-900">Organization Settings</p>
          <p class="text-sm text-gray-500">Manage your org</p>
        </div>
      </a>
    </div>
  </div>
</div>
