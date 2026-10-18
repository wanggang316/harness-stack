# harness-stack

## 原则

- 尽可能覆盖完整的开发周期
- 不绑架项目，不侵入项目
- 设计足够小，具备可组合性，能够方便进行二次开发
- 原子性：每个 Skill 只负责一段单一、完整的职责，不预设前后由哪个 Skill 衔接
- 自足，减少引用：引用其他 Skill 只是可选的增强，去掉所有引用后 Skill 仍能正常运行

## Feedback

Found friction, a bug, or have a suggestion? All feedback goes to this repo —
**[github.com/wanggang316/harness-stack/issues](https://github.com/wanggang316/harness-stack/issues)** — regardless of which project you were using harness-stack in. You don't need write access to open an issue.

- **From Claude Code**: run `/harness-stack:feedback`. It walks you through a short reflection, de-dups against existing issues, and files a structured report for you.
- **From GitHub directly**: open [a new issue](https://github.com/wanggang316/harness-stack/issues/new/choose) and pick a form — Bug, Friction/DX, Enhancement, or Docs.

## License

MIT
