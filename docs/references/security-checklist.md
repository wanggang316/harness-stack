# Security Checklist

安全检查清单，基于 OWASP Top 10。

## Input Validation

- [ ] 所有用户输入都经过验证
- [ ] 使用白名单验证（允许的值），而非黑名单
- [ ] 验证数据类型、长度、格式、范围
- [ ] 服务端验证（不依赖客户端验证）

## Authentication

- [ ] 密码使用 bcrypt/argon2 哈希（不是 MD5/SHA1）
- [ ] 密码强度要求（长度、复杂度）
- [ ] 账户锁定机制（防止暴力破解）
- [ ] 安全的密码重置流程
- [ ] 会话超时设置

## Authorization

- [ ] 每个请求都检查权限
- [ ] 使用最小权限原则
- [ ] 防止越权访问（检查资源所有权）
- [ ] 敏感操作需要二次确认

## SQL Injection Prevention

- [ ] 使用参数化查询/预编译语句
- [ ] 不拼接 SQL 字符串
- [ ] ORM 正确使用（避免 raw queries）

```typescript
// Good: 参数化查询
db.query('SELECT * FROM users WHERE id = ?', [userId]);

// Bad: 字符串拼接
db.query(`SELECT * FROM users WHERE id = ${userId}`);
```

## XSS Prevention

- [ ] 输出编码（HTML、JavaScript、URL）
- [ ] 使用 Content Security Policy (CSP)
- [ ] 不使用 `dangerouslySetInnerHTML` 除非必要
- [ ] 清理用户生成的 HTML

## CSRF Prevention

- [ ] 使用 CSRF tokens
- [ ] SameSite cookie 属性
- [ ] 验证 Origin/Referer headers

## Secrets Management

- [ ] 不在代码中硬编码密钥
- [ ] 使用环境变量或密钥管理服务
- [ ] 不提交 .env 文件到 git
- [ ] 定期轮换密钥

## Data Protection

- [ ] 敏感数据加密存储
- [ ] HTTPS 传输
- [ ] 不记录敏感信息到日志
- [ ] 数据库连接字符串加密

## Rate Limiting

- [ ] API 端点限流
- [ ] 登录尝试限制
- [ ] 防止 DDoS 攻击

## Error Handling

- [ ] 不暴露堆栈跟踪给用户
- [ ] 通用错误消息（不泄露系统信息）
- [ ] 详细错误记录到服务端日志

## Dependencies

- [ ] 定期运行 `npm audit`
- [ ] 及时更新依赖
- [ ] 审查第三方包的安全性
