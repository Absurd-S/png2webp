const express = require('express');
const path = require('path');
const convertRoutes = require('./routes/convert');

const app = express();

// 静态文件服务
app.use(express.static(path.join(__dirname, '..', 'public')));

// API 路由
app.use('/api', convertRoutes);

// 404 处理
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API 端点不存在' });
  }
  res.status(404).send('页面不存在');
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

module.exports = app;
