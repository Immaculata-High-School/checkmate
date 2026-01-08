<script lang="ts">
  import { enhance } from '$app/forms';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import {
    ArrowLeft,
    ArrowRight,
    FileText,
    Users,
    Clock,
    CheckCircle,
    Edit,
    Trash2,
    Copy,
    Eye,
    EyeOff,
    Plus,
    AlertCircle,
    Printer,
    BookOpen,
    Loader2,
    Sparkles,
    Check,
    X,
    Download,
    FileDown,
    Settings,
    PartyPopper,
    ClipboardList,
    MessageSquare
  } from 'lucide-svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let showDeleteConfirm = $state(false);
  let showPreview = $state(false);
  let showPrintOptions = $state(false);
  let showStudyGuidePrompt = $state(false);
  let selectedClassId = $state('');
  let generatingPdf = $state(false);
  let hasShownCreatedPrompt = $state(false);

  // Show study guide prompt when test is just created (only once)
  $effect(() => {
    if (browser && !hasShownCreatedPrompt && $page.url.searchParams.get('created') === 'true') {
      hasShownCreatedPrompt = true;
      showStudyGuidePrompt = true;
      // Remove the query param from URL without navigation
      const newUrl = new URL($page.url);
      newUrl.searchParams.delete('created');
      window.history.replaceState({}, '', newUrl.pathname);
    }
  });

  // Print options
  let includeAnswerKey = $state(false);
  let includeNameField = $state(true);
  let includeDateField = $state(true);
  let includePeriodField = $state(true);
  let includeInstructions = $state(true);

  function copyCode() {
    navigator.clipboard.writeText(data.test.accessCode || '');
  }

  const totalPoints = $derived(data.test.questions.reduce((sum, q) => sum + q.points, 0));

  const gradedSubmissions = $derived(data.test.submissions.filter((s) => s.status === 'GRADED'));

  const averageScore = $derived(
    gradedSubmissions.length > 0
      ? Math.round(
          gradedSubmissions.reduce(
            (sum, s) => sum + (Math.min((s.score || 0) + (s.bonusPoints || 0), s.totalPoints || 1) / (s.totalPoints || 1)) * 100,
            0
          ) / gradedSubmissions.length
        )
      : null
  );

  function getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  async function generateTestPdf() {
    if (!browser) return;
    generatingPdf = true;

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'letter' });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 50;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      // Helper to add new page if needed
      const checkPageBreak = (height: number) => {
        if (y + height > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      };

      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      const title = data.test.title;
      doc.text(title, pageWidth / 2, y, { align: 'center' });
      y += 25;

      // Description
      if (data.test.description) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(data.test.description, pageWidth / 2, y, { align: 'center' });
        y += 20;
      }

      // Meta info
      doc.setFontSize(10);
      doc.setTextColor(100);
      const meta = `${data.test.questions.length} Questions • ${totalPoints} Points${data.test.timeLimit ? ` • ${data.test.timeLimit} Minutes` : ''}`;
      doc.text(meta, pageWidth / 2, y, { align: 'center' });
      doc.setTextColor(0);
      y += 15;

      // Line under header
      doc.setLineWidth(1);
      doc.line(margin, y, pageWidth - margin, y);
      y += 25;

      // Student info fields
      if (includeNameField || includeDateField || includePeriodField) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        let fieldX = margin;

        if (includeNameField) {
          doc.text('Name:', fieldX, y);
          doc.line(fieldX + 35, y, fieldX + 180, y);
          fieldX += 200;
        }
        if (includeDateField) {
          doc.text('Date:', fieldX, y);
          doc.line(fieldX + 30, y, fieldX + 130, y);
          fieldX += 150;
        }
        if (includePeriodField) {
          doc.text('Period:', fieldX, y);
          doc.line(fieldX + 40, y, fieldX + 90, y);
        }
        y += 30;
      }

      // Instructions
      if (includeInstructions) {
        doc.setFillColor(255, 255, 240);
        doc.rect(margin, y - 5, contentWidth, 40, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Instructions:', margin + 10, y + 10);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const instructions = 'Read each question carefully. For multiple choice, circle your answer. For short answer, write your response on the lines provided.';
        const instrLines = doc.splitTextToSize(instructions, contentWidth - 20);
        doc.text(instrLines, margin + 10, y + 22);
        y += 50;
      }

      // Questions
      doc.setFont('helvetica', 'normal');
      data.test.questions.forEach((question, index) => {
        checkPageBreak(100);

        // Question number and points
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}.`, margin, y);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(`(${question.points} pts)`, pageWidth - margin - 40, y);
        doc.setTextColor(0);

        // Question text
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const questionLines = doc.splitTextToSize(question.question, contentWidth - 30);
        doc.text(questionLines, margin + 20, y);
        y += questionLines.length * 14 + 10;

        // Options based on question type
        if (question.type === 'MULTIPLE_CHOICE' && question.options) {
          (question.options as string[]).forEach((option: string, optIndex: number) => {
            checkPageBreak(20);
            const letter = String.fromCharCode(65 + optIndex);
            // Draw circle
            doc.circle(margin + 30, y - 3, 5);
            doc.setFontSize(10);
            doc.text(`${letter}.`, margin + 40, y);
            const optLines = doc.splitTextToSize(option, contentWidth - 70);
            doc.text(optLines, margin + 55, y);
            y += optLines.length * 12 + 6;
          });
        } else if (question.type === 'TRUE_FALSE') {
          checkPageBreak(20);
          doc.circle(margin + 30, y - 3, 5);
          doc.text('True', margin + 45, y);
          doc.circle(margin + 100, y - 3, 5);
          doc.text('False', margin + 115, y);
          y += 20;
        } else {
          // Short answer / essay lines
          const numLines = question.type === 'ESSAY' ? 5 : 2;
          for (let i = 0; i < numLines; i++) {
            checkPageBreak(20);
            doc.setDrawColor(200);
            doc.line(margin + 20, y, pageWidth - margin, y);
            doc.setDrawColor(0);
            y += 20;
          }
        }

        y += 15;
      });

      // Answer key on new page
      if (includeAnswerKey) {
        doc.addPage();
        y = margin;

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Answer Key', pageWidth / 2, y, { align: 'center' });
        y += 30;
        doc.line(margin, y - 10, pageWidth - margin, y - 10);

        doc.setFontSize(11);
        const colWidth = contentWidth / 3;
        let col = 0;

        data.test.questions.forEach((question, index) => {
          const x = margin + col * colWidth;
          if (y > pageHeight - margin) {
            doc.addPage();
            y = margin + 20;
          }

          doc.setFont('helvetica', 'bold');
          doc.text(`${index + 1}.`, x, y);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 128, 0);
          const answerText = doc.splitTextToSize(question.correctAnswer || '', colWidth - 30);
          doc.text(answerText[0] || '', x + 20, y);
          doc.setTextColor(0);

          col++;
          if (col >= 3) {
            col = 0;
            y += 18;
          }
        });
      }

      // Open PDF in new tab
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');

      showPrintOptions = false;
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      generatingPdf = false;
    }
  }

</script>

<svelte:head>
  <title>{data.test.title} | Teacher Dashboard</title>
</svelte:head>

<div class="max-w-6xl mx-auto">
  <!-- Header -->
  <div class="mb-6">
    <a
      href="/teacher/tests"
      class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
    >
      <ArrowLeft class="w-4 h-4" />
      Back to Tests
    </a>

    <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
      <div>
        <div class="flex items-center gap-3 mb-2">
          <h1 class="text-2xl font-bold text-gray-900">{data.test.title}</h1>
          <span class="badge {data.test.status === 'PUBLISHED' ? 'badge-green' : 'badge-gray'}">
            {data.test.status === 'PUBLISHED' ? 'Published' : 'Draft'}
          </span>
        </div>
        {#if data.test.description}
          <p class="text-gray-600">{data.test.description}</p>
        {/if}
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <a href="/teacher/tests/{data.test.id}/submissions" class="btn btn-secondary">
          <ClipboardList class="w-4 h-4" />
          Submissions
          {#if data.test.submissions.length > 0}
            <span class="ml-1 px-1.5 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded-full">
              {data.test.submissions.length}
            </span>
          {/if}
        </a>

        <a href="/teacher/tests/{data.test.id}/settings" class="btn btn-secondary">
          <Settings class="w-4 h-4" />
          Settings
        </a>

        <button onclick={() => (showPrintOptions = true)} class="btn btn-secondary">
          <FileDown class="w-4 h-4" />
          Export PDF
        </button>

        <button onclick={() => (showPreview = true)} class="btn btn-secondary">
          <Eye class="w-4 h-4" />
          Preview
        </button>

        {#if data.test.status === 'DRAFT'}
          <form method="POST" action="?/publish" use:enhance>
            <button type="submit" class="btn btn-primary"> Publish </button>
          </form>
        {:else}
          <form method="POST" action="?/unpublish" use:enhance>
            <button type="submit" class="btn btn-secondary">
              <EyeOff class="w-4 h-4" />
              Unpublish
            </button>
          </form>
        {/if}

        <a href="/teacher/tests/{data.test.id}/edit" class="btn btn-secondary">
          <Edit class="w-4 h-4" />
        </a>

        <button onclick={() => (showDeleteConfirm = true)} class="btn btn-ghost text-red-600">
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <div class="stat-card">
      <div class="stat-value">{data.test.questions.length}</div>
      <div class="stat-label">Questions</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{totalPoints}</div>
      <div class="stat-label">Total Points</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{data.test.submissions.length}</div>
      <div class="stat-label">Submissions</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{averageScore !== null ? `${averageScore}%` : '-'}</div>
      <div class="stat-label">Avg Score</div>
    </div>
  </div>

  <!-- Access Code -->
  {#if data.test.accessCode}
    <div class="card p-4 mb-6">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm text-gray-500 mb-1">Access Code</div>
          <div class="text-2xl font-mono font-bold text-gray-900">{data.test.accessCode}</div>
        </div>
        <button onclick={copyCode} class="btn btn-secondary">
          <Copy class="w-4 h-4" />
          Copy Code
        </button>
      </div>
    </div>
  {/if}

  <div class="grid lg:grid-cols-3 gap-6">
    <!-- Questions -->
    <div class="lg:col-span-2 space-y-6">
      <div class="card">
        <div class="px-4 py-3 border-b border-gray-200">
          <h2 class="font-semibold text-gray-900">Questions</h2>
        </div>

        <div class="p-4 space-y-4">
          {#each data.test.questions as question, index}
            <div class="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <div class="flex items-start justify-between gap-4 mb-2">
                <span class="text-sm font-medium text-gray-500">Question {index + 1}</span>
                <div class="flex items-center gap-2">
                  <span class="badge badge-primary">{question.type.replace('_', ' ')}</span>
                  <span class="text-sm text-gray-500">{question.points} pts</span>
                </div>
              </div>
              <p class="font-medium text-gray-900 mb-3">{question.question}</p>

              {#if question.options && Array.isArray(question.options) && question.options.length > 0}
                <div class="space-y-2">
                  {#each (question.options as string[]) as option, optIndex}
                    <div class="flex items-center gap-2">
                      <span
                        class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-gray-200 text-gray-600"
                      >
                        {getOptionLetter(optIndex)}
                      </span>
                      <span class="text-gray-600">{option}</span>
                    </div>
                  {/each}
                </div>
              {/if}

              <div class="mt-3 pt-3 border-t border-gray-200">
                <span class="text-xs text-gray-500">Answer: </span>
                <span class="text-xs font-medium text-green-600">{question.correctAnswer}</span>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Study Guide Link -->
      <a href="/teacher/study-guides/create?testId={data.test.id}" class="card p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
        <div class="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center">
          <BookOpen class="w-7 h-7 text-amber-600" />
        </div>
        <div class="flex-1">
          <h3 class="font-semibold text-gray-900">Create Study Guide</h3>
          <p class="text-sm text-gray-500">Generate a study guide based on this test's questions</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="badge badge-amber">Create</span>
          <ArrowRight class="w-5 h-5 text-gray-400" />
        </div>
      </a>
    </div>

    <!-- Sidebar -->
    <div class="space-y-6">
      <!-- Assign to Class -->
      <div class="card">
        <div class="px-4 py-3 border-b border-gray-200">
          <h3 class="font-semibold text-gray-900">Assign to Class</h3>
        </div>
        <div class="p-4">
          {#if data.test.classes.length > 0}
            <div class="mb-4">
              <div class="text-sm text-gray-500 mb-2">Assigned Classes</div>
              <div class="space-y-2">
                {#each data.test.classes as { class: cls }}
                  <div class="flex items-center gap-2 text-sm">
                    <Users class="w-4 h-4 text-gray-400" />
                    <span>{cls.name}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <form method="POST" action="?/assignClass" use:enhance class="space-y-3">
            <select name="classId" bind:value={selectedClassId} class="input">
              <option value="">Select a class...</option>
              {#each data.availableClasses as cls}
                <option value={cls.id}>{cls.name}</option>
              {/each}
            </select>
            <button type="submit" disabled={!selectedClassId} class="btn btn-primary w-full">
              <Plus class="w-4 h-4" />
              Assign
            </button>
          </form>
        </div>
      </div>

      <!-- Recent Submissions -->
      <div class="card">
        <div class="px-4 py-3 border-b border-gray-200">
          <h3 class="font-semibold text-gray-900">Recent Submissions</h3>
        </div>
        <div class="p-4">
          {#if data.test.submissions.length === 0}
            <p class="text-sm text-gray-500 text-center py-4">No submissions yet</p>
          {:else}
            <div class="space-y-3">
              {#each data.test.submissions.slice(0, 5) as submission}
                <div class="flex items-center justify-between">
                  <div>
                    <div class="font-medium text-gray-900 text-sm">{submission.student.name}</div>
                    <div class="text-xs text-gray-500">
                      {submission.submittedAt
                        ? new Date(submission.submittedAt).toLocaleDateString()
                        : 'In progress'}
                    </div>
                  </div>
                  {#if submission.status === 'GRADED'}
                    {@const totalScore = (submission.score || 0) + (submission.bonusPoints || 0)}
                    <span class="badge badge-green">
                      {Math.round(Math.min(100, (totalScore / (submission.totalPoints || 1)) * 100))}%
                    </span>
                  {:else if submission.status === 'SUBMITTED'}
                    <span class="badge badge-yellow">Pending</span>
                  {:else}
                    <span class="badge badge-gray">In Progress</span>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Print Test Options Modal -->
{#if showPrintOptions}
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    onclick={(e) => e.target === e.currentTarget && (showPrintOptions = false)}
    onkeydown={(e) => e.key === 'Escape' && (showPrintOptions = false)}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="card p-6 max-w-md mx-4 w-full">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
          <FileDown class="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 class="font-semibold text-gray-900">Export Test PDF</h3>
          <p class="text-sm text-gray-500">Configure your test printout</p>
        </div>
      </div>

      <div class="space-y-4 mb-6">
        <div class="font-medium text-sm text-gray-700">Student Information Fields</div>
        <label class="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" bind:checked={includeNameField} class="w-4 h-4 rounded text-indigo-600" />
          <span class="text-sm">Include Name field</span>
        </label>
        <label class="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" bind:checked={includeDateField} class="w-4 h-4 rounded text-indigo-600" />
          <span class="text-sm">Include Date field</span>
        </label>
        <label class="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" bind:checked={includePeriodField} class="w-4 h-4 rounded text-indigo-600" />
          <span class="text-sm">Include Period/Class field</span>
        </label>

        <hr class="border-gray-200" />

        <div class="font-medium text-sm text-gray-700">Content Options</div>
        <label class="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" bind:checked={includeInstructions} class="w-4 h-4 rounded text-indigo-600" />
          <span class="text-sm">Include Instructions</span>
        </label>
        <label class="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" bind:checked={includeAnswerKey} class="w-4 h-4 rounded text-indigo-600" />
          <span class="text-sm">Include Answer Key (separate page)</span>
        </label>
      </div>

      <div class="flex gap-3">
        <button
          type="button"
          onclick={() => (showPrintOptions = false)}
          class="btn btn-secondary flex-1"
          disabled={generatingPdf}
        >
          Cancel
        </button>
        <button
          type="button"
          onclick={generateTestPdf}
          disabled={generatingPdf}
          class="btn btn-primary flex-1"
        >
          {#if generatingPdf}
            <Loader2 class="w-4 h-4 animate-spin" />
            Generating...
          {:else}
            <FileDown class="w-4 h-4" />
            Generate PDF
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Student Preview Modal -->
{#if showPreview}
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    onclick={(e) => e.target === e.currentTarget && (showPreview = false)}
    onkeydown={(e) => e.key === 'Escape' && (showPreview = false)}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto m-4">
      <div class="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
        <h2 class="text-lg font-semibold">Student Preview</h2>
        <button onclick={() => (showPreview = false)} class="btn btn-ghost">
          <X class="w-4 h-4" />
        </button>
      </div>
      <div class="p-6">
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-gray-900 mb-2">{data.test.title}</h1>
          {#if data.test.description}
            <p class="text-gray-600">{data.test.description}</p>
          {/if}
          <div class="mt-4 text-sm text-gray-500">
            {data.test.questions.length} questions · {totalPoints} points
          </div>
        </div>

        <div class="space-y-6">
          {#each data.test.questions as question, index}
            <div class="p-4 border rounded-lg">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-sm font-medium text-gray-500">Question {index + 1}</span>
                <span class="text-sm text-gray-400">({question.points} pts)</span>
              </div>
              <p class="font-medium text-gray-900 mb-4">{question.question}</p>

              {#if question.type === 'MULTIPLE_CHOICE' && question.options && Array.isArray(question.options)}
                <div class="space-y-2">
                  {#each (question.options as string[]) as option, optIndex}
                    <label
                      class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50"
                    >
                      <input type="radio" name="q-{index}" class="w-4 h-4" />
                      <span>{option}</span>
                    </label>
                  {/each}
                </div>
              {:else if question.type === 'TRUE_FALSE'}
                <div class="flex gap-4">
                  <label class="flex items-center gap-2">
                    <input type="radio" name="q-{index}" class="w-4 h-4" />
                    True
                  </label>
                  <label class="flex items-center gap-2">
                    <input type="radio" name="q-{index}" class="w-4 h-4" />
                    False
                  </label>
                </div>
              {:else if question.type === 'SHORT_ANSWER' || question.type === 'FILL_IN_BLANK'}
                <input type="text" class="input" placeholder="Your answer..." />
              {:else}
                <textarea class="input" rows="4" placeholder="Your answer..."></textarea>
              {/if}
            </div>
          {/each}
        </div>

        <div class="mt-8 text-center">
          <button class="btn btn-primary btn-lg" disabled>Submit Test</button>
          <p class="text-xs text-gray-400 mt-2">This is a preview only</p>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    onclick={(e) => e.target === e.currentTarget && (showDeleteConfirm = false)}
    onkeydown={(e) => e.key === 'Escape' && (showDeleteConfirm = false)}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="card p-6 max-w-md mx-4">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle class="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 class="font-semibold text-gray-900">Delete Test</h3>
          <p class="text-sm text-gray-500">This action cannot be undone</p>
        </div>
      </div>
      <p class="text-gray-600 mb-6">
        Are you sure you want to delete "{data.test.title}"? All questions and submissions will be
        permanently deleted.
      </p>
      <div class="flex gap-3">
        <button onclick={() => (showDeleteConfirm = false)} class="btn btn-secondary flex-1">
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

<!-- Test Created Prompt Modal -->
{#if showStudyGuidePrompt}
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    onclick={(e) => e.target === e.currentTarget && (showStudyGuidePrompt = false)}
    onkeydown={(e) => e.key === 'Escape' && (showStudyGuidePrompt = false)}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="card p-6 max-w-md mx-4 w-full">
      <div class="text-center mb-6">
        <div class="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <PartyPopper class="w-8 h-8 text-white" />
        </div>
        <h3 class="text-xl font-bold text-gray-900">Test Created!</h3>
        <p class="text-gray-500 mt-2">Your test "{data.test.title}" has been saved as a draft.</p>
      </div>

      <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <div class="flex items-start gap-3">
          <BookOpen class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p class="font-medium text-amber-900">Create a study guide?</p>
            <p class="text-sm text-amber-700 mt-1">
              Help students prepare with an AI-generated study guide based on your test questions.
            </p>
          </div>
        </div>
      </div>

      <div class="flex gap-3">
        <button
          type="button"
          onclick={() => (showStudyGuidePrompt = false)}
          class="btn btn-secondary flex-1"
        >
          Maybe Later
        </button>
        <a
          href="/teacher/study-guides/create?testId={data.test.id}"
          class="btn btn-primary flex-1 text-center"
        >
          <Sparkles class="w-4 h-4" />
          Create Study Guide
        </a>
      </div>
    </div>
  </div>
{/if}
