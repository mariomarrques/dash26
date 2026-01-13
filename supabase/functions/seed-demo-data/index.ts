import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAIL = "sacmariomarques@gmail.com";
const DEMO_EMAIL = "demo@painel55.com";
const DEMO_PASSWORD = "demo123456";

// ========== DATA DEFINITIONS ==========

const SUPPLIERS = [
  { name: "XingSun", type: "nacional" },
  { name: "Chen", type: "internacional" },
  { name: "Xiao", type: "internacional" },
  { name: "Wu Xiaodi", type: "internacional" },
  { name: "Amy", type: "internacional" },
];

const PRODUCTS = [
  { label: "Cruzeiro 24/25", team: "Cruzeiro", country: "Brasil", season: "24/25" },
  { label: "Cruzeiro 25/26", team: "Cruzeiro", country: "Brasil", season: "25/26" },
  { label: "Atlético-MG 24/25", team: "Atlético Mineiro", country: "Brasil", season: "24/25" },
  { label: "Atlético-MG 25/26", team: "Atlético Mineiro", country: "Brasil", season: "25/26" },
  { label: "Flamengo 24/25", team: "Flamengo", country: "Brasil", season: "24/25" },
  { label: "Flamengo 25/26", team: "Flamengo", country: "Brasil", season: "25/26" },
  { label: "Palmeiras 24/25", team: "Palmeiras", country: "Brasil", season: "24/25" },
  { label: "Palmeiras 25/26", team: "Palmeiras", country: "Brasil", season: "25/26" },
  { label: "Real Madrid 25/26", team: "Real Madrid", country: "Espanha", season: "25/26" },
  { label: "Barcelona 25/26", team: "Barcelona", country: "Espanha", season: "25/26" },
  { label: "Manchester City 25/26", team: "Manchester City", country: "Inglaterra", season: "25/26" },
  { label: "PSG 25/26", team: "PSG", country: "França", season: "25/26" },
];

const UNIFORMS = ["Titular", "Reserva", "Goleiro"];
const SIZES = ["P", "M", "G", "GG"];

const CUSTOMER_FIRST_NAMES = [
  "Lucas", "Gabriel", "Matheus", "João", "Pedro", "Rafael", "Gustavo", "Felipe",
  "Bruno", "Leonardo", "Ana", "Maria", "Julia", "Beatriz", "Larissa", "Amanda",
  "Camila", "Carolina", "Fernanda", "Isabela", "Mariana", "Letícia", "Thiago",
  "Diego", "André", "Ricardo", "Rodrigo", "Eduardo", "Daniel", "Vinícius"
];

const CUSTOMER_LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Costa", "Pereira", "Ferreira", "Almeida",
  "Nascimento", "Carvalho", "Rocha", "Lima", "Gomes", "Ribeiro", "Martins", "Araújo",
  "Barbosa", "Correia", "Mendes", "Cardoso", "Moreira", "Nunes", "Vieira", "Freitas",
  "Reis", "Moura", "Campos", "Monteiro", "Castro", "Teixeira"
];

const FIXED_COSTS = [
  { name: "Sacola Kraft", total_cost_brl: 150, total_units: 100 },
  { name: "Tag Personalizada", total_cost_brl: 80, total_units: 200 },
  { name: "Embalagem Premium", total_cost_brl: 200, total_units: 100 },
];

const SALES_CHANNELS = [
  { name: "WhatsApp", weight: 50 },
  { name: "Instagram", weight: 35 },
  { name: "Influencer", weight: 10 },
  { name: "Loja", weight: 5 },
];

const PAYMENT_METHODS = [
  { name: "PIX", type: "pix", weight: 60 },
  { name: "Crédito", type: "credit", weight: 25 },
  { name: "Débito", type: "debit", weight: 10 },
  { name: "Dinheiro", type: "cash", weight: 5 },
];

const PAYMENT_FEES = [
  { payment_method: "PIX", installments: 1, fee_percent: 0, fee_fixed_brl: 0 },
  { payment_method: "Débito", installments: 1, fee_percent: 1.37, fee_fixed_brl: 0 },
  { payment_method: "Dinheiro", installments: 1, fee_percent: 0, fee_fixed_brl: 0 },
  { payment_method: "Crédito", installments: 1, fee_percent: 4.98, fee_fixed_brl: 0 },
  { payment_method: "Crédito", installments: 2, fee_percent: 7.29, fee_fixed_brl: 0 },
  { payment_method: "Crédito", installments: 3, fee_percent: 8.39, fee_fixed_brl: 0 },
  { payment_method: "Crédito", installments: 4, fee_percent: 9.49, fee_fixed_brl: 0 },
  { payment_method: "Crédito", installments: 5, fee_percent: 10.59, fee_fixed_brl: 0 },
  { payment_method: "Crédito", installments: 6, fee_percent: 11.69, fee_fixed_brl: 0 },
  { payment_method: "Crédito", installments: 7, fee_percent: 12.49, fee_fixed_brl: 0 },
  { payment_method: "Crédito", installments: 8, fee_percent: 13.29, fee_fixed_brl: 0 },
  { payment_method: "Crédito", installments: 9, fee_percent: 14.09, fee_fixed_brl: 0 },
  { payment_method: "Crédito", installments: 10, fee_percent: 14.89, fee_fixed_brl: 0 },
  { payment_method: "Crédito", installments: 11, fee_percent: 15.69, fee_fixed_brl: 0 },
  { payment_method: "Crédito", installments: 12, fee_percent: 16.49, fee_fixed_brl: 0 },
];

// Monthly sales distribution (Jul 2025 - Jan 2026)
const MONTHLY_SALES = [
  { year: 2025, month: 7, count: 15 },
  { year: 2025, month: 8, count: 15 },
  { year: 2025, month: 9, count: 25 },
  { year: 2025, month: 10, count: 25 },
  { year: 2025, month: 11, count: 35 },
  { year: 2025, month: 12, count: 35 },
  { year: 2026, month: 1, count: 25 },
];

// ========== UTILITY FUNCTIONS ==========

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedRandom<T extends { weight: number }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return items[items.length - 1];
}

function generatePhone(): string {
  const ddd = "31";
  const prefix = "9";
  const part1 = String(randomBetween(8000, 9999));
  const part2 = String(randomBetween(1000, 9999));
  return `(${ddd}) ${prefix}${part1}-${part2}`;
}

function randomDate(year: number, month: number, maxDay?: number): string {
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = randomBetween(1, maxDay || daysInMonth);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function randomTimestamp(year: number, month: number, maxDay?: number): string {
  const date = randomDate(year, month, maxDay);
  const hour = randomBetween(8, 22);
  const minute = randomBetween(0, 59);
  return `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Client with user token - for auth verification
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is admin
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized: Could not get user');
    }
    if (user.email !== ADMIN_EMAIL) {
      throw new Error('Unauthorized: Admin access required');
    }

    console.log(`🔐 Admin verified: ${user.email}`);

    // Service role client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if demo user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let demoUser = existingUsers?.users?.find(u => u.email === DEMO_EMAIL);

    if (!demoUser) {
      // Create demo user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { name: "Conta Demo" }
      });
      
      if (createError) throw new Error(`Failed to create demo user: ${createError.message}`);
      demoUser = newUser.user;
      console.log(`👤 Demo user created: ${DEMO_EMAIL}`);
    } else {
      console.log(`👤 Demo user exists: ${DEMO_EMAIL}`);
    }

    const userId = demoUser.id;

    // Check if data already seeded
    const { count: existingSales } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (existingSales && existingSales > 10) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Demo data already exists',
        stats: { existingSales }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ========== SEED DATA ==========
    console.log('🌱 Starting data seed...');

    // 1. Create suppliers
    const supplierRecords = SUPPLIERS.map(s => ({ ...s, user_id: userId }));
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .upsert(supplierRecords, { onConflict: 'user_id,name', ignoreDuplicates: true })
      .select();
    if (suppliersError) {
      // If upsert fails, try insert
      const { data: insertedSuppliers, error: insertError } = await supabase
        .from('suppliers')
        .insert(supplierRecords)
        .select();
      if (insertError) console.error('Suppliers error:', insertError);
    }
    
    // Fetch suppliers to get IDs
    const { data: allSuppliers } = await supabase
      .from('suppliers')
      .select('*')
      .eq('user_id', userId);
    console.log(`📦 Suppliers: ${allSuppliers?.length || 0}`);

    // 2. Create products and variants
    const productRecords = PRODUCTS.map(p => ({ ...p, user_id: userId }));
    await supabase.from('products').insert(productRecords);
    
    const { data: allProducts } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId);
    console.log(`📦 Products: ${allProducts?.length || 0}`);

    // Create variants for each product
    const variantRecords: any[] = [];
    for (const product of allProducts || []) {
      for (const uniform of UNIFORMS) {
        for (const size of SIZES) {
          variantRecords.push({
            product_id: product.id,
            user_id: userId,
            uniform,
            size
          });
        }
      }
    }
    await supabase.from('product_variants').insert(variantRecords);
    
    const { data: allVariants } = await supabase
      .from('product_variants')
      .select('*, products(*)')
      .eq('user_id', userId);
    console.log(`📦 Variants: ${allVariants?.length || 0}`);

    // 3. Create customers
    const customerRecords: any[] = [];
    for (let i = 0; i < 30; i++) {
      customerRecords.push({
        user_id: userId,
        name: `${randomElement(CUSTOMER_FIRST_NAMES)} ${randomElement(CUSTOMER_LAST_NAMES)}`,
        phone: generatePhone()
      });
    }
    await supabase.from('customers').insert(customerRecords);
    
    const { data: allCustomers } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', userId);
    console.log(`👥 Customers: ${allCustomers?.length || 0}`);

    // 4. Create sales channels
    const channelRecords = SALES_CHANNELS.map(c => ({ name: c.name, user_id: userId }));
    await supabase.from('sales_channels').insert(channelRecords);
    
    const { data: allChannels } = await supabase
      .from('sales_channels')
      .select('*')
      .eq('user_id', userId);
    console.log(`📢 Channels: ${allChannels?.length || 0}`);

    // 5. Create payment methods
    const methodRecords = PAYMENT_METHODS.map(m => ({ name: m.name, type: m.type, user_id: userId }));
    await supabase.from('payment_methods').insert(methodRecords);
    
    const { data: allMethods } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId);
    console.log(`💳 Payment methods: ${allMethods?.length || 0}`);

    // 6. Create payment fees
    const feeRecords = PAYMENT_FEES.map(f => {
      const method = allMethods?.find(m => m.name === f.payment_method);
      return {
        payment_method: f.payment_method,
        payment_method_id: method?.id || null,
        installments: f.installments,
        fee_percent: f.fee_percent,
        fee_fixed_brl: f.fee_fixed_brl,
        user_id: userId
      };
    });
    await supabase.from('payment_fees').insert(feeRecords);
    
    const { data: allFees } = await supabase
      .from('payment_fees')
      .select('*')
      .eq('user_id', userId);
    console.log(`💰 Payment fees: ${allFees?.length || 0}`);

    // 7. Create fixed costs
    const fixedCostRecords = FIXED_COSTS.map(fc => ({
      ...fc,
      user_id: userId,
      unit_cost_brl: fc.total_cost_brl / fc.total_units,
      remaining_units: fc.total_units,
      is_active: true
    }));
    await supabase.from('fixed_costs').insert(fixedCostRecords);
    
    const { data: allFixedCosts } = await supabase
      .from('fixed_costs')
      .select('*')
      .eq('user_id', userId);
    console.log(`📋 Fixed costs: ${allFixedCosts?.length || 0}`);

    // 8. Create purchase orders
    const xingsun = allSuppliers?.find(s => s.name === "XingSun");
    const chinaSuppliers = allSuppliers?.filter(s => s.type === "internacional") || [];
    
    const purchaseOrders: any[] = [];
    const purchaseItems: any[] = [];
    const inventoryLots: any[] = [];
    const stockMovementsIn: any[] = [];

    // Generate 25 purchase orders spread over 6 months
    for (let i = 0; i < 25; i++) {
      const isBrazilian = i < 15; // 60% Brazilian
      const supplier = isBrazilian ? xingsun : randomElement(chinaSuppliers);
      
      // Spread orders from June 2025 to January 2026
      const monthIndex = Math.floor(i / 4);
      const months = [
        { year: 2025, month: 6 },
        { year: 2025, month: 7 },
        { year: 2025, month: 8 },
        { year: 2025, month: 9 },
        { year: 2025, month: 10 },
        { year: 2025, month: 11 },
        { year: 2025, month: 12 },
      ];
      const orderMonth = months[Math.min(monthIndex, months.length - 1)];
      
      const orderDate = randomDate(orderMonth.year, orderMonth.month);
      const unitCost = isBrazilian ? 80 : 55;
      const freightBrl = isBrazilian ? randomBetween(15, 30) : randomBetween(40, 80);
      const arrivalTax = isBrazilian ? null : 75;
      
      const orderId = crypto.randomUUID();
      const itemQty = randomBetween(3, 8); // items per order
      
      purchaseOrders.push({
        id: orderId,
        user_id: userId,
        supplier_id: supplier?.id || null,
        source: isBrazilian ? "brasil" : "china",
        shipping_mode: isBrazilian ? null : (Math.random() > 0.5 ? "offline" : "remessa_conforme"),
        status: "chegou",
        stock_posted: true,
        order_date: orderDate,
        freight_brl: freightBrl,
        extra_fees_brl: 0,
        arrival_tax_brl: arrivalTax
      });

      // Generate items for this order
      const selectedVariants = [...(allVariants || [])].sort(() => Math.random() - 0.5).slice(0, itemQty);
      
      for (const variant of selectedVariants) {
        const qty = randomBetween(2, 6);
        const itemId = crypto.randomUUID();
        
        purchaseItems.push({
          id: itemId,
          user_id: userId,
          purchase_order_id: orderId,
          variant_id: variant.id,
          qty,
          unit_cost_value: unitCost,
          unit_cost_currency: "BRL",
          usd_to_brl_rate: null
        });

        // Calculate loaded cost
        const totalItemsCost = unitCost * itemQty * 4; // approximate total
        const freightShare = (freightBrl / totalItemsCost) * unitCost;
        const taxShare = arrivalTax ? (arrivalTax / totalItemsCost) * unitCost : 0;
        const loadedCost = unitCost + freightShare + taxShare;

        const lotId = crypto.randomUUID();
        const receivedAt = randomTimestamp(orderMonth.year, orderMonth.month);
        
        inventoryLots.push({
          id: lotId,
          user_id: userId,
          purchase_order_id: orderId,
          purchase_item_id: itemId,
          variant_id: variant.id,
          qty_received: qty,
          qty_remaining: qty,
          unit_cost_brl: Math.round(loadedCost * 100) / 100,
          cost_pending_tax: false,
          received_at: receivedAt
        });

        stockMovementsIn.push({
          user_id: userId,
          variant_id: variant.id,
          type: "in",
          qty,
          ref_type: "purchase_order",
          ref_id: orderId,
          movement_date: receivedAt
        });
      }
    }

    await supabase.from('purchase_orders').insert(purchaseOrders);
    await supabase.from('purchase_items').insert(purchaseItems);
    await supabase.from('inventory_lots').insert(inventoryLots);
    await supabase.from('stock_movements').insert(stockMovementsIn);
    console.log(`📦 Purchase orders: ${purchaseOrders.length}`);
    console.log(`📦 Purchase items: ${purchaseItems.length}`);
    console.log(`📦 Inventory lots: ${inventoryLots.length}`);

    // Reload lots with current state
    const { data: currentLots } = await supabase
      .from('inventory_lots')
      .select('*')
      .eq('user_id', userId)
      .order('received_at', { ascending: true });

    // 9. Create sales
    const sales: any[] = [];
    const saleItems: any[] = [];
    const saleItemLots: any[] = [];
    const saleFixedCosts: any[] = [];
    const stockMovementsOut: any[] = [];

    // Track lot consumption
    const lotQtyMap = new Map<string, number>();
    for (const lot of currentLots || []) {
      lotQtyMap.set(lot.id, lot.qty_remaining);
    }

    // Track fixed cost consumption
    const fixedCostUnitsMap = new Map<string, number>();
    for (const fc of allFixedCosts || []) {
      fixedCostUnitsMap.set(fc.id, fc.remaining_units);
    }

    for (const monthData of MONTHLY_SALES) {
      for (let i = 0; i < monthData.count; i++) {
        const maxDay = monthData.year === 2026 && monthData.month === 1 ? 12 : undefined;
        const saleDate = randomDate(monthData.year, monthData.month, maxDay);
        const saleTimestamp = randomTimestamp(monthData.year, monthData.month, maxDay);
        
        const channel = weightedRandom(SALES_CHANNELS.map(c => ({...c, data: allChannels?.find(ch => ch.name === c.name)})));
        const paymentMethod = weightedRandom(PAYMENT_METHODS.map(m => ({...m, data: allMethods?.find(pm => pm.name === m.name)})));
        
        let installments = 1;
        if (paymentMethod.name === "Crédito") {
          const installRoll = Math.random();
          if (installRoll < 0.8) installments = 1;
          else if (installRoll < 0.95) installments = randomBetween(2, 3);
          else installments = randomBetween(4, 6);
        }

        // Get fee for this payment
        const fee = allFees?.find(f => 
          f.payment_method === paymentMethod.name && 
          f.installments === installments
        );
        const feePercent = fee?.fee_percent || 0;

        const unitPrice = randomBetween(140, 180);
        const discountRoll = Math.random();
        const discountPercent = discountRoll < 0.7 ? 0 : (discountRoll < 0.9 ? 5 : 10);
        const shippingBrl = Math.random() < 0.4 ? 0 : randomBetween(10, 25);
        const isPreorder = Math.random() < 0.05;
        const customer = Math.random() < 0.7 ? randomElement(allCustomers || []) : null;

        // Pick 1-3 items for sale
        const itemCount = randomBetween(1, 3);
        const saleId = crypto.randomUUID();
        
        let grossBrl = 0;
        let totalCogs = 0;
        let cogsPending = false;

        // Find available lots
        const availableLots = (currentLots || []).filter(lot => 
          (lotQtyMap.get(lot.id) || 0) > 0
        );

        if (availableLots.length === 0) continue;

        const selectedLotVariants = new Set<string>();
        const itemsToCreate: any[] = [];

        for (let j = 0; j < itemCount && availableLots.length > 0; j++) {
          // Find a lot with available stock
          const availableLotsNow = availableLots.filter(lot => 
            (lotQtyMap.get(lot.id) || 0) > 0 && 
            !selectedLotVariants.has(lot.variant_id)
          );
          
          if (availableLotsNow.length === 0) break;

          const lot = randomElement(availableLotsNow);
          selectedLotVariants.add(lot.variant_id);
          
          const availableQty = lotQtyMap.get(lot.id) || 0;
          const qty = Math.min(randomBetween(1, 2), availableQty);
          
          if (qty <= 0) continue;

          // Get variant info
          const variant = allVariants?.find(v => v.id === lot.variant_id);
          if (!variant) continue;

          const saleItemId = crypto.randomUUID();
          const itemGross = unitPrice * qty;
          grossBrl += itemGross;

          itemsToCreate.push({
            saleItemId,
            variantId: lot.variant_id,
            qty,
            unitPrice,
            lotId: lot.id,
            unitCost: lot.unit_cost_brl,
            productLabel: variant.products?.label || "Unknown",
            uniform: variant.uniform,
            size: variant.size
          });

          // Consume from lot
          lotQtyMap.set(lot.id, availableQty - qty);
          totalCogs += lot.unit_cost_brl * qty;
        }

        if (itemsToCreate.length === 0) continue;

        // Calculate financials
        const grossAfterDiscount = grossBrl * (1 - discountPercent / 100);
        const feesBrl = grossAfterDiscount * (feePercent / 100);
        
        // Apply fixed costs
        let fixedCostTotal = 0;
        for (const fc of allFixedCosts || []) {
          const remaining = fixedCostUnitsMap.get(fc.id) || 0;
          if (remaining > 0) {
            fixedCostTotal += fc.unit_cost_brl;
            fixedCostUnitsMap.set(fc.id, remaining - 1);
            
            saleFixedCosts.push({
              user_id: userId,
              sale_id: saleId,
              fixed_cost_id: fc.id,
              unit_cost_applied: fc.unit_cost_brl
            });
          }
        }

        const netProfit = grossAfterDiscount - feesBrl - shippingBrl - totalCogs - fixedCostTotal;
        const marginPercent = grossAfterDiscount > 0 ? (netProfit / grossAfterDiscount) * 100 : 0;

        sales.push({
          id: saleId,
          user_id: userId,
          customer_id: customer?.id || null,
          sales_channel_id: channel.data?.id || null,
          channel: channel.name,
          payment_method_id: paymentMethod.data?.id || null,
          payment_method: paymentMethod.name,
          installments,
          sale_date: saleDate,
          gross_brl: grossBrl,
          discount_percent: discountPercent,
          discount_value_brl: grossBrl * discountPercent / 100,
          gross_after_discount_brl: grossAfterDiscount,
          fees_brl: Math.round(feesBrl * 100) / 100,
          shipping_brl: shippingBrl,
          is_preorder: isPreorder,
          product_costs_brl: Math.round(totalCogs * 100) / 100,
          fixed_costs_brl: Math.round(fixedCostTotal * 100) / 100,
          net_profit_brl: Math.round(netProfit * 100) / 100,
          margin_percent: Math.round(marginPercent * 100) / 100,
          cogs_pending: cogsPending,
          created_at: saleTimestamp
        });

        // Create sale items and related records
        for (const item of itemsToCreate) {
          saleItems.push({
            id: item.saleItemId,
            user_id: userId,
            sale_id: saleId,
            variant_id: item.variantId,
            qty: item.qty,
            unit_price_brl: item.unitPrice,
            product_label_snapshot: item.productLabel,
            uniform_snapshot: item.uniform,
            size_snapshot: item.size
          });

          saleItemLots.push({
            user_id: userId,
            sale_item_id: item.saleItemId,
            inventory_lot_id: item.lotId,
            qty_consumed: item.qty,
            unit_cost_brl: item.unitCost
          });

          stockMovementsOut.push({
            user_id: userId,
            variant_id: item.variantId,
            type: "out",
            qty: item.qty,
            ref_type: "sale",
            ref_id: saleId,
            movement_date: saleTimestamp
          });
        }
      }
    }

    // Insert all sales data
    await supabase.from('sales').insert(sales);
    await supabase.from('sale_items').insert(saleItems);
    await supabase.from('sale_item_lots').insert(saleItemLots);
    await supabase.from('sale_fixed_costs').insert(saleFixedCosts);
    await supabase.from('stock_movements').insert(stockMovementsOut);

    // Update inventory lots with consumed quantities
    for (const [lotId, remaining] of lotQtyMap.entries()) {
      await supabase
        .from('inventory_lots')
        .update({ qty_remaining: remaining })
        .eq('id', lotId);
    }

    // Update fixed costs with remaining units
    for (const [fcId, remaining] of fixedCostUnitsMap.entries()) {
      await supabase
        .from('fixed_costs')
        .update({ remaining_units: remaining })
        .eq('id', fcId);
    }

    console.log(`💰 Sales: ${sales.length}`);
    console.log(`📦 Sale items: ${saleItems.length}`);
    console.log(`🔗 Sale item lots: ${saleItemLots.length}`);
    console.log(`📋 Sale fixed costs: ${saleFixedCosts.length}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Demo data seeded successfully',
      credentials: {
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD
      },
      stats: {
        suppliers: allSuppliers?.length || 0,
        products: allProducts?.length || 0,
        variants: allVariants?.length || 0,
        customers: allCustomers?.length || 0,
        purchaseOrders: purchaseOrders.length,
        sales: sales.length,
        fixedCosts: allFixedCosts?.length || 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
