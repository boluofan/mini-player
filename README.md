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

## 自托管后端

项目附带简易自托管后端（`cloudfunctions/`），提供代理、歌曲刮削、小程序码生成接口：

```sh
pnpm dev:server
```

复制 `.env.example` 为 `.env`，填入小程序 `appid` / `appsecret` 后启动。

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
