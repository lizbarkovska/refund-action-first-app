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

  console.log("id", orderId);
  render(<RefundPortalPage orderId={orderId} />, document.body);
};

// Main page component
function RefundPortalPage({ orderId }) {
  const [selectedItems, setSelectedItems] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);

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
                  variantId
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

  const handleRefundTypeSubmit = async (refundType) => {
    console.log("obj", Object.entries(selectedItems));
    // Validate: at least one item must be selected
    const selectedItemIds = Object.entries(selectedItems)
      .filter(([_, checked]) => checked)
      .map(([id]) => id);

    console.log(selectedItemIds, "selected");

    if (selectedItemIds.length === 0) {
      setSubmitError(shopify.i18n.translate("selectItemsError"));
      return;
    }

    // Get the full line items data and map to variant ID + product name
    const lineItems = orderData.value?.lineItems?.edges || [];
    const selectedItemsData = selectedItemIds
      .map((lineItemId) => {
        const lineItem = lineItems.find(({ node }) => node.id === lineItemId);
        if (!lineItem) return null;

        return {
          variantId: lineItem.node.variantId || null,
          productName: lineItem.node.title,
        };
      })
      .filter((item) => item !== null);

    console.log("Selected items data:", selectedItemsData);

    // Helper function to fetch existing refund requests
    const fetchExistingRefundRequests = async () => {
      const query = `
        query GetCustomerMetafield {
          customer {
            metafield(namespace: "custom", key: "refund_requests") {
              value
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
          }),
        }
      );

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      // Parse existing value or return empty array
      const existingValue = result.data?.customer?.metafield?.value;
      return existingValue ? JSON.parse(existingValue) : [];
    };

    setSubmitting(true);
    setSubmitError(null);

    try {
      // Use Customer Account API to write customer metafields
      // Get current customer ID and construct the GID format
      const customerNumericId = shopify.authenticatedAccount.customer.value.id;

      // Shopify GraphQL requires GID format: gid://shopify/Customer/123456
      const customerGID = `gid://shopify/Customer/${customerNumericId}`;

      console.log("Customer numeric ID:", customerNumericId);
      console.log("Customer GID:", customerGID);

      if (!customerNumericId) {
        throw new Error("Unable to get customer ID");
      }

      // Extract numeric order ID from GID format (gid://shopify/Order/123456 -> 123456)
      const orderNumericId = orderId.split("/").pop();

      // Fetch existing refund requests
      const existingRequests = await fetchExistingRefundRequests();

      // Create new refund request entry (semicolon-delimited)
      const newRequestEntry = `${orderId};${refundType};${JSON.stringify(selectedItemsData)}`;

      // Append to existing requests
      const updatedRequests = [...existingRequests, newRequestEntry];

      console.log("Submitting refund request:", {
        customerGID,
        orderId,
        orderNumericId,
        refundType,
        itemCount: selectedItemsData.length,
        existingRequestsCount: existingRequests.length,
        newRequestEntry,
        totalRequests: updatedRequests.length,
      });

      // GraphQL mutation to set refund_requests array metafield
      // This works for both creating new metafields AND updating existing ones
      const mutation = `
        mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              namespace
              key
              value
            }
            userErrors {
              field
              message
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
            query: mutation,
            variables: {
              metafields: [
                {
                  ownerId: customerGID,
                  namespace: "custom",
                  key: "refund_requests",
                  type: "list.single_line_text_field",
                  value: JSON.stringify(updatedRequests),
                },
              ],
            },
          }),
        }
      );

      const result = await response.json();
      console.log("Metafield mutation result:", result);

      // Check for errors
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      if (result.data?.metafieldsSet?.userErrors?.length > 0) {
        throw new Error(result.data.metafieldsSet.userErrors[0].message);
      }

      // Success!
      console.log("Refund request saved to customer metafield successfully");
      setSubmitted(true);
    } catch (err) {
      console.error("Refund submission error:", err);
      setSubmitError(err.message || shopify.i18n.translate("submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  // Success view - show after successful submission
  if (submitted) {
    return (
      <s-page heading={shopify.i18n.translate("refundPortalTitle")}>
        <s-section>
          <s-banner>
            <s-heading>{shopify.i18n.translate("successHeading")}</s-heading>
          </s-banner>
          <s-paragraph>{shopify.i18n.translate("successMessage")}</s-paragraph>
        </s-section>
      </s-page>
    );
  }

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

        {/* Show error banner if there's a submit error */}
        {submitError && (
          <s-banner>
            <s-text>{submitError}</s-text>
          </s-banner>
        )}

        <s-stack
          padding="large large large none"
          maxInlineSize="900px"
          direction="inline"
          gap="base"
        >
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

        <RefundSurvey
          onSubmit={handleRefundTypeSubmit}
          hasSelectedItems={hasSelectedItems}
          submitting={submitting}
        />

        {lineItems.length === 0 && (
          <s-text>No items available for return.</s-text>
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
      <s-stack gap="base" alignItems="start">
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
          label="Add to refund"
          onChange={(e) => onCheckboxChange(e.currentTarget.checked)}
          accessibilityLabel={`Select ${item.title} for return`}
        />
      </s-stack>
    </s-box>
  );
}

// Refund survey component
function RefundSurvey({ onSubmit, hasSelectedItems, submitting }) {
  return (
    <>
      <s-text>Please fill in the refund survey</s-text>
      <s-stack gap="small" paddingBlock="small">
        <s-choice-list>
          <s-choice defaultSelected value="location-1">
            Refund Reason
          </s-choice>
          <s-choice value="location-2"> Refund Reason</s-choice>
          <s-choice value="location-3"> Refund Reason</s-choice>
          <s-choice value="location-4"> Other</s-choice>
        </s-choice-list>
        <s-button-group>
          <s-button
            slot="primary-action"
            variant="primary"
            onClick={() => onSubmit("Store Credit")}
            disabled={submitting || !hasSelectedItems}
            loading={submitting}
          >
            {shopify.i18n.translate("requestStoreCreditButton")}
          </s-button>
          <s-button
            slot="secondary-actions"
            variant="secondary"
            onClick={() => onSubmit("Refund")}
            disabled={submitting || !hasSelectedItems}
            loading={submitting}
          >
            {shopify.i18n.translate("requestRefundButton")}
          </s-button>
        </s-button-group>
      </s-stack>
    </>
  );
}
