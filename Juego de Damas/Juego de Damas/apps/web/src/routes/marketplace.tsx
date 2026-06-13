import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/tanstack-react-start";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckoutPanel } from "../components/marketplace/checkout-panel";
import { api } from "../lib/api";

export const Route = createFileRoute("/marketplace")({
  component: MarketplacePage,
});

function MarketplacePage() {
  const { getToken, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const theme = ((typeof document !== "undefined" ? document.documentElement.dataset.theme : "light") ?? "light") as "light" | "dark";
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["me", "marketplace"],
    enabled: isSignedIn,
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        throw new Error("Debes iniciar sesion para ver tu inventario.");
      }
      return api.me(token);
    },
  });

  const itemsQuery = useQuery({
    queryKey: ["marketplace"],
    queryFn: () => api.getMarketplaceItems(),
  });

  const checkoutMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Debes iniciar sesion para comprar un skin.");
      }
      return api.createCheckout(itemId, token);
    },
  });

  const equipMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Debes iniciar sesion para equipar un skin.");
      }
      return api.equipSkin(itemId, token);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (paymentIntentId: string) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Debes iniciar sesion para reconciliar el pago.");
      }
      return api.confirmCheckout(paymentIntentId, token);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      setPurchaseMessage("Compra confirmada. El skin fue agregado a tu inventario. Regresando al lobby...");
      setTimeout(() => {
        void navigate({ to: "/" });
      }, 1400);
    },
  });

  return (
    <div className="dashboard-grid">
      <section className="panel market-screen-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Skins</p>
            <h2>Marketplace</h2>
          </div>
          <Link to="/" className="cta-link secondary">Regresar al lobby</Link>
        </div>
        <p>Compra apariencias con Stripe sandbox y equipalas para usarlas durante la partida.</p>
        {purchaseMessage ? <p className="success-text">{purchaseMessage}</p> : null}
        {itemsQuery.error ? <p className="error-text">{itemsQuery.error.message}</p> : null}
        <div className="stack-list market-list">
          {itemsQuery.data?.map((item) => {
            const unlocked = profileQuery.data?.unlockedSkinIds.includes(item.itemId) ?? false;
            const equipped = profileQuery.data?.equippedSkinId === item.itemId;

            return (
              <article key={item.itemId} className="market-item market-item-wide">
                <div className="market-swatch" style={{ background: item.previewColor }} />
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.description}</p>
                  <p>{unlocked ? "Disponible en inventario" : `Precio: $${item.priceUsd.toFixed(2)}`}</p>
                </div>
                {unlocked ? (
                  <button type="button" className="cta-link secondary" disabled={equipped || equipMutation.isPending} onClick={() => equipMutation.mutate(item.itemId)}>
                    {equipped ? "Equipada" : "Equipar"}
                  </button>
                ) : (
                  <button type="button" className="cta-link" disabled={!isSignedIn || checkoutMutation.isPending} onClick={() => checkoutMutation.mutate(item.itemId)}>
                    Comprar
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {checkoutMutation.data ? (
        <CheckoutPanel
          config={checkoutMutation.data}
          theme={theme}
          onConfirm={async (paymentIntentId) => {
            await confirmMutation.mutateAsync(paymentIntentId);
          }}
        />
      ) : null}
    </div>
  );
}
