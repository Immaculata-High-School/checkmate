<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import {
    Bold, Italic, Underline, Strikethrough, List, ListOrdered,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Link, Unlink, Quote, Code, RemoveFormatting, Undo, Redo,
    Subscript, Superscript, Highlighter, Image, Minus,
    Type, Palette, ChevronDown, X, Printer, Download, SpellCheck,
    FileText, MoreHorizontal, IndentIncrease, IndentDecrease,
    Table
  } from 'lucide-svelte';

  interface Props {
    content?: string;
    disabled?: boolean;
    onchange?: (content: string) => void;
    onsave?: () => void;
    autosave?: boolean;
    placeholder?: string;
    showWordCount?: boolean;
    onactivity?: (event: { type: string; position: number; content?: string; length?: number }) => void;
  }

  let {
    content = $bindable(''),
    disabled = false,
    onchange,
    onsave,
    autosave = false,
    placeholder = 'Start writing...',
    showWordCount = false,
    onactivity
  }: Props = $props();

  let editorEl: HTMLDivElement;
  let toolbarEl: HTMLDivElement;
  let wordCount = $state(0);
  let charCount = $state(0);
  let pageCount = $state(1);
  let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
  let isInitialized = $state(false);

  // Formatting state
  let isBold = $state(false);
  let isItalic = $state(false);
  let isUnderline = $state(false);
  let isStrike = $state(false);
  let isSubscript = $state(false);
  let isSuperscript = $state(false);
  let currentHeading = $state('p');
  let currentFont = $state('');
  let currentFontSize = $state('3');
  let currentColor = $state('#000000');
  let currentBgColor = $state('transparent');

  // Modal/dropdown states
  let showLinkModal = $state(false);
  let showImageModal = $state(false);
  let showTableModal = $state(false);
  let linkUrl = $state('');
  let linkText = $state('');
  let imageUrl = $state('');
  let imageAlt = $state('');
  let tableRows = $state(3);
  let tableCols = $state(3);

  let showFontDropdown = $state(false);
  let showSizeDropdown = $state(false);
  let showColorPicker = $state(false);
  let showBgColorPicker = $state(false);
  let showOverflowMenu = $state(false);

  // View modes
  let pageMode = $state(false);
  let spellcheck = $state(true);

  // Toolbar overflow
  let overflowItems = $state<string[]>([]);

  const fonts = [
    { name: 'Default', value: '' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Times New Roman', value: 'Times New Roman, serif' },
    { name: 'Courier New', value: 'Courier New, monospace' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
    { name: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' }
  ];

  const fontSizes = [
    { name: 'Tiny', value: '1' },
    { name: 'Small', value: '2' },
    { name: 'Normal', value: '3' },
    { name: 'Medium', value: '4' },
    { name: 'Large', value: '5' },
    { name: 'Huge', value: '6' },
    { name: 'Massive', value: '7' }
  ];

  const colors = [
    '#000000', '#434343', '#666666', '#999999', '#cccccc', '#ffffff',
    '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#0000ff',
    '#9900ff', '#ff00ff', '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc',
    '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc'
  ];

  function countWords(text: string): number {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(word => word.length > 0).length;
  }

  function updateCounts() {
    if (editorEl) {
      const text = editorEl.innerText || '';
      wordCount = countWords(text);
      charCount = text.length;
      pageCount = Math.max(1, Math.ceil(charCount / 3000));
    }
  }

  function updateFormattingState() {
    if (!browser) return;
    isBold = document.queryCommandState('bold');
    isItalic = document.queryCommandState('italic');
    isUnderline = document.queryCommandState('underline');
    isStrike = document.queryCommandState('strikeThrough');
    isSubscript = document.queryCommandState('subscript');
    isSuperscript = document.queryCommandState('superscript');
    currentHeading = document.queryCommandValue('formatBlock') || 'p';
    currentFont = document.queryCommandValue('fontName') || '';
    currentFontSize = document.queryCommandValue('fontSize') || '3';
    const fc = document.queryCommandValue('foreColor');
    if (fc) currentColor = rgbToHex(fc);
  }

  function rgbToHex(rgb: string): string {
    if (rgb.startsWith('#')) return rgb;
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return rgb;
    const hex = (x: string) => parseInt(x).toString(16).padStart(2, '0');
    return `#${hex(match[1])}${hex(match[2])}${hex(match[3])}`;
  }

  function execCommand(command: string, value?: string) {
    if (disabled) return;
    editorEl?.focus();
    document.execCommand(command, false, value);
    handleInput();
    updateFormattingState();
  }

  function handleInput() {
    if (!editorEl) return;
    content = editorEl.innerHTML;
    onchange?.(content);
    updateCounts();

    if (autosave && onsave) {
      if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
      autoSaveTimeout = setTimeout(() => {
        onsave();
      }, 1500);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveNow();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); execCommand('bold'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); execCommand('italic'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') { e.preventDefault(); execCommand('underline'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); printDocument(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      const isRedo = e.shiftKey;
      execCommand(isRedo ? 'redo' : 'undo');
      // Track undo/redo
      if (onactivity) {
        const sel = window.getSelection();
        const pos = sel?.anchorOffset || 0;
        onactivity({ type: isRedo ? 'redo' : 'undo', position: pos });
      }
    }

    // Track backspace/delete
    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (onactivity) {
        const sel = window.getSelection();
        const pos = sel?.anchorOffset || 0;
        const length = sel?.toString().length || 1;
        onactivity({ type: 'delete', position: pos, length });
      }
    }
  }

  // Handle text input for activity tracking
  function handleBeforeInput(e: InputEvent) {
    if (!onactivity) return;
    
    const sel = window.getSelection();
    const pos = sel?.anchorOffset || 0;
    
    if (e.inputType === 'insertText' && e.data) {
      onactivity({ type: 'insert', position: pos, content: e.data, length: e.data.length });
    } else if (e.inputType === 'insertFromPaste') {
      // Paste is handled separately
    } else if (e.inputType === 'deleteContentBackward' || e.inputType === 'deleteContentForward') {
      const length = sel?.toString().length || 1;
      onactivity({ type: 'delete', position: pos, length });
    }
  }

  // Handle paste events
  function handlePaste(e: ClipboardEvent) {
    if (!onactivity) return;
    
    const pastedText = e.clipboardData?.getData('text/plain') || '';
    if (pastedText) {
      const sel = window.getSelection();
      const pos = sel?.anchorOffset || 0;
      onactivity({ type: 'paste', position: pos, content: pastedText, length: pastedText.length });
    }
  }

  // Handle cut events
  function handleCut(e: ClipboardEvent) {
    if (!onactivity) return;
    
    const sel = window.getSelection();
    const selectedText = sel?.toString() || '';
    const pos = sel?.anchorOffset || 0;
    
    if (selectedText) {
      onactivity({ type: 'cut', position: pos, content: selectedText, length: selectedText.length });
    }
  }

  function saveNow() {
    if (onsave) {
      onsave();
    }
  }

  function printDocument() {
    if (!browser || !editorEl) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html><html><head><title>Print Document</title>
        <style>body { font-family: Georgia, serif; padding: 40px; line-height: 1.6; }
        h1,h2,h3 { margin: 1em 0 0.5em; } p { margin: 0.5em 0; }
        img { max-width: 100%; } @media print { body { padding: 0; } }</style>
        </head><body>${editorEl.innerHTML}</body></html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  function exportHTML() {
    if (!browser || !editorEl) return;
    const blob = new Blob([editorEl.innerHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.html';
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportText() {
    if (!browser || !editorEl) return;
    const blob = new Blob([editorEl.innerText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  function openLinkModal() {
    if (disabled) return;
    linkText = window.getSelection()?.toString() || '';
    linkUrl = '';
    showLinkModal = true;
  }

  function insertLink() {
    if (linkUrl) {
      editorEl?.focus();
      if (linkText) {
        document.execCommand('insertHTML', false, `<a href="${linkUrl}" target="_blank">${linkText}</a>`);
      } else {
        document.execCommand('createLink', false, linkUrl);
      }
      handleInput();
    }
    showLinkModal = false;
  }

  function openImageModal() {
    if (disabled) return;
    imageUrl = '';
    imageAlt = '';
    showImageModal = true;
  }

  function insertImage() {
    if (imageUrl) {
      editorEl?.focus();
      document.execCommand('insertHTML', false, `<img src="${imageUrl}" alt="${imageAlt || ''}" style="max-width:100%">`);
      handleInput();
    }
    showImageModal = false;
  }

  function openTableModal() {
    if (disabled) return;
    tableRows = 3;
    tableCols = 3;
    showTableModal = true;
  }

  function insertTable() {
    editorEl?.focus();
    let html = '<table style="border-collapse:collapse;width:100%;margin:1em 0">';
    for (let r = 0; r < tableRows; r++) {
      html += '<tr>';
      for (let c = 0; c < tableCols; c++) {
        html += `<td style="border:1px solid #ddd;padding:8px">&nbsp;</td>`;
      }
      html += '</tr>';
    }
    html += '</table>';
    document.execCommand('insertHTML', false, html);
    handleInput();
    showTableModal = false;
  }

  function closeAllDropdowns() {
    showFontDropdown = false;
    showSizeDropdown = false;
    showColorPicker = false;
    showBgColorPicker = false;
    showOverflowMenu = false;
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.dropdown-container')) {
      closeAllDropdowns();
    }
  }

  onMount(() => {
    if (!browser) return;
    if (content && editorEl) editorEl.innerHTML = content;
    updateCounts();
    isInitialized = true;
    document.addEventListener('selectionchange', updateFormattingState);
    document.addEventListener('click', handleClickOutside);
  });

  onDestroy(() => {
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    if (browser) {
      document.removeEventListener('selectionchange', updateFormattingState);
      document.removeEventListener('click', handleClickOutside);
    }
  });

  $effect(() => {
    if (isInitialized && editorEl && content !== editorEl.innerHTML) {
      editorEl.innerHTML = content;
      updateCounts();
    }
  });
</script>

<div class="rich-text-editor" class:disabled class:page-mode={pageMode}>
  {#if !disabled}
    <div class="toolbar" bind:this={toolbarEl}>
      <div class="toolbar-main">
        <!-- Undo/Redo -->
        <button type="button" class="toolbar-btn" onclick={() => execCommand('undo')} title="Undo">
          <Undo size={16} />
        </button>
        <button type="button" class="toolbar-btn" onclick={() => execCommand('redo')} title="Redo">
          <Redo size={16} />
        </button>

        <div class="toolbar-divider"></div>

        <!-- Heading -->
        <select class="toolbar-select" value={currentHeading} onchange={(e) => execCommand('formatBlock', e.currentTarget.value)}>
          <option value="p">Normal</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>

        <!-- Font -->
        <div class="dropdown-container">
          <button type="button" class="toolbar-btn-wide" onclick={() => { closeAllDropdowns(); showFontDropdown = !showFontDropdown; }}>
            <Type size={14} /><ChevronDown size={12} />
          </button>
          {#if showFontDropdown}
            <div class="dropdown-menu">
              {#each fonts as font}
                <button type="button" class="dropdown-item" style="font-family:{font.value}" onclick={() => { execCommand('fontName', font.value); showFontDropdown = false; }}>{font.name}</button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Size -->
        <div class="dropdown-container">
          <button type="button" class="toolbar-btn-wide" onclick={() => { closeAllDropdowns(); showSizeDropdown = !showSizeDropdown; }}>
            <span style="font-size:12px">Size</span><ChevronDown size={12} />
          </button>
          {#if showSizeDropdown}
            <div class="dropdown-menu">
              {#each fontSizes as size}
                <button type="button" class="dropdown-item" onclick={() => { execCommand('fontSize', size.value); showSizeDropdown = false; }}>{size.name}</button>
              {/each}
            </div>
          {/if}
        </div>

        <div class="toolbar-divider"></div>

        <!-- Text formatting -->
        <button type="button" class="toolbar-btn" class:active={isBold} onclick={() => execCommand('bold')} title="Bold">
          <Bold size={16} />
        </button>
        <button type="button" class="toolbar-btn" class:active={isItalic} onclick={() => execCommand('italic')} title="Italic">
          <Italic size={16} />
        </button>
        <button type="button" class="toolbar-btn" class:active={isUnderline} onclick={() => execCommand('underline')} title="Underline">
          <Underline size={16} />
        </button>
        <button type="button" class="toolbar-btn" class:active={isStrike} onclick={() => execCommand('strikeThrough')} title="Strikethrough">
          <Strikethrough size={16} />
        </button>

        <!-- Colors -->
        <div class="dropdown-container">
          <button type="button" class="toolbar-btn color-btn" onclick={() => { closeAllDropdowns(); showColorPicker = !showColorPicker; }} title="Text Color">
            <Palette size={16} />
            <span class="color-bar" style="background:{currentColor}"></span>
          </button>
          {#if showColorPicker}
            <div class="color-picker">
              <div class="color-grid">
                {#each colors as c}
                  <button type="button" class="color-swatch" style="background:{c}" onclick={() => { execCommand('foreColor', c); showColorPicker = false; }}></button>
                {/each}
              </div>
              <input type="color" value={currentColor} onchange={(e) => { execCommand('foreColor', e.currentTarget.value); showColorPicker = false; }} />
            </div>
          {/if}
        </div>

        <div class="dropdown-container">
          <button type="button" class="toolbar-btn color-btn" onclick={() => { closeAllDropdowns(); showBgColorPicker = !showBgColorPicker; }} title="Highlight">
            <Highlighter size={16} />
            <span class="color-bar" style="background:{currentBgColor === 'transparent' ? '#fff' : currentBgColor}"></span>
          </button>
          {#if showBgColorPicker}
            <div class="color-picker">
              <div class="color-grid">
                <button type="button" class="color-swatch no-color" onclick={() => { execCommand('removeFormat'); showBgColorPicker = false; }}><X size={10} /></button>
                {#each colors as c}
                  <button type="button" class="color-swatch" style="background:{c}" onclick={() => { execCommand('hiliteColor', c); showBgColorPicker = false; }}></button>
                {/each}
              </div>
            </div>
          {/if}
        </div>

        <div class="toolbar-divider"></div>

        <!-- Lists & Indent -->
        <button type="button" class="toolbar-btn" onclick={() => execCommand('insertUnorderedList')} title="Bullet List">
          <List size={16} />
        </button>
        <button type="button" class="toolbar-btn" onclick={() => execCommand('insertOrderedList')} title="Numbered List">
          <ListOrdered size={16} />
        </button>
        <button type="button" class="toolbar-btn" onclick={() => execCommand('outdent')} title="Decrease Indent">
          <IndentDecrease size={16} />
        </button>
        <button type="button" class="toolbar-btn" onclick={() => execCommand('indent')} title="Increase Indent">
          <IndentIncrease size={16} />
        </button>

        <div class="toolbar-divider"></div>

        <!-- Alignment -->
        <button type="button" class="toolbar-btn" onclick={() => execCommand('justifyLeft')} title="Align Left">
          <AlignLeft size={16} />
        </button>
        <button type="button" class="toolbar-btn" onclick={() => execCommand('justifyCenter')} title="Align Center">
          <AlignCenter size={16} />
        </button>
        <button type="button" class="toolbar-btn" onclick={() => execCommand('justifyRight')} title="Align Right">
          <AlignRight size={16} />
        </button>

        <div class="toolbar-divider"></div>

        <!-- Insert -->
        <button type="button" class="toolbar-btn" onclick={openLinkModal} title="Insert Link">
          <Link size={16} />
        </button>
        <button type="button" class="toolbar-btn" onclick={openImageModal} title="Insert Image">
          <Image size={16} />
        </button>
        <button type="button" class="toolbar-btn" onclick={openTableModal} title="Insert Table">
          <Table size={16} />
        </button>
        <button type="button" class="toolbar-btn" onclick={() => execCommand('insertHorizontalRule')} title="Horizontal Line">
          <Minus size={16} />
        </button>

        <div class="toolbar-divider"></div>

        <!-- Clear -->
        <button type="button" class="toolbar-btn" onclick={() => execCommand('removeFormat')} title="Clear Formatting">
          <RemoveFormatting size={16} />
        </button>

        <!-- More menu -->
        <div class="dropdown-container">
          <button type="button" class="toolbar-btn" onclick={() => { closeAllDropdowns(); showOverflowMenu = !showOverflowMenu; }} title="More options">
            <MoreHorizontal size={16} />
          </button>
          {#if showOverflowMenu}
            <div class="dropdown-menu overflow-menu">
              <button type="button" class="dropdown-item" onclick={() => { printDocument(); showOverflowMenu = false; }}>
                <Printer size={14} /> Print
              </button>
              <button type="button" class="dropdown-item" onclick={() => { exportHTML(); showOverflowMenu = false; }}>
                <Download size={14} /> Export HTML
              </button>
              <button type="button" class="dropdown-item" onclick={() => { exportText(); showOverflowMenu = false; }}>
                <FileText size={14} /> Export Text
              </button>
              <div class="dropdown-divider"></div>
              <button type="button" class="dropdown-item" onclick={() => { spellcheck = !spellcheck; showOverflowMenu = false; }}>
                <SpellCheck size={14} /> Spellcheck {spellcheck ? '✓' : ''}
              </button>
              <button type="button" class="dropdown-item" onclick={() => { pageMode = !pageMode; showOverflowMenu = false; }}>
                <FileText size={14} /> Page Mode {pageMode ? '✓' : ''}
              </button>
              <button type="button" class="dropdown-item" onclick={() => execCommand('subscript')}>
                <Subscript size={14} /> Subscript
              </button>
              <button type="button" class="dropdown-item" onclick={() => execCommand('superscript')}>
                <Superscript size={14} /> Superscript
              </button>
              <button type="button" class="dropdown-item" onclick={() => execCommand('formatBlock', 'blockquote')}>
                <Quote size={14} /> Quote
              </button>
              <button type="button" class="dropdown-item" onclick={() => execCommand('formatBlock', 'pre')}>
                <Code size={14} /> Code Block
              </button>
            </div>
          {/if}
        </div>
      </div>

    </div>
  {/if}

  <div class="editor-wrapper">
    <div 
      bind:this={editorEl}
      class="editor-content"
      contenteditable={!disabled}
      oninput={handleInput}
      onkeydown={handleKeydown}
      onbeforeinput={handleBeforeInput}
      onpaste={handlePaste}
      oncut={handleCut}
      data-placeholder={placeholder}
      role="textbox"
      aria-multiline="true"
      tabindex="0"
      spellcheck={spellcheck}
    ></div>
  </div>
  
  {#if showWordCount}
    <div class="status-bar">
      <span>{wordCount} words</span>
      <span class="sep">•</span>
      <span>{charCount} characters</span>
      {#if pageMode}
        <span class="sep">•</span>
        <span>{pageCount} page{pageCount !== 1 ? 's' : ''}</span>
      {/if}
    </div>
  {/if}
</div>

<!-- Link Modal -->
{#if showLinkModal}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-overlay" onclick={() => showLinkModal = false} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
      <div class="modal-header"><h3>Insert Link</h3><button type="button" onclick={() => showLinkModal = false}><X size={18} /></button></div>
      <div class="modal-body">
        <label>Text<input type="text" bind:value={linkText} placeholder="Link text" /></label>
        <label>URL<input type="url" bind:value={linkUrl} placeholder="https://" /></label>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-cancel" onclick={() => showLinkModal = false}>Cancel</button>
        <button type="button" class="btn-primary" onclick={insertLink} disabled={!linkUrl}>Insert</button>
      </div>
    </div>
  </div>
{/if}

<!-- Image Modal -->
{#if showImageModal}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-overlay" onclick={() => showImageModal = false} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
      <div class="modal-header"><h3>Insert Image</h3><button type="button" onclick={() => showImageModal = false}><X size={18} /></button></div>
      <div class="modal-body">
        <label>Image URL<input type="url" bind:value={imageUrl} placeholder="https://" /></label>
        <label>Alt Text<input type="text" bind:value={imageAlt} placeholder="Description" /></label>
        {#if imageUrl}<div class="preview"><img src={imageUrl} alt="Preview" /></div>{/if}
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-cancel" onclick={() => showImageModal = false}>Cancel</button>
        <button type="button" class="btn-primary" onclick={insertImage} disabled={!imageUrl}>Insert</button>
      </div>
    </div>
  </div>
{/if}

<!-- Table Modal -->
{#if showTableModal}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-overlay" onclick={() => showTableModal = false} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
      <div class="modal-header"><h3>Insert Table</h3><button type="button" onclick={() => showTableModal = false}><X size={18} /></button></div>
      <div class="modal-body">
        <label>Rows<input type="number" bind:value={tableRows} min="1" max="20" /></label>
        <label>Columns<input type="number" bind:value={tableCols} min="1" max="10" /></label>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-cancel" onclick={() => showTableModal = false}>Cancel</button>
        <button type="button" class="btn-primary" onclick={insertTable}>Insert</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .rich-text-editor { display:flex; flex-direction:column; height:100%; background:#fff; border:1px solid #e0e0e0; border-radius:8px; overflow:hidden; }
  .toolbar { display:flex; align-items:center; padding:6px 8px; background:#fafafa; border-bottom:1px solid #e0e0e0; flex-wrap:wrap; gap:4px; position:sticky; top:0; z-index:50; }
  .toolbar-main { display:flex; align-items:center; gap:2px; flex-wrap:wrap; }
  .toolbar-select { padding:4px 6px; border:1px solid #ddd; border-radius:4px; font-size:12px; background:#fff; }
  .toolbar-btn { display:flex; align-items:center; justify-content:center; width:28px; height:28px; border:none; background:transparent; border-radius:4px; cursor:pointer; color:#444; }
  .toolbar-btn:hover { background:#e8e8e8; }
  .toolbar-btn.active { background:#d0d0d0; }
  .toolbar-btn-wide { display:flex; align-items:center; gap:2px; height:28px; padding:0 6px; border:1px solid #ddd; background:#fff; border-radius:4px; cursor:pointer; font-size:12px; }
  .toolbar-divider { width:1px; height:20px; background:#ddd; margin:0 4px; }
  .color-btn { position:relative; width:32px; }
  .color-bar { position:absolute; bottom:3px; left:50%; transform:translateX(-50%); width:14px; height:3px; border-radius:1px; }
  .dropdown-container { position:relative; }
  .dropdown-menu { position:absolute; top:100%; left:0; margin-top:4px; background:#fff; border:1px solid #ddd; border-radius:6px; box-shadow:0 4px 12px rgba(0,0,0,0.15); z-index:1000; min-width:120px; max-height:280px; overflow-y:auto; }
  .dropdown-item { display:flex; align-items:center; gap:8px; width:100%; padding:8px 12px; border:none; background:none; text-align:left; cursor:pointer; font-size:13px; }
  .dropdown-item:hover { background:#f0f0f0; }
  .dropdown-divider { height:1px; background:#eee; margin:4px 0; }
  .overflow-menu { right:0; left:auto; min-width:160px; }
  .color-picker { position:absolute; top:100%; left:0; margin-top:4px; background:#fff; border:1px solid #ddd; border-radius:6px; box-shadow:0 4px 12px rgba(0,0,0,0.15); z-index:1000; padding:8px; }
  .color-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:3px; margin-bottom:8px; }
  .color-swatch { width:20px; height:20px; border:1px solid #ddd; border-radius:3px; cursor:pointer; }
  .color-swatch:hover { transform:scale(1.15); }
  .color-swatch.no-color { display:flex; align-items:center; justify-content:center; background:#fff; }
  .color-picker input[type="color"] { width:100%; height:24px; border:none; cursor:pointer; }
  .editor-wrapper { flex:1; overflow-y:auto; background:#fff; }
  .editor-content { min-height:300px; padding:24px 40px; font-size:16px; line-height:1.6; outline:none; }
  .editor-content:empty::before { content:attr(data-placeholder); color:#9e9e9e; pointer-events:none; }
  .page-mode .editor-wrapper { background:#e5e5e5; padding:20px; }
  .page-mode .editor-content { max-width:816px; min-height:1056px; margin:0 auto; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.1); padding:72px 72px; }
  :global(.editor-content h1) { font-size:2em; font-weight:bold; margin:0.67em 0; }
  :global(.editor-content h2) { font-size:1.5em; font-weight:bold; margin:0.83em 0; }
  :global(.editor-content h3) { font-size:1.17em; font-weight:bold; margin:1em 0; }
  :global(.editor-content blockquote) { border-left:4px solid #ddd; margin:1em 0; padding-left:16px; color:#666; font-style:italic; }
  :global(.editor-content pre) { background:#f5f5f5; padding:12px; border-radius:4px; font-family:monospace; overflow-x:auto; }
  :global(.editor-content a) { color:#1a73e8; }
  :global(.editor-content ul), :global(.editor-content ol) { margin:1em 0; padding-left:2em; }
  :global(.editor-content img) { max-width:100%; border-radius:4px; }
  :global(.editor-content table) { border-collapse:collapse; width:100%; }
  :global(.editor-content td), :global(.editor-content th) { border:1px solid #ddd; padding:8px; }
  :global(.editor-content hr) { border:none; border-top:2px solid #e0e0e0; margin:1.5em 0; }
  .status-bar { display:flex; align-items:center; justify-content:center; gap:8px; padding:6px 16px; font-size:12px; color:#666; background:#fafafa; border-top:1px solid #e0e0e0; }
  .sep { color:#ccc; }
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:10000; }
  .modal { background:#fff; border-radius:10px; box-shadow:0 20px 60px rgba(0,0,0,0.3); width:100%; max-width:400px; }
  .modal-header { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; border-bottom:1px solid #e0e0e0; }
  .modal-header h3 { margin:0; font-size:16px; }
  .modal-header button { background:none; border:none; cursor:pointer; color:#666; }
  .modal-body { padding:18px; }
  .modal-body label { display:block; margin-bottom:12px; font-size:13px; font-weight:500; }
  .modal-body input { display:block; width:100%; margin-top:4px; padding:8px 10px; border:1px solid #ddd; border-radius:6px; font-size:14px; }
  .modal-body input:focus { outline:none; border-color:#1a73e8; }
  .preview { margin-top:12px; text-align:center; }
  .preview img { max-width:100%; max-height:150px; border-radius:4px; }
  .modal-footer { display:flex; justify-content:flex-end; gap:10px; padding:14px 18px; border-top:1px solid #e0e0e0; background:#fafafa; }
  .btn-cancel { padding:8px 16px; border:none; border-radius:6px; background:#f0f0f0; cursor:pointer; font-size:13px; }
  .btn-primary { padding:8px 16px; border:none; border-radius:6px; background:#1a73e8; color:#fff; cursor:pointer; font-size:13px; }
  .btn-primary:disabled { background:#ccc; }
  @media (max-width:768px) {
    .toolbar-divider { display:none; }
    .editor-content { padding:16px 20px; }
    .page-mode .editor-content { padding:40px 40px; min-height:auto; }
  }
</style>
