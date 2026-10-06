import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';

export type MovementKind = 'ENTRY' | 'EXIT';
export interface Product { productCode: number; description: string; stock: number }
export interface Sale { seller: string; value: number }

const sales: Sale[] = [
  ['João Silva', 1200.50], ['João Silva', 950.75], ['João Silva', 1800], ['João Silva', 1400.30], ['João Silva', 1100.90], ['João Silva', 1550], ['João Silva', 1700.80], ['João Silva', 250.30], ['João Silva', 480.75], ['João Silva', 320.40],
  ['Maria Souza', 2100.40], ['Maria Souza', 1350.60], ['Maria Souza', 950.20], ['Maria Souza', 1600.75], ['Maria Souza', 1750], ['Maria Souza', 1450.90], ['Maria Souza', 400.50], ['Maria Souza', 180.20], ['Maria Souza', 90.75],
  ['Carlos Oliveira', 800.50], ['Carlos Oliveira', 1200], ['Carlos Oliveira', 1950.30], ['Carlos Oliveira', 1750.80], ['Carlos Oliveira', 1300.60], ['Carlos Oliveira', 300.40], ['Carlos Oliveira', 500], ['Carlos Oliveira', 125.75],
  ['Ana Lima', 1000], ['Ana Lima', 1100.50], ['Ana Lima', 1250.75], ['Ana Lima', 1400.20], ['Ana Lima', 1550.90], ['Ana Lima', 1650], ['Ana Lima', 75.30], ['Ana Lima', 420.90], ['Ana Lima', 315.40]
].map(([seller, value]) => ({ seller: seller as string, value: value as number }));

const initialProducts: Product[] = [
  { productCode: 101, description: 'Caneta Azul', stock: 150 },
  { productCode: 102, description: 'Caderno Universitário', stock: 75 },
  { productCode: 103, description: 'Borracha Branca', stock: 200 },
  { productCode: 104, description: 'Lápis Preto HB', stock: 320 },
  { productCode: 105, description: 'Marcador de Texto Amarelo', stock: 90 }
];

export const commissionFor = (value: number) => {
  const rate = value < 100 ? 0 : value < 500 ? .01 : .05;
  return Math.round((value * rate + Number.EPSILON) * 100) / 100;
};

export function createApp() {
  const products = new Map(initialProducts.map(product => [product.productCode, { ...product }]));
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
  app.get('/api/commissions', (_request, response) => {
    const bySeller = new Map<string, { salesCount: number; salesTotal: number; commissionTotal: number }>();
    sales.forEach(({ seller, value }) => {
      const current = bySeller.get(seller) ?? { salesCount: 0, salesTotal: 0, commissionTotal: 0 };
      current.salesCount += 1;
      current.salesTotal += value;
      current.commissionTotal += commissionFor(value);
      bySeller.set(seller, current);
    });
    response.json([...bySeller.entries()].map(([seller, summary]) => ({ seller, ...summary, salesTotal: Number(summary.salesTotal.toFixed(2)), commissionTotal: Number(summary.commissionTotal.toFixed(2)) })).sort((a, b) => a.seller.localeCompare(b.seller)));
  });

  app.get('/api/inventory', (_request, response) => response.json([...products.values()].sort((a, b) => a.productCode - b.productCode)));
  app.post('/api/inventory/movements', (request, response) => {
    const { productCode, type, quantity, description } = request.body as { productCode?: number; type?: MovementKind; quantity?: number; description?: string };
    if (!Number.isInteger(productCode) || !['ENTRY', 'EXIT'].includes(type ?? '') || typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0 || !description?.trim()) return response.status(400).json({ message: 'Informe produto, tipo, quantidade inteira positiva e descrição.' });
    const validProductCode = productCode as number;
    const validType = type as MovementKind;
    const validQuantity = quantity as number;
    const validDescription = description.trim();
    const product = products.get(validProductCode);
    if (!product) return response.status(404).json({ message: 'Produto não encontrado.' });
    if (validType === 'EXIT' && validQuantity > product.stock) return response.status(400).json({ message: 'Estoque insuficiente para esta saída.' });
    product.stock += validType === 'ENTRY' ? validQuantity : -validQuantity;
    response.status(201).json({ id: crypto.randomUUID(), productCode: validProductCode, productDescription: product.description, type: validType, quantity: validQuantity, description: validDescription, finalStock: product.stock, createdAt: new Date().toISOString() });
  });

  app.post('/api/interest/calculate', (request, response) => {
    const { amount, dueDate } = request.body as { amount?: number; dueDate?: string };
    const due = dueDate ? new Date(`${dueDate}T00:00:00`) : new Date('invalid');
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || Number.isNaN(due.valueOf())) return response.status(400).json({ message: 'Informe um valor positivo e uma data de vencimento válida.' });
    const validAmount = amount as number;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const daysLate = Math.max(0, Math.floor((today.valueOf() - due.valueOf()) / 86_400_000));
    const interestAmount = Number((validAmount * .025 * daysLate).toFixed(2));
    response.json({ originalAmount: validAmount, dueDate, calculationDate: today.toISOString().slice(0, 10), daysLate, interestAmount, totalAmount: Number((validAmount + interestAmount).toFixed(2)) });
  });
  return app;
}
