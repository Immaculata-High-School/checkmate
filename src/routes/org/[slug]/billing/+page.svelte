<script lang="ts">
  import { enhance } from '$app/forms';
  import { 
    CreditCard, 
    Users, 
    Receipt, 
    Gift, 
    AlertTriangle,
    CheckCircle,
    TrendingDown,
    DollarSign,
    Calendar
  } from 'lucide-svelte';

  let { data, form } = $props();

  let voucherCode = $state('');
  let isRedeeming = $state(false);

  const monthlyProjectedCost = $derived(data.userCount * data.organization.monthlyUserFee);
  const balanceStatus = $derived(
    data.organization.balance <= 0 ? 'critical' :
    data.organization.balance < monthlyProjectedCost ? 'warning' : 'good'
  );

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getTransactionColor(type: string) {
    switch (type) {
      case 'CREDIT':
      case 'VOUCHER':
      case 'REFUND':
        return 'text-green-600';
      case 'USER_FEE':
      case 'AI_USAGE':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }

  function getTransactionIcon(type: string) {
    switch (type) {
      case 'CREDIT':
        return DollarSign;
      case 'VOUCHER':
        return Gift;
      case 'USER_FEE':
        return Users;
      case 'AI_USAGE':
        return TrendingDown;
      default:
        return Receipt;
    }
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900">Billing</h1>
    <p class="text-sm text-gray-500 mt-1">Manage your organization's billing and balance</p>
  </div>

  <!-- Balance Overview -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <!-- Current Balance -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div class="flex items-center gap-3 mb-4">
        <div class="p-2 rounded-lg {balanceStatus === 'critical' ? 'bg-red-100' : balanceStatus === 'warning' ? 'bg-yellow-100' : 'bg-green-100'}">
          <CreditCard class="w-5 h-5 {balanceStatus === 'critical' ? 'text-red-600' : balanceStatus === 'warning' ? 'text-yellow-600' : 'text-green-600'}" />
        </div>
        <span class="text-sm text-gray-500">Current Balance</span>
      </div>
      <div class="text-3xl font-bold {balanceStatus === 'critical' ? 'text-red-600' : balanceStatus === 'warning' ? 'text-yellow-600' : 'text-gray-900'}">
        {formatCurrency(data.organization.balance)}
      </div>
      {#if !data.organization.billingEnabled}
        <div class="flex items-center gap-2 mt-2 text-red-600 text-sm">
          <AlertTriangle class="w-4 h-4" />
          <span>Organization disabled</span>
        </div>
      {/if}
    </div>

    <!-- User Count -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div class="flex items-center gap-3 mb-4">
        <div class="p-2 rounded-lg bg-blue-100">
          <Users class="w-5 h-5 text-blue-600" />
        </div>
        <span class="text-sm text-gray-500">Total Users</span>
      </div>
      <div class="text-3xl font-bold text-gray-900">
        {data.userCount}
      </div>
      <div class="text-sm text-gray-500 mt-2">
        @ {formatCurrency(data.organization.monthlyUserFee)}/user/month
      </div>
    </div>

    <!-- Monthly Cost -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div class="flex items-center gap-3 mb-4">
        <div class="p-2 rounded-lg bg-purple-100">
          <Calendar class="w-5 h-5 text-purple-600" />
        </div>
        <span class="text-sm text-gray-500">Monthly Base Cost</span>
      </div>
      <div class="text-3xl font-bold text-gray-900">
        {formatCurrency(monthlyProjectedCost)}
      </div>
      <div class="text-sm text-gray-500 mt-2">
        + AI usage fees
      </div>
    </div>
  </div>

  <!-- Balance Warning -->
  {#if balanceStatus !== 'good'}
    <div class="{balanceStatus === 'critical' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'} border rounded-xl p-4">
      <div class="flex items-start gap-3">
        <AlertTriangle class="w-5 h-5 {balanceStatus === 'critical' ? 'text-red-600' : 'text-yellow-600'} flex-shrink-0 mt-0.5" />
        <div>
          <h3 class="font-medium {balanceStatus === 'critical' ? 'text-red-800' : 'text-yellow-800'}">
            {balanceStatus === 'critical' ? 'Balance Depleted' : 'Low Balance Warning'}
          </h3>
          <p class="text-sm {balanceStatus === 'critical' ? 'text-red-700' : 'text-yellow-700'} mt-1">
            {#if balanceStatus === 'critical'}
              Your organization's balance has run out. Access has been disabled for non-admin users. Please add funds to restore access.
            {:else}
              Your balance is lower than your projected monthly cost. Consider adding funds to avoid service interruption.
            {/if}
          </p>
        </div>
      </div>
    </div>
  {/if}

  <!-- Redeem Voucher -->
  <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
    <div class="flex items-center gap-3 mb-4">
      <Gift class="w-5 h-5 text-purple-600" />
      <h2 class="text-lg font-semibold text-gray-900">Redeem Voucher Code</h2>
    </div>

    {#if form?.success}
      <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div class="flex items-center gap-2 text-green-700">
          <CheckCircle class="w-5 h-5" />
          <span>Successfully added {formatCurrency(form.amount)} to your balance!</span>
        </div>
      </div>
    {/if}

    {#if form?.error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div class="flex items-center gap-2 text-red-700">
          <AlertTriangle class="w-5 h-5" />
          <span>{form.error}</span>
        </div>
      </div>
    {/if}

    <form 
      method="POST" 
      action="?/redeemVoucher"
      use:enhance={() => {
        isRedeeming = true;
        return async ({ update }) => {
          await update();
          isRedeeming = false;
          voucherCode = '';
        };
      }}
      class="flex gap-3"
    >
      <input
        type="text"
        name="code"
        bind:value={voucherCode}
        placeholder="Enter voucher code"
        class="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 uppercase"
      />
      <button
        type="submit"
        disabled={isRedeeming || !voucherCode.trim()}
        class="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRedeeming ? 'Redeeming...' : 'Redeem'}
      </button>
    </form>
    <p class="text-sm text-gray-500 mt-3">
      Enter a voucher code provided by your platform administrator to add funds to your organization's balance.
    </p>
  </div>

  <!-- Transaction History -->
  <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
    <div class="flex items-center gap-3 mb-4">
      <Receipt class="w-5 h-5 text-gray-500" />
      <h2 class="text-lg font-semibold text-gray-900">Transaction History</h2>
    </div>

    {#if data.transactions.length === 0}
      <div class="text-center py-8 text-gray-500">
        <Receipt class="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No transactions yet</p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="text-left text-sm text-gray-500 border-b border-gray-200">
              <th class="pb-3 font-medium">Date</th>
              <th class="pb-3 font-medium">Type</th>
              <th class="pb-3 font-medium">Description</th>
              <th class="pb-3 font-medium text-right">Amount</th>
              <th class="pb-3 font-medium text-right">Balance</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {#each data.transactions as transaction}
              {@const IconComponent = getTransactionIcon(transaction.type)}
              <tr class="text-sm">
                <td class="py-3 text-gray-500">
                  {formatDate(transaction.createdAt)}
                </td>
                <td class="py-3">
                  <div class="flex items-center gap-2">
                    <IconComponent class="w-4 h-4 {getTransactionColor(transaction.type)}" />
                    <span class="text-gray-700 capitalize">{transaction.type.toLowerCase().replace('_', ' ')}</span>
                  </div>
                </td>
                <td class="py-3 text-gray-700">
                  {transaction.description}
                </td>
                <td class="py-3 text-right font-medium {transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}">
                  {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                </td>
                <td class="py-3 text-right text-gray-500">
                  {formatCurrency(transaction.balance)}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  <!-- Info Section -->
  <div class="bg-gray-50 rounded-xl border border-gray-200 p-6">
    <h3 class="font-medium text-gray-900 mb-3">How Billing Works</h3>
    <ul class="space-y-2 text-sm text-gray-600">
      <li class="flex items-start gap-2">
        <span class="text-purple-500">•</span>
        <span>Base fee of <strong class="text-gray-900">{formatCurrency(data.organization.monthlyUserFee)}</strong> per user per month is charged at the beginning of each billing cycle.</span>
      </li>
      <li class="flex items-start gap-2">
        <span class="text-purple-500">•</span>
        <span>AI usage fees are deducted from your balance as AI / LLM features are used in your orginzation.</span>
      </li>
      <li class="flex items-start gap-2">
        <span class="text-purple-500">•</span>
        <span>When your balance reaches zero, AI features are disabled and non-admin access is restricted until funds are added.</span>
      </li>
      <li class="flex items-start gap-2">
        <span class="text-purple-500">•</span>
        <span>Contact your POC (Point Of Contact) for voucher codes or to arrange direct balance additions.</span>
      </li>
    </ul>
  </div>
</div>
