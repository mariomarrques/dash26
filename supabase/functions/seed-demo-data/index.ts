// Sistema de conta demo (seed) refatorado e validado para o Dash 26

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAIL = "sacmariomarques@gmail.com";
const DEMO_EMAIL = "demo@dash26.com";
const DEMO_PASSWORD = "demo123456";

// ==========================================
// CONFIGURAÇÃO DE DADOS DEMO
// ==========================================

// Período: últimos 6 meses completos
const DEMO_MONTHS = [
  { year: 2025, month: 7, salesTarget: 12, purchaseTarget: 3 },
  { year: 2025, month: 8, salesTarget: 15, purchaseTarget: 2 },
  { year: 2025, month: 9, salesTarget: 20, purchaseTarget: 3 },
  { year: 2025, month: 10, salesTarget: 25, purchaseTarget: 3 },
  { year: 2025, month: 11, salesTarget: 30, purchaseTarget: 2 },
  { year: 2025, month: 12, salesTarget: 35, purchaseTarget: 3 },
  { year: 2026, month: 1, salesTarget: 20, purchaseTarget: 2 },
];

const SUPPLIERS = [
  { name: "Fornecedor Nacional XingSun", type: "nacional", costMultiplier: 1.0 },
  { name: "Chen Imports", type: "internacional", costMultiplier: 0.7 },
  { name: "Wu Trading", type: "internacional", costMultiplier: 0.65 },
];

// Produtos com margens variadas
const PRODUCTS = [
  { label: "Camisa Cruzeiro 24/25", team: "Cruzeiro", season: "24/25", baseCost: 75, basePrice: 149, popularity: 10 },
  { label: "Camisa Atlético-MG 24/25", team: "Atlético Mineiro", season: "24/25", baseCost: 75, basePrice: 149, popularity: 8 },
  { label: "Camisa Flamengo 24/25", team: "Flamengo", season: "24/25", baseCost: 78, basePrice: 159, popularity: 12 },
  { label: "Camisa Palmeiras 24/25", team: "Palmeiras", season: "24/25", baseCost: 76, basePrice: 154, popularity: 9 },
  { label: "Camisa Corinthians 24/25", team: "Corinthians", season: "24/25", baseCost: 77, basePrice: 155, popularity: 8 },
  { label: "Camisa São Paulo 24/25", team: "São Paulo", season: "24/25", baseCost: 75, basePrice: 149, popularity: 7 },
  { label: "Camisa Real Madrid 24/25", team: "Real Madrid", season: "24/25", baseCost: 85, basePrice: 179, popularity: 6 },
  { label: "Camisa Barcelona 24/25", team: "Barcelona", season: "24/25", baseCost: 85, basePrice: 179, popularity: 5 },
  { label: "Camisa Manchester City 24/25", team: "Manchester City", season: "24/25", baseCost: 88, basePrice: 189, popularity: 4 },
  { label: "Camisa PSG 24/25", team: "PSG", season: "24/25", baseCost: 82, basePrice: 175, popularity: 5 },
  { label: "Camisa Seleção Brasil", team: "Brasil", season: "24/25", baseCost: 80, basePrice: 169, popularity: 7 },
  { label: "Camisa Argentina", team: "Argentina", season: "24/25", baseCost: 82, basePrice: 175, popularity: 4 },
];

const UNIFORMS = ["Titular", "Reserva"];
const SIZES = ["P", "M", "G", "GG"];

const CUSTOMER_NAMES = [
  "Lucas Silva", "Gabriel Santos", "Matheus Oliveira", "João Pedro Costa",
  "Rafael Pereira", "Gustavo Ferreira", "Felipe Almeida", "Bruno Nascimento",
  "Ana Carolina Lima", "Maria Julia Gomes", "Beatriz Ribeiro", "Larissa Martins",
  "Amanda Rocha", "Camila Barbosa", "Fernanda Moreira", "Isabela Nunes",
  "Thiago Campos", "Diego Monteiro", "André Castro", "Ricardo Teixeira",
  "Mariana Freitas", "Letícia Reis", "Carolina Moura", "Eduardo Vieira"
];

const FIXED_COSTS = [
  { name: "Sacola Kraft", total_cost_brl: 200, total_units: 150 },
  { name: "Tag Personalizada", total_cost_brl: 100, total_units: 200 },
  { name: "Embalagem Premium", total_cost_brl: 250, total_units: 100 },
];

const SALES_CHANNELS = [
  { name: "WhatsApp", weight: 50 },
  { name: "Instagram", weight: 35 },
  { name: "Loja", weight: 10 },
  { name: "Influencer", weight: 5 },
];

const PAYMENT_METHODS = [
  { name: "PIX", type: "pix", weight: 55 },
  { name: "Crédito", type: "credit", weight: 30 },
  { name: "Débito", type: "debit", weight: 10 },
  { name: "Dinheiro", type: "cash", weight: 5 },
];

const PAYMENT_FEES: Record<string, { installments: number; fee_percent: number }[]> = {
  pix: [{ installments: 1, fee_percent: 0 }],
  debit: [{ installments: 1, fee_percent: 1.37 }],
  cash: [{ installments: 1, fee_percent: 0 }],
  credit: [
    { installments: 1, fee_percent: 4.98 },
    { installments: 2, fee_percent: 7.29 },
    { installments: 3, fee_percent: 8.39 },
    { installments: 4, fee_percent: 9.49 },
    { installments: 5, fee_percent: 10.59 },
    { installments: 6, fee_percent: 11.69 },
  ],
};

// ==========================================
// FUNÇÕES UTILITÁRIAS
// ==========================================

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
  const ddd = randomElement(["31", "11", "21", "41", "51"]);
  const prefix = "9";
  const part1 = String(randomBetween(8000, 9999));
  const part2 = String(randomBetween(1000, 9999));
  return `(${ddd}) ${prefix}${part1}-${part2}`;
}

function dateInMonth(year: number, month: number, day?: number): string {
  const daysInMonth = new Date(year, month, 0).getDate();
  const d = day ?? randomBetween(1, daysInMonth);
  return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function timestampInMonth(year: number, month: number, day?: number): string {
  const date = dateInMonth(year, month, day);
  const hour = randomBetween(8, 21);
  const minute = randomBetween(0, 59);
  return `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`;
}

function round2(num: number): number {
  return Math.round(num * 100) / 100;
}

// ==========================================
// MAIN HANDLER
// ==========================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Verificar usuário admin
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized: Could not get user');
    }
    if (user.email !== ADMIN_EMAIL) {
      throw new Error('Unauthorized: Admin access required');
    }

    console.log(`🔐 Admin verificado: ${user.email}`);

    // Cliente com service role para operações admin
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ==========================================
    // 1. CRIAR/BUSCAR USUÁRIO DEMO
    // ==========================================
    
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let demoUser = existingUsers?.users?.find(u => u.email === DEMO_EMAIL);

    if (demoUser) {
      // LIMPAR dados anteriores da conta demo
      console.log('🧹 Limpando dados anteriores da conta demo...');
      const userId = demoUser.id;
      
      // Ordem de deleção respeitando foreign keys
      await supabase.from('sale_item_lots').delete().eq('user_id', userId);
      await supabase.from('sale_fixed_costs').delete().eq('user_id', userId);
      await supabase.from('sale_items').delete().eq('user_id', userId);
      await supabase.from('sales').delete().eq('user_id', userId);
      await supabase.from('stock_movements').delete().eq('user_id', userId);
      await supabase.from('inventory_lots').delete().eq('user_id', userId);
      await supabase.from('purchase_items').delete().eq('user_id', userId);
      await supabase.from('purchase_orders').delete().eq('user_id', userId);
      await supabase.from('customers').delete().eq('user_id', userId);
      await supabase.from('payment_fees').delete().eq('user_id', userId);
      await supabase.from('payment_methods').delete().eq('user_id', userId);
      await supabase.from('sales_channels').delete().eq('user_id', userId);
      await supabase.from('fixed_costs').delete().eq('user_id', userId);
      await supabase.from('product_variants').delete().eq('user_id', userId);
      await supabase.from('products').delete().eq('user_id', userId);
      await supabase.from('suppliers').delete().eq('user_id', userId);
      
      console.log('✅ Dados anteriores limpos');
    } else {
      // Criar novo usuário demo
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { name: "Conta Demo - Dash 26" }
      });
      
      if (createError) throw new Error(`Failed to create demo user: ${createError.message}`);
      demoUser = newUser.user;
      console.log(`👤 Usuário demo criado: ${DEMO_EMAIL}`);
    }

    const userId = demoUser.id;

    // Criar profile se não existir
    await supabase.from('profiles').upsert({
      id: userId,
      name: "Conta Demo",
      updated_at: new Date().toISOString()
    });

    console.log('🌱 Iniciando seed de dados demo...');

    // ==========================================
    // 2. CRIAR DADOS BASE
    // ==========================================

    // Fornecedores
    const suppliersToInsert = SUPPLIERS.map(s => ({
      user_id: userId,
      name: s.name,
      type: s.type,
    }));
    await supabase.from('suppliers').insert(suppliersToInsert);
    const { data: suppliers } = await supabase.from('suppliers').select('*').eq('user_id', userId);
    console.log(`📦 Fornecedores: ${suppliers?.length}`);

    // Produtos
    const productsToInsert = PRODUCTS.map(p => ({
      user_id: userId,
      label: p.label,
      team: p.team,
      season: p.season,
    }));
    await supabase.from('products').insert(productsToInsert);
    const { data: products } = await supabase.from('products').select('*').eq('user_id', userId);
    console.log(`📦 Produtos: ${products?.length}`);

    // Variantes (cada produto com 2 uniformes × 4 tamanhos = 8 variantes)
    const variantsToInsert: any[] = [];
    for (const product of products || []) {
      for (const uniform of UNIFORMS) {
        for (const size of SIZES) {
          variantsToInsert.push({
            user_id: userId,
            product_id: product.id,
            uniform,
            size,
          });
        }
      }
    }
    await supabase.from('product_variants').insert(variantsToInsert);
    const { data: variants } = await supabase
      .from('product_variants')
      .select('*, products(*)')
      .eq('user_id', userId);
    console.log(`📦 Variantes: ${variants?.length}`);

    // Clientes
    const customersToInsert = CUSTOMER_NAMES.map(name => ({
      user_id: userId,
      name,
      phone: generatePhone(),
    }));
    await supabase.from('customers').insert(customersToInsert);
    const { data: customers } = await supabase.from('customers').select('*').eq('user_id', userId);
    console.log(`👥 Clientes: ${customers?.length}`);

    // Canais de venda
    const channelsToInsert = SALES_CHANNELS.map(c => ({
      user_id: userId,
      name: c.name,
      is_active: true,
    }));
    await supabase.from('sales_channels').insert(channelsToInsert);
    const { data: channels } = await supabase.from('sales_channels').select('*').eq('user_id', userId);
    console.log(`📢 Canais: ${channels?.length}`);

    // Métodos de pagamento
    const methodsToInsert = PAYMENT_METHODS.map(m => ({
      user_id: userId,
      name: m.name,
      type: m.type,
      is_active: true,
    }));
    await supabase.from('payment_methods').insert(methodsToInsert);
    const { data: paymentMethods } = await supabase.from('payment_methods').select('*').eq('user_id', userId);
    console.log(`💳 Métodos de pagamento: ${paymentMethods?.length}`);

    // Taxas de pagamento
    const feesToInsert: any[] = [];
    for (const method of paymentMethods || []) {
      const fees = PAYMENT_FEES[method.type] || [];
      for (const fee of fees) {
        feesToInsert.push({
          user_id: userId,
          payment_method_id: method.id,
          payment_method: method.name,
          installments: fee.installments,
          fee_percent: fee.fee_percent,
          fee_fixed_brl: 0,
        });
      }
    }
    await supabase.from('payment_fees').insert(feesToInsert);
    const { data: fees } = await supabase.from('payment_fees').select('*').eq('user_id', userId);
    console.log(`💰 Taxas: ${fees?.length}`);

    // Custos fixos
    const fixedCostsToInsert = FIXED_COSTS.map(fc => ({
      user_id: userId,
      name: fc.name,
      total_cost_brl: fc.total_cost_brl,
      total_units: fc.total_units,
      unit_cost_brl: round2(fc.total_cost_brl / fc.total_units),
      remaining_units: fc.total_units,
      is_active: true,
    }));
    await supabase.from('fixed_costs').insert(fixedCostsToInsert);
    const { data: fixedCosts } = await supabase.from('fixed_costs').select('*').eq('user_id', userId);
    console.log(`📋 Custos fixos: ${fixedCosts?.length}`);

    // ==========================================
    // 3. MAPAS DE CONTROLE DE ESTOQUE
    // ==========================================
    
    // Mapa de estoque disponível por variante
    const stockByVariant = new Map<string, number>();
    for (const v of variants || []) {
      stockByVariant.set(v.id, 0);
    }

    // Mapa de lotes por variante (FIFO)
    interface LotInfo {
      lotId: string;
      variantId: string;
      qtyRemaining: number;
      unitCostBrl: number;
      receivedAt: string;
    }
    const lotsByVariant = new Map<string, LotInfo[]>();
    for (const v of variants || []) {
      lotsByVariant.set(v.id, []);
    }

    // Mapa de unidades restantes de custos fixos
    const fixedCostUnits = new Map<string, number>();
    for (const fc of fixedCosts || []) {
      fixedCostUnits.set(fc.id, fc.remaining_units);
    }

    // Arrays para batch insert
    const allPurchaseOrders: any[] = [];
    const allPurchaseItems: any[] = [];
    const allInventoryLots: any[] = [];
    const allStockMovementsIn: any[] = [];
    const allSales: any[] = [];
    const allSaleItems: any[] = [];
    const allSaleItemLots: any[] = [];
    const allSaleFixedCosts: any[] = [];
    const allStockMovementsOut: any[] = [];

    // Estatísticas
    let totalRevenue = 0;
    let totalProfit = 0;
    let salesCount = 0;

    // ==========================================
    // 4. GERAR COMPRAS E VENDAS POR MÊS
    // ==========================================

    for (const monthConfig of DEMO_MONTHS) {
      const { year, month, salesTarget, purchaseTarget } = monthConfig;
      const monthLabel = `${year}-${String(month).padStart(2, '0')}`;
      console.log(`\n📅 Processando ${monthLabel}...`);

      // ---- COMPRAS DO MÊS (no início do mês) ----
      for (let po = 0; po < purchaseTarget; po++) {
        // Escolher fornecedor
        const supplierData = randomElement(SUPPLIERS);
        const supplier = suppliers?.find(s => s.name === supplierData.name);
        const isInternational = supplierData.type === "internacional";

        // Gerar data no início do mês (dias 1-10)
        const orderDate = dateInMonth(year, month, randomBetween(1, 10));
        const receivedAt = timestampInMonth(year, month, randomBetween(5, 15));

        const orderId = crypto.randomUUID();
        const freightBrl = isInternational ? randomBetween(80, 150) : randomBetween(20, 50);
        const arrivalTax = isInternational ? randomBetween(50, 120) : 0;

        // Escolher 5-10 variantes aleatórias para esta compra
        const shuffledVariants = [...(variants || [])].sort(() => Math.random() - 0.5);
        const selectedVariants = shuffledVariants.slice(0, randomBetween(5, 10));
        
        let totalOrderCost = 0;
        const itemsQty: { variantId: string; qty: number; unitCost: number }[] = [];

        // Calcular custo total dos itens
        for (const variant of selectedVariants) {
          const productConfig = PRODUCTS.find(p => p.label === variant.products?.label);
          const baseCost = productConfig?.baseCost || 75;
          const unitCost = round2(baseCost * supplierData.costMultiplier);
          const qty = randomBetween(3, 8); // 3-8 unidades por variante
          
          itemsQty.push({ variantId: variant.id, qty, unitCost });
          totalOrderCost += unitCost * qty;
        }

        // Ordem de compra
        allPurchaseOrders.push({
          id: orderId,
          user_id: userId,
          supplier_id: supplier?.id || null,
          source: isInternational ? "china" : "brasil",
          shipping_mode: isInternational ? "remessa_conforme" : null,
          status: "chegou",
          stock_posted: true,
          order_date: orderDate,
          freight_brl: freightBrl,
          extra_fees_brl: 0,
          arrival_tax_brl: arrivalTax > 0 ? arrivalTax : null,
        });

        // Calcular custo carregado (frete + taxa distribuídos)
        const totalExtraCost = freightBrl + arrivalTax;
        const extraCostPerUnit = totalOrderCost > 0 ? totalExtraCost / totalOrderCost : 0;

        // Itens da compra e lotes
        for (const item of itemsQty) {
          const itemId = crypto.randomUUID();
          const lotId = crypto.randomUUID();
          
          // Custo carregado = custo unitário + proporção do frete/taxa
          const loadedCost = round2(item.unitCost * (1 + extraCostPerUnit));

          allPurchaseItems.push({
            id: itemId,
            user_id: userId,
            purchase_order_id: orderId,
            variant_id: item.variantId,
            qty: item.qty,
            unit_cost_value: item.unitCost,
            unit_cost_currency: "BRL",
            usd_to_brl_rate: null,
          });

          allInventoryLots.push({
            id: lotId,
            user_id: userId,
            purchase_order_id: orderId,
            purchase_item_id: itemId,
            variant_id: item.variantId,
            qty_received: item.qty,
            qty_remaining: item.qty,
            unit_cost_brl: loadedCost,
            cost_pending_tax: false,
            received_at: receivedAt,
          });

          allStockMovementsIn.push({
            user_id: userId,
            variant_id: item.variantId,
            type: "in",
            qty: item.qty,
            ref_type: "purchase_order",
            ref_id: orderId,
            movement_date: receivedAt,
          });

          // Atualizar controle de estoque
          const currentStock = stockByVariant.get(item.variantId) || 0;
          stockByVariant.set(item.variantId, currentStock + item.qty);

          // Adicionar lote ao mapa FIFO
          const variantLots = lotsByVariant.get(item.variantId) || [];
          variantLots.push({
            lotId,
            variantId: item.variantId,
            qtyRemaining: item.qty,
            unitCostBrl: loadedCost,
            receivedAt,
          });
          lotsByVariant.set(item.variantId, variantLots);
        }
      }

      console.log(`  📦 ${purchaseTarget} compras criadas`);

      // ---- VENDAS DO MÊS (distribuídas ao longo do mês) ----
      let salesThisMonth = 0;

      for (let s = 0; s < salesTarget; s++) {
        // Verificar se há estoque disponível
        const availableVariants = [...stockByVariant.entries()]
          .filter(([_, stock]) => stock > 0)
          .map(([variantId]) => variants?.find(v => v.id === variantId))
          .filter(Boolean);

        if (availableVariants.length === 0) {
          console.log(`  ⚠️ Sem estoque para mais vendas neste mês`);
          break;
        }

        // Escolher variante com estoque (ponderado por popularidade)
        const variantsWithStock = availableVariants.map(v => {
          const productConfig = PRODUCTS.find(p => p.label === v?.products?.label);
          return { variant: v, weight: productConfig?.popularity || 5 };
        });
        
        const selectedVariant = weightedRandom(variantsWithStock).variant;
        if (!selectedVariant) continue;

        const variantStock = stockByVariant.get(selectedVariant.id) || 0;
        if (variantStock <= 0) continue;

        // Quantidade da venda (1-3, mas não mais que o estoque)
        const saleQty = Math.min(randomBetween(1, 2), variantStock);
        if (saleQty <= 0) continue;

        // Data da venda (distribuída pelo mês)
        const maxDay = month === 1 && year === 2026 ? 12 : 28;
        const saleDay = randomBetween(10, maxDay);
        const saleDate = dateInMonth(year, month, saleDay);
        const saleTimestamp = timestampInMonth(year, month, saleDay);

        // Escolher canal e método de pagamento
        const channel = weightedRandom(SALES_CHANNELS.map(c => ({
          ...c,
          data: channels?.find(ch => ch.name === c.name)
        })));
        
        const paymentMethod = weightedRandom(PAYMENT_METHODS.map(m => ({
          ...m,
          data: paymentMethods?.find(pm => pm.name === m.name)
        })));

        // Parcelas
        let installments = 1;
        if (paymentMethod.name === "Crédito") {
          const roll = Math.random();
          if (roll < 0.6) installments = 1;
          else if (roll < 0.85) installments = randomBetween(2, 3);
          else installments = randomBetween(4, 6);
        }

        // Taxa
        const feeConfig = fees?.find(f => 
          f.payment_method_id === paymentMethod.data?.id && 
          f.installments === installments
        );
        const feePercent = feeConfig?.fee_percent || 0;

        // Preço de venda
        const productConfig = PRODUCTS.find(p => p.label === selectedVariant.products?.label);
        const basePrice = productConfig?.basePrice || 149;
        const unitPrice = basePrice + randomBetween(-10, 15); // Variação

        // Desconto
        const discountRoll = Math.random();
        const discountPercent = discountRoll < 0.7 ? 0 : (discountRoll < 0.9 ? 5 : 10);

        // Frete
        const shippingBrl = Math.random() < 0.4 ? 0 : randomBetween(12, 25);

        // Cliente
        const customer = Math.random() < 0.75 ? randomElement(customers || []) : null;

        // Consumir estoque FIFO
        const variantLots = lotsByVariant.get(selectedVariant.id) || [];
        let qtyToConsume = saleQty;
        let totalCogs = 0;
        const consumedLots: { lotId: string; qty: number; unitCost: number }[] = [];

        for (const lot of variantLots) {
          if (qtyToConsume <= 0) break;
          if (lot.qtyRemaining <= 0) continue;

          const consumeQty = Math.min(qtyToConsume, lot.qtyRemaining);
          consumedLots.push({
            lotId: lot.lotId,
            qty: consumeQty,
            unitCost: lot.unitCostBrl,
          });

          totalCogs += lot.unitCostBrl * consumeQty;
          lot.qtyRemaining -= consumeQty;
          qtyToConsume -= consumeQty;
        }

        // Se não conseguiu consumir tudo, pular
        if (qtyToConsume > 0) continue;

        // Atualizar estoque
        const newStock = (stockByVariant.get(selectedVariant.id) || 0) - saleQty;
        stockByVariant.set(selectedVariant.id, Math.max(0, newStock));

        // Calcular valores financeiros
        const grossBrl = unitPrice * saleQty;
        const discountValue = round2(grossBrl * discountPercent / 100);
        const grossAfterDiscount = round2(grossBrl - discountValue);
        const feesBrl = round2(grossAfterDiscount * feePercent / 100);

        // Custos fixos (aplicar 1 de cada se disponível)
        let fixedCostTotal = 0;
        const appliedFixedCosts: { fcId: string; unitCost: number }[] = [];
        
        for (const fc of fixedCosts || []) {
          const remaining = fixedCostUnits.get(fc.id) || 0;
          if (remaining > 0) {
            const unitCost = fc.unit_cost_brl || 0;
            fixedCostTotal += unitCost;
            appliedFixedCosts.push({ fcId: fc.id, unitCost });
            fixedCostUnits.set(fc.id, remaining - 1);
          }
        }

        // Lucro líquido
        const netProfit = round2(grossAfterDiscount - feesBrl - shippingBrl - totalCogs - fixedCostTotal);
        const marginPercent = grossAfterDiscount > 0 ? round2((netProfit / grossAfterDiscount) * 100) : 0;

        const saleId = crypto.randomUUID();
        const saleItemId = crypto.randomUUID();

        // Sale
        allSales.push({
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
          discount_value_brl: discountValue,
          gross_after_discount_brl: grossAfterDiscount,
          fees_brl: feesBrl,
          shipping_brl: shippingBrl,
          is_preorder: false,
          product_costs_brl: round2(totalCogs),
          fixed_costs_brl: round2(fixedCostTotal),
          net_profit_brl: netProfit,
          margin_percent: marginPercent,
          cogs_pending: false,
          created_at: saleTimestamp,
        });

        // Sale item
        allSaleItems.push({
          id: saleItemId,
          user_id: userId,
          sale_id: saleId,
          variant_id: selectedVariant.id,
          qty: saleQty,
          unit_price_brl: unitPrice,
          product_label_snapshot: selectedVariant.products?.label || "Produto",
          uniform_snapshot: selectedVariant.uniform,
          size_snapshot: selectedVariant.size,
        });

        // Sale item lots
        for (const consumed of consumedLots) {
          allSaleItemLots.push({
            user_id: userId,
            sale_item_id: saleItemId,
            inventory_lot_id: consumed.lotId,
            qty_consumed: consumed.qty,
            unit_cost_brl: consumed.unitCost,
          });
        }

        // Sale fixed costs
        for (const afc of appliedFixedCosts) {
          allSaleFixedCosts.push({
            user_id: userId,
            sale_id: saleId,
            fixed_cost_id: afc.fcId,
            unit_cost_applied: afc.unitCost,
          });
        }

        // Stock movement out
        allStockMovementsOut.push({
          user_id: userId,
          variant_id: selectedVariant.id,
          type: "out",
          qty: saleQty,
          ref_type: "sale",
          ref_id: saleId,
          movement_date: saleTimestamp,
        });

        // Estatísticas
        totalRevenue += grossAfterDiscount;
        totalProfit += netProfit;
        salesThisMonth++;
        salesCount++;
      }

      console.log(`  💰 ${salesThisMonth} vendas criadas`);
    }

    // ==========================================
    // 5. INSERIR TODOS OS DADOS NO BANCO
    // ==========================================

    console.log('\n💾 Inserindo dados no banco...');

    // Compras
    if (allPurchaseOrders.length > 0) {
      await supabase.from('purchase_orders').insert(allPurchaseOrders);
    }
    if (allPurchaseItems.length > 0) {
      await supabase.from('purchase_items').insert(allPurchaseItems);
    }
    if (allInventoryLots.length > 0) {
      await supabase.from('inventory_lots').insert(allInventoryLots);
    }
    if (allStockMovementsIn.length > 0) {
      await supabase.from('stock_movements').insert(allStockMovementsIn);
    }

    // Vendas
    if (allSales.length > 0) {
      await supabase.from('sales').insert(allSales);
    }
    if (allSaleItems.length > 0) {
      await supabase.from('sale_items').insert(allSaleItems);
    }
    if (allSaleItemLots.length > 0) {
      await supabase.from('sale_item_lots').insert(allSaleItemLots);
    }
    if (allSaleFixedCosts.length > 0) {
      await supabase.from('sale_fixed_costs').insert(allSaleFixedCosts);
    }
    if (allStockMovementsOut.length > 0) {
      await supabase.from('stock_movements').insert(allStockMovementsOut);
    }

    // Atualizar qty_remaining dos lotes
    for (const [variantId, lots] of lotsByVariant.entries()) {
      for (const lot of lots) {
        await supabase
          .from('inventory_lots')
          .update({ qty_remaining: lot.qtyRemaining })
          .eq('id', lot.lotId);
      }
    }

    // Atualizar remaining_units dos custos fixos
    for (const [fcId, remaining] of fixedCostUnits.entries()) {
      await supabase
        .from('fixed_costs')
        .update({ remaining_units: remaining })
        .eq('id', fcId);
    }

    // ==========================================
    // 6. CALCULAR ESTATÍSTICAS FINAIS
    // ==========================================

    // Contar estoque total
    let totalStock = 0;
    for (const [_, stock] of stockByVariant.entries()) {
      totalStock += stock;
    }

    const avgMargin = salesCount > 0 ? round2(totalProfit / totalRevenue * 100) : 0;

    console.log('\n✅ Seed concluído com sucesso!');
    console.log(`📊 Estatísticas:`);
    console.log(`   - Vendas: ${salesCount}`);
    console.log(`   - Faturamento: R$ ${round2(totalRevenue).toLocaleString('pt-BR')}`);
    console.log(`   - Lucro: R$ ${round2(totalProfit).toLocaleString('pt-BR')}`);
    console.log(`   - Margem média: ${avgMargin}%`);
    console.log(`   - Estoque restante: ${totalStock} itens`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Dados demo criados com sucesso!',
      credentials: {
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD
      },
      stats: {
        suppliers: suppliers?.length || 0,
        products: products?.length || 0,
        variants: variants?.length || 0,
        customers: customers?.length || 0,
        purchaseOrders: allPurchaseOrders.length,
        sales: salesCount,
        totalStock,
        revenue: round2(totalRevenue),
        profit: round2(totalProfit),
        avgMargin,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('❌ Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
