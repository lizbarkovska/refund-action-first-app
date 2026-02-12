export default function SelectRefundType({
  submitError,
  submitting,
  onSubmit,
  onNavigate,
}) {
  return (
    <>
      <s-heading>How would you like to receive your refund? </s-heading>
      {submitError && (
        <s-banner>
          <s-text>{submitError}</s-text>
        </s-banner>
      )}
      <s-box paddingBlock="large">
        <s-paragraph type="small" tone="info">
          You can receive a refund as store credit and{" "}
          <s-text type="emphasis">get 5% off</s-text> your next purchase
          (limited time offer).{" "}
        </s-paragraph>
        <s-paragraph type="small" tone="info">
          <s-text type="small">
            Alternatively you can receive a full refund to your original payment
            method.
          </s-text>
        </s-paragraph>
      </s-box>
      <s-stack
        direction="inline"
        gap="small"
        justifyContent="center"
        alignItems="start"
        rowGap="small"
        padding="base"
      >
        <s-stack>
          {" "}
          <s-box inlineSize="170px">
            {" "}
            <s-button
              inlineSize="fill"
              variant="primary"
              onClick={() => onSubmit("Store Credit")}
              disabled={submitting}
              loading={submitting}
            >
              {shopify.i18n.translate("requestStoreCreditButton")}
            </s-button>
            <s-stack alignItems="center">
              <s-text type="small">Get 5% discount </s-text>
            </s-stack>
          </s-box>
        </s-stack>

        <s-box inlineSize="170px">
          {" "}
          <s-button
            inlineSize="fill"
            variant="secondary"
            onClick={() => onSubmit("Refund to original payment method")}
            disabled={submitting}
            loading={submitting}
          >
            {shopify.i18n.translate("requestRefundButton")}
          </s-button>
          <s-text type="small"></s-text>
        </s-box>
      </s-stack>
      <s-stack direction="inline" justifyContent="end" paddingBlock="small">
        {" "}
        <s-button variant="secondary" onClick={() => onNavigate("prev")}>
          Back
        </s-button>
      </s-stack>
    </>
  );
}
