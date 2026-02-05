import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useEffect } from "preact/hooks";
import { signal } from "@preact/signals";
import SelectRefundItems from "./SelectRefundItems.jsx";
import SelectRefundReason from "./SelectRefundReason.jsx";
import SelectRefundType from "./SelectRefundType.jsx";

const orderData = signal(null);
const loading = signal(true);
const error = signal(null);

const REFUND_REASON_MAP = {
  "size-too-big": "gid://shopify/ReturnReasonDefinition/8",
  "size-too-small": "gid://shopify/ReturnReasonDefinition/7",
  color: "gid://shopify/ReturnReasonDefinition/10",
  "changed-mind": "gid://shopify/ReturnReasonDefinition/2",
  "not-as-described": "gid://shopify/ReturnReasonDefinition/3",
  "wrong-item": "gid://shopify/ReturnReasonDefinition/4",
  damaged: "gid://shopify/ReturnReasonDefinition/6",
  other: "gid://shopify/ReturnReasonDefinition/5",
};

export default async () => {
  const navigationState = navigation.currentEntry.getState() || {};
  const orderId = navigationState.orderId;

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
                  variantTitle
                  refundableQuantity
                  image {
                    url
                    altText
                  }
                  currentTotalPrice {
                    amount
                    currencyCode
                  }
                }
              }
            }
            returns(first: 50) {
              edges {
                node {
                  returnLineItems(first: 50) {
                    edges {
                      node {
                        lineItem {
                          id
                        }
                      }
                    }
                  }
                }
              }
            }
            fulfillments(first: 50) {
              edges {
                node {
                  fulfillmentLineItems(first: 50) {
                    edges {
                      node {
                        lineItem {
                          id
                        }
                        quantity
                      }
                    }
                  }
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
        },
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

  const MIN_STEP = 1;
  const MAX_STEP = 3;
  const handleStepNavigation = (navigationDirection) => {
    if (navigationDirection === "next") {
      if (refundStep === 1) {
        const hasSelectedItems = Object.values(selectedItems).some(
          (v) => v === true,
        );
        if (!hasSelectedItems) {
          setSubmitError("Please select at least one item for refund");
          return;
        }
        setSubmitError(null);
      } else if (refundStep === 2) {
        if (!refundReason || refundReason === "") {
          setSubmitError("Please select a refund reason");
          return;
        }
        setSubmitError(null);
      }

      if (refundStep < MAX_STEP) {
        setRefundStep(refundStep + 1);
      }
    } else if (navigationDirection === "prev") {
      if (refundStep > MIN_STEP) {
        setRefundStep(refundStep - 1);
        setSubmitError(null);
      }
    }
  };
  const setRefundStatus = async (refundType) => {
    // Get ALL selected item IDs
    const selectedItemIds = Object.entries(selectedItems)
      .filter(([_, checked]) => checked)
      .map(([id]) => id);

    const reasonKey = refundReason.startsWith("other:")
      ? "other"
      : refundReason;
    const reasonGid = REFUND_REASON_MAP[reasonKey];

    if (!reasonGid) {
      throw new Error(`Invalid refund reason: ${refundReason}`);
    }
    const mutation = `
      mutation orderRequestReturn($orderId: ID!, $requestedLineItems: [RequestedLineItemInput!]!) {
      orderRequestReturn(orderId: $orderId, requestedLineItems: $requestedLineItems) {
        return {
          id
          status
          returnLineItems(first: 10) {
            edges {
              node {
                id
                quantity
                returnReasonDefinition {
                  handle
                  name
                  deleted
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
    `;

    const lineItems = orderData.value?.lineItems?.edges || [];
    console.log(refundReason, "reason");
    const returnNote = refundReason.includes("other")
      ? `${refundType}; Return Reason - ${refundReason}`
      : refundType;

    const response = await fetch(
      "shopify://customer-account/api/2026-01/graphql.json",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: mutation,
          variables: {
            orderId: orderId,
            // Map over ALL selected items
            requestedLineItems: selectedItemIds.map((lineItemId) => {
              const lineItem = lineItems.find(
                ({ node }) => node.id === lineItemId,
              );
              const quantity = lineItem?.node?.refundableQuantity || 1;
              return {
                lineItemId: lineItemId,
                quantity,
                returnReasonDefinitionId: reasonGid,
                customerNote: returnNote,
              };
            }),
          },
        }),
      },
    );

    const result = await response.json();
    console.log("orderRequestReturn result:", result);
    return result;
  };

  const handleRefundTypeSubmit = async (refundType) => {
    const selectedItemIds = Object.entries(selectedItems)
      .filter(([_, checked]) => checked)
      .map(([id]) => id);

    const lineItems = orderData.value?.lineItems?.edges || [];
    const selectedItemsData = selectedItemIds
      .map((lineItemId) => {
        const lineItem = lineItems.find(({ node }) => node.id === lineItemId);
        if (!lineItem) return null;

        const variantIdNumeric = lineItem.node.variantId
          ? lineItem.node.variantId.split("/").pop()
          : null;

        return {
          variantId: variantIdNumeric,
          productName: lineItem.node.title || null,
          variantName: lineItem.node.variantTitle || null,
        };
      })
      .filter((item) => item !== null);

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
        },
      );

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      const existingValue = result.data?.customer?.metafield?.value;
      return existingValue ? JSON.parse(existingValue) : [];
    };

    setSubmitting(true);
    setSubmitError(null);

    try {
      // Use Customer Account API to write customer metafields
      const customerNumericId = shopify.authenticatedAccount.customer.value.id;

      const customerGID = `gid://shopify/Customer/${customerNumericId}`;

      if (!customerNumericId) {
        throw new Error("Unable to get customer ID");
      }

      const orderNumericId = orderId.split("/").pop();

      const existingRequests = await fetchExistingRefundRequests();

      const itemsString = selectedItemsData
        .map(
          (item) =>
            `${item.productName}${
              item.variantName ? ` (${item.variantName})` : ""
            } - Variant ID: ${item.variantId}`,
        )
        .join(", ");

      const newRequestEntry = `ID: ${orderNumericId}; Refund method: ${refundType}; Refund Reason: ${refundReason}; Items to refund: ${itemsString}`;

      const updatedRequests = [...existingRequests, newRequestEntry];

      // GraphQL mutation to set refund_requests array metafield
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
        },
      );

      const result = await response.json();

      // Check for errors
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      if (result.data?.metafieldsSet?.userErrors?.length > 0) {
        throw new Error(result.data.metafieldsSet.userErrors[0].message);
      }

      // Test the orderRequestReturn mutation
      await setRefundStatus(refundType);

      // Success!
      setSubmitted(true);
    } catch (err) {
      console.error("Refund submission error:", err);
      setSubmitError(err.message || shopify.i18n.translate("submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  const lineItems = orderData.value?.lineItems?.edges || [];
  const returns = orderData.value?.returns?.edges || [];

  // Build set of fulfilled line item IDs
  const fulfilledLineItemIds = new Set();
  (orderData.value?.fulfillments?.edges || []).forEach(
    ({ node: fulfillment }) => {
      (fulfillment.fulfillmentLineItems?.edges || []).forEach(
        ({ node: fli }) => {
          if (fli.lineItem?.id && fli.quantity > 0) {
            fulfilledLineItemIds.add(fli.lineItem.id);
          }
        },
      );
    },
  );

  // Only show fulfilled items in the refund selection
  const fulfilledLineItems =
    fulfilledLineItemIds.size > 0
      ? lineItems.filter(({ node }) => fulfilledLineItemIds.has(node.id))
      : [];

  if (submitted) {
    return (
      <s-page heading={shopify.i18n.translate("refundPortalTitle")}>
        <s-link href="shopify:customer-account/orders">Back to Orders</s-link>
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
          <s-banner tone="critical">
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
      <s-link href="shopify:customer-account/orders">Back to Orders</s-link>
      <s-section>
        {" "}
        <s-stack alignItems="center">
          <s-box padding="base">
            {" "}
            <s-text type="small">
              Returns available for fulfilled items only. For unfulfilled items,
              contact care@fabiani.ie
            </s-text>
          </s-box>
          <s-box padding="base base base base" maxInlineSize="800px">
            {refundStep === 1 && (
              <SelectRefundItems
                lineItems={fulfilledLineItems}
                returns={returns}
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
                onNavigate={handleStepNavigation}
              />
            )}

            {refundStep === 1 && fulfilledLineItems.length === 0 && (
              <s-text>No items available for return.</s-text>
            )}
          </s-box>
        </s-stack>
      </s-section>
    </s-page>
  );
}
