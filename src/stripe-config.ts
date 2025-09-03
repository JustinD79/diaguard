export interface Product {
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  productId?: string;
  price?: number;
}

export const products: Product[] = [
  {
    priceId: 'price_1Rf3wYRbM8sGWPlIwIDZXzZl',
    name: 'Diagaurd Diamond Plan',
    description: 'Complete diabetes management with unlimited AI food scanning, advanced analytics, personalized coaching, and all premium features for comprehensive health tracking.',
    mode: 'subscription',
    productId: 'prod_SaEPL36VCTwpVo',
    price: 15.00,
  },
];