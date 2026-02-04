import { useState } from "preact/hooks";
export default function SelectRefundReason({
  onRefundReasonSelect,
  refundReason,
  onNavigate,
  submitError,
}) {
  const [selectedChoice, setSelectedChoice] = useState(
    refundReason.startsWith("other:") ? "other" : refundReason,
  );
  const [otherText, setOtherText] = useState(
    refundReason.startsWith("other: ") ? refundReason.slice(7) : "",
  );

  const handleChoiceChange = (e) => {
    const value = e.currentTarget.values[0] ?? "";
    setSelectedChoice(value);
    if (value === "other") {
      onRefundReasonSelect(otherText ? `other: ${otherText}` : "other");
    } else {
      onRefundReasonSelect(value);
    }
  };

  const handleOtherTextChange = (e) => {
    const text = e.currentTarget.value;
    setOtherText(text);
    onRefundReasonSelect(text ? `other: ${text}` : "other");
  };

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
        <s-choice-list onChange={handleChoiceChange}>
          <s-choice value="size-too-big"> Too big </s-choice>
          <s-choice value="size-too-small"> Too small </s-choice>
          <s-choice value="color"> Color </s-choice>
          <s-choice value="changed-mind"> Changed my mind </s-choice>
          <s-choice value="not-as-described"> Item not as described </s-choice>
          <s-choice value="wrong-item"> Received the wrong item </s-choice>
          <s-choice value="damaged"> Damaged or defective </s-choice>
          <s-choice value="other"> Other </s-choice>
        </s-choice-list>
        {selectedChoice === "other" && (
          <s-text-area
            label="Please describe your reason"
            value={otherText}
            onInput={handleOtherTextChange}
          />
        )}
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
