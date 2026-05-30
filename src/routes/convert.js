const express = require('express');
const path = require('path');
const fs = require('fs');
const { ZipArchive } = require('archiver');
const router = express.Router();

const { uploadSingle, uploadBatch } = require('../middleware/upload');
const { convertOne, convertBatch } = require('../services/converter');

// 健康检查
router.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// 单张转换
router.post('/convert/single', (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err) return handleUploadError(err, res);

    const { quality, lossless } = parseOptions(req.body);

    if (!req.file) {
      return res.status(400).json({ error: '请选择一张图片' });
    }

    convertOne(req.file.path, { quality, lossless })
      .then((result) => {
        res.attachment(result.outputPath);
        res.sendFile(result.outputPath, () => {
          cleanup([req.file.path, result.outputPath]);
        });
      })
      .catch((err) => {
        cleanup([req.file.path]);
        console.error('转换失败:', err);
        res.status(500).json({ error: `转换失败: ${err.message}` });
      });
  });
});

// 批量转换
router.post('/convert/batch', (req, res, next) => {
  uploadBatch(req, res, async (err) => {
    if (err) return handleUploadError(err, res);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '请至少选择一张图片' });
    }

    const { quality, lossless } = parseOptions(req.body);
    const tempPaths = [];

    try {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="converted-webp.zip"');

      const archive = new ZipArchive({ zlib: { level: 5 } });
      archive.pipe(res);

      for (const file of req.files) {
        try {
          const result = await convertOne(file.path, { quality, lossless });
          tempPaths.push(result.outputPath);
          const zipName = path.basename(file.originalname, path.extname(file.originalname)) + '.webp';
          archive.file(result.outputPath, { name: zipName });
        } catch (err) {
          console.error(`转换 ${file.originalname} 失败:`, err);
          // 在 ZIP 中添加错误说明文件替代
          const errorName = path.basename(file.originalname, path.extname(file.originalname)) + '-error.txt';
          archive.append(`转换失败: ${err.message}`, { name: errorName });
        }
      }

      await archive.finalize();

      // 清理所有临时文件
      res.on('close', () => {
        const allPaths = req.files.map(f => f.path).concat(tempPaths);
        cleanup(allPaths);
      });
    } catch (err) {
      const allPaths = req.files.map(f => f.path).concat(tempPaths);
      cleanup(allPaths);
      console.error('批量转换失败:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: `批量转换失败: ${err.message}` });
      }
    }
  });
});

// 解析质量参数
function parseOptions(body) {
  const quality = body.quality ? Math.max(1, Math.min(100, parseInt(body.quality, 10))) : 80;
  const lossless = body.lossless === 'true' || body.lossless === true;
  return { quality, lossless };
}

// 处理 multer 上传错误
function handleUploadError(err, res) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: '文件过大，最大支持 50MB' });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: '文件数量超过限制，最多 20 张' });
  }
  if (err.message && err.message.includes('不支持的文件格式')) {
    return res.status(400).json({ error: err.message });
  }
  console.error('上传错误:', err);
  res.status(500).json({ error: '上传失败' });
}

// 清理临时文件
function cleanup(paths) {
  for (const p of paths) {
    if (p) {
      fs.unlink(p, () => {});
    }
  }
}

module.exports = router;
