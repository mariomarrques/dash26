const REQUIRED_HEADERS = [
  "fornecedor",
  "lote",
  "data_pedido",
  "origem",
  "status",
  "modo_envio",
  "frete",
  "taxa_remessa",
  "temporada",
  "pais",
  "time",
  "versao",
  "uniforme",
  "tamanho",
  "personalizacao",
  "quantidade",
  "preco_unitario",
] as const;

export type PurchaseCsvHeader = (typeof REQUIRED_HEADERS)[number];

type SourceLabel = "China" | "Brasil";
type StatusLabel = "Rascunho" | "Comprado" | "Enviado" | "Chegou";
type ShippingModeLabel = "Remessa Conforme" | "Offline" | "CSSBuy";

type InternalSource = "china" | "brasil";
type InternalStatus = "rascunho" | "comprado" | "enviado" | "chegou";
type InternalShippingMode = "remessa" | "offline" | "cssbuy";

const SOURCE_MAP: Record<SourceLabel, InternalSource> = {
  China: "china",
  Brasil: "brasil",
};

const STATUS_MAP: Record<StatusLabel, InternalStatus> = {
  Rascunho: "rascunho",
  Comprado: "comprado",
  Enviado: "enviado",
  Chegou: "chegou",
};

const SHIPPING_MODE_MAP: Record<ShippingModeLabel, InternalShippingMode> = {
  "Remessa Conforme": "remessa",
  Offline: "offline",
  CSSBuy: "cssbuy",
};

export interface PurchaseCsvIssue {
  line: number;
  column: PurchaseCsvHeader | "header";
  message: string;
  value?: string;
}

export interface PurchaseCsvImportItem {
  line: number;
  season: string;
  country: string;
  team: string;
  version: string;
  uniform: string;
  size: string;
  personalization: string | null;
  qty: number;
  unitCostValue: number;
  itemSubtotal: number;
  productLabel: string;
}

export interface PurchaseCsvImportGroup {
  key: string;
  supplierName: string;
  lot: string;
  orderDate: string;
  source: InternalSource;
  sourceLabel: SourceLabel;
  status: InternalStatus;
  statusLabel: StatusLabel;
  shippingMode: InternalShippingMode;
  shippingModeLabel: ShippingModeLabel;
  freightBrl: number;
  extraFeesBrl: number;
  notes: string;
  items: PurchaseCsvImportItem[];
  totalItems: number;
  totalPieces: number;
  subtotalProducts: number;
  totalEstimated: number;
}

export interface PurchaseCsvImportSummary {
  purchaseCount: number;
  totalItems: number;
  totalPieces: number;
  subtotalProducts: number;
  totalEstimated: number;
}

export interface PurchaseCsvImportPreview {
  groups: PurchaseCsvImportGroup[];
  summary: PurchaseCsvImportSummary;
  fileName?: string;
}

export interface PurchaseCsvImportPayloadItem {
  season: string;
  country: string;
  team: string;
  version: string;
  uniform: string;
  size: string;
  personalization: string | null;
  qty: number;
  unitCostValue: number;
  productLabel: string;
}

export interface PurchaseCsvImportPayloadGroup {
  supplierName: string;
  lot: string;
  orderDate: string;
  source: InternalSource;
  status: InternalStatus;
  shippingMode: InternalShippingMode;
  freightBrl: number;
  extraFeesBrl: number;
  notes: string;
  items: PurchaseCsvImportPayloadItem[];
}

export class PurchaseCsvImportError extends Error {
  issues: PurchaseCsvIssue[];

  constructor(issues: PurchaseCsvIssue[]) {
    super("CSV de compras inválido");
    this.name = "PurchaseCsvImportError";
    this.issues = issues;
  }
}

interface ParsedCsvRow {
  line: number;
  values: Record<PurchaseCsvHeader, string>;
}

interface NormalizedCsvRow {
  line: number;
  supplierName: string;
  lot: string;
  orderDate: string;
  source: InternalSource;
  sourceLabel: SourceLabel;
  status: InternalStatus;
  statusLabel: StatusLabel;
  shippingMode: InternalShippingMode;
  shippingModeLabel: ShippingModeLabel;
  freightBrl: number;
  extraFeesBrl: number;
  season: string;
  country: string;
  team: string;
  version: string;
  uniform: string;
  size: string;
  personalization: string | null;
  qty: number;
  unitCostValue: number;
  itemSubtotal: number;
  productLabel: string;
}

const REQUIRED_TEXT_FIELDS: PurchaseCsvHeader[] = [
  "fornecedor",
  "lote",
  "data_pedido",
  "status",
  "temporada",
  "pais",
  "time",
  "versao",
  "uniforme",
  "tamanho",
  "quantidade",
  "preco_unitario",
];

export const PURCHASE_CSV_REQUIRED_HEADERS = REQUIRED_HEADERS;

export function parsePurchaseCsvImport(csvText: string, fileName?: string): PurchaseCsvImportPreview {
  const rows = parseCsvRows(csvText);
  const issues: PurchaseCsvIssue[] = [];

  const normalizedRows = rows
    .map((row) => normalizeRow(row, issues))
    .filter((row): row is NormalizedCsvRow => row !== null);

  if (issues.length > 0) {
    throw new PurchaseCsvImportError(sortIssues(issues));
  }

  const groupsMap = new Map<string, PurchaseCsvImportGroup>();

  for (const row of normalizedRows) {
    const key = `${row.supplierName}::${row.lot}`;
    const existingGroup = groupsMap.get(key);

    if (!existingGroup) {
      groupsMap.set(key, {
        key,
        supplierName: row.supplierName,
        lot: row.lot,
        orderDate: row.orderDate,
        source: row.source,
        sourceLabel: row.sourceLabel,
        status: row.status,
        statusLabel: row.statusLabel,
        shippingMode: row.shippingMode,
        shippingModeLabel: row.shippingModeLabel,
        freightBrl: row.freightBrl,
        extraFeesBrl: row.extraFeesBrl,
        notes: `Importado via CSV - lote: ${row.lot}`,
        items: [toPreviewItem(row)],
        totalItems: 1,
        totalPieces: row.qty,
        subtotalProducts: row.itemSubtotal,
        totalEstimated: row.itemSubtotal + row.freightBrl + row.extraFeesBrl,
      });
      continue;
    }

    const consistencyIssuesBefore = issues.length;
    validateGroupConsistency(existingGroup, row, issues);
    if (issues.length > consistencyIssuesBefore) {
      continue;
    }

    existingGroup.items.push(toPreviewItem(row));
    existingGroup.totalItems += 1;
    existingGroup.totalPieces += row.qty;
    existingGroup.subtotalProducts += row.itemSubtotal;
    existingGroup.totalEstimated = existingGroup.subtotalProducts + existingGroup.freightBrl + existingGroup.extraFeesBrl;
  }

  if (issues.length > 0) {
    throw new PurchaseCsvImportError(sortIssues(issues));
  }

  const groups = [...groupsMap.values()].sort((a, b) => {
    if (a.orderDate !== b.orderDate) return a.orderDate.localeCompare(b.orderDate);
    if (a.supplierName !== b.supplierName) return a.supplierName.localeCompare(b.supplierName);
    return a.lot.localeCompare(b.lot);
  });

  const summary = groups.reduce<PurchaseCsvImportSummary>(
    (acc, group) => {
      acc.purchaseCount += 1;
      acc.totalItems += group.totalItems;
      acc.totalPieces += group.totalPieces;
      acc.subtotalProducts += group.subtotalProducts;
      acc.totalEstimated += group.totalEstimated;
      return acc;
    },
    {
      purchaseCount: 0,
      totalItems: 0,
      totalPieces: 0,
      subtotalProducts: 0,
      totalEstimated: 0,
    },
  );

  return {
    fileName,
    groups,
    summary,
  };
}

export function buildPurchaseCsvImportPayload(
  preview: PurchaseCsvImportPreview,
): PurchaseCsvImportPayloadGroup[] {
  return preview.groups.map((group) => ({
    supplierName: group.supplierName,
    lot: group.lot,
    orderDate: group.orderDate,
    source: group.source,
    status: group.status,
    shippingMode: group.shippingMode,
    freightBrl: group.freightBrl,
    extraFeesBrl: group.extraFeesBrl,
    notes: group.notes,
    items: group.items.map((item) => ({
      season: item.season,
      country: item.country,
      team: item.team,
      version: item.version,
      uniform: item.uniform,
      size: item.size,
      personalization: item.personalization,
      qty: item.qty,
      unitCostValue: item.unitCostValue,
      productLabel: item.productLabel,
    })),
  }));
}

export function formatPurchaseCsvIssue(issue: PurchaseCsvIssue): string {
  const location = issue.column === "header"
    ? `Header`
    : `Linha ${issue.line}, coluna "${issue.column}"`;

  return issue.value
    ? `${location}: ${issue.message} (valor: ${issue.value})`
    : `${location}: ${issue.message}`;
}

function parseCsvRows(csvText: string): ParsedCsvRow[] {
  const matrix = parseCsvMatrix(csvText);

  if (matrix.length === 0) {
    throw new PurchaseCsvImportError([
      {
        line: 1,
        column: "header",
        message: "Arquivo CSV vazio.",
      },
    ]);
  }

  const [rawHeader, ...dataRows] = matrix;
  const normalizedHeader = rawHeader.map((cell, index) => normalizeHeaderCell(cell, index));
  const issues: PurchaseCsvIssue[] = [];

  const missingHeaders = REQUIRED_HEADERS.filter((header) => !normalizedHeader.includes(header));
  if (missingHeaders.length > 0) {
    issues.push({
      line: 1,
      column: "header",
      message: `Header inválido. Colunas ausentes: ${missingHeaders.join(", ")}.`,
    });
  }

  if (issues.length > 0) {
    throw new PurchaseCsvImportError(issues);
  }

  const rows: ParsedCsvRow[] = [];

  dataRows.forEach((cells, index) => {
    const isEmptyRow = cells.every((cell) => cell.trim() === "");
    if (isEmptyRow) return;

    const values = {} as Record<PurchaseCsvHeader, string>;
    for (const header of REQUIRED_HEADERS) {
      const columnIndex = normalizedHeader.indexOf(header);
      values[header] = (cells[columnIndex] ?? "").trim();
    }

    rows.push({
      line: index + 2,
      values,
    });
  });

  if (rows.length === 0) {
    throw new PurchaseCsvImportError([
      {
        line: 2,
        column: "header",
        message: "O CSV precisa ter pelo menos uma linha de dados.",
      },
    ]);
  }

  return rows;
}

function parseCsvMatrix(csvText: string): string[][] {
  const normalized = csvText.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const nextChar = normalized[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (inQuotes) {
    throw new PurchaseCsvImportError([
      {
        line: rows.length + 1,
        column: "header",
        message: "Aspas não fechadas no CSV.",
      },
    ]);
  }

  row.push(cell);
  rows.push(row);

  return rows;
}

function normalizeHeaderCell(value: string, index: number): string {
  if (index === 0) {
    return value.replace(/^\uFEFF/, "").trim();
  }
  return value.trim();
}

function normalizeRow(row: ParsedCsvRow, issues: PurchaseCsvIssue[]): NormalizedCsvRow | null {
  const { values } = row;
  const initialIssuesCount = issues.length;

  for (const field of REQUIRED_TEXT_FIELDS) {
    if (!values[field]?.trim()) {
      issues.push({
        line: row.line,
        column: field,
        message: "Campo obrigatório.",
      });
    }
  }

  const orderDate = values.data_pedido.trim();
  if (orderDate && !isValidDate(orderDate)) {
    issues.push({
      line: row.line,
      column: "data_pedido",
      message: "Data inválida. Use o formato YYYY-MM-DD.",
      value: values.data_pedido,
    });
  }

  const sourceLabel = (values.origem.trim() || "China") as SourceLabel;
  if (!(sourceLabel in SOURCE_MAP)) {
    issues.push({
      line: row.line,
      column: "origem",
      message: 'Origem inválida. Use "China" ou "Brasil".',
      value: values.origem,
    });
  }

  const statusLabel = values.status.trim() as StatusLabel;
  if (!(statusLabel in STATUS_MAP)) {
    issues.push({
      line: row.line,
      column: "status",
      message: 'Status inválido. Use "Rascunho", "Comprado", "Enviado" ou "Chegou".',
      value: values.status,
    });
  }

  const shippingModeLabel = (values.modo_envio.trim() || "Offline") as ShippingModeLabel;
  if (!(shippingModeLabel in SHIPPING_MODE_MAP)) {
    issues.push({
      line: row.line,
      column: "modo_envio",
      message: 'Modo de envio inválido. Use "Remessa Conforme", "Offline" ou "CSSBuy".',
      value: values.modo_envio,
    });
  }

  const freightBrl = parseNumber(values.frete, row.line, "frete", issues, { defaultValue: 0, min: 0 });
  const extraFeesBrl = parseNumber(values.taxa_remessa, row.line, "taxa_remessa", issues, { defaultValue: 0, min: 0 });
  const qty = parseNumber(values.quantidade, row.line, "quantidade", issues, { integer: true, min: 1 });
  const unitCostValue = parseNumber(values.preco_unitario, row.line, "preco_unitario", issues, { min: Number.EPSILON });

  if (issues.length > initialIssuesCount) {
    return null;
  }

  const supplierName = collapseWhitespace(values.fornecedor);
  const lot = collapseWhitespace(values.lote);
  const season = collapseWhitespace(values.temporada);
  const country = collapseWhitespace(values.pais);
  const team = collapseWhitespace(values.time);
  const version = collapseWhitespace(values.versao);
  const uniform = collapseWhitespace(values.uniforme);
  const size = collapseWhitespace(values.tamanho);
  const personalization = values.personalizacao.trim() ? collapseWhitespace(values.personalizacao) : null;
  const itemSubtotal = qty * unitCostValue;

  return {
    line: row.line,
    supplierName,
    lot,
    orderDate,
    source: SOURCE_MAP[sourceLabel],
    sourceLabel,
    status: STATUS_MAP[statusLabel],
    statusLabel,
    shippingMode: SHIPPING_MODE_MAP[shippingModeLabel],
    shippingModeLabel,
    freightBrl,
    extraFeesBrl,
    season,
    country,
    team,
    version,
    uniform,
    size,
    personalization,
    qty,
    unitCostValue,
    itemSubtotal,
    productLabel: buildProductLabel(team, season, version),
  };
}

function validateGroupConsistency(
  group: PurchaseCsvImportGroup,
  row: NormalizedCsvRow,
  issues: PurchaseCsvIssue[],
) {
  if (group.orderDate !== row.orderDate) {
    issues.push(groupMismatch(row.line, "data_pedido", group.orderDate, row.orderDate));
  }
  if (group.source !== row.source) {
    issues.push(groupMismatch(row.line, "origem", group.sourceLabel, row.sourceLabel));
  }
  if (group.status !== row.status) {
    issues.push(groupMismatch(row.line, "status", group.statusLabel, row.statusLabel));
  }
  if (group.shippingMode !== row.shippingMode) {
    issues.push(groupMismatch(row.line, "modo_envio", group.shippingModeLabel, row.shippingModeLabel));
  }
  if (!numbersEqual(group.freightBrl, row.freightBrl)) {
    issues.push(groupMismatch(row.line, "frete", group.freightBrl.toString(), row.freightBrl.toString()));
  }
  if (!numbersEqual(group.extraFeesBrl, row.extraFeesBrl)) {
    issues.push(groupMismatch(row.line, "taxa_remessa", group.extraFeesBrl.toString(), row.extraFeesBrl.toString()));
  }
}

function groupMismatch(
  line: number,
  column: PurchaseCsvHeader,
  expected: string,
  received: string,
): PurchaseCsvIssue {
  return {
    line,
    column,
    message: `Valor divergente dentro do mesmo fornecedor+lote. Esperado ${expected}, recebido ${received}.`,
  };
}

function parseNumber(
  rawValue: string,
  line: number,
  column: PurchaseCsvHeader,
  issues: PurchaseCsvIssue[],
  options: { defaultValue?: number; integer?: boolean; min?: number },
): number {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    if (options.defaultValue !== undefined) return options.defaultValue;
    issues.push({ line, column, message: "Campo obrigatório." });
    return 0;
  }

  const hasComma = trimmed.includes(",");
  const hasDot = trimmed.includes(".");
  const normalized = hasComma && hasDot
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : hasComma
      ? trimmed.replace(",", ".")
      : trimmed;

  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    issues.push({
      line,
      column,
      message: "Número inválido.",
      value: rawValue,
    });
    return 0;
  }

  if (options.integer && !Number.isInteger(value)) {
    issues.push({
      line,
      column,
      message: "Use um número inteiro.",
      value: rawValue,
    });
    return value;
  }

  if (options.min !== undefined && value < options.min) {
    issues.push({
      line,
      column,
      message: options.min === 1 ? "O valor deve ser maior que zero." : "O valor deve ser positivo.",
      value: rawValue,
    });
  }

  return value;
}

function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

function buildProductLabel(team: string, season: string, version: string): string {
  return [team, season, version].filter(Boolean).join(" ").trim();
}

function numbersEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.000001;
}

function toPreviewItem(row: NormalizedCsvRow): PurchaseCsvImportItem {
  return {
    line: row.line,
    season: row.season,
    country: row.country,
    team: row.team,
    version: row.version,
    uniform: row.uniform,
    size: row.size,
    personalization: row.personalization,
    qty: row.qty,
    unitCostValue: row.unitCostValue,
    itemSubtotal: row.itemSubtotal,
    productLabel: row.productLabel,
  };
}

function sortIssues(issues: PurchaseCsvIssue[]): PurchaseCsvIssue[] {
  return [...issues].sort((a, b) => {
    if (a.line !== b.line) return a.line - b.line;
    return a.column.localeCompare(b.column);
  });
}
