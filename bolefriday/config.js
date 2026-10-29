// Edit this file to update the menu, prices and payment settings.
window.BOLE_CONFIG = {
  // Paste your Paystack PUBLIC key (pk_test_... or pk_live_...) to take real card payments.
  // Leave empty to run checkout in demo mode.
  paystackPublicKey: "",

  whatsapp: "2348067270850",
  currency: "₦",

  bankTransfer: {
    bank: "Your Bank Name",
    accountName: "Bole Friday",
    accountNumber: "0000000000",
  },

  deliveryZones: [
    { id: "pickup", name: "Pickup (no delivery)", fee: 0 },
    { id: "zone-a", name: "Within 5km", fee: 1500 },
    { id: "zone-b", name: "5–10km", fee: 2500 },
    { id: "zone-c", name: "10km+", fee: 3500 },
  ],

  // Food photos: add image: "assets/food/your-photo.jpg" to any main or extra.
  heroImage: "assets/food/dline.jpg",

  // Main courses: customers pick a base and a protein; sauce is included.
  mains: [
    {
      id: "dline",
      name: "D-Line Railway",
      price: 10500,
      desc: "Roasted plantain, fish or kponmo, and our signature sauce.",
      bases: ["Plantain"],
      proteins: ["Fish", "Kponmo"],
      tag: "Bestseller",
      image: "assets/food/dline.jpg",
    },
    {
      id: "elekahia",
      name: "Elekahia Estate",
      price: 10000,
      desc: "Plantain plus yam or potato, fish or kponmo, and sauce.",
      bases: ["Plantain + Yam", "Plantain + Potato"],
      proteins: ["Fish", "Kponmo"],
      image: "assets/food/elekahia.jpg",
    },
    {
      id: "fimie",
      name: "Fimie Junction",
      price: 9500,
      desc: "Roasted yam or potato, fish or kponmo, and sauce.",
      bases: ["Yam", "Potato"],
      proteins: ["Fish", "Kponmo"],
      image: "assets/food/fimie.jpg",
      imagePosition: "center 70%",
    },
  ],

  extras: [
    { id: "fish", name: "Fish", price: 4000 },
    { id: "kponmo", name: "Kponmo", price: 1800, image: "assets/food/kponmo.jpg" },
    { id: "sauce", name: "Sauce", price: 2000 },
    { id: "yam", name: "Yam", price: 1300 },
    { id: "potato", name: "Potato", price: 1300 },
    { id: "turkey", name: "Turkey", price: 7000 },
    { id: "vegetable", name: "Vegetable", price: 1000 },
  ],
};
