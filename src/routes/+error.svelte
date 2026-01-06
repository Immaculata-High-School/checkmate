<script lang="ts">
  import { page } from '$app/stores';
  import { AlertTriangle, Home, ArrowLeft, RefreshCw } from 'lucide-svelte';

  function getErrorInfo(status: number) {
    switch (status) {
      case 400:
        return {
          title: 'Bad Request',
          description: 'The request was invalid or malformed.',
          icon: '🤔'
        };
      case 401:
        return {
          title: 'Unauthorized',
          description: 'You need to be logged in to access this page.',
          icon: '🔒'
        };
      case 403:
        return {
          title: 'Forbidden',
          description: "You don't have permission to access this resource.",
          icon: '🚫'
        };
      case 404:
        return {
          title: 'Page Not Found',
          description: "The page you're looking for doesn't exist or has been moved.",
          icon: '🔍'
        };
      case 500:
        return {
          title: 'Internal Server Error',
          description: 'Something went wrong on our end. Please try again later.',
          icon: '⚠️'
        };
      case 502:
        return {
          title: 'Bad Gateway',
          description: 'The server received an invalid response.',
          icon: '🌐'
        };
      case 503:
        return {
          title: 'Service Unavailable',
          description: 'The service is temporarily unavailable. Please try again later.',
          icon: '🔧'
        };
      default:
        return {
          title: 'Error',
          description: 'An unexpected error occurred.',
          icon: '❌'
        };
    }
  }

  const errorInfo = $derived(getErrorInfo($page.status));
</script>

<svelte:head>
  <title>{$page.status} - {errorInfo.title} | Checkmate</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
  <div class="max-w-lg w-full text-center">
    <!-- Error Icon -->
    <div class="text-8xl mb-6">{errorInfo.icon}</div>

    <!-- Error Status -->
    <div class="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-medium mb-4">
      <AlertTriangle class="w-4 h-4" />
      Error {$page.status}
    </div>

    <!-- Error Title -->
    <h1 class="text-3xl font-bold text-gray-900 mb-3">{errorInfo.title}</h1>

    <!-- Error Description -->
    <p class="text-gray-600 mb-8">{errorInfo.description}</p>

    <!-- Error Message (if available) -->
    {#if $page.error?.message && $page.error.message !== errorInfo.title}
      <div class="bg-gray-100 rounded-lg p-4 mb-8 text-left">
        <p class="text-sm font-medium text-gray-700 mb-1">Details:</p>
        <p class="text-sm text-gray-600 font-mono">{$page.error.message}</p>
      </div>
    {/if}

    <!-- Actions -->
    <div class="flex flex-col sm:flex-row gap-3 justify-center">
      <button
        onclick={() => history.back()}
        class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
      >
        <ArrowLeft class="w-5 h-5" />
        Go Back
      </button>

      <a
        href="/"
        class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
      >
        <Home class="w-5 h-5" />
        Home
      </a>

      <button
        onclick={() => location.reload()}
        class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
      >
        <RefreshCw class="w-5 h-5" />
        Retry
      </button>
    </div>

    <!-- Support Link -->
    <p class="mt-8 text-sm text-gray-500">
      If this problem persists, please contact support.
    </p>
  </div>
</div>
