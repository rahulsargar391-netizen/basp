import express from 'express'
import fs from 'fs'
import path from 'path'
import QRCode from 'qrcode'
import upload, { uploadDir, hasValidSignature } from '../middleware/upload.js'
import { protect, authorize } from '../middleware/auth.js'
import { Certificate, User, LedgerEntry, ActivityLog } from '../models/index.js'
import { sha256File, makeCertCode } from '../utils/hash.js'
import { logActivity } from '../utils/log.js'
import { institutionNames } from '../config/institutions.js'

const router = express.Router()

const firstClientUrl = () =>
  (process.env.CLIENT_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)[0] || 'http://localhost:5173'

const verifyUrl = (code) => `${firstClientUrl()}/verify/${code}`

// Only send safe fields, never the stored file name
const safeCert = (c) => ({
  id: c.id,
  certCode: c.certCode,
  title: c.title,
  description: c.description,
  issueDate: c.issueDate,
  originalName: c.originalName,
  mimeType: c.mimeType,
  fileSize: c.fileSize,
  fileHash: c.fileHash,
  showName: c.showName,
  status: c.status,
  reviewNote: c.reviewNote,
  reviewedAt: c.reviewedAt,
  createdAt: c.createdAt,
  institution: c.institution
    ? { id: c.institution.id, name: c.institution.institutionName }
    : null,
  student: c.student
    ? { id: c.student.id, name: c.student.name, email: c.student.email }
    : null,
  ledger: c.ledger
    ? {
        block: c.ledger.id,
        entryHash: c.ledger.entryHash,
        prevHash: c.ledger.prevHash,
        recordedAt: c.ledger.recordedAt,
        simulated: true,
      }
    : null,
})

const fullInclude = [
  { model: User, as: 'institution', attributes: ['id', 'institutionName'] },
  { model: User, as: 'student', attributes: ['id', 'name', 'email'] },
  { model: LedgerEntry, as: 'ledger' },
]

// GET /api/certificates/institutions  (approved colleges a student can choose)
router.get('/institutions', protect, async (req, res) => {
  const list = await User.findAll({
    where: {
      role: 'institution',
      isActive: true,
      isApproved: true,
      institutionName: institutionNames,
    },
    attributes: ['id', 'institutionName'],
    order: [['institutionName', 'ASC']],
  })
  res.json({ institutions: list.map((i) => ({ id: i.id, name: i.institutionName })) })
})

// GET /api/certificates/mine
router.get('/mine', protect, authorize('student'), async (req, res) => {
  const list = await Certificate.findAll({
    where: { studentId: req.user.id },
    include: fullInclude,
    order: [['createdAt', 'DESC']],
  })
  res.json({ certificates: list.map(safeCert) })
})

// POST /api/certificates  (upload a new certificate)
router.post('/', protect, authorize('student'), (req, res) => {
  upload.single('file')(req, res, async (err) => {
    const removeFile = () => {
      if (req.file) fs.unlink(req.file.path, () => {})
    }

    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (maximum 5 MB)' : err.message
      return res.status(400).json({ message })
    }

    try {
      const { title, description, institutionId, issueDate, showName } = req.body

      if (!req.file) {
        return res.status(400).json({ message: 'Please choose a file' })
      }
      if (!hasValidSignature(req.file.path, req.file.mimetype)) {
        removeFile()
        return res.status(400).json({ message: 'The file content does not match its type' })
      }
      if (!title || !title.trim() || !institutionId) {
        removeFile()
        return res.status(400).json({ message: 'Title and institution are required' })
      }

      const institution = await User.findOne({
        where: { id: institutionId, role: 'institution', isActive: true, isApproved: true },
      })
      if (!institution) {
        removeFile()
        return res.status(400).json({ message: 'Please choose a valid institution' })
      }

      // Step 1 of verification: the SHA-256 fingerprint of the uploaded file
      const fileHash = await sha256File(req.file.path)

      const cert = await Certificate.create({
        certCode: makeCertCode(),
        title: title.trim().slice(0, 150),
        description: description ? description.trim() : null,
        issueDate: issueDate || null,
        originalName: req.file.originalname.slice(0, 250),
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        fileHash,
        showName: showName !== 'false',
        studentId: req.user.id,
        institutionId: institution.id,
      })

      await logActivity({
        userId: req.user.id,
        action: 'UPLOAD',
        details: `${cert.certCode} sent to ${institution.institutionName}`,
        targetId: cert.id,
      })

      const full = await Certificate.findByPk(cert.id, { include: fullInclude })
      res.status(201).json({ certificate: safeCert(full) })
    } catch (error) {
      removeFile()
      console.error('Upload error:', error.message)
      res.status(500).json({ message: 'Server error, please try again' })
    }
  })
})

// Who may see a certificate: its student, its institution, or an admin
const canSee = (user, cert) =>
  user.role === 'admin' || cert.studentId === user.id || cert.institutionId === user.id

// GET /api/certificates/:id
router.get('/:id', protect, async (req, res) => {
  const cert = await Certificate.findByPk(req.params.id, { include: fullInclude })
  if (!cert) return res.status(404).json({ message: 'Certificate not found' })
  if (!canSee(req.user, cert)) return res.status(403).json({ message: 'You do not have permission' })

  const verifications = await ActivityLog.findAll({
    where: { targetId: cert.id, action: ['VERIFY_VIEW', 'VERIFY_CHECK'] },
    order: [['createdAt', 'DESC']],
    limit: 20,
  })

  res.json({
    certificate: safeCert(cert),
    verifications: verifications.map((v) => ({
      id: v.id,
      action: v.action,
      details: v.details,
      createdAt: v.createdAt,
    })),
  })
})

// GET /api/certificates/:id/qr  (QR code for an approved certificate)
router.get('/:id/qr', protect, async (req, res) => {
  const cert = await Certificate.findByPk(req.params.id)
  if (!cert) return res.status(404).json({ message: 'Certificate not found' })
  if (!canSee(req.user, cert)) return res.status(403).json({ message: 'You do not have permission' })
  if (cert.status !== 'approved') {
    return res.status(409).json({ message: 'A QR code is only available after approval' })
  }

  const url = verifyUrl(cert.certCode)
  const dataUrl = await QRCode.toDataURL(url, {
    width: 320,
    margin: 2,
    color: { dark: '#0b1220', light: '#ffffff' },
  })
  res.json({ dataUrl, verifyUrl: url, certCode: cert.certCode })
})

// GET /api/certificates/:id/file  (private file download)
router.get('/:id/file', protect, async (req, res) => {
  const cert = await Certificate.findByPk(req.params.id)
  if (!cert) return res.status(404).json({ message: 'Certificate not found' })
  if (!canSee(req.user, cert)) return res.status(403).json({ message: 'You do not have permission' })

  const filePath = path.join(uploadDir, cert.storedName)
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File is missing on the server' })
  }

  res.type(cert.mimeType)
  res.setHeader('Content-Disposition', 'inline')
  res.sendFile(filePath)
})

export default router
