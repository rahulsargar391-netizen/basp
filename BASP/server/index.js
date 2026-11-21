import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import connectDB, { sequelize } from './config/db.js'
import './models/index.js'
import authRoutes from './routes/auth.js'
import certificateRoutes from './routes/certificates.js'
import institutionRoutes from './routes/institution.js'
import verifyRoutes from './routes/verify.js'
import adminRoutes from './routes/admin.js'

dotenv.config()

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'CHANGE_ME') {
  console.error('JWT_SECRET is missing. Run "npm run setup-env" in the server folder first.')
  process.exit(1)
}

const app = express()

// Only our configured websites may call this server
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }
    callback(new Error('Origin is not allowed'))
  },
}))

// A few safe browser headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  next()
})

app.use(express.json({ limit: '100kb' }))

app.get('/api/health', async (req, res) => {
  let database = 'connected'
  try {
    await sequelize.authenticate()
  } catch (error) {
    database = 'disconnected'
  }
  res.json({ status: 'ok', project: 'BASP', message: 'BASP server is running', database })
})

app.use('/api/auth', authRoutes)
app.use('/api/certificates', certificateRoutes)
app.use('/api/institution', institutionRoutes)
app.use('/api/verify', verifyRoutes)
app.use('/api/admin', adminRoutes)

// Unknown address
app.use((req, res) => res.status(404).json({ message: 'Not found' }))

// Any unexpected error ends up here instead of crashing the server
app.use((err, req, res, next) => {
  console.error('Unexpected error:', err.message)
  res.status(500).json({ message: 'Server error, please try again' })
})

const PORT = process.env.PORT || 5000

connectDB()
  .then(() => sequelize.sync())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`BASP server running on http://localhost:${PORT}`)
    })
  })
  .catch((error) => {
    console.error('Could not start the server:', error.message)
    console.error('Check DB_DIALECT and the configured database connection string.')
    process.exit(1)
  })
