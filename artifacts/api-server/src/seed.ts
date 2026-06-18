import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, staff, tables, menu_items } from '@workspace/db';
import { count } from 'drizzle-orm';
import { logger } from './lib/logger.js';

export async function seedIfEmpty() {
  const [staffCount] = await db.select({ c: count(staff.id) }).from(staff);
  if (Number(staffCount.c) > 0) {
    logger.info('Database already seeded — skipping');
    return;
  }

  logger.info('Seeding initial data...');

  const adminUsername = process.env.DEFAULT_ADMIN_USERNAME ?? 'admin';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD ?? '';
  const kitchenUsername = process.env.DEFAULT_KITCHEN_USERNAME ?? 'kitchen';
  const kitchenPassword = process.env.DEFAULT_KITCHEN_PASSWORD ?? '';
  const waiterUsername = process.env.DEFAULT_WAITER_USERNAME ?? 'waiter';
  const waiterPassword = process.env.DEFAULT_WAITER_PASSWORD ?? '';

  if (!adminPassword) throw new Error('DEFAULT_ADMIN_PASSWORD must be set before seeding');
  if (!kitchenPassword) throw new Error('DEFAULT_KITCHEN_PASSWORD must be set before seeding');
  if (!waiterPassword) throw new Error('DEFAULT_WAITER_PASSWORD must be set before seeding');

  await db.insert(staff).values([
    {
      username: adminUsername,
      password_hash: await bcrypt.hash(adminPassword, 12),
      full_name: 'System Administrator',
      role: 'admin',
    },
    {
      username: kitchenUsername,
      password_hash: await bcrypt.hash(kitchenPassword, 12),
      full_name: 'Kitchen Staff',
      role: 'kitchen',
    },
    {
      username: waiterUsername,
      password_hash: await bcrypt.hash(waiterPassword, 12),
      full_name: 'Floor Waiter',
      role: 'waiter',
    },
  ]);

  // Create 20 tables
  const tableValues = Array.from({ length: 20 }, (_, i) => ({
    table_number: i + 1,
    qr_token: uuidv4(),
    capacity: 4,
  }));
  await db.insert(tables).values(tableValues);

  // Seed a minimal generic starter menu — one image-less placeholder per category.
  // Marked unavailable so diners see a clean menu until the restaurant configures
  // real items; the admin sees these as editable templates to rename/price/enable.
  const SAMPLE_DESC = 'Sample item — edit, price, add an image and mark available, or delete it from the admin panel.';
  await db.insert(menu_items).values([
    { name: 'Sample Main Course', description: SAMPLE_DESC, price: '0.00', category: 'Main Course', prep_time: 15, available: false },
    { name: 'Sample Appetizer', description: SAMPLE_DESC, price: '0.00', category: 'Appetizer', prep_time: 10, available: false },
    { name: 'Sample Bread', description: SAMPLE_DESC, price: '0.00', category: 'Bread', prep_time: 5, available: false },
    { name: 'Sample Dessert', description: SAMPLE_DESC, price: '0.00', category: 'Dessert', prep_time: 5, available: false },
    { name: 'Sample Beverage', description: SAMPLE_DESC, price: '0.00', category: 'Beverage', prep_time: 3, available: false },
  ]);

  logger.info('Seeding complete', {
    admin: adminUsername,
    kitchen: kitchenUsername,
    waiter: waiterUsername,
    note: 'Staff must change passwords on first login',
  });
}
