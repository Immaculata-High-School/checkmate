<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import {
    ArrowLeft,
    Users,
    FileText,
    Copy,
    Edit,
    Trash2,
    Archive,
    ArchiveRestore,
    UserMinus,
    AlertCircle,
    BookMarked,
    ClipboardList,
    Library,
    School,
    RefreshCw,
    CheckCircle,
    XCircle,
    Link2,
    Loader2,
    ExternalLink
  } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let showDeleteConfirm = $state(false);
  let editing = $state(false);
  let name = $state(data.class.name);
  let description = $state(data.class.description || '');
  
  // PowerSchool roster sync state
  let showRosterSyncModal = $state(false);
  let syncingRoster = $state(false);
  let rosterMappings = $state<Record<string, number>>({});
  
  // On-demand PowerSchool student loading
  let psStudents = $state<any[]>([]);
  let loadingPsStudents = $state(false);
  let psStudentsError = $state<string | null>(null);

  const hasAssignments = $derived(data.class.tests.length > 0 || data.class.assignments.length > 0);
  
  // Check if roster is synced
  const rosterSynced = $derived((data as any).rosterMappings?.length > 0);
  const psLinkedClass = $derived((data as any).powerSchool?.linkedClass);

  // Fetch PowerSchool students on demand when modal opens
  async function loadPsStudents() {
    if (psStudents.length > 0 || loadingPsStudents) return; // Already loaded or loading
    
    loadingPsStudents = true;
    psStudentsError = null;
    
    try {
      const response = await fetch(`/api/powerschool/students?classId=${data.class.id}`);
      const result = await response.json();
      
      if (result.error) {
        psStudentsError = result.error;
      } else {
        psStudents = result.students || [];
      }
    } catch (e) {
      psStudentsError = 'Failed to load PowerSchool students';
      console.error('Error loading PS students:', e);
    } finally {
      loadingPsStudents = false;
    }
  }

  // Open modal and fetch students
  async function openRosterSyncModal() {
    showRosterSyncModal = true;
    await loadPsStudents();
    
    // Initialize mappings from existing data after loading
    const existingMappings = (data as any).rosterMappings || [];
    const newMappings: Record<string, number> = {};
    
    for (const m of existingMappings) {
      newMappings[m.studentId] = m.psStudentId;
    }
    
    rosterMappings = newMappings;
  }

  // Auto-match function that can be called manually
  function autoMatchStudents() {
    const newMappings: Record<string, number> = { ...rosterMappings };
    const usedPsIds = new Set(Object.values(newMappings).filter(Boolean));
    
    for (const member of data.class.members) {
      if (!newMappings[member.user.id]) {
        // Try to find a match
        const studentName = member.user.name?.toLowerCase().trim() || '';
        const nameParts = studentName.split(/\s+/);
        
        const match = psStudents.find((ps: any) => {
          if (usedPsIds.has(ps.id)) return false; // Don't reuse already matched PS students
          
          const psName = ps.name?.toLowerCase().trim() || '';
          const psFirst = ps.first_name?.toLowerCase().trim() || '';
          const psLast = ps.last_name?.toLowerCase().trim() || '';
          const psFullName = `${psFirst} ${psLast}`.trim();
          
          // Exact match
          if (psName === studentName || psFullName === studentName) return true;
          
          // First + Last name match
          if (nameParts.length >= 2) {
            const first = nameParts[0];
            const last = nameParts[nameParts.length - 1];
            if ((psFirst === first && psLast === last) || 
                (psFirst === last && psLast === first)) return true;
          }
          
          // Partial match
          return psName.includes(studentName) || 
                 studentName.includes(psFirst) || 
                 studentName.includes(psLast) ||
                 psFullName.includes(studentName) ||
                 studentName.includes(psFullName);
        });
        
        if (match) {
          newMappings[member.user.id] = match.id;
          usedPsIds.add(match.id);
        }
      }
    }
    
    rosterMappings = newMappings;
  }

  function copyCode() {
    navigator.clipboard.writeText(data.class.joinCode || '');
  }
</script>

<div class="max-w-6xl mx-auto">
  <!-- Header -->
  <div class="mb-6">
    <a href="/teacher/classes" class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
      <ArrowLeft class="w-4 h-4" />
      Back to Classes
    </a>

    <div class="flex items-start justify-between">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
          <Users class="w-7 h-7 text-purple-600" />
        </div>
        <div>
          <div class="flex items-center gap-3 mb-1">
            <h1 class="text-2xl font-bold text-gray-900">{data.class.name}</h1>
            {#if data.class.archived}
              <span class="badge badge-gray">
                <Archive class="w-3 h-3" />
                Archived
              </span>
            {/if}
          </div>
          {#if data.class.description}
            <p class="text-gray-600">{data.class.description}</p>
          {/if}
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button onclick={() => editing = true} class="btn btn-secondary">
          <Edit class="w-4 h-4" />
          Edit
        </button>

        {#if data.class.archived}
          <form method="POST" action="?/unarchive" use:enhance>
            <button type="submit" class="btn btn-secondary">
              <ArchiveRestore class="w-4 h-4" />
              Restore
            </button>
          </form>
        {:else}
          <form method="POST" action="?/archive" use:enhance>
            <button type="submit" class="btn btn-secondary">
              <Archive class="w-4 h-4" />
              Archive
            </button>
          </form>
        {/if}

        <button onclick={() => showDeleteConfirm = true} class="btn btn-ghost text-red-600">
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>

  <!-- Join Code -->
  {#if data.class.joinCode}
    <div class="card p-4 mb-6">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm text-gray-500 mb-1">Class Join Code</div>
          <div class="text-3xl font-mono font-bold text-gray-900">{data.class.joinCode}</div>
          <p class="text-sm text-gray-500 mt-1">Share this code with students to join the class</p>
        </div>
        <button onclick={copyCode} class="btn btn-secondary">
          <Copy class="w-4 h-4" />
          Copy Code
        </button>
      </div>
    </div>
  {/if}

  <div class="grid lg:grid-cols-3 gap-6">
    <!-- Students -->
    <div class="lg:col-span-2">
      <div class="card">
        <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 class="font-semibold text-gray-900">Students ({data.class.members.length})</h2>
          
          {#if (data as any).powerSchool?.connected && psLinkedClass}
            <button 
              onclick={openRosterSyncModal}
              class="btn btn-sm {rosterSynced ? 'btn-secondary' : 'btn-primary bg-blue-600 hover:bg-blue-700'}"
            >
              <School class="w-4 h-4" />
              {rosterSynced ? 'Roster Synced' : 'Sync with PowerSchool'}
              {#if rosterSynced}
                <CheckCircle class="w-3 h-3 text-green-500" />
              {/if}
            </button>
          {:else if (data as any).powerSchool?.connected}
            <a href="/teacher/settings" class="btn btn-sm btn-secondary text-gray-500">
              <School class="w-4 h-4" />
              Link Class First
            </a>
          {:else if (data as any).powerSchool?.configured}
            <a href="/teacher/settings" class="btn btn-sm btn-secondary text-gray-500">
              <School class="w-4 h-4" />
              Connect PowerSchool
            </a>
          {/if}
        </div>

        {#if data.class.members.length === 0}
          <div class="p-8">
            <div class="empty-state">
              <Users class="empty-state-icon" />
              <div class="empty-state-title">No students yet</div>
              <div class="empty-state-text">
                Share the join code with students to add them to this class.
              </div>
            </div>
          </div>
        {:else}
          <div class="divide-y divide-gray-100">
            {#each data.class.members as member}
              <div class="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                <div class="flex items-center gap-3">
                  <div class="avatar avatar-sm">{member.user.name?.charAt(0) || '?'}</div>
                  <div>
                    <div class="font-medium text-gray-900">{member.user.name}</div>
                    <div class="text-sm text-gray-500">{member.user.email}</div>
                  </div>
                </div>
                <form method="POST" action="?/removeStudent" use:enhance>
                  <input type="hidden" name="studentId" value={member.user.id} />
                  <button type="submit" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                    <UserMinus class="w-4 h-4" />
                  </button>
                </form>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Assignments -->
    <div>
      <div class="card">
        <div class="px-4 py-3 border-b border-gray-200">
          <h3 class="font-semibold text-gray-900">Assignments</h3>
        </div>

        {#if !hasAssignments}
          <div class="p-6">
            <p class="text-sm text-gray-500 text-center">
              No assignments yet. Assign tests, worksheets, or study sets to this class.
            </p>
          </div>
        {:else}
          <div class="divide-y divide-gray-100">
            <!-- Tests -->
            {#each data.class.tests as { test }}
              <a href="/teacher/tests/{test.id}" class="block px-4 py-3 hover:bg-gray-50">
                <div class="flex items-center gap-3">
                  <FileText class="w-4 h-4 text-blue-500" />
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-gray-900 text-sm truncate">{test.title}</div>
                    <div class="text-xs text-gray-500">{test._count.questions} questions</div>
                  </div>
                  <span class="badge {test.status === 'PUBLISHED' ? 'badge-green' : 'badge-gray'} text-xs">
                    {test.status}
                  </span>
                </div>
              </a>
            {/each}

            <!-- Worksheets, Study Sets, and Study Guides -->
            {#each data.class.assignments as assignment}
              {#if assignment.worksheet}
                <a href="/teacher/worksheets/{assignment.worksheet.id}" class="block px-4 py-3 hover:bg-gray-50">
                  <div class="flex items-center gap-3">
                    <ClipboardList class="w-4 h-4 text-green-500" />
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-gray-900 text-sm truncate">{assignment.worksheet.title}</div>
                      <div class="text-xs text-gray-500">Worksheet</div>
                    </div>
                  </div>
                </a>
              {/if}
              {#if assignment.studySet}
                <a href="/teacher/study-sets/{assignment.studySet.id}" class="block px-4 py-3 hover:bg-gray-50">
                  <div class="flex items-center gap-3">
                    <Library class="w-4 h-4 text-purple-500" />
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-gray-900 text-sm truncate">{assignment.studySet.title}</div>
                      <div class="text-xs text-gray-500">Flashcard Set</div>
                    </div>
                  </div>
                </a>
              {/if}
              {#if assignment.studyGuide}
                <a href="/teacher/study-guides/{assignment.studyGuide.id}" class="block px-4 py-3 hover:bg-gray-50">
                  <div class="flex items-center gap-3">
                    <BookMarked class="w-4 h-4 text-amber-500" />
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-gray-900 text-sm truncate">{assignment.studyGuide.title}</div>
                      <div class="text-xs text-gray-500">Study Guide</div>
                    </div>
                  </div>
                </a>
              {/if}
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<!-- Edit Modal -->
{#if editing}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={() => editing = false}>
    <div class="card p-6 max-w-md w-full mx-4" onclick={(e) => e.stopPropagation()}>
      <h3 class="font-semibold text-gray-900 mb-4">Edit Class</h3>

      {#if form?.error}
        <div class="alert alert-error mb-4">{form.error}</div>
      {/if}

      <form method="POST" action="?/update" use:enhance class="space-y-4">
        <div class="form-group">
          <label for="edit-name" class="label">Class Name</label>
          <input
            id="edit-name"
            name="name"
            type="text"
            required
            bind:value={name}
            class="input"
          />
        </div>

        <div class="form-group">
          <label for="edit-description" class="label">Description</label>
          <textarea
            id="edit-description"
            name="description"
            rows="3"
            bind:value={description}
            class="input"
          ></textarea>
        </div>

        <div class="flex gap-3">
          <button type="button" onclick={() => editing = false} class="btn btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary flex-1">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Delete Confirmation -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={() => showDeleteConfirm = false}>
    <div class="card p-6 max-w-md mx-4" onclick={(e) => e.stopPropagation()}>
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle class="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 class="font-semibold text-gray-900">Delete Class</h3>
          <p class="text-sm text-gray-500">This action cannot be undone</p>
        </div>
      </div>
      <p class="text-gray-600 mb-6">
        Are you sure you want to delete "{data.class.name}"? All student data will be removed.
      </p>
      <div class="flex gap-3">
        <button onclick={() => showDeleteConfirm = false} class="btn btn-secondary flex-1">
          Cancel
        </button>
        <form method="POST" action="?/delete" use:enhance class="flex-1">
          <button type="submit" class="btn btn-primary w-full bg-red-600 hover:bg-red-700">
            Delete
          </button>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- PowerSchool Roster Sync Modal -->
{#if showRosterSyncModal}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <School class="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 class="font-semibold text-gray-900">Sync Roster with PowerSchool</h2>
            <p class="text-sm text-gray-500">Match Checkmate students to PowerSchool students</p>
          </div>
        </div>
        <button onclick={() => (showRosterSyncModal = false)} class="text-gray-400 hover:text-gray-600">
          <XCircle class="w-6 h-6" />
        </button>
      </div>
      
      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        {#if loadingPsStudents}
          <div class="text-center py-8">
            <Loader2 class="w-12 h-12 text-blue-500 mx-auto mb-3 animate-spin" />
            <p class="text-gray-500">Loading PowerSchool students...</p>
          </div>
        {:else if psStudentsError}
          <div class="text-center py-8">
            <AlertCircle class="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p class="text-red-600">{psStudentsError}</p>
            <button onclick={loadPsStudents} class="btn btn-secondary mt-4">
              <RefreshCw class="w-4 h-4" />
              Retry
            </button>
          </div>
        {:else if psStudents.length === 0}
          <div class="text-center py-8">
            <School class="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p class="text-gray-500">No students found in the linked PowerSchool class.</p>
            <p class="text-sm text-gray-400 mt-1">Make sure students are enrolled in PowerSchool.</p>
          </div>
        {:else if data.class.members.length === 0}
          <div class="text-center py-8">
            <Users class="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p class="text-gray-500">No students in this Checkmate class yet.</p>
            <p class="text-sm text-gray-400 mt-1">Share the join code to add students first.</p>
          </div>
        {:else}
          <div class="mb-4 flex items-center justify-between gap-4">
            <div class="flex-1 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p class="text-sm text-blue-700">
                <strong>Match each Checkmate student</strong> to their corresponding PowerSchool student. 
                This is required to sync grades to PowerSchool.
              </p>
            </div>
            <button 
              type="button"
              onclick={autoMatchStudents}
              class="btn btn-secondary whitespace-nowrap"
            >
              <RefreshCw class="w-4 h-4" />
              Auto-Match
            </button>
          </div>

          <div class="border rounded-lg overflow-hidden">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Checkmate Student</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Link</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PowerSchool Student</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                {#each data.class.members as member}
                  {@const isMatched = rosterMappings[member.user.id]}
                  <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-3">
                        <div class="avatar avatar-sm">{member.user.name?.charAt(0) || '?'}</div>
                        <div>
                          <div class="font-medium text-gray-900">{member.user.name}</div>
                          <div class="text-xs text-gray-500">{member.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-center">
                      {#if isMatched}
                        <Link2 class="w-5 h-5 text-green-500 mx-auto" />
                      {:else}
                        <div class="w-5 h-5 border-2 border-dashed border-gray-300 rounded mx-auto"></div>
                      {/if}
                    </td>
                    <td class="px-4 py-3">
                      <select
                        bind:value={rosterMappings[member.user.id]}
                        class="input w-full text-sm {isMatched ? 'border-green-300 bg-green-50' : ''}"
                      >
                        <option value="">-- Select PowerSchool student --</option>
                        {#each psStudents as psStudent}
                          <option value={psStudent.id}>
                            {psStudent.name} {psStudent.student_number ? `(#${psStudent.student_number})` : ''}
                          </option>
                        {/each}
                      </select>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          
          <!-- Summary -->
          <div class="mt-4 flex items-center justify-between text-sm">
            <div class="text-gray-500">
              {Object.keys(rosterMappings).filter(k => rosterMappings[k]).length} of {data.class.members.length} students matched
            </div>
            {#if Object.keys(rosterMappings).filter(k => rosterMappings[k]).length === data.class.members.length}
              <div class="text-green-600 flex items-center gap-1">
                <CheckCircle class="w-4 h-4" />
                All students matched!
              </div>
            {/if}
          </div>
        {/if}
      </div>
      
      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
        <button onclick={() => (showRosterSyncModal = false)} class="btn btn-secondary">
          Cancel
        </button>
        
        <form method="POST" action="?/syncRoster" use:enhance={() => {
          syncingRoster = true;
          return async ({ update }) => {
            syncingRoster = false;
            showRosterSyncModal = false;
            await update();
            await invalidateAll();
          };
        }}>
          <input type="hidden" name="mappings" value={JSON.stringify(
            Object.entries(rosterMappings)
              .filter(([_, psId]) => psId)
              .map(([studentId, psStudentId]) => {
                const psStudent = psStudents.find((s: any) => s.id === psStudentId);
                return {
                  studentId,
                  psStudentId,
                  psStudentName: psStudent?.name
                };
              })
          )} />
          
          <button 
            type="submit" 
            class="btn btn-primary"
            disabled={syncingRoster || Object.keys(rosterMappings).filter(k => rosterMappings[k]).length === 0}
          >
            {#if syncingRoster}
              <Loader2 class="w-4 h-4 animate-spin" />
              Saving...
            {:else}
              <CheckCircle class="w-4 h-4" />
              Save Roster Sync
            {/if}
          </button>
        </form>
      </div>
    </div>
  </div>
{/if}
