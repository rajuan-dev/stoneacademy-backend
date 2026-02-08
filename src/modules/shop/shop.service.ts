import { PAGINATION, ORDER_STATUS } from "@/constants/app.constants";
import { BadRequestException, NotFoundException } from "@/utils/app-error.utils";
import { Cart } from "./cart.model";
import { Order } from "./order.model";
import { Product } from "./product.model";

export class ShopService {
  async listProducts(query: {
    q?: string;
    page?: number;
    limit?: number;
    active?: boolean;
  }) {
    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (query.q) {
      const pattern = new RegExp(query.q, "i");
      filter.$or = [{ name: pattern }, { description: pattern }];
    }
    if (query.active !== undefined) {
      filter.isActive = query.active;
    } else {
      filter.isActive = true;
    }

    const [data, totalItems] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      Product.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        pageCount: Math.ceil(totalItems / limit),
        hasNext: page * limit < totalItems,
        hasPrev: page > 1,
      },
    };
  }

  async getProduct(productId: string) {
    const product = await Product.findById(productId).exec();
    if (!product) {
      throw new NotFoundException("Product not found");
    }
    return product;
  }

  async createProduct(payload: {
    name: string;
    description?: string;
    price: number;
    currency?: string;
    imageUrl?: string;
    stock?: number;
    isActive?: boolean;
  }) {
    return Product.create({
      name: payload.name,
      description: payload.description,
      price: payload.price,
      currency: payload.currency || "USD",
      imageUrl: payload.imageUrl,
      stock: payload.stock ?? 0,
      isActive: payload.isActive ?? true,
    });
  }

  async updateProduct(
    productId: string,
    payload: {
      name?: string;
      description?: string;
      price?: number;
      currency?: string;
      imageUrl?: string;
      stock?: number;
      isActive?: boolean;
    },
  ) {
    const product = await Product.findById(productId).exec();
    if (!product) {
      throw new NotFoundException("Product not found");
    }

    if (payload.name !== undefined) product.name = payload.name;
    if (payload.description !== undefined) product.description = payload.description;
    if (payload.price !== undefined) product.price = payload.price;
    if (payload.currency !== undefined) product.currency = payload.currency;
    if (payload.imageUrl !== undefined) product.imageUrl = payload.imageUrl;
    if (payload.stock !== undefined) product.stock = payload.stock;
    if (payload.isActive !== undefined) product.isActive = payload.isActive;

    await product.save();
    return product;
  }

  async deleteProduct(productId: string) {
    const product = await Product.findByIdAndDelete(productId).exec();
    if (!product) {
      throw new NotFoundException("Product not found");
    }
    return { deleted: true };
  }

  async getCart(userId: string) {
    const cart = await Cart.findOne({ userId }).exec();
    return cart || (await Cart.create({ userId, items: [] }));
  }

  async addToCart(userId: string, productId: string, quantity: number) {
    const product = await this.getProduct(productId);
    if (!product.isActive) {
      throw new BadRequestException("Product is not available");
    }
    if (product.stock < quantity) {
      throw new BadRequestException("Insufficient stock");
    }

    const cart = await this.getCart(userId);
    const existing = cart.items.find((item) => item.productId.toString() === productId);
    if (existing) {
      const newQty = existing.quantity + quantity;
      if (product.stock < newQty) {
        throw new BadRequestException("Insufficient stock");
      }
      existing.quantity = newQty;
    } else {
      cart.items.push({
        productId: product._id,
        quantity,
        unitPrice: product.price,
        currency: product.currency,
      });
    }
    await cart.save();
    return cart;
  }

  async updateCartItem(userId: string, productId: string, quantity: number) {
    const cart = await this.getCart(userId);
    const item = cart.items.find((i) => i.productId.toString() === productId);
    if (!item) {
      throw new NotFoundException("Cart item not found");
    }

    const product = await this.getProduct(productId);
    if (product.stock < quantity) {
      throw new BadRequestException("Insufficient stock");
    }

    item.quantity = quantity;
    item.unitPrice = product.price;
    item.currency = product.currency;
    await cart.save();
    return cart;
  }

  async removeCartItem(userId: string, productId: string) {
    const cart = await this.getCart(userId);
    cart.items = cart.items.filter((i) => i.productId.toString() !== productId);
    await cart.save();
    return cart;
  }

  async checkout(userId: string) {
    const cart = await this.getCart(userId);
    if (!cart.items.length) {
      throw new BadRequestException("Cart is empty");
    }

    const products = await Product.find({
      _id: { $in: cart.items.map((i) => i.productId) },
    }).exec();

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    let totalAmount = 0;
    const orderItems = cart.items.map((item) => {
      const product = productMap.get(item.productId.toString());
      if (!product) {
        throw new BadRequestException("Product not available");
      }
      if (!product.isActive) {
        throw new BadRequestException("Product is not available");
      }
      if (product.stock < item.quantity) {
        throw new BadRequestException("Insufficient stock");
      }
      totalAmount += item.quantity * product.price;
      return {
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        currency: product.currency,
      };
    });

    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity },
      }).exec();
    }

    const order = await Order.create({
      userId,
      items: orderItems,
      totalAmount: Number(totalAmount.toFixed(2)),
      currency: orderItems[0]?.currency || "USD",
      status: ORDER_STATUS.PLACED,
    });

    cart.items = [];
    await cart.save();

    return order;
  }
}
