const multer = require('multer');
const path = require('path');

const ALLOWED_MIMES = ['image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 20;

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件格式: ${file.mimetype}，仅支持 JPG 和 PNG`));
  }
};

const baseConfig = {
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
};

// 单张上传
const uploadSingle = multer(baseConfig).single('image');

// 批量上传
const uploadBatch = multer(baseConfig).array('images', MAX_FILES);

module.exports = { uploadSingle, uploadBatch, MAX_FILE_SIZE, MAX_FILES };
