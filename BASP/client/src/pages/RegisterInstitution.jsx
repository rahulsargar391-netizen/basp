import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { errorText } from '../api'
import AuthCard from '../components/AuthCard'
import { inputClass, primaryButton, ErrorBox } from '../components/ui'

const institutions = [
  'Dr. J. J. Magdum College of Engineering (JJMCOE)',
  "DKTE - D.K.T.E. Society's Textile & Engineering Institute",
  'RIT - Rajarambapu Institute of Technology',
  'ADCET - Annasaheb Dange College of Engineering and Technology',
  'SIT - Sharad Institute of Technology College of Engineering',
  'TKIT - Tatyasaheb Kore Institute of Engineering and Technology',
]

function RegisterInstitution() {
  const { registerInstitution } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ institutionName: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async () => {
    setError('')
    if (!form.institutionName || !form.email || !form.password) {
      return setError('Please fill in all fields')
    }
    if (form.password.length < 8) return setError('Password must be at least 8 characters')
    if (form.password !== form.confirm) return setError('Passwords do not match')

    setBusy(true)
    try {
      await registerInstitution({
        institutionName: form.institutionName,
        email: form.email,
        password: form.password,
      })
      navigate('/dashboard')
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Register your institution" subtitle="An admin approves new institutions before they can issue">
      <div className="space-y-4">
        <select name="institutionName" value={form.institutionName} onChange={change} className={inputClass}>
          <option value="">Choose college name</option>
          {institutions.map((institution) => (
            <option key={institution} value={institution}>{institution}</option>
          ))}
        </select>
        <input name="email" type="email" placeholder="Official email" value={form.email} onChange={change} className={inputClass} />
        <input name="password" type="password" placeholder="Password (min 8 characters)" value={form.password} onChange={change} className={inputClass} />
        <input name="confirm" type="password" placeholder="Confirm password" value={form.confirm} onChange={change} className={inputClass} />
        <ErrorBox>{error}</ErrorBox>
        <button onClick={handleSubmit} disabled={busy} className={`w-full py-3 ${primaryButton}`}>
          {busy ? 'Registering...' : 'Register institution'}
        </button>
      </div>
      <p className="mt-6 text-center text-sm text-slate-400">
        Already registered? <Link to="/login" className="text-cyan-400 hover:underline">Log in</Link>
      </p>
    </AuthCard>
  )
}

export default RegisterInstitution
