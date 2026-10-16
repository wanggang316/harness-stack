---
name: security
description: 加固代码以抵御漏洞。在处理用户输入、认证、数据存储或外部集成时使用。在构建任何接收不可信数据、管理用户会话或与第三方服务交互的 feature 时使用。
---

# security：安全与加固

## Overview

面向 Web 应用的安全优先开发实践。把每一份外部输入都当作敌意输入，把每一个 secret 都当作机密，把每一次授权检查都当作强制项。安全不是一个阶段——它是一道约束，贯穿每一行触及用户数据、认证或外部系统的代码。

> **与 FDD 的分工：** 深度威胁建模由 `harness-stack:security-auditor` 子代理执行。在 `fdd` 流程内，它会在 milestone 边界、当 diff 触及敏感面（auth/secrets/crypto/裸查询/shell/依赖升级）时**自动并行派发**。本技能是 **FDD 之外** 的独立手动安全审计与加固路径（就像 `review-request` 之于 code-review）。

## When to Use

- 构建任何接收用户输入的功能
- 实现认证或授权
- 存储或传输敏感数据
- 与外部 API 或服务集成
- 新增文件上传、webhook 或回调
- 处理支付或 PII 数据

## The Three-Tier Boundary System

### Always Do (No Exceptions)

- **在系统边界校验所有外部输入**（API 路由、表单处理器）
- **所有数据库查询参数化**——绝不把用户输入拼接进 SQL
- **对输出做编码**以防 XSS（使用框架的自动转义，不要绕过它）
- **所有外部通信使用 HTTPS**
- **用 bcrypt/scrypt/argon2 对密码做 hash**（绝不存储明文）
- **设置 security headers**（CSP、HSTS、X-Frame-Options、X-Content-Type-Options）
- **会话使用 httpOnly、secure、sameSite cookies**
- **每次发布前运行 `npm audit`**（或等价工具）

### Ask First (Requires Human Approval)

- 新增认证流程或修改 auth 逻辑
- 存储新类别的敏感数据（PII、支付信息）
- 新增外部服务集成
- 修改 CORS 配置
- 新增文件上传处理器
- 修改限流或节流
- 授予提升的权限或角色

### Never Do

- **绝不把 secret 提交**进版本控制（API key、密码、token）
- **绝不记录敏感数据**（密码、token、完整信用卡号）
- **绝不把客户端校验**当作安全边界来信任
- **绝不为了图方便禁用 security headers**
- **绝不对用户提供的数据使用 `eval()` 或 `innerHTML`**
- **绝不把会话存进客户端可访问的存储**（用 localStorage 存 auth token）
- **绝不向用户暴露 stack trace** 或内部错误细节

## OWASP Top 10 Prevention

### 1. Injection (SQL, NoSQL, OS Command)

```typescript
// BAD: SQL injection via string concatenation
const query = `SELECT * FROM users WHERE id = '${userId}'`;

// GOOD: Parameterized query
const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// GOOD: ORM with parameterized input
const user = await prisma.user.findUnique({ where: { id: userId } });
```

### 2. Broken Authentication

```typescript
// Password hashing
import { hash, compare } from 'bcrypt';

const SALT_ROUNDS = 12;
const hashedPassword = await hash(plaintext, SALT_ROUNDS);
const isValid = await compare(plaintext, hashedPassword);

// Session management
app.use(session({
  secret: process.env.SESSION_SECRET,  // From environment, not code
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,     // Not accessible via JavaScript
    secure: true,       // HTTPS only
    sameSite: 'lax',    // CSRF protection
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours
  },
}));
```

### 3. Cross-Site Scripting (XSS)

```typescript
// BAD: Rendering user input as HTML
element.innerHTML = userInput;

// GOOD: Use framework auto-escaping (React does this by default)
return <div>{userInput}</div>;

// If you MUST render HTML, sanitize first
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput);
```

### 4. Broken Access Control

```typescript
// Always check authorization, not just authentication
app.patch('/api/tasks/:id', authenticate, async (req, res) => {
  const task = await taskService.findById(req.params.id);

  // Check that the authenticated user owns this resource
  if (task.ownerId !== req.user.id) {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Not authorized to modify this task' }
    });
  }

  // Proceed with update
  const updated = await taskService.update(req.params.id, req.body);
  return res.json(updated);
});
```

### 5. Security Misconfiguration

```typescript
// Security headers (use helmet for Express)
import helmet from 'helmet';
app.use(helmet());

// Content Security Policy
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],  // Tighten if possible
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
  },
}));

// CORS — restrict to known origins
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true,
}));
```

### 6. Sensitive Data Exposure

```typescript
// Never return sensitive fields in API responses
function sanitizeUser(user: UserRecord): PublicUser {
  const { passwordHash, resetToken, ...publicFields } = user;
  return publicFields;
}

// Use environment variables for secrets
const API_KEY = process.env.STRIPE_API_KEY;
if (!API_KEY) throw new Error('STRIPE_API_KEY not configured');
```

## Input Validation Patterns

### 在边界做 Schema 校验

```typescript
import { z } from 'zod';

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().datetime().optional(),
});

// Validate at the route handler
app.post('/api/tasks', async (req, res) => {
  const result = CreateTaskSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: result.error.flatten(),
      },
    });
  }
  // result.data is now typed and validated
  const task = await taskService.create(result.data);
  return res.status(201).json(task);
});
```

### 文件上传安全

```typescript
// Restrict file types and sizes
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function validateUpload(file: UploadedFile) {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new ValidationError('File type not allowed');
  }
  if (file.size > MAX_SIZE) {
    throw new ValidationError('File too large (max 5MB)');
  }
  // Don't trust the file extension — check magic bytes if critical
}
```

## 分诊 npm audit 结果

并非所有 audit 发现都需要立即处理。用这棵决策树：

```
npm audit reports a vulnerability
├── Severity: critical or high
│   ├── Is the vulnerable code reachable in your app?
│   │   ├── YES --> Fix immediately (update, patch, or replace the dependency)
│   │   └── NO (dev-only dep, unused code path) --> Fix soon, but not a blocker
│   └── Is a fix available?
│       ├── YES --> Update to the patched version
│       └── NO --> Check for workarounds, consider replacing the dependency, or add to allowlist with a review date
├── Severity: moderate
│   ├── Reachable in production? --> Fix in the next release cycle
│   └── Dev-only? --> Fix when convenient, track in backlog
└── Severity: low
    └── Track and fix during regular dependency updates
```

**关键问题：**
- 这个有漏洞的函数是否真的在你的代码路径里被调用？
- 该依赖是运行时依赖，还是仅用于开发？
- 在你的部署上下文里这个漏洞是否可被利用（例如一个服务端漏洞出现在纯客户端应用里）？

当你推迟修复时，记录原因并设定一个复查日期。

## Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                   // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
}));

// Stricter limit for auth endpoints
app.use('/api/auth/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,  // 10 attempts per 15 minutes
}));
```

## Secrets 管理

```
.env files:
  ├── .env.example  → Committed (template with placeholder values)
  ├── .env          → NOT committed (contains real secrets)
  └── .env.local    → NOT committed (local overrides)

.gitignore must include:
  .env
  .env.local
  .env.*.local
  *.pem
  *.key
```

**提交前务必检查：**
```bash
# Check for accidentally staged secrets
git diff --cached | grep -i "password\|secret\|api_key\|token"
```

## Security Review Checklist

```markdown
### Authentication
- [ ] Passwords hashed with bcrypt/scrypt/argon2 (salt rounds ≥ 12)
- [ ] Session tokens are httpOnly, secure, sameSite
- [ ] Login has rate limiting
- [ ] Password reset tokens expire

### Authorization
- [ ] Every endpoint checks user permissions
- [ ] Users can only access their own resources
- [ ] Admin actions require admin role verification

### Input
- [ ] All user input validated at the boundary
- [ ] SQL queries are parameterized
- [ ] HTML output is encoded/escaped

### Data
- [ ] No secrets in code or version control
- [ ] Sensitive fields excluded from API responses
- [ ] PII encrypted at rest (if applicable)

### Infrastructure
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] CORS restricted to known origins
- [ ] Dependencies audited for vulnerabilities
- [ ] Error messages don't expose internals
```
## See Also

详细的安全检查清单与提交前验证步骤，见 `references/security-checklist.md`。

## Common Rationalizations

| 借口 | 现实 |
|---|---|
| 「这是内部工具，安全无所谓。」 | 内部工具一样会被攻破。攻击者专挑最薄弱的环节。 |
| 「安全我们以后再加。」 | 事后补安全比一开始就做难 10 倍。现在就加。 |
| 「没人会来攻击这个。」 | 自动化扫描器会找到它。靠隐蔽求安全不是安全。 |
| 「框架会处理安全。」 | 框架提供工具，不提供保证。你仍然得正确地使用它们。 |
| 「这只是个原型。」 | 原型会变成生产。从第一天起就养成安全习惯。 |

## Red Flags

- 用户输入直接传入数据库查询、shell 命令或 HTML 渲染
- secret 出现在源码或提交历史中
- API 端点没有认证或授权检查
- 缺失 CORS 配置，或使用通配符（`*`）源
- 认证端点上没有限流
- 向用户暴露了 stack trace 或内部错误
- 依赖中存在已知的 critical 漏洞

## Verification

实现安全相关代码后：

- [ ] `npm audit` 没有报出 critical 或 high 漏洞
- [ ] 源码或 git 历史中没有 secret
- [ ] 所有用户输入都在系统边界处校验
- [ ] 每个受保护端点都检查了认证与授权
- [ ] 响应中带有 security headers（用浏览器 DevTools 检查）
- [ ] 错误响应不暴露内部细节
- [ ] 认证端点上限流已生效
