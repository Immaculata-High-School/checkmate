<script lang="ts">
  import { browser } from '$app/environment';
  import { ArrowLeft, BookOpen, Printer } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function printStudyGuide() {
    if (!browser) return;

    // Create a new window with print-friendly content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the study guide.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${data.studyGuide.title} - Study Guide</title>
        <style>
          @page {
            margin: 0.75in;
            size: letter;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            max-width: 8.5in;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 3px solid #3b82f6;
          }
          .header h1 {
            color: #1e40af;
            font-size: 24px;
            margin: 0 0 8px 0;
          }
          .header .meta {
            color: #6b7280;
            font-size: 14px;
          }
          .student-info {
            display: flex;
            gap: 32px;
            margin-bottom: 24px;
            font-size: 14px;
          }
          .student-info label {
            font-weight: 600;
          }
          .student-info .line {
            display: inline-block;
            width: 180px;
            border-bottom: 1px solid #000;
            margin-left: 8px;
          }
          .content {
            font-size: 14px;
          }
          .content h1, .content h2 {
            color: #1e40af;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 8px;
            margin-top: 24px;
          }
          .content h3 {
            color: #7c3aed;
            margin-top: 20px;
          }
          .content ul, .content ol {
            margin: 12px 0;
            padding-left: 24px;
          }
          .content li {
            margin: 8px 0;
          }
          .content p {
            margin: 12px 0;
          }
          /* Style the colored boxes for print */
          .content div[style*="background"] {
            padding: 12px 16px;
            margin: 16px 0;
            border-radius: 8px;
            border-left: 4px solid currentColor;
            page-break-inside: avoid;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${data.studyGuide.title}</h1>
          <div class="meta">${data.class.emoji || '📚'} ${data.class.name}</div>
        </div>

        <div class="student-info">
          <div><label>Name:</label><span class="line"></span></div>
          <div><label>Date:</label><span class="line" style="width: 120px;"></span></div>
        </div>

        <div class="content">
          ${data.studyGuide.content}
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
</script>

<svelte:head>
  <title>{data.studyGuide.title} | Checkmate</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
  <div class="mb-6">
    <a href="/student/assignments" class="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
      <ArrowLeft class="w-4 h-4" />
      Back to Assignments
    </a>

    <div class="flex items-start justify-between">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center">
          <BookOpen class="w-7 h-7 text-amber-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{data.studyGuide.title}</h1>
          <p class="text-gray-500 mt-1">
            {data.class.emoji || '📚'} {data.class.name}
            {#if data.studyGuide.teacher?.name}
              <span class="text-gray-300 mx-2">|</span>
              By {data.studyGuide.teacher.name}
            {/if}
          </p>
        </div>
      </div>

      <button onclick={printStudyGuide} class="btn btn-secondary">
        <Printer class="w-4 h-4" />
        Print / Save PDF
      </button>
    </div>
  </div>

  <div class="card">
    <div class="p-6 md:p-8">
      <div class="prose prose-sm md:prose max-w-none">
        {@html data.studyGuide.content}
      </div>
    </div>
  </div>
</div>
