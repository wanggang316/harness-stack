# Test seams and evidence examples

## Independent expected values

Suppose the spec charges a base fee of 4 currency units per parcel, plus 3 for each kilogram above 1 kg, rounded up. The known result for 2.2 kg is 10. Encode that independent worked example instead of repeating the shipping function's branches and rounding logic.

```python
def test_shipping_fee_rounds_up_extra_weight():
    assert shipping_fee(weight_kg=2.2) == 10
```

The test name states the rule. Choose boundary inputs that distinguish incorrect implementations. One happy-path example does not prove behavior at critical weights; select the corresponding slice in the next cycle.

## Observe results callers care about

Callers of an order service care whether an order can be placed and retrieved. Check results through `place_order` and `get_order` to protect the contract when internal storage changes. Asserting a private repository call can couple the test to structure.

If the subject itself is a storage adapter, checking uniqueness constraints or transaction rollback in a test database is a valid integration test. A public interface does not mean every test must cross the outermost UI. Do not expose private methods solely for tests.

## Test-double boundaries

An ordinary test must not charge a real payment gateway. Provide a controlled double at the gateway boundary that returns a decline. Check that the order is not completed and no shipment is sent. Use real code for state calculations inside the order domain.

If the requirement says one idempotency key must cause at most one charge, the call count and key belong to the external contract and can be asserted. Fixing a helper's call count merely because the implementation currently calls it twice constrains an unrelated detail.

A double cannot prove a third-party protocol, credentials, or network wiring. Add isolated adapter contract checks or authorized integration validation when these guarantees are needed, and report their results separately.

## Recognize an invalid red signal

- The runner cannot find a file: execution failed before behavior was checked.
- A declined payment returns a paid result: target behavior failed and can drive the fix.
- A new function cannot be imported: the interface does not yet exist. Add a minimal declaration, then check the target assertion. Do not mistake an environment failure for a bug reproduction.
- A characterization test passes before the change: the behavioral baseline is valid for a refactor. This is not evidence that a bug was reproduced.

Red shows that the check detects the current gap. Green shows that the current example passes. Neither replaces analysis of missing behavior or final integration checks.
