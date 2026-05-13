# 八字命理 · AI 解读

基于八字排盘算法 + DeepSeek 大模型的命理解读应用，支持局域网共享，所有记录持久化存储。

<img width="2634" height="1392" alt="ScreenShot_2026-05-13_212537_528" src="https://github.com/user-attachments/assets/80200ac4-a676-4b39-afab-9734b2ac3c23" />


## 功能特点

- **八字排盘**：自动计算年柱、月柱、日柱、时柱，含十神、藏干、五行配色
- **大运推算**：自动判断顺逆行，显示起运年龄及每步大运对应的公历年份
- **AI 深度解读**：排盘后自动调用 DeepSeek 进行首次综合分析
- **话题标签**：命格总论 / 事业财运 / 婚姻感情 / 健康运势 / 当前大运，按需生成专项分析
- **多轮对话**：可持续追问，上下文完整保留
- **快捷问题**：预设常用问题一键发送
- **历史记录**：所有排盘与对话持久化保存，随时回顾
- **局域网共享**：服务监听 `0.0.0.0`，同一网络内其他设备可直接访问

## 界面预览

三栏布局：左侧历史记录 · 中间命盘图表 · 右侧 AI 对话

- 命盘区：四柱以五行颜色标注，十神一目了然，大运横向时间轴
- 对话区：Markdown 渲染，结构清晰，支持继续追问

## 快速开始

**1. 克隆项目**

```bash
git clone https://github.com/chenpipi0807/8zi.git
cd 8zi
```

**2. 安装依赖**

```bash
npm install
```

**3. 配置 API Key**

复制 `.env.example` 为 `.env`，填入你的 DeepSeek API Key：

```bash
cp .env.example .env
```

编辑 `.env`：

```
DEEPSEEK_API_KEY=sk-你的密钥
PORT=3000
```

> DeepSeek API Key 申请地址：https://platform.deepseek.com

**4. 启动服务**

```bash
node server.js
```

浏览器访问 `http://localhost:3000`

**局域网访问**：查看本机 IP（`ipconfig` / `ifconfig`），局域网内其他设备访问 `http://<本机IP>:3000`

## 技术栈

| 层级 | 技术 |
|------|------|
| 服务端 | Node.js + Express |
| 数据存储 | JSON 文件（`data.json`，自动生成） |
| AI 接口 | DeepSeek API（`deepseek-v4-flash`） |
| 前端 | 原生 HTML + CSS + JavaScript |
| Markdown | marked.js |

## 项目结构

```
8zi/
├── server.js          # 服务端入口，API 路由
├── package.json
├── .env.example       # 环境变量模板
├── .gitignore
└── public/
    └── index.html     # 完整前端（算法 + UI 合并单文件）
```

## 注意事项

- `data.json` 包含所有历史记录，已加入 `.gitignore`，不会上传
- `.env` 含有 API 密钥，已加入 `.gitignore`，请勿手动提交
- 节气计算精度约 ±1 天，极少数边界日期可能有误差

## License

MIT
