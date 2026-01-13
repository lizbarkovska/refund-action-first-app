// Import Preact support for Shopify extensions
import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useEffect } from "preact/hooks";
import { signal } from "@preact/signals";

// State signals for order data
const orderData = signal(null);
const loading = signal(true);
const error = signal(null);

// Main entry point - Shopify calls this function
export default async () => {
  // Get navigation state with order ID
  const navigationState = navigation.currentEntry.getState() || {};
  console.log("statenav", navigationState);
  const orderId = navigationState.orderId;

  render(<RefundPortalPage orderId={orderId} />, document.body);
};

// Main page component
function RefundPortalPage({ orderId }) {
  const [selectedItems, setSelectedItems] = useState({});

  useEffect(() => {
    if (orderId) {
      fetchOrderData(orderId);
    } else {
      error.value = "No order ID provided";
      loading.value = false;
    }
  }, [orderId]);

  const fetchOrderData = async (id) => {
    try {
      loading.value = true;
      error.value = null;

      const query = `
        query GetOrderDetails($orderId: ID!) {
          order(id: $orderId) {
            id
            name
            lineItems(first: 50) {
              edges {
                node {
                  id
                  title
                  quantity
                  image {
                    url
                    altText
                  }
                  currentTotalPrice {
                    amount
                    currencyCode
                  }
                  variantTitle
                }
              }
            }
          }
        }
      `;

      const response = await fetch(
        "shopify://customer-account/api/2025-10/graphql.json",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            variables: { orderId: id },
          }),
        }
      );

      const result = await response.json();

      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0].message);
      }

      orderData.value = result.data.order;
    } catch (err) {
      error.value = err.message || "Failed to load order details";
    } finally {
      loading.value = false;
    }
  };

  const handleCheckboxChange = (lineItemId, checked) => {
    setSelectedItems((prev) => ({
      ...prev,
      [lineItemId]: checked,
    }));
  };

  const handleSubmit = () => {
    const selected = Object.entries(selectedItems)
      .filter(([_, checked]) => checked)
      .map(([id]) => id);

    console.log("Selected items for refund:", selected);
    console.log("Selected count:", selected.length);

    // TODO: Implement refund request submission
    // This is where you would send the selected items to your backend
  };

  // Loading state
  if (loading.value) {
    return (
      <s-page heading={shopify.i18n.translate("refundPortalTitle")}>
        <s-section>
          <s-text>{shopify.i18n.translate("loadingOrder")}</s-text>
        </s-section>
      </s-page>
    );
  }

  // Error state
  if (error.value) {
    return (
      <s-page heading={shopify.i18n.translate("refundPortalTitle")}>
        <s-section>
          <s-banner status="critical">
            <s-text>{error.value}</s-text>
          </s-banner>
          {!orderId && (
            <s-text>{shopify.i18n.translate("noOrderError")}</s-text>
          )}
        </s-section>
      </s-page>
    );
  }

  const lineItems = orderData.value?.lineItems?.edges || [];
  const hasSelectedItems = Object.values(selectedItems).some((v) => v === true);

  return (
    <s-page
      heading={shopify.i18n.translate("refundPortalTitle")}
      subheading={`Order ${orderData.value?.name || ""}`}
    >
      <s-section heading={shopify.i18n.translate("selectItemsHeading")}>
        <s-paragraph>
          {shopify.i18n.translate("selectItemsInstructions")}
        </s-paragraph>

        <s-stack direction="column" gap="base">
          {lineItems.map(({ node: item }) => (
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

        {lineItems.length === 0 && (
          <s-text>No items available for return.</s-text>
        )}

        {lineItems.length > 0 && (
          <s-button-group>
            <s-button
              slot="primary-action"
              variant="primary"
              onClick={handleSubmit}
              disabled={!hasSelectedItems}
            >
              {shopify.i18n.translate("continueButton")}
            </s-button>
          </s-button-group>
        )}
      </s-section>
    </s-page>
  );
}

// Line item card component
function LineItemCard({ item, selected, onCheckboxChange }) {
  const formatPrice = (amount, currencyCode) => {
    return `${parseFloat(amount).toFixed(2)} ${currencyCode}`;
  };

  return (
    <s-box padding="base" borderRadius="base" borderWidth="base">
      <s-stack direction="row" gap="base" alignItems="center">
        {/* Product Image */}
        {item.image?.url && (
          <s-box inlineSize="80px" blockSize="80px">
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
        <s-stack direction="column" gap="tight" inlineSize="fill">
          <s-text weight="bold">{item.title}</s-text>

          {item.variantTitle && (
            <s-text appearance="subdued">{item.variantTitle}</s-text>
          )}

          <s-text>
            {shopify.i18n.translate("quantityLabel")}: {item.quantity} •{" "}
            {formatPrice(
              item.currentTotalPrice.amount,
              item.currentTotalPrice.currencyCode
            )}
          </s-text>
        </s-stack>

        {/* Checkbox */}
        <s-checkbox
          checked={selected}
          onChange={(e) => onCheckboxChange(e.currentTarget.checked)}
          accessibilityLabel={`Select ${item.title} for return`}
        />
      </s-stack>
    </s-box>
  );
}
