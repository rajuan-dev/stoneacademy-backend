import { z } from "zod";

export const listProductsSchema = z.object({
  query: z.object({
    q: z.string().trim().max(200).optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    active: z.coerce.boolean().optional(),
  }),
});

export const productIdSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(200),
    description: z.string().trim().max(3000).optional(),
    price: z.coerce.number().min(0),
    currency: z.string().trim().min(3).max(10).optional(),
    imageUrl: z.string().trim().max(2000).optional(),
    stock: z.coerce.number().min(0).optional(),
    isActive: z.coerce.boolean().optional(),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z
    .object({
      name: z.string().trim().min(2).max(200).optional(),
      description: z.string().trim().max(3000).optional(),
      price: z.coerce.number().min(0).optional(),
      currency: z.string().trim().min(3).max(10).optional(),
      imageUrl: z.string().trim().max(2000).optional(),
      stock: z.coerce.number().min(0).optional(),
      isActive: z.coerce.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    }),
});

export const addCartItemSchema = z.object({
  body: z.object({
    productId: z.string().trim().min(1),
    quantity: z.coerce.number().min(1).max(100),
  }),
});

export const updateCartItemSchema = z.object({
  params: z.object({
    productId: z.string().trim().min(1),
  }),
  body: z.object({
    quantity: z.coerce.number().min(1).max(100),
  }),
});

export const cartItemIdSchema = z.object({
  params: z.object({
    productId: z.string().trim().min(1),
  }),
});
