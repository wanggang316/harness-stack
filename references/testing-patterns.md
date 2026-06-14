# Testing Patterns

测试模式和最佳实践参考。

## Test Pyramid

```
        ╱╲
       ╱ E2E ╲         ~5%  — 关键用户流程
      ╱────────╲
     ╱Integration╲     ~15% — API、数据库、服务边界
    ╱──────────────╲
   ╱    Unit Tests   ╲  ~80% — 业务逻辑、工具函数、组件
  ╱────────────────────╲
```

## AAA Pattern

```typescript
// Arrange - 准备测试数据
const user = { name: 'Alice', email: 'alice@example.com' };

// Act - 执行操作
const result = await createUser(user);

// Assert - 验证结果
expect(result.id).toBeDefined();
expect(result.name).toBe('Alice');
```

## Prove-It Pattern (Bug Fixes)

```typescript
// 1. 写一个失败的测试重现 bug
it('should handle empty input', () => {
  expect(() => processInput('')).not.toThrow();
});

// 2. 修复 bug
// 3. 验证测试通过
// 4. 保留测试防止回归
```

## Test Data Builders

```typescript
class UserBuilder {
  private data = { name: 'Test User', email: 'test@example.com' };
  
  withName(name: string) {
    this.data.name = name;
    return this;
  }
  
  withEmail(email: string) {
    this.data.email = email;
    return this;
  }
  
  build() {
    return this.data;
  }
}

const user = new UserBuilder()
  .withName('Alice')
  .withEmail('alice@example.com')
  .build();
```

## Mocking Strategy

**Mock 外部依赖**:
- 数据库
- 外部 API
- 文件系统
- 时间/日期

**不要 Mock**:
- 被测试的代码
- 简单的数据结构
- 框架内部

## Test Naming

```typescript
// Good: 描述行为
it('should return 404 when user not found', () => {});
it('should validate email format', () => {});
it('should prevent duplicate usernames', () => {});

// Bad: 描述实现
it('calls getUserById', () => {});
it('returns a promise', () => {});
```

## DAMP over DRY

测试中，描述性和可读性优于 DRY（Don't Repeat Yourself）。

```typescript
// Good: 清晰但有重复
it('should create user with valid data', () => {
  const user = { name: 'Alice', email: 'alice@example.com' };
  const result = await createUser(user);
  expect(result.name).toBe('Alice');
});

it('should reject user with invalid email', () => {
  const user = { name: 'Bob', email: 'invalid' };
  await expect(createUser(user)).rejects.toThrow();
});

// Bad: DRY 但难以理解
const testUser = (name, email, shouldSucceed) => {
  const user = { name, email };
  if (shouldSucceed) {
    expect(await createUser(user)).toBeDefined();
  } else {
    await expect(createUser(user)).rejects.toThrow();
  }
};
```
