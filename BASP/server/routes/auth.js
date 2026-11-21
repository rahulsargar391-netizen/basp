import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models/index.js'
import { protect } from '../middleware/auth.js'
import { rateLimit } from '../utils/rateLimit.js'
import { logActivity } from '../utils/log.js'
import { institutionNames } from '../config/institutions.js'

const router = express.Router()

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const makeToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })

// Only send safe fields back, never the password
export const safeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  institutionName: user.institutionName,
  isApproved: user.isApproved,
})

const loginLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 })
const registerLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 })

// Shared register logic for students and institutions
const registerUser = async (req, res, role) => {
  const { name, email, password, institutionName } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }
  if (role === 'student' && !name) {
    return res.status(400).json({ message: 'Name, email and password are required' })
  }
  if (!emailPattern.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email' })
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' })
  }
  if (role === 'institution' && !institutionName) {
    return res.status(400).json({ message: 'Institution name is required' })
  }
  if (role === 'institution' && !institutionNames.includes(institutionName.trim())) {
    return res.status(400).json({ message: 'Please choose a supported institution' })
  }

  const cleanEmail = email.trim().toLowerCase()
  const exists = await User.findOne({ where: { email: cleanEmail } })
  if (exists) {
    return res.status(409).json({ message: 'This email is already registered' })
  }

  const user = await User.create({
    name: role === 'institution' ? institutionName.trim() : name.trim(),
    email: cleanEmail,
    password: await bcrypt.hash(password, 10),
    role,
    institutionName: role === 'institution' ? institutionName.trim() : null,
    // Students are active at once. Institutions wait for admin approval.
    isApproved: role !== 'institution',
  })

  await logActivity({ userId: user.id, action: 'REGISTER', details: `${role}: ${user.email}` })
  res.status(201).json({ token: makeToken(user), user: safeUser(user) })
}

// POST /api/auth/register-student
router.post('/register-student', registerLimiter, (req, res) => registerUser(req, res, 'student'))

// POST /api/auth/register-institution
router.post('/register-institution', registerLimiter, (req, res) =>
  registerUser(req, res, 'institution')
)

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }

  const user = await User.findOne({ where: { email: String(email).trim().toLowerCase() } })
  const ok = user ? await bcrypt.compare(String(password), user.password) : false

  // Same message in both cases, so nobody can guess which emails exist
  if (!user || !ok) {
    return res.status(401).json({ message: 'Wrong email or password' })
  }
  if (!user.isActive) {
    return res.status(403).json({ message: 'This account is disabled' })
  }

  await logActivity({ userId: user.id, action: 'LOGIN', details: user.email })
  res.json({ token: makeToken(user), user: safeUser(user) })
})

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json({ user: safeUser(req.user) })
})

export default router
