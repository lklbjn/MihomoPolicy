# Mihomo配置修改器

这是一个纯前端工具，用于解析和修改mihomo（原Clash Meta）的yml配置文件。主要功能是添加listeners配置，实现多端口使用不同的策略组。

## 功能特点

- 纯浏览器端处理，无需服务器
- 支持解析mihomo的yml配置文件
- 添加listeners配置，实现多端口不同策略组
- 根据正则表达式自动筛选代理并创建策略组
- 支持通过URL直接加载远程配置文件
- 支持将监听器配置保存到本地存储
- 支持导出/导入监听器配置为JSON文件
- 支持Cloudflare Pages部署

## 使用方法

### 基本使用

1. 在页面上传mihomo的yml配置文件或输入配置文件URL点击"加载URL"
2. 添加listeners参数：
   - name: 监听器名称
   - type: 监听器类型（mixed/http/socks等）
   - port: 端口号
   - listen: 监听地址（如0.0.0.0）
   - proxy: 策略组名称
   - proxy-regex: 正则表达式，用于匹配代理名称
3. 点击"生成配置"按钮处理配置
4. 点击"下载配置"保存修改后的文件

### 监听器配置管理

- **保存配置**：将当前监听器配置保存到浏览器本地存储
- **加载配置**：从浏览器本地存储加载之前保存的监听器配置
- **导出配置**：将当前监听器配置导出为JSON文件
- **导入配置**：从之前导出的JSON文件中导入监听器配置

## 示例

如果您的配置文件中有以下代理：

```yaml
proxies:
  - {name: 🇭🇰香港01, server: xxx, port: xxx, type: ss, cipher: xxx, password: xxx, udp: true}
  - {name: 🇯🇵日本01, server: xxx, port: xxx, type: ss, cipher: xxx, password: xxx, udp: true}
  - {name: 🇯🇵日本02, server: xxx, port: xxx, type: ss, cipher: xxx, password: xxx, udp: true}
  - {name: 🇭🇰香港03, server: xxx, port: xxx, type: ss, cipher: xxx, password: xxx, udp: true}
  - {name: 🇸🇬新加坡01, server: xxx, port: xxx, type: ss, cipher: xxx, password: xxx, udp: true}
  - {name: 🇸🇬新加坡02, server: xxx, port: xxx, type: ss, cipher: xxx, password: xxx, udp: true}
```

您可以添加两个监听器：

1. HK代理
   - type: mixed
   - port: 8880
   - listen: 0.0.0.0
   - proxy: HK策略组
   - proxy-regex: 🇯🇵香港\d{2}

2. JP代理
   - type: mixed
   - port: 8881
   - listen: 0.0.0.0
   - proxy: JP策略组
   - proxy-regex: 🇯🇵日本\d{2}

生成的配置将添加以下内容：

```yaml
proxy-groups:
  # 原有的代理组...
  - name: HK策略组
    type: select
    proxies:
      - 🇭🇰香港01
      - 🇭🇰香港03
  - name: JP策略组
    type: select
    proxies:
      - 🇯🇵日本01
      - 🇯🇵日本02

listeners:
  - name: HK代理
    type: mixed
    port: 8880
    listen: 0.0.0.0
    proxy: HK策略组
  - name: JP代理
    type: mixed
    port: 8881
    listen: 0.0.0.0
    proxy: JP策略组
```

## 安装说明

### 方法一：直接使用

1. 下载本项目所有文件
2. 在浏览器中打开index.html即可使用

### 方法二：部署到Cloudflare Pages

1. 注册Cloudflare账号并创建Pages项目
2. 将项目文件上传到Pages

## 注意事项

- 本工具仅在浏览器中处理文件，不会上传配置到任何服务器
- 请确保配置文件格式正确，否则可能无法正确解析
- 正则表达式匹配不到任何代理时会显示警告
- 使用"加载URL"功能时可能会遇到CORS跨域问题，这是由于浏览器的安全限制导致的。如果遇到此问题，可以：
  1. 确保目标服务器允许跨域请求（设置了适当的CORS头）
  2. 部署一个CORS代理服务（如cors-anywhere）来中转请求
  3. 使用本地文件上传功能代替URL加载

### CORS代理示例

如果需要通过URL加载不支持CORS的配置文件，可以使用以下方式：

1. 部署一个cors-anywhere服务
2. 在URL输入框中使用代理URL格式：`https://your-cors-proxy.com/https://original-config-url.com/config.yml`