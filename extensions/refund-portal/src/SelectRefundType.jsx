export default function SelectRefundType({
  submitError,
  submitting,
  onSubmit,
  orderData,
  onNavigate,
}) {
  return (
    <>
      <s-banner
        heading="You can now choose how you'd like to receive your refund: either as money returned to your original payment method or as store credit. Simply select your preferred refund type during the process."
        tone="info"
      ></s-banner>
      {submitError && (
        <s-banner>
          <s-text>{submitError}</s-text>
        </s-banner>
      )}
      <s-button-group>
        <s-button onClick={() => onNavigate("prev")} disabled={submitting}>
          Back
        </s-button>
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
    </>
  );
}
