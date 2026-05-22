import { supabase } from '../lib/supabase';

export const getSalesApi = async () => {
  const { data: _data, error } = await supabase.from('sales').select('*, sale_items(*)').order('id', { ascending: false });
  if (error) throw new Error(error.message);
  const data = _data || [];
  // Map sale_items to items for component compatibility
  return data.map(sale => ({ ...sale, items: sale.sale_items }));
};

export const createSaleApi = async (saleData) => {
  const { data: { user } } = await supabase.auth.getUser();
  const { items, ...restSaleData } = saleData;
  
  // Generate invoice number
  const invoiceNum = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  // 1. Insert sale
  const { data: sale, error: saleError } = await supabase.from('sales').insert({
    ...restSaleData,
    user_id: user?.id,
    invoice_number: invoiceNum
  }).select().single();
  
  if (saleError) throw new Error(saleError.message);
  
  // 2. Insert items & decrement stock
  if (items && items.length > 0) {
    const saleItemsToInsert = items.map(item => ({
      ...item,
      sale_id: sale.id
    }));
    const { error: itemsError } = await supabase.from('sale_items').insert(saleItemsToInsert);
    if (itemsError) throw new Error(itemsError.message);
    
    // 3. Decrement stock
    for (const item of items) {
      const { data: prod } = await supabase.from('products').select('quantity').eq('id', item.product_id).single();
      if (prod) {
        await supabase.from('products').update({ quantity: prod.quantity - item.quantity }).eq('id', item.product_id);
      }
    }
  }
  
  return sale;
};
