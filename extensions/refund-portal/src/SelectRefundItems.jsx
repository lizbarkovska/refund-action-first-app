export default function SelectRefundItems({
  lineItems,
  returns,
  selectedItems,
  setSelectedItems,
  onNavigate,
  submitError,
}) {
  const handleCheckboxChange = (lineItemId, checked) => {
    setSelectedItems((prev) => ({
      ...prev,
      [lineItemId]: checked,
    }));
  };

  // Build a set of line item IDs that already have return requests
  const returnedLineItemIds = new Set();
  returns.forEach(({ node: returnNode }) => {
    returnNode.returnLineItems?.edges?.forEach(({ node: returnLineItem }) => {
      const lineItemId = returnLineItem.lineItem?.id;
      if (lineItemId) {
        returnedLineItemIds.add(lineItemId);
      }
    });
  });

  // Filter out items that have refundableQuantity > 0 AND don't have a return request
  const refundableItems = lineItems.filter(({ node: item }) => {
    const hasRefundableQty = item.refundableQuantity > 0;
    const hasReturnRequest = returnedLineItemIds.has(item.id);
    return hasRefundableQty && !hasReturnRequest;
  });

  console.log(lineItems, "lineItems");
  console.log(returnedLineItemIds, "returnedLineItemIds");
  console.log(refundableItems, "refundableItems");

  const hasSelectedItems = Object.values(selectedItems).some((v) => v === true);
  return (
    <>
      {" "}
      <s-heading>{shopify.i18n.translate("selectItemsHeading")}</s-heading>
      {/* <s-paragraph>
        {shopify.i18n.translate("selectItemsInstructions")}
      </s-paragraph> */}
      {submitError && (
        <s-banner tone="critical">
          <s-text>{submitError}</s-text>
        </s-banner>
      )}

      {refundableItems.length === 0 ? (
        <s-box paddingBlock="large">
          <s-banner tone="info">
            <s-text>
              All items in this order have either been refunded or have a pending refund request.
            </s-text>
          </s-banner>
        </s-box>
      ) : (
        <>
          <s-stack
            padding="large none large none"
            direction="inline"
            gap="large"
            maxInlineSize="634px"
          >
            {refundableItems.map(({ node: item }) => (
              <LineItemCard
                key={item.id}
                item={item}
                selected={selectedItems[item.id] || false}
                onCheckboxChange={(checked) =>
                  handleCheckboxChange(item.id, checked)
                }
              />
            ))}
          </s-stack>
          <s-stack direction="inline" justifyContent="end">
            {" "}
            <s-button
              variant="primary"
              onClick={() => onNavigate("next")}
              disabled={!hasSelectedItems}
            >
              Next
            </s-button>
          </s-stack>
        </>
      )}
    </>
  );
}

// Line item card component
function LineItemCard({ item, selected, onCheckboxChange }) {
  const formatPrice = (amount, currencyCode) => {
    return `${parseFloat(amount).toFixed(2)} ${currencyCode}`;
  };

  return (
    <s-box
      padding="large base base base"
      borderRadius="base"
      borderWidth="base"
      inlineSize="200px"
    >
      <s-stack gap="base" alignItems="center">
        {/* Product Image */}
        {item.image?.url && (
          <s-box inlineSize="100px" blockSize="80px">
            <s-image
              src={item.image.url}
              alt={item.image.altText || item.title}
              aspectRatio="1"
              objectFit="cover"
              loading="lazy"
              borderRadius="small"
            />
          </s-box>
        )}

        {/* Product Details */}
        <s-stack
          direction="block"
          gap="tight"
          inlineSize="fill"
          alignItems="start"
          padding="base none none small"
        >
          <s-text type="strong">{item.title}</s-text>

          {item.variantTitle && (
            <s-text appearance="subdued">{item.variantTitle}</s-text>
          )}

          <s-text>
            {formatPrice(
              item.currentTotalPrice.amount,
              item.currentTotalPrice.currencyCode,
            )}{" "}
            / {shopify.i18n.translate("quantityLabel")}: {item.quantity}
          </s-text>
          {/* Checkbox */}
          <s-stack paddingBlockStart="small-100">
            {" "}
            <s-checkbox
              checked={selected}
              label="I'd like a refund"
              onChange={(e) => onCheckboxChange(e.currentTarget.checked)}
              accessibilityLabel={`Select ${item.title} for return`}
            />
          </s-stack>
        </s-stack>
      </s-stack>
    </s-box>
  );
}
