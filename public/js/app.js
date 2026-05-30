(function () {
  'use strict';

  // ============ DOM 引用 ============
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const qualitySlider = document.getElementById('qualitySlider');
  const qualityValue = document.getElementById('qualityValue');
  const losslessCheck = document.getElementById('losslessCheck');
  const convertBtn = document.getElementById('convertBtn');
  const clearBtn = document.getElementById('clearBtn');
  const fileListSection = document.getElementById('fileListSection');
  const fileTableBody = document.getElementById('fileTableBody');
  const fileCount = document.getElementById('fileCount');
  const batchDownloadArea = document.getElementById('batchDownloadArea');
  const downloadAllBtn = document.getElementById('downloadAllBtn');
  const statsBar = document.getElementById('statsBar');
  const totalFiles = document.getElementById('totalFiles');
  const successCount = document.getElementById('successCount');
  const failCount = document.getElementById('failCount');
  const statsSize = document.getElementById('statsSize');
  const copyStatsBtn = document.getElementById('copyStatsBtn');
  const previewModal = document.getElementById('previewModal');
  const modalClose = document.getElementById('modalClose');
  const modalTitle = document.getElementById('modalTitle');
  const previewOriginal = document.getElementById('previewOriginal');
  const previewOriginalSize = document.getElementById('previewOriginalSize');
  const previewConverted = document.getElementById('previewConverted');
  const previewConvertedSize = document.getElementById('previewConvertedSize');
  const toast = document.getElementById('toast');
  const presetBtns = document.querySelectorAll('.preset-btn');

  // ============ 状态 ============
  /** @type {Map<string, {id: string, file: File, originalSize: number, thumbnailUrl: string, status: string, convertedBlob: Blob|null, convertedSize: number|null, error: string|null}>} */
  let fileState = new Map();
  let converting = false;
  let zipBlob = null; // 服务端返回的 ZIP

  // ============ 工具函数 ============
  function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    if (!bytes || bytes < 0) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function showToast(msg, type) {
    toast.textContent = msg;
    toast.className = 'toast toast-' + (type || 'info');
    toast.style.display = 'block';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(function () { toast.style.display = 'none'; }, 3000);
  }

  // ============ 文件管理 ============
  function addFiles(files) {
    var added = 0, skipped = 0;
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (fileState.size >= 20) { skipped++; continue; }
      if (f.type !== 'image/jpeg' && f.type !== 'image/png') { skipped++; continue; }
      var id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      fileState.set(id, {
        id: id,
        file: f,
        originalSize: f.size,
        thumbnailUrl: URL.createObjectURL(f),
        status: 'pending',
        convertedBlob: null,
        convertedSize: null,
        error: null,
      });
      added++;
    }
    if (added > 0) renderFileList();
    if (skipped > 0) showToast('已跳过 ' + skipped + ' 个不支持或超限的文件', 'info');
  }

  function clearFiles() {
    fileState.forEach(function (f) { URL.revokeObjectURL(f.thumbnailUrl); });
    fileState.clear();
    zipBlob = null;
    renderFileList();
    updateStats();
  }

  // ============ 渲染 ============
  function renderFileList() {
    fileTableBody.innerHTML = '';
    if (fileState.size === 0) {
      fileListSection.style.display = 'none';
      convertBtn.disabled = true;
      return;
    }
    fileListSection.style.display = 'block';
    fileCount.textContent = fileState.size;
    convertBtn.disabled = converting;

    fileState.forEach(function (f) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><img class="thumbnail" src="' + f.thumbnailUrl + '" alt="" title="点击对比预览"></td>' +
        '<td><span class="file-name">' + escapeHtml(f.file.name) + '</span></td>' +
        '<td><span class="size-original">' + formatSize(f.originalSize) + '</span></td>' +
        '<td>' + renderStatusCell(f) + '</td>' +
        '<td>' + renderActionCell(f) + '</td>';
      // 点击缩略图预览
      var thumb = tr.querySelector('.thumbnail');
      thumb.addEventListener('click', function () { openPreview(f); });
      thumb.style.cursor = 'pointer';
      fileTableBody.appendChild(tr);
    });

    // 批量下载区域
    batchDownloadArea.style.display = hasConverted() ? 'block' : 'none';
  }

  function renderStatusCell(f) {
    switch (f.status) {
      case 'converting': return '<span class="status-badge status-converting">转换中...</span>';
      case 'done': return '<span class="converted-size">' + formatSize(f.convertedSize) + '</span>';
      case 'fail': return '<span class="status-badge status-fail" title="' + escapeHtml(f.error || '') + '">失败</span>';
      default: return '<span class="status-badge status-pending">等待中</span>';
    }
  }

  function renderActionCell(f) {
    if (f.status === 'done') {
      return '<button class="btn-download-single" data-id="' + f.id + '">⬇ 下载</button>';
    }
    if (f.status === 'fail') {
      return '<button class="btn-download-single" data-id="' + f.id + '" disabled title="' + escapeHtml(f.error || '') + '">✕</button>';
    }
    return '<button class="btn-download-single" disabled>—</button>';
  }

  function hasConverted() {
    var converted = false;
    fileState.forEach(function (f) { if (f.status === 'done') converted = true; });
    return converted;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ============ 设置控制 ============
  function updateSliderBg() {
    var val = qualitySlider.value;
    var pct = ((val - 10) / 90) * 100;
    qualitySlider.style.background = 'linear-gradient(to right, #d4785c 0%, #d4785c ' + pct + '%, #eee ' + pct + '%, #eee 100%)';
  }

  qualitySlider.addEventListener('input', function () {
    qualityValue.textContent = this.value;
    updateSliderBg();
    updatePresetActive(this.value);
  });

  losslessCheck.addEventListener('change', function () {
    qualitySlider.disabled = this.checked;
    qualitySlider.style.opacity = this.checked ? '0.4' : '1';
  });

  presetBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var q = parseInt(this.dataset.quality);
      qualitySlider.value = q;
      qualityValue.textContent = q;
      updateSliderBg();
      updatePresetActive(q);
    });
  });

  function updatePresetActive(q) {
    presetBtns.forEach(function (btn) {
      btn.classList.toggle('active', parseInt(btn.dataset.quality) === parseInt(q));
    });
  }

  // ============ 拖拽上传 ============
  dropZone.addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    if (this.files.length > 0) addFiles(this.files);
    this.value = '';
  });

  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', function (e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  });

  // 支持页面级拖拽
  document.addEventListener('dragover', function (e) { e.preventDefault(); });
  document.addEventListener('drop', function (e) { e.preventDefault(); });

  // ============ 转换 ============
  convertBtn.addEventListener('click', startConversion);

  async function startConversion() {
    if (converting || fileState.size === 0) return;
    converting = true;
    convertBtn.textContent = '转换中...';
    convertBtn.disabled = true;
    zipBlob = null;

    // 所有文件标记为 converting
    fileState.forEach(function (f) { f.status = 'converting'; f.convertedBlob = null; f.convertedSize = null; f.error = null; });
    renderFileList();

    // 构建 FormData
    var formData = new FormData();
    fileState.forEach(function (f) { formData.append('images', f.file, f.file.name); });
    formData.append('quality', qualitySlider.value);
    formData.append('lossless', losslessCheck.checked);

    try {
      var resp = await fetch('/api/convert/batch', { method: 'POST', body: formData });
      if (!resp.ok) {
        var errData = await resp.json().catch(function () { return { error: '服务器错误 (' + resp.status + ')' }; });
        throw new Error(errData.error || '服务器错误');
      }

      zipBlob = await resp.blob();

      // 使用 JSZip 解压获取各文件
      var zip = await JSZip.loadAsync(zipBlob);
      var extracted = new Map();
      var zipFiles = Object.keys(zip.files);

      // 匹配文件：将 ZIP 条目名与原始文件名匹配
      for (var k = 0; k < zipFiles.length; k++) {
        var entryName = zipFiles[k];
        var zipEntry = zip.files[entryName];
        if (zipEntry.dir) continue;
        var blob = await zipEntry.async('blob');
        // 去掉扩展名匹配
        var baseName = entryName.replace(/\.webp$/i, '').replace(/-error\.txt$/i, '');
        var isError = entryName.endsWith('-error.txt');

        fileState.forEach(function (f) {
          var origBase = f.file.name.replace(/\.(jpg|jpeg|png)$/i, '');
          if (origBase === baseName) {
            if (isError) {
              f.status = 'fail';
              // 读取错误文本
              var reader = new FileReader();
              reader.onload = function () { f.error = reader.result; renderFileList(); };
              reader.readAsText(blob);
            } else {
              f.status = 'done';
              f.convertedBlob = blob;
              f.convertedSize = blob.size;
            }
          }
        });
      }

      // 检查是否有未匹配的文件（标记为失败）
      fileState.forEach(function (f) {
        if (f.status === 'converting') {
          f.status = 'fail';
          f.error = '转换结果未找到';
        }
      });

    } catch (err) {
      console.error('转换失败:', err);
      fileState.forEach(function (f) {
        if (f.status === 'converting') { f.status = 'fail'; f.error = err.message; }
      });
      showToast('转换失败: ' + err.message, 'error');
    }

    converting = false;
    convertBtn.textContent = '开始转换';
    convertBtn.disabled = false;
    renderFileList();
    updateStats();
  }

  // ============ 下载 ============
  fileTableBody.addEventListener('click', function (e) {
    var btn = e.target.closest('.btn-download-single');
    if (!btn) return;
    var id = btn.dataset.id;
    var f = fileState.get(id);
    if (!f || !f.convertedBlob) return;
    downloadBlob(f.convertedBlob, f.file.name.replace(/\.(jpg|jpeg|png)$/i, '') + '.webp');
  });

  downloadAllBtn.addEventListener('click', function () {
    if (zipBlob) {
      downloadBlob(zipBlob, 'converted-webp.zip');
    }
  });

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ============ 统计 ============
  function updateStats() {
    var total = 0, succ = 0, fail = 0, origSize = 0, convSize = 0;
    fileState.forEach(function (f) {
      total++;
      origSize += f.originalSize;
      if (f.status === 'done') { succ++; convSize += f.convertedSize; }
      if (f.status === 'fail') fail++;
    });
    if (total === 0) {
      statsBar.style.display = 'none';
      return;
    }
    statsBar.style.display = 'flex';
    totalFiles.textContent = total;
    successCount.textContent = succ;
    failCount.textContent = fail;

    if (succ > 0 && origSize > 0) {
      var ratio = ((1 - convSize / origSize) * 100).toFixed(1);
      statsSize.textContent = '原始 ' + formatSize(origSize) + ' → 转换后 ' + formatSize(convSize) + '（节省 ' + ratio + '%）';
    } else {
      statsSize.textContent = '原始 ' + formatSize(origSize);
    }
  }

  // ============ 预览模态框 ============
  function openPreview(f) {
    modalTitle.textContent = f.file.name;
    previewOriginal.src = f.thumbnailUrl;
    previewOriginalSize.textContent = '原始大小: ' + formatSize(f.originalSize);
    if (f.convertedBlob) {
      previewConverted.src = URL.createObjectURL(f.convertedBlob);
      previewConvertedSize.textContent = '转换后: ' + formatSize(f.convertedSize);
    } else {
      previewConverted.src = '';
      previewConvertedSize.textContent = f.status === 'pending' ? '尚未转换' : (f.error || '转换失败');
    }
    previewModal.style.display = 'flex';
  }

  modalClose.addEventListener('click', function () { previewModal.style.display = 'none'; });
  previewModal.addEventListener('click', function (e) {
    if (e.target === previewModal) previewModal.style.display = 'none';
  });

  // ============ 清空 ============
  clearBtn.addEventListener('click', clearFiles);

  // ============ 复制统计 ============
  copyStatsBtn.addEventListener('click', function () {
    var text = statsSize.textContent;
    if (!text) return;
    navigator.clipboard.writeText(text).then(function () {
      showToast('已复制到剪贴板', 'success');
    }).catch(function () {
      showToast('复制失败', 'error');
    });
  });

  // ============ 键盘快捷键 ============
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!converting && fileState.size > 0) startConversion();
    }
  });

  // ============ 初始化 ============
  updateSliderBg();
})();
