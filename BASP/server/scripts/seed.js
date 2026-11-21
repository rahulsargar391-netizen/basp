// Creates demo accounts and one approved sample certificate (testing only)
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'url'
import connectDB, { sequelize } from '../config/db.js'
import { User, Certificate, LedgerEntry, ActivityLog } from '../models/index.js'
import { uploadDir } from '../middleware/upload.js'
import { sha256File, makeCertCode } from '../utils/hash.js'
import { appendToLedger } from '../utils/ledger.js'
import { institutions } from '../config/institutions.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const accountsOnly = process.argv.includes('--accounts-only')
const adminPassword = process.env.ADMIN_PASSWORD

const accounts = [
  {
    name: process.env.ADMIN_NAME || 'BASP Admin',
    email: (process.env.ADMIN_EMAIL || 'admin@gmail.com').toLowerCase(),
    password: adminPassword,
    role: 'admin',
  },
  ...institutions.map((institution) => ({
    name: `${institution.name} Registrar`,
    email: institution.email,
    password: '12345678',
    role: 'institution',
    institutionName: institution.name,
  })),
  ...(!accountsOnly ? [{
    name: 'Demo Student',
    email: 'student@basp.test',
    password: 'Student12345',
    role: 'student',
  }] : []),
]

const run = async () => {
  try {
    if (!adminPassword || adminPassword.length < 12 || adminPassword === 'CHANGE_ME') {
      throw new Error('Set ADMIN_PASSWORD to at least 12 characters before seeding')
    }

    await connectDB()
    await sequelize.sync()

    if (accountsOnly) {
      const existingRows = await Promise.all([
        User.count(),
        Certificate.count(),
        LedgerEntry.count(),
        ActivityLog.count(),
      ])
      if (existingRows.some((count) => count !== 0)) {
        throw new Error('Accounts-only setup requires empty tables; no account changes were made')
      }

      await sequelize.transaction(async (transaction) => {
        for (const account of accounts) {
          await User.create({
            name: account.name,
            email: account.email,
            password: await bcrypt.hash(account.password, 10),
            role: account.role,
            institutionName: account.institutionName || null,
            isApproved: true,
          }, { transaction })
        }
      })
    } else {
      const admin = await User.findOne({ where: { role: 'admin' } })
      if (admin) {
        await admin.update({
          name: process.env.ADMIN_NAME || 'BASP Admin',
          email: (process.env.ADMIN_EMAIL || 'admin@gmail.com').toLowerCase(),
          password: await bcrypt.hash(adminPassword, 10),
          role: 'admin',
          isApproved: true,
          isActive: true,
        })
        console.log('Updated admin credentials')
      }

      for (const a of accounts) {
        const exists = await User.findOne({ where: { email: a.email } })
        if (exists) {
          console.log('Already exists:', a.email)
          continue
        }
        await User.create({
          name: a.name,
          email: a.email,
          password: await bcrypt.hash(a.password, 10),
          role: a.role,
          institutionName: a.institutionName || null,
          isApproved: true,
        })
        console.log('Created', a.role + ':', a.email)
      }

      const institutionPassword = await bcrypt.hash('12345678', 10)
      const institutionAccounts = await User.findAll({ where: { role: 'institution' } })
      for (const institution of institutionAccounts) {
        await institution.update({
          password: institutionPassword,
          isApproved: true,
          isActive: true,
        })
      }
      console.log(`Updated password for ${institutionAccounts.length} institution accounts`)
    }

    const sample = path.join(__dirname, '..', '..', 'samples', 'sample-certificate.pdf')
    const count = await Certificate.count()
    if (!accountsOnly && count === 0 && fs.existsSync(sample)) {
      const student = await User.findOne({ where: { email: 'student@basp.test' } })
      const college = await User.findOne({ where: { email: institutions[0].email } })

      const storedName = crypto.randomBytes(16).toString('hex') + '.pdf'
      fs.copyFileSync(sample, path.join(uploadDir, storedName))
      const fileHash = await sha256File(path.join(uploadDir, storedName))

      const cert = await Certificate.create({
        certCode: makeCertCode(),
        title: 'Sample Python Programming Certificate',
        description: 'Demo certificate created by the seed script.',
        issueDate: '2026-06-30',
        originalName: 'sample-certificate.pdf',
        storedName,
        mimeType: 'application/pdf',
        fileSize: fs.statSync(sample).size,
        fileHash,
        showName: true,
        status: 'approved',
        reviewNote: 'Approved (demo data)',
        reviewedAt: new Date(),
        studentId: student.id,
        institutionId: college.id,
      })
      await appendToLedger(cert)
      console.log('Created approved sample certificate:', cert.certCode)
      console.log('Public link: ' + process.env.CLIENT_URL + '/verify/' + cert.certCode)
    }

    console.log(accountsOnly ? 'Accounts-only setup finished.' : 'Seed finished.')
  } catch (error) {
    console.error('Seed failed:', error.message)
    process.exitCode = 1
  } finally {
    await sequelize.close()
  }
}

run()
