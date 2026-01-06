<script lang="ts">
  import { AlertTriangle, Mail, Clock, Building2 } from 'lucide-svelte';

  let { organizationName = 'Your organization' }: { organizationName?: string } = $props();
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
  <div class="max-w-md w-full">
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
        <AlertTriangle class="w-10 h-10 text-red-600" />
      </div>
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Organization Access Suspended</h1>
      <p class="text-gray-600">
        Access to {organizationName} has been temporarily suspended due to billing issues.
      </p>
    </div>

    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
      <div class="flex items-start gap-4">
        <div class="p-2 rounded-lg bg-yellow-100">
          <Clock class="w-5 h-5 text-yellow-600" />
        </div>
        <div>
          <h3 class="font-medium text-gray-900">Service Temporarily Unavailable</h3>
          <p class="text-sm text-gray-600 mt-1">
            Your organization's balance has run out. Access to classes, tests, and other features is disabled until the balance is restored.
          </p>
        </div>
      </div>

      <div class="flex items-start gap-4">
        <div class="p-2 rounded-lg bg-blue-100">
          <Building2 class="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 class="font-medium text-gray-900">Contact Your Administrator</h3>
          <p class="text-sm text-gray-600 mt-1">
            Please reach out to your organization administrator to resolve the billing issue and restore access.
          </p>
        </div>
      </div>

      <div class="flex items-start gap-4">
        <div class="p-2 rounded-lg bg-purple-100">
          <Mail class="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 class="font-medium text-gray-900">Questions?</h3>
          <p class="text-sm text-gray-600 mt-1">
            If you believe this is an error, please contact support for assistance.
          </p>
        </div>
      </div>
    </div>

    <div class="mt-6 text-center">
      <a href="/" class="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
        ← Return to Home
      </a>
    </div>
  </div>
</div>
