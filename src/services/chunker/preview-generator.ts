import type { Chunk, ChunksOutput } from "../../models/chunk";

/**
 * Generate an HTML preview page for browsing chunks.
 */
export function generatePreviewHtml(chunksOutput: ChunksOutput): string {
  const { chunks, document_id, generated_at, total_chunks } = chunksOutput;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chunk Preview - ${escapeHtml(document_id)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    header {
      background: #2c3e50;
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    header h1 { margin: 0 0 10px 0; }
    .stats {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    .stat {
      background: rgba(255,255,255,0.1);
      padding: 8px 16px;
      border-radius: 4px;
    }
    .controls {
      background: white;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      gap: 15px;
      align-items: center;
      flex-wrap: wrap;
    }
    .controls input, .controls select {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
    .controls input[type="text"] { width: 300px; }
    .chunk {
      background: white;
      border-radius: 8px;
      margin-bottom: 15px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .chunk.figure-caption { border-left: 4px solid #e74c3c; }
    .chunk.table { border-left: 4px solid #3498db; }
    .chunk-header {
      background: #ecf0f1;
      padding: 12px 15px;
      font-size: 13px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .chunk-id { font-weight: bold; color: #2c3e50; }
    .chunk-meta { color: #7f8c8d; }
    .breadcrumb {
      background: #3498db;
      color: white;
      padding: 8px 15px;
      font-size: 14px;
    }
    .chunk-content {
      padding: 15px;
      white-space: pre-wrap;
      font-size: 14px;
      max-height: 300px;
      overflow-y: auto;
    }
    .chunk-footer {
      background: #f8f9fa;
      padding: 10px 15px;
      font-size: 12px;
      color: #666;
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
    }
    .tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: bold;
    }
    .tag.caption { background: #fadbd8; color: #c0392b; }
    .tag.table { background: #d4e6f1; color: #2471a3; }
    .tag.overlap { background: #d5f5e3; color: #1e8449; }
    .hidden { display: none; }
    .figure-refs {
      margin-top: 10px;
      padding: 10px;
      background: #fff3cd;
      border-radius: 4px;
      font-size: 13px;
    }
    .nav-links {
      display: flex;
      gap: 10px;
    }
    .nav-links a {
      color: #3498db;
      text-decoration: none;
    }
    .nav-links a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <header>
    <h1>Chunk Preview</h1>
    <div class="stats">
      <div class="stat"><strong>Document:</strong> ${escapeHtml(document_id)}</div>
      <div class="stat"><strong>Total Chunks:</strong> ${total_chunks}</div>
      <div class="stat"><strong>Generated:</strong> ${generated_at}</div>
    </div>
  </header>

  <div class="controls">
    <input type="text" id="search" placeholder="Search chunks..." onkeyup="filterChunks()">
    <select id="filter" onchange="filterChunks()">
      <option value="all">All Chunks</option>
      <option value="caption">Figure Captions</option>
      <option value="table">Tables</option>
      <option value="overlap">With Overlap</option>
    </select>
    <span id="count">${total_chunks} chunks</span>
  </div>

  <div id="chunks">
    ${chunks.map(chunk => renderChunk(chunk)).join('\n')}
  </div>

  <script>
    function filterChunks() {
      const search = document.getElementById('search').value.toLowerCase();
      const filter = document.getElementById('filter').value;
      const chunks = document.querySelectorAll('.chunk');
      let visible = 0;

      chunks.forEach(chunk => {
        const content = chunk.textContent.toLowerCase();
        const isCaption = chunk.classList.contains('figure-caption');
        const isTable = chunk.classList.contains('table');
        const hasOverlap = chunk.dataset.overlap > 0;

        let show = content.includes(search);
        if (filter === 'caption') show = show && isCaption;
        if (filter === 'table') show = show && isTable;
        if (filter === 'overlap') show = show && hasOverlap;

        chunk.classList.toggle('hidden', !show);
        if (show) visible++;
      });

      document.getElementById('count').textContent = visible + ' chunks';
    }
  </script>
</body>
</html>`;
}

function renderChunk(chunk: Chunk): string {
  const classes = ['chunk'];
  if (chunk.is_figure_caption) classes.push('figure-caption');
  if (chunk.is_table) classes.push('table');

  const tags: string[] = [];
  if (chunk.is_figure_caption) tags.push('<span class="tag caption">CAPTION</span>');
  if (chunk.is_table) tags.push('<span class="tag table">TABLE</span>');
  if (chunk.overlap_tokens > 0) tags.push(`<span class="tag overlap">+${chunk.overlap_tokens} overlap</span>`);

  const figRefs = chunk.figure_references.length > 0
    ? `<div class="figure-refs">References: ${chunk.figure_references.map(r => r.figure_id).join(', ')}</div>`
    : '';

  return `
    <div class="${classes.join(' ')}" id="${chunk.chunk_id}" data-overlap="${chunk.overlap_tokens}">
      <div class="chunk-header">
        <span class="chunk-id">${escapeHtml(chunk.chunk_id)}</span>
        <span class="chunk-meta">
          ${tags.join(' ')}
          Pages: ${chunk.page_numbers.join(', ')} |
          Tokens: ${chunk.token_count} |
          Chars: ${chunk.character_count}
        </span>
      </div>
      <div class="breadcrumb">${escapeHtml(chunk.breadcrumb_text)}</div>
      <div class="chunk-content">${escapeHtml(chunk.content)}</div>
      ${figRefs}
      <div class="chunk-footer">
        <span>Section: ${escapeHtml(chunk.parent_section_id || 'N/A')}</span>
        <span>Sources: ${chunk.source_block_ids.length} blocks</span>
        <div class="nav-links">
          ${chunk.previous_chunk_id ? `<a href="#${chunk.previous_chunk_id}">← Prev</a>` : ''}
          ${chunk.next_chunk_id ? `<a href="#${chunk.next_chunk_id}">Next →</a>` : ''}
        </div>
      </div>
    </div>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
