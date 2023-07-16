import { useNavigate } from 'react-router-dom'

export function useAuthActions() {
  const navigate = useNavigate()
  const logIn = () => {
    navigate('/auth/login')
  }
  return { logIn }
}
