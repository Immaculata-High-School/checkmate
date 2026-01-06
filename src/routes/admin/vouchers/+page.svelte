<script lang="ts">
  import { enhance } from '$app/forms';
  import {
    Gift,
    Plus,
    Trash2,
    Copy,
    Check,
    X,
    AlertTriangle,
    Calendar,
    Users,
    DollarSign,
    ToggleLeft,
    ToggleRight,
    Building2
  } from 'lucide-svelte';

  let { data, form } = $props();

  let showCreateForm = $state(false);
  let isCreating = $state(false);
  let copiedCode = $state<string | null>(null);

  // Form fields
  let amount = $state('50');
  let maxUses = $state('');
  let expiresAt = $state('');
  let customCode = $state('');

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  function formatDate(date: Date | string | null) {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    copiedCode = code;
    setTimeout(() => {
      copiedCode = null;
    }, 2000);
  }

  function resetForm() {
    amount = '50';
    maxUses = '';
    expiresAt = '';
    customCode = '';
    showCreateForm = false;
  }
</script>

<div class="max-w-7xl mx-auto">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Voucher Codes</h1>
      <p class="text-gray-500 mt-1">Create and manage voucher codes for organizations</p>
    </div>
    <button
      onclick={() => (showCreateForm = !showCreateForm)}
      class="btn btn-primary"
    >
      {#if showCreateForm}
        <X class="w-5 h-5" />
        Cancel
      {:else}
        <Plus class="w-5 h-5" />
        Create Voucher
      {/if}
    </button>
  </div>

  <!-- Success/Error messages -->
  {#if form?.success && form?.code}
    <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-green-700">
          <Check class="w-5 h-5" />
          <span>Voucher created successfully!</span>
        </div>
        <button
          onclick={() => copyCode(form.code)}
          class="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded font-mono text-sm hover:bg-green-700 transition-colors"
        >
          {#if copiedCode === form.code}
            <Check class="w-4 h-4" />
          {:else}
            <Copy class="w-4 h-4" />
          {/if}
          {form.code}
        </button>
      </div>
    </div>
  {/if}

  {#if form?.error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div class="flex items-center gap-2 text-red-700">
        <AlertTriangle class="w-5 h-5" />
        <span>{form.error}</span>
      </div>
    </div>
  {/if}

  <!-- Create Form -->
  {#if showCreateForm}
    <div class="card p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Create New Voucher</h2>
      <form
        method="POST"
        action="?/create"
        use:enhance={() => {
          isCreating = true;
          return async ({ update }) => {
            await update();
            isCreating = false;
            if (form?.success) resetForm();
          };
        }}
        class="space-y-4"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Amount -->
          <div>
            <label for="amount" class="label">
              Amount (USD)
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              bind:value={amount}
              step="0.01"
              min="0.01"
              required
              class="input"
            />
          </div>

          <!-- Max Uses -->
          <div>
            <label for="maxUses" class="label">
              Max Uses (optional)
            </label>
            <input
              type="number"
              id="maxUses"
              name="maxUses"
              bind:value={maxUses}
              min="1"
              placeholder="Unlimited"
              class="input"
            />
          </div>

          <!-- Expiry Date -->
          <div>
            <label for="expiresAt" class="label">
              Expires At (optional)
            </label>
            <input
              type="date"
              id="expiresAt"
              name="expiresAt"
              bind:value={expiresAt}
              class="input"
            />
          </div>

          <!-- Custom Code -->
          <div>
            <label for="customCode" class="label">
              Custom Code (optional)
            </label>
            <input
              type="text"
              id="customCode"
              name="customCode"
              bind:value={customCode}
              placeholder="Auto-generated if empty"
              class="input uppercase"
            />
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onclick={() => resetForm()}
            class="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isCreating}
            class="btn btn-primary"
          >
            {isCreating ? 'Creating...' : 'Create Voucher'}
          </button>
        </div>
      </form>
    </div>
  {/if}

  <!-- Voucher List -->
  <div class="card overflow-hidden">
    {#if data.vouchers.length === 0}
      <div class="text-center py-12 text-gray-500">
        <Gift class="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No vouchers created yet</p>
        <p class="text-sm mt-1">Create your first voucher to get started</p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Uses</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Expires</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Redemptions</th>
              <th class="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            {#each data.vouchers as voucher}
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <code class="text-purple-600 font-mono text-sm bg-purple-50 px-2 py-1 rounded">{voucher.code}</code>
                    <button
                      onclick={() => copyCode(voucher.code)}
                      class="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="Copy code"
                    >
                      {#if copiedCode === voucher.code}
                        <Check class="w-4 h-4 text-green-500" />
                      {:else}
                        <Copy class="w-4 h-4 text-gray-400" />
                      {/if}
                    </button>
                  </div>
                </td>
                <td class="px-6 py-4 text-gray-900 font-medium">
                  {formatCurrency(voucher.amount)}
                </td>
                <td class="px-6 py-4 text-gray-600">
                  {voucher.usedCount} / {voucher.maxUses ?? '∞'}
                </td>
                <td class="px-6 py-4 text-gray-600">
                  {formatDate(voucher.expiresAt)}
                </td>
                <td class="px-6 py-4">
                  {#if !voucher.isActive}
                    <span class="badge badge-gray">Disabled</span>
                  {:else if voucher.expiresAt && new Date(voucher.expiresAt) < new Date()}
                    <span class="badge badge-red">Expired</span>
                  {:else if voucher.maxUses && voucher.usedCount >= voucher.maxUses}
                    <span class="badge badge-yellow">Maxed Out</span>
                  {:else}
                    <span class="badge badge-green">Active</span>
                  {/if}
                </td>
                <td class="px-6 py-4">
                  {#if voucher.redemptions.length > 0}
                    <div class="flex flex-wrap gap-1">
                      {#each voucher.redemptions.slice(0, 3) as redemption}
                        <a
                          href="/org/{redemption.organizationSlug}"
                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs hover:bg-blue-100"
                        >
                          <Building2 class="w-3 h-3" />
                          {redemption.organizationName}
                        </a>
                      {/each}
                      {#if voucher.redemptions.length > 3}
                        <span class="px-2 py-0.5 text-xs text-gray-500">
                          +{voucher.redemptions.length - 3} more
                        </span>
                      {/if}
                    </div>
                  {:else}
                    <span class="text-gray-400 text-sm">None</span>
                  {/if}
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center justify-end gap-2">
                    <!-- Toggle Active -->
                    <form method="POST" action="?/toggle" use:enhance>
                      <input type="hidden" name="id" value={voucher.id} />
                      <button
                        type="submit"
                        class="p-2 hover:bg-gray-100 rounded transition-colors"
                        title={voucher.isActive ? 'Disable voucher' : 'Enable voucher'}
                      >
                        {#if voucher.isActive}
                          <ToggleRight class="w-5 h-5 text-green-500" />
                        {:else}
                          <ToggleLeft class="w-5 h-5 text-gray-400" />
                        {/if}
                      </button>
                    </form>
                    <!-- Delete -->
                    <form
                      method="POST"
                      action="?/delete"
                      use:enhance={() => {
                        if (!confirm('Are you sure you want to delete this voucher? This cannot be undone.')) {
                          return () => {};
                        }
                        return async ({ update }) => {
                          await update();
                        };
                      }}
                    >
                      <input type="hidden" name="id" value={voucher.id} />
                      <button
                        type="submit"
                        class="p-2 hover:bg-red-50 rounded transition-colors text-red-500"
                        title="Delete voucher"
                      >
                        <Trash2 class="w-5 h-5" />
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  <!-- Info -->
  <div class="card p-6 mt-6">
    <h3 class="font-medium text-gray-900 mb-3">How Vouchers Work</h3>
    <ul class="space-y-2 text-sm text-gray-600">
      <li class="flex items-start gap-2">
        <span class="text-purple-500">•</span>
        <span>Organization admins can redeem voucher codes from their Billing page to add funds to their balance.</span>
      </li>
      <li class="flex items-start gap-2">
        <span class="text-purple-500">•</span>
        <span>Each organization can only redeem each voucher code once.</span>
      </li>
      <li class="flex items-start gap-2">
        <span class="text-purple-500">•</span>
        <span>Set a max uses limit to control how many organizations can redeem a voucher.</span>
      </li>
      <li class="flex items-start gap-2">
        <span class="text-purple-500">•</span>
        <span>Disabled vouchers cannot be redeemed, even if they haven't reached their max uses.</span>
      </li>
    </ul>
  </div>
</div>
