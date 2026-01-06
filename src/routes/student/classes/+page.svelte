<script lang="ts">
  import { BookOpen, Users, Calendar } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<div class="max-w-4xl mx-auto">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900">My Classes</h1>
    <p class="text-gray-600">View all your enrolled classes</p>
  </div>

  {#if data.classes.length === 0}
    <div class="card p-12 text-center">
      <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <BookOpen class="w-8 h-8 text-gray-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-900 mb-2">No Classes Yet</h3>
      <p class="text-gray-500 mb-4">Join a class using a class code from your teacher.</p>
    </div>
  {:else}
    <div class="grid md:grid-cols-2 gap-4">
      {#each data.classes as cls}
        <a href="/student/classes/{cls.id}" class="card p-5 hover:border-blue-300 transition-colors">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
              {cls.emoji || '📚'}
            </div>
            <div class="flex-1">
              <h3 class="font-semibold text-gray-900">{cls.name}</h3>
              <p class="text-sm text-gray-500">{cls.teacher.name}</p>
              <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
                <span class="flex items-center gap-1">
                  <Users class="w-3 h-3" />
                  {cls._count.members} students
                </span>
                <span class="flex items-center gap-1">
                  <Calendar class="w-3 h-3" />
                  Joined {new Date(cls.enrolledAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
