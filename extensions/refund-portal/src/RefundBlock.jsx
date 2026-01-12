// Reusable RefundBlock component
export default function RefundBlock() {
  const goToRefundPage = () => {
    window.location.href =
      "/account/extensions/refund-portal/refund-portal-page";
  };
  return (
    <s-section heading="Refunds">
      <s-paragraph>
        <s-text> You can request refund here:</s-text>
        <s-button onClick={goToRefundPage} slot="primary-action">
          Request refund
        </s-button>
      </s-paragraph>
    </s-section>
  );
}
