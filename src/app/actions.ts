"use server";

import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, requireUser, can } from "@/lib/auth";
import { db } from "@/lib/db";

const text = z.string().trim().min(2).max(500);

export async function loginAction(formData: FormData) {
  const identity = String(formData.get("identity") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/portal");
  if (!/^[a-z0-9@._-]{2,100}$/.test(identity) || password.length < 8) redirect("/login?error=invalid");
  const recentFailures = await db.auditLog.count({ where: { action: "LOGIN_FAILED", detail: identity, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } } });
  if (recentFailures >= 8) redirect("/login?error=rate");
  const user = await db.user.findFirst({ where: { OR: [{ username: identity }, { email: identity }] } });
  if (!user || user.status !== "ACTIVE" || !(await bcrypt.compare(password, user.passwordHash))) {
    await db.auditLog.create({ data: { action: "LOGIN_FAILED", entityType: "User", detail: identity } });
    redirect("/login?error=invalid");
  }
  await createSession(user.id);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await db.auditLog.create({ data: { userId: user.id, action: "LOGIN_SUCCESS", entityType: "User", entityId: user.id } });
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/portal");
}

export async function logoutAction() { await destroySession(); redirect("/"); }

export async function admissionAction(formData: FormData) {
  const schema = z.object({ applicantName: text, dateOfBirth: z.coerce.date(), gender: text, classId: text, previousSchool: z.string().max(200), guardianName: text, relationship: text, mobile: z.string().regex(/^[+0-9 ()-]{8,20}$/), email: z.string().email(), address: z.string().min(8).max(600), previousAcademics: z.string().max(600), notes: z.string().max(600) });
  const values = schema.safeParse(Object.fromEntries(formData));
  if (!values.success) redirect("/admissions?error=application#apply");
  const recentApplications = await db.admission.count({ where: { OR: [{ email: values.data.email }, { mobile: values.data.mobile }], createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } });
  if (recentApplications >= 3) redirect("/admissions?error=rate#apply");
  const year = await db.academicYear.findFirstOrThrow({ where: { isCurrent: true } });
  const reference = `NGA-APP-2026-${crypto.randomInt(1000, 9999)}`;
  const verificationCode = String(crypto.randomInt(100000, 999999));
  await db.admission.create({ data: { ...values.data, reference, verificationCode, academicYearId: year.id } });
  await db.auditLog.create({ data: { action: "ADMISSION_SUBMITTED", entityType: "Admission", entityId: reference } });
  redirect(`/admissions/success?reference=${encodeURIComponent(reference)}&code=${verificationCode}`);
}

export async function contactAction(formData: FormData) {
  const values = z.object({ name: text, email: z.string().email(), phone: z.string().max(30), subject: text, message: z.string().min(10).max(2000) }).safeParse(Object.fromEntries(formData));
  if (!values.success) redirect("/admissions?error=contact#contact");
  const recentEnquiries = await db.contactEnquiry.count({ where: { email: values.data.email, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } });
  if (recentEnquiries >= 3) redirect("/admissions?error=rate#contact");
  await db.contactEnquiry.create({ data: values.data });
  redirect("/admissions?contact=received#contact");
}

export async function trackAdmissionAction(formData: FormData) {
  const reference = String(formData.get("reference") ?? "").trim().toUpperCase();
  const code = String(formData.get("code") ?? "").trim();
  redirect(`/admissions/track?reference=${encodeURIComponent(reference)}&code=${encodeURIComponent(code)}`);
}

export async function recordPaymentAction(formData: FormData) {
  const user = await requireUser(); if (!can(user, "finance.manage")) throw new Error("Not authorized");
  const invoiceId = String(formData.get("invoiceId")); const amountPaise = Math.round(Number(formData.get("amount")) * 100);
  if (!invoiceId || !Number.isFinite(amountPaise) || amountPaise <= 0) throw new Error("Invalid payment");
  await db.$transaction(async tx => {
    const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { payments: true } });
    const paid = invoice.payments.reduce((sum, payment) => sum + payment.amountPaise, 0);
    const balance = invoice.totalPaise - invoice.discountPaise - paid;
    if (amountPaise > balance) throw new Error("Payment exceeds balance");
    await tx.payment.create({ data: { invoiceId, amountPaise, receiptNo: `RCP-${Date.now()}`, method: "CASH" } });
    await tx.invoice.update({ where: { id: invoiceId }, data: { status: amountPaise === balance ? "PAID" : "PARTIAL" } });
    await tx.auditLog.create({ data: { userId: user.id, action: "PAYMENT_RECORDED", entityType: "Invoice", entityId: invoiceId, detail: String(amountPaise) } });
  });
  revalidatePath("/portal/finance");
}

export async function publishWebsiteAction(formData: FormData) {
  const user = await requireUser(); if (!can(user, "website.manage")) throw new Error("Not authorized");
  const key = String(formData.get("key")); const title = String(formData.get("title")); const body = String(formData.get("body"));
  if (!key || title.length < 2 || body.length < 5) throw new Error("Invalid content");
  const school = await db.school.findFirstOrThrow();
  await db.websiteContent.upsert({ where: { schoolId_key: { schoolId: school.id, key } }, update: { title, body, status: "PUBLISHED" }, create: { schoolId: school.id, key, title, body, status: "PUBLISHED" } });
  await db.auditLog.create({ data: { userId: user.id, action: "WEBSITE_CONTENT_PUBLISHED", entityType: "WebsiteContent", entityId: key } });
  revalidatePath("/"); revalidatePath("/about"); revalidatePath("/academics");
}

export async function advanceAdmissionAction(formData: FormData) {
  const user = await requireUser(); if (!can(user, "admissions.manage")) throw new Error("Not authorized");
  const id = String(formData.get("id")); const status = String(formData.get("status"));
  const allowed = ["DOCUMENT_REVIEW", "ASSESSMENT", "INTERVIEW", "APPROVED", "REJECTED"] as const;
  if (!allowed.includes(status as typeof allowed[number])) throw new Error("Invalid admission status");
  await db.admission.update({ where: { id }, data: { status: status as never, assessmentAt: status === "ASSESSMENT" ? new Date() : undefined } });
  await db.auditLog.create({ data: { userId: user.id, action: "ADMISSION_STATUS_UPDATED", entityType: "Admission", entityId: id, detail: status } });
  revalidatePath("/portal/admissions");
}

export async function enrolAdmissionAction(formData: FormData) {
  const operator = await requireUser(); if (!can(operator, "admissions.manage")) throw new Error("Not authorized");
  const id = String(formData.get("id"));
  await db.$transaction(async tx => {
    const application = await tx.admission.findUniqueOrThrow({ where: { id }, include: { class: { include: { sections: true } }, academicYear: true } });
    if (application.status !== "APPROVED") throw new Error("Only approved applications can be enrolled");
    const existingStudent = await tx.student.findFirst({ where: { firstName: application.applicantName.split(" ")[0], lastName: application.applicantName.split(" ").slice(1).join(" ") || "Student", dateOfBirth: application.dateOfBirth } });
    if (existingStudent) throw new Error("A matching student record already exists");
    const sequence = await tx.student.count();
    const admissionNumber = `NGA26${String(sequence + 1).padStart(4, "0")}`;
    const safeStem = application.applicantName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
    const studentUsername = `${safeStem}${sequence + 1}`;
    const demoHash = await bcrypt.hash(process.env.DEMO_PASSWORD ?? "GroveDemo@1126", 12);
    const studentRole = await tx.role.findUniqueOrThrow({ where: { code: "STUDENT" } });
    const parentRole = await tx.role.findUniqueOrThrow({ where: { code: "PARENT" } });
    const studentUser = await tx.user.create({ data: { username: studentUsername, email: `student.${admissionNumber.toLowerCase()}@nanjilgrove.demo`, passwordHash: demoHash, name: application.applicantName, roles: { create: { roleId: studentRole.id } } } });
    const names = application.applicantName.trim().split(/\s+/);
    const student = await tx.student.create({ data: { userId: studentUser.id, admissionNumber, firstName: names[0], lastName: names.slice(1).join(" ") || "Student", dateOfBirth: application.dateOfBirth, gender: application.gender, admissionDate: new Date(), address: application.address, email: studentUser.email } });
    let guardian = await tx.guardian.findFirst({ where: { OR: [{ email: application.email }, { phone: application.mobile }] } });
    if (!guardian) {
      const guardianUsername = `guardian${sequence + 1}`;
      const guardianUser = await tx.user.create({ data: { username: guardianUsername, email: application.email, passwordHash: demoHash, name: application.guardianName, roles: { create: { roleId: parentRole.id } } } });
      guardian = await tx.guardian.create({ data: { userId: guardianUser.id, name: application.guardianName, relationship: application.relationship, phone: application.mobile, email: application.email, address: application.address } });
    }
    await tx.studentGuardian.create({ data: { studentId: student.id, guardianId: guardian.id, isPrimary: true } });
    const section = application.class.sections[0]; if (!section) throw new Error("The selected class has no section");
    const rollNumber = await tx.enrolment.count({ where: { sectionId: section.id } }) + 1;
    await tx.enrolment.create({ data: { studentId: student.id, academicYearId: application.academicYearId, sectionId: section.id, rollNumber } });
    const fee = await tx.feeStructure.findFirst({ where: { academicYearId: application.academicYearId, classId: application.classId } });
    if (fee) await tx.invoice.create({ data: { number: `INV-26-${String(sequence + 1).padStart(5, "0")}`, studentId: student.id, issueDate: new Date(), dueDate: fee.dueDate, totalPaise: fee.amountPaise, items: { create: { description: fee.name, amountPaise: fee.amountPaise } } } });
    await tx.admission.update({ where: { id }, data: { status: "ENROLLED", decisionNotes: `Enrolled as ${admissionNumber}; ${application.class.name} Section ${section.name}` } });
    await tx.auditLog.create({ data: { userId: operator.id, action: "ADMISSION_ENROLLED", entityType: "Admission", entityId: id, detail: admissionNumber } });
  });
  revalidatePath("/portal/admissions"); revalidatePath("/portal/students"); revalidatePath("/portal/finance");
}
