import { isAxiosError } from 'axios'

export function handleAxiosError(explanation: string) {
  return (error: unknown) => {
    if (!isAxiosError(error)) {
      throw error
    }
    console.error(explanation, error.config?.url, error.response?.data)
    error.message = `${explanation}: ${error.message}`
    throw error
  }
}
