# 术语表格式

```md
# {Context Name}

{One or two sentences: what this context is and why it exists.}

## Language

**Order**:
{One or two sentences that define the term.}
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request
```

## 规则

- **有主见。** 同一概念有多个词时，选最好的那个，其余列在 `_Avoid_` 下。
- **定义要紧。** 最多一两句，说它**是什么**，不说它做什么。
- **只收本项目特有的概念。** 超时、错误类型、工具模式这类通用编程概念，即使项目里用得很多也不收。
- 术语自然成簇时，用小标题分组；只有一簇就用平铺列表。

## 多上下文

沿用已有上下文索引。以下是根目录 `CONTEXT-MAP.md` 的例子，链接应使用项目实际路径：

```md
# Context Map

## Contexts

- [Ordering](./src/ordering/CONTEXT.md): receives and tracks customer orders
- [Billing](./src/billing/CONTEXT.md): generates invoices and processes payments

## Relationships

- **Ordering → Billing**: Ordering emits `OrderPlaced` events; Billing consumes them to generate invoices
```

判断结构：有 `CONTEXT-MAP.md` 就从它找上下文；只有根目录 `CONTEXT.md` 就是单一上下文；都没有时先查项目已有术语表；没有约定就在第一个术语确定时创建 `docs/glossary.md`。沿用已选路径，不因模板里的名称再建一份。
