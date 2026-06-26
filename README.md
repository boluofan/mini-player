## 菠萝倾听

> [Songloft](https://github.com/songloft-org/songloft) 微信小程序客户端，推送本地音乐至小米音箱

基于 [卯卯音乐 (xiaoplayer)](https://github.com/F-loat/xiaoplayer) 二次开发，感谢原作者的开源贡献。

原生小程序开发，采用 Skyline 渲染模式，支持全局工具栏及自定义路由效果，感谢由 [weapp-vite](https://github.com/weapp-vite/weapp-vite) 及 [weapp-tailwindcss](https://github.com/sonofmagic/weapp-tailwindcss) 提供的开箱即用的现代化开发体验。

## 功能特性

- 全局工具栏
- 自定义路由
- 逐字歌词
- 后台播放
- 倍速播放
- 暗色模式
- 封面主题色
- JWT 双 Token 认证
- 本机播放 / 音箱投播 双模式
- 歌单管理（增删排序）

## 运行

1. 克隆仓库

```sh
git clone <your-repo-url>
```

2. 安装依赖

```sh
pnpm install
```

3. 启动开发构建

```sh
pnpm dev
```

4. 预览效果

使用微信开发者工具导入项目根目录（`project.config.json` 所在目录），需基础库 ≥ 3.0.0。

## 小程序发布

### 1. 准备工作

- 在 [微信公众平台](https://mp.weixin.qq.com/) 注册小程序，获取 **AppID**
- 确保小程序已开通 **云开发** 或准备自托管服务器（本项目使用自托管后端）
- 下载安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)

### 2. 配置业务域名（白名单）

小程序需在公众平台配置服务器域名，否则正式版无法请求接口。

登录 [微信公众平台](https://mp.weixin.qq.com/) → **开发管理** → **开发设置** → **服务器域名**，添加以下白名单：

| 类别                  | 域名                       | 说明                                                                       |
| --------------------- | -------------------------- | -------------------------------------------------------------------------- |
| `request` 合法域名    | `http://你的服务器IP:端口` | 自托管后端地址（开发版可用 IP，**体验版、正式版不支持 IP**，必须使用域名） |
| `request` 合法域名    | `https://你的域名`         | 推荐使用 HTTPS 域名转发到自托管后端                                        |
| `uploadFile` 合法域名 | 同上                       | 如需上传功能                                                               |
| `socket` 合法域名     | 同上                       | 当前未使用 WebSocket，预留                                                 |

### 3. 构建生产包

```sh
pnpm build
```

输出到 `dist/` 目录。

> 如果使用了自托管后端（详见下方说明），构建前需在小程序项目根目录 `.env` 中配置 `VITE_CLOUD_HOSTED_SERVER=https://你的域名:7529`，这样小程序才能调用代理、刮削等增强接口。

### 4. 上传发布

1. 打开微信开发者工具，导入项目**根目录**（`project.config.json` 所在目录）
2. 工具会自动识别 `miniprogramRoot: "dist/"`
3. 点击工具栏 **上传** 按钮，填写版本号
4. 登录公众平台 → **版本管理**

> **个人/小范围使用**：上传后，在版本管理中将该版本设为**体验版**，再将微信号加入**体验成员**即可使用，无需提交审核和发布生产。注意体验版同样受业务域名白名单限制，必须在公众平台配置好服务器域名。

## 自托管后端（可选）

> **此服务提供三个增强接口**：代理转发、歌曲刮削、小程序码生成。**不部署不影响小程序正常使用**，小程序的核心功能（播放、歌单、搜索等）直接连接 Songloft 服务端即可工作。

项目附带简易自托管后端（`cloudfunctions/`），提供代理、歌曲刮削、小程序码生成接口：

### 本地运行方式

```sh
pnpm dev:server
```

### Docker 部署（推荐）

项目提供 Docker 镜像，适合在 NAS 等设备上运行：

```sh
# 拉取镜像
docker pull boluofandocker/mini-player-server:latest

# 运行（通过 -e 传入配置）
docker run -d \
  --name mini-player-server \
  --restart unless-stopped \
  -p 7529:7529 \
  -e WEAPP_APPID=你的AppID \
  -e WEAPP_APPSECRET=你的AppSecret \
  -e MUSIC_TAG_SERVER= \
  -e MUSIC_TAG_USERNAME= \
  -e MUSIC_TAG_PASSWORD= \
  boluofandocker/mini-player-server:latest
```

或用 docker-compose（推荐）：

```yaml
version: '3'
services:
  mini-player-server:
    image: boluofandocker/mini-player-server:latest
    container_name: mini-player-server
    restart: unless-stopped
    ports:
      - '7529:7529'
    environment:
      - WEAPP_APPID=你的AppID
      - WEAPP_APPSECRET=你的AppSecret
      - MUSIC_TAG_SERVER=
      - MUSIC_TAG_USERNAME=
      - MUSIC_TAG_PASSWORD=
```

```sh
docker-compose up -d
```

**参数说明：**

| 变量                 | 用途                                             | 必填 |
| -------------------- | ------------------------------------------------ | ---- |
| `WEAPP_APPID`        | 微信小程序的 AppID（小程序码生成用）             | 否   |
| `WEAPP_APPSECRET`    | 微信小程序的 AppSecret（小程序码生成用）         | 否   |
| `MUSIC_TAG_SERVER`   | 歌曲刮削服务地址（如 `https://api.example.com`） | 否   |
| `MUSIC_TAG_USERNAME` | 刮削服务登录用户名                               | 否   |
| `MUSIC_TAG_PASSWORD` | 刮削服务登录密码                                 | 否   |
| `PORT`               | 监听端口（默认 7529）                            | 否   |

> 三个接口都是可选增强功能，不配置也能正常运行，不影响小程序核心功能。

生产部署建议用 Nginx + HTTPS 反代转发到 7529 端口。

## 架构

- **双播放器**: 本机播放（InnerAudioContext） / 音箱投播（miot 插件）
- **MobX 状态管理**: `mobx-miniprogram` + `makeAutoObservable`
- **JWT 认证**: 自动 refresh 双 Token，并发安全刷新队列
- **Skyline 渲染**: glass-easel 组件框架，自定义 app-bar 全局工具栏
- **TailwindCSS**: `weapp-tailwindcss` 小程序适配补丁

## 参考

- [weapp-vite](https://github.com/weapp-vite/weapp-vite)
- [weapp-tailwindcss](https://github.com/sonofmagic/weapp-tailwindcss)
- [卯卯音乐 xiaoplayer](https://github.com/F-loat/xiaoplayer)
- [Songloft](https://github.com/songloft-org/songloft)
