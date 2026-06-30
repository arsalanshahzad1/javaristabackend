import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

// ── Import all models ──────────────────────────────────────────────
import User from './models/User';
import BrewMethod from './models/BrewMethod';
import Recipe from './models/Recipe';
import Course from './models/course.model';
import Lesson from './models/lesson.model';
import Playbook from './models/playbook.model';
import ChecklistTemplate from './models/checklist-template.model';
import StoreRecipe from './models/store-recipe.model';
import ExclusiveContent from './models/exclusive-content.model';

// ── Helpers ────────────────────────────────────────────────────────
const log = (msg: string) => console.log(`[SEED] ${msg}`);

async function connect() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/javarista';
  await mongoose.connect(uri);
  log(`Connected to MongoDB: ${uri}`);
}

// ══════════════════════════════════════════════════════════════════
// USERS
// ══════════════════════════════════════════════════════════════════
async function seedUsers() {
  await User.deleteMany({});
  log('Cleared users');

  const users = await User.create([
    {
      name: 'Admin User',
      email: 'admin@javatimes.com',
      password: 'Admin@1234',
      role: 'owner',
      isVerified: true,
      isPremium: true,
      subscriptionStatus: 'active',
      bio: 'Java Times platform administrator.',
    },
    {
      name: 'Sara Malik',
      email: 'employee@javatimes.com',
      password: 'Employee@1234',
      role: 'barista',
      isVerified: true,
      isPremium: false,
      subscriptionStatus: 'none',
      bio: 'Head barista at Java Times Karachi.',
    },
    {
      name: 'Omar Investor',
      email: 'investor@javatimes.com',
      password: 'Investor@1234',
      role: 'investor',
      isVerified: true,
      isPremium: true,
      subscriptionStatus: 'active',
      bio: 'Java Times shareholder and coffee enthusiast.',
    },
    {
      name: 'Ali Coffee',
      email: 'community@javatimes.com',
      password: 'Community@1234',
      role: 'trainee',
      isVerified: true,
      isPremium: false,
      subscriptionStatus: 'none',
      bio: 'Coffee lover exploring the world of specialty brews.',
    },
  ]);

  log(`Seeded ${users.length} users`);
  return users;
}

// ══════════════════════════════════════════════════════════════════
// BREW METHODS
// ══════════════════════════════════════════════════════════════════
async function seedBrewMethods() {
  await BrewMethod.deleteMany({});
  log('Cleared brew methods');

  const methods = await BrewMethod.create([
    // ── Coffee ──
    {
      name: 'Pour Over',
      slug: 'pour-over',
      description:
        'A clean, bright brew method that highlights delicate floral and fruit notes by slowly pouring hot water over ground coffee in a filter.',
      category: 'coffee',
      difficulty: 'medium',
      requiredEquipment: ['Pour over dripper', 'Paper filter', 'Gooseneck kettle', 'Scale', 'Timer'],
      ratio: '1:15',
      brewTime: 240,
      isActive: true,
    },
    {
      name: 'French Press',
      slug: 'french-press',
      description:
        'A full-immersion brew method that produces a rich, heavy-bodied cup with natural oils and bold flavors.',
      category: 'coffee',
      difficulty: 'easy',
      requiredEquipment: ['French press', 'Kettle', 'Scale', 'Timer', 'Coarse grinder'],
      ratio: '1:12',
      brewTime: 240,
      isActive: true,
    },
    {
      name: 'AeroPress',
      slug: 'aeropress',
      description:
        'A versatile and forgiving brewer that uses pressure to extract a concentrated, smooth cup in under two minutes.',
      category: 'coffee',
      difficulty: 'easy',
      requiredEquipment: ['AeroPress', 'Paper or metal filter', 'Kettle', 'Scale'],
      ratio: '1:13',
      brewTime: 90,
      isActive: true,
    },
    {
      name: 'Espresso',
      slug: 'espresso',
      description:
        'High-pressure extraction through finely ground coffee producing a concentrated shot with rich crema.',
      category: 'coffee',
      difficulty: 'hard',
      requiredEquipment: ['Espresso machine', 'Grinder', 'Tamper', 'Scale', 'Portafilter'],
      ratio: '1:2',
      brewTime: 30,
      isActive: true,
    },
    {
      name: 'Cold Brew',
      slug: 'cold-brew',
      description:
        'Coarse ground coffee steeped in cold water for 12–24 hours producing a smooth, low-acidity concentrate.',
      category: 'coffee',
      difficulty: 'easy',
      requiredEquipment: ['Mason jar or cold brew maker', 'Scale', 'Filter or cheesecloth'],
      ratio: '1:8',
      brewTime: 720,
      isActive: true,
    },
    {
      name: 'Moka Pot',
      slug: 'moka-pot',
      description:
        'A stovetop brewer that forces boiling water through ground coffee under steam pressure, producing a strong espresso-like brew.',
      category: 'coffee',
      difficulty: 'medium',
      requiredEquipment: ['Moka pot', 'Stovetop', 'Scale', 'Fine grinder'],
      ratio: '1:7',
      brewTime: 300,
      isActive: true,
    },
    // ── Matcha ──
    {
      name: 'Traditional Matcha',
      slug: 'traditional-matcha',
      description:
        'Classic Japanese preparation using a bamboo whisk to create a smooth, frothy bowl of ceremonial grade matcha.',
      category: 'matcha',
      difficulty: 'medium',
      requiredEquipment: ['Chawan (matcha bowl)', 'Chasen (bamboo whisk)', 'Chashaku (scoop)', 'Sifter'],
      ratio: '1:30',
      brewTime: 120,
      isActive: true,
    },
    {
      name: 'Matcha Latte',
      slug: 'matcha-latte',
      description:
        'Ceremonial matcha whisked with hot water and combined with steamed milk for a creamy, vibrant green latte.',
      category: 'matcha',
      difficulty: 'easy',
      requiredEquipment: ['Milk frother', 'Whisk', 'Sifter', 'Scale'],
      ratio: '1:40',
      brewTime: 180,
      isActive: true,
    },
    // ── Hojicha ──
    {
      name: 'Hojicha Brew',
      slug: 'hojicha-brew',
      description:
        'Roasted green tea brewed at lower temperatures to bring out its warm, caramel and toasty notes without bitterness.',
      category: 'hojicha',
      difficulty: 'easy',
      requiredEquipment: ['Teapot or kyusu', 'Thermometer', 'Timer', 'Strainer'],
      ratio: '1:50',
      brewTime: 30,
      isActive: true,
    },
    {
      name: 'Hojicha Latte',
      slug: 'hojicha-latte',
      description:
        'Finely ground hojicha combined with hot water and steamed milk for a cozy, low-caffeine latte alternative.',
      category: 'hojicha',
      difficulty: 'easy',
      requiredEquipment: ['Milk frother', 'Whisk', 'Scale', 'Thermometer'],
      ratio: '1:35',
      brewTime: 150,
      isActive: true,
    },
  ]);

  log(`Seeded ${methods.length} brew methods`);
  return methods;
}

// ══════════════════════════════════════════════════════════════════
// RECIPES
// ══════════════════════════════════════════════════════════════════
async function seedRecipes(brewMethods: any[], adminUser: any) {
  await Recipe.deleteMany({});
  log('Cleared recipes');

  const pourOver = brewMethods.find((m) => m.slug === 'pour-over');
  const frenchPress = brewMethods.find((m) => m.slug === 'french-press');
  const aeropress = brewMethods.find((m) => m.slug === 'aeropress');
  const coldBrew = brewMethods.find((m) => m.slug === 'cold-brew');
  const matchaLatte = brewMethods.find((m) => m.slug === 'matcha-latte');
  const hojicha = brewMethods.find((m) => m.slug === 'hojicha-latte');

  const recipes = await Recipe.create([
    {
      name: 'Classic Java Pour Over',
      description:
        'A clean and bright pour over highlighting the floral and citrus notes of our house Ethiopia single origin.',
      brewMethod: pourOver._id,
      author: adminUser._id,
      coffeeDose: 20,
      waterAmount: 300,
      ratio: '1:15',
      grindSize: 'Medium-fine',
      brewTime: 240,
      difficulty: 'medium',
      steps: [
        { stepNumber: 1, title: 'Heat water', description: 'Heat water to 93°C (200°F).', timerSeconds: 60 },
        {
          stepNumber: 2,
          title: 'Rinse filter',
          description: 'Rinse the paper filter with hot water, then discard the rinse water.',
          timerSeconds: 20,
        },
        {
          stepNumber: 3,
          title: 'Add coffee',
          description: 'Add 20g of medium-fine ground coffee to the filter.',
          timerSeconds: 15,
        },
        {
          stepNumber: 4,
          title: 'Bloom',
          description: 'Pour 40g of water evenly over the grounds to bloom. Wait 30 seconds.',
          timerSeconds: 30,
        },
        {
          stepNumber: 5,
          title: 'First pour',
          description: 'Pour water in slow circular motions up to 150g total over 45 seconds.',
          timerSeconds: 45,
        },
        {
          stepNumber: 6,
          title: 'Continue pouring',
          description: 'Continue pouring to 300g total, maintaining a steady spiral pour.',
          timerSeconds: 60,
        },
        {
          stepNumber: 7,
          title: 'Drawdown',
          description: 'Allow the coffee to drawdown fully. Total brew time should be 3:30–4:00.',
          timerSeconds: 30,
        },
      ],
      tags: ['pour over', 'ethiopia', 'floral', 'citrus', 'single origin'],
      isPremium: false,
      isPublished: true,
      likesCount: 24,
      brewCount: 87,
    },
    {
      name: 'Bold French Press',
      description:
        'A rich, full-bodied French press recipe using a coarse grind and extended steep for maximum body and sweetness.',
      brewMethod: frenchPress._id,
      author: adminUser._id,
      coffeeDose: 30,
      waterAmount: 360,
      ratio: '1:12',
      grindSize: 'Coarse',
      brewTime: 240,
      difficulty: 'easy',
      steps: [
        { stepNumber: 1, title: 'Heat water', description: 'Heat water to 95°C.', timerSeconds: 60 },
        {
          stepNumber: 2,
          title: 'Add coffee',
          description: 'Add 30g of coarsely ground coffee to the French press.',
          timerSeconds: 15,
        },
        {
          stepNumber: 3,
          title: 'Pour water',
          description: 'Pour all 360g of water over the grounds, ensuring full saturation.',
          timerSeconds: 20,
        },
        {
          stepNumber: 4,
          title: 'Steep',
          description: 'Place the lid on (plunger up) and steep for 4 minutes.',
          timerSeconds: 240,
        },
        {
          stepNumber: 5,
          title: 'Press',
          description: 'Press the plunger down slowly and steadily over 20 seconds.',
          timerSeconds: 20,
        },
        {
          stepNumber: 6,
          title: 'Pour immediately',
          description: 'Pour immediately to avoid over-extraction.',
          timerSeconds: 10,
        },
      ],
      tags: ['french press', 'bold', 'full body', 'beginner friendly'],
      isPremium: false,
      isPublished: true,
      likesCount: 41,
      brewCount: 132,
    },
    {
      name: 'AeroPress Inverted Concentrate',
      description:
        'A smooth, low-acidity concentrate using the inverted AeroPress method. Dilute to taste or serve over ice.',
      brewMethod: aeropress._id,
      author: adminUser._id,
      coffeeDose: 18,
      waterAmount: 200,
      ratio: '1:11',
      grindSize: 'Medium',
      brewTime: 90,
      difficulty: 'easy',
      steps: [
        {
          stepNumber: 1,
          title: 'Invert AeroPress',
          description: 'Set AeroPress in inverted position (plunger side down).',
          timerSeconds: 10,
        },
        {
          stepNumber: 2,
          title: 'Add coffee',
          description: 'Add 18g of medium ground coffee.',
          timerSeconds: 10,
        },
        {
          stepNumber: 3,
          title: 'Add water and stir',
          description: 'Pour 200g of 88°C water and stir 10 times.',
          timerSeconds: 20,
        },
        {
          stepNumber: 4,
          title: 'Attach cap and steep',
          description: 'Attach cap with wet filter, steep for 1 minute.',
          timerSeconds: 60,
        },
        {
          stepNumber: 5,
          title: 'Flip and press',
          description: 'Carefully flip onto your cup and press down over 30 seconds.',
          timerSeconds: 30,
        },
      ],
      tags: ['aeropress', 'inverted', 'concentrate', 'smooth', 'low acid'],
      isPremium: false,
      isPublished: true,
      likesCount: 18,
      brewCount: 55,
    },
    {
      name: '24-Hour Cold Brew Concentrate',
      description:
        'A super smooth cold brew concentrate steeped for 24 hours. Dilute 1:1 with water or milk to serve.',
      brewMethod: coldBrew._id,
      author: adminUser._id,
      coffeeDose: 100,
      waterAmount: 800,
      ratio: '1:8',
      grindSize: 'Extra coarse',
      brewTime: 1440,
      difficulty: 'easy',
      steps: [
        {
          stepNumber: 1,
          title: 'Grind coffee',
          description: 'Coarsely grind 100g of coffee.',
          timerSeconds: 60,
        },
        {
          stepNumber: 2,
          title: 'Combine',
          description: 'Combine coffee and 800g of cold filtered water in a mason jar.',
          timerSeconds: 10,
        },
        {
          stepNumber: 3,
          title: 'Stir',
          description: 'Stir to ensure all grounds are saturated.',
          timerSeconds: 10,
        },
        {
          stepNumber: 4,
          title: 'Refrigerate',
          description: 'Cover and refrigerate for 18–24 hours.',
          timerSeconds: 0,
        },
        {
          stepNumber: 5,
          title: 'Strain',
          description: 'Strain through a coffee filter or cheesecloth into a clean jar.',
          timerSeconds: 30,
        },
        {
          stepNumber: 6,
          title: 'Store and serve',
          description: 'Store concentrate refrigerated for up to 2 weeks. Dilute 1:1 to serve.',
          timerSeconds: 10,
        },
      ],
      tags: ['cold brew', 'concentrate', 'smooth', 'summer', 'low acid'],
      isPremium: false,
      isPublished: true,
      likesCount: 63,
      brewCount: 201,
    },
    {
      name: 'Java Times Matcha Latte',
      description:
        'Our signature matcha latte using ceremonial grade matcha whisked smooth with oat milk for a creamy, vibrant cup.',
      brewMethod: matchaLatte._id,
      author: adminUser._id,
      coffeeDose: 3,
      waterAmount: 60,
      ratio: '1:20',
      grindSize: 'N/A',
      brewTime: 180,
      difficulty: 'easy',
      steps: [
        {
          stepNumber: 1,
          title: 'Sift matcha',
          description: 'Sift 3g of ceremonial matcha into a chawan or small bowl.',
          timerSeconds: 20,
        },
        {
          stepNumber: 2,
          title: 'Add water',
          description: 'Add 60ml of 75°C water (not boiling — matcha burns above 80°C).',
          timerSeconds: 10,
        },
        {
          stepNumber: 3,
          title: 'Whisk',
          description: 'Whisk in a W or M motion until smooth and frothy with no lumps.',
          timerSeconds: 30,
        },
        {
          stepNumber: 4,
          title: 'Steam milk',
          description: 'Steam 200ml of oat milk to 65°C.',
          timerSeconds: 60,
        },
        {
          stepNumber: 5,
          title: 'Pour matcha',
          description: 'Pour matcha into glass over ice (iced) or directly (hot).',
          timerSeconds: 10,
        },
        {
          stepNumber: 6,
          title: 'Add milk',
          description: 'Pour steamed milk over the matcha and enjoy.',
          timerSeconds: 10,
        },
      ],
      tags: ['matcha', 'latte', 'oat milk', 'ceremonial', 'signature'],
      isPremium: false,
      isPublished: true,
      likesCount: 89,
      brewCount: 310,
    },
    {
      name: 'Hojicha Evening Latte',
      description:
        'A warm, low-caffeine hojicha latte perfect for winding down. Naturally sweet and earthy with notes of caramel and toasted rice.',
      brewMethod: hojicha._id,
      author: adminUser._id,
      coffeeDose: 5,
      waterAmount: 80,
      ratio: '1:16',
      grindSize: 'N/A',
      brewTime: 150,
      difficulty: 'easy',
      steps: [
        {
          stepNumber: 1,
          title: 'Sift hojicha',
          description: 'Sift 5g of hojicha powder into a bowl.',
          timerSeconds: 15,
        },
        {
          stepNumber: 2,
          title: 'Whisk with water',
          description: 'Add 80ml of 85°C water and whisk until smooth.',
          timerSeconds: 30,
        },
        {
          stepNumber: 3,
          title: 'Steam milk',
          description: 'Steam 180ml of whole milk to 65°C.',
          timerSeconds: 60,
        },
        {
          stepNumber: 4,
          title: 'Pour base',
          description: 'Pour hojicha base into a mug.',
          timerSeconds: 10,
        },
        {
          stepNumber: 5,
          title: 'Add milk and finish',
          description: 'Pour steamed milk gently over the hojicha base. Dust with hojicha powder to finish.',
          timerSeconds: 15,
        },
      ],
      tags: ['hojicha', 'latte', 'low caffeine', 'evening', 'cozy'],
      isPremium: false,
      isPublished: true,
      likesCount: 34,
      brewCount: 98,
    },
  ]);

  log(`Seeded ${recipes.length} recipes`);
  return recipes;
}

// ══════════════════════════════════════════════════════════════════
// COURSES & LESSONS
// ══════════════════════════════════════════════════════════════════
async function seedAcademy() {
  await Lesson.deleteMany({});
  await Course.deleteMany({});
  log('Cleared courses and lessons');

  // ── Coffee Foundations (community access) ──
  const introToCoffee = await Course.create({
    title: 'Introduction to Coffee',
    slug: 'introduction-to-coffee',
    description:
      'Learn the fundamentals of coffee — from seed to cup. Perfect for anyone starting their coffee journey.',
    category: 'coffee_foundations',
    level: null,
    order: 1,
    thumbnail: '',
    requiredRole: 'community',
    isActive: true,
  });

  const introLessons = await Lesson.create([
    {
      course: introToCoffee._id,
      title: 'What is Specialty Coffee?',
      order: 1,
      contentType: 'text',
      body: '## What is Specialty Coffee?\n\nSpecialty coffee refers to the highest quality green coffee beans roasted to their greatest flavor potential and then properly brewed. A coffee can only be called specialty if it scores 80 points or above on a 100-point scale by a certified Q-grader.\n\n### Key Characteristics\n- Single origin traceability\n- Carefully farmed and processed\n- Scored 80+ by Q-graders\n- Freshly roasted and brewed\n\nSpecialty coffee is about transparency — knowing where your coffee comes from, who grew it, and how it was processed.',
      durationSeconds: 300,
    },
    {
      course: introToCoffee._id,
      title: 'Coffee Origins & Flavor',
      order: 2,
      contentType: 'text',
      body: '## Coffee Origins & Flavor\n\nWhere coffee is grown dramatically affects how it tastes. Altitude, climate, soil, and processing method all shape the cup.\n\n### Key Regions\n\n**Ethiopia** — The birthplace of coffee. Expect floral, fruity, and tea-like cups. Bright acidity.\n\n**Colombia** — Balanced, smooth, and approachable. Notes of caramel, red fruit, and chocolate.\n\n**Brazil** — Full body, low acidity, nutty and chocolatey. The most produced coffee in the world.\n\n**Guatemala** — Rich body with smoky, spiced, and dark chocolate notes.\n\n**Kenya** — Bold, winey, and complex with blackcurrant and tomato-like acidity.',
      durationSeconds: 360,
    },
    {
      course: introToCoffee._id,
      title: 'Brew Method Overview',
      order: 3,
      contentType: 'text',
      body: '## Brew Method Overview\n\nDifferent brew methods extract coffee differently, each producing a unique cup experience.\n\n| Method | Body | Clarity | Difficulty |\n|---|---|---|---|\n| French Press | Heavy | Low | Beginner |\n| Pour Over | Light-medium | High | Intermediate |\n| AeroPress | Medium | Medium | Beginner |\n| Espresso | Full | High | Advanced |\n| Cold Brew | Heavy | Medium | Beginner |\n\nNo method is better than another — they simply produce different results. The best method is the one that produces the cup you enjoy most.',
      durationSeconds: 420,
    },
  ]);

  await Course.findByIdAndUpdate(introToCoffee._id, {
    lessons: introLessons.map((l) => l._id),
  });

  // ── Brewing Science (community access) ──
  const brewingScience = await Course.create({
    title: 'The Science of Brewing',
    slug: 'the-science-of-brewing',
    description:
      'Understand the variables that affect extraction — grind size, water temperature, ratio, and time.',
    category: 'coffee_foundations',
    level: null,
    order: 2,
    thumbnail: '',
    requiredRole: 'community',
    isActive: true,
  });

  const scienceLessons = await Lesson.create([
    {
      course: brewingScience._id,
      title: 'Extraction Explained',
      order: 1,
      contentType: 'text',
      body: '## Extraction Explained\n\nExtraction is the process of dissolving soluble compounds from coffee grounds into water. Getting extraction right is the difference between a great cup and a bad one.\n\n### Under-extracted coffee\n- Sour, sharp, and thin\n- Tastes salty or astringent\n- Caused by: too coarse a grind, too low a temperature, too short a brew time\n\n### Over-extracted coffee\n- Bitter, dry, and harsh\n- Hollow finish\n- Caused by: too fine a grind, too high a temperature, too long a brew time\n\n### Ideal extraction\n- Sweet, balanced, full finish\n- Extraction yield: 18–22% of the coffee mass dissolved into the water',
      durationSeconds: 420,
    },
    {
      course: brewingScience._id,
      title: 'Water Temperature & Quality',
      order: 2,
      contentType: 'text',
      body: '## Water Temperature & Quality\n\nWater is 98% of your cup. Its quality and temperature have an enormous impact on flavour.\n\n### Temperature\n- Ideal range: **90–96°C (194–205°F)**\n- Light roasts: higher end (94–96°C)\n- Dark roasts: lower end (90–92°C)\n- Boiling water (100°C) over-extracts and burns delicate compounds\n\n### Water Quality\n- Use filtered water — chlorine in tap water kills flavour\n- Ideal TDS: 75–150 ppm\n- Avoid distilled water — minerals are needed for extraction\n- Avoid very hard water — excess minerals cause bitter cups',
      durationSeconds: 360,
    },
    {
      course: brewingScience._id,
      title: 'Grind Size & Consistency',
      order: 3,
      contentType: 'text',
      body: '## Grind Size & Consistency\n\nGrind size controls the surface area of coffee exposed to water, directly affecting extraction rate.\n\n### Size by method\n| Method | Grind Size |\n|---|---|\n| Cold Brew | Extra Coarse |\n| French Press | Coarse |\n| Pour Over | Medium-Fine |\n| AeroPress | Medium |\n| Espresso | Fine |\n| Turkish | Extra Fine |\n\n### Consistency matters\nUneven grinds produce particles of different sizes — small particles over-extract while large ones under-extract simultaneously. A quality burr grinder produces consistent particle sizes and makes the single biggest upgrade to your home brewing.',
      durationSeconds: 400,
    },
  ]);

  await Course.findByIdAndUpdate(brewingScience._id, {
    lessons: scienceLessons.map((l) => l._id),
  });

  // ── JavaRista Level 1 Certification (employee only) ──
  const level1 = await Course.create({
    title: 'JavaRista Certification — Level 1',
    slug: 'javarista-certification-level-1',
    description:
      'The foundational Java Times barista certification. Covers hospitality standards, core recipes, and store operations basics.',
    category: 'certification',
    level: 1,
    order: 1,
    thumbnail: '',
    requiredRole: 'employee',
    isActive: true,
  });

  const level1Lessons = await Lesson.create([
    {
      course: level1._id,
      title: 'Welcome to JavaRista',
      order: 1,
      contentType: 'text',
      body: "## Welcome to JavaRista\n\nWelcome to the Java Times team. This certification program is your guide to becoming a certified JavaRista barista.\n\n### What you will learn\n- Java Times hospitality standards\n- Core beverage recipes and build procedures\n- Store opening and closing procedures\n- Food safety and hygiene standards\n\n### How certifications work\nComplete all lessons in this course to automatically earn your **JavaRista Level 1** certification. Your certificate will appear in the Certifications section of the app and can be shared digitally.\n\nLet's get started.",
      durationSeconds: 300,
    },
    {
      course: level1._id,
      title: 'Java Times Hospitality Standards',
      order: 2,
      contentType: 'text',
      body: '## Java Times Hospitality Standards\n\nEvery interaction with a customer is an opportunity to create a memorable experience. Our hospitality standards define how we deliver that experience consistently.\n\n### The 5 Pillars of Java Times Hospitality\n\n1. **Greet first** — Acknowledge every customer within 10 seconds of entering\n2. **Know your menu** — Be able to describe every drink and answer questions confidently\n3. **Personalise** — Remember regulars, learn preferences, suggest thoughtfully\n4. **Speed with care** — Target prep time under 3 minutes without compromising quality\n5. **Close warmly** — Every goodbye is an invitation to return\n\n### Non-negotiables\n- No phone use during service\n- Uniform and hygiene standards maintained at all times\n- Any complaint escalated to shift leader immediately',
      durationSeconds: 480,
    },
    {
      course: level1._id,
      title: 'Core Recipe Standards',
      order: 3,
      contentType: 'text',
      body: '## Core Recipe Standards\n\nConsistency is the foundation of quality. Every Java Times drink must taste identical whether made at 8am or 8pm, by a new barista or a veteran.\n\n### Key principles\n- **Always weigh doses** — never eyeball coffee or matcha\n- **Always check milk temperature** — 60–65°C for hot drinks\n- **Follow build order exactly** — sequence affects taste and texture\n- **Check before you serve** — visual inspection before every cup leaves the bar\n\n### Common mistakes to avoid\n- Over-tamping espresso (causes channeling)\n- Boiling matcha water (burns the leaves, tastes bitter)\n- Steaming milk too hot (scalds the milk proteins)\n- Skipping the rinse on pour over filters (papery taste)',
      durationSeconds: 420,
    },
    {
      course: level1._id,
      title: 'Level 1 Knowledge Check',
      order: 4,
      contentType: 'quiz',
      body: '',
      durationSeconds: 300,
    },
  ]);

  await Course.findByIdAndUpdate(level1._id, {
    lessons: level1Lessons.map((l) => l._id),
  });

  // ── JavaRista Level 2 Certification (employee only) ──
  const level2 = await Course.create({
    title: 'JavaRista Certification — Level 2',
    slug: 'javarista-certification-level-2',
    description:
      'Intermediate certification covering espresso theory, milk texturing, and advanced beverage customisation.',
    category: 'certification',
    level: 2,
    order: 2,
    thumbnail: '',
    requiredRole: 'employee',
    isActive: true,
  });

  const level2Lessons = await Lesson.create([
    {
      course: level2._id,
      title: 'Espresso Theory',
      order: 1,
      contentType: 'text',
      body: '## Espresso Theory\n\nEspresso is the foundation of most Java Times drinks. Understanding the variables that affect espresso quality is essential for Level 2 certification.\n\n### The Espresso Recipe (The Ratio)\nA standard espresso shot follows a dose:yield:time relationship:\n- **Dose (in):** 18–20g of ground coffee\n- **Yield (out):** 36–40g of liquid espresso\n- **Time:** 25–30 seconds\n\nThis is called a **1:2 ratio**.\n\n### Diagnosing your shot\n| Issue | Likely cause |\n|---|---|\n| Sour, runs fast (<20s) | Grind too coarse, dose too low |\n| Bitter, runs slow (>35s) | Grind too fine, dose too high |\n| Channeling, uneven flow | Uneven tamp or distribution |\n| No crema | Stale coffee or grind too coarse |',
      durationSeconds: 540,
    },
    {
      course: level2._id,
      title: 'Milk Texturing Mastery',
      order: 2,
      contentType: 'text',
      body: '## Milk Texturing Mastery\n\nProperly textured milk is silky, glossy, and free of large bubbles. It integrates seamlessly with espresso and holds latte art.\n\n### The process\n1. Start with cold milk (4°C) — cold milk gives you more time to texture\n2. Purge the steam wand before and after every use\n3. Submerge the tip just below the surface — angle the pitcher to create a whirlpool\n4. Introduce air in the first few seconds (tip near surface) until milk reaches 37°C\n5. Submerge the tip deeper and continue heating to 60–65°C\n6. Tap the pitcher on the counter and swirl to integrate\n\n### Temperatures by drink\n| Drink | Milk temp |\n|---|---|\n| Flat white | 55–60°C |\n| Latte / cappuccino | 60–65°C |\n| Babycino | 45–50°C |',
      durationSeconds: 480,
    },
    {
      course: level2._id,
      title: 'Level 2 Assessment',
      order: 3,
      contentType: 'quiz',
      body: '',
      durationSeconds: 300,
    },
  ]);

  await Course.findByIdAndUpdate(level2._id, {
    lessons: level2Lessons.map((l) => l._id),
  });

  log('Seeded courses and lessons');
  return { introToCoffee, brewingScience, level1, level2 };
}

// ══════════════════════════════════════════════════════════════════
// PLAYBOOKS
// ══════════════════════════════════════════════════════════════════
async function seedPlaybooks(adminUser: any) {
  await Playbook.deleteMany({});
  log('Cleared playbooks');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playbooks = await (Playbook.create as unknown as (docs: any[]) => Promise<any[]>)([
    {
      title: 'Store Opening Procedure',
      slug: 'store-opening-procedure',
      category: 'procedure',
      tags: ['opening', 'daily', 'operations'],
      body: `# Store Opening Procedure

Complete this procedure every morning before the store opens to the public.

## Equipment Check
- Turn on espresso machine and allow 20 minutes to heat
- Check water filtration system — replace filter if indicator is red
- Power on grinders and purge with 5g of coffee before dialling in
- Check refrigeration temperatures: dairy ≤4°C, freezer ≤-18°C

## Dialling In
Every morning the espresso must be dialled in fresh. Pull three test shots and adjust grind until:
- Shot time: 25–30 seconds
- Yield: 36–40g from 18g dose
- Taste: sweet, balanced, no sourness or bitterness

## Counter & Bar Setup
- Wipe all surfaces with food-safe sanitiser
- Fill and label all syrups — check dates
- Restock cups, lids, sleeves, straws
- Set up bar layout to standard diagram (posted behind bar)

## Pre-opening Checklist
Complete the Opening Checklist in the JavaRista app before unlocking the doors. All items must be checked off and submitted.`,
      mediaUrls: [],
      requiredRole: 'employee',
      relatedPlaybooks: [],
      createdBy: adminUser._id,
      isActive: true,
    },
    {
      title: 'Store Closing Procedure',
      slug: 'store-closing-procedure',
      category: 'procedure',
      tags: ['closing', 'daily', 'operations', 'cleaning'],
      body: `# Store Closing Procedure

Complete this procedure every evening after the last customer has left.

## Bar Breakdown
- Purge and clean steam wands immediately after last use
- Backflush espresso machine with cleaning tablet
- Empty and clean drip trays
- Remove and soak portafilters

## Cleaning
- Clean all milk jugs with dedicated milk jug cleaner
- Sanitise all work surfaces, counter, and bar
- Clean blenders with blender cleaning tablets
- Empty and sanitise ice bins

## Refrigeration
- Discard any dairy that will expire before next opening
- Label all opened syrups with opening date
- Check temperatures are holding before leaving

## End of Day
- Count the till and complete cash reconciliation
- Submit Closing Checklist in JavaRista app
- Lock all entrances and set alarm`,
      mediaUrls: [],
      requiredRole: 'employee',
      relatedPlaybooks: [],
      createdBy: adminUser._id,
      isActive: true,
    },
    {
      title: 'Espresso Machine Daily Maintenance',
      slug: 'espresso-machine-daily-maintenance',
      category: 'standard',
      tags: ['equipment', 'espresso machine', 'maintenance', 'daily'],
      body: `# Espresso Machine Daily Maintenance

Proper daily maintenance extends machine life and ensures consistent shot quality.

## Morning (before opening)
- Flush group heads with water for 10 seconds each
- Wipe group head gaskets with a clean damp cloth
- Check drip tray is clean and seated correctly
- Purge steam wands

## During service
- Wipe steam wands after every use — never leave milk to dry on the wand
- Purge steam wands before every use
- Knock box must be emptied before it is full

## Evening (after closing)
- Backflush each group with blind basket and water — 5 cycles
- Backflush with Cafiza cleaning tablet — follow machine manufacturer dosage
- Remove portafilters and baskets, soak in hot water with cleaning tablet
- Wipe exterior with damp cloth

## Weekly
- Remove and deep clean drip tray and housing
- Descale if machine indicates or per manufacturer schedule
- Report any unusual sounds, pressure drops, or temperature issues to manager immediately`,
      mediaUrls: [],
      requiredRole: 'employee',
      relatedPlaybooks: [],
      createdBy: adminUser._id,
      isActive: true,
    },
    {
      title: 'Food Safety & Allergen Standards',
      slug: 'food-safety-allergen-standards',
      category: 'standard',
      tags: ['food safety', 'allergens', 'hygiene', 'compliance'],
      body: `# Food Safety & Allergen Standards

These standards are non-negotiable. Failure to follow them can result in serious customer harm and disciplinary action.

## Personal Hygiene
- Wash hands for 20 seconds with soap before every shift and after any break
- Cover any cuts or wounds with a blue waterproof plaster
- No jewellery (except plain wedding band) during food handling
- Hair must be tied back or covered

## Temperature Control
| Item | Safe temperature |
|---|---|
| Fresh dairy | ≤4°C |
| Frozen items | ≤-18°C |
| Hot beverages | ≥60°C at point of service |

## Allergen Protocol
The 14 major allergens must be handled with care:
- **Milk** — present in all dairy-based drinks
- **Nuts** — some syrups and food items may contain tree nuts
- **Gluten** — all food items must be checked before serving

### Customer allergen requests
1. Take the request seriously — never guess
2. Check the allergen matrix (posted in the back)
3. Use dedicated equipment for severe allergy requests
4. If in doubt, escalate to the shift leader immediately`,
      mediaUrls: [],
      requiredRole: 'employee',
      relatedPlaybooks: [],
      createdBy: adminUser._id,
      isActive: true,
    },
    {
      title: 'How to Dial In Espresso',
      slug: 'how-to-dial-in-espresso',
      category: 'training',
      tags: ['espresso', 'grind', 'dial in', 'training'],
      body: `# How to Dial In Espresso

Dialling in is the process of adjusting your grind size to achieve a target shot profile. This must be done every morning and whenever a new bag of coffee is opened.

## Target Parameters
- **Dose:** 18g in
- **Yield:** 36–40g out (1:2 ratio)
- **Time:** 25–30 seconds
- **Taste:** Sweet, balanced, clean finish

## Step-by-Step Process

### Step 1 — Pull a test shot
Pull a shot without adjusting anything. Note the time and taste.

### Step 2 — Diagnose
| Result | Meaning | Adjustment |
|---|---|---|
| Under 20 seconds, sour | Under-extracted | Grind finer |
| Over 35 seconds, bitter | Over-extracted | Grind coarser |
| 25–30 seconds, balanced | Dialled in ✅ | No change needed |

### Step 3 — Adjust
Move the grinder one step at a time. Purge 3–5g of coffee after each adjustment before pulling another shot — stale grounds in the chamber will skew the result.

### Step 4 — Repeat
Continue until the shot hits target time and tastes balanced. Document your final grind setting in the opening checklist note field.

## Important notes
- Never adjust more than one variable at a time
- Temperature changes, humidity, and coffee age all affect extraction — a dialled-in shot from yesterday may not be right today
- When in doubt, taste it`,
      mediaUrls: [],
      requiredRole: 'employee',
      relatedPlaybooks: [],
      createdBy: adminUser._id,
      isActive: true,
    },
  ]);

  log(`Seeded ${playbooks.length} playbooks`);
  return playbooks;
}

// ══════════════════════════════════════════════════════════════════
// CHECKLIST TEMPLATES
// ══════════════════════════════════════════════════════════════════
async function seedChecklistTemplates() {
  await ChecklistTemplate.deleteMany({});
  log('Cleared checklist templates');

  const templates = await ChecklistTemplate.create([
    {
      title: 'Daily Opening Checklist',
      category: 'opening',
      isActive: true,
      items: [
        { order: 1, label: 'Espresso machine powered on and heating', requiresPhoto: false, requiresNote: false },
        { order: 2, label: 'Espresso dialled in — shot time 25–30s confirmed', requiresPhoto: false, requiresNote: true },
        { order: 3, label: 'Grinders cleaned and purged', requiresPhoto: false, requiresNote: false },
        { order: 4, label: 'Refrigerator temperature checked (≤4°C)', requiresPhoto: true, requiresNote: false },
        { order: 5, label: 'All syrups filled, labelled, and in date', requiresPhoto: false, requiresNote: false },
        { order: 6, label: 'Counter and bar surfaces sanitised', requiresPhoto: false, requiresNote: false },
        { order: 7, label: 'Cups, lids, and sleeves stocked', requiresPhoto: false, requiresNote: false },
        { order: 8, label: 'Milk and dairy stock checked and rotated', requiresPhoto: false, requiresNote: false },
        { order: 9, label: 'POS system online and tested', requiresPhoto: false, requiresNote: false },
        { order: 10, label: 'Staff briefing completed', requiresPhoto: false, requiresNote: true },
      ],
    },
    {
      title: 'Daily Closing Checklist',
      category: 'closing',
      isActive: true,
      items: [
        { order: 1, label: 'Espresso machine backflushed with cleaning tablet', requiresPhoto: false, requiresNote: false },
        { order: 2, label: 'Steam wands cleaned and wiped', requiresPhoto: false, requiresNote: false },
        { order: 3, label: 'Portafilters and baskets soaked and cleaned', requiresPhoto: false, requiresNote: false },
        { order: 4, label: 'All surfaces sanitised', requiresPhoto: true, requiresNote: false },
        { order: 5, label: 'Blenders cleaned with cleaning tablets', requiresPhoto: false, requiresNote: false },
        { order: 6, label: 'Ice bins emptied and sanitised', requiresPhoto: false, requiresNote: false },
        { order: 7, label: 'Expired dairy discarded', requiresPhoto: false, requiresNote: true },
        { order: 8, label: 'Till counted and reconciled', requiresPhoto: false, requiresNote: true },
        { order: 9, label: 'Rubbish removed and bins cleaned', requiresPhoto: false, requiresNote: false },
        { order: 10, label: 'Store locked and alarm set', requiresPhoto: false, requiresNote: false },
      ],
    },
    {
      title: 'Weekly Deep Clean Checklist',
      category: 'cleaning',
      isActive: true,
      items: [
        { order: 1, label: 'Espresso machine descaled', requiresPhoto: false, requiresNote: true },
        { order: 2, label: 'Drip trays removed and deep cleaned', requiresPhoto: true, requiresNote: false },
        { order: 3, label: 'Grinder burrs checked and cleaned', requiresPhoto: false, requiresNote: false },
        { order: 4, label: 'Under-counter shelves wiped and restocked', requiresPhoto: false, requiresNote: false },
        { order: 5, label: 'Refrigerator shelves removed and sanitised', requiresPhoto: true, requiresNote: false },
        { order: 6, label: 'Freezer inventory checked and rotated', requiresPhoto: false, requiresNote: true },
        { order: 7, label: 'Floor deep mopped including under equipment', requiresPhoto: false, requiresNote: false },
        { order: 8, label: 'Waste and recycling area cleaned', requiresPhoto: false, requiresNote: false },
      ],
    },
    {
      title: 'Product Quality Spot Check',
      category: 'product_quality',
      isActive: true,
      items: [
        { order: 1, label: 'Espresso shot pulled and tasted — within spec', requiresPhoto: false, requiresNote: true },
        { order: 2, label: 'Milk texture checked — silky, no large bubbles', requiresPhoto: false, requiresNote: false },
        { order: 3, label: 'Matcha whisked to smooth consistency — no lumps', requiresPhoto: true, requiresNote: false },
        { order: 4, label: 'All drinks prepared to correct temperature', requiresPhoto: false, requiresNote: false },
        { order: 5, label: 'Presentation standards met — correct cup, correct label', requiresPhoto: true, requiresNote: false },
        { order: 6, label: 'Syrup pumps calibrated and consistent', requiresPhoto: false, requiresNote: false },
      ],
    },
    {
      title: 'Inventory Receiving Checklist',
      category: 'delivery_receiving',
      isActive: true,
      items: [
        { order: 1, label: 'Delivery arrived within booked window', requiresPhoto: false, requiresNote: true },
        { order: 2, label: 'Delivery vehicle temperature checked (refrigerated items)', requiresPhoto: false, requiresNote: true },
        { order: 3, label: 'All items on invoice present and counted', requiresPhoto: false, requiresNote: true },
        { order: 4, label: 'No damaged or compromised packaging accepted', requiresPhoto: true, requiresNote: true },
        { order: 5, label: 'Coffee roast dates confirmed — minimum 3 days post-roast', requiresPhoto: false, requiresNote: true },
        { order: 6, label: 'Items stored immediately in correct location', requiresPhoto: false, requiresNote: false },
        { order: 7, label: 'Delivery note signed and filed', requiresPhoto: true, requiresNote: false },
      ],
    },
  ]);

  log(`Seeded ${templates.length} checklist templates`);
  return templates;
}

// ══════════════════════════════════════════════════════════════════
// STORE RECIPES
// ══════════════════════════════════════════════════════════════════
async function seedStoreRecipes() {
  await StoreRecipe.deleteMany({});
  log('Cleared store recipes');

  const recipes = await StoreRecipe.create([
    {
      name: 'Java Latte',
      slug: 'java-latte',
      category: 'hot',
      sizes: [
        {
          label: 'Small',
          coffeeDose: 18,
          waterAmount: 36,
          milkAmount: 180,
          syrupAmount: 0,
          syrupType: '',
          additionalIngredients: [],
        },
        {
          label: 'Medium',
          coffeeDose: 18,
          waterAmount: 36,
          milkAmount: 240,
          syrupAmount: 0,
          syrupType: '',
          additionalIngredients: [],
        },
        {
          label: 'Large',
          coffeeDose: 20,
          waterAmount: 40,
          milkAmount: 320,
          syrupAmount: 0,
          syrupType: '',
          additionalIngredients: [],
        },
      ],
      buildOrder: [
        'Pull espresso shot into cup (18g in / 36g out / 25–30s)',
        'Steam milk to 60–65°C with silky microfoam',
        'Pour steamed milk over espresso in a steady stream',
        'Finish with a thin layer of foam',
        'Serve immediately',
      ],
      photos: [],
      targetPrepTimeSeconds: 120,
      costInfo: { ingredientCost: 1.2, sellingPrice: 5.5 },
      qualityStandards:
        '## Quality Standards\n\n- Espresso: rich brown crema, no blonde or pale shots\n- Milk: silky microfoam, no large bubbles, glossy surface\n- Temperature at service: 60–65°C\n- Ratio of milk to espresso must match size spec exactly\n- Served in preheated cup',
      commonMistakes: [
        'Steaming milk too hot (above 70°C scalds the proteins)',
        'Not preheating the cup — drink cools too fast',
        'Pulling a blonde shot — adjust grind finer',
        'Too much foam — this is a latte, not a cappuccino',
      ],
      requiredEquipment: ['Espresso machine', 'Grinder', 'Milk jug', 'Steam wand', 'Scale', 'Thermometer'],
      isActive: true,
    },
    {
      name: 'Iced Java Latte',
      slug: 'iced-java-latte',
      category: 'iced',
      sizes: [
        {
          label: 'Medium',
          coffeeDose: 18,
          waterAmount: 36,
          milkAmount: 200,
          syrupAmount: 0,
          syrupType: '',
          additionalIngredients: [{ name: 'Ice', amount: '200g' }],
        },
        {
          label: 'Large',
          coffeeDose: 20,
          waterAmount: 40,
          milkAmount: 280,
          syrupAmount: 0,
          syrupType: '',
          additionalIngredients: [{ name: 'Ice', amount: '250g' }],
        },
      ],
      buildOrder: [
        'Fill cup with ice to the top',
        'Pull espresso shot directly into a separate jug',
        'Pour milk over ice',
        'Pour espresso shot over milk — do not stir',
        'Add lid and serve',
      ],
      photos: [],
      targetPrepTimeSeconds: 90,
      costInfo: { ingredientCost: 1.3, sellingPrice: 6.0 },
      qualityStandards:
        '## Quality Standards\n\n- Ice must fill the cup fully before any liquid is added\n- Espresso poured last — creates visual layering effect\n- Milk must be cold (straight from fridge, ≤4°C)\n- Drink should be layered on handoff — customer stirs if preferred',
      commonMistakes: [
        'Pouring espresso before milk — loses the layered look',
        'Using warm or room-temperature milk',
        'Under-filling ice — drink dilutes too fast',
      ],
      requiredEquipment: ['Espresso machine', 'Grinder', 'Scale', 'Ice scoop', 'Cold milk'],
      isActive: true,
    },
    {
      name: 'Signature Matcha Latte',
      slug: 'signature-matcha-latte',
      category: 'matcha',
      sizes: [
        {
          label: 'Small',
          coffeeDose: 0,
          waterAmount: 60,
          milkAmount: 180,
          syrupAmount: 10,
          syrupType: 'Vanilla',
          additionalIngredients: [{ name: 'Ceremonial matcha', amount: '3g' }],
        },
        {
          label: 'Medium',
          coffeeDose: 0,
          waterAmount: 80,
          milkAmount: 240,
          syrupAmount: 15,
          syrupType: 'Vanilla',
          additionalIngredients: [{ name: 'Ceremonial matcha', amount: '4g' }],
        },
        {
          label: 'Large',
          coffeeDose: 0,
          waterAmount: 100,
          milkAmount: 320,
          syrupAmount: 20,
          syrupType: 'Vanilla',
          additionalIngredients: [{ name: 'Ceremonial matcha', amount: '5g' }],
        },
      ],
      buildOrder: [
        'Sift matcha powder into the matcha bowl',
        'Add water at 75°C (never boiling) and whisk in W motion until smooth',
        'Add vanilla syrup to the matcha base and stir',
        'Steam oat milk to 60–65°C',
        'Pour matcha base into cup',
        'Pour steamed milk over matcha',
        'Dust with matcha powder to finish',
      ],
      photos: [],
      targetPrepTimeSeconds: 150,
      costInfo: { ingredientCost: 1.8, sellingPrice: 6.5 },
      qualityStandards:
        '## Quality Standards\n\n- Matcha must be fully dissolved — zero lumps visible\n- Water temperature must not exceed 80°C\n- Vibrant green colour — pale or yellow matcha indicates poor quality or overheating\n- Milk silky and integrated\n- Matcha dust on top presented neatly',
      commonMistakes: [
        'Using boiling water — ruins the matcha and creates bitterness',
        'Not sifting matcha — causes lumps that never dissolve',
        'Skipping the whisk — a spoon is not sufficient',
        'Using wrong matcha grade — must be ceremonial, not culinary',
      ],
      requiredEquipment: ['Matcha bowl', 'Bamboo whisk', 'Sifter', 'Thermometer', 'Scale', 'Steam wand'],
      isActive: true,
    },
    {
      name: 'Hojicha Latte',
      slug: 'hojicha-latte',
      category: 'hojicha',
      sizes: [
        {
          label: 'Medium',
          coffeeDose: 0,
          waterAmount: 80,
          milkAmount: 220,
          syrupAmount: 10,
          syrupType: 'Brown Sugar',
          additionalIngredients: [{ name: 'Hojicha powder', amount: '5g' }],
        },
        {
          label: 'Large',
          coffeeDose: 0,
          waterAmount: 100,
          milkAmount: 300,
          syrupAmount: 15,
          syrupType: 'Brown Sugar',
          additionalIngredients: [{ name: 'Hojicha powder', amount: '6g' }],
        },
      ],
      buildOrder: [
        'Sift hojicha powder into bowl',
        'Add 85°C water and whisk until fully dissolved',
        'Add brown sugar syrup and stir',
        'Steam whole milk to 60–65°C',
        'Pour hojicha base into cup',
        'Pour steamed milk over hojicha',
        'Dust lightly with hojicha powder',
      ],
      photos: [],
      targetPrepTimeSeconds: 150,
      costInfo: { ingredientCost: 1.6, sellingPrice: 6.0 },
      qualityStandards:
        '## Quality Standards\n\n- Deep reddish-brown colour — lighter colour indicates insufficient powder\n- No lumps in hojicha base\n- Brown sugar complements the roasted notes without overpowering\n- Milk silky and smooth',
      commonMistakes: [
        'Under-dosing hojicha powder — weak, watery colour and taste',
        'Not whisking thoroughly — lumps make the drink gritty',
        'Over-sweetening — brown sugar should enhance, not dominate',
      ],
      requiredEquipment: ['Whisk', 'Sifter', 'Thermometer', 'Scale', 'Steam wand'],
      isActive: true,
    },
    {
      name: 'Classic Cappuccino',
      slug: 'classic-cappuccino',
      category: 'hot',
      sizes: [
        {
          label: 'Standard (6oz)',
          coffeeDose: 18,
          waterAmount: 36,
          milkAmount: 100,
          syrupAmount: 0,
          syrupType: '',
          additionalIngredients: [],
        },
      ],
      buildOrder: [
        'Preheat the 6oz ceramic cup',
        'Pull espresso shot (18g in / 36g out / 25–30s)',
        'Steam milk to 55–60°C with thick, dry microfoam',
        'Pour espresso into preheated cup',
        'Spoon foamed milk over espresso — equal thirds: espresso, milk, foam',
        'Dust with cocoa powder if requested',
      ],
      photos: [],
      targetPrepTimeSeconds: 120,
      costInfo: { ingredientCost: 1.0, sellingPrice: 5.0 },
      qualityStandards:
        '## Quality Standards\n\n- Equal thirds: espresso, steamed milk, dry foam\n- Served in ceramic 6oz cup only — never paper\n- Foam thick enough to hold a teaspoon of sugar for 3 seconds\n- Served between 55–60°C\n- Cocoa dusting applied only on customer request',
      commonMistakes: [
        'Too much milk — this becomes a flat white, not a cappuccino',
        'Wet foam — cappuccino foam must be dry and structured',
        'Serving in paper cup — always ceramic',
        'Wrong cup size — must be 6oz',
      ],
      requiredEquipment: ['Espresso machine', 'Grinder', 'Milk jug', 'Steam wand', 'Scale', '6oz ceramic cup'],
      isActive: true,
    },
  ]);

  log(`Seeded ${recipes.length} store recipes`);
  return recipes;
}

// ══════════════════════════════════════════════════════════════════
// EXCLUSIVE CONTENT (Investor)
// ══════════════════════════════════════════════════════════════════
async function seedInvestorContent() {
  await ExclusiveContent.deleteMany({});
  log('Cleared exclusive content');

  const content = await ExclusiveContent.create([
    {
      title: 'Java Times Q1 2025 Performance Report',
      slug: 'java-times-q1-2025-performance-report',
      contentType: 'article',
      body: `# Java Times Q1 2025 Performance Report

Dear Java Times Investors,

We are pleased to share our Q1 2025 performance highlights with our valued shareholders.

## Financial Highlights
- Revenue grew 28% year-over-year
- Same-store sales up 14% across all locations
- New store openings: 3 (Lahore DHA, Islamabad F7, Karachi Clifton)
- EBITDA margin improved to 18% from 14% in Q1 2024

## Operations
Our investment in the JavaRista platform has begun delivering measurable operational improvements:
- Average drink prep time reduced from 4.2 minutes to 2.8 minutes
- Checklist compliance rate: 94% across all stores
- Staff certification rate: 67% of employees hold at least Level 1 certification

## Expansion Plans
We are on track to open 8 new locations in 2025, with 2 international locations under evaluation in the UAE market.

## Looking Ahead
Q2 2025 is expected to see continued growth driven by our summer seasonal menu launch and ongoing staff development through the JavaRista Academy.

Thank you for your continued confidence in Java Times Caffé.`,
      mediaUrls: [],
      tags: ['quarterly report', 'financials', 'Q1 2025'],
      requiredRole: 'investor',
      publishedAt: new Date('2025-04-15'),
      isActive: true,
    },
    {
      title: 'Ethiopia Sourcing Story — Yirgacheffe Cooperative',
      slug: 'ethiopia-sourcing-story-yirgacheffe',
      contentType: 'sourcing_story',
      body: `# Ethiopia Sourcing Story — Yirgacheffe Cooperative

## The Origin
In the highlands of southern Ethiopia, at altitudes between 1,800 and 2,200 metres above sea level, the Yirgacheffe region produces some of the most celebrated coffees in the world.

## Our Partnership
Java Times has partnered directly with the Kochere Cooperative, a farmer-owned collective of 1,200 smallholder farmers across 14 villages. This direct trade relationship ensures:
- Farmers receive 30–40% above commodity price
- Full traceability from farm to cup
- Reinvestment in community infrastructure

## The Coffee
- **Variety:** Heirloom Ethiopian landraces
- **Process:** Natural (sun-dried on raised beds)
- **Harvest:** October–January
- **Altitude:** 1,800–2,200m
- **Flavour profile:** Blueberry, jasmine, dark chocolate, bergamot

## Why It Matters
This sourcing story is about more than great coffee. It is about building supply chains that are transparent, equitable, and sustainable — values that sit at the heart of Java Times.`,
      mediaUrls: [],
      tags: ['sourcing', 'ethiopia', 'yirgacheffe', 'direct trade'],
      requiredRole: 'investor',
      publishedAt: new Date('2025-03-01'),
      isActive: true,
    },
    {
      title: 'Java Times Expansion Strategy 2025–2027',
      slug: 'java-times-expansion-strategy-2025-2027',
      contentType: 'article',
      body: `# Java Times Expansion Strategy 2025–2027

## Vision
To become the leading specialty coffee brand in South Asia by 2027, with a presence across Pakistan's top 10 cities and two international markets.

## Current Footprint
- 12 stores across Karachi, Lahore, and Islamabad
- 340 employees
- 3 central commissary kitchens

## 3-Year Targets
| Year | New Stores | Total Stores | Markets |
|---|---|---|---|
| 2025 | 8 | 20 | PK + UAE pilot |
| 2026 | 12 | 32 | PK + UAE + KSA |
| 2027 | 16 | 48 | PK + GCC |

## Investment Requirements
The 2025–2027 expansion requires approximately PKR 480M in capital investment, primarily allocated to:
- New store fit-outs: 65%
- Supply chain infrastructure: 20%
- Technology and platform: 10%
- Working capital: 5%

## Risk Factors
- Currency volatility in export markets
- Specialty coffee supply chain constraints
- Talent acquisition at scale

We remain confident in our unit economics and the strength of the Java Times brand to support this growth trajectory.`,
      mediaUrls: [],
      tags: ['expansion', 'strategy', 'growth', '2025'],
      requiredRole: 'investor',
      publishedAt: new Date('2025-02-01'),
      isActive: true,
    },
    {
      title: 'Investor Briefing — JavaRista Platform ROI',
      slug: 'investor-briefing-javarista-platform-roi',
      contentType: 'article',
      body: `# Investor Briefing — JavaRista Platform ROI

## Overview
The JavaRista platform represents our most significant operational technology investment to date. This briefing outlines the measurable return on investment achieved since launch.

## Operational Improvements
| Metric | Before JavaRista | After JavaRista | Improvement |
|---|---|---|---|
| Avg prep time | 4.2 min | 2.8 min | -33% |
| Checklist compliance | 61% | 94% | +54% |
| Staff cert rate | 12% | 67% | +458% |
| Recipe consistency score | 72% | 91% | +26% |

## Financial Impact
- Labour efficiency gains: estimated PKR 2.4M saved annually
- Reduced waste from inconsistent recipes: PKR 800K annually
- Faster onboarding (3 weeks → 1 week): PKR 1.2M annually

## Platform Investment
- Development cost: PKR 6.8M
- Annual maintenance: PKR 1.2M
- Estimated payback period: 14 months

## Conclusion
JavaRista has delivered measurable, quantifiable returns within its first year of operation. We will continue investing in the platform as a core competitive advantage.`,
      mediaUrls: [],
      tags: ['JavaRista', 'ROI', 'technology', 'operations'],
      requiredRole: 'investor',
      publishedAt: new Date('2025-05-01'),
      isActive: true,
    },
  ]);

  log(`Seeded ${content.length} exclusive content items`);
  return content;
}

// ══════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════
async function main() {
  try {
    await connect();

    log('Starting full seed...');

    const users = await seedUsers();
    const adminUser = users.find((u) => u.role === 'owner')!;

    const brewMethods = await seedBrewMethods();
    await seedRecipes(brewMethods, adminUser);
    await seedAcademy();
    await seedPlaybooks(adminUser);
    await seedChecklistTemplates();
    await seedStoreRecipes();
    await seedInvestorContent();

    log('');
    log('Seed complete. Summary:');
    log(`   Users:                 ${users.length}`);
    log('   Brew Methods:          10');
    log('   Recipes:               6');
    log('   Courses:               4 (2 community, 2 certification)');
    log('   Playbooks:             5');
    log('   Checklist Templates:   5');
    log('   Store Recipes:         5');
    log('   Investor Content:      4');
    log('');
    log('Test accounts:');
    log('   admin@javatimes.com     / Admin@1234      (admin)');
    log('   employee@javatimes.com  / Employee@1234   (employee)');
    log('   investor@javatimes.com  / Investor@1234   (investor)');
    log('   community@javatimes.com / Community@1234  (community)');

    process.exit(0);
  } catch (err) {
    console.error('[SEED ERROR]', err);
    process.exit(1);
  }
}

main();
