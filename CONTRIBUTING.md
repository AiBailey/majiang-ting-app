# 开发约定

**改功能只需要改 `index.html` 一个文件**——HTML、CSS、JS 全部内联在其中，没有构建步骤，也没有依赖。

| 你改了什么 | 需要动的文件 |
|---|---|
| 功能 / 样式 / 牌面 / 文案 | 只改 `index.html` |
| 图标（PNG） | 覆盖同名文件，并把 `sw.js` 的 `CACHE` 版本号 +1 |
| 新增或删除静态资源 | 引用处 + `sw.js` 的 `SHELL` 列表 |
| `mahjong-ting-calculator.html` | 正常开发不需要动它，它只是跳转页 |

## 不要把 index.html 复制成第二份完整页面

历史上这里曾有两份 92 KB 完全相同的副本，改一处就会出现"桌面图标打开的版本"和"直接访问的版本"不一致。现在有三道防线：

1. `mahjong-ting-calculator.html` 只有约 1.4 KB，不含任何应用代码；
2. `tests/ting.test.cjs` 的断言会拒绝退化成副本——跳转页不得包含 `TILE_PATHS`、体积必须小于 `index.html` 的 1/4、`manifest.start_url` 必须指向真实存在的文件；
3. `.github/workflows/test.yml` 在每次 push 和 PR 时自动跑测试（[CI 状态](https://github.com/AiBailey/majiang-ting-app/actions/workflows/test.yml)）。

## 提交前

```sh
node --test tests/ting.test.cjs   # 需要 Node 18+
```

推送到 `main` 后 GitHub Pages 会自动发布，没有其他操作。
