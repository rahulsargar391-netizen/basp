import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { errorText } from '../../api'
import { inputClass, primaryButton, ErrorBox } from '../../components/ui'

const allowed = ['application/pdf', 'image/jpeg', 'image/png']
const maxSize = 5 * 1024 * 1024

function UploadCertificate() {
  const navigate = useNavigate()
  const [institutions, setInstitutions] = useState([])
  const [form, setForm] = useState({ title: '', institutionId: '', issueDate: '', description: '' })
  const [showName, setShowName] = useState(true)
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .get('/certificates/institutions')
      .then((res) => setInstitutions(res.data.institutions))
      .catch(() => setError('Could not load institutions'))
  }, [])

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const pickFile = (e) => {
    const chosen = e.target.files[0]
    setError('')
    setFile(null)
    if (!chosen) return
    if (!allowed.includes(chosen.type)) {
      setError('Only PDF, JPG and PNG files are allowed')
      e.target.value = ''
      return
    }
    if (chosen.size > maxSize) {
      setError('File is too large (maximum 5 MB)')
      e.target.value = ''
      return
    }
    setFile(chosen)
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.title || !form.institutionId || !file) {
      return setError('Please enter a title, choose an institution and select a file')
    }

    const data = new FormData()
    data.append('title', form.title)
    data.append('institutionId', form.institutionId)
    data.append('issueDate', form.issueDate)
    data.append('description', form.description)
    data.append('showName', String(showName))
    data.append('file', file)

    setBusy(true)
    try {
      const res = await api.post('/certificates', data)
      navigate(`/student/certificates/${res.data.certificate.id}`)
    } catch (err) {
      setError(errorText(err, 'Upload failed, please try again'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Upload certificate</h1>
      <p className="mt-1 text-slate-400">
        Your institution will review it. Use test files only, never real documents.
      </p>

      <div className="glow-card mt-6 max-w-2xl space-y-4 rounded-2xl p-6">
        <input name="title" placeholder="Certificate title (for example: Python Course)" value={form.title} onChange={change} className={inputClass} />

        <select name="institutionId" value={form.institutionId} onChange={change} className={inputClass}>
          <option value="">Choose college name</option>
          {institutions.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
        {institutions.length === 0 && (
          <p className="text-xs text-amber-400">
            No approved institutions yet. An admin must approve an institution first.
          </p>
        )}

        <div>
          <label className="mb-1 block text-xs text-slate-400">Issue date</label>
          <input name="issueDate" type="date" value={form.issueDate} onChange={change} className={inputClass} />
        </div>

        <textarea name="description" rows="3" placeholder="Short description (optional)" value={form.description} onChange={change} className={inputClass} />

        <div>
          <label className="mb-1 block text-xs text-slate-400">File (PDF, JPG or PNG, maximum 5 MB)</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={pickFile}
            className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-500/15 file:px-4 file:py-2 file:text-cyan-300"
          />
        </div>

        <label className="flex items-center gap-3 text-sm text-slate-300">
          <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} className="h-4 w-4" />
          Show my name on the public verification page
        </label>

        <ErrorBox>{error}</ErrorBox>

        <button onClick={handleSubmit} disabled={busy} className={`w-full py-3 ${primaryButton}`}>
          {busy ? 'Uploading...' : 'Submit for review'}
        </button>
      </div>
    </div>
  )
}

export default UploadCertificate
