import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'node:dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);
import User from '../models/User';
import EmployeeRole from '../models/EmployeeRole';
import BrewMethod from '../models/BrewMethod';
import Recipe from '../models/Recipe';
import Course from '../models/course.model';
import Lesson from '../models/lesson.model';
import CourseEnrollment from '../models/course-enrollment.model';
import Playbook from '../models/playbook.model';
import ChecklistTemplate from '../models/checklist-template.model';
import ExclusiveContent from '../models/exclusive-content.model';
import StoreRecipe from '../models/store-recipe.model';

dotenv.config();

const seed = async (): Promise<void> => {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('MongoDB connected');

  // Clear seeded collections (not Users — preserve owner + any manual additions)
  await BrewMethod.deleteMany({});
  await Recipe.deleteMany({});
  await ExclusiveContent.deleteMany({});
  await StoreRecipe.deleteMany({});
  console.log('Cleared BrewMethod, Recipe, ExclusiveContent, and StoreRecipe collections');

  // Create admin user only if none exists
  let admin = await User.findOne({ role: 'owner' });
  if (!admin) {
    admin = await User.create({
      name: 'JavaRista Admin',
      email: 'admin@javarista.com',
      password: 'Admin@123',
      role: 'owner',
      isVerified: true,
    });
    console.log('Admin user created:', admin.email);
  } else {
    console.log('Admin user already exists:', admin.email);
  }

  // ── Employee Roles ─────────────────────────────────────────────────────────
  // Remove all org-wide (storeId-less) seeded roles then recreate so re-runs are idempotent.
  await EmployeeRole.deleteMany({ storeId: { $exists: false } });
  console.log('Cleared org-wide EmployeeRole documents');

  const employeeRoleDefs = [
    {
      name: 'Unit Manager',
      description: 'Full store operations access — equivalent to store_manager tier.',
      permissions: [
        'checklist.view', 'checklist.complete', 'checklist.approve',
        'recipe.view', 'recipe.log_prep',
        'playbook.view', 'playbook.acknowledge',
        'performance.view_own',
        'training.view', 'training.enroll', 'training.manage',
        'cash.manage',
        'inventory.view', 'inventory.manage',
        'store_ops.view',
        'org.view',
      ],
    },
    {
      name: 'Shift Leader',
      description: 'Opens/closes, manages cash, oversees floor during shift.',
      permissions: [
        'checklist.view', 'checklist.complete', 'checklist.approve',
        'recipe.view', 'recipe.log_prep',
        'playbook.view', 'playbook.acknowledge',
        'performance.view_own',
        'training.view', 'training.enroll',
        'cash.manage',
        'inventory.view',
        'store_ops.view',
      ],
    },
    {
      name: 'Cash & Service Supervisor',
      description: 'Owns cash drawer, POS, and customer service resolution.',
      permissions: [
        'checklist.view', 'checklist.complete',
        'playbook.view', 'playbook.acknowledge',
        'performance.view_own',
        'training.view', 'training.enroll',
        'cash.manage',
        'store_ops.view',
      ],
    },
    {
      name: 'Lead Barista',
      description: 'Experienced barista who trains others and maintains quality standards.',
      permissions: [
        'checklist.view', 'checklist.complete',
        'recipe.view', 'recipe.log_prep',
        'playbook.view', 'playbook.acknowledge',
        'performance.view_own',
        'training.view', 'training.enroll', 'training.manage',
        'store_ops.view',
      ],
    },
    {
      name: 'Barista',
      description: 'Core beverage preparation role.',
      permissions: [
        'checklist.view', 'checklist.complete',
        'recipe.view', 'recipe.log_prep',
        'playbook.view', 'playbook.acknowledge',
        'performance.view_own',
        'training.view', 'training.enroll',
        'store_ops.view',
      ],
    },
    {
      name: 'Cashier',
      description: 'Order taking, POS, and customer-facing transactions.',
      permissions: [
        'checklist.view', 'checklist.complete',
        'playbook.view', 'playbook.acknowledge',
        'performance.view_own',
        'training.view', 'training.enroll',
        'cash.manage',
        'store_ops.view',
      ],
    },
    {
      name: 'Runner',
      description: 'Order handoff, staging area, and expediting.',
      permissions: [
        'checklist.view', 'checklist.complete',
        'playbook.view', 'playbook.acknowledge',
        'performance.view_own',
        'training.view', 'training.enroll',
        'store_ops.view',
      ],
    },
    {
      name: 'Floor Host',
      description: 'Guest experience, seating, and lobby cleanliness.',
      permissions: [
        'checklist.view', 'checklist.complete',
        'playbook.view', 'playbook.acknowledge',
        'performance.view_own',
        'training.view', 'training.enroll',
        'store_ops.view',
      ],
    },
    {
      name: 'Cook',
      description: 'Back-of-house food and specialty beverage preparation.',
      permissions: [
        'checklist.view', 'checklist.complete',
        'recipe.view', 'recipe.log_prep',
        'playbook.view', 'playbook.acknowledge',
        'performance.view_own',
        'training.view', 'training.enroll',
        'store_ops.view',
      ],
    },
    {
      name: 'Kitchen Assistant',
      description: 'Supports cook with prep, mise en place, and cleaning.',
      permissions: [
        'checklist.view', 'checklist.complete',
        'recipe.view',
        'playbook.view', 'playbook.acknowledge',
        'performance.view_own',
        'training.view', 'training.enroll',
        'store_ops.view',
      ],
    },
    {
      name: 'Cleaning Associate',
      description: 'Sanitation, deep-clean checklists, and waste management.',
      permissions: [
        'checklist.view', 'checklist.complete',
        'playbook.view', 'playbook.acknowledge',
        'performance.view_own',
        'training.view', 'training.enroll',
        'store_ops.view',
      ],
    },
    {
      name: 'Delivery Driver',
      description: 'Third-party and in-house delivery fulfilment.',
      permissions: [
        'checklist.view', 'checklist.complete',
        'playbook.view', 'playbook.acknowledge',
        'performance.view_own',
        'training.view', 'training.enroll',
        'store_ops.view',
      ],
    },
    {
      name: 'Inventory Coordinator',
      description: 'Stock counts, par management, and supplier receiving.',
      permissions: [
        'checklist.view', 'checklist.complete',
        'playbook.view', 'playbook.acknowledge',
        'performance.view_own',
        'training.view', 'training.enroll',
        'inventory.view', 'inventory.manage',
        'store_ops.view',
      ],
    },
    {
      name: 'Store Trainer',
      description: 'Onboards new hires, facilitates certifications.',
      permissions: [
        'checklist.view', 'checklist.complete',
        'recipe.view', 'recipe.log_prep',
        'playbook.view', 'playbook.acknowledge',
        'performance.view_own',
        'training.view', 'training.enroll', 'training.manage',
        'store_ops.view',
        'org.view',
      ],
    },
    {
      name: 'Customer Experience Lead',
      description: 'Owns guest-satisfaction metrics and complaint resolution.',
      permissions: [
        'checklist.view', 'checklist.complete',
        'playbook.view', 'playbook.acknowledge',
        'performance.view_own',
        'training.view', 'training.enroll',
        'store_ops.view',
        'org.view',
      ],
    },
  ];

  const seededRoles = await EmployeeRole.insertMany(
    employeeRoleDefs.map((r) => ({ ...r, createdBy: admin._id }))
  );
  console.log(`  Employee roles seeded: ${seededRoles.length}`);

  const roleByName = new Map(seededRoles.map((r) => [r.name, r._id]));

  // ── Test Users ─────────────────────────────────────────────────────────────
  // Upsert a representative test user for each employee-tier role.
  const testUsers = [
    { name: 'Sam Manager',    email: 'store.manager@javarista.com',   role: 'store_manager',      employeeRole: 'Unit Manager' },
    { name: 'Alex Assistant', email: 'asst.manager@javarista.com',    role: 'assistant_manager',  employeeRole: 'Shift Leader' },
    { name: 'Jordan Shift',   email: 'shift.sup@javarista.com',       role: 'shift_supervisor',   employeeRole: 'Shift Leader' },
    { name: 'Casey Barista',  email: 'barista@javarista.com',         role: 'barista',            employeeRole: 'Barista' },
    { name: 'Taylor Trainee', email: 'trainee@javarista.com',         role: 'trainee',            employeeRole: 'Barista' },
    { name: 'Riley Cash',     email: 'cashier@javarista.com',         role: 'barista',            employeeRole: 'Cashier' },
    { name: 'Morgan Lead',    email: 'lead.barista@javarista.com',    role: 'shift_supervisor',   employeeRole: 'Lead Barista' },
    { name: 'Drew Trainer',   email: 'trainer@javarista.com',         role: 'shift_supervisor',   employeeRole: 'Store Trainer' },
    { name: 'Pat Inventory',  email: 'inventory@javarista.com',       role: 'barista',            employeeRole: 'Inventory Coordinator' },
  ] as const;

  for (const u of testUsers) {
    const exists = await User.findOne({ email: u.email });
    if (!exists) {
      await User.create({
        name: u.name,
        email: u.email,
        password: 'Test@1234',
        role: u.role,
        isVerified: true,
        employeeRoleId: roleByName.get(u.employeeRole),
      });
    } else if (!exists.employeeRoleId) {
      await User.findByIdAndUpdate(exists._id, {
        employeeRoleId: roleByName.get(u.employeeRole),
      });
    }
  }
  console.log(`  Test users upserted: ${testUsers.length}`);

  // Insert brew methods
  const brewMethodDocs = await BrewMethod.insertMany([
    {
      name: 'V60 Pour Over',
      slug: 'v60-pour-over',
      category: 'coffee',
      difficulty: 'easy',
      ratio: '16:1',
      brewTime: 210,
      isActive: true,
      createdBy: admin._id,
    },
    {
      name: 'AeroPress',
      slug: 'aeropress',
      category: 'coffee',
      difficulty: 'easy',
      ratio: '15:1',
      brewTime: 120,
      isActive: true,
      createdBy: admin._id,
    },
    {
      name: 'Chemex',
      slug: 'chemex',
      category: 'coffee',
      difficulty: 'medium',
      ratio: '16:1',
      brewTime: 300,
      isActive: true,
      createdBy: admin._id,
    },
    {
      name: 'French Press',
      slug: 'french-press',
      category: 'coffee',
      difficulty: 'easy',
      ratio: '15:1',
      brewTime: 240,
      isActive: true,
      createdBy: admin._id,
    },
    {
      name: 'Moka Pot',
      slug: 'moka-pot',
      category: 'coffee',
      difficulty: 'easy',
      ratio: '8:1',
      brewTime: 300,
      isActive: true,
      createdBy: admin._id,
    },
    {
      name: 'Espresso',
      slug: 'espresso',
      category: 'coffee',
      difficulty: 'hard',
      ratio: '2:1',
      brewTime: 30,
      isActive: true,
      createdBy: admin._id,
    },
    {
      name: 'Kalita Wave',
      slug: 'kalita-wave',
      category: 'coffee',
      difficulty: 'medium',
      ratio: '15:1',
      brewTime: 225,
      isActive: true,
      createdBy: admin._id,
    },
    // Matcha methods
    {
      name: 'Ceremonial Matcha',
      slug: 'ceremonial-matcha',
      category: 'matcha',
      difficulty: 'easy',
      requiredEquipment: ['matcha bowl', 'chasen whisk', 'chashaku scoop'],
      ratio: '1g per 60ml',
      brewTime: 180,
      isActive: true,
      createdBy: admin._id,
    },
    {
      name: 'Matcha Latte',
      slug: 'matcha-latte',
      category: 'matcha',
      difficulty: 'easy',
      requiredEquipment: ['milk frother', 'matcha sifter'],
      ratio: '2g per 180ml milk',
      brewTime: 240,
      isActive: true,
      createdBy: admin._id,
    },
    {
      name: 'Iced Matcha Latte',
      slug: 'iced-matcha-latte',
      category: 'matcha',
      difficulty: 'easy',
      requiredEquipment: ['shaker', 'matcha sifter'],
      ratio: '2g per 200ml',
      brewTime: 120,
      isActive: true,
      createdBy: admin._id,
    },
    {
      name: 'Signature Matcha',
      slug: 'signature-matcha',
      category: 'matcha',
      difficulty: 'medium',
      requiredEquipment: ['matcha bowl', 'chasen whisk'],
      ratio: 'varies',
      brewTime: 300,
      isActive: true,
      createdBy: admin._id,
    },
    // Hojicha methods
    {
      name: 'Hojicha Latte',
      slug: 'hojicha-latte',
      category: 'hojicha',
      difficulty: 'easy',
      requiredEquipment: ['milk frother', 'hojicha powder'],
      ratio: '2g per 180ml milk',
      brewTime: 240,
      isActive: true,
      createdBy: admin._id,
    },
    {
      name: 'Iced Hojicha',
      slug: 'iced-hojicha',
      category: 'hojicha',
      difficulty: 'easy',
      requiredEquipment: ['shaker', 'hojicha powder'],
      ratio: '2g per 200ml',
      brewTime: 120,
      isActive: true,
      createdBy: admin._id,
    },
    {
      name: 'Signature Hojicha',
      slug: 'signature-hojicha',
      category: 'hojicha',
      difficulty: 'intermediate',
      requiredEquipment: ['hojicha powder'],
      ratio: 'varies',
      brewTime: 300,
      isActive: true,
      createdBy: admin._id,
    },
  ]);
  console.log(`Inserted ${brewMethodDocs.length} brew methods`);

  const v60 = brewMethodDocs.find((m) => m.slug === 'v60-pour-over')!;
  const aeropress = brewMethodDocs.find((m) => m.slug === 'aeropress')!;
  const chemex = brewMethodDocs.find((m) => m.slug === 'chemex')!;

  // Insert recipes
  const recipes = await Recipe.insertMany([
    {
      name: 'Ethiopian Yirgacheffe V60',
      brewMethod: v60._id,
      author: admin._id,
      coffeeDose: 18,
      waterAmount: 300,
      ratio: '16:1',
      grindSize: 'Medium-fine',
      brewTime: 210,
      difficulty: 'easy',
      isPublished: true,
      isFeatured: true,
      steps: [
        { stepNumber: 1, title: 'Rinse & Preheat', description: 'Rinse the V60 filter with hot water to remove paper taste and preheat the vessel. Discard rinse water.', timerSeconds: 30, waterAmount: 0 },
        { stepNumber: 2, title: 'Bloom', description: 'Pour 40ml of water at 93°C in a spiral motion to saturate all grounds. Wait for bloom.', timerSeconds: 45, waterAmount: 40 },
        { stepNumber: 3, title: 'First Pour', description: 'Pour steadily to 150ml in a circular motion, keeping the water level consistent.', timerSeconds: 60, waterAmount: 110 },
        { stepNumber: 4, title: 'Final Pour', description: 'Continue pouring to 300ml total. Allow to drain completely.', timerSeconds: 75, waterAmount: 150 },
      ],
      tags: ['ethiopian', 'fruity', 'floral', 'v60'],
    },
    {
      name: 'Classic AeroPress',
      brewMethod: aeropress._id,
      author: admin._id,
      coffeeDose: 16,
      waterAmount: 240,
      ratio: '15:1',
      grindSize: 'Medium',
      brewTime: 120,
      difficulty: 'easy',
      isPublished: true,
      isFeatured: true,
      steps: [
        { stepNumber: 1, title: 'Setup & Bloom', description: 'Insert filter, rinse it, add 16g medium ground coffee. Pour 40ml water at 85°C and stir gently.', timerSeconds: 30, waterAmount: 40 },
        { stepNumber: 2, title: 'Fill & Steep', description: 'Add remaining 200ml water, stir once. Place plunger just above the water surface to create seal.', timerSeconds: 60, waterAmount: 200 },
        { stepNumber: 3, title: 'Press', description: 'Apply steady downward pressure over 20–30 seconds until you hear a hiss. Stop pressing at the hiss.', timerSeconds: 30, waterAmount: 0 },
      ],
      tags: ['classic', 'smooth', 'aeropress', 'beginner'],
    },
    {
      name: 'Chemex Morning Blend',
      brewMethod: chemex._id,
      author: admin._id,
      coffeeDose: 30,
      waterAmount: 480,
      ratio: '16:1',
      grindSize: 'Medium-coarse',
      brewTime: 300,
      difficulty: 'medium',
      isPublished: true,
      isFeatured: true,
      steps: [
        { stepNumber: 1, title: 'Rinse Filter', description: 'Fold the Chemex filter so three layers face the spout. Rinse thoroughly with hot water. Pour out rinse water.', timerSeconds: 30, waterAmount: 0 },
        { stepNumber: 2, title: 'Bloom', description: 'Add 30g medium-coarse coffee, pour 60ml water at 93°C in a circular motion. Wait for the bloom to subside.', timerSeconds: 45, waterAmount: 60 },
        { stepNumber: 3, title: 'Second Pour', description: 'Slowly pour to 250ml total, maintaining a steady stream. Keep the water level below the top of the filter.', timerSeconds: 90, waterAmount: 190 },
        { stepNumber: 4, title: 'Final Pour', description: 'Pour the remaining water to 480ml total in slow pulses, allowing each pulse to drain slightly.', timerSeconds: 135, waterAmount: 230 },
      ],
      tags: ['clean', 'bright', 'chemex', 'morning'],
    },
  ]);
  console.log(`Inserted ${recipes.length} recipes`);

  // ── Academy ──────────────────────────────────────────────────────────────
  await CourseEnrollment.deleteMany({});
  await Lesson.deleteMany({});
  await Course.deleteMany({});
  console.log('Cleared academy collections');

  const courseDefs = [
    {
      title: 'Coffee Foundations',
      slug: 'coffee-foundations',
      description: 'Learn the fundamentals of coffee: origins, roasting, and brewing basics.',
      category: 'coffee_foundations' as const,
      level: null,
      order: 1,
      requiredRole: 'community' as const,
      lessons: [
        {
          title: 'Introduction to Coffee Origins',
          order: 1,
          contentType: 'text' as const,
          body: 'Coffee originated in Ethiopia and has spread across the globe. In this lesson we explore the major coffee-growing regions and how geography shapes flavour.',
          durationSeconds: 300,
        },
        {
          title: 'Understanding Roast Profiles',
          order: 2,
          contentType: 'video' as const,
          videoUrl: 'https://placeholder.javarista.com/videos/roast-profiles',
          durationSeconds: 480,
        },
        {
          title: 'Brewing Fundamentals',
          order: 3,
          contentType: 'text' as const,
          body: 'Brewing coffee is a balance of grind size, water temperature, ratio, and time. This lesson covers the variables that matter most.',
          durationSeconds: 420,
        },
      ],
    },
    {
      title: 'Javarista Level 1: Company Culture & Hospitality',
      slug: 'javarista-level-1-company-culture-hospitality',
      description: 'Understand the Javarista brand, values, and the hospitality standards that define our guest experience.',
      category: 'certification' as const,
      level: 1,
      order: 1,
      requiredRole: 'employee' as const,
      lessons: [
        {
          title: 'Welcome to Javarista',
          order: 1,
          contentType: 'text' as const,
          body: 'Discover the Javarista story — our mission, vision, and the culture that makes us who we are.',
          durationSeconds: 360,
        },
        {
          title: 'Hospitality Standards',
          order: 2,
          contentType: 'video' as const,
          videoUrl: 'https://placeholder.javarista.com/videos/hospitality-standards',
          durationSeconds: 540,
        },
        {
          title: 'Customer Experience Excellence',
          order: 3,
          contentType: 'quiz' as const,
          durationSeconds: 300,
        },
      ],
    },
    {
      title: 'Javarista Level 2: Espresso & Beverages',
      slug: 'javarista-level-2-espresso-beverages',
      description: 'Master the espresso machine, milk steaming, and the full Javarista beverage menu.',
      category: 'certification' as const,
      level: 2,
      order: 2,
      requiredRole: 'employee' as const,
      lessons: [
        {
          title: 'Espresso Machine Basics',
          order: 1,
          contentType: 'video' as const,
          videoUrl: 'https://placeholder.javarista.com/videos/espresso-machine-basics',
          durationSeconds: 600,
        },
        {
          title: 'Milk Steaming & Latte Art',
          order: 2,
          contentType: 'video' as const,
          videoUrl: 'https://placeholder.javarista.com/videos/milk-steaming-latte-art',
          durationSeconds: 720,
        },
        {
          title: 'Beverage Menu Mastery',
          order: 3,
          contentType: 'quiz' as const,
          durationSeconds: 480,
        },
      ],
    },
    {
      title: 'Javarista Level 3: Matcha & Specialty',
      slug: 'javarista-level-3-matcha-specialty',
      description: 'Dive into matcha preparation techniques and Javarista\'s signature specialty beverages.',
      category: 'certification' as const,
      level: 3,
      order: 3,
      requiredRole: 'employee' as const,
      lessons: [
        {
          title: 'Introduction to Matcha',
          order: 1,
          contentType: 'text' as const,
          body: 'Matcha is stone-ground green tea with a rich history in Japanese tea ceremony. Learn the grades, sourcing, and what makes ceremonial-grade matcha special.',
          durationSeconds: 420,
        },
        {
          title: 'Specialty Beverage Preparation',
          order: 2,
          contentType: 'video' as const,
          videoUrl: 'https://placeholder.javarista.com/videos/specialty-beverage-preparation',
          durationSeconds: 660,
        },
        {
          title: 'Matcha Ceremony Technique',
          order: 3,
          contentType: 'video' as const,
          videoUrl: 'https://placeholder.javarista.com/videos/matcha-ceremony-technique',
          durationSeconds: 540,
        },
      ],
    },
    {
      title: 'Javarista Level 4: Speed & Drive-Thru',
      slug: 'javarista-level-4-speed-drive-thru',
      description: 'Develop the speed, accuracy, and efficiency required to deliver quality beverages in a high-volume drive-thru environment.',
      category: 'certification' as const,
      level: 4,
      order: 4,
      requiredRole: 'employee' as const,
      lessons: [
        {
          title: 'Drive-Thru Operations',
          order: 1,
          contentType: 'text' as const,
          body: 'Learn the Javarista drive-thru flow: order taking, sequencing, handoff, and communication between positions.',
          durationSeconds: 480,
        },
        {
          title: 'Speed & Efficiency Techniques',
          order: 2,
          contentType: 'video' as const,
          videoUrl: 'https://placeholder.javarista.com/videos/speed-efficiency-techniques',
          durationSeconds: 600,
        },
        {
          title: 'Quality Under Pressure',
          order: 3,
          contentType: 'quiz' as const,
          durationSeconds: 360,
        },
      ],
    },
  ];

  for (const def of courseDefs) {
    const { lessons: lessonDefs, ...courseFields } = def;

    const course = await Course.create(courseFields);

    const lessonDocs = await Lesson.insertMany(
      lessonDefs.map((l) => ({ ...l, course: course._id }))
    );

    course.lessons = lessonDocs.map((l) => l._id as mongoose.Types.ObjectId);
    await course.save();

    console.log(`  Course seeded: ${course.title} (${lessonDocs.length} lessons)`);
  }

  // ── Playbooks ─────────────────────────────────────────────────────────────
  await Playbook.deleteMany({});
  console.log('Cleared Playbook collection');

  const playbookDocs = await Playbook.create([
    {
      title: 'Pistachio Velvet Recipe',
      category: 'recipe',
      tags: ['pistachio-velvet', 'espresso', 'signature'],
      body: [
        '## Build Sequence',
        '',
        '1. Pull a double shot (18g in / 36g out, 28–32 sec) into a pre-warmed 12 oz cup.',
        '2. Add 2 pumps pistachio syrup to the shot and stir to combine.',
        '3. Steam whole milk to 140°F (60°C) with a silky, microfoam texture.',
        '4. Pour steamed milk over the espresso-syrup base using a slow circular motion.',
        '5. Finish with a light dusting of crushed pistachios on the foam.',
        '',
        '## Ratios',
        '- Espresso: 36g',
        '- Pistachio syrup: 2 pumps (~20ml)',
        '- Milk: 200ml steamed',
        '',
        '## Notes',
        'For iced version: skip steaming, pour espresso + syrup over ice, top with cold milk and shake.',
      ].join('\n'),
      requiredRole: 'employee',
      createdBy: admin._id,
    },
    {
      title: 'Cash Register Closing Procedure',
      category: 'procedure',
      tags: ['closing', 'cash', 'register'],
      body: [
        '## Steps',
        '',
        '1. **Stop accepting cash** — switch to card-only 10 minutes before closing.',
        '2. **Print Z-report** from the POS to get the day\'s total sales summary.',
        '3. **Count the drawer** — remove all bills and coins, leaving the starting float ($150).',
        '4. **Balance against Z-report** — counted cash should match net cash sales. Log any variance over $2.',
        '5. **Bag and seal** — place counted cash in the deposit bag, write the date and amount, seal it.',
        '6. **Store in safe** — place the sealed bag in the drop safe. Log the drop in the cash log binder.',
        '7. **Sign off** — both the closer and the shift lead must sign the cash log.',
        '',
        '## Variances',
        '- Under $2: note in the log, no escalation needed.',
        '- $2–$20: note in the log and notify the shift lead.',
        '- Over $20: notify the store manager immediately — do not leave until resolved.',
        '',
        '## Checklist',
        '- [ ] Z-report printed',
        '- [ ] Drawer counted',
        '- [ ] Variance logged',
        '- [ ] Deposit bagged and sealed',
        '- [ ] Drop safe logged',
        '- [ ] Cash log signed by closer + shift lead',
      ].join('\n'),
      requiredRole: 'employee',
      createdBy: admin._id,
    },
    {
      title: 'Espresso Grinder Calibration',
      category: 'troubleshooting',
      tags: ['espresso', 'grinder', 'calibration'],
      body: [
        '## Symptoms & Fixes',
        '',
        '### Shot pulling too fast (under 20 sec)',
        '**Symptom:** Thin, pale, watery espresso. Yield reached in under 20 seconds.',
        '**Cause:** Grind too coarse or dose too low.',
        '**Fix:** Adjust grinder 1 step finer. Retest. Target 28–32 sec for a 1:2 ratio.',
        '',
        '### Shot pulling too slow (over 40 sec)',
        '**Symptom:** Very dark, bitter shot. Yield takes over 40 seconds.',
        '**Cause:** Grind too fine, overdosing, or tamping too hard.',
        '**Fix:** Adjust grinder 1 step coarser. Check dose weight (target 18g ± 0.2g). Retest.',
        '',
        '### Uneven extraction (channeling)',
        '**Symptom:** Pale spots or holes in the puck after pulling shot.',
        '**Cause:** Uneven distribution or tamp.',
        '**Fix:** Use a WDT tool to distribute grounds before tamping. Ensure level, even tamp at ~30 lbs pressure.',
        '',
        '## Calibration Workflow',
        '',
        '1. Weigh dose: 18.0g ± 0.2g',
        '2. Pull shot — time from pump start to yield target (36g out)',
        '3. Target: 28–32 seconds',
        '4. Adjust one step at a time, pull and discard test shot after each change',
        '5. Log final setting in the calibration log with date and opener initials',
        '',
        '## When to Recalibrate',
        '- Daily: at opening and after a new bag of beans',
        '- Any time shots are consistently off by more than 5 seconds',
        '- After grinder cleaning or burr replacement',
      ].join('\n'),
      requiredRole: 'employee',
      createdBy: admin._id,
    },
  ]);
  console.log(`  Playbooks seeded: ${playbookDocs.length}`);

  // ── Checklist Templates ───────────────────────────────────────────────────
  await ChecklistTemplate.deleteMany({});
  console.log('Cleared ChecklistTemplate collection');

  const checklistTemplateDocs = await ChecklistTemplate.create([
    {
      title: 'Opening Procedures',
      category: 'opening',
      requiredRole: 'employee',
      isActive: true,
      items: [
        {
          order: 1,
          label: 'Unlock front door and disarm security system',
          requiresPhoto: false,
          requiresNote: false,
        },
        {
          order: 2,
          label: 'Take photo of storefront and signage — confirm all signage is in place',
          requiresPhoto: true,
          requiresNote: false,
        },
        {
          order: 3,
          label: 'Turn on all equipment: espresso machine, grinders, steam wands, blenders',
          requiresPhoto: false,
          requiresNote: false,
        },
        {
          order: 4,
          label: 'Check and restock milk, syrups, and cups to par levels',
          requiresPhoto: false,
          requiresNote: true,
        },
        {
          order: 5,
          label: 'Calibrate espresso grinder and pull a test shot — log grind setting',
          requiresPhoto: false,
          requiresNote: true,
        },
      ],
    },
    {
      title: 'Closing Procedures',
      category: 'closing',
      requiredRole: 'employee',
      isActive: true,
      items: [
        {
          order: 1,
          label: 'Stop accepting orders and notify any remaining customers of closing time',
          requiresPhoto: false,
          requiresNote: false,
        },
        {
          order: 2,
          label: 'Backflush espresso machine and clean group heads with detergent tablets',
          requiresPhoto: false,
          requiresNote: false,
        },
        {
          order: 3,
          label: 'Empty, rinse, and sanitize milk pitchers; store in refrigerator',
          requiresPhoto: false,
          requiresNote: false,
        },
        {
          order: 4,
          label: 'Print Z-report, count drawer, and complete cash drop per cash handling procedure',
          requiresPhoto: false,
          requiresNote: true,
        },
        {
          order: 5,
          label: 'Lock all doors, arm security system, and confirm all equipment is powered off',
          requiresPhoto: false,
          requiresNote: false,
        },
      ],
    },
    {
      title: 'Daily Cleaning',
      category: 'cleaning',
      requiredRole: 'employee',
      isActive: true,
      items: [
        {
          order: 1,
          label: 'Wipe down and sanitize all counter surfaces and equipment exteriors — photo required',
          requiresPhoto: true,
          requiresNote: false,
        },
        {
          order: 2,
          label: 'Clean steam wand inside and out; purge before and after every use — photo required',
          requiresPhoto: true,
          requiresNote: false,
        },
        {
          order: 3,
          label: 'Mop floor behind bar and in customer area — photo required',
          requiresPhoto: true,
          requiresNote: false,
        },
        {
          order: 4,
          label: 'Empty and sanitize drip trays, knock box, and waste bin — photo required',
          requiresPhoto: true,
          requiresNote: false,
        },
      ],
    },
  ]);
  console.log(`  Checklist templates seeded: ${checklistTemplateDocs.length}`);

  // ── Investor Exclusive Content ────────────────────────────────────────────
  const exclusiveContentDocs = await ExclusiveContent.create([
    {
      title: 'Behind the Beans: Ethiopia Yirgacheffe Sourcing Story',
      slug: 'behind-the-beans-ethiopia-yirgacheffe-sourcing-story',
      contentType: 'sourcing_story',
      body: '## Farm Visit\n\nOur sourcing team travelled to the Gedeo Zone in southern Ethiopia to visit the smallholder farms that produce our Yirgacheffe lot.\n\n## The Farmers\n\nOver 400 smallholder farmers contribute cherry to this cooperative washing station. Average farm size is less than one hectare.\n\n## Processing\n\nThe coffee is washed and dried on raised beds for 12–15 days, producing the clean, floral cup profile that defines this origin.',
      publishedAt: new Date('2026-05-01'),
      tags: ['sourcing', 'ethiopia', 'single-origin'],
      requiredRole: 'investor',
      isActive: true,
    },
    {
      title: 'Q3 Community Update',
      slug: 'q3-community-update',
      contentType: 'article',
      body: '## Store Expansion\n\nWe are on track to open two additional locations before the end of Q3, bringing our total footprint to five stores.\n\n## Revenue\n\nQ2 revenue grew 24% year-over-year, driven by strong drive-thru performance and the matcha menu launch.\n\n## Upcoming\n\nLook for our investor call invite arriving in the next two weeks.',
      publishedAt: new Date('2026-06-01'),
      tags: ['investor', 'update'],
      requiredRole: 'investor',
      isActive: true,
    },
  ]);
  console.log(`  Exclusive content: ${exclusiveContentDocs.length}`);

  // Insert store recipes
  const storeRecipeDocs = await StoreRecipe.insertMany([
    {
      name: 'Pistachio Velvet Latte',
      slug: 'pistachio-velvet-latte',
      category: 'hot',
      sizes: [
        { label: 'Small', coffeeDose: 18, milkAmount: 150, syrupAmount: 10, syrupType: 'pistachio' },
        { label: 'Medium', coffeeDose: 20, milkAmount: 220, syrupAmount: 15, syrupType: 'pistachio' },
        { label: 'Large', coffeeDose: 22, milkAmount: 300, syrupAmount: 20, syrupType: 'pistachio' },
      ],
      buildOrder: [
        'Pull double shot',
        'Add 2 pumps pistachio syrup',
        'Steam whole milk to 65°C',
        'Pour over ice',
        'Top with pistachio dust',
      ],
      targetPrepTimeSeconds: 90,
      costInfo: { ingredientCost: 1.8, sellingPrice: 6.5 },
      qualityStandards:
        'Milk temperature must be 60-65°C. Latte art required on M and L.',
      commonMistakes: ['Over-extracting espresso', 'Milk too hot'],
      requiredEquipment: ['Espresso machine', 'Steam wand', 'Milk pitcher'],
      requiredRole: 'employee',
      isActive: true,
    },
    {
      name: 'Iced Matcha Latte',
      slug: 'iced-matcha-latte',
      category: 'matcha',
      sizes: [
        { label: 'Small', milkAmount: 200, additionalIngredients: [{ name: 'matcha powder', amount: '2g' }] },
        { label: 'Large', milkAmount: 320, additionalIngredients: [{ name: 'matcha powder', amount: '3g' }] },
      ],
      buildOrder: [
        'Sift 2g matcha into cup',
        'Add 30ml hot water',
        'Whisk until smooth',
        'Add ice',
        'Pour cold milk',
      ],
      targetPrepTimeSeconds: 60,
      costInfo: { ingredientCost: 1.2, sellingPrice: 5.5 },
      qualityStandards: 'Matcha must be fully dissolved with no lumps before adding milk.',
      commonMistakes: ['Skipping the sift step', 'Using cold water to dissolve matcha'],
      requiredEquipment: ['Matcha whisk (chasen)', 'Small bowl', 'Fine sieve'],
      requiredRole: 'employee',
      isActive: true,
    },
  ]);
  console.log(`Seeded ${storeRecipeDocs.length} store recipes`);

  console.log('\nSeed complete:');
  console.log(`  Brew methods:      ${brewMethodDocs.length}`);
  console.log(`  Recipes:           ${recipes.length}`);
  console.log(`  Courses:           ${courseDefs.length}`);
  console.log(`  Playbooks:         ${playbookDocs.length}`);
  console.log(`  Checklists:        ${checklistTemplateDocs.length}`);
  console.log(`  Exclusive content: ${exclusiveContentDocs.length}`);
  console.log(`  Store recipes:     ${storeRecipeDocs.length}`);
  console.log(`  Admin:             ${admin.email}`);

  await mongoose.disconnect();
  console.log('MongoDB disconnected');
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
