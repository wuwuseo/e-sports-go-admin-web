<template>
  <div class="rich-text-editor" :class="{ 'is-disabled': disabled }">
    <div class="rte-toolbar">
      <a-button
        size="small"
        :disabled="disabled"
        @mousedown.prevent
        @click="exec('bold')"
      >
        <b>B</b>
      </a-button>
      <a-button
        size="small"
        :disabled="disabled"
        @mousedown.prevent
        @click="exec('italic')"
      >
        <i>I</i>
      </a-button>
      <a-button
        size="small"
        :disabled="disabled"
        @mousedown.prevent
        @click="exec('insertUnorderedList')"
      >
        列表
      </a-button>
      <a-button
        size="small"
        :disabled="disabled"
        @mousedown.prevent
        @click="exec('insertOrderedList')"
      >
        编号
      </a-button>
      <a-button
        size="small"
        :disabled="disabled"
        @mousedown.prevent
        @click="exec('formatBlock', 'h2')"
      >
        标题
      </a-button>
      <a-button
        size="small"
        :disabled="disabled"
        @mousedown.prevent
        @click="exec('formatBlock', 'p')"
      >
        正文
      </a-button>
      <a-button
        size="small"
        :disabled="disabled"
        @mousedown.prevent
        @click="exec('justifyLeft')"
      >
        左对齐
      </a-button>
      <a-button
        size="small"
        :disabled="disabled"
        @mousedown.prevent
        @click="exec('justifyCenter')"
      >
        居中
      </a-button>
      <a-button
        size="small"
        :disabled="disabled"
        @mousedown.prevent
        @click="exec('justifyRight')"
      >
        右对齐
      </a-button>

      <a-divider direction="vertical" />

      <AttachmentSelector
        accept="image/*"
        :default-directory="imageDirectory"
        :disabled="disabled"
        @select="insertImage"
      >
        <template #trigger="{ open }">
          <a-button
            size="small"
            :disabled="disabled"
            @mousedown.prevent
            @click="open"
          >
            图片
          </a-button>
        </template>
      </AttachmentSelector>

      <a-popover
        trigger="click"
        position="bl"
        :content-style="{ padding: '8px' }"
      >
        <a-button size="small" :disabled="disabled" @mousedown.prevent>
          表格
        </a-button>
        <template #content>
          <div class="rte-table-picker" @mouseleave="pickerSize = null">
            <div
              v-for="row in TABLE_PICKER_MAX"
              :key="`row-${row}`"
              class="rte-table-picker-row"
            >
              <span
                v-for="col in TABLE_PICKER_MAX"
                :key="`col-${col}`"
                class="rte-table-picker-cell"
                :class="{
                  'is-active':
                    pickerSize && row <= pickerSize[0] && col <= pickerSize[1],
                }"
                @mouseenter="pickerSize = [row, col]"
                @click="insertTable(row, col)"
              />
            </div>
            <div class="rte-table-picker-label">
              {{
                pickerSize ? `${pickerSize[0]} × ${pickerSize[1]}` : '插入表格'
              }}
            </div>
          </div>
        </template>
      </a-popover>
    </div>

    <div v-if="inTable" class="rte-toolbar rte-toolbar-table">
      <a-button
        size="mini"
        :disabled="disabled"
        @mousedown.prevent
        @click="insertRow('above')"
      >
        上方插入行
      </a-button>
      <a-button
        size="mini"
        :disabled="disabled"
        @mousedown.prevent
        @click="insertRow('below')"
      >
        下方插入行
      </a-button>
      <a-button
        size="mini"
        :disabled="disabled"
        @mousedown.prevent
        @click="insertColumn('left')"
      >
        左侧插入列
      </a-button>
      <a-button
        size="mini"
        :disabled="disabled"
        @mousedown.prevent
        @click="insertColumn('right')"
      >
        右侧插入列
      </a-button>
      <a-button
        size="mini"
        :disabled="disabled"
        @mousedown.prevent
        @click="deleteRow"
      >
        删除本行
      </a-button>
      <a-button
        size="mini"
        :disabled="disabled"
        @mousedown.prevent
        @click="deleteColumn"
      >
        删除本列
      </a-button>
      <a-button
        size="mini"
        status="danger"
        :disabled="disabled"
        @mousedown.prevent
        @click="removeTable()"
      >
        删除表格
      </a-button>
    </div>

    <div
      ref="editor"
      class="rte-content"
      :style="{ minHeight }"
      :contenteditable="disabled ? 'false' : 'true'"
      role="textbox"
      :aria-label="ariaLabel"
      @input="onInput"
      @paste="pastePlainText"
      @blur="rememberSelection"
      @keyup="rememberSelection"
      @mouseup="rememberSelection"
    />
  </div>
</template>

<script setup lang="ts">
  import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import type { AttachmentResponse } from '@/types/api';
  import AttachmentSelector from '@/components/attachment-selector/index.vue';
  import { getAttachmentAccessInfo } from '@/services/attachment-access.service';

  const props = withDefaults(
    defineProps<{
      modelValue?: string;
      minHeight?: string;
      imageDirectory?: string;
      disabled?: boolean;
      ariaLabel?: string;
    }>(),
    {
      modelValue: '',
      minHeight: '260px',
      imageDirectory: 'public/rich-text',
      disabled: false,
      ariaLabel: '富文本内容',
    }
  );

  const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void;
  }>();

  const TABLE_PICKER_MAX = 6;

  const editor = ref<HTMLDivElement | null>(null);
  const inTable = ref(false);
  const pickerSize = ref<[number, number] | null>(null);

  // 点击工具栏或弹层会让编辑区失焦、选区丢失，因此记住最后一次位于编辑区内的选区。
  let savedRange: Range | null = null;

  const escapeAttr = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  // 记住最近一次由本组件发出的值：父组件把它原样回传时不能回写 DOM，
  // 否则会把元素整体重建（打断光标、并让图片重新发起加载）。
  let lastEmitted = '';

  const sync = () => {
    const html = editor.value?.innerHTML || '';
    lastEmitted = html;
    emit('update:modelValue', html);
  };

  const rememberSelection = () => {
    const el = editor.value;
    const selection = window.getSelection();
    if (!el || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (el.contains(range.commonAncestorContainer)) {
      savedRange = range.cloneRange();
    }
  };

  const placeCaret = (range: Range) => {
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    savedRange = range.cloneRange();
  };

  const focusEditorEnd = () => {
    const el = editor.value;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    placeCaret(range);
  };

  const ensureSelection = () => {
    const el = editor.value;
    if (!el) return;
    const selection = window.getSelection();
    if (
      selection &&
      selection.rangeCount > 0 &&
      el.contains(selection.getRangeAt(0).commonAncestorContainer)
    ) {
      savedRange = selection.getRangeAt(0).cloneRange();
      return;
    }
    if (savedRange && el.contains(savedRange.commonAncestorContainer)) {
      selection?.removeAllRanges();
      selection?.addRange(savedRange);
      el.focus();
      return;
    }
    focusEditorEnd();
  };

  // 只读地探测光标所在单元格，不产生聚焦等副作用。
  const currentCell = (): HTMLTableCellElement | null => {
    const el = editor.value;
    const selection = window.getSelection();
    if (!el || !selection || selection.rangeCount === 0) return null;
    let node: Node | null = selection.getRangeAt(0).startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    while (node && node !== el) {
      if (node instanceof HTMLTableCellElement) return node;
      node = node.parentNode;
    }
    return null;
  };

  const updateTableState = () => {
    inTable.value = Boolean(currentCell());
  };

  const ensureCell = () => {
    ensureSelection();
    return currentCell();
  };

  // 服务端只放行单个 text-align 声明，其余 style/class 一律剥离。编辑器不展示
  // 无法持久化的格式，否则用户看到的样式会在保存后消失。
  const ALIGN_STYLE =
    /^\s*text-align\s*:\s*(left|center|right|justify)\s*;?\s*$/i;

  const stripUnsupportedAttrs = () => {
    const el = editor.value;
    if (!el) return;
    el.querySelectorAll('[style], [class]').forEach((node) => {
      node.removeAttribute('class');
      const style = node.getAttribute('style') || '';
      const align = ALIGN_STYLE.exec(style);
      if (align) {
        node.setAttribute('style', `text-align: ${align[1].toLowerCase()}`);
      } else {
        node.removeAttribute('style');
      }
    });
  };

  const exec = (command: string, value?: string) => {
    if (props.disabled) return;
    ensureSelection();
    // 优先输出 b/i 等标签而非 <span style>，标签才能通过入库清洗。
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand(command, false, value);
    stripUnsupportedAttrs();
    sync();
    rememberSelection();
    updateTableState();
  };

  const insertHtml = (html: string) => {
    if (props.disabled) return;
    ensureSelection();
    document.execCommand('insertHTML', false, html);
    stripUnsupportedAttrs();
    sync();
    rememberSelection();
    updateTableState();
  };

  const pastePlainText = (event: ClipboardEvent) => {
    event.preventDefault();
    document.execCommand(
      'insertText',
      false,
      event.clipboardData?.getData('text/plain') || ''
    );
    sync();
    rememberSelection();
  };

  const onInput = () => {
    sync();
    rememberSelection();
  };

  const focusCell = (cell: HTMLElement | null | undefined) => {
    if (!cell) {
      focusEditorEnd();
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(cell);
    range.collapse(true);
    placeCaret(range);
    editor.value?.focus();
  };

  const afterTableChange = (cell?: HTMLElement | null) => {
    focusCell(cell);
    sync();
    updateTableState();
  };

  const cellTagFor = (row: HTMLTableRowElement, index: number) =>
    row.cells[index]?.tagName === 'TH' ? 'th' : 'td';

  const createCell = (tag: string) => {
    const cell = document.createElement(tag);
    cell.appendChild(document.createElement('br'));
    return cell;
  };

  const insertImage = async (
    selection: AttachmentResponse | AttachmentResponse[]
  ) => {
    const item = Array.isArray(selection) ? selection[0] : selection;
    if (!item?.mime_type?.startsWith('image/')) return;
    try {
      const access = await getAttachmentAccessInfo(item.id);
      if (!access.public) {
        Message.error('请选择公开图片附件');
        return;
      }
      const parsed = new URL(access.url, window.location.origin);
      const src = parsed.pathname.startsWith('/uploads/')
        ? parsed.pathname
        : access.url;
      insertHtml(
        `<img src="${escapeAttr(src)}" alt="${escapeAttr(
          item.original_name || ''
        )}">`
      );
    } catch {
      Message.error('无法获取图片访问地址');
    }
  };

  const insertTable = (rows: number, cols: number) => {
    if (props.disabled) return;
    ensureSelection();
    const el = editor.value;
    const selection = window.getSelection();
    if (!el || !selection || selection.rangeCount === 0) return;

    const table = document.createElement('table');
    const tbody = document.createElement('tbody');
    for (let r = 0; r < rows; r += 1) {
      const tr = document.createElement('tr');
      for (let c = 0; c < cols; c += 1) {
        tr.appendChild(createCell(r === 0 ? 'th' : 'td'));
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(table);

    // table 不能嵌在 p/h* 内，否则 innerHTML 序列化后重新解析会打乱结构。
    const block = table.parentElement;
    if (block && block !== el && /^(P|H[1-6])$/i.test(block.tagName)) {
      const isEmptyBlock =
        !block.textContent?.trim() && !block.querySelector('img, br');
      block.after(table);
      if (isEmptyBlock) block.remove();
    }

    pickerSize.value = null;
    afterTableChange(table.rows[0]?.cells[0] ?? null);
  };

  const insertRow = (where: 'above' | 'below') => {
    const cell = ensureCell();
    if (!cell) return;
    const row = cell.parentElement as HTMLTableRowElement | null;
    if (!row) return;
    const nextRow = document.createElement('tr');
    for (let i = 0; i < row.cells.length; i += 1) {
      nextRow.appendChild(createCell(cellTagFor(row, i)));
    }
    if (where === 'above') row.before(nextRow);
    else row.after(nextRow);
    afterTableChange(nextRow.cells[cell.cellIndex] ?? nextRow.cells[0]);
  };

  const insertColumn = (where: 'left' | 'right') => {
    const cell = ensureCell();
    if (!cell) return;
    const table = cell.closest('table');
    if (!table) return;
    const sourceIndex = cell.cellIndex;
    const targetIndex = where === 'left' ? sourceIndex : sourceIndex + 1;
    Array.from(table.rows).forEach((row) => {
      const newCell = createCell(cellTagFor(row, sourceIndex));
      const reference = row.cells[targetIndex];
      if (reference) row.insertBefore(newCell, reference);
      else row.appendChild(newCell);
    });
    afterTableChange(cell.closest('tr')?.cells[targetIndex] ?? cell);
  };

  const deleteRow = () => {
    const cell = ensureCell();
    if (!cell) return;
    const row = cell.parentElement as HTMLTableRowElement | null;
    const table = row?.closest('table');
    if (!row || !table) return;
    if (table.rows.length <= 1) {
      removeTable(table);
      return;
    }
    const columnIndex = cell.cellIndex;
    const fallback = (row.nextElementSibling ||
      row.previousElementSibling) as HTMLTableRowElement | null;
    row.remove();
    const target =
      fallback?.cells[Math.min(columnIndex, fallback.cells.length - 1)];
    afterTableChange(target ?? null);
  };

  const deleteColumn = () => {
    const cell = ensureCell();
    if (!cell) return;
    const table = cell.closest('table');
    const row = cell.closest('tr');
    if (!table || !row) return;
    if ((table.rows[0]?.cells.length || 0) <= 1) {
      removeTable(table);
      return;
    }
    const columnIndex = cell.cellIndex;
    const rowIndex = Array.from(table.rows).indexOf(row);
    Array.from(table.rows).forEach((item) => {
      item.cells[columnIndex]?.remove();
    });
    const targetRow = table.rows[Math.min(rowIndex, table.rows.length - 1)];
    afterTableChange(
      targetRow?.cells[Math.min(columnIndex, targetRow.cells.length - 1)] ??
        null
    );
  };

  const removeTable = (table?: HTMLTableElement | null) => {
    const target = table ?? ensureCell()?.closest('table');
    if (!target) return;
    target.remove();
    afterTableChange(null);
  };

  const handleSelectionChange = () => {
    updateTableState();
  };

  // img 的 error 事件不冒泡，只能在捕获阶段监听。加载失败时先自动重试一次
  // （服务重启、网络抖动这类一次性失败很常见），仍失败才提示用户。
  const retriedImages = new WeakSet<HTMLImageElement>();

  const handleImageError = (event: Event) => {
    const { target } = event;
    if (!(target instanceof HTMLImageElement)) return;
    const src = target.getAttribute('src');
    if (!retriedImages.has(target) && src) {
      retriedImages.add(target);
      // 先移除再写回，强制元素重新发起一次加载；最终属性值与原来一致，
      // 序列化结果不变，不会污染入库内容。
      target.removeAttribute('src');
      target.setAttribute('src', src);
      return;
    }
    Message.error(`图片加载失败：${src || ''}`);
  };

  onMounted(() => {
    if (editor.value) editor.value.innerHTML = props.modelValue || '';
    document.addEventListener('selectionchange', handleSelectionChange);
    editor.value?.addEventListener('error', handleImageError, true);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('selectionchange', handleSelectionChange);
    editor.value?.removeEventListener('error', handleImageError, true);
  });

  watch(
    () => props.modelValue,
    (value) => {
      const el = editor.value;
      if (!el) return;
      const next = value || '';
      // 自身输入的回声（父组件原样回传）绝不能回写 DOM。
      if (next === lastEmitted) return;
      if (next === el.innerHTML) return;
      el.innerHTML = next;
      savedRange = null;
    },
    { flush: 'post' }
  );

  defineExpose({ focus: () => editor.value?.focus() });
</script>

<script lang="ts">
  export default {
    name: 'RichTextEditor',
  };
</script>

<style lang="less" scoped>
  .rich-text-editor {
    width: 100%;
  }

  .rte-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-bottom: 8px;
  }

  .rte-toolbar-table {
    padding: 6px 8px;
    background-color: var(--color-fill-1);
    border-radius: 4px;
  }

  .rte-table-picker-row {
    display: flex;
  }

  .rte-table-picker-cell {
    width: 18px;
    height: 18px;
    margin: 1px;
    background-color: var(--color-fill-2);
    border: 1px solid var(--color-border-2);
    cursor: pointer;
  }

  .rte-table-picker-cell.is-active {
    background-color: rgb(var(--primary-1));
    border-color: rgb(var(--primary-6));
  }

  .rte-table-picker-label {
    margin-top: 6px;
    color: var(--color-text-3);
    font-size: 12px;
    text-align: center;
  }

  .rte-content {
    padding: 12px;
    overflow: auto;
    border: 1px solid var(--color-border-2);
    border-radius: 4px;
    outline: none;
  }

  .rte-content:focus {
    border-color: rgb(var(--primary-6));
  }

  .is-disabled .rte-content {
    color: var(--color-text-3);
    background-color: var(--color-fill-1);
    cursor: not-allowed;
  }

  // 内容由 innerHTML 动态写入，不带 scoped 属性，必须用 :deep 才能命中。
  .rte-content :deep(p) {
    margin: 0 0 8px;
  }

  .rte-content :deep(h2) {
    margin: 12px 0 8px;
    font-weight: 600;
    font-size: 18px;
  }

  .rte-content :deep(ul),
  .rte-content :deep(ol) {
    margin: 0 0 8px;
    padding-left: 22px;
  }

  .rte-content :deep(img) {
    max-width: 100%;
    height: auto;
    vertical-align: bottom;
  }

  .rte-content :deep(table) {
    width: 100%;
    margin: 8px 0;
    border-collapse: collapse;
  }

  .rte-content :deep(th),
  .rte-content :deep(td) {
    min-width: 48px;
    padding: 6px 8px;
    vertical-align: top;
    border: 1px solid var(--color-border-2);
  }

  .rte-content :deep(th) {
    font-weight: 600;
    background-color: var(--color-fill-2);
  }
</style>
