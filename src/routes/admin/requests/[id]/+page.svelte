<script lang="ts">
  import { enhance } from '$app/forms';
  import { ArrowLeft, Building2, Mail, Phone, MapPin, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let showRejectModal = $state(false);
  let rejectReason = $state('');
  let monthlyUserFee = $state('5.00');
</script>

<div class="max-w-3xl mx-auto">
  <div class="mb-6">
    <a href="/admin/requests" class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
      <ArrowLeft class="w-4 h-4" />
      Back to Requests
    </a>

    <div class="flex items-start justify-between">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
          <Building2 class="w-7 h-7 text-blue-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{data.request.organizationName}</h1>
          <div class="flex items-center gap-2 mt-1">
            {#if data.request.status === 'PENDING'}
              <span class="badge badge-yellow">
                <Clock class="w-3 h-3" />
                Pending Review
              </span>
            {:else if data.request.status === 'APPROVED'}
              <span class="badge badge-green">
                <CheckCircle class="w-3 h-3" />
                Approved
              </span>
            {:else}
              <span class="badge badge-red">
                <XCircle class="w-3 h-3" />
                Rejected
              </span>
            {/if}
            <span class="text-sm text-gray-500">
              Submitted {new Date(data.request.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  {#if form?.error}
    <div class="alert alert-error mb-6">{form.error}</div>
  {/if}

  <div class="card p-6 mb-6">
    <h2 class="font-semibold text-gray-900 mb-4">Organization Details</h2>
    <div class="grid md:grid-cols-2 gap-4">
      <div>
        <div class="text-sm text-gray-500">Organization Name</div>
        <div class="font-medium text-gray-900">{data.request.organizationName}</div>
      </div>
      <div>
        <div class="text-sm text-gray-500">Type</div>
        <div class="font-medium text-gray-900">{data.request.organizationType}</div>
      </div>
    </div>
  </div>

  <div class="card p-6 mb-6">
    <h2 class="font-semibold text-gray-900 mb-4">Contact Information</h2>
    <div class="space-y-3">
      <div class="flex items-center gap-3">
        <Mail class="w-5 h-5 text-gray-400" />
        <div>
          <div class="font-medium text-gray-900">{data.request.contactName}</div>
          <div class="text-sm text-gray-500">{data.request.contactEmail}</div>
        </div>
      </div>
      {#if data.request.contactPhone}
        <div class="flex items-center gap-3">
          <Phone class="w-5 h-5 text-gray-400" />
          <div class="text-gray-900">{data.request.contactPhone}</div>
        </div>
      {/if}
      {#if data.request.address || data.request.city}
        <div class="flex items-center gap-3">
          <MapPin class="w-5 h-5 text-gray-400" />
          <div class="text-gray-900">
            {data.request.address || ''} {data.request.city || ''}, {data.request.state || ''} {data.request.zipCode || ''}
          </div>
        </div>
      {/if}
    </div>
  </div>

  {#if data.request.message}
    <div class="card p-6 mb-6">
      <h2 class="font-semibold text-gray-900 mb-4">Additional Message</h2>
      <p class="text-gray-600 whitespace-pre-wrap">{data.request.message}</p>
    </div>
  {/if}

  {#if data.request.status === 'REJECTED' && data.request.rejectionReason}
    <div class="card p-6 mb-6 bg-red-50 border-red-200">
      <h2 class="font-semibold text-red-800 mb-2">Rejection Reason</h2>
      <p class="text-red-700">{data.request.rejectionReason}</p>
    </div>
  {/if}

  {#if data.request.status === 'PENDING'}
    <!-- Monthly Fee Setting -->
    <div class="card p-6 mb-6">
      <h2 class="font-semibold text-gray-900 mb-4">Billing Settings</h2>
      <div>
        <label for="monthlyUserFee" class="label">Monthly Fee per Student</label>
        <div class="relative max-w-xs">
          <DollarSign class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="number"
            id="monthlyUserFee"
            bind:value={monthlyUserFee}
            step="0.01"
            min="0"
            class="input pl-10"
            placeholder="5.00"
          />
        </div>
        <p class="text-sm text-gray-500 mt-1">This fee will be charged per student per month. Default: $5.00</p>
      </div>
    </div>

    <div class="flex gap-4">
      <form method="POST" action="?/approve" use:enhance class="flex-1">
        <input type="hidden" name="monthlyUserFee" value={monthlyUserFee} />
        <button type="submit" class="btn btn-primary w-full">
          <CheckCircle class="w-4 h-4" />
          Approve Request
        </button>
      </form>
      <button onclick={() => showRejectModal = true} class="btn btn-secondary flex-1 text-red-600 border-red-200 hover:bg-red-50">
        <XCircle class="w-4 h-4" />
        Reject Request
      </button>
    </div>
  {/if}
</div>

<!-- Reject Modal -->
{#if showRejectModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={() => showRejectModal = false}>
    <div class="card p-6 max-w-md w-full mx-4" onclick={(e) => e.stopPropagation()}>
      <h3 class="font-semibold text-gray-900 mb-4">Reject Request</h3>
      <form method="POST" action="?/reject" use:enhance>
        <div class="form-group">
          <label for="reason" class="label">Reason for rejection (optional)</label>
          <textarea
            id="reason"
            name="reason"
            rows="3"
            bind:value={rejectReason}
            class="input"
            placeholder="Explain why this request is being rejected..."
          ></textarea>
        </div>
        <div class="flex gap-3">
          <button type="button" onclick={() => showRejectModal = false} class="btn btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary flex-1 bg-red-600 hover:bg-red-700">
            Reject
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
