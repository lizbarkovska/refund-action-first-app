import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useEffect } from "preact/hooks";

export default async () => {
  render(<RequestRefundAction />, document.body);
};

// Helper function to check if all line items are fully refunded
function checkIfFullyRefunded(order) {
  const lineItems = order?.lineItems?.edges || [];

  // If no line items, consider not fully refunded
  if (lineItems.length === 0) {
    return false;
  }

  // Check if ALL items have zero refundable quantity
  return lineItems.every(({ node }) => node.refundableQuantity === 0);
}

function RequestRefundAction() {
  // State for refund eligibility check
  const [loading, setLoading] = useState(true);
  const [isFullyRefunded, setIsFullyRefunded] = useState(false);

  const handleClick = () => {
    // Debug: Check what's available on the global shopify object
    console.log("Shopify object:", shopify.extension);
    console.log("Shopify keys:", Object.keys(shopify));

    // Try to access order ID from shopify global
    const orderId = shopify.orderId;
    console.log("Order ID:", orderId);

    // Try navigation
    if (navigation && orderId) {
      console.log("Navigating with order ID:", orderId);
      navigation.navigate("extension:refund-portal-page/", {
        history: "push",
        state: { orderId },
      });
    } else {
      console.error("OrderId not available");
    }
  };

  // Fetch order data to check refund eligibility
  useEffect(() => {
    const fetchOrderEligibility = async () => {
      try {
        setLoading(true);

        const orderId = shopify.orderId;
        if (!orderId) {
          console.error("Order ID not available");
          setLoading(false);
          setIsFullyRefunded(true); // Disable button if no order ID
          return;
        }

        const query = `
          query CheckOrderRefundEligibility($orderId: ID!) {
            order(id: $orderId) {
              id
              lineItems(first: 50) {
                edges {
                  node {
                    id
                    refundableQuantity
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
              variables: { orderId },
            }),
          }
        );

        const result = await response.json();

        if (result.errors && result.errors.length > 0) {
          console.error("GraphQL errors:", result.errors);
          setIsFullyRefunded(true); // Disable button on error (fail closed)
          setLoading(false);
          return;
        }

        const order = result.data.order;
        const fullyRefunded = checkIfFullyRefunded(order);

        console.log("Refund eligibility check:", {
          orderId,
          lineItemsCount: order?.lineItems?.edges?.length || 0,
          isFullyRefunded: fullyRefunded,
        });

        setIsFullyRefunded(fullyRefunded);
      } catch (err) {
        console.error("Failed to check refund eligibility:", err);
        setIsFullyRefunded(true); // Disable button on error (fail closed)
      } finally {
        setLoading(false);
      }
    };

    fetchOrderEligibility();
  }, []); // Run once on mount

  console.log(shopify);

  // return (
  //   <s-button href={`extension:refund-portal-page/`}>
  //     {shopify.i18n.translate("requestRefundButton")}
  //   </s-button>
  // );

  return (
    <s-button onClick={handleClick} disabled={loading || isFullyRefunded}>
      {shopify.i18n.translate("requestRefundButton")}
    </s-button>
  );
}
