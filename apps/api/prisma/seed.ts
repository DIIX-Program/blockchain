import { PrismaClient, UserRole, OrganizationType, BatchStatus, EventType, DetectionMethod, AlertSeverity, AlertStatus, AnchorStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting cold-chain database seeding...');

  // Clean existing records in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.dataAnchor.deleteMany();
  await prisma.anomalyAlert.deleteMany();
  await prisma.supplyChainEvent.deleteMany();
  await prisma.sensorReading.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.device.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  console.log('🧹 Cleaned existing database records.');

  // 1. Organizations
  const orgProducer = await prisma.organization.create({
    data: {
      name: 'VaxLab BioPharma Inc.',
      code: 'ORG-PROD-VAX',
      type: OrganizationType.PRODUCER,
      address: '100 Innovation Boulevard, Saigon Hi-Tech Park, Ho Chi Minh City',
      contactEmail: 'operations@vaxlab.com',
    },
  });

  const orgTransporter = await prisma.organization.create({
    data: {
      name: 'ColdTrans Logistics Corp.',
      code: 'ORG-CARRIER-01',
      type: OrganizationType.LOGISTICS_PROVIDER,
      address: '45 Maritime Freight Way, Da Nang Port, Da Nang',
      contactEmail: 'dispatch@coldtrans.com',
    },
  });

  const orgWarehouse = await prisma.organization.create({
    data: {
      name: 'BioDepot Central Cold-Storage',
      code: 'ORG-WH-CENTRAL',
      type: OrganizationType.WAREHOUSE,
      address: '12 Logistics Industrial Park, Long Bien, Hanoi',
      contactEmail: 'warehouse@biodepot.com',
    },
  });

  const orgRetailer = await prisma.organization.create({
    data: {
      name: 'PharmaCare Medical Clinics',
      code: 'ORG-RETAIL-01',
      type: OrganizationType.RETAILER,
      address: '88 Healthcare Avenue, Ninh Kieu, Can Tho',
      contactEmail: 'procurement@pharmacare.vn',
    },
  });

  console.log(' Seeded 4 Organizations (Producer, Logistics, Warehouse, Retailer).');

  // 2. Users (Hashed password: password123)
  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('password123', salt);

  const userAdmin = await prisma.user.create({
    data: {
      email: 'admin@coldchain.internal',
      passwordHash: defaultPasswordHash,
      fullName: 'System Administrator',
      role: UserRole.ADMIN,
      organizationId: orgProducer.id,
    },
  });

  const userProducer = await prisma.user.create({
    data: {
      email: 'producer@vaxlab.com',
      passwordHash: defaultPasswordHash,
      fullName: 'Dr. Nguyen Van Anh (QC Director)',
      role: UserRole.PRODUCER,
      organizationId: orgProducer.id,
    },
  });

  const userTransporter = await prisma.user.create({
    data: {
      email: 'driver@coldtrans.com',
      passwordHash: defaultPasswordHash,
      fullName: 'Tran Van Binh (Lead Fleet Driver)',
      role: UserRole.TRANSPORTER,
      organizationId: orgTransporter.id,
    },
  });

  const userWarehouse = await prisma.user.create({
    data: {
      email: 'operator@biodepot.com',
      passwordHash: defaultPasswordHash,
      fullName: 'Le Thi Cam (Cold-Vault Supervisor)',
      role: UserRole.WAREHOUSE_OPERATOR,
      organizationId: orgWarehouse.id,
    },
  });

  const userViewer = await prisma.user.create({
    data: {
      email: 'auditor@regulator.gov',
      passwordHash: defaultPasswordHash,
      fullName: 'Pham Minh Duc (Food & Drug Inspector)',
      role: UserRole.VIEWER,
      organizationId: orgRetailer.id,
    },
  });

  console.log(' Seeded 5 RBAC Users (ADMIN, PRODUCER, TRANSPORTER, WAREHOUSE_OPERATOR, VIEWER).');

  // 3. Products
  const prodVaccine = await prisma.product.create({
    data: {
      sku: 'PROD-VAX-MRNA-01',
      name: 'VaxGuard mRNA Polyvalent Vaccine (0.5ml)',
      description: 'Ultra-sensitive mRNA vaccine formulation requiring strict 2.0°C to 8.0°C cold storage.',
      tempMinC: 2.00,
      tempMaxC: 8.00,
      humidityMin: 30.00,
      humidityMax: 65.00,
      maxTransitHours: 72,
      organizationId: orgProducer.id,
    },
  });

  const prodSalmon = await prisma.product.create({
    data: {
      sku: 'PROD-SALMON-PREM-02',
      name: 'Premium Sashimi-Grade Atlantic Salmon Fillet',
      description: 'Fresh chilled fish fillets requiring sub-ambient cold chain between -2.0°C and 2.0°C.',
      tempMinC: -2.00,
      tempMaxC: 2.00,
      humidityMin: 70.00,
      humidityMax: 95.00,
      maxTransitHours: 48,
      organizationId: orgProducer.id,
    },
  });

  console.log(' Seeded 2 Products (Pharma mRNA Vaccine & Fresh Salmon).');

  // 4. Batches
  const batchVaccine = await prisma.batch.create({
    data: {
      batchNumber: 'BATCH-VAX-2026-001',
      productId: prodVaccine.id,
      producerId: orgProducer.id,
      currentHolderId: orgTransporter.id,
      status: BatchStatus.IN_TRANSIT,
      manufactureDate: new Date('2026-10-15T08:00:00.000Z'),
      expiryDate: new Date('2027-04-15T08:00:00.000Z'),
      quantity: 5000,
      qrCodeUrl: 'http://localhost:5173/trace/BATCH-VAX-2026-001',
    },
  });

  const batchSalmon = await prisma.batch.create({
    data: {
      batchNumber: 'BATCH-SALMON-2026-002',
      productId: prodSalmon.id,
      producerId: orgProducer.id,
      currentHolderId: orgWarehouse.id,
      status: BatchStatus.STORED,
      manufactureDate: new Date('2026-10-16T04:00:00.000Z'),
      expiryDate: new Date('2026-10-31T04:00:00.000Z'),
      quantity: 1200,
      qrCodeUrl: 'http://localhost:5173/trace/BATCH-SALMON-2026-002',
    },
  });

  console.log('🏷️ Seeded 2 Traceability Batches.');

  // 5. Devices
  const deviceTruck = await prisma.device.create({
    data: {
      deviceCode: 'DEV-TRUCK-REFRIG-01',
      model: 'Simulated-Teltonika-TMT250-BLE',
      isSimulated: true,
      organizationId: orgTransporter.id,
      batteryPercent: 96.50,
      lastSeenAt: new Date(),
    },
  });

  const deviceWarehouse = await prisma.device.create({
    data: {
      deviceCode: 'DEV-WH-VAULT-02',
      model: 'Simulated-ESP32-SensirionSHT35',
      isSimulated: true,
      organizationId: orgWarehouse.id,
      batteryPercent: 100.00,
      lastSeenAt: new Date(),
    },
  });

  console.log(' Seeded 2 Telemetry Devices (Refrigerated Truck & Warehouse Sensor).');

  // 6. Sensor Readings for batchVaccine
  const baseTime = new Date('2026-10-17T08:00:00.000Z').getTime();

  const reading1 = await prisma.sensorReading.create({
    data: {
      batchId: batchVaccine.id,
      deviceId: deviceTruck.id,
      sequenceNumber: BigInt(1001),
      recordedAt: new Date(baseTime),
      temperatureC: 4.10,
      humidityPercent: 45.20,
      latitude: 10.762622,
      longitude: 106.660172,
      isSimulated: true,
      canonicalHash: '1111111111111111111111111111111111111111111111111111111111111111',
      anchored: true,
    },
  });

  const reading2 = await prisma.sensorReading.create({
    data: {
      batchId: batchVaccine.id,
      deviceId: deviceTruck.id,
      sequenceNumber: BigInt(1002),
      recordedAt: new Date(baseTime + 300000), // +5 mins
      temperatureC: 4.35,
      humidityPercent: 46.10,
      latitude: 10.823099,
      longitude: 106.629662,
      isSimulated: true,
      canonicalHash: '2222222222222222222222222222222222222222222222222222222222222222',
      anchored: true,
    },
  });

  const reading3 = await prisma.sensorReading.create({
    data: {
      batchId: batchVaccine.id,
      deviceId: deviceTruck.id,
      sequenceNumber: BigInt(1003),
      recordedAt: new Date(baseTime + 600000), // +10 mins
      temperatureC: 4.70,
      humidityPercent: 45.80,
      latitude: 10.950211,
      longitude: 106.581230,
      isSimulated: true,
      canonicalHash: '3333333333333333333333333333333333333333333333333333333333333333',
      anchored: true,
    },
  });

  console.log(' Seeded 3 compliant Sensor Readings.');

  // 7. Supply Chain Events
  await prisma.supplyChainEvent.create({
    data: {
      batchId: batchVaccine.id,
      eventType: EventType.HARVEST_MANUFACTURE,
      actorId: userProducer.id,
      fromOrgId: orgProducer.id,
      toOrgId: orgProducer.id,
      locationName: 'VaxLab Cleanroom B4, HCMC',
      latitude: 10.762622,
      longitude: 106.660172,
      notes: 'Vaccine batch packaging inspected and verified compliant with WHO PQS guidelines.',
    },
  });

  await prisma.supplyChainEvent.create({
    data: {
      batchId: batchVaccine.id,
      eventType: EventType.DISPATCH,
      actorId: userProducer.id,
      fromOrgId: orgProducer.id,
      toOrgId: orgTransporter.id,
      locationName: 'VaxLab Loading Dock #2, HCMC',
      latitude: 10.762622,
      longitude: 106.660172,
      notes: 'Loaded into Reefer Truck #01 with active temperature logging active.',
    },
  });

  await prisma.supplyChainEvent.create({
    data: {
      batchId: batchVaccine.id,
      eventType: EventType.CUSTODY_HANDOVER,
      actorId: userTransporter.id,
      fromOrgId: orgProducer.id,
      toOrgId: orgTransporter.id,
      locationName: 'National Highway 1A Checkpoint, Binh Duong',
      latitude: 10.950211,
      longitude: 106.581230,
      notes: 'Formal handover acceptance signed cryptographically by driver Tran Van Binh.',
      txHash: '0x88df67142b91c0451a83021948ba20194821a08234857b293847a9182374b918',
    },
  });

  console.log('🚚 Seeded 3 Supply Chain Handover Events.');

  // 8. Anomaly Alert (Demonstrating resolution tracking)
  await prisma.anomalyAlert.create({
    data: {
      batchId: batchVaccine.id,
      deviceId: deviceTruck.id,
      detectionMethod: DetectionMethod.HYBRID,
      severity: AlertSeverity.LOW,
      anomalyScore: 0.6215,
      ruleViolated: 'MINOR_RATE_OF_CHANGE',
      explanation: 'Transient temperature rise of +0.35°C detected during driver door inspection; safely stabilized below 5.0°C.',
      readingWindowStart: new Date(baseTime),
      readingWindowEnd: new Date(baseTime + 600000),
      status: AlertStatus.RESOLVED,
      acknowledgedBy: userTransporter.id,
      acknowledgedAt: new Date(baseTime + 700000),
      resolvedBy: userProducer.id,
      resolvedAt: new Date(baseTime + 800000),
      resolutionNotes: 'Inspection log reviewed; reef unit compressor active; thermal buffer uncompromised.',
    },
  });

  console.log('⚠️ Seeded 1 Anomaly Alert record.');

  // 9. Data Anchor
  await prisma.dataAnchor.create({
    data: {
      batchId: batchVaccine.id,
      schemaVersion: '1.0.0',
      hashAlgorithm: 'SHA-256',
      canonicalHash: '3a7b9c64ef58bc32a4e98f45a7b9c64ef58bc32a4e98f45a7b9c64ef58bc32a4',
      readingCount: 3,
      txHash: '0x7b58c92a10d94f27918a93ef07a932d847b2c91837f401928374a91082c9183a',
      blockNumber: BigInt(12),
      status: AnchorStatus.CONFIRMED,
      confirmedAt: new Date(baseTime + 650000),
    },
  });

  console.log('⛓️ Seeded 1 Blockchain Data Anchor record.');

  // 10. Audit Log
  await prisma.auditLog.create({
    data: {
      userId: userAdmin.id,
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'SYSTEM',
      entityId: 'ROOT',
      payloadAfter: { version: '1.0.0', stage: 'Task 02 DB Seed' },
      ipAddress: '127.0.0.1',
      userAgent: 'SeedScript/Prisma',
    },
  });

  console.log('📝 Seeded Audit Log entry.');
  console.log('✅ Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
