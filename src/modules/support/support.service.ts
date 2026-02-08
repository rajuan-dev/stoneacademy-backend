import { PAGINATION } from "@/constants/app.constants";
import { notificationService } from "@/modules/notification/notification.service";
import {
  ForbiddenException,
  NotFoundException,
} from "@/utils/app-error.utils";
import { SupportTicket } from "./support-ticket.model";

export class SupportService {
  async createTicket(
    userId: string,
    payload: { category: string; subject: string; message: string },
  ) {
    return SupportTicket.create({
      userId,
      category: payload.category,
      subject: payload.subject,
      status: "open",
      messages: [
        {
          senderId: userId,
          senderRole: "user",
          message: payload.message,
          createdAt: new Date(),
        },
      ],
    });
  }

  async listMine(
    userId: string,
    query: { page?: number; limit?: number; status?: string },
  ) {
    return this.listCommon({ ...query, userId });
  }

  async listAdmin(query: { page?: number; limit?: number; status?: string }) {
    return this.listCommon(query);
  }

  async getOneForUser(userId: string, id: string) {
    const ticket = await SupportTicket.findById(id).exec();
    if (!ticket) throw new NotFoundException("Support ticket not found");
    if (ticket.userId.toString() !== userId) {
      throw new ForbiddenException("Not allowed to access this ticket");
    }
    return ticket;
  }

  async addReplyAsUser(userId: string, id: string, message: string) {
    const ticket = await this.getOneForUser(userId, id);
    ticket.messages.push({
      senderId: userId as any,
      senderRole: "user",
      message,
      createdAt: new Date(),
    });
    if (ticket.status === "resolved" || ticket.status === "closed") {
      ticket.status = "in_progress";
    }
    await ticket.save();
    return ticket;
  }

  async addReplyAsAdmin(adminId: string, id: string, message: string) {
    const ticket = await SupportTicket.findById(id).exec();
    if (!ticket) throw new NotFoundException("Support ticket not found");

    ticket.messages.push({
      senderId: adminId as any,
      senderRole: "admin",
      message,
      createdAt: new Date(),
    });
    if (ticket.status === "open") {
      ticket.status = "in_progress";
    }
    await ticket.save();

    await notificationService.create({
      userId: ticket.userId.toString(),
      type: "support_reply",
      title: "Support replied",
      body: "You have a new support response.",
      payload: { ticketId: ticket._id.toString() },
    });

    return ticket;
  }

  async updateStatus(id: string, status: "open" | "in_progress" | "resolved" | "closed") {
    const ticket = await SupportTicket.findById(id).exec();
    if (!ticket) throw new NotFoundException("Support ticket not found");
    ticket.status = status;
    await ticket.save();
    return ticket;
  }

  private async listCommon(input: {
    userId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = input.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = input.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (input.userId) filter.userId = input.userId;
    if (input.status) filter.status = input.status;

    const [data, totalItems] = await Promise.all([
      SupportTicket.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      SupportTicket.countDocuments(filter),
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
}
