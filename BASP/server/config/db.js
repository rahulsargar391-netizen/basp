import 'dotenv/config'
import fs from 'fs'
import mysql from 'mysql2/promise'
import { Sequelize } from 'sequelize'

const {
  DB_DIALECT = 'mysql',
  DATABASE_URL: configuredDatabaseUrl,
  DB_HOST = '127.0.0.1',
  DB_PORT = '3306',
  DB_NAME = 'basp_v2',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_CREATE_DATABASE = 'true',
  DB_SSL = 'false',
  DB_SSL_CA_FILE = '',
} = process.env
const DATABASE_URL = configuredDatabaseUrl || (DB_DIALECT === 'postgres' ? process.env.SUPABASE_DB_URL : '')

if (!['mysql', 'postgres'].includes(DB_DIALECT)) {
  throw new Error('DB_DIALECT must be "mysql" or "postgres"')
}

const dialectOptions = DB_SSL === 'true'
  ? {
      ssl: {
        rejectUnauthorized: true,
        ...(DB_SSL_CA_FILE ? { ca: fs.readFileSync(DB_SSL_CA_FILE, 'utf8') } : {}),
      },
    }
  : undefined

const sequelizeOptions = {
  dialect: DB_DIALECT,
  logging: false,
  dialectOptions,
}

export const sequelize = DATABASE_URL
  ? new Sequelize(DATABASE_URL, sequelizeOptions)
  : new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
      ...sequelizeOptions,
      host: DB_HOST,
      port: Number(DB_PORT),
    })

const connectDB = async () => {
  if (DB_CREATE_DATABASE !== 'true' && DB_CREATE_DATABASE !== 'false') {
    throw new Error('DB_CREATE_DATABASE must be "true" or "false"')
  }

  if (DB_DIALECT === 'postgres' && DB_CREATE_DATABASE === 'true') {
    throw new Error('Create the PostgreSQL database in Supabase and set DB_CREATE_DATABASE=false')
  }

  if (DB_DIALECT === 'mysql' && DB_CREATE_DATABASE === 'true') {
    if (!/^[A-Za-z0-9_]+$/.test(DB_NAME)) {
      throw new Error('DB_NAME may only contain letters, numbers and underscores')
    }

    const conn = await mysql.createConnection({
      host: DB_HOST,
      port: Number(DB_PORT),
      user: DB_USER,
      password: DB_PASSWORD,
    })
    try {
      await conn.query(
        `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      )
    } finally {
      await conn.end()
    }
  }

  await sequelize.authenticate()
  console.log(`Database connected successfully (dialect: ${DB_DIALECT})`)
}

export default connectDB
