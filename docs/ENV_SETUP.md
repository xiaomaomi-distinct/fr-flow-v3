# 运行环境搭建

## 一、帆软设计器

### 1.1 安装

FineReport 11.0 下载安装（略）。

### 1.2 启动报表服务

打开设计器 → 服务器 → 报表平台管理。

不启动此服务，`/api/data` 和 `/api/report` 接口不可用。

### 1.3 配置数据连接

在帆软设计器中配置 JDBC 数据连接：
- 连接名：建议与数据库名一致（如 `common_db`）
- 驱动：`com.mysql.cj.jdbc.Driver`
- URL：`jdbc:mysql://localhost:3306/common_db?useUnicode=true&characterEncoding=utf8`
- 此连接供数据层 CPT 的数据集使用

### 1.4 配置全局参数（如需要权限控制）

在帆软后台 → 全局参数中配置：
- `dept_id`：当前用户部门 ID
- `file_upload_dir_new`：SFTP 文件上传目录
- `file_service_ip_new`：文件服务 IP 地址

---

## 二、antd 静态资源部署

展示层 CPT 页面依赖 React、antd、dayjs，这些库必须以静态文件形式放在帆软的 webroot 下。

### 2.1 目标目录

```
FineReport/webapps/webroot/help/lib/antd/
├── react.min.js        # React 18.3.1 UMD
├── react-dom.min.js    # ReactDOM 18.3.1 UMD
├── dayjs.min.js        # dayjs 1.11.x UMD
├── antd.min.js         # antd 5.21.0 UMD
├── antd.min.css        # antd 5.21.0 CSS
└── icons/              # antd 图标 SVG
    ├── outlined/         # 线性图标
    ├── filled/           # 填充图标
    └── twotone/          # 双色图标
```

### 2.2 下载方式

#### React + ReactDOM + dayjs（unpkg CDN）

```bash
WEBROOT=/path/to/FineReport/webapps/webroot
mkdir -p $WEBROOT/help/lib/antd

# React
curl -o $WEBROOT/help/lib/antd/react.min.js \
  https://unpkg.com/react@18.3.1/umd/react.production.min.js

# ReactDOM
curl -o $WEBROOT/help/lib/antd/react-dom.min.js \
  https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js

# dayjs
curl -o $WEBROOT/help/lib/antd/dayjs.min.js \
  https://unpkg.com/dayjs@1.11.13/dayjs.min.js
```

#### antd（unpkg CDN）

```bash
# antd JS
curl -o $WEBROOT/help/lib/antd/antd.min.js \
  https://unpkg.com/antd@5.21.0/dist/antd.min.js

# antd CSS
curl -o $WEBROOT/help/lib/antd/antd.min.css \
  https://unpkg.com/antd@5.21.0/dist/antd.min.css
```

#### antd 图标 SVG

图标通过运行时从 `/webroot/help/lib/antd/icons/` 同步拉取 SVG 文件。安装方式：

```bash
# 从 npm 下载 @ant-design/icons-svg 包
cd /tmp
npm pack @ant-design/icons-svg
tar -xzf ant-design-icons-svg-*.tgz

# 复制 SVG 到帆软 webroot
cp -r package/inline-svg/outlined $WEBROOT/help/lib/antd/icons/
cp -r package/inline-svg/filled $WEBROOT/help/lib/antd/icons/
cp -r package/inline-svg/twotone $WEBROOT/help/lib/antd/icons/
```

> **为什么不能 CDN 直接引用**：antd icons 的 UMD 格式（`antd-icons.min.js`）在 FineReport 环境中无法正常挂载到 window，且 display-dev 脚手架使用的 `icon('名字')` 函数通过同步 XHR 拉取单个 SVG 文件，不依赖全局 `antdIcons` 变量。

### 2.3 验证

浏览器访问以下 URL，确认能直接下载到文件：

```
http://localhost:18080/help/lib/antd/antd.min.js
http://localhost:18080/help/lib/antd/antd.min.css
http://localhost:18080/help/lib/antd/icons/outlined/home.svg
```

---

## 三、MySQL 环境

### 3.1 安装

MySQL 5.7+ 或 8.0+。

### 3.2 创建数据库

```sql
CREATE DATABASE IF NOT EXISTS common_db
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
```

### 3.3 配置 FR 数据连接

在帆软设计器中：
1. 服务器 → 定义数据连接
2. 新建 JDBC 连接
3. 数据库选 MySQL
4. 填写连接信息（与 `.fr.yaml` 中一致）

---

## 四、Python 环境

### 4.1 安装

Python 3.8+。

工具链（`data_writer.py` / `display_writer.py`）只使用标准库，**无需 `pip install`**。

### 4.2 Windows 注意事项

Windows 终端默认编码为 GBK，`display_writer.py` 输出的 Unicode 符号可能导致报错。解决：

```powershell
# PowerShell
$env:PYTHONIOENCODING = "utf-8"

# CMD
set PYTHONIOENCODING=utf-8
```

建议将 `PYTHONIOENCODING=utf-8` 加入系统环境变量。

---

## 五、Node.js 环境

### 5.1 安装

Node.js 18+ 即可。

### 5.2 安装 api_tester 依赖

```bash
cd "$FR_WORKSPACE/foundation/tools/api_tester"
npm install
npx playwright install chromium
```

**注意**：
- `npx playwright install chromium` 下载浏览器二进制（约 300MB），只需执行一次
- Windows 下如遇 `require('playwright')` 找不到，设置：`set NODE_PATH=%AppData%\npm\node_modules`

---

## 六、环境自检清单

全部完成后，逐项确认：

- [ ] 帆软设计器已启动，报表平台管理可访问
- [ ] 浏览器打开 `http://localhost:18080/help/lib/antd/antd.min.js` 能下载到文件
- [ ] 浏览器打开 `http://localhost:18080/help/lib/antd/icons/outlined/home.svg` 能看到图标
- [ ] MySQL 可连接：`mysql -h localhost -u root -p common_db`
- [ ] `python3 --version` ≥ 3.8
- [ ] `node --version` ≥ 18
- [ ] api_tester 依赖已安装：`ls "$FR_WORKSPACE/foundation/tools/api_tester/node_modules/playwright"`
- [ ] `.fr.yaml` 已配置并运行过 `sync_env.sh`
- [ ] settings.json 已配置 env + PreToolUse Hook
- [ ] 公共 CPT 已部署到 reportlets
