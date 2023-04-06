import { ReactNode } from 'react'
import { Icon } from '@iconify-icon/react'
import { useUser } from 'reactfire'
import { signOut } from 'firebase/auth'
import { auth } from './firebase'

export interface Layout {
  children?: ReactNode
}
export function Layout(props: Layout) {
  return (
    <>
      <header className="p-3 text-bg-dark">
        <div className="container">
          <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-lg-start">
            <span className="d-flex align-items-center mb-2 mb-lg-0 text-white text-decoration-none">
              <span className="fs-4">ansr</span>
            </span>

            <div className="ms-auto text-end d-flex gap-2">
              <AuthBar />
            </div>
          </div>
        </div>
      </header>
      {props.children}
    </>
  )
}
export function AuthBar() {
  const { status, data: user } = useUser()

  if (status !== 'success') {
    return <></>
  }

  if (!user) {
    return (
      <button
        type="button"
        className="btn btn-outline-light me-2"
        onClick={() => location.replace('/.netlify/functions/line-login')}
      >
        <Icon inline icon="simple-icons:line" /> Login
      </button>
    )
  }

  return (
    <button
      type="button"
      className="btn btn-outline-secondary me-2"
      onClick={() => signOut(auth)}
    >
      Log out ({user.displayName})
    </button>
  )
}
