<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';
  import {
    Building2,
    Plus,
    Search,
    Users,
    GraduationCap,
    Mail,
    MoreVertical,
    Edit,
    Trash2,
    Power,
    X,
    Send,
    DollarSign,
    CreditCard,
    AlertTriangle,
    Check,
    Clock,
    Play
  } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showCreateModal = $state(false);
  let showDeleteConfirm = $state<string | null>(null);
  let showAddFundsModal = $state<{ id: string; name: string; balance: number } | null>(null);
  let showMonthlyFeeModal = $state<{ id: string; name: string; monthlyUserFee: number } | null>(null);
  let search = $state(data.filters.search);
  let typeFilter = $state(data.filters.type);
  let statusFilter = $state(data.filters.status);
  let openMenu = $state<string | null>(null);
  let addFundsAmount = $state('100');
  let addFundsDescription = $state('Admin credit');
  let monthlyFeeAmount = $state('5.00');
  let isRunningBilling = $state(false);
  let billingResult = $state<{ success: boolean; message: string; results?: any } | null>(null);

  const orgTypes = [
    { value: 'SCHOOL', label: 'School' },
    { value: 'DISTRICT', label: 'District' },
    { value: 'UNIVERSITY', label: 'University' },
    { value: 'TUTORING_CENTER', label: 'Tutoring Center' },
    { value: 'CORPORATE', label: 'Corporate' },
    { value: 'INDIVIDUAL', label: 'Individual' }
  ];

  function applyFilters() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (typeFilter) params.set('type', typeFilter);
    if (statusFilter) params.set('status', statusFilter);
    goto(`?${params.toString()}`);
  }

  function getTypeLabel(type: string) {
    return orgTypes.find(t => t.value === type)?.label || type;
  }

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  function openAddFunds(org: { id: string; name: string; balance: number }) {
    showAddFundsModal = org;
    addFundsAmount = '100';
    addFundsDescription = 'Admin credit';
    openMenu = null;
  }

  function openMonthlyFee(org: { id: string; name: string; monthlyUserFee: number }) {
    showMonthlyFeeModal = org;
    monthlyFeeAmount = org.monthlyUserFee.toFixed(2);
    openMenu = null;
  }

  async function runMonthlyBilling() {
    if (!confirm('This will charge all organizations their monthly user fees. Are you sure?')) {
      return;
    }
    
    isRunningBilling = true;
    billingResult = null;
    
    try {
      const response = await fetch('/api/billing/charge-monthly', {
        method: 'POST'
      });
      
      const result = await response.json();
      billingResult = result;
      
      if (result.success) {
        // Refresh the page data to show updated balances
        await invalidateAll();
      }
    } catch (error) {
      billingResult = { success: false, message: 'Failed to run billing' };
    } finally {
      isRunningBilling = false;
    }
  }
</script>

<div class="max-w-7xl mx-auto">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Organizations</h1>
      <p class="text-gray-500 mt-1">Manage all organizations on the platform</p>
    </div>
    <div class="flex gap-3">
      <button 
        onclick={runMonthlyBilling} 
        disabled={isRunningBilling}
        class="btn btn-secondary"
      >
        {#if isRunningBilling}
          <Clock class="w-5 h-5 animate-spin" />
          Running...
        {:else}
          <Play class="w-5 h-5" />
          Run Monthly Billing
        {/if}
      </button>
      <button onclick={() => (showCreateModal = true)} class="btn btn-primary">
        <Plus class="w-5 h-5" />
        Create Organization
      </button>
    </div>
  </div>

  <!-- Billing Result -->
  {#if billingResult}
    <div class="mb-6 p-4 rounded-lg {billingResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
      <div class="flex items-start gap-3">
        {#if billingResult.success}
          <Check class="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        {:else}
          <AlertTriangle class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        {/if}
        <div class="flex-1">
          <div class="font-medium {billingResult.success ? 'text-green-800' : 'text-red-800'}">
            {billingResult.message}
          </div>
          {#if billingResult.results}
            <div class="mt-2 text-sm {billingResult.success ? 'text-green-700' : 'text-red-700'}">
              <span>Charged: {billingResult.results.charged} orgs</span>
              <span class="mx-2">•</span>
              <span>User fees: {formatCurrency(billingResult.results.totalUserFees || 0)}</span>
              <span class="mx-2">•</span>
              <span>AI usage: {formatCurrency(billingResult.results.totalAiUsage || 0)}</span>
              <span class="mx-2">•</span>
              <span>Total: {formatCurrency(billingResult.results.totalAmount)}</span>
              {#if billingResult.results.skipped > 0}
                <span class="mx-2">•</span>
                <span class="text-yellow-600">{billingResult.results.skipped} orgs skipped (already billed recently)</span>
              {/if}
              {#if billingResult.results.disabled > 0}
                <span class="mx-2">•</span>
                <span class="text-red-600">{billingResult.results.disabled} orgs disabled (insufficient balance)</span>
              {/if}
            </div>
          {/if}
        </div>
        <button onclick={() => (billingResult = null)} class="p-1 hover:bg-gray-200 rounded">
          <X class="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>
  {/if}

  <!-- Filters -->
  <div class="card p-4 mb-6">
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1 relative">
        <Search class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search organizations..."
          bind:value={search}
          onkeydown={(e) => e.key === 'Enter' && applyFilters()}
          class="input pl-10"
        />
      </div>
      <select bind:value={typeFilter} onchange={applyFilters} class="input w-full sm:w-40">
        <option value="">All Types</option>
        {#each orgTypes as type}
          <option value={type.value}>{type.label}</option>
        {/each}
      </select>
      <select bind:value={statusFilter} onchange={applyFilters} class="input w-full sm:w-40">
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <button onclick={applyFilters} class="btn btn-secondary">
        Apply Filters
      </button>
    </div>
  </div>

  <!-- Organizations List -->
  <div class="card overflow-hidden">
    <table class="w-full">
      <thead class="bg-gray-50 border-b border-gray-200">
        <tr>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Organization</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">Type</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden lg:table-cell">Owner</th>
          <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase hidden sm:table-cell">Members</th>
          <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase hidden sm:table-cell">Balance</th>
          <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">Fee/User</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden lg:table-cell">Created</th>
          <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
          <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200">
        {#each data.organizations as org}
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Building2 class="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <a href="/admin/organizations/{org.id}" class="font-medium text-gray-900 hover:text-blue-600">
                    {org.name}
                  </a>
                  <div class="text-sm text-gray-500">{org.slug}</div>
                </div>
              </div>
            </td>
            <td class="px-4 py-4 hidden md:table-cell">
              <span class="badge badge-gray">{getTypeLabel(org.type)}</span>
            </td>
            <td class="px-4 py-4 hidden lg:table-cell">
              {#if org.members[0]}
                <div class="text-sm">
                  <div class="font-medium text-gray-900">{org.members[0].user.name}</div>
                  <div class="text-gray-500">{org.members[0].user.email}</div>
                </div>
              {:else}
                <span class="text-gray-400">No owner</span>
              {/if}
            </td>
            <td class="px-4 py-4 text-center hidden sm:table-cell">
              <div class="flex items-center justify-center gap-1">
                <Users class="w-4 h-4 text-gray-400" />
                <span class="text-gray-900">{org._count.members}</span>
              </div>
            </td>
            <td class="px-4 py-4 text-right hidden sm:table-cell">
              <div class="flex flex-col items-end">
                <span class="{org.balance <= 0 ? 'text-red-600 font-medium' : org.balance < 50 ? 'text-yellow-600' : 'text-gray-900'}">
                  {formatCurrency(org.balance)}
                </span>
                {#if !org.billingEnabled}
                  <span class="text-xs text-red-500">Disabled</span>
                {/if}
              </div>
            </td>
            <td class="px-4 py-4 text-right hidden md:table-cell">
              <span class="text-gray-900">{formatCurrency(org.monthlyUserFee)}</span>
              <span class="text-xs text-gray-500">/mo</span>
            </td>
            <td class="px-4 py-4 text-sm text-gray-500 hidden lg:table-cell">
              {formatDate(org.createdAt)}
            </td>
            <td class="px-4 py-4 text-center">
              <span class="badge {org.isActive ? 'badge-green' : 'badge-red'}">
                {org.isActive ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td class="px-4 py-4 text-right">
              <div class="relative">
                <button
                  onclick={() => (openMenu = openMenu === org.id ? null : org.id)}
                  class="p-1 hover:bg-gray-100 rounded"
                >
                  <MoreVertical class="w-5 h-5 text-gray-400" />
                </button>
                {#if openMenu === org.id}
                  <div class="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    <a href="/admin/organizations/{org.id}" class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <Edit class="w-4 h-4" />
                      Edit
                    </a>
                    <button
                      onclick={() => openAddFunds({ id: org.id, name: org.name, balance: org.balance })}
                      class="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-gray-100"
                    >
                      <DollarSign class="w-4 h-4" />
                      Add Funds
                    </button>
                    <button
                      onclick={() => openMonthlyFee({ id: org.id, name: org.name, monthlyUserFee: org.monthlyUserFee })}
                      class="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-gray-100"
                    >
                      <CreditCard class="w-4 h-4" />
                      Set Monthly Fee
                    </button>
                    <form method="POST" action="?/toggleBilling" use:enhance={() => {
                      openMenu = null;
                      return async ({ update }) => { await update(); };
                    }}>
                      <input type="hidden" name="id" value={org.id} />
                      <button type="submit" class="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <CreditCard class="w-4 h-4" />
                        {org.billingEnabled ? 'Disable Billing' : 'Enable Billing'}
                      </button>
                    </form>
                    <form method="POST" action="?/toggleActive" use:enhance={() => {
                      openMenu = null;
                      return async ({ update }) => { await update(); };
                    }}>
                      <input type="hidden" name="id" value={org.id} />
                      <button type="submit" class="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <Power class="w-4 h-4" />
                        {org.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </form>
                    <button
                      onclick={() => { showDeleteConfirm = org.id; openMenu = null; }}
                      class="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      <Trash2 class="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                {/if}
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="9" class="px-4 py-8 text-center text-gray-500">
              No organizations found
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<!-- Create Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Create Organization</h2>
        <button onclick={() => (showCreateModal = false)} class="p-1 hover:bg-gray-100 rounded">
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>
      <form method="POST" action="?/create" use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === 'success') {
            showCreateModal = false;
            await invalidateAll();
          }
          await update();
        };
      }}>
        <div class="p-6 space-y-4">
          {#if form?.error}
            <div class="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{form.error}</div>
          {/if}

          <div>
            <label for="name" class="label">Organization Name</label>
            <input type="text" id="name" name="name" required class="input" placeholder="Acme School District" />
          </div>

          <div>
            <label for="type" class="label">Organization Type</label>
            <select id="type" name="type" required class="input">
              {#each orgTypes as type}
                <option value={type.value}>{type.label}</option>
              {/each}
            </select>
          </div>

          <div class="p-3 bg-green-50 rounded-lg">
            <div class="text-sm font-medium text-green-700">Full Access Plan</div>
            <div class="text-xs text-green-600">All features unlocked - No restrictions</div>
          </div>

          <div>
            <label for="monthlyUserFee" class="label">Monthly Fee per User</label>
            <div class="relative">
              <DollarSign class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="number" 
                id="monthlyUserFee" 
                name="monthlyUserFee" 
                step="0.01" 
                min="0" 
                value="5.00" 
                required 
                class="input pl-10" 
                placeholder="5.00" 
              />
            </div>
            <p class="text-xs text-gray-500 mt-1">Charged per student per month. Default: $5.00</p>
          </div>

          <hr class="my-4" />

          <h3 class="font-medium text-gray-900">Organization Owner</h3>
          <p class="text-sm text-gray-500 mb-3">The owner will receive an email with login credentials.</p>

          <div>
            <label for="ownerName" class="label">Owner Name</label>
            <input type="text" id="ownerName" name="ownerName" required class="input" placeholder="John Smith" />
          </div>

          <div>
            <label for="ownerEmail" class="label">Owner Email</label>
            <input type="email" id="ownerEmail" name="ownerEmail" required class="input" placeholder="john@school.edu" />
          </div>
        </div>
        <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button type="button" onclick={() => (showCreateModal = false)} class="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary">
            <Send class="w-4 h-4" />
            Create & Send Invite
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Delete Confirmation -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
      <div class="p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-2">Delete Organization?</h2>
        <p class="text-gray-500">This action cannot be undone. All data associated with this organization will be permanently deleted.</p>
      </div>
      <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
        <button onclick={() => (showDeleteConfirm = null)} class="btn btn-secondary">Cancel</button>
        <form method="POST" action="?/delete" use:enhance={() => {
          return async ({ update }) => {
            showDeleteConfirm = null;
            await update();
          };
        }}>
          <input type="hidden" name="id" value={showDeleteConfirm} />
          <button type="submit" class="btn btn-danger">Delete</button>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- Add Funds Modal -->
{#if showAddFundsModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Add Funds</h2>
        <button onclick={() => (showAddFundsModal = null)} class="p-1 hover:bg-gray-100 rounded">
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>
      <form method="POST" action="?/addBalance" use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === 'success') {
            showAddFundsModal = null;
            await invalidateAll();
          }
          await update();
        };
      }}>
        <div class="p-6 space-y-4">
          {#if form?.error}
            <div class="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle class="w-4 h-4" />
              {form.error}
            </div>
          {/if}

          {#if form?.balanceAdded}
            <div class="p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center gap-2">
              <Check class="w-4 h-4" />
              Successfully added {formatCurrency(form.amount)} to {showAddFundsModal.name}. New balance: {formatCurrency(form.newBalance)}
            </div>
          {/if}

          <div class="p-4 bg-gray-50 rounded-lg">
            <div class="font-medium text-gray-900">{showAddFundsModal.name}</div>
            <div class="text-sm text-gray-500">
              Current Balance: <span class="{showAddFundsModal.balance <= 0 ? 'text-red-600' : 'text-green-600'} font-medium">{formatCurrency(showAddFundsModal.balance)}</span>
            </div>
          </div>

          <input type="hidden" name="id" value={showAddFundsModal.id} />

          <div>
            <label for="amount" class="label">Amount (USD)</label>
            <div class="relative">
              <DollarSign class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                id="amount"
                name="amount"
                bind:value={addFundsAmount}
                step="0.01"
                min="0.01"
                required
                class="input pl-10"
                placeholder="100.00"
              />
            </div>
          </div>

          <div>
            <label for="description" class="label">Description</label>
            <input
              type="text"
              id="description"
              name="description"
              bind:value={addFundsDescription}
              class="input"
              placeholder="Admin credit"
            />
          </div>

          <div class="flex gap-2">
            {#each [50, 100, 250, 500] as preset}
              <button
                type="button"
                onclick={() => (addFundsAmount = preset.toString())}
                class="flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-colors {addFundsAmount === preset.toString() ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-300 hover:bg-gray-50 text-gray-700'}"
              >
                ${preset}
              </button>
            {/each}
          </div>
        </div>
        <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button type="button" onclick={() => (showAddFundsModal = null)} class="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary">
            <DollarSign class="w-4 h-4" />
            Add {formatCurrency(parseFloat(addFundsAmount) || 0)}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Set Monthly Fee Modal -->
{#if showMonthlyFeeModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Set Monthly Fee</h2>
        <button onclick={() => (showMonthlyFeeModal = null)} class="p-1 hover:bg-gray-100 rounded">
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>
      <form method="POST" action="?/updateMonthlyFee" use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === 'success') {
            showMonthlyFeeModal = null;
            await invalidateAll();
          }
          await update();
        };
      }}>
        <div class="p-6 space-y-4">
          {#if form?.error}
            <div class="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle class="w-4 h-4" />
              {form.error}
            </div>
          {/if}

          {#if form?.feeUpdated}
            <div class="p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center gap-2">
              <Check class="w-4 h-4" />
              Monthly fee updated successfully!
            </div>
          {/if}

          <div class="p-4 bg-gray-50 rounded-lg">
            <div class="font-medium text-gray-900">{showMonthlyFeeModal.name}</div>
            <div class="text-sm text-gray-500">
              Current Fee: <span class="font-medium text-gray-900">{formatCurrency(showMonthlyFeeModal.monthlyUserFee)}/user/month</span>
            </div>
          </div>

          <input type="hidden" name="id" value={showMonthlyFeeModal.id} />

          <div>
            <label for="monthlyFee" class="label">Monthly Fee per User (USD)</label>
            <div class="relative">
              <DollarSign class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                id="monthlyFee"
                name="monthlyUserFee"
                bind:value={monthlyFeeAmount}
                step="0.01"
                min="0"
                required
                class="input pl-10"
                placeholder="5.00"
              />
            </div>
            <p class="text-xs text-gray-500 mt-1">This fee is charged per student per month</p>
          </div>

          <div class="flex gap-2">
            {#each [0, 3, 5, 10] as preset}
              <button
                type="button"
                onclick={() => (monthlyFeeAmount = preset.toFixed(2))}
                class="flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-colors {monthlyFeeAmount === preset.toFixed(2) ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-300 hover:bg-gray-50 text-gray-700'}"
              >
                {preset === 0 ? 'Free' : `$${preset}`}
              </button>
            {/each}
          </div>
        </div>
        <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button type="button" onclick={() => (showMonthlyFeeModal = null)} class="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary">
            <CreditCard class="w-4 h-4" />
            Update Fee
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}