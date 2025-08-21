---
title: "🐱 暖猫 (Cuddle Cat) - AI 情感陪伴应用"
summary: "**个人完全独立开发**的 AI 情感陪伴移动应用。独立完成 Flutter 前端、FastAPI 后端架构设计与实现，集成 DeepSeek 大语言模型，从UI设计到AI算法优化全栈开发，为用户提供温暖的情感支持和个性化建议。"
links:
  - type: site
    url: https://github.com/miaowumiaomiaowu/cuddle_cat-AI-app
    name: GitHub 仓库

tags:
  - Flutter
  - FastAPI
  - AI 应用
  - 心理健康
  - 移动开发
  - DeepSeek
date: '2024-02-20'
featured: true
---

# 🐱 暖猫 (Cuddle Cat) - AI 情感陪伴应用

## 项目概述

**暖猫** 是一款基于 AI 分析能力的 Flutter 移动应用，专注于"情绪记录 × 温和陪伴 × 轻量建议"的心理健康理念。应用通过可爱的猫咪助手形象，为用户提供温暖的情感支持和个性化的幸福建议。

- **开发者**: 韩嘉仪 (Han Jiayi)
- **技术栈**: Flutter + FastAPI + DeepSeek AI
- **项目类型**: 个人开发的心理健康移动应用
- **GitHub**: [miaowumiaomiaowu/cuddle_cat-AI-app](https://github.com/miaowumiaomiaowu)

## 核心特性

### 🤖 AI 智能功能

#### 智能对话与陪伴
- **个性化回复**: 基于 DeepSeek 模型的 AI 猫咪助手，能够理解用户情绪状态和个人偏好
- **上下文记忆**: 记住用户分享的经历、喜好和困扰，提供连续性对话体验
- **情绪感知**: 实时识别用户心情状态，调整对话风格和建议方向

#### 个性化建议系统
- **智能礼物推荐**: 结合心情记录、兴趣偏好推荐适合的幸福清单
- **健康计划定制**: 根据生活习惯和目标制定个性化幸福提升计划
- **情境感知建议**: 考虑时间、地点、天气等因素提供贴合当下的温和建议

#### 情绪分析与洞察
- **深度情绪理解**: 识别基础情绪并分析情绪背后的原因和模式
- **趋势预测**: 基于历史数据预测情绪变化，提前给出关怀提醒
- **个人画像构建**: 持续学习用户情绪特点，构建专属心理健康档案

### 🌟 核心功能模块

#### 💬 沉浸式聊天
- 温和的猫咪助手对话界面
- 智能记忆系统，记录用户重要信息
- 可解释的建议理由和反馈机制
- 支持离线模式和在线 AI 增强模式

#### 📈 情绪记录与洞察
- 快速心情记录和详细情绪标记
- 情绪强度、标签、备注的细粒度记录
- 趋势分析、分布统计、7天完成率追踪
- 积极/消极情绪占比分析

#### 🎯 幸福清单与温和建议
- 基于当前情绪状态生成个性化建议
- 包含预计时长、类别和推荐理由的卡片式展示
- "小步快走"的行动建议，避免强迫性任务
- 用户反馈系统用于优化后续建议


## 技术架构

### 前端 (Flutter)
```yaml
核心依赖:
- Flutter 3.x + Dart 3.6+
- Provider 状态管理
- 主要组件:
  - shared_preferences: 本地数据存储
  - http + dio: 网络请求
  - fl_chart: 数据可视化图表
  - sqflite: 本地数据库
  - lottie: 动画效果
  - flutter_local_notifications: 推送通知
```

### 后端 (FastAPI)
```python
主要特性:
- FastAPI 异步 Web 框架
- SQLite + 轻量向量索引
- DeepSeek API 集成
- 记忆检索和学习优化系统
```

#### API 端点
- `GET /health` - 健康检查
- `POST /chat/reply` - AI 对话回复
- `POST /recommend/gifts` - 幸福清单推荐
- `POST /recommend/wellness-plan` - 健康计划生成
- `POST /memory/upsert` - 记忆存储
- `POST /memory/query` - 记忆查询
- `POST /feedback` - 用户反馈
- `GET /analytics/stats` - 数据分析
- `POST /analytics/predict-mood` - 情绪预测
- `GET /metrics` - 系统指标监控

### 设计系统
- **ArtisticTheme**: 柔和绿色系配色方案
- **圆角设计**: 温和友好的界面风格
- **温和动效**: 舒缓的页面转场和交互动画
- **响应式布局**: 适配不同屏幕尺寸

## 项目亮点

### 💡 创新特性
1. **情绪感知对话**: AI 能够根据对话内容调整回复风格和建议方向
2. **可解释推荐**: 每个建议都附带推荐理由，增强用户信任感
3. **渐进式建议**: 采用"小步快走"理念，避免给用户压力
4. **双模式运行**: 支持完全离线使用或在线 AI 增强模式

### 🛡️ 隐私保护
- 默认本地存储，不依赖云同步
- 支持完全离线运行模式
- 可选的后端服务通过 HTTPS/TLS 保护
- API 密钥保护的指标端点

### 🔧 开发工具
- 内置开发者工具页面，支持系统信息查看和调试
- Android 模拟器代理脚本，便于开发调试
- 详细的运行时配置和错误处理机制

## 快速开始

### 环境要求
```bash
- Flutter 3.x
- Dart 3.6+
- Python 3.8+ (后端可选)
```

### 客户端运行
```bash
# 1. 拉取依赖
flutter pub get

# 2. 运行应用
flutter run
```

### 后端部署 (可选)
```bash
# 1. 进入后端目录
cd server

# 2. 创建虚拟环境
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 3. 安装依赖
pip install -r requirements.txt

# 4. 启动服务
uvicorn app.main:app --reload --port 8000
```

### Docker 部署
```bash
docker build -t cuddlecat-ai-service .
docker run -p 8000:8000 cuddlecat-ai-service
```

## 配置说明

### 环境变量配置
```bash
# 复制示例配置文件
cp .env.example .env

# 主要配置项:
ENABLE_REMOTE_BACKEND=true        # 启用后端服务
SERVER_BASE_URL=http://localhost:8000  # 后端地址
DEEPSEEK_API_KEY=your_api_key     # AI 服务密钥
METRICS_API_KEY=your_metrics_key  # 指标端点保护
```

## 项目结构

```
cuddle_cat-AI-app/
├── lib/                     # Flutter 应用源码
│   ├── main.dart           # 应用入口
│   ├── screens/            # 页面组件
│   ├── widgets/            # UI 组件
│   ├── providers/          # 状态管理
│   ├── services/           # 业务服务
│   └── theme/              # 主题样式
├── server/                 # FastAPI 后端
│   ├── app/               # 后端应用代码
│   ├── requirements.txt   # Python 依赖
│   └── Dockerfile         # Docker 配置
├── assets/                # 静态资源
├── docs/                  # 项目文档
└── scripts/               # 构建脚本
```

## 开发理念

**暖猫** 的开发遵循以下核心理念：

1. **温和陪伴**: 不强迫、不批判，提供温暖的情感支持
2. **渐进改善**: 通过小步骤的积极行动促进心理健康
3. **个性化体验**: AI 学习用户偏好，提供定制化建议
4. **隐私优先**: 支持完全离线使用，保护用户隐私
5. **可持续性**: 注重长期的心理健康维护而非短期效果

## 技术特色

- **混合架构**: 本地优先 + 可选云端增强
- **智能学习**: AI 持续学习用户偏好和反馈
- **情感计算**: 深度理解和分析用户情绪状态
- **可解释 AI**: 透明的推荐理由和决策过程
- **渐进式 PWA**: 支持多平台部署和离线使用


---

**联系方式**: [GitHub @miaowumiaomiaowu](https://github.com/miaowumiaomiaowu)