import 'dotenv/config'
import mysql from 'mysql2/promise'
import { Sequelize } from 'sequelize'

const {
  DB_HOST = '127.0.0.1',
  DB_PORT = '3306',
  DB_NAME = 'basp_v2',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_CREATE_DATABASE = 'true',
  DB_SSL = 'false',
} = process.env

const dialectOptions = DB_SSL === 'true'
  ? { ssl: { rejectUnauthorized: true } }
  : undefined

export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: Number(DB_PORT),
  dialect: 'mysql',
  logging: false,
  dialectOptions,
})

// Creates the database if needed, then checks the connection
const connectDB = async () => {
  if (!/^[A-Za-z0-9_]+$/.test(DB_NAME)) {
    throw new Error('DB_NAME may only contain letters, numbers and underscores')
  }
  if (DB_CREATE_DATABASE !== 'true' && DB_CREATE_DATABASE !== 'false') {
    throw new Error('DB_CREATE_DATABASE must be "true" or "false"')
  }

  if (DB_CREATE_DATABASE === 'true') {
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
  console.log(`MySQL connected successfully (database: ${DB_NAME})`)
}

export default connectDB
