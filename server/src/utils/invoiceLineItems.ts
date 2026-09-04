import { z } from 'zod';

export const invoiceLineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  serviceType: z.string().optional(),
  category: z.string().optional(),
});

export type NormalizedInvoiceLineItem = z.infer<typeof invoiceLineItemSchema>;

/** L4 — strip arbitrary JSON fields before persisting lineItems. */
export function normalizeLineItems(items: unknown): NormalizedInvoiceLineItem[] {
  const parsed = z.array(invoiceLineItemSchema).parse(items);
  return parsed.map(({ description, quantity, unitPrice, serviceType, category }) => ({
    description,
    quantity,
    unitPrice,
    ...(serviceType ? { serviceType } : {}),
    ...(category ? { category } : {}),
  }));
}
