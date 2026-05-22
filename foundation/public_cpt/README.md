# 公共组件 CPT

内置完整功能的可复用模板，业务开发直接引用，无需重复建设。

## 组件清单

| 目录 | 说明 | 文档 |
|------|------|------|
| `api/api_agent.cpt` | 外部 API 代理模板（Type B 项目通用） | [ASSETS.md](../../shared/KNOWLEDGE/ASSETS.md) |
| `api/api_tester.cpt` | 数据层接口验证工具（data-dev 专用） | [ASSETS.md](../../shared/KNOWLEDGE/ASSETS.md) |
| `sftp_file_overlay/` | 附件管理加壳版（antd UI + 原生上传） | [ASSETS.md](../../shared/KNOWLEDGE/ASSETS.md) |
| `sftp_file/` | 附件管理原始版（FR 原生控件，参考用） | [ASSETS.md](../../shared/KNOWLEDGE/ASSETS.md) |
| `api_rs/` | API 响应处理器（loading + 结果展示） | [ASSETS.md](../../shared/KNOWLEDGE/ASSETS.md) |

## 部署

```bash
cp -r "$FR_WORKSPACE/foundation/public_cpt/"* "$FR_REPORTLETS/public_cpt/"
mkdir -p "$FR_REPORTLETS/api"
cp "$FR_WORKSPACE/foundation/public_cpt/api/"*.cpt "$FR_REPORTLETS/api/"
```

详见 [`docs/PUBLIC_CPT.md`](../../docs/PUBLIC_CPT.md)。
