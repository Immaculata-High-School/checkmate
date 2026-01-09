<script lang="ts">
  import { browser } from '$app/environment';
  import { ArrowLeft, BookOpen, Printer, FileText, Clock, User } from 'lucide-svelte';
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
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <style>
          @page {
            margin: 0.75in;
            size: letter;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: Georgia, 'Times New Roman', Times, serif;
            line-height: 1.7;
            color: #1a1a1a;
            max-width: 7.5in;
            margin: 0 auto;
            padding: 0;
            font-size: 11pt;
          }
          /* FontAwesome icons */
          .fas, .far, .fab {
            margin-right: 6pt;
            color: #333;
          }
          h2 .fas, h2 .far, h3 .fas, h3 .far {
            color: #1e40af;
          }
          .header {
            text-align: center;
            margin-bottom: 20pt;
            padding-bottom: 12pt;
            border-bottom: 2pt solid #000;
          }
          .header h1 {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #000;
            font-size: 18pt;
            font-weight: bold;
            margin: 0 0 6pt 0;
            text-transform: uppercase;
            letter-spacing: 0.5pt;
          }
          .header .meta {
            color: #555;
            font-size: 10pt;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .student-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20pt;
            font-size: 10pt;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .student-info div {
            display: flex;
            align-items: baseline;
          }
          .student-info label {
            font-weight: 600;
            margin-right: 6pt;
          }
          .student-info .line {
            display: inline-block;
            width: 150pt;
            border-bottom: 1pt solid #666;
          }
          .student-info .line.short {
            width: 80pt;
          }
          .content {
            font-size: 11pt;
          }
          .content h1 {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5pt;
            border-bottom: 1pt solid #000;
            padding-bottom: 4pt;
            margin: 18pt 0 10pt 0;
          }
          .content h2 {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 12pt;
            font-weight: bold;
            margin: 16pt 0 8pt 0;
            color: #333;
          }
          .content h3 {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 11pt;
            font-weight: 600;
            margin: 14pt 0 6pt 0;
            color: #444;
          }
          .content ul, .content ol {
            margin: 10pt 0;
            padding-left: 20pt;
          }
          .content li {
            margin: 6pt 0;
          }
          .content p {
            margin: 10pt 0;
            text-align: justify;
          }
          .content strong {
            font-weight: 600;
          }
          /* Key terms / definitions */
          .content dl {
            margin: 12pt 0;
          }
          .content dt {
            font-weight: 600;
            margin-top: 10pt;
          }
          .content dd {
            margin-left: 16pt;
            margin-top: 2pt;
          }
          /* Styled boxes for key concepts, tips, warnings */
          .content .key-concept {
            padding: 12pt 14pt;
            margin: 14pt 0;
            border: 1pt solid #1e40af;
            border-left: 4pt solid #1e40af;
            background: #f8fafc;
            page-break-inside: avoid;
          }
          .content .tip {
            padding: 12pt 14pt;
            margin: 14pt 0;
            border: 1pt solid #059669;
            border-left: 4pt solid #059669;
            background: #f8fafc;
            page-break-inside: avoid;
          }
          .content .warning {
            padding: 12pt 14pt;
            margin: 14pt 0;
            border: 1pt solid #d97706;
            border-left: 4pt solid #d97706;
            background: #fffbeb;
            page-break-inside: avoid;
          }
          .content .practice-question {
            padding: 12pt 14pt;
            margin: 14pt 0;
            border: 1pt solid #7c3aed;
            border-left: 4pt solid #7c3aed;
            background: #faf5ff;
            page-break-inside: avoid;
          }
          .content .checklist {
            list-style: none;
            padding-left: 0;
          }
          .content .checklist li {
            padding-left: 20pt;
            position: relative;
          }
          .content .checklist li::before {
            content: "○";
            position: absolute;
            left: 0;
          }
          .content .steps {
            counter-reset: step;
            list-style: none;
            padding-left: 0;
          }
          .content .steps li {
            counter-increment: step;
            padding-left: 28pt;
            position: relative;
            margin: 8pt 0;
          }
          .content .steps li::before {
            content: counter(step);
            position: absolute;
            left: 0;
            width: 20pt;
            height: 20pt;
            background: #334155;
            color: white;
            border-radius: 50%;
            font-size: 9pt;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          }
          .content .icon {
            color: #475569;
            margin-right: 4pt;
          }
          .content details {
            margin-top: 8pt;
          }
          .content summary {
            cursor: pointer;
            color: #6366f1;
            font-weight: 500;
          }
          .content details[open] summary {
            margin-bottom: 6pt;
          }
          /* Legacy support for old formats */
          .content div[style*="background"],
          .content .highlight,
          .content .note {
            padding: 10pt 12pt;
            margin: 12pt 0;
            border: 1pt solid #666;
            border-left: 3pt solid #000;
            background: #f9f9f9 !important;
            page-break-inside: avoid;
          }
          .content blockquote {
            margin: 12pt 0;
            padding: 8pt 12pt;
            border-left: 3pt solid #666;
            font-style: italic;
            color: #444;
          }
          .content table {
            width: 100%;
            border-collapse: collapse;
            margin: 12pt 0;
            font-size: 10pt;
          }
          .content th, .content td {
            border: 1pt solid #666;
            padding: 6pt 8pt;
            text-align: left;
          }
          .content th {
            background: #f0f0f0;
            font-weight: 600;
          }
          .content code {
            font-family: 'Courier New', monospace;
            font-size: 10pt;
            background: #f5f5f5;
            padding: 1pt 4pt;
          }
          .content pre {
            background: #f5f5f5;
            padding: 10pt;
            overflow-x: auto;
            font-size: 9pt;
            border: 1pt solid #ddd;
          }
          /* Page breaks */
          .content h1 {
            page-break-after: avoid;
          }
          .content h2, .content h3 {
            page-break-after: avoid;
          }
          .content ul, .content ol, .content p {
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
          <div class="meta">${data.class.name}</div>
        </div>

        <div class="student-info">
          <div><label>Name:</label><span class="line"></span></div>
          <div><label>Date:</label><span class="line short"></span></div>
          <div><label>Period:</label><span class="line short"></span></div>
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
        <div class="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center">
          <BookOpen class="w-7 h-7 text-slate-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{data.studyGuide.title}</h1>
          <div class="flex items-center gap-4 text-sm text-gray-500 mt-1">
            <span class="flex items-center gap-1">
              <FileText class="w-4 h-4" />
              {data.class.name}
            </span>
            {#if data.studyGuide.teacher?.name}
              <span class="flex items-center gap-1">
                <User class="w-4 h-4" />
                {data.studyGuide.teacher.name}
              </span>
            {/if}
          </div>
        </div>
      </div>

      <button onclick={printStudyGuide} class="btn btn-primary">
        <Printer class="w-4 h-4" />
        Print
      </button>
    </div>
  </div>

  <!-- Study Guide Content -->
  <div class="bg-white rounded-xl shadow-sm border border-gray-200">
    <div class="p-6 md:p-8 lg:p-10">
      <article class="study-content prose prose-slate prose-sm md:prose max-w-none
        prose-headings:font-semibold prose-headings:text-gray-900
        prose-h1:text-xl prose-h1:border-b prose-h1:border-gray-200 prose-h1:pb-2
        prose-h2:text-lg prose-h2:mt-8
        prose-h3:text-base prose-h3:mt-6
        prose-p:text-gray-700 prose-p:leading-relaxed
        prose-li:text-gray-700
        prose-strong:text-gray-900
        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
        prose-blockquote:border-l-slate-300 prose-blockquote:text-gray-600
        prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
        prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200
        prose-table:border prose-th:bg-slate-50 prose-td:border prose-th:border
      ">
        {@html data.studyGuide.content}
      </article>
    </div>
  </div>
</div>

<style>
  /* On-screen styles for study guide content */
  
  /* FontAwesome icon styling */
  .study-content :global(.fas),
  .study-content :global(.far),
  .study-content :global(.fab) {
    margin-right: 0.5rem;
  }
  .study-content :global(h2 .fas),
  .study-content :global(h2 .far),
  .study-content :global(h3 .fas),
  .study-content :global(h3 .far) {
    color: #3b82f6;
  }
  .study-content :global(.key-concept .fas),
  .study-content :global(.key-concept .far) {
    color: #1d4ed8;
  }
  .study-content :global(.tip .fas),
  .study-content :global(.tip .far) {
    color: #059669;
  }
  .study-content :global(.warning .fas),
  .study-content :global(.warning .far) {
    color: #d97706;
  }
  .study-content :global(.practice-question .fas),
  .study-content :global(.practice-question .far) {
    color: #7c3aed;
  }
  
  .study-content :global(.key-concept) {
    padding: 1rem 1.25rem;
    margin: 1.25rem 0;
    border: 1px solid #3b82f6;
    border-left: 4px solid #3b82f6;
    background: #eff6ff;
    border-radius: 0.5rem;
  }
  .study-content :global(.tip) {
    padding: 1rem 1.25rem;
    margin: 1.25rem 0;
    border: 1px solid #10b981;
    border-left: 4px solid #10b981;
    background: #ecfdf5;
    border-radius: 0.5rem;
  }
  .study-content :global(.warning) {
    padding: 1rem 1.25rem;
    margin: 1.25rem 0;
    border: 1px solid #f59e0b;
    border-left: 4px solid #f59e0b;
    background: #fffbeb;
    border-radius: 0.5rem;
  }
  .study-content :global(.practice-question) {
    padding: 1rem 1.25rem;
    margin: 1.25rem 0;
    border: 1px solid #8b5cf6;
    border-left: 4px solid #8b5cf6;
    background: #f5f3ff;
    border-radius: 0.5rem;
  }
  .study-content :global(.checklist) {
    list-style: none;
    padding-left: 0;
  }
  .study-content :global(.checklist li) {
    padding: 0.25rem 0;
  }
  .study-content :global(.checklist li .far) {
    color: #6b7280;
  }
  .study-content :global(.steps) {
    counter-reset: step;
    list-style: none;
    padding-left: 0;
  }
  .study-content :global(.steps li) {
    counter-increment: step;
    padding-left: 2.5rem;
    position: relative;
    margin: 0.75rem 0;
  }
  .study-content :global(.steps li::before) {
    content: counter(step);
    position: absolute;
    left: 0;
    width: 1.5rem;
    height: 1.5rem;
    background: #334155;
    color: white;
    border-radius: 50%;
    font-size: 0.75rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .study-content :global(details) {
    margin-top: 0.75rem;
  }
  .study-content :global(summary) {
    cursor: pointer;
    color: #6366f1;
    font-weight: 500;
  }
  .study-content :global(summary .fas),
  .study-content :global(summary .far) {
    color: #6366f1;
  }
  .study-content :global(details[open] summary) {
    margin-bottom: 0.5rem;
  }
  .study-content :global(details p) {
    padding: 0.75rem;
    background: white;
    border-radius: 0.375rem;
    border: 1px solid #e5e7eb;
  }
  
  /* Definition list styling */
  .study-content :global(dl) {
    margin: 1rem 0;
  }
  .study-content :global(dt) {
    font-weight: 600;
    color: #1f2937;
    margin-top: 0.75rem;
  }
  .study-content :global(dt .fas),
  .study-content :global(dt .far) {
    color: #6366f1;
  }
  .study-content :global(dd) {
    margin-left: 1.5rem;
    color: #4b5563;
  }
</style>
