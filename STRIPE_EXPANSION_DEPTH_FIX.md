# Stripe API Expansion Depth Error Fix

## Problem

The Stripe API is throwing a `property_expansion_max_depth` error:

```
Failed to get subscription details
error: StripeInvalidRequestError
code: property_expansion_max_depth
message: You cannot expand more than 4 levels of a property. Property: data.items.data.price.product
```

## Root Cause

Stripe API has a maximum expansion depth of **4 levels**. The current code is trying to expand:
- `data` (level 1)
- `items` (level 2)
- `data` (level 3)
- `price` (level 4)
- `product` (level 5) ❌ **Exceeds limit**

## Solution

### Option 1: Reduce Expansion Depth (Recommended)

Change the expand parameter from:
```typescript
// ❌ Too deep (5 levels)
expand: ['data.items.data.price.product']
```

To:
```typescript
// ✅ Within limit (4 levels)
expand: ['data.items.data.price']
```

Then access product information separately if needed, or use the product ID from the price object.

### Option 2: Separate API Calls

If you need product details:
1. First, fetch subscription with limited expansion:
   ```typescript
   const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
     expand: ['data.items.data.price']
   });
   ```

2. Then, fetch product details separately if needed:
   ```typescript
   const productId = subscription.items.data[0].price.product; // This is just an ID
   const product = await stripe.products.retrieve(productId);
   ```

### Option 3: Use Nested Expansion (If Product Details Are Critical)

If you absolutely need product details in the same call, you can expand up to 4 levels and then make a follow-up call:
```typescript
// Expand up to price (4 levels max)
const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
  expand: ['data.items.data.price']
});

// Extract product IDs and fetch separately
const productIds = subscription.items.data
  .map(item => item.price.product)
  .filter((id): id is string => typeof id === 'string');

const products = await Promise.all(
  productIds.map(id => stripe.products.retrieve(id))
);
```

## Implementation Location

This fix needs to be applied in the `call-sheet-backend` service where subscription details are fetched. Look for code that:

1. Calls `stripe.subscriptions.list()` or `stripe.subscriptions.retrieve()`
2. Uses an `expand` parameter with `data.items.data.price.product`
3. Logs "Failed to get subscription details"

## Example Fix

**Before:**
```typescript
const subscriptions = await stripe.subscriptions.list({
  customer: customerId,
  expand: ['data.items.data.price.product'] // ❌ 5 levels
});
```

**After:**
```typescript
const subscriptions = await stripe.subscriptions.list({
  customer: customerId,
  expand: ['data.items.data.price'] // ✅ 4 levels
});

// If product details are needed, fetch separately
for (const subscription of subscriptions.data) {
  for (const item of subscription.items.data) {
    if (typeof item.price.product === 'string') {
      const product = await stripe.products.retrieve(item.price.product);
      // Use product details as needed
    }
  }
}
```

## Testing

After applying the fix:
1. Verify subscription retrieval works without errors
2. Confirm all required data is still accessible
3. Check that product information is available when needed (via separate calls if required)

## References

- [Stripe API Documentation - Expansion](https://stripe.com/docs/api/expanding_objects)
- [Stripe API Limits](https://stripe.com/docs/api#expand)
