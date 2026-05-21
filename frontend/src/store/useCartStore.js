import { create } from 'zustand';

const useCartStore = create((set, get) => ({
  items: [], // elements: { product, quantity }
  discountAmount: 0,
  taxRate: 19, // 19% VAT
  paymentMethod: 'cash',
  amountPaid: 0,
  notes: '',

  addToCart: (product) => {
    const { items } = get();
    const existing = items.find(item => item.product.id === product.id);

    if (existing) {
      // Check stock limit
      if (existing.quantity >= product.quantity) {
        throw new Error(`عذراً، لا تتوفر كمية أكبر في المخزن لهذا المنتج: ${product.name_ar}`);
      }
      
      const newItems = items.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      set({ items: newItems });
    } else {
      if (product.quantity < 1) {
        throw new Error(`عذراً، المنتج ${product.name_ar} غير متوفر في المخزن حالياً`);
      }
      set({ items: [...items, { product, quantity: 1 }] });
    }
  },

  removeFromCart: (productId) => {
    const { items } = get();
    set({ items: items.filter(item => item.product.id !== productId) });
  },

  updateQuantity: (productId, quantity) => {
    const { items } = get();
    const targetItem = items.find(item => item.product.id === productId);
    if (!targetItem) return;

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      get().removeFromCart(productId);
      return;
    }

    if (parsedQty > targetItem.product.quantity) {
      throw new Error(`الكمية المطلوبة تتجاوز المتاح في المخزن للمنتج: ${targetItem.product.name_ar}`);
    }

    const newItems = items.map(item =>
      item.product.id === productId ? { ...item, quantity: parsedQty } : item
    );
    set({ items: newItems });
  },

  setDiscount: (amount) => {
    set({ discountAmount: Math.max(0, parseFloat(amount || 0)) });
  },

  setPaymentMethod: (method) => {
    set({ paymentMethod: method });
  },

  setAmountPaid: (paid) => {
    set({ amountPaid: Math.max(0, parseFloat(paid || 0)) });
  },

  setNotes: (notes) => {
    set({ notes });
  },

  setTaxRate: (rate) => {
    set({ taxRate: Math.max(0, parseFloat(rate) || 0) });
  },

  clearCart: () => {
    set({
      items: [],
      discountAmount: 0,
      paymentMethod: 'cash',
      amountPaid: 0,
      notes: ''
    });
  },

  // Computations
  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + (item.product.sale_price * item.quantity), 0);
  },

  getTaxAmount: () => {
    const subtotal = get().getSubtotal();
    const discount = get().discountAmount;
    const base = Math.max(0, subtotal - discount);
    return Math.round(base * (get().taxRate / 100));
  },

  getFinalTotal: () => {
    const subtotal = get().getSubtotal();
    const discount = get().discountAmount;
    const tax = get().getTaxAmount();
    return Math.max(0, subtotal - discount + tax);
  },

  getChangeAmount: () => {
    const total = get().getFinalTotal();
    const paid = get().amountPaid;
    return paid > total ? paid - total : 0;
  }
}));

export default useCartStore;
