<script lang="ts">
  import { enhance } from '$app/forms';
  import { Building2, User, Mail, Phone, MapPin, CheckCircle } from 'lucide-svelte';
  import ChessKing from '$lib/components/ChessKing.svelte';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
  let loading = $state(false);
</script>

<div class="min-h-screen bg-gray-50 py-12 px-4">
  <div class="max-w-xl mx-auto">
    <!-- Header -->
    <div class="text-center mb-8">
      <a href="/" class="inline-flex items-center gap-2 mb-6">
        <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <ChessKing class="w-5 h-5 text-white" />
        </div>
        <span class="text-xl font-bold text-gray-900">Checkmate</span>
      </a>
      <h1 class="text-2xl font-bold text-gray-900">Request School Access</h1>
      <p class="text-gray-600 mt-2">Fill out this form and we'll set up your school account.</p>
    </div>

    {#if form?.success}
      <div class="card p-8 text-center">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle class="w-8 h-8 text-green-600" />
        </div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
        <p class="text-gray-600 mb-6">
          We've received your request. You'll receive an email at your provided address once your account is ready.
        </p>
        <a href="/" class="btn btn-primary">Back to Home</a>
      </div>
    {:else}
      <div class="card p-6">
        {#if form?.error}
          <div class="alert alert-error mb-6">
            {form.error}
          </div>
        {/if}

        <form
          method="POST"
          use:enhance={() => {
            loading = true;
            return async ({ update }) => {
              loading = false;
              await update();
            };
          }}
        >
          <!-- Organization Info -->
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
              Organization Information
            </h3>

            <div class="form-group">
              <label for="organizationName" class="label">School/Organization Name *</label>
              <input
                id="organizationName"
                name="organizationName"
                type="text"
                required
                value={form?.organizationName ?? ''}
                class="input"
                placeholder="Lincoln High School"
              />
            </div>

            <div class="form-group">
              <label for="organizationType" class="label">Organization Type</label>
              <select id="organizationType" name="organizationType" class="select">
                <option value="SCHOOL">K-12 School</option>
                <option value="DISTRICT">School District</option>
                <option value="UNIVERSITY">College/University</option>
                <option value="TUTORING_CENTER">Tutoring Center</option>
                <option value="CORPORATE">Corporate Training</option>
              </select>
            </div>
          </div>

          <!-- Contact Info -->
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
              Contact Information
            </h3>

            <div class="form-group">
              <label for="contactName" class="label">Your Name *</label>
              <input
                id="contactName"
                name="contactName"
                type="text"
                required
                value={form?.contactName ?? ''}
                class="input"
                placeholder="John Smith"
              />
            </div>

            <div class="form-group">
              <label for="contactEmail" class="label">Email Address *</label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                required
                value={form?.contactEmail ?? ''}
                class="input"
                placeholder="admin@school.edu"
              />
            </div>

            <div class="form-group">
              <label for="contactPhone" class="label">Phone Number</label>
              <input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                value={form?.contactPhone ?? ''}
                class="input"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <!-- Address -->
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
              Address (Optional)
            </h3>

            <div class="form-group">
              <label for="address" class="label">Street Address</label>
              <input
                id="address"
                name="address"
                type="text"
                value={form?.address ?? ''}
                class="input"
                placeholder="123 Main St"
              />
            </div>

            <div class="grid grid-cols-6 gap-4">
              <div class="col-span-3 form-group">
                <label for="city" class="label">City</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  value={form?.city ?? ''}
                  class="input"
                  placeholder="Springfield"
                />
              </div>
              <div class="col-span-1 form-group">
                <label for="state" class="label">State</label>
                <input
                  id="state"
                  name="state"
                  type="text"
                  maxlength="2"
                  value={form?.state ?? ''}
                  class="input"
                  placeholder="IL"
                />
              </div>
              <div class="col-span-2 form-group">
                <label for="zipCode" class="label">ZIP</label>
                <input
                  id="zipCode"
                  name="zipCode"
                  type="text"
                  maxlength="10"
                  value={form?.zipCode ?? ''}
                  class="input"
                  placeholder="62701"
                />
              </div>
            </div>
          </div>

          <!-- Message -->
          <div class="form-group">
            <label for="message" class="label">Additional Information</label>
            <textarea
              id="message"
              name="message"
              rows="3"
              class="textarea"
              placeholder="Anything else you'd like us to know?"
            >{form?.message ?? ''}</textarea>
          </div>

          <button type="submit" disabled={loading} class="btn btn-primary w-full">
            {#if loading}
              <span class="spinner"></span>
              Submitting...
            {:else}
              Submit Request
            {/if}
          </button>
        </form>

        <p class="text-center text-sm text-gray-600 mt-6">
          Already have an account?
          <a href="/login" class="text-blue-600 hover:underline">Sign in</a>
        </p>
      </div>
    {/if}
  </div>
</div>
