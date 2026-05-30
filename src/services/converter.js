const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', '..', 'outputs');

/**
 * 转换单张图片为 WebP
 * @param {string} inputPath - 输入文件路径
 * @param {object} options
 * @param {number} options.quality - 质量 1-100 (默认 80)
 * @param {boolean} options.lossless - 无损模式 (默认 false)
 * @returns {Promise<{inputSize: number, outputSize: number, outputPath: string}>}
 */
async function convertOne(inputPath, { quality = 80, lossless = false } = {}) {
  const inputStats = await fs.stat(inputPath);
  const inputName = path.basename(inputPath, path.extname(inputPath));
  const outputName = inputName + '.webp';
  const outputPath = path.join(OUTPUT_DIR, outputName);

  // 处理同名文件
  let finalPath = outputPath;
  let counter = 1;
  while (true) {
    try {
      await fs.access(finalPath);
      finalPath = path.join(OUTPUT_DIR, `${inputName}-${counter}.webp`);
      counter++;
    } catch {
      break;
    }
  }

  const sharpOptions = { lossless };
  if (!lossless) {
    sharpOptions.quality = Math.max(1, Math.min(100, quality));
  }

  await sharp(inputPath).webp(sharpOptions).toFile(finalPath);

  const outputStats = await fs.stat(finalPath);

  return {
    inputSize: inputStats.size,
    outputSize: outputStats.size,
    outputPath: finalPath,
  };
}

/**
 * 批量转换图片
 * @param {Array<{path: string, originalname: string}>} files
 * @param {object} options
 * @returns {Promise<Array<object>>}
 */
async function convertBatch(files, options) {
  const results = [];
  for (const file of files) {
    try {
      const result = await convertOne(file.path, options);
      results.push({
        originalname: file.originalname,
        success: true,
        ...result,
      });
    } catch (err) {
      results.push({
        originalname: file.originalname,
        success: false,
        error: err.message,
      });
    }
  }
  return results;
}

module.exports = { convertOne, convertBatch };
