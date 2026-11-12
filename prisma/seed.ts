import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, AttendanceStatus, PaymentMethod, PublishStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const db = new PrismaClient({ adapter });
const d = (value: string) => new Date(`${value}T00:00:00+05:30`);
const firstNames = ["Aadhira", "Aarav", "Abinaya", "Adhvik", "Akash", "Amritha", "Ananya", "Arjun", "Ashwin", "Deepika", "Dhanya", "Dinesh", "Harini", "Ishaan", "Janani", "Karthik", "Kavin", "Keerthana", "Madhav", "Meera", "Naveen", "Nila", "Pranav", "Rithika", "Roshan", "Sahana", "Sanjay", "Shreya", "Surya", "Varsha"];
const lastNames = ["Antony", "Arul", "Balan", "Christopher", "Das", "Devan", "Fernando", "Iyer", "John", "Kannan", "Kumar", "Mani", "Nadar", "Paul", "Pillai", "Raj", "Ravi", "Selvan", "Thomas", "Xavier"];
const roles = [
  ["ADMIN", "School Administrator"], ["PRINCIPAL", "Principal"], ["VICE_PRINCIPAL", "Vice Principal"],
  ["ADMISSIONS", "Admissions Officer"], ["ACADEMIC", "Academic Coordinator"], ["OFFICE", "Office Staff"],
  ["HR", "HR Manager"], ["ACCOUNTANT", "Accountant"], ["CLASS_TEACHER", "Class Teacher"],
  ["TEACHER", "Subject Teacher"], ["LIBRARIAN", "Librarian"], ["RECEPTION", "Receptionist"],
  ["TRANSPORT", "Transport Manager"], ["SUPPORT", "Support Staff"], ["STUDENT", "Student"],
  ["PARENT", "Parent/Guardian"], ["ALUMNI", "Alumni"]
] as const;

async function main() {
  if (await db.school.count()) {
    console.log("Database already contains the Nanjil Grove Academy demonstration seed.");
    return;
  }
  const passwordHash = await bcrypt.hash(process.env.DEMO_PASSWORD ?? "GroveDemo@1126", 12);
  const school = await db.school.create({ data: {
    name: "Nanjil Grove Academy", type: "Co-educational Higher Secondary School", tagline: "Inspiring Minds, Shaping Futures.",
    motto: "Learn. Lead. Excel.", email: "office@nanjilgrove.demo", phone: "+91 4652 290 260",
    address: "18 Grove Road, Demonstration Campus", city: "Nagercoil", state: "Tamil Nadu", postalCode: "629001",
    demoNotice: "Nanjil Grove Academy is a fictional demonstration institution created by Infinex Loop."
  }});
  const permissions = ["dashboard.view", "students.manage", "admissions.manage", "academics.manage", "attendance.manage", "exams.manage", "finance.manage", "hr.manage", "library.manage", "website.manage", "users.manage", "reports.view", "own.view"];
  for (const code of permissions) await db.permission.create({ data: { code, description: code.replaceAll(".", " ") } });
  const roleMap = new Map<string, string>();
  for (const [code, name] of roles) {
    const role = await db.role.create({ data: { code, name, description: `${name} access` } });
    roleMap.set(code, role.id);
  }
  const allPermissions = await db.permission.findMany();
  const broad = ["ADMIN", "PRINCIPAL"];
  for (const code of broad) for (const permission of allPermissions) await db.rolePermission.create({ data: { roleId: roleMap.get(code)!, permissionId: permission.id } });
  const rolePermissions: Record<string, string[]> = {
    ADMISSIONS: ["dashboard.view", "admissions.manage", "students.manage"], TEACHER: ["dashboard.view", "attendance.manage", "academics.manage", "exams.manage"],
    CLASS_TEACHER: ["dashboard.view", "attendance.manage", "academics.manage", "exams.manage"], ACCOUNTANT: ["dashboard.view", "finance.manage", "reports.view"],
    HR: ["dashboard.view", "hr.manage", "reports.view"], LIBRARIAN: ["dashboard.view", "library.manage"],
    STUDENT: ["dashboard.view", "own.view"], PARENT: ["dashboard.view", "own.view"], ALUMNI: ["dashboard.view", "own.view"]
  };
  for (const [code, list] of Object.entries(rolePermissions)) for (const permission of allPermissions.filter(p => list.includes(p.code))) await db.rolePermission.create({ data: { roleId: roleMap.get(code)!, permissionId: permission.id } });
  const years = [];
  for (const y of [{ name: "2025–2026", start: "2025-06-02", end: "2026-04-24", current: false }, { name: "2026–2027", start: "2026-06-01", end: "2027-04-23", current: true }]) {
    years.push(await db.academicYear.create({ data: { schoolId: school.id, name: y.name, startDate: d(y.start), endDate: d(y.end), isCurrent: y.current } }));
  }
  const currentYear = years[1];
  const terms = [];
  for (const t of [{ name: "Term I", start: "2026-06-01", end: "2026-09-18" }, { name: "Term II", start: "2026-09-28", end: "2026-12-23" }, { name: "Term III", start: "2027-01-04", end: "2027-04-23" }]) terms.push(await db.term.create({ data: { academicYearId: currentYear.id, name: t.name, startDate: d(t.start), endDate: d(t.end) } }));
  const departments = new Map<string, string>();
  for (const name of ["Administration", "Languages", "Mathematics", "Science", "Social Science", "Computer Science", "Commerce", "Physical Education", "Arts", "Accounts"]) departments.set(name, (await db.department.create({ data: { name } })).id);
  const subjectSpecs = [["ENG", "English", "Languages"], ["TAM", "Tamil", "Languages"], ["MAT", "Mathematics", "Mathematics"], ["SCI", "Science", "Science"], ["SOC", "Social Science", "Social Science"], ["CSC", "Computer Science", "Computer Science"], ["PHY", "Physics", "Science"], ["CHE", "Chemistry", "Science"], ["BIO", "Biology", "Science"], ["COM", "Commerce", "Commerce"], ["ECO", "Economics", "Commerce"], ["PE", "Physical Education", "Physical Education"]];
  const subjects = [];
  for (const [code, name, dept] of subjectSpecs) subjects.push(await db.subject.create({ data: { code, name, departmentId: departments.get(dept) } }));
  const gradeNames = ["LKG", "UKG", "Standard I", "Standard II", "Standard III", "Standard IV", "Standard V", "Standard VI", "Standard VII", "Standard VIII", "Standard IX", "Standard X", "Standard XI", "Standard XII"];
  const classRows: { id: string; name: string; sectionIds: string[] }[] = [];
  for (let i = 0; i < gradeNames.length; i++) {
    const cls = await db.schoolClass.create({ data: { academicYearId: currentYear.id, name: gradeNames[i], gradeOrder: i + 1, capacity: i < 2 ? 60 : 90 } });
    const sectionIds = [];
    for (const sectionName of (i < 2 ? ["A", "B"] : ["A", "B", "C"])) sectionIds.push((await db.section.create({ data: { classId: cls.id, name: sectionName, room: `${i + 1}${sectionName}` } })).id);
    const selectedSubjects = i < 2 ? subjects.slice(0, 3) : i < 10 ? subjects.slice(0, 6) : subjects.filter(s => ["ENG", "TAM", "MAT", "SCI", "SOC", "CSC", "PE", "PHY", "CHE", "BIO", "COM", "ECO"].includes(s.code));
    for (const subject of selectedSubjects) await db.classSubject.create({ data: { classId: cls.id, subjectId: subject.id } });
    classRows.push({ id: cls.id, name: cls.name, sectionIds });
    await db.feeStructure.create({ data: { academicYearId: currentYear.id, classId: cls.id, name: "Annual composite fee", amountPaise: (i < 2 ? 28000 : 32000 + i * 1800) * 100, dueDate: d("2026-06-15") } });
  }
  const demoUsers: Record<string, { username: string; name: string; role: string; designation: string; dept: string }> = {
    admin: { username: "admin", name: "Lakshmi Narayanan", role: "ADMIN", designation: "School Administrator", dept: "Administration" },
    principal: { username: "principal", name: "Dr. Meenakshi Raman", role: "PRINCIPAL", designation: "Principal", dept: "Administration" },
    admissions: { username: "admissions", name: "Priya Nelson", role: "ADMISSIONS", designation: "Admissions Officer", dept: "Administration" },
    teacher: { username: "teacher", name: "Arun Prakash", role: "TEACHER", designation: "Senior Mathematics Teacher", dept: "Mathematics" },
    accountant: { username: "accountant", name: "Benny Thomas", role: "ACCOUNTANT", designation: "Senior Accountant", dept: "Accounts" },
    hr: { username: "hr", name: "Nirmala Devi", role: "HR", designation: "HR Manager", dept: "Administration" },
    librarian: { username: "librarian", name: "Roseline Mary", role: "LIBRARIAN", designation: "Librarian", dept: "Administration" }
  };
  const employees = [];
  let employeeNo = 1;
  for (const spec of Object.values(demoUsers)) {
    const user = await db.user.create({ data: { username: spec.username, email: `${spec.username}@nanjilgrove.demo`, passwordHash, name: spec.name, roles: { create: { roleId: roleMap.get(spec.role)! } } } });
    employees.push(await db.employee.create({ data: { userId: user.id, employeeNumber: `NGA-E${String(employeeNo++).padStart(3, "0")}`, name: spec.name, designation: spec.designation, departmentId: departments.get(spec.dept), employmentType: "PERMANENT", joiningDate: d("2020-06-01"), qualification: spec.role === "PRINCIPAL" ? "M.Sc., M.Ed., Ph.D." : "Postgraduate with professional qualification", email: user.email, phone: `+91 98765 ${String(10000 + employeeNo).slice(-5)}`, salaryPaise: (42000 + employeeNo * 2500) * 100, isPublic: ["PRINCIPAL", "TEACHER"].includes(spec.role), bio: `${spec.name} supports inclusive, evidence-led learning at Nanjil Grove Academy.` } }));
  }
  for (let i = employees.length; i < 44; i++) {
    const name = `${firstNames[i % firstNames.length]} ${lastNames[(i * 3) % lastNames.length]}`;
    const deptNames = ["Languages", "Mathematics", "Science", "Social Science", "Computer Science", "Commerce", "Physical Education", "Arts"];
    const dept = deptNames[i % deptNames.length];
    const user = await db.user.create({ data: { username: `staff${i + 1}`, email: `staff${i + 1}@nanjilgrove.demo`, passwordHash, name, roles: { create: { roleId: roleMap.get("TEACHER")! } } } });
    employees.push(await db.employee.create({ data: { userId: user.id, employeeNumber: `NGA-E${String(employeeNo++).padStart(3, "0")}`, name, designation: i % 5 === 0 ? "Primary Teacher" : `${dept} Teacher`, departmentId: departments.get(dept), employmentType: i % 7 === 0 ? "CONTRACT" : "PERMANENT", joiningDate: d(`20${16 + (i % 8)}-06-01`), qualification: i % 3 === 0 ? "M.Sc., B.Ed." : "M.A., B.Ed.", email: user.email, phone: `+91 98${String(76000000 + i)}`, salaryPaise: (32000 + i * 900) * 100, isPublic: i < 18, bio: `A committed educator in ${dept} with a focus on practical, student-centred learning.` } }));
  }
  const teacher = employees.find(e => e.name === "Arun Prakash")!;
  const math = subjects.find(s => s.code === "MAT")!;
  for (const sectionId of classRows[8].sectionIds.slice(0, 2)) await db.teacherAssignment.create({ data: { employeeId: teacher.id, sectionId, subjectId: math.id, isClassTeacher: sectionId === classRows[8].sectionIds[0] } });
  const students = [];
  const guardians = [];
  for (let i = 0; i < 294; i++) {
    const gradeIndex = i % gradeNames.length;
    const cls = classRows[gradeIndex];
    const sectionId = cls.sectionIds[Math.floor(i / gradeNames.length) % cls.sectionIds.length];
    const name = `${firstNames[i % firstNames.length]} ${lastNames[(i * 7) % lastNames.length]}`;
    const studentUser = i === 0 ? await db.user.create({ data: { username: "student", email: "student@nanjilgrove.demo", passwordHash, name, roles: { create: { roleId: roleMap.get("STUDENT")! } } } }) : null;
    const student = await db.student.create({ data: { userId: studentUser?.id, admissionNumber: `NGA26${String(i + 1).padStart(4, "0")}`, firstName: name.split(" ")[0], lastName: name.split(" ")[1], dateOfBirth: d(`${2010 + Math.max(0, 12 - gradeIndex)}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 25) + 1).padStart(2, "0")}`), gender: i % 2 === 0 ? "Female" : "Male", admissionDate: d("2026-06-01"), address: `${20 + i}, ${["Court Road", "Vadasery", "Ramavarmapuram", "Kottar", "Chettikulam"][i % 5]}, Nagercoil`, house: ["Marutham", "Mullai", "Kurinji", "Neithal"][i % 4], bloodGroup: ["O+", "A+", "B+", "AB+"][i % 4] } });
    students.push(student);
    const guardianUser = i === 0 ? await db.user.create({ data: { username: "parent", email: "parent@nanjilgrove.demo", passwordHash, name: "Samuel Thomas", roles: { create: { roleId: roleMap.get("PARENT")! } } } }) : null;
    if (i % 2 === 0 || i === 0) {
      const guardian = await db.guardian.create({ data: { userId: guardianUser?.id, name: i === 0 ? "Samuel Thomas" : `${firstNames[(i + 5) % firstNames.length]} ${lastNames[(i * 7) % lastNames.length]}`, relationship: i % 3 === 0 ? "Mother" : "Father", phone: `+91 97${String(65000000 + i)}`, email: i === 0 ? "parent@nanjilgrove.demo" : `guardian${i}@example.demo`, occupation: ["Engineer", "Teacher", "Business owner", "Nurse", "Government service"][i % 5], address: student.address } });
      guardians.push(guardian);
      await db.studentGuardian.create({ data: { studentId: student.id, guardianId: guardian.id, isPrimary: true } });
      if (i === 0) {
        const sibling = await db.student.findFirst({ where: { admissionNumber: "NGA260002" } });
        if (sibling) await db.studentGuardian.create({ data: { studentId: sibling.id, guardianId: guardian.id } });
      }
    }
    const sectionStudentCount = await db.enrolment.count({ where: { sectionId } });
    await db.enrolment.create({ data: { studentId: student.id, academicYearId: currentYear.id, sectionId, rollNumber: sectionStudentCount + 1 } });
    for (let day = 0; day < 24; day++) await db.studentAttendance.create({ data: { studentId: student.id, date: d(`2026-10-${String(day + 1).padStart(2, "0")}`), status: day % 17 === i % 17 ? AttendanceStatus.ABSENT : day % 13 === i % 13 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT } });
    const total = (32000 + gradeIndex * 1800) * 100;
    const invoice = await db.invoice.create({ data: { number: `INV-26-${String(i + 1).padStart(5, "0")}`, studentId: student.id, issueDate: d("2026-06-01"), dueDate: d("2026-06-15"), totalPaise: total, status: i % 4 === 0 ? "DUE" : i % 4 === 1 ? "PARTIAL" : "PAID", items: { create: [{ description: "Annual tuition and academic fee", amountPaise: total }] } } });
    if (i % 4 !== 0) await db.payment.create({ data: { receiptNo: `RCP-26-${String(i + 1).padStart(5, "0")}`, invoiceId: invoice.id, amountPaise: i % 4 === 1 ? Math.round(total / 2) : total, method: [PaymentMethod.CASH, PaymentMethod.UPI, PaymentMethod.BANK_TRANSFER][i % 3] } });
  }
  const student0 = students[0];
  const parentGuardian = await db.guardian.findFirst({ where: { userId: { not: null } } });
  if (parentGuardian) {
    await db.studentGuardian.upsert({ where: { studentId_guardianId: { studentId: students[1].id, guardianId: parentGuardian.id } }, update: {}, create: { studentId: students[1].id, guardianId: parentGuardian.id } });
    await db.studentLeave.create({ data: { studentId: student0.id, guardianId: parentGuardian.id, fromDate: d("2026-11-16"), toDate: d("2026-11-17"), reason: "Family function", status: "PENDING" } });
  }
  for (let day = 0; day < 22; day++) for (const employee of employees) await db.staffAttendance.create({ data: { employeeId: employee.id, date: d(`2026-10-${String(day + 1).padStart(2, "0")}`), status: day % 19 === employees.indexOf(employee) % 19 ? AttendanceStatus.LEAVE : AttendanceStatus.PRESENT } });
  for (let i = 0; i < employees.length; i++) await db.payroll.create({ data: { employeeId: employees[i].id, month: 10, year: 2026, grossPaise: employees[i].salaryPaise, deductionPaise: 180000, netPaise: employees[i].salaryPaise - 180000, status: "PAID" } });
  const exam = await db.exam.create({ data: { academicYearId: currentYear.id, termId: terms[0].id, name: "Quarterly Examination", type: "TERM", published: true } });
  for (const subject of subjects.slice(0, 6)) {
    const examSubject = await db.examSubject.create({ data: { examId: exam.id, subjectId: subject.id, examDate: d("2026-09-10"), maxMarks: 100, passMarks: 35 } });
    for (const student of students.slice(0, 70)) { const score = 48 + ((students.indexOf(student) * 7 + subjects.indexOf(subject) * 9) % 50); await db.mark.create({ data: { examSubjectId: examSubject.id, studentId: student.id, score, grade: score >= 90 ? "A1" : score >= 80 ? "A2" : score >= 70 ? "B1" : score >= 60 ? "B2" : "C" } }); }
  }
  const sampleSection = classRows[8].sectionIds[0];
  const assignment = await db.assignment.create({ data: { sectionId: sampleSection, subjectId: math.id, title: "Linear equations in daily life", description: "Solve the six application problems and explain one solution in your own words.", dueAt: d("2026-11-18"), maxMarks: 20 } });
  await db.submission.create({ data: { assignmentId: assignment.id, studentId: student0.id, content: "Completed solution notes submitted for review.", status: "SUBMITTED" } });
  for (let i = 0; i < 9; i++) await db.admission.create({ data: { reference: `NGA-APP-2026-${String(i + 101).padStart(4, "0")}`, verificationCode: String(4100 + i), applicantName: `${firstNames[i + 10]} ${lastNames[i + 3]}`, dateOfBirth: d(`20${14 + (i % 5)}-0${(i % 8) + 1}-12`), gender: i % 2 ? "Male" : "Female", classId: classRows[(i + 3) % classRows.length].id, academicYearId: currentYear.id, previousSchool: "A local matriculation school", guardianName: `${firstNames[i + 3]} ${lastNames[i + 3]}`, relationship: i % 2 ? "Father" : "Mother", mobile: `+91 96${String(54000000 + i)}`, email: `applicant${i + 1}@example.demo`, address: `Nagercoil, Kanyakumari District`, previousAcademics: "Consistent academic progress", notes: i % 3 === 0 ? "Transport information requested" : null, status: ["SUBMITTED", "DOCUMENT_REVIEW", "ASSESSMENT", "INTERVIEW", "APPROVED"][i % 5] as never } });
  const bookSpecs = [["9780143332497", "The Blue Umbrella", "Ruskin Bond", "Fiction"], ["9788173711466", "A Brief History of Time", "Stephen Hawking", "Science"], ["9789351039600", "Wings of Fire", "A. P. J. Abdul Kalam", "Biography"], ["9780143442295", "Malgudi Days", "R. K. Narayan", "Fiction"], ["9780199479362", "School Atlas", "Oxford", "Reference"]];
  for (let i = 0; i < bookSpecs.length; i++) { const [isbn, title, author, category] = bookSpecs[i]; const book = await db.libraryBook.create({ data: { isbn, title, author, category, publisher: "Demo Educational Press", shelf: `${category[0]}-${i + 1}` } }); for (let c = 1; c <= 8; c++) await db.bookCopy.create({ data: { bookId: book.id, accession: `NGA-LIB-${i + 1}-${c}`, condition: "GOOD" } }); }
  const firstCopy = await db.bookCopy.findFirst();
  if (firstCopy) { await db.bookCopy.update({ where: { id: firstCopy.id }, data: { status: "ISSUED" } }); await db.libraryLoan.create({ data: { copyId: firstCopy.id, studentId: student0.id, issuedAt: d("2026-10-20"), dueAt: d("2026-11-03"), finePaise: 4500 } }); }
  const eventData = [["Science & Innovation Expo", "Student teams demonstrate practical science and computing projects.", "Academic", "2026-11-21", "Innovation Hall"], ["Inter-house Athletics", "Track, field and team events for all four houses.", "Sports", "2026-11-28", "School Ground"], ["Founders Day Assembly", "A school-wide celebration of learning, service and community.", "School", "2026-12-04", "Auditorium"]];
  for (const [title, description, category, date, location] of eventData) await db.event.create({ data: { title, description, category, startsAt: d(date), endsAt: d(date), location, isPublic: true } });
  for (const [title, description, category] of [["State-level Young Scientist recognition", "A student water-quality project earned a jury commendation.", "Academic"], ["District volleyball runners-up", "The senior girls team reached the district final.", "Sports"], ["Tamil literary festival prize", "Students received awards in oratory and creative writing.", "Cultural"]]) await db.achievement.create({ data: { title, description, category, awardedAt: d("2026-10-18"), isPublic: true } });
  const facilityData: Array<[string, string, string, string, number]> = [["Dr. A. P. J. Abdul Kalam Science Centre", "Laboratory", "Integrated physics, chemistry and biology learning spaces.", "Academic Block", 96], ["Nanjil Knowledge Commons", "Library", "A reading and research space with print and digital resources.", "Main Block", 120], ["Grove Sports Arena", "Sports", "Outdoor courts, athletics field and structured sports coaching.", "South Campus", 400], ["Digital Learning Studios", "Computer Lab", "Networked workstations for computing, media and design.", "Technology Block", 80]];
  for (const [name, category, description, location, capacity] of facilityData) await db.facility.create({ data: { name, category, description, location, capacity, isPublic: true } });
  for (let i = 0; i < 18; i++) { const user = i === 0 ? await db.user.create({ data: { username: "alumni", email: "alumni@nanjilgrove.demo", passwordHash, name: "Joel Raj", roles: { create: { roleId: roleMap.get("ALUMNI")! } } } }) : null; await db.alumni.create({ data: { userId: user?.id, alumniNumber: `NGA-AL-${String(i + 1).padStart(4, "0")}`, name: i === 0 ? "Joel Raj" : `${firstNames[(i + 7) % firstNames.length]} ${lastNames[(i + 4) % lastNames.length]}`, graduationYear: 2008 + i, lastClass: "Standard XII", city: ["Nagercoil", "Chennai", "Bengaluru", "Coimbatore"][i % 4], higherEducation: "Undergraduate degree", occupation: ["Software Engineer", "Educator", "Architect", "Healthcare Professional"][i % 4], bio: "Proud member of the Nanjil Grove alumni community.", publicProfile: i % 2 === 0, verified: true } }); }
  for (const [title, body, audience] of [["Quarterly report cards published", "Students and guardians can view the published report card in their portal.", "ALL"], ["Science Expo registration", "Class teachers are accepting team registrations until 16 November.", "STUDENT"], ["Fee counter hours", "The accounts office is open from 9:00 AM to 3:30 PM on working days.", "PARENT"]]) await db.announcement.create({ data: { title, body, audience, status: PublishStatus.PUBLISHED, publishedAt: new Date() } });
  const websiteContent = [["home.hero", "A place to learn deeply and lead kindly", "From a child’s first classroom to higher-secondary pathways, Nanjil Grove Academy connects thoughtful teaching, strong relationships and purposeful opportunity."], ["about.introduction", "Rooted in Nanjil. Ready for tomorrow.", "Nanjil Grove Academy is a fictional demonstration school created to show how a connected school community can learn and operate."], ["about.principal", "A welcome from our Principal", "Education is at its best when curiosity is protected, effort is noticed and every learner knows they belong."], ["academics.introduction", "Learning with clarity and purpose", "Our Tamil Nadu State Board-inspired programme balances foundational fluency, subject depth, practical exploration and student support."], ["admissions.introduction", "Begin the admission journey", "Applications for the 2026–2027 demonstration cycle can be submitted online and tracked with a private reference code."]];
  for (let i = 0; i < websiteContent.length; i++) { const [key, title, body] = websiteContent[i]; await db.websiteContent.create({ data: { schoolId: school.id, key, title, body, sortOrder: i } }); }
  const transportData: Array<[string, string, string, string, string, number]> = [["R01", "Nagercoil North", "TN 74 D 2101", "M. Selvam", "Vadasery • Parvathipuram • Academy", 1800], ["R02", "Kottar & Suchindram", "TN 74 D 2102", "J. Antony", "Kottar • Suchindram • Academy", 2200], ["R03", "Asaripallam", "TN 74 D 2103", "R. Mani", "Asaripallam • Nesamony Nagar • Academy", 1900]];
  for (const [code, name, vehicleNo, driverName, stops, fee] of transportData) await db.transportRoute.create({ data: { code, name, vehicleNo, driverName, stops, feePaise: fee * 100 } });
  for (const employee of employees.slice(0, 8)) { const user = employee.userId ? await db.user.findUnique({ where: { id: employee.userId } }) : null; if (user) await db.notification.create({ data: { userId: user.id, title: "Welcome to the 2026–2027 workspace", body: "Your role-aware dashboard is ready with demonstration records.", href: "/portal" } }); }
  await db.expense.createMany({ data: [{ category: "Utilities", description: "Campus electricity and water", amountPaise: 2860000, expenseDate: d("2026-10-10") }, { category: "Academic", description: "Laboratory consumables", amountPaise: 1745000, expenseDate: d("2026-10-18") }, { category: "Maintenance", description: "Classroom maintenance", amountPaise: 980000, expenseDate: d("2026-10-22") }] });
  console.log(`Seeded ${students.length} students, ${employees.length} employees and ${guardians.length} guardians.`);
  console.log("Demo logins: admin, principal, admissions, teacher, accountant, hr, librarian, student, parent, alumni");
  console.log("Demo credentials are listed on /demo-access.");
}

main().finally(() => db.$disconnect());
