// Import Preact support for Shopify extensions
import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useTranslate } from "@shopify/ui-extensions/customer-account/preact";

// Main entry point - Shopify calls this function
export default async () => {
  render(<RefundPortalPage />, document.body);
};

// Your page component
function RefundPortalPage() {
  // Use the translate hook to get the translate function
  const translate = useTranslate();
  // Handler for "Request Refund" button
  const handleRefundClick = () => {
    console.log("Request Refund clicked");
    // For now, just log to console
    // Later: Add email functionality here
  };

  // Handler for "Request Store Credit" button
  const handleStoreCreditClick = () => {
    console.log("Request Store Credit clicked");
    // For now, just log to console
    // Later: Add email functionality here
  };

  return (
    <s-page
      heading={translate("refundPortalTitle")}
      subheading={translate("refundPortalSubtitle")}
    >
      {/* Back button in breadcrumb area */}
      <s-button
        slot="breadcrumb-actions"
        accessibilityLabel="Back to orders"
      ></s-button>

      {/* Main content area */}
      <s-section heading={translate("refundOptionsHeading")}>
        <s-paragraph>
          {translate("refundInstructions")}
        </s-paragraph>

        {/* Button group for the two refund options */}
        <s-button-group>
          <s-button
            slot="primary-action"
            variant="primary"
            onClick={handleRefundClick}
          >
            {translate("requestRefundButton")}
          </s-button>

          <s-button
            slot="secondary-actions"
            variant="secondary"
            onClick={handleStoreCreditClick}
          >
            {translate("requestStoreCreditButton")}
          </s-button>
        </s-button-group>
      </s-section>
    </s-page>
  );
}
