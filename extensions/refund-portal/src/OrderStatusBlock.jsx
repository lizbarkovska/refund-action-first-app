import '@shopify/ui-extensions/preact';
import {render} from "preact";
import RefundBlock from "./RefundBlock.jsx";  // Import the component

export default async () => {
  render(<Extension />, document.body)
}

function Extension() {
  return (
    <>
      {/* Original banner */}
      <s-banner>
        <s-text>
          Need a refund? Visit our refund portal.
        </s-text>
      </s-banner>

      {/* RefundBlock component rendered here */}
      <RefundBlock />
    </>
  );
}