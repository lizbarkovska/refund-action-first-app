// Import Preact support for Shopify extensions
import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useEffect } from "preact/hooks";
import { signal } from "@preact/signals";
import SelectRefundItems from "./SelectRefundItems.jsx";
import SelectRefundReason from "./SelectRefundReason.jsx";
import SelectRefundType from "./SelectRefundType.jsx";

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
  const [refundReason, setRefundReason] = useState("");
  const [refundStep, setRefundStep] = useState(1);
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
      console.log(orderData.value, "order data");
    } catch (err) {
      error.value = err.message || "Failed to load order details";
    } finally {
      loading.value = false;
    }
  };

  const MIN_STEP = 1;
  const MAX_STEP = 3;
  const handleStepNavigation = (navigationDirection) => {
    // Validate current step before moving forward
    if (navigationDirection === "next") {
      if (refundStep === 1) {
        // Validate items selected
        const hasSelectedItems = Object.values(selectedItems).some(
          (v) => v === true
        );
        if (!hasSelectedItems) {
          setSubmitError("Please select at least one item for refund");
          return; // Don't navigate
        }
        setSubmitError(null); // Clear error
      } else if (refundStep === 2) {
        // Validate reason selected
        if (!refundReason || refundReason === "") {
          setSubmitError("Please select a refund reason");
          return; // Don't navigate
        }
        setSubmitError(null); // Clear error
      }

      // Validation passed, move forward
      if (refundStep < MAX_STEP) {
        setRefundStep(refundStep + 1);
      }
    } else if (navigationDirection === "prev") {
      // Going back doesn't need validation
      if (refundStep > MIN_STEP) {
        setRefundStep(refundStep - 1);
        setSubmitError(null); // Clear errors when going back
      }
    }
  };

  const handleRefundTypeSubmit = async (refundType) => {
    console.log("obj", Object.entries(selectedItems));

    // Extract selected item IDs (validation already done in step 1)
    const selectedItemIds = Object.entries(selectedItems)
      .filter(([_, checked]) => checked)
      .map(([id]) => id);

    console.log(selectedItemIds, "selected");

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
      const newRequestEntry = `ID: ${orderId}; refund method: ${refundType};reason: ${refundReason}; items: ${JSON.stringify(
        selectedItemsData
      )}`;

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

  const lineItems = orderData.value?.lineItems?.edges || [];

  if (submitted) {
    return (
      <s-page heading={shopify.i18n.translate("refundPortalTitle")}>
        <s-section>
          <s-banner tone="success">
            <s-heading>{shopify.i18n.translate("successHeading")}</s-heading>
          </s-banner>
          <s-box paddingBlock="small">
            {" "}
            <s-paragraph>
              {shopify.i18n.translate("successMessage")}
            </s-paragraph>
          </s-box>
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

  return (
    <s-page
      heading={shopify.i18n.translate("refundPortalTitle")}
      subheading={`Order ${orderData.value?.name || ""}`}
    >
      <s-section>
        {" "}
        <s-stack alignItems="center">
          <s-box
            border="base base solid"
            borderRadius="base"
            padding="base base base base"
            maxInlineSize="800px"
          >
            {refundStep === 1 && (
              <SelectRefundItems
                lineItems={lineItems}
                selectedItems={selectedItems}
                setSelectedItems={setSelectedItems}
                onNavigate={handleStepNavigation}
                submitError={submitError}
              />
            )}
            {refundStep === 2 && (
              <SelectRefundReason
                onRefundReasonSelect={setRefundReason}
                refundReason={refundReason}
                onNavigate={handleStepNavigation}
                submitError={submitError}
              />
            )}
            {refundStep === 3 && (
              <SelectRefundType
                submitError={submitError}
                submitting={submitting}
                onSubmit={handleRefundTypeSubmit}
                orderData={orderData}
                onNavigate={handleStepNavigation}
              />
            )}

            {refundStep === 1 && lineItems.length === 0 && (
              <s-text>No items available for return.</s-text>
            )}
          </s-box>
        </s-stack>
      </s-section>
    </s-page>
  );
}
