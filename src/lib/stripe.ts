import Stripe from "stripe";

let stripeClient: Stripe | null = null;

/**
 * Retorna uma instância singleton do cliente Stripe.
 *
 * A instanciação é preguiçosa (lazy) para não quebrar o build quando a
 * `STRIPE_SECRET_KEY` ainda não está disponível no ambiente.
 */
export function getStripe(): Stripe {
  if (!stripeClient) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY não configurado no ambiente.");
    }
    stripeClient = new Stripe(apiKey);
  }
  return stripeClient;
}
