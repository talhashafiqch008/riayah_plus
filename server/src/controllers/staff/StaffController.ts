import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { NotificationService } from '../../services/NotificationService';

const AGENCY_STAFF_ROLES = [
  'support_worker', 'nurse', 'physiotherapist', 'occupational_therapist',
  'speech_therapist', 'psychologist', 'dietitian', 'cleaner', 'gardener',
  'driver', 'companion', 'nanny', 'caregiver', 'therapist', 'doctor',
] as const;

const createStaffSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(AGENCY_STAFF_ROLES),
  hourlyRate: z.number().positive().optional(),
  skills: z.array(z.string()).optional(),
  bio: z.string().optional(),
});

const assignSchema = z.object({
  staffId: z.string(),
  bookingId: z.string().optional(),
  shiftId: z.string().optional(),
  assignedAt: z.string().optional(),
  notes: z.string().optional(),
});

export class StaffController {
  // POST /api/agency/staff — agency creates a sub-staff member
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createStaffSchema.parse(req.body);
      const agencyId = req.user!.userId;

      const staff = await prisma.agencyStaff.create({
        data: {
          agencyId,
          name: body.name,
          email: body.email,
          phone: body.phone,
          role: body.role,
          hourlyRate: body.hourlyRate,
          skills: body.skills ?? [],
          bio: body.bio,
          status: 'active',
        },
      });

      res.status(201).json({ success: true, staff });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/agency/staff
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const agencyId = req.user!.userId;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const [staff, total] = await Promise.all([
        prisma.agencyStaff.findMany({
          where: { agencyId },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.agencyStaff.count({ where: { agencyId } }),
      ]);

      res.json({ success: true, staff, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/agency/staff/:id
  static async show(req: Request, res: Response, next: NextFunction) {
    try {
      const staff = await prisma.agencyStaff.findUnique({
        where: { id: req.params.id },
        include: { assignments: true },
      });
      if (!staff) throw new AppError('Staff member not found.', 404);
      if (staff.agencyId !== req.user!.userId) throw new AppError('Forbidden.', 403);
      res.json({ success: true, staff });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/agency/staff/:id
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createStaffSchema.partial().parse(req.body);
      const staff = await prisma.agencyStaff.findUnique({ where: { id: req.params.id } });
      if (!staff) throw new AppError('Staff member not found.', 404);
      if (staff.agencyId !== req.user!.userId) throw new AppError('Forbidden.', 403);
      const updated = await prisma.agencyStaff.update({ where: { id: req.params.id }, data: body });
      res.json({ success: true, staff: updated });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/agency/staff/:id
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const staff = await prisma.agencyStaff.findUnique({ where: { id: req.params.id } });
      if (!staff) throw new AppError('Staff member not found.', 404);
      if (staff.agencyId !== req.user!.userId) throw new AppError('Forbidden.', 403);
      await prisma.agencyStaff.update({ where: { id: req.params.id }, data: { status: 'inactive' } });
      res.json({ success: true, message: 'Staff member deactivated.' });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/agency/assignments — assign staff to a booking/shift
  static async assign(req: Request, res: Response, next: NextFunction) {
    try {
      const body = assignSchema.parse(req.body);
      const agencyId = req.user!.userId;

      const staff = await prisma.agencyStaff.findUnique({ where: { id: body.staffId } });
      if (!staff || staff.agencyId !== agencyId) throw new AppError('Staff member not found.', 404);

      // Verify referenced booking/shift exist and belong to this agency's scope
      if (body.bookingId) {
        const booking = await prisma.booking.findUnique({
          where: { id: body.bookingId },
          select: { id: true },
        });
        if (!booking) throw new AppError('Booking not found.', 404);
      }
      if (body.shiftId) {
        const shift = await prisma.shift.findUnique({
          where: { id: body.shiftId },
          select: { id: true },
        });
        if (!shift) throw new AppError('Shift not found.', 404);
      }

      const assignment = await prisma.staffAssignment.create({
        data: {
          staffId: body.staffId,
          agencyId,
          bookingId: body.bookingId,
          shiftId: body.shiftId,
          assignedAt: body.assignedAt ? new Date(body.assignedAt) : new Date(),
          notes: body.notes,
          status: 'assigned',
        },
      });

      res.status(201).json({ success: true, assignment });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/agency/assignments
  static async listAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const agencyId = req.user!.userId;
      const assignments = await prisma.staffAssignment.findMany({
        where: { agencyId },
        include: { staff: true },
        orderBy: { assignedAt: 'desc' },
        take: 50,
      });
      res.json({ success: true, assignments });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/agency/assignments/:id
  static async updateAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, notes } = z.object({ status: z.string().optional(), notes: z.string().optional() }).parse(req.body);
      const assignment = await prisma.staffAssignment.findUnique({ where: { id: req.params.id } });
      if (!assignment) throw new AppError('Assignment not found.', 404);
      if (assignment.agencyId !== req.user!.userId) throw new AppError('Forbidden.', 403);
      const updated = await prisma.staffAssignment.update({
        where: { id: req.params.id },
        data: { status, notes },
      });
      res.json({ success: true, assignment: updated });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/agency/assignments/:id
  static async deleteAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const assignment = await prisma.staffAssignment.findUnique({ where: { id: req.params.id } });
      if (!assignment) throw new AppError('Assignment not found.', 404);
      if (assignment.agencyId !== req.user!.userId) throw new AppError('Forbidden.', 403);
      await prisma.staffAssignment.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Assignment removed.' });
    } catch (err) {
      next(err);
    }
  }
}
