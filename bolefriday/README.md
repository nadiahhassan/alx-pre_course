# Bole Friday — food ordering site

Portharcourt bole in Abuja. A static site with no build step: sign up, browse the menu, manage your bag, check out, pay and track orders.

## Run it

```bash
cd bolefriday && python3 -m http.server 8000
```

Then open http://localhost:8000. Any static host works too (Netlify, Vercel, GitHub Pages).

## Customise

- **Menu, prices, delivery fees, bank details, WhatsApp number:** `config.js`
- **Real card payments:** paste your Paystack public key into `paystackPublicKey` in `config.js`. With no key set, card payment runs in demo mode.
- **Logo:** `assets/logo.svg` is a vector redraw. Put the original file at `assets/logo.png` and the site uses it automatically.
- **Food photos:** add `image: "assets/your-photo.jpg"` to any item in `mains`.

## Heads-up before going live

Accounts and orders are stored in the customer's browser (`localStorage`). That's fine for a demo, but Bole Friday won't see the orders. For now, the success page has a **Send on WhatsApp** button that sends the full order to 0806 727 0850. For a real launch, connect a backend (for example Firebase or Supabase) for accounts and orders, and verify Paystack payments on the server.
