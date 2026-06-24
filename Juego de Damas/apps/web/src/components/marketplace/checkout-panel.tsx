import { useEffect, useRef, useState } from "react";
import { loadStripe, type Stripe, type StripeElements, type StripePaymentElement } from "@stripe/stripe-js";
import type { StripeCheckoutResponse, ThemeMode } from "@damas/shared-types";
import { getStripeAppearance } from "../../lib/theme";

interface CheckoutPanelProps {
  config: StripeCheckoutResponse | null;
  theme: ThemeMode;
  onConfirm?: (paymentIntentId: string) => Promise<void>;
}

export function CheckoutPanel({ config, theme, onConfirm }: CheckoutPanelProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const paymentElementRef = useRef<StripePaymentElement | null>(null);

  useEffect(() => {
    if (!config || !hostRef.current) {
      return;
    }

    let active = true;

    void (async () => {
      const stripe = await loadStripe(config.publishableKey, { locale: "es" });
      if (!stripe || !active) {
        return;
      }

      stripeRef.current = stripe;
      const elements = stripe.elements({
        clientSecret: config.clientSecret,
        appearance: getStripeAppearance(theme),
        locale: "es",
      });
      elementsRef.current = elements;
      const paymentElement = elements.create("payment", { layout: "accordion" });
      paymentElementRef.current = paymentElement;
      paymentElement.mount(hostRef.current!);
    })().catch((caught) => setError(caught instanceof Error ? caught.message : "No se pudo cargar Stripe."));

    return () => {
      active = false;
      paymentElementRef.current?.destroy();
      paymentElementRef.current = null;
      elementsRef.current = null;
      stripeRef.current = null;
      if (hostRef.current) {
        hostRef.current.innerHTML = "";
      }
    };
  }, [config, theme]);

  async function confirmPayment() {
    if (!config || !stripeRef.current || !elementsRef.current) {
      setError("El checkout todavia no esta listo.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const submitResult = await elementsRef.current.submit();
      if (submitResult.error) {
        throw new Error(submitResult.error.message);
      }

      const result = await stripeRef.current.confirmPayment({
        elements: elementsRef.current,
        redirect: "if_required",
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      const paymentIntentId = result.paymentIntent?.id ?? config.paymentIntentId;
      if (!paymentIntentId) {
        throw new Error("Stripe no devolvio un payment intent valido.");
      }

      if (onConfirm) {
        await onConfirm(paymentIntentId);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo confirmar el pago.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel">
      <h3>Checkout base de Stripe</h3>
      <p>Este panel deja listo el `Payment Element` para la compra de skins del marketplace.</p>
      {error ? <p className="error-text">{error}</p> : null}
      <div ref={hostRef} className="checkout-host" />
      <div className="cta-row">
        <button type="button" className="cta-link" disabled={!config || submitting} onClick={() => void confirmPayment()}>
          {submitting ? "Procesando..." : "Confirmar pago"}
        </button>
      </div>
    </section>
  );
}
