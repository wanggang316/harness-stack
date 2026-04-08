# Performance Checklist

性能优化检查清单。

## Database

- [ ] 索引关键查询字段
- [ ] 避免 N+1 查询问题
- [ ] 使用连接池
- [ ] 分页大结果集
- [ ] 查询只选择需要的字段

```typescript
// Good: 选择特定字段
db.query('SELECT id, name FROM users WHERE active = true');

// Bad: SELECT *
db.query('SELECT * FROM users WHERE active = true');
```

## API

- [ ] 响应时间 < 200ms (P95)
- [ ] 使用 HTTP 缓存头
- [ ] 压缩响应 (gzip/brotli)
- [ ] 分页 API 结果
- [ ] 批量操作 API

## Frontend

- [ ] 代码分割 (code splitting)
- [ ] 懒加载非关键资源
- [ ] 图片优化（WebP、压缩、响应式）
- [ ] 最小化 bundle 大小
- [ ] 使用 CDN

## React/Next.js

- [ ] 使用 React.memo 防止不必要的重渲染
- [ ] useMemo/useCallback 优化昂贵计算
- [ ] 虚拟化长列表 (react-window)
- [ ] 图片使用 next/image
- [ ] 静态生成 (SSG) 优于服务端渲染 (SSR)

## Caching

- [ ] 缓存昂贵的计算结果
- [ ] 缓存 API 响应
- [ ] 使用 Redis/Memcached
- [ ] 设置合理的 TTL
- [ ] 缓存失效策略

## Monitoring

- [ ] 监控响应时间
- [ ] 监控错误率
- [ ] 监控数据库查询时间
- [ ] 设置性能预算
- [ ] Core Web Vitals (LCP, FID, CLS)

## Load Testing

- [ ] 模拟预期负载
- [ ] 识别瓶颈
- [ ] 测试扩展性
- [ ] 压力测试找到极限
