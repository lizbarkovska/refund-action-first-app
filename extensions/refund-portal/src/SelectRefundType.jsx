export default function SelectRefundType({
  submitError,
  submitting,
  onSubmit,
  onNavigate,
}) {
  return (
    <>
      <s-heading>Please select the refund type </s-heading>
      {submitError && (
        <s-banner>
          <s-text>{submitError}</s-text>
        </s-banner>
      )}
      <s-box paddingBlock="large">
        <s-paragraph>
          {" "}
          We're sorry the product didn't meet your expectations. We've received
          your refund request, and our administrator will review it shortly.
          Meanwhile please choose your refund option. Store credit can be used
          anytime toward another product, while money back is returned to your
          original payment method and may take a few business days to process.
        </s-paragraph>
      </s-box>
      <s-button-group>
        <s-button
          slot="primary-action"
          variant="primary"
          onClick={() => onSubmit("Store Credit")}
          disabled={submitting}
          loading={submitting}
        >
          {shopify.i18n.translate("requestStoreCreditButton")}
        </s-button>
        <s-button
          slot="secondary-actions"
          variant="secondary"
          onClick={() => onSubmit("Refund")}
          disabled={submitting}
          loading={submitting}
        >
          {shopify.i18n.translate("requestRefundButton")}
        </s-button>
      </s-button-group>
      <s-stack direction="inline" justifyContent="end" paddingBlock="small">
        {" "}
        <s-button variant="secondary" onClick={() => onNavigate("prev")}>
          Back
        </s-button>
      </s-stack>
    </>
  );
}
