## i18n 仓库目标
本仓库为 Web 端 以及 KMP 移动端统一构建 i18n 文件, 并通过 Github Actions CI 进行分发

## 文件结构(需要严格遵守)
repo-root/
  source/
    en.yaml
    zh-rCN.yaml
  dist/
    web/en.json
    web/zh-rCN.json
    kmp/values/strings.xml
    kmp/values-zh-rCN/strings.xml
  generator/

### source
存放每个语言的字符串配置文件, 使用 yaml 组织
示例: en.yaml
```yaml
login:
  title: "Login"
  signInText: "Sign In"
```

示例: zh-rCN.yaml
```yaml
login:
  title: "登录"
  signInText: "登录"
```

### dist
存放各个仓库的 i18n 生成产物文件, Web 仓库使用 json, KMP 仓库使用 xml
示例: web/en.json
```json
{
  "login.title": "Login",
  "login.signInText": "Sign In"
}
```

示例: kmp/values-zh-rCN/strings.xml
```xml
<string name="login_title">登录</string>
<string name="login_signInText">注册</string>
```

### generator
dist 产物的生成器, 使用 TypeScript 编写
必须检查 source 的每个语言中, 每个项都有一一对应
例如, zh-rCN.yaml 中含有 login:title, 而 en.yaml 缺少 login:title, 那么直接报错并打印详细信息

## CI

### 链路流程
- 向 i18n-repo 提交 source/*.yaml
- GitHub Actions 触发
- CI 运行 generator，生成 dist/web/... 和 dist/kmp/...
- CI 分别 clone web-repo 和 kmp-repo
- 把生成物复制到各自目标目录
- 在目标仓库里 git add、git commit、git push

目标目录说明：
- clone web repo 之后, 把 dist/web 中的所有文件复制到目标目录 frontend/i18n/locales/
- clone kmp repo 之后, 把 dist/kmp 中的所有文件复制到目标目录 composeApp/commonMain/composeResources/

### Workflows
.github 文件夹里面仅一个 yaml 文件
- generate-and-push.yml 在提交 source 的时候触发