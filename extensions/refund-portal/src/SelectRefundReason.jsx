export default function SelectRefundReason({
  onRefundReasonSelect,
  refundReason,
  onNavigate,
  submitError,
}) {
  const refundReasonIndicated = refundReason !== "";
  return (
    <>
      <s-heading>Please fill in the refund survey:</s-heading>
      {submitError && (
        <s-banner tone="critical">
          <s-text>{submitError}</s-text>
        </s-banner>
      )}
      <s-stack gap="small" paddingBlock="large">
        <s-choice-list
          onChange={(e) => onRefundReasonSelect(e.currentTarget.values[0] ?? 0)}
        >
          <s-choice value="size-too-big"> Too big </s-choice>
          <s-choice value="size-too-small"> Too small </s-choice>
          <s-choice value="color"> Color </s-choice>
          <s-choice value="changed-mind"> Changed my mind </s-choice>
          <s-choice value="not-as-described"> Item not as described </s-choice>
          <s-choice value="wrong-item"> Received the wrong item </s-choice>
          <s-choice value="damaged"> Damaged or defective </s-choice>
          <s-choice value="other"> Other </s-choice>
        </s-choice-list>
      </s-stack>

      <s-stack direction="inline" justifyContent="end" gap="small">
        {" "}
        <s-button variant="secondary" onClick={() => onNavigate("prev")}>
          Back
        </s-button>
        <s-button
          variant="primary"
          onClick={() => onNavigate("next")}
          disabled={!refundReasonIndicated}
        >
          Next
        </s-button>
      </s-stack>
    </>
  );
}
