export interface Product {
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
}

export const products: Product[] = [
  {
    priceId: 'price_1Rf3wYRbM8sGWPlIwIDZXzZl',
    name: 'Diagaurd Diamond Plan',
    description: 'A seamless monthly billing system through my app that enables users to subscribe to a recurring membership plan. The system should allow customers to securely enter their payment information, choose from different subscription tiers (e.g., Basic, Premium, VIP), and automatically charge their selected plan on a monthly basis. I would like the payment interface to have a clean, modern look consistent with my app\'s design: minimalistic with a white or light background.',
    mode: 'subscription',
  },
];