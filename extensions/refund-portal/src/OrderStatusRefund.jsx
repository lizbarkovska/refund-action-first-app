import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useEffect } from "preact/hooks";

export default async () => {
  render(<RequestRefundAction />, document.body);
};

// Check if there are any items eligible for refund:
// - Must be fulfilled
// - Must have refundable quantity > 0
// - Must not already have a pending return request
function hasRefundableItems(order) {
  const lineItems = order?.lineItems?.edges || [];
  if (lineItems.length === 0) return false;

  // Build set of fulfilled line item IDs
  const fulfilledIds = new Set();
  (order?.fulfillments?.edges || []).forEach(({ node: fulfillment }) => {
    (fulfillment.fulfillmentLineItems?.edges || []).forEach(({ node: fli }) => {
      if (fli.lineItem?.id && fli.quantity > 0) {
        fulfilledIds.add(fli.lineItem.id);
      }
    });
  });

  // If nothing is fulfilled, no items can be refunded
  if (fulfilledIds.size === 0) return false;

  // Build set of line item IDs with pending return requests
  const returnedIds = new Set();
  (order?.returns?.edges || []).forEach(({ node: returnNode }) => {
    (returnNode.returnLineItems?.edges || []).forEach(({ node: rli }) => {
      if (rli.lineItem?.id) {
        returnedIds.add(rli.lineItem.id);
      }
    });
  });

  // An item is eligible if it's fulfilled, has refundable quantity, and no pending return
  return lineItems.some(
    ({ node }) =>
      fulfilledIds.has(node.id) &&
      node.refundableQuantity > 0 &&
      !returnedIds.has(node.id),
  );
}

function RequestRefundAction() {
  const [loading, setLoading] = useState(true);
  const [isEligible, setIsEligible] = useState(false);

  const handleClick = () => {
    const orderId = shopify.orderId;

    if (navigation && orderId) {
      navigation.navigate("extension:refund-portal-page/", {
        history: "push",
        state: { orderId },
      });
    } else {
      console.error("OrderId not available");
    }
  };

  useEffect(() => {
    const fetchOrderEligibility = async () => {
      try {
        setLoading(true);

        const orderId = shopify.orderId;
        if (!orderId) {
          console.error("Order ID not available");
          setLoading(false);
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
          },
        );

        const result = await response.json();

        if (result.errors && result.errors.length > 0) {
          console.error("GraphQL errors:", result.errors);
          setLoading(false);
          return;
        }

        const order = result.data.order;
        setIsEligible(hasRefundableItems(order));
      } catch (err) {
        console.error("Failed to check refund eligibility:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderEligibility();
  }, []);

  return (
    <s-button onClick={handleClick} disabled={loading || !isEligible}>
      {shopify.i18n.translate("requestRefundButton")}
    </s-button>
  );
}
