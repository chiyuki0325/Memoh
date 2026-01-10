# @memohome/cli

MemoHome 的命令行工具，使用 Elysia Eden 与 API 服务器通信。

## 功能特性

- 🔐 **用户认证** - 登录、登出、查看当前用户
- 👥 **用户管理** - 完整的用户 CRUD 操作（管理员）
- 🤖 **模型管理** - AI 模型配置管理
- 💬 **Agent 对话** - 与 AI Agent 进行对话，支持流式响应
- 🧠 **记忆管理** - 搜索、添加、查看对话记忆
- ⚙️ **设置管理** - 个性化配置
- 📅 **日程管理** - 定时任务管理

## 安装

```bash
# 在项目根目录
pnpm install

# 进入 CLI 目录
cd packages/cli
```

## 快速开始

### 1. 配置 API 地址（可选）

默认连接到 `http://localhost:7002`，如需修改：

```bash
bun run src/index.ts auth config --set http://your-api-url:port
```

### 2. 登录

```bash
bun run src/index.ts auth login
# 或直接提供用户名和密码
bun run src/index.ts auth login -u admin -p password
```

### 3. 开始使用

```bash
# 查看帮助
bun run src/index.ts --help

# 与 Agent 对话
bun run src/index.ts agent chat "你好"

# 进入交互模式
bun run src/index.ts agent interactive
```

## 命令参考

### 认证命令 (`auth`)

```bash
# 登录
memohome auth login [-u username] [-p password]

# 登出
memohome auth logout

# 查看当前登录用户
memohome auth whoami

# 查看/设置 API 配置
memohome auth config [--set <url>]
```

### 用户管理 (`user`) 🔒 需要管理员权限

```bash
# 列出所有用户
memohome user list

# 创建用户
memohome user create [-u username] [-p password] [-r role]

# 获取用户详情
memohome user get <id>

# 删除用户
memohome user delete <id>

# 更新用户密码
memohome user update-password <id> [-p password]
```

### 模型管理 (`model`)

```bash
# 列出所有模型
memohome model list

# 创建聊天模型配置
memohome model create \
  -n "GPT-4" \
  -m "gpt-4" \
  -u "https://api.openai.com/v1" \
  -k "sk-xxx" \
  -c "openai" \
  -t "chat"

# 创建 Embedding 模型配置
memohome model create \
  -n "Text Embedding 3 Small" \
  -m "text-embedding-3-small" \
  -u "https://api.openai.com/v1" \
  -k "sk-xxx" \
  -c "openai" \
  -t "embedding" \
  -d 1536

# 获取模型详情
memohome model get <id>

# 删除模型
memohome model delete <id>

# 查看默认模型配置
memohome model defaults
```

### Agent 对话 (`agent`)

```bash
# 发送单条消息
memohome agent chat "你好，介绍一下你自己" \
  [-t 60] \
  [-l Chinese]

# 进入交互模式
memohome agent interactive
memohome agent i  # 简写

# 交互模式命令:
#   /exit, /quit - 退出
#   /help - 帮助
```

### 记忆管理 (`memory`)

```bash
# 搜索记忆
memohome memory search "关键词" [-l 10]

# 添加记忆
memohome memory add "这是一条记忆"

# 查看消息历史
memohome memory messages [-p 1] [-l 20]
memohome memory msg  # 简写

# 按日期过滤消息
memohome memory filter \
  -s 2024-01-01T00:00:00Z \
  -e 2024-12-31T23:59:59Z
```

### 设置管理 (`settings`)

```bash
# 查看当前设置
memohome settings get

# 更新设置
memohome settings set \
  [--language Chinese] \
  [--max-context-time 60] \
  [--chat-model <id>] \
  [--summary-model <id>] \
  [--embedding-model <id>]

# 交互式设置向导
memohome settings setup
```

### 日程管理 (`schedule`)

```bash
# 列出所有定时任务
memohome schedule list

# 创建定时任务
memohome schedule create \
  -t "每日提醒" \
  -d "每天早上9点的提醒" \
  -c "0 9 * * *" \
  -e

# 获取任务详情
memohome schedule get <id>

# 更新任务
memohome schedule update <id> \
  [-t title] \
  [-d description] \
  [-c cron] \
  [-e true/false]

# 删除任务
memohome schedule delete <id>

# 切换任务启用状态
memohome schedule toggle <id>
```

## 使用示例

### 完整工作流程

```bash
# 1. 登录
memohome auth login -u admin -p password

# 2. 创建模型配置（聊天模型）
memohome model create \
  -n "GPT-4" \
  -m "gpt-4" \
  -u "https://api.openai.com/v1" \
  -k "your-api-key" \
  -c "openai" \
  -t "chat"

# 如果需要 embedding 模型
memohome model create \
  -n "Text Embedding" \
  -m "text-embedding-3-small" \
  -u "https://api.openai.com/v1" \
  -k "your-api-key" \
  -c "openai" \
  -t "embedding" \
  -d 1536

# 3. 配置设置（使用模型ID）
memohome settings set \
  --language Chinese \
  --max-context-time 60 \
  --chat-model <model-id-from-step-2>

# 4. 开始对话
memohome agent chat "你好"

# 5. 进入交互模式
memohome agent i
```

### Agent 交互模式示例

```bash
$ memohome agent interactive

🤖 MemoHome Agent 交互模式
输入 /exit 或 /quit 退出，输入 /help 查看帮助

You: 你好
Agent: 你好！我是 MemoHome AI 助手，很高兴为你服务...

You: 帮我总结一下今天的对话
Agent: [🔧 使用工具: search_memory]
根据我们的对话记录...

You: /exit
再见！👋
```

### 搜索记忆示例

```bash
$ memohome memory search "项目计划"

✓ 找到 3 条记忆

[1] 相似度: 92.50%
时间: 2024-01-15 10:30:00
讨论了项目的初步计划和时间线...

[2] 相似度: 85.20%
时间: 2024-01-14 15:20:00
确定了项目的主要里程碑...

[3] 相似度: 78.90%
时间: 2024-01-13 09:00:00
项目启动会议记录...
```

## 配置文件

CLI 配置保存在 `~/.memohome/config.json`：

```json
{
  "apiUrl": "http://localhost:7002",
  "token": "your_jwt_token"
}
```

## 开发

```bash
# 开发模式（带热重载）
pnpm run dev

# 直接运行
pnpm run start
```

## 技术栈

- **Bun** - JavaScript 运行时
- **Elysia Eden** - 类型安全的 HTTP 客户端
- **Commander** - 命令行参数解析
- **Chalk** - 终端颜色输出
- **Inquirer** - 交互式提示
- **Ora** - 加载动画
- **Table** - 表格输出

## 注意事项

1. **认证要求**: 大部分命令需要先登录
2. **管理员权限**: 用户管理命令需要管理员角色
3. **模型配置**: 使用 Agent 前需要配置模型
4. **流式响应**: Agent 对话使用 SSE 流式传输

## 相关文档

- [API 文档](../api/README.md)
- [认证系统](../api/AUTH_README.md)
- [Agent API](../api/AGENT_API.md)
- [用户管理](../api/USER_MANAGEMENT.md)

## 许可证

MIT
