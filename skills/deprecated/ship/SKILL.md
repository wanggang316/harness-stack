---
name: ship
description: 为生产上线做准备。在准备部署到生产环境时使用。在你需要一份上线前清单、配置监控、规划分阶段灰度发布，或需要一套回滚策略时使用。
---

# ship：发布与上线

## Overview

带着信心发布。目标不只是部署——而是安全地部署：监控就位、回滚方案备好、对「成功是什么样」有清晰的认识。每一次上线都应当可回退、可观测、可增量推进。

## When to Use

- 首次把一个 feature 部署到生产
- 向用户发布一项重大改动
- 迁移数据或基础设施
- 开放 beta 或抢先体验计划
- 任何带风险的部署（也就是所有部署）

## The Pre-Launch Checklist

### Code Quality

- [ ] 所有测试通过（unit、integration、e2e）
- [ ] 构建成功且无 warning
- [ ] lint 与类型检查通过
- [ ] 代码已 review 并获批
- [ ] 没有应在上线前解决的 TODO 注释
- [ ] 生产代码中没有 `console.log` 调试语句
- [ ] 错误处理覆盖了预期的失败模式

### Security

- [ ] 代码或版本控制中没有 secret
- [ ] `npm audit` 没有报出 critical 或 high 漏洞
- [ ] 所有面向用户的端点都有 input validation
- [ ] 认证与授权检查就位
- [ ] security headers 已配置（CSP、HSTS 等）
- [ ] 认证端点上有限流
- [ ] CORS 配置为指定源（非通配符）

### Performance

- [ ] Core Web Vitals 落在「Good」阈值内
- [ ] 关键路径上没有 N+1 查询
- [ ] 图片已优化（压缩、响应式尺寸、懒加载）
- [ ] bundle 体积在预算内
- [ ] 数据库查询有恰当的索引
- [ ] 静态资源与重复查询配置了缓存

### Accessibility

- [ ] 所有可交互元素支持键盘导航
- [ ] 屏幕阅读器能传达页面内容与结构
- [ ] 色彩对比度满足 WCAG 2.1 AA（文本 4.5:1）
- [ ] 弹窗与动态内容的焦点管理正确
- [ ] 错误信息具有描述性，并与对应表单字段关联
- [ ] axe-core 或 Lighthouse 没有可访问性 warning

### Infrastructure

- [ ] 生产环境已设置环境变量
- [ ] 数据库 migration 已应用（或已就绪可应用）
- [ ] DNS 与 SSL 已配置
- [ ] 静态资源已配置 CDN
- [ ] 日志与错误上报已配置
- [ ] health check 端点存在并能响应

### Documentation

- [ ] README 已更新任何新的安装/配置要求
- [ ] API 文档为最新
- [ ] 重大决策已写 design docs
- [ ] changelog 已更新
- [ ] 面向用户的文档已更新（如适用）

## Feature Flag Strategy

在 feature flag 后面发布，把部署与发布解耦：

```typescript
// Feature flag check
const flags = await getFeatureFlags(userId);

if (flags.taskSharing) {
  // New feature: task sharing
  return <TaskSharingPanel task={task} />;
}

// Default: existing behavior
return null;
```

**feature flag 的 lifecycle：**

```
1. DEPLOY with flag OFF     → Code is in production but inactive
2. ENABLE for team/beta     → Internal testing in production environment
3. GRADUAL ROLLOUT          → 5% → 25% → 50% → 100% of users
4. MONITOR at each stage    → Watch error rates, performance, user feedback
5. CLEAN UP                 → Remove flag and dead code path after full rollout
```

**规则：**
- 每个 feature flag 都有一个 owner 和一个过期日期
- 全量发布后 2 周内清理掉 flag
- 不要嵌套 feature flag（会产生指数级的组合）
- 在 CI 中测试 flag 的两种状态（开和关）

## Staged Rollout

### The Rollout Sequence

```
1. DEPLOY to staging
   └── Full test suite in staging environment
   └── Manual smoke test of critical flows

2. DEPLOY to production (feature flag OFF)
   └── Verify deployment succeeded (health check)
   └── Check error monitoring (no new errors)

3. ENABLE for team (flag ON for internal users)
   └── Team uses the feature in production
   └── 24-hour monitoring window

4. CANARY rollout (flag ON for 5% of users)
   └── Monitor error rates, latency, user behavior
   └── Compare metrics: canary vs. baseline
   └── 24-48 hour monitoring window
   └── Advance only if all thresholds pass (see table below)

5. GRADUAL increase (25% -> 50% -> 100%)
   └── Same monitoring at each step
   └── Ability to roll back to previous percentage at any point

6. FULL rollout (flag ON for all users)
   └── Monitor for 1 week
   └── Clean up feature flag
```

### Rollout Decision Thresholds

用这些阈值决定在每个阶段是推进、暂停还是回滚：

| 指标 | 推进（绿） | 暂停并排查（黄） | 回滚（红） |
|--------|-----------------|-------------------------------|-----------------|
| Error rate | 与 baseline 相差 10% 以内 | 比 baseline 高 10-100% | 超过 baseline 的 2 倍 |
| P95 latency | 与 baseline 相差 20% 以内 | 比 baseline 高 20-50% | 比 baseline 高 50% 以上 |
| Client JS errors | 没有新增错误类型 | 新错误出现在 <0.1% 的会话中 | 新错误出现在 >0.1% 的会话中 |
| Business metrics | 持平或正向 | 下滑 <5%（可能是噪声） | 下滑 >5% |

### When to Roll Back

出现以下情况立即回滚：
- error rate 涨幅超过 baseline 的 2 倍
- P95 latency 涨幅超过 50%
- 用户上报的问题激增
- 检测到数据完整性问题
- 发现安全漏洞

## Monitoring and Observability

### What to Monitor

```
Application metrics:
├── Error rate (total and by endpoint)
├── Response time (p50, p95, p99)
├── Request volume
├── Active users
└── Key business metrics (conversion, engagement)

Infrastructure metrics:
├── CPU and memory utilization
├── Database connection pool usage
├── Disk space
├── Network latency
└── Queue depth (if applicable)

Client metrics:
├── Core Web Vitals (LCP, INP, CLS)
├── JavaScript errors
├── API error rates from client perspective
└── Page load time
```

### 错误上报

```typescript
// Set up error boundary with reporting
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Report to error tracking service
    reportError(error, {
      componentStack: info.componentStack,
      userId: getCurrentUser()?.id,
      page: window.location.pathname,
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

// Server-side error reporting
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  reportError(err, {
    method: req.method,
    url: req.url,
    userId: req.user?.id,
  });

  // Don't expose internals to users
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  });
});
```

### Post-Launch Verification

上线后第一个小时内：

```
1. Check health endpoint returns 200
2. Check error monitoring dashboard (no new error types)
3. Check latency dashboard (no regression)
4. Test the critical user flow manually
5. Verify logs are flowing and readable
6. Confirm rollback mechanism works (dry run if possible)
```

## Rollback Strategy

每一次部署都需要在它发生之前先有回滚方案：

```markdown
## Rollback Plan for [Feature/Release]

### Trigger Conditions
- Error rate > 2x baseline
- P95 latency > [X]ms
- User reports of [specific issue]

### Rollback Steps
1. Disable feature flag (if applicable)
   OR
1. Deploy previous version: `git revert <commit> && git push`
2. Verify rollback: health check, error monitoring
3. Communicate: notify team of rollback

### Database Considerations
- Migration [X] has a rollback: `npx prisma migrate rollback`
- Data inserted by new feature: [preserved / cleaned up]

### Time to Rollback
- Feature flag: < 1 minute
- Redeploy previous version: < 5 minutes
- Database rollback: < 15 minutes
```
## See Also

- 安全方面的上线前检查，见 `references/security-checklist.md`
- 性能方面的上线前清单，见 `references/performance-checklist.md`
- 上线前的可访问性验证，见 `references/accessibility-checklist.md`

## Common Rationalizations

| 借口 | 现实 |
|---|---|
| 「staging 上能跑，生产上也能跑。」 | 生产的数据、流量模式和边界情况都不同。部署后要做监控。 |
| 「这个不需要 feature flag。」 | 每个 feature 都受益于一个 kill switch。哪怕「简单」改动也会出问题。 |
| 「监控是额外负担。」 | 没有监控意味着你是从用户投诉里发现问题，而不是从仪表盘。 |
| 「监控我们以后再加。」 | 上线前就加。看不见的东西没法调试。 |
| 「回滚等于承认失败。」 | 回滚是负责任的工程实践。把坏掉的 feature 发出去才是失败。 |

## Red Flags

- 没有回滚方案就部署
- 生产环境没有监控或错误上报
- 大爆炸式发布（一次性全上，没有 staging）
- feature flag 没有过期日期或 owner
- 上线后第一个小时没人盯着
- 生产环境配置靠记忆，而不是靠代码
- 「现在是周五下午，发了吧」

## Verification

部署前：

- [ ] 上线前清单已完成（所有小节都为绿）
- [ ] feature flag 已配置（如适用）
- [ ] 回滚方案已记录
- [ ] 监控仪表盘已搭好
- [ ] 已通知团队即将部署

部署后：

- [ ] health check 返回 200
- [ ] error rate 正常
- [ ] latency 正常
- [ ] 关键用户流程可用
- [ ] 日志正常流转
- [ ] 回滚已测试或已确认就绪
