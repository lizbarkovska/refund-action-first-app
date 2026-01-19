export default function SelectRefundReason({
  onRefundReasonSelect,
  refundReason,
  onNavigate,
  submitError,
}) {
  const refundReasonIndicated = refundReason !== "";
  return (
    <>
      <s-heading>Please fill in the refund survey</s-heading>
      {submitError && (
        <s-banner status="critical">
          <s-text>{submitError}</s-text>
        </s-banner>
      )}
      <s-stack gap="small" paddingBlock="small">
        <s-choice-list
          onChange={(e) => onRefundReasonSelect(e.currentTarget.values[0] ?? 0)}
        >
          <s-choice value="size-issues"> Size or fit issues </s-choice>
          <s-choice value="damaged"> Damaged or defective items </s-choice>
          <s-choice value="not-as-expected">
            {" "}
            Not as described or expected{" "}
          </s-choice>
          <s-choice value="shipping_issue">
            Shipping/fulfillment problems
          </s-choice>
        </s-choice-list>
      </s-stack>
      <s-button-group>
        <s-button onClick={() => onNavigate("prev")}>Prev</s-button>
        <s-button
          onClick={() => onNavigate("next")}
          disabled={!refundReasonIndicated}
        >
          Next
        </s-button>
      </s-button-group>
    </>
  );
}
