import "@shopify/ui-extensions/preact";
import { render } from "preact";

export default async () => {
  render(<RequestRefundAction />, document.body);
};

function RequestRefundAction() {
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
  console.log(shopify);

  // return (
  //   <s-button href={`extension:refund-portal-page/`}>
  //     {shopify.i18n.translate("requestRefundButton")}
  //   </s-button>
  // );

  return (
    <s-button onClick={handleClick}>
      {shopify.i18n.translate("requestRefundButton")}
    </s-button>
  );
}
