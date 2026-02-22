ㄇ#!/usr/bin/env node
/**
 * 启动编译后的后端服务器
 * 编译后的 index.js 已经包含了完整的启动逻辑
 */

require('dotenv').config({ path: '.env.production' });
require('dotenv').config();

// 直接加载编译后的后端代码 - 它已经有启动逻辑
require('./dist-backend/index.js');
